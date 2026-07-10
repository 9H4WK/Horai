# HORAI Labs : AI-assisted recruitment portal

Web-based candidate selection system for **HORAI Labs** (single-company careers & hiring desk), with profile/CV intake, applications, short assessments, and employer screening reviews.

## Stack

- **Frontend:** React + Vite + Tailwind
- **Backend:** Express (Node 20+)
- **Data:** SQLite (`sql.js`) under `data/` (local, gitignored)
- **AI:** OpenAI API for CV analysis & screening (`OPENAI_API_KEY`)

## Quick start

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
# edit .env — set OPENAI_API_KEY and JWT_SECRET

# terminal 1 — API
npm run api

# terminal 2 — UI
npm run dev
```

- UI: http://localhost:5173
- API: http://localhost:5000

Demo accounts: see [`SEED_CREDENTIALS.md`](./SEED_CREDENTIALS.md).

## Scripts

| Command           | Description               |
| ----------------- | ------------------------- |
| `npm run dev`     | Vite frontend             |
| `npm run api`     | Express API + seed        |
| `npm run build`   | Production frontend build |
| `npm run preview` | Preview production build  |

## Project layout

```
api/          Express routes, AI, SQLite, seed
src/          React app
SEED_CREDENTIALS.md   Demo logins
.env.example          Env template (no secrets)
```

## License

Private / academic project unless otherwise stated.
