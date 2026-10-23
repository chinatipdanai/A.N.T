#!/usr/bin/env python3
"""Import the supplied OpenAlex CSV and SciVal XLSX exports into SQLite.

All source columns are retained in source_records.raw_json. Normalized tables
are convenience indexes for backend queries; they never replace source values.
"""
import argparse, csv, json, re, sqlite3
from datetime import datetime, timezone
from pathlib import Path
try:
    from .config import load_env, project_path
except ImportError:
    from config import load_env, project_path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCES = ROOT / "project_sources"
DEFAULT_DB = ROOT / "backend" / "ant.db"

def clean(v):
    if v is None: return None
    s = str(v).strip()
    return s if s and s.lower() not in {"nan", "none", "null", "-"} else None

def ident(v, prefix=None):
    s=clean(v)
    if not s: return None
    s=s.rstrip("/").split("/")[-1]
    if prefix and s.startswith(prefix): return s
    return s

def doi(v):
    s=clean(v)
    if not s: return None
    s=re.sub(r"^(https?://(dx\.)?doi\.org/|doi:)\s*", "", s, flags=re.I)
    return s.lower().strip()

def split_pipe(v):
    if v is None: return []
    return str(v).split("|")

def num(v):
    s=clean(v)
    if not s: return None
    try: return float(s.replace(",", ""))
    except ValueError: return None

def setup(db):
    db.executescript((Path(__file__).parent/"schema.sql").read_text())
    db.commit()

def begin(db, source, path):
    cur=db.execute("INSERT INTO import_runs(source,source_file) VALUES(?,?)",(source,str(path)))
    db.commit(); return cur.lastrowid

def finish(db, run, seen, loaded, rejected, details=None, status="completed"):
    db.execute("UPDATE import_runs SET finished_at=?,status=?,rows_seen=?,rows_loaded=?,rows_rejected=?,details_json=? WHERE id=?",
      (datetime.now(timezone.utc).isoformat(),status,seen,loaded,rejected,json.dumps(details or {},ensure_ascii=False),run)); db.commit()

def source_record(db, source, rid, typ, run, raw):
    db.execute("INSERT INTO source_records(source,source_record_id,record_type,import_run_id,raw_json) VALUES(?,?,?,?,?) "
               "ON CONFLICT(source,source_record_id,record_type) DO UPDATE SET import_run_id=excluded.import_run_id,raw_json=excluded.raw_json,imported_at=CURRENT_TIMESTAMP",
               (source,str(rid),typ,run,json.dumps(raw,ensure_ascii=False,default=str)))

def record_error(db, run, rid, exc, raw):
    db.execute("INSERT INTO import_errors(import_run_id,source_record_id,error_message,raw_json) VALUES(?,?,?,?)",
      (run,str(rid),str(exc),json.dumps(raw,ensure_ascii=False,default=str)))
    db.commit()

def upsert_author(db, name, oa=None, scopus=None, orcid_value=None, raw=None):
    name=clean(name) or "Unknown author"; oa=ident(oa,"A"); scopus=clean(scopus); o=ident(orcid_value)
    # Avoid unique-ID conflicts by resolving on any deterministic identifier.
    clauses=[]; args=[]
    for col,val in (("openalex_author_id",oa),("scopus_author_id",scopus)):
        if val: clauses.append(col+"=?"); args.append(val)
    # ORCID alone is not safe to merge on when a source-specific author ID exists.
    if not clauses and o: clauses.append("orcid=?"); args.append(o)
    row=db.execute("SELECT id FROM authors WHERE "+" OR ".join(clauses)+" LIMIT 1",args).fetchone() if clauses else None
    if row:
        aid=row[0]
        db.execute("UPDATE authors SET display_name=?,openalex_author_id=COALESCE(openalex_author_id,?),scopus_author_id=COALESCE(scopus_author_id,?),orcid=COALESCE(orcid,?),raw_json=? WHERE id=?",
          (name,oa,scopus,o,json.dumps(raw or {},ensure_ascii=False,default=str),aid))
    else:
        db.execute("INSERT INTO authors(display_name,openalex_author_id,scopus_author_id,orcid,raw_json) VALUES(?,?,?,?,?)",
          (name,oa,scopus,o,json.dumps(raw or {},ensure_ascii=False,default=str))); aid=db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return aid

def upsert_publication(db, title, oa=None, eid=None, doi_value=None, year=None, source_title=None, raw=None):
    oa=ident(oa,"W"); eid=clean(eid); d=doi(doi_value); y=num(year); y=int(y) if y is not None else None
    clauses=[]; args=[]
    for col,val in (("openalex_work_id",oa),("scopus_eid",eid),("doi",d)):
        if val: clauses.append(col+"=?"); args.append(val)
    row=db.execute("SELECT id FROM publications WHERE "+" OR ".join(clauses)+" LIMIT 1",args).fetchone() if clauses else None
    rawj=json.dumps(raw or {},ensure_ascii=False,default=str)
    if row:
        pid=row[0]
        db.execute("UPDATE publications SET title=CASE WHEN title='' OR title=openalex_work_id THEN ? ELSE title END,openalex_work_id=COALESCE(openalex_work_id,?),scopus_eid=COALESCE(scopus_eid,?),doi=COALESCE(doi,?),publication_year=COALESCE(publication_year,?),source_title=COALESCE(source_title,?),raw_json=? WHERE id=?",
          (clean(title) or "Untitled",oa,eid,d,y,clean(source_title),rawj,pid))
    else:
        db.execute("INSERT INTO publications(openalex_work_id,scopus_eid,doi,title,publication_year,source_title,raw_json) VALUES(?,?,?,?,?,?,?)",
          (oa,eid,d,clean(title) or "Untitled",y,clean(source_title),rawj)); pid=db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return pid

def upsert_named(db, table, id_col, ext_id, name, raw=None, other_id_col=None, other_id=None):
    ext_id=ident(ext_id); other_id=clean(other_id); clauses=[]; args=[]
    if ext_id: clauses.append(id_col+"=?"); args.append(ext_id)
    elif other_id_col and other_id: clauses.append(other_id_col+"=?"); args.append(other_id)
    row=db.execute(f"SELECT id FROM {table} WHERE "+" OR ".join(clauses)+" LIMIT 1",args).fetchone() if clauses else None
    rawj=json.dumps(raw or {},ensure_ascii=False,default=str)
    if row:
        entity_id=row[0]
        sets=["name=COALESCE(name,?)",f"{id_col}=COALESCE({id_col},?)"]
        vals=[clean(name),ext_id]
        if other_id_col: sets.append(f"{other_id_col}=COALESCE({other_id_col},?)"); vals.append(other_id)
        sets.append("raw_json=?"); vals.extend([rawj,entity_id])
        db.execute(f"UPDATE {table} SET "+",".join(sets)+" WHERE id=?",vals)
    else:
        cols=[id_col,"name","raw_json"]; vals=[ext_id,clean(name) or "Unknown",rawj]
        if other_id_col: cols.insert(1,other_id_col); vals.insert(1,other_id)
        db.execute(f"INSERT INTO {table}({','.join(cols)}) VALUES({','.join('?' for _ in vals)})",vals); entity_id=db.execute("SELECT last_insert_rowid()").fetchone()[0]
    return entity_id

def import_openalex(db,path):
    source="openalex"; run=begin(db,source,path); seen=loaded=rejected=0; errors=[]
    try:
      with open(path,encoding="utf-8-sig",newline="") as f:
       reader=csv.DictReader(f)
       for row in reader:
        seen+=1; rid=ident(row.get("Work ID"),"W")
        if not rid: rejected+=1; continue
        try:
         db.execute("SAVEPOINT one_row")
         source_record(db,source,rid,"publication",run,row)
         pid=upsert_publication(db,rid,oa=rid,doi_value=row.get("DOI"),year=row.get("Year"),raw=row)
         names=split_pipe(row.get("Author")); aids=split_pipe(row.get("Author IDs")); orcids=split_pipe(row.get("ORCID"))
         for i,name in enumerate(names):
          if not clean(name): continue
          oa=aids[i] if i<len(aids) else None; orcid_value=orcids[i] if i<len(orcids) else None
          aid=upsert_author(db,name,oa=oa,orcid_value=orcid_value,raw={"name":name,"openalex_author_id":oa,"orcid":orcid_value})
          db.execute("INSERT OR IGNORE INTO authorships(author_id,publication_id,author_position,is_corresponding,source,source_record_id) VALUES(?,?,?,?,?,?)",(aid,pid,i+1,int(ident(row.get("Corresponding author"),"A")==ident(oa,"A")) if clean(row.get("Corresponding author")) else None,source,rid))
         topics=split_pipe(row.get("Topic")); tids=split_pipe(row.get("Topic IDs"))
         for i,name in enumerate(topics):
          if not clean(name): continue
          tid=tids[i] if i<len(tids) else None; topic_id=upsert_named(db,"topics","openalex_topic_id",tid,name,{"name":name,"id":tid})
          db.execute("INSERT OR IGNORE INTO publication_topics VALUES(?,?,?,?,?)",(pid,topic_id,source,rid,"confirmed" if tid else "needs_review"))
         insts=split_pipe(row.get("Institution")); iids=split_pipe(row.get("Institution IDs"))
         for i,name in enumerate(insts):
          if not clean(name): continue
          iid=iids[i] if i<len(iids) else None; inst_id=upsert_named(db,"institutions","openalex_institution_id",iid,name,{"name":name,"id":iid})
          db.execute("INSERT OR IGNORE INTO publication_institutions VALUES(?,?,?,?)",(pid,inst_id,source,rid))
         funders=split_pipe(row.get("Funder")); fids=split_pipe(row.get("Funder IDs"))
         for i,name in enumerate(funders):
          if not clean(name): continue
          fid=fids[i] if i<len(fids) else None; funder_id=upsert_named(db,"funders","openalex_funder_id",fid,name,{"name":name,"id":fid})
          db.execute("INSERT OR IGNORE INTO publication_funders VALUES(?,?,?,?)",(pid,funder_id,source,rid))
         db.execute("INSERT OR REPLACE INTO publication_metrics(publication_id,source,source_record_id,citations,fwci) VALUES(?,?,?,?,?)",(pid,source,rid,num(row.get("Citation count")),num(row.get("FWCI"))))
         db.execute("RELEASE one_row"); loaded+=1
        except Exception as exc:
         db.execute("ROLLBACK TO one_row"); db.execute("RELEASE one_row"); record_error(db,run,rid,exc,row); source_record(db,source,rid,"publication",run,row); rejected+=1; errors.append(str(exc))
      db.commit(); finish(db,run,seen,loaded,rejected,{"all_csv_columns_retained":True,"error_examples":errors[:10]})
    except Exception as e:
      db.rollback(); finish(db,run,seen,loaded,rejected,{"error":str(e)},"failed"); raise
    return run,seen,loaded,rejected

def read_excel_records(path, header_label):
    import pandas as pd
    frame=pd.read_excel(path,header=None,dtype=object)
    header_row=next((i for i in range(min(len(frame),40)) if clean(frame.iat[i,0])==header_label),None)
    if header_row is None: raise ValueError(f"Could not locate header {header_label!r} in {path}")
    headers=[clean(x) for x in frame.iloc[header_row].tolist()]
    for vals in frame.iloc[header_row+1:].itertuples(index=False,name=None):
        if not any(clean(x) for x in vals): continue
        yield {h: (None if clean(v) is None else v.item() if hasattr(v,"item") else v) for h,v in zip(headers,vals) if h}

def import_scival_publications(db,path):
    source="scival"; run=begin(db,source,path); seen=loaded=rejected=0; errors=[]
    try:
      for row in read_excel_records(path,"Title"):
       seen+=1; rid=clean(row.get("EID")) or doi(row.get("DOI")) or f"row-{seen}"
       try:
        db.execute("SAVEPOINT one_row"); source_record(db,source,rid,"publication",run,row)
        pid=upsert_publication(db,row.get("Title"),eid=row.get("EID"),doi_value=row.get("DOI"),year=row.get("Year"),source_title=row.get("Scopus Source title"),raw=row)
        names=split_pipe(row.get("Authors")); sids=split_pipe(row.get("Scopus Author Ids"))
        for i,name in enumerate(names):
         if not clean(name): continue
         sid=sids[i] if i<len(sids) else None; aid=upsert_author(db,name,scopus=sid,raw={"name":name,"scopus_author_id":sid})
         db.execute("INSERT OR IGNORE INTO authorships(author_id,publication_id,author_position,is_corresponding,source,source_record_id) VALUES(?,?,?,?,?,?)",(aid,pid,i+1,None,source,rid))
        for i,name in enumerate(split_pipe(row.get("Topic name"))):
         if not clean(name): continue
         topic_id=upsert_named(db,"topics","openalex_topic_id",None,name,{"scival_topic":name})
         db.execute("INSERT OR IGNORE INTO publication_topics VALUES(?,?,?,?,?)",(pid,topic_id,source,rid,"needs_review"))
        inst_names=split_pipe(row.get("Institutions")); openalex_ids=split_pipe(row.get("Institution IDs")); scopus_ids=split_pipe(row.get("Scopus Affiliation IDs"))
        for i,name in enumerate(inst_names):
         if not clean(name): continue
         iid=openalex_ids[i] if i<len(openalex_ids) else None; sid=scopus_ids[i] if i<len(scopus_ids) else None
         inst_id=upsert_named(db,"institutions","openalex_institution_id",iid,name,{"name":name,"openalex_id":iid,"scopus_affiliation_id":sid},"scopus_affiliation_id",sid)
         db.execute("INSERT OR IGNORE INTO publication_institutions VALUES(?,?,?,?)",(pid,inst_id,source,rid))
        db.execute("INSERT OR REPLACE INTO publication_metrics(publication_id,source,source_record_id,citations,fwci) VALUES(?,?,?,?,?)",(pid,source,rid,num(row.get("Citations")),num(row.get("Field-Weighted Citation Impact"))))
        db.execute("RELEASE one_row"); loaded+=1
       except Exception as exc:
        db.execute("ROLLBACK TO one_row"); db.execute("RELEASE one_row"); record_error(db,run,rid,exc,row); source_record(db,source,rid,"publication",run,row); rejected+=1; errors.append(str(exc))
      db.commit(); finish(db,run,seen,loaded,rejected,{"all_excel_columns_retained":True,"header_row":"Title","error_examples":errors[:10]})
    except Exception as e:
      db.rollback(); finish(db,run,seen,loaded,rejected,{"error":str(e)},"failed"); raise
    return run,seen,loaded,rejected

def import_scival_authors(db,path):
    source="scival"; run=begin(db,source,path); seen=loaded=rejected=0; errors=[]
    try:
      for row in read_excel_records(path,"Name"):
       seen+=1; sid=clean(row.get("Scopus author ID"))
       rid=f"{sid}#row-{seen}" if sid else f"author-row-{seen}"
       if not sid:
        source_record(db,source,rid,"author",run,row); record_error(db,run,rid,"Missing Scopus author ID; preserved as raw source record",row); rejected+=1; continue
       try:
        db.execute("SAVEPOINT one_row"); source_record(db,source,rid,"author",run,row)
        aid=upsert_author(db,row.get("Name"),scopus=sid,orcid_value=row.get("ORCID (linked to Scopus author profile)"),raw=row)
        db.execute("INSERT OR REPLACE INTO author_metrics(author_id,source,source_record_id,scholarly_output,citations,citations_per_publication,fwci,h_index) VALUES(?,?,?,?,?,?,?,?)",
          (aid,source,rid,num(row.get("Scholarly Output")),num(row.get("Citations")),num(row.get("Citations per Publication")),num(row.get("Field-Weighted Citation Impact")),num(row.get("h-index"))))
        db.execute("RELEASE one_row"); loaded+=1
       except Exception as exc:
        db.execute("ROLLBACK TO one_row"); db.execute("RELEASE one_row"); record_error(db,run,rid,exc,row); source_record(db,source,rid,"author",run,row); rejected+=1; errors.append(str(exc))
      db.commit(); finish(db,run,seen,loaded,rejected,{"all_excel_columns_retained":True,"header_row":"Name","error_examples":errors[:10]})
    except Exception as e:
      db.rollback(); finish(db,run,seen,loaded,rejected,{"error":str(e)},"failed"); raise
    return run,seen,loaded,rejected

def main():
 load_env()
 p=argparse.ArgumentParser(description=__doc__); p.add_argument("--source-dir",type=Path,default=project_path("ANT_SOURCE_DIR","project_sources")); p.add_argument("--db",type=Path,default=project_path("ANT_DB","backend/ant.db")); p.add_argument("--openalex",type=Path); p.add_argument("--scival-publications",type=Path); p.add_argument("--scival-authors",type=Path); p.add_argument("--reset",action="store_true"); a=p.parse_args()
 files=[a.openalex or next(a.source_dir.glob("04-works-*.csv"),None),a.scival_publications or next(a.source_dir.glob("06-Publications*.xlsx"),None),a.scival_authors or next(a.source_dir.glob("05-All_Authors*.xlsx"),None)]
 if any(x is None or not x.exists() for x in files): p.error("Could not find all three sample sources; provide their paths")
 a.db.parent.mkdir(parents=True,exist_ok=True)
 if a.reset and a.db.exists(): a.db.unlink()
 db=sqlite3.connect(a.db); db.execute("PRAGMA foreign_keys=ON"); db.execute("PRAGMA journal_mode=WAL"); setup(db)
 for fn,path in zip((import_openalex,import_scival_publications,import_scival_authors),files):
  result=fn(db,path); print(json.dumps({"source_file":path.name,"run_id":result[0],"rows_seen":result[1],"rows_loaded":result[2],"rows_rejected":result[3]}))
 print(f"Database ready: {a.db}"); db.close()

if __name__=="__main__": main()
