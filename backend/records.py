"""Standalone, paginated directories; independent of the graph's current scope."""
import math


def list_records(db, q):
    value = lambda name, default='': (q.get(name) or [default])[0]
    kind = value('type')
    tables = {'author': ('authors', 'display_name'), 'publication': ('publications', 'title')}
    if kind not in tables:
        raise ValueError('type must be author or publication')
    try:
        page, limit = int(value('page', 1)), int(value('limit', 20))
    except (ValueError, TypeError):
        raise ValueError('page and limit must be integers')
    if page < 1 or not 1 <= limit <= 100:
        raise ValueError('page must be >= 1 and limit must be between 1 and 100')
    term = value('q').strip()
    if len(term) > 200:
        raise ValueError('q must be at most 200 characters')
    table, column = tables[kind]
    where, args = (f' WHERE {column} LIKE ?', ['%' + term + '%']) if term else ('', [])
    total = db.execute(f'SELECT count(*) FROM {table}' + where, args).fetchone()[0]
    order = f'{column} COLLATE NOCASE,id' if kind == 'author' else f'publication_year DESC,{column} COLLATE NOCASE,id'
    year = ',publication_year year' if kind == 'publication' else ''
    rows = db.execute(f'SELECT id,{column} label{year} FROM {table}{where} ORDER BY {order} LIMIT ? OFFSET ?',
                      args + [limit, (page-1)*limit])
    return {'data': [{**dict(r), 'id': str(r['id']), 'type': kind} for r in rows],
            'meta': {'page': page, 'limit': limit, 'total': total, 'pages': math.ceil(total/limit)}}
