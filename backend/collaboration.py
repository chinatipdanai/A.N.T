"""Read-only, evidence-backed KMUTT collaboration drill-down."""
import re
try:
    from .geography import collaboration_continent, CONTINENTS
except ImportError:
    from geography import collaboration_continent, CONTINENTS

ROOT_ID = "I60837268"
INSTITUTION_TYPES = ('education', 'company', 'government', 'nonprofit', 'facility',
                     'healthcare', 'archive', 'funder', 'other', 'unknown')


def collaboration(db, q):
    def value(k, default=""):
        return (q.get(k) or [default])[0]

    def integer(k, default, maximum=None):
        try:
            n = int(value(k, default))
        except (TypeError, ValueError):
            raise ValueError(f"{k} must be a positive integer")
        if n < 1 or maximum and n > maximum:
            raise ValueError(f"Invalid {k}")
        return n

    country = value("country").upper()
    overview = value("overview", "countries")
    continent = value("continent").upper()
    if overview not in ("continents", "countries"):
        raise ValueError("overview must be continents or countries")
    if continent and continent not in CONTINENTS:
        raise ValueError("Invalid continent")
    db.create_function('collaboration_continent', 1, collaboration_continent, deterministic=True)
    if country and not re.fullmatch(r"[A-Z]{2}", country):
        raise ValueError("country must be a two-letter country code (ZZ for unknown)")
    institution = integer("institution", None) if value("institution") else None
    group_by = value("group_by", "none")
    organization = value("institution_type")
    if group_by not in ("none", "type"):
        raise ValueError("group_by must be none or type")
    if organization and organization not in INSTITUTION_TYPES:
        raise ValueError("Invalid institution_type")
    if (group_by == "type" or organization) and not country:
        raise ValueError("country is required for organization grouping")
    mode = value("view", "publications")
    if mode not in ("publications", "authors"):
        raise ValueError("view must be publications or authors")
    page, limit = integer("page", 1), integer("limit", 24, 100)
    all_items = value("all", "0")
    if all_items not in ("0", "1"):
        raise ValueError("all must be 0 or 1")
    year_from = integer("year_from", None, 9999) if value("year_from") else None
    year_to = integer("year_to", None, 9999) if value("year_to") else None
    if year_from and year_to and year_from > year_to:
        raise ValueError("year_from must be <= year_to")
    args = [ROOT_ID]
    years = ""
    for year, op in ((year_from, ">="), (year_to, "<=")):
        if year:
            years += f" AND p.publication_year {op} ?"
            args.append(year)
    # Join both institution links to the SAME imported work, not just a merged DOI.
    cte = """WITH root AS (
        SELECT DISTINCT pi.publication_id,pi.source,pi.source_record_id
        FROM publication_institutions pi JOIN institutions i ON i.id=pi.institution_id
        JOIN publications p ON p.id=pi.publication_id
        WHERE replace(i.openalex_institution_id,'https://openalex.org/','')=?""" + years + """
    ), partners AS (
        SELECT DISTINCT pi.publication_id,pi.source,pi.source_record_id,i.id,i.name,
          i.openalex_institution_id,
          CASE WHEN json_extract(i.raw_json,'$.type') IN
            ('education','company','government','nonprofit','facility','healthcare','archive','funder','other')
            THEN json_extract(i.raw_json,'$.type') ELSE 'unknown' END organization_type,
          CASE WHEN length(json_extract(i.raw_json,'$.country_code'))=2
          THEN upper(json_extract(i.raw_json,'$.country_code')) ELSE 'ZZ' END country
        FROM root r JOIN publication_institutions pi
          ON pi.publication_id=r.publication_id AND pi.source=r.source
          AND pi.source_record_id=r.source_record_id
        JOIN institutions i ON i.id=pi.institution_id
        WHERE coalesce(replace(i.openalex_institution_id,'https://openalex.org/',''),'')!='I60837268'
    ), geographic AS (SELECT *,collaboration_continent(country) continent FROM partners) """
    scope = {"country": country or None, "institution": None,
             "institution_type": organization or None, "group_by": group_by,
             "continent": continent or None, "overview": overview}
    filters, scoped_args = [], list(args)
    if continent:
        filters.append("continent=?")
        scoped_args.append(continent)
    if country:
        filters.append("country=?")
        scoped_args.append(country)
    if organization:
        filters.append("organization_type=?")
        scoped_args.append(organization)
    if institution:
        info = db.execute("SELECT id,name,raw_json FROM institutions WHERE id=?", (institution,)).fetchone()
        if not info:
            raise LookupError("Institution not found")
        scope["institution"] = {"id": str(info["id"]), "label": info["name"]}
        filters.append("id=?")
        scoped_args.append(institution)
    scoped = cte + ", scoped AS (SELECT * FROM geographic" + (" WHERE " + " AND ".join(filters) if filters else "") + ") "
    summary = dict(db.execute(scoped + """SELECT count(DISTINCT publication_id) publications,
        count(DISTINCT id) institutions,count(DISTINCT country) countries FROM scoped""", scoped_args).fetchone())
    root_count = db.execute(cte + "SELECT count(DISTINCT publication_id) FROM root", args).fetchone()[0]
    unknown = db.execute(cte + "SELECT count(DISTINCT id) FROM partners WHERE country='ZZ'", args).fetchone()[0]
    if not institution and not country and not continent and overview == 'continents':
        level = "continents"
        query = """SELECT continent id,CASE WHEN continent='TH' THEN 'country' ELSE 'continent' END type,
            continent label,count(DISTINCT publication_id) publication_count,
            count(DISTINCT id) institution_count,count(DISTINCT country) country_count
            FROM scoped GROUP BY continent"""
        order = "CASE WHEN id='TH' THEN 0 ELSE 1 END,publication_count DESC,id"
    elif not institution and not country:
        level = "countries"
        query = """SELECT country id,'country' type,country label,
            count(DISTINCT publication_id) publication_count,count(DISTINCT id) institution_count
            FROM scoped GROUP BY country"""
        order = "publication_count DESC,id"
    elif not institution and group_by == "type" and not organization:
        level = "institution_types"
        query = """SELECT organization_type id,'institution_type' type,organization_type label,
            count(DISTINCT publication_id) publication_count,count(DISTINCT id) institution_count
            FROM scoped GROUP BY organization_type"""
        order = "publication_count DESC,id"
    elif not institution:
        level = "institutions"
        query = """SELECT cast(id AS TEXT) id,'institution' type,name label,
            organization_type institution_type,
            count(DISTINCT publication_id) publication_count FROM scoped GROUP BY id,name,organization_type"""
        order = "publication_count DESC,label,id"
    elif mode == "publications":
        level = "publications"
        query = """SELECT cast(p.id AS TEXT) id,'publication' type,p.title label,
            p.publication_year year FROM publications p
            WHERE p.id IN (SELECT publication_id FROM scoped)"""
        order = "year DESC,id"
    else:
        level = "authors"
        # A coauthor of a shared work is not automatically a member of this institution.
        # Only author-level affiliations in the original payload establish membership.
        query = """SELECT cast(a.id AS TEXT) id,'author' type,a.display_name label,
            count(DISTINCT s.publication_id) publication_count
            FROM scoped s JOIN source_records sr ON sr.source=s.source
              AND sr.source_record_id=s.source_record_id AND sr.record_type='publication'
            JOIN json_each(sr.raw_json,'$.authorships') ash
            JOIN json_each(ash.value,'$.institutions') inst
              ON replace(json_extract(inst.value,'$.id'),'https://openalex.org/','')
               =replace(s.openalex_institution_id,'https://openalex.org/','')
            JOIN authors a ON a.openalex_author_id=replace(json_extract(ash.value,'$.author.id'),'https://openalex.org/','')
            GROUP BY a.id,a.display_name"""
        order = "publication_count DESC,label,id"
    total = db.execute(scoped + "SELECT count(*) FROM (" + query + ")", scoped_args).fetchone()[0]
    sql = scoped + query + " ORDER BY " + order
    item_args = list(scoped_args)
    if all_items == "0":
        sql += " LIMIT ? OFFSET ?"
        item_args += [limit, (page-1)*limit]
    items = [dict(r) for r in db.execute(sql, item_args)]
    return {"level": level, "root": {"id": ROOT_ID, "label": "KMUTT"}, "scope": scope,
            "items": items, "summary": summary,
            "meta": {"page": 1 if all_items == "1" else page,
                     "limit": total if all_items == "1" else limit, "total": total,
                     "all": all_items == "1",
                     "root_publications": root_count, "unknown_country_institutions": unknown,
                     "definition": "Distinct shared publications with institution affiliations in the same source record; countries refer to institutions, not author nationality."}}
