#!/usr/bin/env python3
"""Small read-only JSON API for the A.N.T. local backend (Python stdlib)."""
import json, os, sqlite3, traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, unquote
from pathlib import Path
try:
    from .config import load_env, project_path
except ImportError:
    from config import load_env, project_path

load_env()
DB_PATH=project_path("ANT_DB","backend/ant.db")

def connect():
    db=sqlite3.connect(DB_PATH); db.row_factory=sqlite3.Row; db.execute("PRAGMA foreign_keys=ON"); return db

def pagination(q, default=20, maximum=100):
    try:
        page=int((q.get("page") or [1])[0]); limit=int((q.get("limit") or [default])[0])
    except (TypeError,ValueError):
        raise ValueError("page and limit must be integers")
    if page<1 or not 1<=limit<=maximum:
        raise ValueError(f"page must be >= 1 and limit must be between 1 and {maximum}")
    return page,limit,(page-1)*limit

def positive_id(value, label):
    try: result=int(value)
    except (TypeError,ValueError): raise ValueError(f"{label} must be a positive integer")
    if result<1: raise ValueError(f"{label} must be a positive integer")
    return result

def json_row(row):
    item=dict(row)
    if "id" in item: item["id"]=str(item["id"])
    return item

class Handler(BaseHTTPRequestHandler):
    server_version="ANTAPI/0.1"
    def send_json(self,status,obj):
        body=json.dumps(obj,ensure_ascii=False).encode()
        self.send_response(status); self.send_header("Content-Type","application/json; charset=utf-8"); self.send_header("Content-Length",str(len(body))); self.send_header("Access-Control-Allow-Origin","*"); self.end_headers(); self.wfile.write(body)
    def do_OPTIONS(self):
        self.send_response(204); self.send_header("Access-Control-Allow-Origin","*"); self.send_header("Access-Control-Allow-Methods","GET, OPTIONS"); self.send_header("Access-Control-Allow-Headers","Content-Type"); self.end_headers()
    def do_GET(self):
        path=urlparse(self.path).path.rstrip("/"); q=parse_qs(urlparse(self.path).query)
        try:
            with connect() as db:
                if path in ("","/api/v1","/api/v1/health"):
                    return self.send_json(200,{"status":"ok","database":str(DB_PATH),"api":"A.N.T v1"})
                if path=="/api/v1/stats":
                    return self.send_json(200,{t:db.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("authors","publications","topics","institutions","funders","source_records","authorships","publication_topics")})
                if path=="/api/v1/imports":
                    rows=[dict(x) for x in db.execute("SELECT * FROM import_runs ORDER BY id DESC")]
                    for x in rows:
                        if x.get("details_json"): x["details_json"]=json.loads(x["details_json"])
                    return self.send_json(200,{"data":rows})
                if path=="/api/v1/search": return self.search(db,q)
                parts=path.split("/")
                if len(parts)==4 and parts[:3]==["","api","v1"] and parts[3]=="graph": return self.graph(db,q)
                if len(parts)==7 and parts[:4]==["","api","v1","raw"]:
                    row=db.execute("SELECT * FROM source_records WHERE source=? AND record_type=? AND source_record_id=?",(unquote(parts[4]),unquote(parts[5]),unquote(parts[6]))).fetchone()
                    if not row: return self.send_json(404,{"error":{"code":"NOT_FOUND","message":"Source record not found"}})
                    result=dict(row); result["raw_json"]=json.loads(result["raw_json"]); return self.send_json(200,{"data":result})
                if len(parts)==5 and parts[:3]==["","api","v1"] and parts[3] in ("authors","publications","topics"): return self.detail(db,parts[3],parts[4],q)
                return self.send_json(404,{"error":{"code":"NOT_FOUND","message":"Endpoint not found"}})
        except ValueError as e:
            return self.send_json(400,{"error":{"code":"INVALID_QUERY","message":str(e)}})
        except sqlite3.OperationalError:
            return self.send_json(503,{"error":{"code":"DATABASE_UNAVAILABLE","message":"Database is unavailable"}})
        except Exception:
            self.log_error("Unexpected API error: %s",traceback.format_exc())
            return self.send_json(500,{"error":{"code":"INTERNAL_ERROR","message":"Unexpected server error"}})
    def search(self,db,q):
        term=(q.get("q") or [""])[0].strip(); kind=(q.get("type") or ["all"])[0]; page,limit,offset=pagination(q)
        if not term: return self.send_json(400,{"error":{"code":"INVALID_QUERY","message":"q is required"}})
        if len(term)>200: raise ValueError("q must be at most 200 characters")
        tables={"author":("authors","display_name"),"publication":("publications","title"),"topic":("topics","name")}
        chosen=tables if kind=="all" else ({kind:tables[kind]} if kind in tables else None)
        if chosen is None: return self.send_json(422,{"error":{"code":"INVALID_TYPE","message":"type must be author, publication, or topic"}})
        selects=[]; args=[]
        for typ,(table,col) in chosen.items():
            selects.append(f"SELECT id, '{typ}' AS type, {col} AS label FROM {table} WHERE {col} LIKE ?")
            args.append("%"+term+"%")
        union=" UNION ALL ".join(selects)
        total=db.execute(f"SELECT COUNT(*) FROM ({union})",args).fetchone()[0]
        rows=db.execute(f"SELECT id,type,label FROM ({union}) ORDER BY label COLLATE NOCASE, type, id LIMIT ? OFFSET ?",args+[limit,offset]).fetchall()
        results=[{"id":str(x["id"]),"type":x["type"],"label":x["label"]} for x in rows]
        return self.send_json(200,{"data":results,"meta":{"page":page,"limit":limit,"total":total}})
    def detail(self,db,kind,key,q):
        key=positive_id(key,"id")
        tables={"authors":("authors","id"),"publications":("publications","id"),"topics":("topics","id")}; table,_=tables[kind]
        row=db.execute(f"SELECT * FROM {table} WHERE id=?",(key,)).fetchone()
        if not row: return self.send_json(404,{"error":{"code":"NOT_FOUND","message":"Record not found"}})
        result=json_row(row)
        if kind=="authors":
            page,limit,offset=pagination(q)
            total=db.execute("SELECT COUNT(*) FROM authorships WHERE author_id=?",(key,)).fetchone()[0]
            result["publications"]=[json_row(x) for x in db.execute("SELECT p.id,p.title,p.doi,p.publication_year,a.source,a.source_record_id,a.match_status FROM authorships a JOIN publications p ON p.id=a.publication_id WHERE a.author_id=? ORDER BY p.publication_year DESC,p.id,a.source LIMIT ? OFFSET ?",(key,limit,offset))]
            result["publications_meta"]={"page":page,"limit":limit,"total":total}
        elif kind=="publications":
            result["authors"]=[json_row(x) for x in db.execute("SELECT a.id,a.display_name,asr.author_position,asr.source,asr.source_record_id,asr.match_status FROM authorships asr JOIN authors a ON a.id=asr.author_id WHERE asr.publication_id=? ORDER BY asr.author_position",(key,))]
            result["topics"]=[json_row(x) for x in db.execute("SELECT t.id,t.name,pt.source,pt.source_record_id,pt.match_status FROM publication_topics pt JOIN topics t ON t.id=pt.topic_id WHERE pt.publication_id=?",(key,))]
            result["metrics"]=[dict(x) for x in db.execute("SELECT source,source_record_id,citations,fwci,observed_at FROM publication_metrics WHERE publication_id=?",(key,))]
        elif kind=="topics":
            page,limit,offset=pagination(q)
            total=db.execute("SELECT COUNT(*) FROM publication_topics WHERE topic_id=?",(key,)).fetchone()[0]
            result["publications"]=[json_row(x) for x in db.execute("SELECT p.id,p.title,p.doi,p.publication_year,pt.source,pt.source_record_id,pt.match_status FROM publication_topics pt JOIN publications p ON p.id=pt.publication_id WHERE pt.topic_id=? ORDER BY p.publication_year DESC,p.id,pt.source LIMIT ? OFFSET ?",(key,limit,offset))]
            result["publications_meta"]={"page":page,"limit":limit,"total":total}
        return self.send_json(200,{"data":result})
    def graph(self,db,q):
        topic_id=(q.get("topic_id") or [None])[0]
        if not topic_id: return self.send_json(400,{"error":{"code":"INVALID_QUERY","message":"topic_id is required"}})
        topic_id=positive_id(topic_id,"topic_id")
        _,limit,_=pagination({"limit":q.get("limit",[25])},default=25,maximum=100)
        year_from=(q.get("year_from") or [None])[0]; year_to=(q.get("year_to") or [None])[0]
        if year_from is not None: year_from=positive_id(year_from,"year_from")
        if year_to is not None: year_to=positive_id(year_to,"year_to")
        if year_from and year_to and year_from>year_to: raise ValueError("year_from must be <= year_to")
        where=["pt.topic_id=?","pt.match_status='confirmed'"]; args=[topic_id]
        if year_from: where.append("(p.publication_year IS NULL OR p.publication_year>=?)"); args.append(int(year_from))
        if year_to: where.append("(p.publication_year IS NULL OR p.publication_year<=?)"); args.append(int(year_to))
        pubs=db.execute("SELECT DISTINCT p.id,p.title,p.publication_year FROM publications p JOIN publication_topics pt ON pt.publication_id=p.id WHERE "+" AND ".join(where)+" ORDER BY p.publication_year DESC,p.id LIMIT ?",args+[limit+1]).fetchall()
        topic=db.execute("SELECT id,name FROM topics WHERE id=?",(topic_id,)).fetchone()
        if not topic: return self.send_json(404,{"error":{"code":"NOT_FOUND","message":"Topic not found"}})
        nodes=[{"id":str(topic["id"]),"type":"topic","label":topic["name"]}]; edges=[]; seen={str(topic["id"])}
        truncated=len(pubs)>limit
        for p in pubs[:limit]:
            pkey=str(p["id"]); nodes.append({"id":pkey,"type":"publication","label":p["title"],"year":p["publication_year"]}); seen.add(pkey)
            ev=db.execute("SELECT source,source_record_id AS record_id FROM publication_topics WHERE publication_id=? AND topic_id=? AND match_status='confirmed' LIMIT 1",(p["id"],topic_id)).fetchone()
            edges.append({"source":str(topic_id),"target":pkey,"type":"HAS_TOPIC","evidence":dict(ev)})
            authors=db.execute("SELECT a.id,a.display_name,au.source,au.source_record_id FROM authors a JOIN authorships au ON au.author_id=a.id WHERE au.publication_id=? AND au.match_status='confirmed'",(p["id"],)).fetchall()
            for a in authors:
                akey=str(a["id"])
                if akey not in seen: nodes.append({"id":akey,"type":"author","label":a["display_name"]}); seen.add(akey)
                edges.append({"source":akey,"target":pkey,"type":"AUTHORED","evidence":{"source":a["source"],"record_id":a["source_record_id"]}})
        return self.send_json(200,{"nodes":nodes,"edges":edges,"meta":{"truncated":truncated,"publication_limit":limit,"returned_publications":min(len(pubs),limit)}})
    def log_message(self,fmt,*args): print("%s - %s"%(self.address_string(),fmt%args))

if __name__=="__main__":
    port=int(os.environ.get("ANT_PORT","8000")); host=os.environ.get("ANT_HOST","127.0.0.1")
    print(f"A.N.T. API listening on http://{host}:{port}")
    ThreadingHTTPServer((host,port),Handler).serve_forever()
