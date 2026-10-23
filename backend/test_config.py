"""Offline checks for .env parsing and environment precedence."""
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from .config import load_env, project_path, PROJECT_ROOT

class ConfigTest(unittest.TestCase):
    def test_env_file_and_process_override(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/".env"
            path.write_text('# comment\nOPENALEX_API_KEY="from-file"\nANT_PORT=9001\nBAD-NAME=x\n',encoding="utf-8")
            with patch.dict(os.environ,{"OPENALEX_API_KEY":"from-process"},clear=True):
                load_env(path)
                self.assertEqual(os.environ["OPENALEX_API_KEY"],"from-process")
                self.assertEqual(os.environ["ANT_PORT"],"9001")
                self.assertNotIn("BAD-NAME",os.environ)
                self.assertEqual(project_path("ANT_DB","backend/ant.db"),PROJECT_ROOT/"backend/ant.db")

if __name__=="__main__": unittest.main()
