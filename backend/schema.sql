PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS import_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_file TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  rows_seen INTEGER NOT NULL DEFAULT 0,
  rows_loaded INTEGER NOT NULL DEFAULT 0,
  rows_rejected INTEGER NOT NULL DEFAULT 0,
  details_json TEXT
);
CREATE TABLE IF NOT EXISTS source_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  import_run_id INTEGER REFERENCES import_runs(id),
  raw_json TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source, source_record_id, record_type)
);
CREATE TABLE IF NOT EXISTS import_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_run_id INTEGER NOT NULL REFERENCES import_runs(id),
  source_record_id TEXT NOT NULL,
  error_message TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openalex_author_id TEXT UNIQUE,
  scopus_author_id TEXT UNIQUE,
  orcid TEXT,
  display_name TEXT NOT NULL,
  raw_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openalex_work_id TEXT UNIQUE,
  scopus_eid TEXT UNIQUE,
  doi TEXT UNIQUE,
  title TEXT NOT NULL,
  publication_year INTEGER,
  source_title TEXT,
  raw_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openalex_topic_id TEXT UNIQUE,
  name TEXT NOT NULL,
  raw_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS institutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openalex_institution_id TEXT UNIQUE,
  scopus_affiliation_id TEXT,
  name TEXT NOT NULL,
  raw_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS funders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openalex_funder_id TEXT UNIQUE,
  name TEXT NOT NULL,
  raw_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS authorships (
  author_id INTEGER NOT NULL REFERENCES authors(id),
  publication_id INTEGER NOT NULL REFERENCES publications(id),
  author_position INTEGER,
  is_corresponding INTEGER,
  source TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  match_status TEXT NOT NULL DEFAULT 'confirmed',
  PRIMARY KEY(author_id, publication_id, source)
);
CREATE TABLE IF NOT EXISTS publication_topics (
  publication_id INTEGER NOT NULL REFERENCES publications(id),
  topic_id INTEGER NOT NULL REFERENCES topics(id),
  source TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  match_status TEXT NOT NULL DEFAULT 'confirmed',
  PRIMARY KEY(publication_id, topic_id, source)
);
CREATE TABLE IF NOT EXISTS publication_institutions (
  publication_id INTEGER NOT NULL REFERENCES publications(id),
  institution_id INTEGER NOT NULL REFERENCES institutions(id),
  source TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  PRIMARY KEY(publication_id, institution_id, source)
);
CREATE TABLE IF NOT EXISTS publication_funders (
  publication_id INTEGER NOT NULL REFERENCES publications(id),
  funder_id INTEGER NOT NULL REFERENCES funders(id),
  source TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  PRIMARY KEY(publication_id, funder_id, source)
);
CREATE TABLE IF NOT EXISTS publication_metrics (
  publication_id INTEGER NOT NULL REFERENCES publications(id),
  source TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  citations REAL,
  fwci REAL,
  observed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(publication_id, source, source_record_id)
);
CREATE TABLE IF NOT EXISTS author_metrics (
  author_id INTEGER NOT NULL REFERENCES authors(id),
  source TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  scholarly_output REAL,
  citations REAL,
  citations_per_publication REAL,
  fwci REAL,
  h_index REAL,
  observed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(author_id, source, source_record_id)
);
CREATE INDEX IF NOT EXISTS idx_publication_year ON publications(publication_year);
CREATE INDEX IF NOT EXISTS idx_author_name ON authors(display_name);
CREATE INDEX IF NOT EXISTS idx_topic_name ON topics(name);
CREATE INDEX IF NOT EXISTS idx_authorship_pub ON authorships(publication_id);
CREATE INDEX IF NOT EXISTS idx_pub_topic_topic ON publication_topics(topic_id);
