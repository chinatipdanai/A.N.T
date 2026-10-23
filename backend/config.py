"""Small .env reader; process environment variables take precedence.

Only simple KEY=value lines are accepted. Values are never printed.
"""
import os
import re
from pathlib import Path

BACKEND_DIR=Path(__file__).resolve().parent
PROJECT_ROOT=BACKEND_DIR.parent
ENV_FILE=BACKEND_DIR/".env"

def load_env(path=ENV_FILE):
    path=Path(path)
    if not path.is_file(): return
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line=line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        name,value=line.split("=",1)
        name=name.strip(); value=value.strip()
        if not re.fullmatch(r"[A-Z][A-Z0-9_]*",name): continue
        if len(value)>=2 and value[0]==value[-1] and value[0] in "\"'": value=value[1:-1]
        if value: os.environ.setdefault(name,value)

def project_path(setting,default):
    value=os.environ.get(setting) or default
    path=Path(value).expanduser()
    return path if path.is_absolute() else PROJECT_ROOT/path
