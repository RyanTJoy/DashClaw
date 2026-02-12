#!/usr/bin/env python3
"""
DashClaw User Context Tracker
Track user preferences, communication style, what's working.

Usage:
    python user_context.py note "observation about what works with user"
    python user_context.py preference "prefers X over Y" --category communication
    python user_context.py mood --current focused|stressed|excited|tired
    python user_context.py whatworks
    python user_context.py summary
"""

import sqlite3
import argparse
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from _shared.dashclaw_push import push_to_api, load_config

DB_PATH = Path(__file__).parent / "data" / "user_context.db"

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        observation TEXT NOT NULL,
        category TEXT,
        importance INTEGER DEFAULT 5
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        preference TEXT NOT NULL,
        category TEXT,
        confidence INTEGER DEFAULT 70,
        last_validated TEXT
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS mood_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        mood TEXT NOT NULL,
        energy TEXT,
        notes TEXT
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS what_works (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        approach TEXT NOT NULL,
        context TEXT,
        success_count INTEGER DEFAULT 1,
        fail_count INTEGER DEFAULT 0
    )''')
    
    conn.commit()
    conn.close()

def add_note(observation, category=None, importance=5):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''INSERT INTO observations (timestamp, observation, category, importance)
                 VALUES (?, ?, ?, ?)''',
              (datetime.now().isoformat(), observation, category, importance))
    
    conn.commit()
    conn.close()
    
    print(f"[+] Observation noted: {observation[:50]}...")

def add_preference(preference, category=None, confidence=70):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''INSERT INTO preferences (preference, category, confidence, last_validated)
                 VALUES (?, ?, ?, ?)''',
              (preference, category, confidence, datetime.now().isoformat()))
    
    conn.commit()
    conn.close()
    
    print(f"[+] Preference recorded ({confidence}% confidence)")
    print(f"    {preference}")

def log_mood(mood, energy=None, notes=None):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''INSERT INTO mood_log (timestamp, mood, energy, notes)
                 VALUES (?, ?, ?, ?)''',
              (datetime.now().isoformat(), mood, energy, notes))
    
    conn.commit()
    conn.close()
    
    emoji = {'focused': '[F]', 'stressed': '[!]', 'excited': '[*]', 'tired': '[~]', 
             'neutral': '[-]', 'happy': ':)', 'frustrated': ':('}
    print(f"{emoji.get(mood, '[?]')} Mood logged: {mood}")
    if energy:
        print(f"    Energy: {energy}")

def add_what_works(approach, context=None, success=True):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Check if approach exists
    c.execute('SELECT id, success_count, fail_count FROM what_works WHERE approach LIKE ?', 
              (f'%{approach[:30]}%',))
    existing = c.fetchone()
    
    if existing:
        if success:
            c.execute('UPDATE what_works SET success_count = success_count + 1 WHERE id = ?', (existing[0],))
        else:
            c.execute('UPDATE what_works SET fail_count = fail_count + 1 WHERE id = ?', (existing[0],))
        print(f"[>] Updated: {approach[:40]}...")
        print(f"    Success: {existing[1] + (1 if success else 0)} | Fail: {existing[2] + (0 if success else 1)}")
    else:
        c.execute('''INSERT INTO what_works (approach, context, success_count, fail_count)
                     VALUES (?, ?, ?, ?)''',
                  (approach, context, 1 if success else 0, 0 if success else 1))
        print(f"[+] New approach recorded: {approach[:40]}...")
    
    conn.commit()
    conn.close()

def show_what_works():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute('''SELECT approach, success_count, fail_count, context
                 FROM what_works 
                 ORDER BY (success_count * 1.0 / (success_count + fail_count + 1)) DESC''')
    approaches = c.fetchall()
    conn.close()
    
    if not approaches:
        print("No approaches recorded yet.")
        return
    
    print(f"\n{'='*60}")
    print("WHAT WORKS WITH USER")
    print(f"{'='*60}")
    
    for a in approaches:
        total = a[1] + a[2]
        rate = 100 * a[1] / total if total > 0 else 0
        emoji = "[++]" if rate >= 80 else "[+]" if rate >= 60 else "[~]" if rate >= 40 else "[-]"
        
        print(f"\n  {emoji} {a[0][:45]}...")
        print(f"      Success rate: {rate:.0f}% ({a[1]}/{total})")

def show_summary():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    print(f"\n{'='*60}")
    print("USER CONTEXT SUMMARY")
    print(f"{'='*60}")
    
    # Recent mood
    c.execute('SELECT mood, energy, timestamp FROM mood_log ORDER BY timestamp DESC LIMIT 1')
    mood = c.fetchone()
    if mood:
        print(f"\n[LAST KNOWN MOOD]")
        print(f"  {mood[0]} (energy: {mood[1] or 'unknown'}) - {mood[2][:10]}")
    
    # Top preferences
    c.execute('SELECT preference, confidence, category FROM preferences ORDER BY confidence DESC LIMIT 5')
    prefs = c.fetchall()
    if prefs:
        print(f"\n[KEY PREFERENCES]")
        for p in prefs:
            cat = f"[{p[2]}]" if p[2] else ""
            print(f"  ({p[1]}%) {cat} {p[0][:50]}...")
    
    # Recent observations
    c.execute('SELECT observation, category FROM observations ORDER BY importance DESC, timestamp DESC LIMIT 5')
    obs = c.fetchall()
    if obs:
        print(f"\n[IMPORTANT OBSERVATIONS]")
        for o in obs:
            cat = f"[{o[1]}]" if o[1] else ""
            print(f"  {cat} {o[0][:50]}...")
    
    # What works best
    c.execute('''SELECT approach, success_count FROM what_works 
                 WHERE success_count > 0
                 ORDER BY success_count DESC LIMIT 3''')
    works = c.fetchall()
    if works:
        print(f"\n[WHAT WORKS BEST]")
        for w in works:
            print(f"  ({w[1]}x) {w[0][:45]}...")
    
    conn.close()

def main():
    parser = argparse.ArgumentParser(description='User Context Tracker')
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Note
    note_parser = subparsers.add_parser('note', help='Add observation')
    note_parser.add_argument('observation')
    note_parser.add_argument('--category', '-c')
    note_parser.add_argument('--importance', '-i', type=int, default=5)
    note_parser.add_argument('--push', action='store_true', help='Push to DashClaw API')
    
    # Preference
    pref_parser = subparsers.add_parser('preference', help='Record preference')
    pref_parser.add_argument('preference')
    pref_parser.add_argument('--category', '-c')
    pref_parser.add_argument('--confidence', type=int, default=70)
    pref_parser.add_argument('--push', action='store_true', help='Push to DashClaw API')
    
    # Mood
    mood_parser = subparsers.add_parser('mood', help='Log mood')
    mood_parser.add_argument('--current', '-m', required=True)
    mood_parser.add_argument('--energy', '-e')
    mood_parser.add_argument('--notes', '-n')
    mood_parser.add_argument('--push', action='store_true', help='Push to DashClaw API')
    
    # Works
    works_parser = subparsers.add_parser('works', help='Log what works')
    works_parser.add_argument('approach')
    works_parser.add_argument('--context', '-c')
    works_parser.add_argument('--fail', '-f', action='store_true')
    works_parser.add_argument('--push', action='store_true', help='Push to DashClaw API')
    
    # What works
    subparsers.add_parser('whatworks', help='Show what works')
    
    # Summary
    subparsers.add_parser('summary', help='Show summary')
    
    # Init
    subparsers.add_parser('init', help='Initialize database')
    
    args = parser.parse_args()
    
    if args.command == 'init':
        init_db()
        print("User context database initialized.")
    elif args.command == 'note':
        add_note(args.observation, args.category, args.importance)
        if getattr(args, 'push', False):
            try:
                config = load_config()
                body = {
                    'type': 'observation',
                    'observation': args.observation,
                    'agent_id': config['agent_id'],
                }
                ok, result = push_to_api('/api/preferences', body)
                if ok:
                    print(f"[PUSH] Synced to DashClaw: {result}")
                else:
                    print(f"[PUSH] Sync failed: {result}")
            except Exception as e:
                print(f"[PUSH] Error: {e}")
    elif args.command == 'preference':
        add_preference(args.preference, args.category, args.confidence)
        if getattr(args, 'push', False):
            try:
                config = load_config()
                body = {
                    'type': 'preference',
                    'preference': args.preference,
                    'category': getattr(args, 'category', '') or '',
                    'confidence': getattr(args, 'confidence', 50),
                    'agent_id': config['agent_id'],
                }
                ok, result = push_to_api('/api/preferences', body)
                if ok:
                    print(f"[PUSH] Synced to DashClaw: {result}")
                else:
                    print(f"[PUSH] Sync failed: {result}")
            except Exception as e:
                print(f"[PUSH] Error: {e}")
    elif args.command == 'mood':
        log_mood(args.current, args.energy, args.notes)
        if getattr(args, 'push', False):
            try:
                config = load_config()
                body = {
                    'type': 'mood',
                    'mood': getattr(args, 'current', '') or '',
                    'energy': getattr(args, 'energy', '') or '',
                    'agent_id': config['agent_id'],
                }
                ok, result = push_to_api('/api/preferences', body)
                if ok:
                    print(f"[PUSH] Synced to DashClaw: {result}")
                else:
                    print(f"[PUSH] Sync failed: {result}")
            except Exception as e:
                print(f"[PUSH] Error: {e}")
    elif args.command == 'works':
        add_what_works(args.approach, args.context, not args.fail)
        if getattr(args, 'push', False):
            try:
                config = load_config()
                body = {
                    'type': 'approach',
                    'approach': args.approach,
                    'agent_id': config['agent_id'],
                }
                ok, result = push_to_api('/api/preferences', body)
                if ok:
                    print(f"[PUSH] Synced to DashClaw: {result}")
                else:
                    print(f"[PUSH] Sync failed: {result}")
            except Exception as e:
                print(f"[PUSH] Error: {e}")
    elif args.command == 'whatworks':
        show_what_works()
    elif args.command == 'summary':
        show_summary()
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
