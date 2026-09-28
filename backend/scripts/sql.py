"""Run SQL against InsForge: `uv run python scripts/sql.py "select 1"` or `... -f migrations/001_init.sql`."""
import json
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()
load_dotenv("../.env")

sql = open(sys.argv[2]).read() if sys.argv[1] == "-f" else sys.argv[1]
r = httpx.post(
    f"{os.environ['INSFORGE_BASE_URL']}/api/database/advance/rawsql",
    headers={"x-api-key": os.environ["INSFORGE_API_KEY"]},
    json={"query": sql},
    timeout=60,
)
print(r.status_code, json.dumps(r.json(), indent=1)[:4000])
sys.exit(r.status_code >= 400)
