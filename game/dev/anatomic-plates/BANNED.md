# Banned anatomic plates (Steve 2026-06-19)

**Do not promote, reference in portrait gen, or ship to `public/assets/patient/`.**

| File | Reason |
|------|--------|
| `raw/female-ed-anatomic-plate-a.png` | Did not make the cut — reject for play baseplate |
| `raw/female-ed-anatomic-plate-a.backup-magnific-20260616.png` | Backup of rejected plate — same ban |

## Still valid

| File | Use |
|------|-----|
| `raw/female-ed-anatomic-plate-anatomy.png` | IV scope overlay reference only |
| `raw/female-ed-anatomic-plate-b.png` | Candidate for female baseplate when approved |
| `raw/male-ed-anatomic-plate-a.png` | Steve-approved male crop lock |

## Scripts

- `scripts/promote-baseplates.mjs` — must **not** map `patient-scene-female.png` → banned `female-ed-anatomic-plate-a.png`
- Grep before gen: `female-ed-anatomic-plate-a.png`
