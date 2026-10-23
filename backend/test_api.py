"""Run with: python -m unittest backend.test_api -v (requires backend/ant.db)."""
import json
import sqlite3
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import urlopen

from .api import Handler, DB_PATH

class APISmokeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not DB_PATH.exists(): raise unittest.SkipTest("Build backend/ant.db first")
        cls.server=ThreadingHTTPServer(("127.0.0.1",0),Handler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True)
        cls.thread.start()
        cls.base=f"http://127.0.0.1:{cls.server.server_port}/api/v1"
        cls.db=sqlite3.connect(DB_PATH)

    @classmethod
    def tearDownClass(cls):
        cls.db.close(); cls.server.shutdown(); cls.server.server_close(); cls.thread.join(timeout=2)

    def get(self,path):
        try:
            with urlopen(self.base+path,timeout=10) as response:
                return response.status,json.load(response)
        except HTTPError as e:
            return e.code,json.load(e)

    def test_imports_and_raw_are_complete(self):
        status,imports=self.get("/imports")
        self.assertEqual(status,200)
        expected=sum(x["rows_seen"] for x in imports["data"] if x["source"]!="openalex_api")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM source_records WHERE source!='openalex_api'").fetchone()[0],expected)
        source,kind,rid=self.db.execute("SELECT source,record_type,source_record_id FROM source_records WHERE source='openalex' LIMIT 1").fetchone()
        status,raw=self.get(f"/raw/{source}/{kind}/{quote(rid,safe='')}")
        self.assertEqual(status,200)
        self.assertEqual(len(raw["data"]["raw_json"]),22)

    def test_search_paginates_globally(self):
        _,first=self.get("/search?q=nanofluid&page=1&limit=2")
        _,second=self.get("/search?q=nanofluid&page=2&limit=2")
        self.assertEqual(len(first["data"]),2)
        self.assertEqual(len(second["data"]),2)
        self.assertEqual(first["meta"]["total"],second["meta"]["total"])
        self.assertNotEqual(first["data"],second["data"])
        self.assertTrue(all(isinstance(x["id"],str) for x in first["data"]))

    def test_details_and_graph_have_evidence(self):
        topic_id=self.db.execute("SELECT topic_id FROM publication_topics WHERE match_status='confirmed' LIMIT 1").fetchone()[0]
        status,topic=self.get(f"/topics/{topic_id}?page=1&limit=2")
        self.assertEqual(status,200)
        self.assertEqual(topic["data"]["id"],str(topic_id))
        self.assertLessEqual(len(topic["data"]["publications"]),2)
        self.assertIn("publications_meta",topic["data"])
        status,graph=self.get(f"/graph?topic_id={topic_id}&limit=2")
        self.assertEqual(status,200)
        self.assertTrue(graph["edges"])
        self.assertTrue(all(e["evidence"]["source"] and e["evidence"]["record_id"] for e in graph["edges"] if e["type"]=="HAS_TOPIC"))
        pub_id=next(n["id"] for n in graph["nodes"] if n["type"]=="publication")
        status,pub=self.get(f"/publications/{pub_id}")
        self.assertEqual(status,200)
        self.assertIsInstance(pub["data"]["authors"],list)

    def test_input_errors_are_client_errors(self):
        for path in ("/search?q=x&page=oops","/search?q=x&limit=-1","/graph?topic_id=nope","/topics/0","/authors/999999999"):
            status,response=self.get(path)
            self.assertIn(status,(400,404))
            self.assertIn("error",response)

if __name__=="__main__": unittest.main()
