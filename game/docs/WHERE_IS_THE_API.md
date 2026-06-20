# Where is the Magnific API? (all agents — read first)

Steve already provisioned image generation. **Do not ask Steve for a key in chat.** Load it from disk and verify.

---

## 1. Where the key lives

| Priority | File | Variable |
|----------|------|----------|
| **1 — Steve master secrets** | `C:\Users\steve\.cursor\master.env` | `MAGNIFIC_API_KEY` or `MAGNIFIC_API_KEY_B2B` |
| **2 — Game override** | `C:\Users\steve\MeWorld\game\.env` | `MAGNIFIC_API_KEY` |

**Load order in every gen script:** `server/loadMasterEnv.js` (master.env) **then** `game/.env`. Master fills empty vars; game `.env` only wins if master did not set that name.

**Key index (names only, no values):** `C:\Users\steve\.cursor\master.env.manifest.json`

**Never** commit or paste key values in chat, PRs, or handoff docs.

---

## 2. Confirm before generating

```powershell
cd C:\Users\steve\MeWorld\game
npm run verify:magnific
```

| Exit | Meaning |
|------|---------|
| **0** | Key loaded + Magnific REST auth OK — run `npm run gen:*` below |
| **1** | Key missing or rejected — check paths in §1; get key only from https://www.magnific.com/developers if file empty |

---

## 3. What code uses the key

| Piece | Path |
|-------|------|
| **REST client (all batch gens)** | `server/magnificImage.js` |
| **Env loader** | `server/loadMasterEnv.js` |
| **Verify script** | `scripts/verify-magnific-env.mjs` |

**API base:** `https://api.magnific.com`  
**Header:** `x-magnific-api-key: <from env>`  
**Default model:** `imagen-nano-banana-2` → `/v1/ai/text-to-image/nano-banana-pro`

---

## 4. Run the same image jobs (REST)

Full rules: **`game/.cursor/RULES_IMAGE_GENERATION.md`**

```powershell
cd C:\Users\steve\MeWorld\game
npm run verify:magnific

npm run gen:uber-maps          # uber CHARACTER-MAPs → dev/uber-portrait-refs/character-maps-pending/
npm run gen:uber-scenes        # uber GAME-SCENEs → dev/uber-portrait-refs/game-scenes-pending/
npm run gen:ped-maps           # pediatric maps → dev/pediatric-portrait-refs/character-maps-pending/
npm run gen:case-story -- 051   # case story plates → .case-story-cache/
npm run process:tv-presentations
npm run tv:degrade
```

**TV pass (BEIZA presenter):** share **`docs/SHARE_WITH_NEXT_AGENT_TV.md`** with the next agent — full pipeline in **`dev/tv-presentations/AGENT_HANDOFF_TV_PRESENTATION.md`**.

One slug only:

```powershell
node scripts/generate-uber-game-scenes.mjs --only=vitiligo-wink-diastema
```

---

## 5. MCP OAuth is not the same file

| Path | Auth |
|------|------|
| **`npm run gen:*` scripts** | **REST** — key from §1 |
| **Cursor Magnific MCP** (`user-Magnific`) | OAuth in Cursor Settings — no key in repo |

MCP works for one-off `images_generate` in chat. **Batch scripts always need REST** from §1.

---

## 6. If verify fails

1. Read `C:\Users\steve\.cursor\master.env` exists (agent: check file exists, never print contents).
2. Read `C:\Users\steve\MeWorld\game\.env` for `MAGNIFIC_API_KEY=`.
3. **401** — wrong key in file.
4. **403** — plan may lack REST; use Magnific MCP for that beat or ask Steve about Business API.
5. Regenerate merged env after Steve edits sources: `python C:\Users\steve\.cursor\tools\merge_master_env.py`

---

*Agents generating images: start here → `npm run verify:magnific` → `RULES_IMAGE_GENERATION.md`.*
