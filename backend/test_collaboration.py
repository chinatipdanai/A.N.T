"""Deterministic tests; no external API, key or bundled data required."""
import json
import sqlite3
import unittest
from pathlib import Path
from .collaboration import collaboration
from .geography import collaboration_continent, COUNTRY_GROUPS, COUNTRY_CONTINENT


class CollaborationTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.row_factory = sqlite3.Row
        self.db.executescript(Path(__file__).with_name("schema.sql").read_text())
        for i, code, oa in [(1, "TH", "I60837268"), (2, "JP", "I2"), (3, "US", "I3"), (4, None, "I4")]:
            self.db.execute("INSERT INTO institutions(id,name,openalex_institution_id,raw_json) VALUES(?,?,?,?)",
                            (i, f"Institution {i}", oa, json.dumps({"country_code": code})))
        for i in range(1, 5):
            self.db.execute("INSERT INTO publications(id,title,publication_year) VALUES(?,?,?)", (i, f"Paper {i}", 2020+i))
        # Same work repeated across sources must count once; unrelated source links must not join.
        for pub, inst, source, rid in [(1,1,'openalex_api','W1'),(1,2,'openalex_api','W1'),
                                      (1,1,'openalex','W1'),(1,2,'openalex','W1'),
                                      (2,1,'openalex_api','W2'),(2,2,'openalex_api','W2'),(2,3,'openalex_api','W2'),
                                      (3,1,'openalex_api','W3'),(3,4,'openalex_api','W3'),
                                      (4,1,'openalex_api','W4'),(4,3,'scival','E4')]:
            self.db.execute("INSERT INTO publication_institutions VALUES(?,?,?,?)", (pub, inst, source, rid))
        self.db.execute("INSERT INTO authors(id,display_name,openalex_author_id) VALUES(1,'Affiliated author','A1'),(2,'Other coauthor','A2')")
        work = {"authorships": [{"author": {"id": "https://openalex.org/A1"}, "institutions": [{"id": "https://openalex.org/I2"}]},
                                {"author": {"id": "https://openalex.org/A2"}, "institutions": [{"id": "https://openalex.org/I3"}]}]}
        self.db.execute("INSERT INTO source_records(source,source_record_id,record_type,raw_json) VALUES('openalex_api','W1','publication',?)", (json.dumps(work),))

    def tearDown(self):
        self.db.close()

    def test_unique_counts_unknown_country_and_source_boundaries(self):
        result = collaboration(self.db, {})
        countries = {r['id']: r for r in result['items']}
        self.assertEqual(countries['JP']['publication_count'], 2)
        self.assertEqual(countries['US']['publication_count'], 1)  # Paper 4 is not supported by the same source
        self.assertEqual(countries['ZZ']['publication_count'], 1)
        self.assertEqual(result['summary']['publications'], 3)  # Do not sum overlapping countries
        self.assertEqual(result['meta']['root_publications'], 4)
        self.assertEqual(result['meta']['unknown_country_institutions'], 1)
        self.assertNotIn('TH', countries)  # KMUTT itself is excluded

    def test_drill_down_pagination_and_years(self):
        result = collaboration(self.db, {'country': ['JP']})
        self.assertEqual(result['items'][0]['id'], '2')
        self.assertEqual(result['items'][0]['publication_count'], 2)
        result = collaboration(self.db, {'country': ['JP'], 'institution': ['2'], 'limit': ['1'], 'page': ['2']})
        self.assertEqual(result['meta']['total'], 2)
        self.assertEqual(result['items'][0]['id'], '1')
        filtered = collaboration(self.db, {'year_from': ['2022'], 'year_to': ['2022']})
        self.assertEqual(filtered['summary']['publications'], 1)
        mismatch = collaboration(self.db, {'country': ['US'], 'institution': ['2']})
        self.assertEqual(mismatch['items'], [])

    def test_author_affiliation_requires_original_evidence(self):
        result = collaboration(self.db, {'country': ['JP'], 'institution': ['2'], 'view': ['authors']})
        self.assertEqual([r['id'] for r in result['items']], ['1'])
        self.assertEqual(result['items'][0]['publication_count'], 1)

    def test_all_mode_returns_the_entire_scope(self):
        result = collaboration(self.db, {'all':['1'], 'limit':['1'], 'page':['2']})
        self.assertEqual(len(result['items']), 3)
        self.assertTrue(result['meta']['all'])
        self.assertEqual(result['meta']['page'], 1)
        self.assertEqual(result['meta']['total'], len(result['items']))
        pubs = collaboration(self.db, {'country':['JP'], 'institution':['2'], 'all':['1'], 'limit':['1']})
        self.assertEqual(len(pubs['items']), 2)

    def test_organization_groups_filters_and_distinct_counts(self):
        self.db.execute("UPDATE institutions SET raw_json=? WHERE id=2", (json.dumps({'country_code':'JP','type':'education'}),))
        self.db.execute("INSERT INTO institutions(id,name,openalex_institution_id,raw_json) VALUES(5,'Company','I5',?)", (json.dumps({'country_code':'JP','type':'company'}),))
        self.db.execute("INSERT INTO publication_institutions VALUES(1,5,'openalex_api','W1')")
        result = collaboration(self.db, {'country':['JP'],'group_by':['type'],'all':['1']})
        groups = {r['id']:r for r in result['items']}
        self.assertEqual(result['level'], 'institution_types')
        self.assertEqual(groups['education']['publication_count'], 2)
        self.assertEqual(groups['company']['publication_count'], 1)
        self.assertEqual(groups['education']['institution_count'], 1)
        self.assertEqual(result['summary']['publications'], 2)  # shared work belongs to both groups
        filtered = collaboration(self.db, {'country':['JP'],'institution_type':['company'],'all':['1']})
        self.assertEqual([r['id'] for r in filtered['items']], ['5'])
        self.assertEqual(filtered['items'][0]['institution_type'], 'company')
        mismatch = collaboration(self.db, {'country':['JP'],'institution_type':['company'],'institution':['2']})
        self.assertEqual(mismatch['items'], [])
        unknown = collaboration(self.db, {'country':['ZZ'],'group_by':['type'],'all':['1']})
        self.assertEqual(unknown['items'][0]['id'], 'unknown')
        self.db.execute("UPDATE institutions SET raw_json=? WHERE id=2", (json.dumps({'country_code':'JP','type':'facility'}),))
        facility = collaboration(self.db, {'country':['JP'],'group_by':['type'],'all':['1']})
        self.assertIn('facility', [r['id'] for r in facility['items']])

    def test_continents_domestic_exclusion_and_distinct_counts(self):
        for i, code in [(5,'TH'),(6,'CN')]:
            self.db.execute("INSERT INTO institutions(id,name,openalex_institution_id,raw_json) VALUES(?,?,?,?)", (i,f'Partner {i}',f'I{i}',json.dumps({'country_code':code})))
            self.db.execute("INSERT INTO publication_institutions VALUES(?,?,?,?)", (1,i,'openalex_api','W1'))
        grouped = collaboration(self.db, {'overview':['continents'],'all':['1']})
        groups = {r['id']:r for r in grouped['items']}
        self.assertEqual(grouped['level'], 'continents')
        self.assertEqual(groups['TH']['type'], 'country')
        self.assertEqual(groups['TH']['publication_count'], 1)
        self.assertEqual(groups['AS']['country_count'], 2)  # Japan and China, never Thailand
        self.assertEqual(groups['AS']['institution_count'], 2)
        self.assertEqual(groups['AS']['publication_count'], 2)  # shared paper counted once
        self.assertEqual(groups['UNKNOWN']['publication_count'], 1)
        self.assertEqual(grouped['summary']['publications'], 3)
        countries = collaboration(self.db, {'continent':['AS'],'all':['1']})
        self.assertEqual({r['id'] for r in countries['items']}, {'JP','CN'})
        mismatch = collaboration(self.db, {'continent':['AS'],'country':['TH']})
        self.assertEqual(mismatch['items'], [])
        unknown = collaboration(self.db, {'continent':['UNKNOWN'],'all':['1']})
        self.assertEqual(unknown['items'][0]['id'], 'ZZ')

    def test_geography_mapping_policy(self):
        self.assertEqual(collaboration_continent('TH'), 'TH')
        for code,group in [('JP','AS'),('TR','AS'),('CY','AS'),('RU','EU'),('EG','AF'),('MX','NA'),('BR','SA'),('AU','OC'),('CX','OC'),('TW','AS'),('XK','EU')]:
            self.assertEqual(collaboration_continent(code), group)
        self.assertEqual(collaboration_continent('ZZ'), 'UNKNOWN')
        self.assertEqual(collaboration_continent(None), 'UNKNOWN')
        self.assertEqual(len(COUNTRY_CONTINENT),sum(len(s.split()) for s in COUNTRY_GROUPS.values()))

    def test_invalid_input(self):
        for query in ({'country':['Japan']},{'page':['0']},{'limit':['101']},{'institution':['no']},
                      {'view':['other']},{'year_from':['2025'],'year_to':['2020']},
                      {'country':['JP'],'group_by':['region']},{'group_by':['type']},
                      {'country':['JP'],'institution_type':['lab']},{'institution_type':['company']},
                      {'overview':['invalid']},{'continent':['invalid']}):
            with self.assertRaises(ValueError):
                collaboration(self.db, query)
        with self.assertRaises(LookupError):
            collaboration(self.db, {'institution':['999']})


if __name__ == '__main__':
    unittest.main()
