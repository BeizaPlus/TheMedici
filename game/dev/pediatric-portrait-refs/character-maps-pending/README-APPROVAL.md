# Pediatric temperament character maps — pending approval

**Magnific app:** https://www.magnific.com/app  
**Developers API (REST key):** https://www.magnific.com/developers

## If generation is blocked

`generate-ped-character-maps.mjs` needs **`MAGNIFIC_API_KEY`** in `game\.env` (or Magnific MCP connected in Cursor).

| Step | Action |
|------|--------|
| 1 | Log in at https://www.magnific.com/app — confirm credits |
| 2 | Create REST key at https://www.magnific.com/developers |
| 3 | Add to `C:\Users\steve\MeWorld\game\.env`: `MAGNIFIC_API_KEY=...` |
| 4 | Optional: `python C:\Users\steve\.cursor\tools\merge_master_env.py` |
| 5 | **Cursor MCP (agents):** Settings → Tools & MCP → **Magnific** → Connect → Reload Window |

Verify REST:

```powershell
cd C:\Users\steve\MeWorld\game
node -e "import('./server/loadMasterEnv.js').then(m=>{m.loadMasterEnv(); console.log('key set:', Boolean(process.env.MAGNIFIC_API_KEY));})"
```

## Generate A/B picks

```powershell
cd C:\Users\steve\MeWorld\game
node scripts/generate-ped-character-maps.mjs
# one slug: node scripts/generate-ped-character-maps.mjs --only=post-ictal
```

Preflight: `game/.cursor/RULES_IMAGE_GENERATION.md`

## Output naming (A/B pick per slug)

| Slug | Ship target |
|------|-------------|
| `ped-boy-post-ictal` | `public/assets/patient/pediatric/ped-boy-post-ictal-CHARACTER-MAP.png` |
| `ped-girl-disgust` | `public/assets/patient/pediatric/ped-girl-disgust-CHARACTER-MAP.png` |
| `ped-boy-laugh` | `public/assets/patient/pediatric/ped-boy-laugh-CHARACTER-MAP.png` |
| `ped-toddler-skeptical` | `public/assets/patient/pediatric/ped-toddler-skeptical-CHARACTER-MAP.png` |

Files land here as `<slug>-CHARACTER-MAP-alt1.png` and `alt2.png`.

Source refs: `../ref-ped-*.png`
