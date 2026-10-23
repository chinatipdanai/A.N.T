# A.N.T. — Backend → Frontend handoff

**Status:** Local read-only prototype, tested against the three attached exports. Frontend can build search, results, record detail, and topic network views now.

## Start the service (Windows CMD)

From the project root:

```cmd
py -m pip install -r backend\requirements.txt
py backend\api.py
```

The ZIP already contains `backend\ant.db`. Check `http://127.0.0.1:8000/api/v1/health`. To rebuild the database, place the source files in `project_sources` using the supplied filenames, then run `py backend\import_data.py --reset` before starting the API. To test BE:

```cmd
py -m unittest backend.test_config backend.test_api backend.test_openalex -v
```

By default the API listens on `127.0.0.1:8000`. FE on another computer needs a reachable BE host: set `ANT_HOST=0.0.0.0` and `ANT_PORT=8000` on the BE machine, then set FE `VITE_API_BASE_URL=http://<BE-LAN-IP>:8000/api/v1`. Only use this on a trusted development network; there is no authentication in this local prototype.
BE can edit `backend\.env` for these settings instead of setting them in CMD. The file also holds `OPENALEX_API_KEY` for the optional API import; never send that file to FE.

## FE screens and endpoints

| FE screen/action | Request | Important result |
|---|---|---|
| Search | `GET /search?q=nanofluid&type=topic&page=1&limit=20` | `data[]`, `meta.total`; omit `type` to search all kinds |
| Author detail | `GET /authors/{id}?page=1&limit=20` | `data.publications[]`, `publications_meta` |
| Publication detail | `GET /publications/{id}` | `data.authors[]`, `topics[]`, `metrics[]` |
| Topic detail | `GET /topics/{id}?page=1&limit=20` | `data.publications[]`, `publications_meta` |
| Network graph | `GET /graph?topic_id={id}&limit=25` | `nodes[]`, `edges[]`, `meta.truncated` |
| Evidence view | `GET /raw/{source}/{record_type}/{source_record_id}` | `data.raw_json` with all original columns |

All URLs above are relative to `http://127.0.0.1:8000/api/v1`. URL-encode search text and source record IDs. Search `limit` is 1–100. Graph `limit` is publications, 1–100; author nodes can make the total node count larger. An invalid query returns HTTP 400, a missing record HTTP 404.

## Response shape and TypeScript types

```ts
type EntityType = "author" | "publication" | "topic";
type Source = "openalex" | "scival" | "openalex_api";
type PageMeta = { page: number; limit: number; total: number };
type SearchResponse = {
  data: Array<{ id: string; type: EntityType; label: string }>;
  meta: PageMeta;
};
type Evidence = { source: Source; record_id: string };
type GraphNode = {
  id: string;
  type: EntityType;
  label: string;
  year?: number | null;
};
type GraphEdge = {
  source: string; // node ID
  target: string; // node ID
  type: "HAS_TOPIC" | "AUTHORED";
  evidence: Evidence;
};
type GraphResponse = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: { truncated: boolean; publication_limit: number; returned_publications: number };
};
type ApiError = { error: { code: string; message: string } };
```

For detailed record fields, use `GET /authors/{id}`, `/publications/{id}`, and `/topics/{id}` directly. IDs in JSON responses are strings; use them unchanged in URL paths. For record evidence, `edge.evidence.record_id` is `source_record_id`; open `/raw/{source}/publication/{record_id}` for both `HAS_TOPIC` and `AUTHORED` edges.

## Minimal React/Vite request

```ts
const base = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

export async function searchANT(query: string, type?: EntityType, page = 1) {
  const params = new URLSearchParams({ q: query, page: String(page), limit: "20" });
  if (type) params.set("type", type);
  const response = await fetch(`${base}/search?${params}`);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Request failed");
  return body as SearchResponse;
}
```

## Known data boundaries

- The attached OpenAlex CSV does not contain publication titles. OpenAlex-only records may show Work IDs as labels until full OpenAlex API enrichment is implemented.
- OpenAlex and SciVal author identities are not automatically merged just because an ORCID matches; the same person can appear as two nodes until reviewed.
- SciVal topics are marked `needs_review` and are excluded from confirmed graph edges; OpenAlex topics can already drive the graph.
- The bundled DB serves the attached exports. BE can optionally enrich OpenAlex Works using `fetch_openalex.py`; no live SciVal sync is included. It is intended for BE/FE integration, not public deployment.
