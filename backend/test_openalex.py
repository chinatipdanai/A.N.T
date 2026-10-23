"""Offline tests for the OpenAlex API import and cursor resume flow."""
import json
import sqlite3
import unittest
from .import_data import setup, source_record, upsert_publication
from .fetch_openalex import harvest

class OpenAlexImporterTest(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        setup(self.db)
        upsert_publication(self.db,"W1",oa="W1",doi_value="10.1000/a")
        source_record(self.db,"openalex","W1","publication",None,{"Work ID":"W1"})
        self.db.commit()

    def tearDown(self): self.db.close()

    def test_full_payload_title_and_resume(self):
        calls=[]
        def mock_fetch(cursor,per_page,institution,key):
            calls.append((cursor,per_page,institution,key))
            if cursor=="*":
                return {"meta":{"count":2,"next_cursor":"next-page","cost_usd":0.0001},"results":[{
                    "id":"https://openalex.org/W1","title":"Actual title","doi":"https://doi.org/10.1000/a","publication_year":2025,
                    "cited_by_count":4,"extra_field":{"nested":True},
                    "authorships":[{"author":{"id":"https://openalex.org/A1","display_name":"Researcher One"},
                                   "institutions":[{"id":"https://openalex.org/I60837268","display_name":"KMUTT"}],"is_corresponding":True}],
                    "topics":[{"id":"https://openalex.org/T1","display_name":"Test topic"}]}]}
            if cursor=="next-page":
                return {"meta":{"count":2,"next_cursor":None,"cost_usd":0.0001},"results":[{
                    "id":"https://openalex.org/W2","title":"Second title","publication_year":2026,"authorships":[],"topics":[]}]}
            raise AssertionError("unexpected cursor")
        first=harvest(self.db,key="dummy-key",max_pages=1,fetch=mock_fetch)
        self.assertEqual(first["status"],"paused")
        self.assertEqual(self.db.execute("SELECT title FROM publications WHERE openalex_work_id='W1'").fetchone()[0],"Actual title")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM source_records WHERE source='openalex' AND source_record_id='W1'").fetchone()[0],1)
        raw=json.loads(self.db.execute("SELECT raw_json FROM source_records WHERE source='openalex_api' AND source_record_id='W1'").fetchone()[0])
        self.assertEqual(raw["extra_field"],{"nested":True})
        second=harvest(self.db,key="dummy-key",resume=True,fetch=mock_fetch)
        self.assertEqual(second["status"],"completed")
        self.assertEqual(second["rows_loaded"],2)
        self.assertEqual([c[0] for c in calls],["*","next-page"])
        details=self.db.execute("SELECT details_json FROM import_runs WHERE id=?",(second["run_id"],)).fetchone()[0]
        self.assertNotIn("dummy-key",details)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM publication_topics WHERE source='openalex_api'").fetchone()[0],1)

if __name__=="__main__": unittest.main()
