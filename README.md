# HORAI Labs — AI-assisted recruitment portal

Single-company **careers & hiring desk** for HORAI Labs: open roles, applications, short assessments, and employer screening reviews.

## Requirements

- **Node.js 20+** ([nodejs.org](https://nodejs.org/) or `nvm use` with the repo’s `.nvmrc`)
- **npm** (comes with Node)
- Two terminals (API + UI)
- Optional: **OpenAI API key** for live CV/screening analysis (app runs without it)

## Clone and run (anyone)

```bash
git clone <YOUR_GITHUB_REPO_URL>
cd Searchera   # or your folder name

npm install    # also runs setup: creates .env if missing
```

If `.env` was not created automatically:

```bash
npm run setup
```

Then start **both** processes:

```bash
# Terminal 1 — backend (creates SQLite DB + demo seed on first start)
npm run api

# Terminal 2 — frontend
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API health | http://localhost:5000/api/health |

Open the frontend in a browser. The Vite dev server **proxies** `/api` → `http://localhost:5000`, so you do not need to configure a separate API URL for local use.

### Demo logins

Seeded automatically when the API starts. See **[SEED_CREDENTIALS.md](./SEED_CREDENTIALS.md)**.

| Role | Email | Password |
|------|--------|----------|
| HR | `hr@horailabs.com` | `HrDemo123!` |
| Perfect-fit seeker | `aisha.okello@gmail.com` | `SeekerDemo123!` |
| Weaker-fit seeker | `sam.mwangi@gmail.com` | `SeekerDemo123!` |
| Admin | `admin@horailabs.com` | `Admin123!` |

### Optional: enable live AI

1. Edit `.env`
2. Set `OPENAI_API_KEY=sk-...`
3. Keep `AI_PROVIDER=openai`
4. Restart `npm run api`

Without a key, the app still works; screening uses profile heuristics and the employer “AI” badge stays offline.

## Windows notes

```powershell
git clone <YOUR_GITHUB_REPO_URL>
cd Searchera
npm install
npm run api    # terminal 1
npm run dev    # terminal 2
```

If `npm` is missing, install Node 20+ and reopen the terminal.

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install deps + run setup (`.env`, folders) |
| `npm run setup` | Create `.env` / data folders if needed |
| `npm run api` | Express API + seed on http://localhost:5000 |
| `npm run dev` | Vite UI on http://localhost:5173 |
| `npm run build` | Production frontend build |
| `npm run preview` | Preview production build |

## Project layout

```
api/                 Express API, AI, SQLite, seed
src/                 React frontend
.env.example         Env template (safe to commit)
SEED_CREDENTIALS.md  Demo accounts
data/                Local SQLite (gitignored, auto-created)
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot GET /api/...` or failed requests | Start API with `npm run api` (port 5000) |
| Port 5000 already in use | Change `PORT` in `.env` and update `vite.config.js` proxy target |
| Port 5173 in use | Vite will offer another port — use the URL it prints |
| Empty jobs / no logins | Wait for “Seed ready” in the API terminal, then refresh |
| AI badge offline (employer) | Set `OPENAI_API_KEY` in `.env` and restart API |
| `node: not found` / old Node | Install Node **20+** (`node -v`) |

## What is not in the repo (by design)

- `node_modules/` — install with `npm install`
- `.env` — secrets; created by setup from `.env.example`
- Local SQLite DB and uploaded CVs — generated on your machine

## License

Private / academic project unless otherwise stated.
