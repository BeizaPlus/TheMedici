# Agent handoff — June 12, 2026 (Manus continue from here)

## Repo

| What | Value |
|------|--------|
| **Path** | `C:\Users\steve\MeWorld\` |
| **Remote** | `meworld` → `https://github.com/stefopps/MeWorld.git` |
| **Branch** | `main` |
| **Game app** | `C:\Users\steve\MeWorld\game` |

## Run locally

```powershell
cd C:\Users\steve\MeWorld\game
npm run dev
```

- Web: http://localhost:5173/
- API: http://127.0.0.1:3001

## What shipped (recent)

### Manus mobile differential (keep ≤768px only)

Commits `01f20cb` → `d3350ac`:

- Telegram-style icon strip, unified input card (mic/T tabs)
- Accordion study feed on mobile
- Case number tap → bottom sheet study panel
- Bottom dock bar removed on mobile; mic tab starts recording directly

**Desktop guard** — commit `464fe46`:

- Desktop restored: voice block, text input, inline study panel, `diff-nav`, ambience dock
- Mobile Manus UI gated with `isMobilePractice` (`max-width: 768px`) — **do not replace desktop JSX again**

### Supabase Real World cache (live)

| Item | Detail |
|------|--------|
| **Project** | MeWorld · ref `rqafatelreqnjwdloqim` |
| **Table** | `public.real_world_cache` — migration `game/supabase/migrations/001_real_world_cache.sql` |
| **Env** | `game/.env` (local, gitignored) — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REAL_WORLD_CACHE=supabase` |
| **Template** | `game/.env.example` |
| **Seed** | `npm run seed:supabase-real-world` — **137 cases** uploaded from `.real-world-cache/` |
| **Server** | `game/server/realWorldCacheStore.js` — auto uses Supabase when URL + service role set |

**Never commit** `.env` or paste service_role into Vercel as `VITE_*`.

**Cloud deploy:** add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to Render/Vercel env (API host only).

### Production

- Vercel: https://me-world.vercel.app/
- Static frontend; mic/chat need API host with same Supabase vars for persistent Real World cache on cloud

## Key files (mobile work)

| File | Role |
|------|------|
| `game/src/components/DifferentialPractice.jsx` | `isMobilePractice` split desktop vs mobile |
| `game/src/components/DifferentialStudyPanel.jsx` | Accordion feed (mobile) vs tab panel (desktop) |
| `game/src/styles/differential-practice.css` | Mobile breakpoints `@768px` |

## CSS / dev rules

- Full-page modes: feature CSS in `game/src/styles/` — see `game/CURSOR_RULES.md` if present
- Launch: `npm run dev` only (frees :5173 / :3001)
- Before done: `npm run build`

## Open / next

1. Manus: continue mobile polish only inside `@768px` / `isMobilePractice` branches
2. Vercel API env: Supabase keys on Render if cloud Real World cache needed
3. Shuffle + lightbox hardening on main (`383a580`, `464fe46` ancestry)

## Do not

- Fal.ai — expired
- Replace desktop differential UI with mobile-only components
- Commit `game/.env` or secrets
