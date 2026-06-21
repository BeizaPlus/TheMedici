# Comfy i2v — U12 Tom truck-driver pre-call (~25h before ED)

**Use the existing Kling 2.6 workflow** — same as Beat 95 / Immersa welcome handover.

| What | Path |
|------|------|
| **UI workflow (reference)** | `M:\ComfyUI_windows_portablev01 - GenFill - LITE\ComfyUI\user\default\workflows\Immersa_Beat95_Handover_Kling26.json` |
| **Boot Comfy (partner nodes)** | `M:\ComfyUI_windows_portablev01 - GenFill - LITE\run_nvidia_gpu_kling26.bat` |
| **Auto-queue script (no UI clicks)** | `dev/u12-tom-precall/run_u12_tom_truck_kling26_local.py` |
| **Node** | `KlingImageToVideoWithAudio` · `kling-v2-6` · duration **5** · `generate_audio` **false** · mode **pro** |

## Still (start frame)

**Identity lock:** CHARACTER-MAP — not hospital GAME-SCENE.

| Ref | Path |
|-----|------|
| Character map (approved alt2) | `dev/uber-portrait-refs/character-maps-pending/craniofacial-asymmetry-goatee-CHARACTER-MAP-alt2.png` |
| Composition gold | `dev/uber-portrait-refs/refs/COMPOSITION_GOLD-craniofacial-asymmetry-goatee-alt2.png` |

Generate still (read `game/.cursor/RULES_IMAGE_GENERATION.md` first):

```powershell
cd C:\Users\steve\MeWorld\game
node dev/u12-tom-precall/generate-truck-still.mjs
```

Output: `dev/u12-tom-precall/u12-tom-truck-cab-still.png`

## Queue video (one command)

```powershell
# Comfy must be on :8188 with partner nodes (kling26 boot)
# API key: C:\Users\steve\tools\comfy-api-key.txt

cd C:\Users\steve\MeWorld\game\dev\u12-tom-precall
python run_u12_tom_truck_kling26_local.py
```

Or open the Beat 95 workflow in Comfy UI, swap LoadImage to `u12-tom-truck-brake-start.png`, paste `motion-u12-truck-brake-comfy.txt` into the Kling node.

## Output

| File | Purpose |
|------|---------|
| `ComfyUI/output/video/u12-tom-truck-brake-5s-kling26*.mp4` | Comfy render |
| `dev/u12-tom-precall/u12-tom-truck-brake-5s-kling26.mp4` | Dev copy |
| `public/assets/video/u12-tom-precall/u12-tom-truck-brake-5s-kling26.mp4` | Game deploy |

## Motion prompt

`motion-u12-truck-brake-comfy.txt` (same folder)
