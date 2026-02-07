# Wes Context Tracker (Local-only)

This tool records observations/preferences/mood/"what works" as **local notes** in a SQLite database:

- `tools/wes-context/data/wes.db`

## Security / privacy

- This database can contain personal notes.
- Do **not** commit `wes.db` (or any `*.db`) to GitHub.
- Keep your workspace `tools/` folder private, or ensure `*.db` is in `.gitignore`.

## Usage

From inside your Clawd workspace:

```bash
python tools/wes-context/wes.py summary
python tools/wes-context/wes.py preference "prefers short direct messages" --category communication
python tools/wes-context/wes.py mood --current focused --energy high
```
