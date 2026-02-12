#!/usr/bin/env python3
"""
DashClaw Bulk Sync — push all local tool data to a DashClaw dashboard.

Replaces the old Neon-direct sync. Reads local SQLite databases and
POSTs to the DashClaw API via the /api/sync bulk endpoint.

Usage:
    python sync_to_dashclaw.py                          # Sync everything
    python sync_to_dashclaw.py --dry-run                # Preview only
    python sync_to_dashclaw.py --categories learning,goals  # Specific categories
"""

import argparse
import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _shared.dashclaw_push import push_to_api, load_config

TOOLS_DIR = Path(__file__).resolve().parent

# Map of category -> (relative DB path, SQL query, field mapping)
CATEGORIES = {
    "learning": {
        "db": "learning-database/data/learning.db",
        "query": "SELECT * FROM decisions ORDER BY created_at DESC LIMIT 500",
        "map": lambda row: {
            "type": "decision",
            "content": row.get("decision", row.get("content", "")),
            "context": row.get("context", ""),
            "tags": row.get("tags", ""),
            "outcome": row.get("outcome", ""),
        },
    },
    "goals": {
        "db": "goal-tracker/data/goals.db",
        "query": "SELECT * FROM goals ORDER BY created_at DESC LIMIT 200",
        "map": lambda row: {
            "name": row.get("goal", row.get("name", "")),
            "category": row.get("category", ""),
            "target_date": row.get("target_date", row.get("target", "")),
            "status": row.get("status", "active"),
            "progress": row.get("progress", 0),
        },
    },
    "context_points": {
        "db": "context-manager/data/context.db",
        "query": "SELECT * FROM key_points ORDER BY created_at DESC LIMIT 500",
        "map": lambda row: {
            "content": row.get("content", row.get("point", "")),
            "category": row.get("category", "general"),
            "importance": row.get("importance", 5),
        },
    },
    "context_threads": {
        "db": "context-manager/data/context.db",
        "query": "SELECT * FROM threads ORDER BY created_at DESC LIMIT 100",
        "map": lambda row: {
            "name": row.get("name", ""),
            "summary": row.get("summary", ""),
            "status": row.get("status", "active"),
        },
    },
    "handoffs": {
        "db": "session-handoff/data/handoffs.db",
        "query": "SELECT * FROM handoffs ORDER BY created_at DESC LIMIT 100",
        "map": lambda row: {
            "summary": row.get("summary", ""),
            "key_decisions": row.get("key_decisions", "[]"),
            "open_tasks": row.get("open_tasks", "[]"),
            "mood_notes": row.get("mood_notes", ""),
            "next_priorities": row.get("next_priorities", "[]"),
        },
    },
    "snippets": {
        "db": "automation-library/data/snippets.db",
        "query": "SELECT * FROM snippets ORDER BY created_at DESC LIMIT 200",
        "map": lambda row: {
            "name": row.get("name", ""),
            "description": row.get("description", ""),
            "code": row.get("code", ""),
            "language": row.get("language", ""),
            "tags": row.get("tags", ""),
        },
    },
    "preferences": {
        "db": "user-context/data/user_context.db",
        "query": "SELECT * FROM observations ORDER BY created_at DESC LIMIT 200",
        "map": lambda row: {
            "type": "observation",
            "observation": row.get("observation", row.get("note", "")),
            "category": row.get("category", ""),
        },
    },
    "inspiration": {
        "db": "inspiration/data/ideas.db",
        "query": "SELECT * FROM ideas ORDER BY created_at DESC LIMIT 200",
        "map": lambda row: {
            "title": row.get("title", row.get("idea", "")),
            "description": row.get("description", ""),
            "tags": row.get("tags", ""),
            "status": row.get("status", "captured"),
        },
    },
    "memory": {
        "db": "memory-health/data/health.db",
        "query": "SELECT * FROM scans ORDER BY scanned_at DESC LIMIT 1",
        "map": lambda row: {
            "health": {
                "score": row.get("score", 0),
                "total_files": row.get("total_files", 0),
                "duplicate_count": row.get("duplicates", 0),
                "stale_facts": row.get("stale_facts", 0),
            },
        },
    },
}


def read_db(db_path, query):
    """Read rows from a SQLite database. Returns list of dicts."""
    if not db_path.exists():
        return []
    try:
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(query)
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        print(f"  Warning: could not read {db_path.name}: {e}")
        return []


def main():
    parser = argparse.ArgumentParser(description="Sync local tool data to DashClaw dashboard")
    parser.add_argument("--dry-run", action="store_true", help="Preview what would be synced without sending")
    parser.add_argument("--categories", type=str, help="Comma-separated categories to sync (default: all)")
    args = parser.parse_args()

    config = load_config()
    if not args.dry_run and (not config["url"] or not config["api_key"]):
        print("Error: DASHCLAW_URL and DASHCLAW_API_KEY must be set.")
        print("Set them in environment or in secrets/dashclaw.env")
        sys.exit(1)

    cats = args.categories.split(",") if args.categories else list(CATEGORIES.keys())
    invalid = [c for c in cats if c not in CATEGORIES]
    if invalid:
        print(f"Error: unknown categories: {', '.join(invalid)}")
        print(f"Valid: {', '.join(CATEGORIES.keys())}")
        sys.exit(1)

    print(f"DashClaw Bulk Sync — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    if args.dry_run:
        print("MODE: dry-run (no data will be sent)\n")
    else:
        print(f"TARGET: {config['url']}\n")

    sync_payload = {}
    total_items = 0

    for cat in cats:
        spec = CATEGORIES[cat]
        db_path = TOOLS_DIR / spec["db"]
        rows = read_db(db_path, spec["query"])

        if not rows:
            print(f"  {cat}: no data (db not found or empty)")
            continue

        mapped = []
        for row in rows:
            try:
                item = spec["map"](row)
                if config["agent_id"]:
                    item["agent_id"] = config["agent_id"]
                mapped.append(item)
            except Exception as e:
                print(f"  {cat}: skipped row ({e})")

        if mapped:
            sync_payload[cat] = mapped
            total_items += len(mapped)
            print(f"  {cat}: {len(mapped)} items")
        else:
            print(f"  {cat}: 0 items (all rows skipped)")

    print(f"\nTotal: {total_items} items across {len(sync_payload)} categories")

    if args.dry_run:
        print("\nDry run complete. Use without --dry-run to sync.")
        return

    if not sync_payload:
        print("Nothing to sync.")
        return

    print("\nPushing to dashboard...")
    ok, result = push_to_api("/api/sync", sync_payload)
    if ok:
        print(f"Sync complete: {result}")
    else:
        print(f"Sync failed: {result}")
        sys.exit(1)


if __name__ == "__main__":
    main()
