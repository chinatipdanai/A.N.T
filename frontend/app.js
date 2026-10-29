const API_BASE = "http://127.0.0.1:8000/api/v1";
const paths = { author: "authors", publication: "publications", topic: "topics" };

const searchInput = document.querySelector("#search-input");
const searchType = document.querySelector("#search-type");
const resultCount = document.querySelector("#result-count");
const results = document.querySelector("#results");
const graph = document.querySelector("#graph");
const details = document.querySelector("#details");
const viewButtons = [document.querySelector("#flow-view"), document.querySelector("#network-view")];

let matches = [];
let searchMessage = "Type a topic, publication, or author to search.";
let selectedRecord = null;
let recordDetails = null;
let selectedRelation = null;
let detailMessage = "Select a search result to see its relationships.";
let searchTimer;
let searchVersion = 0;
let detailVersion = 0;
let viewMode = "flow";

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = String(text);
  return node;
}

async function getJSON(path) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new Error("Cannot reach the backend. Run python3 backend/api.py and try again.");
  }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || `Request failed (${response.status}).`);
  return body;
}

function renderResults() {
  results.replaceChildren();
  resultCount.textContent = searchMessage;
  for (const match of matches) {
    const item = element("li");
    const button = element("button", "result-button");
    const isSelected = selectedRecord?.id === match.id && selectedRecord?.type === match.type;
    button.type = "button";
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
    const meta = element("span", "result-meta");
    meta.append(
      element("span", `type-tag ${match.type}`, match.type),
      element("span", "record-id", `Record ${match.id}`),
    );
    button.append(element("span", "result-title", match.label), meta);
    button.addEventListener("click", () => loadRecord(match));
    item.append(button);
    results.append(item);
  }
}

function graphNode(type, label, relation = null) {
  const button = element("button", `graph-node ${type}`);
  const isSelected = relation
    ? selectedRelation?.type === relation.type && selectedRelation?.id === relation.id
    : selectedRelation === null;
  button.type = "button";
  button.dataset.key = relation ? `${relation.type}:${relation.id}` : "root";
  button.classList.toggle("is-selected", isSelected);
  button.setAttribute("aria-pressed", String(isSelected));
  button.append(element("span", "", type), element("strong", "", label));
  button.addEventListener("click", () => selectGraphNode(relation));
  return button;
}

function selectGraphNode(relation) {
  selectedRelation = relation;
  renderGraph();
  renderDetails();
  const key = relation ? `${relation.type}:${relation.id}` : "root";
  Array.from(graph.querySelectorAll("[data-key]")).find((node) => node.dataset.key === key)?.focus();
}

function relationForRecord(type, record, publicationTitle) {
  return {
    type,
    id: record.id,
    label: type === "author" ? record.display_name : type === "topic" ? record.name : record.title,
    publicationTitle,
    source: record.source,
    sourceRecordId: record.source_record_id,
    matchStatus: record.match_status,
  };
}

function relationGroup(type, records, emptyText, publicationTitle) {
  const group = element("div", "graph-group");
  if (!records.length) {
    group.append(element("p", "empty", emptyText));
    return group;
  }
  for (const record of records) {
    const relation = relationForRecord(type, record, publicationTitle);
    group.append(graphNode(type, relation.label, relation));
  }
  return group;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(tag, attributes = {}, label) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  if (label != null) node.textContent = label;
  return node;
}

function shortLabel(label, limit = 24) {
  return label.length > limit ? `${label.slice(0, limit - 1).trimEnd()}…` : label;
}

function networkNode(svg, type, label, x, y, relation = null, side = "right") {
  const selected = relation
    ? selectedRelation?.type === relation.type && selectedRelation?.id === relation.id
    : selectedRelation === null;
  const node = svgElement("g", {
    class: `network-node ${type}${selected ? " is-selected" : ""}`,
    tabindex: 0,
    role: "button",
    "aria-label": `${type}: ${label}`,
    "aria-pressed": selected,
    "data-key": relation ? `${relation.type}:${relation.id}` : "root",
  });
  node.append(svgElement("title", {}, label));
  node.append(svgElement("circle", { cx: x, cy: y, r: relation ? 12 : 34 }));
  const text = svgElement("text", {
    x: relation ? x + (side === "left" ? -23 : 23) : x,
    y: relation ? y + 4 : y + 59,
    "text-anchor": relation ? (side === "left" ? "end" : "start") : "middle",
  }, shortLabel(label, relation ? 25 : 52));
  node.append(text);
  const select = () => selectGraphNode(relation);
  node.addEventListener("click", select);
  node.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select();
    }
  });
  svg.append(node);
}

function renderNetwork() {
  const svg = svgElement("svg", {
    class: "network-visualization",
    viewBox: "0 0 900 600",
    role: "group",
    "aria-label": "Connections around the selected research record",
  });
  const left = [];
  const right = [];
  if (selectedRecord.type === "publication") {
    left.push(...(recordDetails.topics || []).map((record) => relationForRecord("topic", record, recordDetails.title)));
    right.push(...(recordDetails.authors || []).map((record) => relationForRecord("author", record, recordDetails.title)));
  } else {
    const publications = (recordDetails.publications || []).map((record) => relationForRecord("publication", record, null));
    publications.forEach((record, index) => (index % 2 ? right : left).push(record));
  }

  const visibleLeft = left.slice(0, 12);
  const visibleRight = right.slice(0, 12);
  const centerX = 450;
  const centerY = 220;
  const nodeY = (count, index) => count === 1 ? centerY
    : count <= 4 ? centerY + (index - (count - 1) / 2) * 70
    : 45 + index * (470 / (count - 1));
  const drawSide = (records, x) => {
    records.forEach((record, index) => {
      const y = nodeY(records.length, index);
      svg.append(svgElement("line", { class: `network-edge ${record.type}`, x1: centerX, y1: centerY, x2: x, y2: y }));
    });
  };
  drawSide(visibleLeft, 170);
  drawSide(visibleRight, 730);
  networkNode(svg, selectedRecord.type, selectedRecord.label, centerX, centerY);
  const addSide = (records, x, side) => records.forEach((record, index) => {
    const y = nodeY(records.length, index);
    networkNode(svg, record.type, record.label, x, y, record, side);
  });
  addSide(visibleLeft, 170, "left");
  addSide(visibleRight, 730, "right");
  graph.append(svg);

  const total = left.length + right.length;
  const shown = visibleLeft.length + visibleRight.length;
  graph.append(element("p", "network-caption", total > shown
    ? `Showing ${shown} of ${total} loaded connections. Use Flow view to see the rest.`
    : `${shown} connections shown · Select a node to inspect its source.`));
}

function renderGraph() {
  graph.replaceChildren();
  graph.classList.toggle("is-empty", !recordDetails);
  graph.classList.toggle("is-network", viewMode === "network" && !!recordDetails);
  if (!recordDetails) {
    const emptyState = element("div", "canvas-empty");
    const icon = element("div", "canvas-icon");
    icon.setAttribute("aria-hidden", "true");
    icon.append(element("i"), element("i"), element("i"));
    emptyState.append(
      icon,
      element("h3", "", detailMessage === "Loading record..." ? "Loading the connection" : selectedRecord ? "Could not show this connection" : "Start with a search"),
      element("p", "", detailMessage),
    );
    graph.append(emptyState);
    return;
  }

  if (viewMode === "network") {
    renderNetwork();
    return;
  }

  const path = element("div", "graph-path");
  if (selectedRecord.type === "publication") {
    path.append(
      relationGroup("topic", recordDetails.topics || [], "No topic link in this record.", recordDetails.title),
      element("span", "relationship", "linked to"),
      graphNode("publication", recordDetails.title),
      element("span", "relationship", "author records"),
      relationGroup("author", recordDetails.authors || [], "No author link in this record.", recordDetails.title),
    );
  } else {
    path.classList.add("related");
    path.append(
      graphNode(selectedRecord.type, selectedRecord.label),
      element("span", "relationship", selectedRecord.type === "author" ? "listed on" : "linked to"),
      relationGroup("publication", recordDetails.publications || [], "No linked publications in this record.", null),
    );
    const shown = recordDetails.publications?.length || 0;
    const total = recordDetails.publications_meta?.total || 0;
    if (total > shown) graph.append(element("p", "graph-note", `Showing ${shown} of ${total} linked publications.`));
  }
  graph.prepend(path);
}

function detailRow(list, label, value) {
  list.append(element("dt", "", label), element("dd", "", value));
}

function renderDetails() {
  details.replaceChildren();
  if (!recordDetails) {
    const placeholder = element("div", "details-placeholder");
    placeholder.append(element("span", "details-placeholder-icon", "↗"), element("p", "", detailMessage));
    details.append(placeholder);
    return;
  }

  const relation = selectedRelation;
  const type = relation?.type || selectedRecord.type;
  const title = relation?.label || selectedRecord.label;
  details.append(element("span", "detail-type", type), element("h3", "", title));
  const list = element("dl", "detail-list");

  if (relation) {
    const parent = relation.publicationTitle || selectedRecord.label;
    details.append(element("p", "detail-copy", `${title} is linked to “${parent}” in the source record below.`));
    detailRow(list, "Source", relation.source || "Unknown");
    detailRow(list, "Source record ID", relation.sourceRecordId || "Unknown");
    detailRow(list, "Match status", relation.matchStatus || "Unknown");
    if (relation.matchStatus && relation.matchStatus !== "confirmed") {
      details.append(element("p", "review-note", "This link still needs review. Do not treat it as a verified connection."));
    }
  } else if (type === "publication") {
    detailRow(list, "Publication year", recordDetails.publication_year ?? "Unknown");
    detailRow(list, "DOI", recordDetails.doi || "Not available");
    detailRow(list, "Author records shown", recordDetails.authors?.length || 0);
    detailRow(list, "Topics shown", recordDetails.topics?.length || 0);
  } else {
    detailRow(list, "Linked publications", recordDetails.publications_meta?.total || 0);
    detailRow(list, "Record ID", selectedRecord.id);
  }
  details.append(list);

  if (!relation && (type === "author" || type === "publication")) {
    details.append(element("p", "review-note", "The same person may appear in separate source records until their identities are reviewed."));
  }

  if (relation?.source && relation.sourceRecordId) {
    const link = element("a", "detail-link", "View original source record");
    link.href = `${API_BASE}/raw/${encodeURIComponent(relation.source)}/publication/${encodeURIComponent(relation.sourceRecordId)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    details.append(link);
  }
  if (relation?.type === "publication") {
    const button = element("button", "detail-action", "Open publication details");
    button.type = "button";
    button.addEventListener("click", () => loadRecord({ id: relation.id, type: "publication", label: relation.label }));
    details.append(button);
  }
}

function render() {
  renderResults();
  renderGraph();
  renderDetails();
}

async function loadRecord(record) {
  const version = ++detailVersion;
  selectedRecord = record;
  selectedRelation = null;
  recordDetails = null;
  detailMessage = "Loading record...";
  render();
  try {
    const body = await getJSON(`/${paths[record.type]}/${encodeURIComponent(record.id)}`);
    if (version !== detailVersion) return;
    recordDetails = body.data;
    render();
  } catch (error) {
    if (version !== detailVersion) return;
    detailMessage = error.message;
    render();
  }
}

function search() {
  clearTimeout(searchTimer);
  const version = ++searchVersion;
  ++detailVersion;
  matches = [];
  selectedRecord = null;
  selectedRelation = null;
  recordDetails = null;
  const query = searchInput.value.trim();
  searchMessage = query ? "Searching..." : "Type a topic, publication, or author to search.";
  detailMessage = "Select a search result to see its relationships.";
  render();
  if (!query) return;

  searchTimer = setTimeout(async () => {
    try {
      const params = new URLSearchParams({ q: query, page: "1", limit: "20" });
      if (searchType.value) params.set("type", searchType.value);
      const body = await getJSON(`/search?${params}`);
      if (version !== searchVersion) return;
      matches = body.data;
      const total = body.meta.total;
      searchMessage = total
        ? `Showing ${matches.length} of ${total}`
        : "No matching records. Try another search.";
      renderResults();
      if (matches.length) loadRecord(matches[0]);
    } catch (error) {
      if (version !== searchVersion) return;
      searchMessage = error.message;
      renderResults();
    }
  }, 300);
}

searchInput.addEventListener("input", search);
searchType.addEventListener("change", search);
viewButtons.forEach((button, index) => button.addEventListener("click", () => {
  viewMode = index === 0 ? "flow" : "network";
  viewButtons.forEach((option, optionIndex) => {
    const active = optionIndex === index;
    option.classList.toggle("is-active", active);
    option.setAttribute("aria-pressed", String(active));
  });
  renderGraph();
}));
for (const button of document.querySelectorAll("[data-query]")) {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.query;
    search();
    searchInput.focus();
  });
}
if (searchInput.value.trim()) search();
else render();
