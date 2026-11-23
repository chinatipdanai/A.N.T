import sqlite3
import unittest
from pathlib import Path
from .records import list_records


class RecordsTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.db.executescript(Path(__file__).with_name('schema.sql').read_text())
        for i in range(1, 42):
            self.db.execute('INSERT INTO authors(id,display_name) VALUES(?,?)', (i, f'Person {i:02}'))
            self.db.execute('INSERT INTO publications(id,title,publication_year) VALUES(?,?,?)', (i, f'Paper {i:02}', 2025 if i % 2 else 2024))

    def tearDown(self):
        self.db.close()

    def test_unfiltered_directories_are_independent_and_paginated(self):
        first = list_records(self.db, {'type':['author']})
        second = list_records(self.db, {'type':['author'], 'page':['2']})
        last = list_records(self.db, {'type':['author'], 'page':['3']})
        self.assertEqual(first['meta']['total'], 41)
        self.assertEqual(first['meta']['pages'], 3)
        self.assertEqual(len(first['data']), 20)
        self.assertEqual(len(last['data']), 1)
        self.assertFalse({r['id'] for r in first['data']} & {r['id'] for r in second['data']})
        # There are no graph edges at all in this test database.
        pubs = list_records(self.db, {'type':['publication']})
        self.assertEqual(pubs['meta']['total'], 41)
        self.assertTrue(all(r['year'] == 2025 for r in pubs['data']))

    def test_search_and_empty_result(self):
        result = list_records(self.db, {'type':['author'], 'q':['Person 01']})
        self.assertEqual(result['meta']['total'], 1)
        self.assertEqual(result['data'][0]['id'], '1')
        self.assertEqual(list_records(self.db, {'type':['publication'], 'q':['missing']})['meta']['pages'], 0)

    def test_invalid_queries(self):
        for q in ({'type':['role']},{'type':['author'],'page':['0']},{'type':['author'],'page':['bad']},
                  {'type':['author'],'limit':['101']},{'type':['publication'],'q':['x'*201]}):
            with self.assertRaises(ValueError):
                list_records(self.db, q)
