# Field inventory for attached source exports

All listed columns are retained verbatim as keys in `source_records.raw_json`. The normalized relational schema is an index for commonly queried entities/relationships, not a lossy replacement of these raw records.

## OpenAlex works CSV — 22 fields

`Work ID`, `Author`, `Author IDs`, `ORCID`, `Has ORCID`, `Authors count`, `Institution`, `Institution IDs`, `Topic`, `Topic IDs`, `Awards`, `Funder`, `Funder IDs`, `Year`, `DOI`, `Citation count`, `FWCI`, `Field`, `Field IDs`, `Keyword`, `Keyword IDs`, `Corresponding author`.

## SciVal publications workbook — 17 fields

`Title`, `Authors`, `Number of Authors`, `Scopus Author Ids`, `Year`, `Scopus Source title`, `Citations`, `Field-Weighted Citation Impact`, `Reference`, `Abstract`, `DOI`, `EID`, `Institutions`, `Institution IDs`, `Scopus Affiliation IDs`, `Topic Cluster name`, `Topic name`.

The workbook contains preamble/metadata before the header. The importer locates the `Title` row as the column header. The sample export metadata reports data source Scopus, update date 6 Sep 2026, export date 17 Sep 2026, and 16,867 publications. The actual import includes each non-empty row after the header and preserves even non-normalizable rows in raw storage.

## SciVal authors workbook — 13 fields

`Name`, `Scholarly Output`, `Most recent publication`, `Citations`, `Citations per Publication`, `Field-Weighted Citation Impact`, `h-index`, `Output in Top 10% Citation Percentiles (field-weighted)`, `Oldest publication (since 1996)`, `Scopus author ID`, `Scopus author profile`, `Primary author affiliation*`, `ORCID (linked to Scopus author profile)`.

The workbook contains preamble/metadata before the header. The importer locates the `Name` row. A small number of rows have no Scopus author ID; those source records remain available in `source_records` and are listed in `import_errors` because they cannot be safely normalized as an author.

## Full OpenAlex API payloads

The attached CSV is an export with the 22 fields above, not a full response dump of every OpenAlex endpoint. The bundled database imports only the attached exports. `fetch_openalex.py` can retrieve full JSON for **Works** affiliated with the chosen institution, preserving responses as `openalex_api` source records with cursor/filter/checkpoint information in `import_runs`. It does not currently request independent full JSON records for Authors, Topics, Institutions or other endpoints. Do not infer that fields absent from the CSV were fetched until that job has actually run.
