# A.N.T. frontend

Frontend follows `design/wireframe`: a monochrome full-screen force graph, a top menu revealed on hover or keyboard focus, node tooltips, and a details drawer. Drag nodes, pan the background, or scroll to zoom. Select a node to highlight its neighbors. Hover or focus an edge to read its relationship in a tooltip. Escape closes details; Tab and Enter support keyboard navigation.

Node names normally use one line with up to 160px of text followed by an ellipsis when needed. Only the selected node expands to two lines; changing or clearing selection restores the compact caption. Both forms are measured and cached per node, preserve Thai grapheme clusters, and use an opaque canvas-colored background. Tooltip, accessible name and details retain the original full name. Label placement checks other labels, node circles, and available viewport space, prioritizing the selected node and retaining clear positions as the graph moves. Font size stays constant during zoom. If a dense area has no free position, its name remains accessible through the node tooltip and details panel.

Captions stay within 12 screen pixels of their own node boundary, with short dashed leader lines identifying their owner. Placement rejects anchors that are closer to another node and leaders that cross another node. Labels never migrate outward to distant free space. If no local position is clear, the caption and its leader are hidden together; the node and its full-name tooltip remain available. Positions and leaders update together when dragging, panning or zooming.

Start the existing backend from the repository root:

```cmd
py backend\api.py
```

Open `frontend/index.html` in Chrome or serve the repository with a local static server. The API defaults to `http://127.0.0.1:8000/api/v1`. To change it, define `window.ANT_API_BASE` before `app.js` loads.

`index.html` is exclusively the network workspace. The navigation links open separate documents: `people.html`, `academic.html`, and `roles.html`. Each page supports direct URLs, refresh, and browser back/forward. “แสดงในกราฟ” links to `index.html?type=author&id=…` (or `publication` / `topic`), where that record's network and details open automatically.

The initial graph shows KMUTT's collaboration overview, grouped by continent with Thailand separated. Click a country to see its institutions, then an institution to browse shared publications or authors whose affiliation is recorded in the original work. Click a publication/author for source details and use its explore action for the detailed record network. Breadcrumbs and browser Back return to prior levels with saved node positions, pan and zoom. URLs support refreshing or sharing a scope (`?country=JP&institution=…&view=authors`). Each hierarchy level loads its entire scope with `/collaborations?all=1`; the graph has no pagination. Nodes use concentric rings. Overview layouts initially pause motion to keep group targets stable; the motion button can enable it. Paused graphs redraw only when their view changes.

The home view starts with continents and a separate Thailand node. “ตามทวีป / ตามประเทศ” switches the overview; the flat-country view uses `?overview=countries`. A continent opens its countries, preserving `continent=AS` (etc.) in deeper organization/institution scopes and breadcrumbs. Thailand skips the continent level and opens organization groups. Asia excludes Thailand, so institutions are assigned to exactly one overview bucket. A shared publication can still span multiple buckets, while the overall summary counts it once. Group tooltips include country, institution and distinct publication counts. Missing/unmapped country codes go into an explicit unknown bucket. Only buckets with data appear, including Antarctica if present.

The offline mapping is in `backend/geography.py`, based on [UN M49](https://unstats.un.org/unsd/methodology/m49/overview/), with Northern America, Central America and Caribbean combined as North America. Source-code overrides place TW in Asia and XK in Europe. Transcontinental country/area codes use one declared bucket (e.g. RU in Europe, TR/CY in Asia). Mapping changes do not alter imported country codes or imply author nationality.

Within a country, “แสดงทั้งหมด / แยกตามประเภทองค์กร” switches between individual institutions and source-defined organization groups. Each group shows distinct shared publications and institution counts. Click a group to see only its members, then drill into an institution as usual. URLs retain `group_by=type` and `institution_type=education` (or another source type), and breadcrumbs preserve that grouping. Types include education, company, government, nonprofit, facility, healthcare, archive, funder, other and unknown. Missing or unrecognized types go to unknown; facility is kept as a source category and is not automatically described as a lab or research institute. Country and group totals count overlapping publications once within each scope.

Counts are distinct shared publications, so adding country counts can exceed the total (one work may involve multiple countries). Countries describe institution affiliations, not nationality. Unknown country metadata uses a separate `ZZ` group. KMUTT itself is excluded from partner institutions. Authors require author-level institution evidence; merely coauthoring a work does not establish membership. The hierarchy is served by `/collaborations` and makes no external requests. Empty/error states do not substitute sample data.

People and academic pages are independent directories backed by `/records?type=author` and `/records?type=publication`. They show the full database immediately (20 records per page), support search, previous/next and numbered page buttons, and retain query/page in the URL for refresh and Back. Clearing search returns to the complete directory. They do not read session storage or depend on a prior graph visit. Authors sort by name; publications by newest year, title and ID. Directory pages never run the graph simulation or request a network. Careers display an empty state until connected data is available. Research topics are not presented as verified skills.

Topic networks use confirmed edges from `/graph` with up to 25 publications. Author details show the first 20 linked publications, as specified by the API; the UI indicates truncation. Publication networks include source match status in their details. Evidence links open the original raw source record. Connection errors display a retry action, without fabricated fallback data.

Run browser smoke tests using installed Chrome (no npm dependencies):

```cmd
node frontend\tests\browser.cjs
```

Set `CHROME_PATH` if Chrome is installed elsewhere. Tests use API fixtures, including overlapping IDs across entity types, and verify desktop/mobile layout, selection, source links, review status, search, directories, offline handling and retry. Screenshot paths are printed at completion. Live API integration requires the backend to be running.

For a live hierarchy smoke test, set `ANT_LIVE_API=http://127.0.0.1:8000/api/v1` before running the same browser test. Backend hierarchy tests: `py -m unittest backend.test_collaboration -v`.
