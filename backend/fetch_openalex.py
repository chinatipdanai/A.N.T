#!/usr/bin/env python3
"""Harvest full OpenAlex Works JSON for one institution, with cursor checkpoints.

The key is read from OPENALEX_API_KEY in backend/.env or the process environment.
No key is written to the DB.
"""
import argparse
import json
import os
import sqlite3
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
try:
    from .config import load_env, project_path
except ImportError:
    from config import load_env, project_path

try:
    from .import_data import (DEFAULT_DB, setup, source_record, upsert_publication,
                              upsert_author, upsert_named, ident, clean, num)
except ImportError:
    from import_data import (DEFAULT_DB, setup, source_record, upsert_publication,
                             upsert_author, upsert_named, ident, clean, num)

ENDPOINT="https://api.openalex.org/works"
DEFAULT_INSTITUTION="I60837268"  # KMUTT identifier present in the supplied CSV

def fetch_page(cursor, per_page, institution, key, timeout=30):
    query=urlencode({"filter":f"institutions.id:{institution}","per_page":per_page,"cursor":cursor})
    request=Request(f"{ENDPOINT}?{query}",headers={"Authorization":f"Bearer {key}","Accept":"application/json","User-Agent":"ANT-Research-Backend/0.1"})
    for attempt in range(4):
        try:
            with urlopen(request,timeout=timeout) as response:
                return json.load(response)
        except HTTPError as exc:
            if exc.code in (429,500,502,503,504) and attempt<3:
                time.sleep(2**attempt); continue
            raise RuntimeError(f"OpenAlex returned HTTP {exc.code}; check key activation, budget and query") from None
        except (URLError,TimeoutError):
            if attempt<3: time.sleep(2**attempt); continue
            raise RuntimeError("OpenAlex connection failed after retries") from None

def ingest_work(db, work, run):
    rid=ident(work.get("id"),"W")
    if not rid: raise ValueError("OpenAlex work has no ID")
    source="openalex_api"
    source_record(db,source,rid,"publication",run,work)
    pid=upsert_publication(db,work.get("title") or work.get("display_name") or rid,oa=rid,
                           doi_value=work.get("doi"),year=work.get("publication_year"),raw=work)
    for pos,authorship in enumerate(work.get("authorships") or [],1):
        author=authorship.get("author") or {}
        author_id=ident(author.get("id"),"A")
        if not author_id: continue
        aid=upsert_author(db,author.get("display_name"),oa=author_id,orcid_value=author.get("orcid"),raw=author)
        db.execute("INSERT OR REPLACE INTO authorships(author_id,publication_id,author_position,is_corresponding,source,source_record_id) VALUES(?,?,?,?,?,?)",
          (aid,pid,pos,int(bool(authorship.get("is_corresponding"))),source,rid))
        for institution in authorship.get("institutions") or []:
            iid=ident(institution.get("id"),"I")
            if not iid: continue
            inst_id=upsert_named(db,"institutions","openalex_institution_id",iid,institution.get("display_name"),institution)
            db.execute("INSERT OR IGNORE INTO publication_institutions VALUES(?,?,?,?)",(pid,inst_id,source,rid))
    topics=work.get("topics") or []
    if not topics and work.get("primary_topic"): topics=[work["primary_topic"]]
    for topic in topics:
        tid=ident(topic.get("id"),"T")
        if not tid: continue
        topic_id=upsert_named(db,"topics","openalex_topic_id",tid,topic.get("display_name"),topic)
        db.execute("INSERT OR IGNORE INTO publication_topics VALUES(?,?,?,?,?)",(pid,topic_id,source,rid,"confirmed"))
    for funder in work.get("funders") or []:
        fid=ident(funder.get("id"),"F")
        if not fid: continue
        funder_id=upsert_named(db,"funders","openalex_funder_id",fid,funder.get("display_name"),funder)
        db.execute("INSERT OR IGNORE INTO publication_funders VALUES(?,?,?,?)",(pid,funder_id,source,rid))
    db.execute("INSERT OR REPLACE INTO publication_metrics(publication_id,source,source_record_id,citations,fwci) VALUES(?,?,?,?,?)",
      (pid,source,rid,num(work.get("cited_by_count")),num(work.get("fwci"))))

def harvest(db, institution=DEFAULT_INSTITUTION, key=None, per_page=100, max_pages=None, resume=False, fetch=fetch_page):
    if not key: raise ValueError("OPENALEX_API_KEY is required")
    if not 1<=per_page<=100: raise ValueError("per_page must be between 1 and 100")
    if max_pages is not None and max_pages<1: raise ValueError("max_pages must be >= 1")
    institution=ident(institution,"I")
    if not institution or not institution.startswith("I"): raise ValueError("Invalid institution ID")
    source_file=f"openalex:works:institutions.id:{institution}"
    run=None
    if resume:
        row=db.execute("SELECT id,details_json,rows_seen,rows_loaded,rows_rejected FROM import_runs WHERE source='openalex_api' AND source_file=? AND status='paused' ORDER BY id DESC LIMIT 1",(source_file,)).fetchone()
        if not row: raise ValueError("No paused OpenAlex import for this institution")
        run=row[0]; details=json.loads(row[1]); cursor=details["next_cursor"]
        seen,loaded,rejected=row[2:]
    else:
        cursor="*"; seen=loaded=rejected=0
        details={"next_cursor":cursor,"per_page":per_page,"filter":f"institutions.id:{institution}","pages_completed":0,"cost_usd":0}
        run=db.execute("INSERT INTO import_runs(source,source_file,status,details_json) VALUES(?,?,?,?)",
          ("openalex_api",source_file,"paused",json.dumps(details))).lastrowid
        db.commit()
    pages_this_run=0
    while cursor:
        payload=fetch(cursor,per_page,institution,key)
        records=payload.get("results")
        meta=payload.get("meta") or {}
        if not isinstance(records,list): raise RuntimeError("Invalid OpenAlex results payload")
        db.execute("SAVEPOINT page")
        try:
            for work in records:
                seen+=1
                try:
                    db.execute("SAVEPOINT work")
                    ingest_work(db,work,run)
                    db.execute("RELEASE work"); loaded+=1
                except Exception as exc:
                    db.execute("ROLLBACK TO work"); db.execute("RELEASE work"); rejected+=1
                    rid=ident(work.get("id"),"W") or f"api-row-{seen}"
                    source_record(db,"openalex_api",rid,"publication",run,work)
                    db.execute("INSERT INTO import_errors(import_run_id,source_record_id,error_message,raw_json) VALUES(?,?,?,?)",
                      (run,rid,str(exc),json.dumps(work,ensure_ascii=False,default=str)))
            cursor=meta.get("next_cursor") if records else None
            details.update(next_cursor=cursor,expected_count=meta.get("count"),
                pages_completed=details["pages_completed"]+1,
                cost_usd=round(details["cost_usd"]+float(meta.get("cost_usd") or 0),6))
            pages_this_run+=1
            status="completed" if not cursor else "paused"
            db.execute("UPDATE import_runs SET status=?,rows_seen=?,rows_loaded=?,rows_rejected=?,details_json=?,finished_at=CASE WHEN ?='completed' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id=?",
                (status,seen,loaded,rejected,json.dumps(details,ensure_ascii=False),status,run))
            db.execute("RELEASE page"); db.commit()
        except Exception:
            db.execute("ROLLBACK TO page"); db.execute("RELEASE page"); db.rollback(); raise
        print(f"page={details['pages_completed']} rows={seen} loaded={loaded} rejected={rejected} next={'yes' if cursor else 'no'}")
        if max_pages and pages_this_run>=max_pages: break
    return {"run_id":run,"status":"paused" if cursor else "completed","rows_seen":seen,"rows_loaded":loaded,"rows_rejected":rejected,"next_cursor_available":bool(cursor)}

def main():
    load_env()
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db",type=Path,default=project_path("ANT_DB","backend/ant.db"))
    p.add_argument("--institution",default=os.environ.get("OPENALEX_INSTITUTION_ID") or DEFAULT_INSTITUTION,help="OpenAlex institution ID; default is KMUTT in supplied CSV")
    p.add_argument("--per-page",type=int,default=int(os.environ.get("OPENALEX_PER_PAGE") or 100))
    p.add_argument("--max-pages",type=int,default=None,help="Stop after this many pages; use --resume to continue")
    p.add_argument("--resume",action="store_true")
    args=p.parse_args()
    key=os.environ.get("OPENALEX_API_KEY")
    if not key: p.error("Set OPENALEX_API_KEY in backend/.env or your terminal; do not put it in code or share it")
    args.db.parent.mkdir(parents=True,exist_ok=True)
    db=sqlite3.connect(args.db); db.execute("PRAGMA foreign_keys=ON"); setup(db)
    try:
        print(json.dumps(harvest(db,args.institution,key,args.per_page,args.max_pages,args.resume),ensure_ascii=False))
    except (RuntimeError,ValueError) as exc:
        print(f"Import stopped: {exc}",file=sys.stderr); sys.exit(1)
    finally:
        db.close()

if __name__=="__main__": main()
