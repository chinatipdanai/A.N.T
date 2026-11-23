# A.N.T. Backend (local prototype)

This backend imports the supplied full sample exports into SQLite and can enrich them with full OpenAlex Works API JSON. Every original source column/payload is stored without loss in `source_records.raw_json`; normalized tables power search, detail, and graph endpoints. No source value is silently overwritten by a different provider's metric.

## Requirements

- Python 3.10+
- Install spreadsheet dependencies: `python -m pip install -r backend/requirements.txt`

## Import all three attached sources

From the workspace root:

```bash
python backend/import_data.py --reset
```

This creates `backend/ant.db`. Use `--reset` to rebuild it from the source exports. To import custom paths:

```bash
python backend/import_data.py --reset \
  --openalex path/to/works.csv \
  --scival-publications path/to/publications.xlsx \
  --scival-authors path/to/authors.xlsx
```

Each import creates an `import_runs` entry with source file, counts, status, and error summary. Every row is retained as a raw `source_records` record, including rejected rows in `import_errors`. Rejected rows are not represented as trusted normalized relationships until reviewed.

## OpenAlex API key and full Works import (Windows CMD)

Open `backend\.env` in a text editor and paste your key into this line:

```dotenv
OPENALEX_API_KEY=PASTE_YOUR_KEY_HERE
```

Save the file and run in CMD from the project root:

```cmd
py backend\fetch_openalex.py --max-pages 1
```

The request loads up to 100 KMUTT works (institution `I60837268`) and stores full JSON in `source_records` with source `openalex_api`. If the result says `status: paused`, continue from the saved cursor:

```cmd
py backend\fetch_openalex.py --resume
```

Other editable values in `.env` are `OPENALEX_INSTITUTION_ID`, `OPENALEX_PER_PAGE`, `ANT_DB`, `ANT_SOURCE_DIR`, `ANT_HOST`, and `ANT_PORT`. Command-line flags override the corresponding defaults, and process environment variables override `.env`. Relative paths are resolved from the project root. To try another institution, change the value or pass `--institution I...`.

The importer stores one checkpoint per page in `import_runs.details_json`; interruption does not require starting from page 1. It uses a bearer authorization header and never writes or prints the key. OpenAlex's documented cursor paging requires a verified free API key beyond the first page. API access was tested with mocked responses; a real fetch requires your own activated key and network access. **Do not rerun `import_data.py --reset` after API enrichment** unless you intend to rebuild the DB and fetch again. `backend/.env` is excluded by `backend/.gitignore`; keep it private when sharing files.

## Start the API

```bash
python backend/api.py
```

Default URL: `http://localhost:8000`. Set `ANT_DB` to use another database file and `ANT_PORT` to choose another port.
The server binds to `127.0.0.1` by default. Set `ANT_HOST` to another interface only for a trusted development network.

Run the backend HTTP smoke tests against the bundled database:

```bash
python -m unittest backend.test_config backend.test_api backend.test_openalex -v
```

See `FE_HANDOFF.md` for Windows CMD commands, response types, and a React/Vite integration example.

### Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/health` | Check API process |
| `GET /api/v1/stats` | Count normalized records and source records |
| `GET /api/v1/imports` | Review import runs and rejected-row summaries |
| `GET /api/v1/search?q=nanofluid&type=topic&page=1&limit=20` | Search `author`, `publication`, `topic`, or all |
| `GET /api/v1/records?type=author&page=1&limit=20` | Independent full author directory; `type=publication` for works, optional `q` searches within the directory |
| `GET /api/v1/authors/{id}?page=1&limit=20` | Author and paginated linked publications |
| `GET /api/v1/publications/{id}` | Publication, authors, topics, source metrics |
| `GET /api/v1/topics/{id}?page=1&limit=20` | Topic and paginated linked publications |
| `GET /api/v1/graph?topic_id={id}&limit=25` | Evidence-backed topic → publication → author graph |
| `GET /api/v1/collaborations?country=JP&institution={id}&view=authors&page=1&limit=24` | KMUTT → countries → institutions → shared publications / authors with verified affiliation; omit country/institution to move up |
| `GET /api/v1/raw/{source}/{record_type}/{source_record_id}` | Original complete source row |

Graph endpoint defaults to confirmed topic edges only and caps returned publications at 100. IDs containing special URL characters must be percent-encoded.

The collaboration endpoint groups distinct shared publications from `publication_institutions`, requiring KMUTT (`I60837268`) and each partner to occur in the same source record. It excludes KMUTT itself, uses institution `raw_json.country_code` (`ZZ` for missing values), and counts multi-country papers once in the overall summary. `view=publications` is the default; `view=authors` requires author-level affiliation evidence in the original full Works JSON, not a generic coauthor link. `all=1` returns the entire current scope and ignores pagination; this is what the graph uses. Paginated API requests remain supported for other consumers. It accepts `year_from`, `year_to`, `page`, and `limit` (1–100). An active year filter excludes works with missing years. No source data or schema is modified. Test with `py -m unittest backend.test_collaboration backend.test_records -v`.

The records endpoint accepts `type=author|publication`, optional `q`, `page` (>=1), and `limit` (1–100, default 20). Empty queries list all records without any graph filter. Metadata includes total rows and total pages. Results have deterministic ordering, with publications sorted by newest year first.

Country collaboration scopes also support `group_by=type` to return `level=institution_types` groups, and `institution_type=education|company|government|nonprofit|facility|healthcare|archive|funder|other|unknown` to filter institutions and all deeper scopes. Both options require `country`. Group counts use distinct publications and institutions, keeping shared works from being counted twice inside a group. Types come from institution `raw_json.type`; missing or unrecognized values use `unknown`. `facility` is retained without inferring lab membership. Use `all=1` to load every group or member without graph pagination.

`overview=continents&all=1` returns the homepage's continent groups plus a separate Thailand country node. `continent=AF|AS|EU|NA|SA|OC|AN|UNKNOWN` filters every deeper scope; Asia excludes Thailand. Continent items include `country_count`, `institution_count` and distinct `publication_count`. `overview=countries` (the API compatibility default) retains a flat country list. The frontend requests continents by default. Mapping policy and source are documented in `geography.py`; it is entirely offline and preserves original source codes. Unknown mappings remain visible rather than being inferred.

## Data handling

- DOI is normalized for cross-source matching; original strings remain in raw source JSON.
- The supplied OpenAlex CSV has no publication title column. Matched SciVal publications use its title; OpenAlex-only records display their Work ID until a full OpenAlex API response supplies the title.
- Authors are matched using source identifiers (OpenAlex Author ID / Scopus Author ID). ORCID is retained but is not used to merge two records when a source identifier is present.
- OpenAlex Topic IDs are retained. SciVal topic labels are kept as source-specific names and marked `needs_review` until mapped.
- SciVal institution rows can truncate institutions and author exports can repeat an author across institutional affiliations; raw rows and import date are preserved.
- Citation/FWCI values are stored per source and record. They are not treated as interchangeable.
- The bundled DB represents the attached exports. `fetch_openalex.py` optionally retrieves current OpenAlex Works full JSON for the selected institution. It is a manual import, not a scheduled sync, and it does not fetch SciVal live data.

## Database contents

See `schema.sql`. In addition to normalized graph tables, `source_records` preserves complete source payloads; `import_errors` preserves rows that could not be normalized; `import_runs` records provenance. SQLite is suitable for the local prototype. For team deployment, migrate the schema to PostgreSQL and configure access control, backups, secret management, and a controlled production import process.
