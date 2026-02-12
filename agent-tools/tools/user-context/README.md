# User Context Tracker (Local-only)

This tool records observations/preferences/mood/"what works" as **local notes** in a SQLite database:

- `tools/user-context/data/user_context.db`

## Security / privacy

- This database can contain personal notes.
- Do **not** commit `user_context.db` (or any `*.db`) to GitHub.
- Keep your workspace `tools/` folder private, or ensure `*.db` is in `.gitignore`.

## Usage

From inside your DashClaw workspace:

```bash
python tools/user-context/user_context.py summary
python tools/user-context/user_context.py preference "prefers short direct messages" --category communication
python tools/user-context/user_context.py mood --current focused --energy high
```
