# Step 3 CCS cases — categorized for MedGame

**Source:** `C:\Users\steve\Step 3\ccs_screenshots\ccs_case_list.json` (181 cases)

Rebuild catalog after Step 3 updates:

```powershell
cd "C:\Users\steve\MeWorld\game"
npm run build:catalog
```

## Categories (auto-grouped by presentation title)

| Category | Cases | Examples |
|----------|------:|----------|
| GI & Abdomen | 19 | Abdominal Pain |
| Cardiopulmonary | 18 | Chest Pain, Shortness of Breath |
| Neurology | 17 | Headache, Altered Mental Status |
| Emergency Medicine | 16 | Mixed presentations |
| MSK & General | 16 | Back Pain, Knee Pain |
| OB/GYN | 12 | Pelvic Pain, Vaginal Bleeding |
| Genitourinary | 8 | Burning During Urination |
| ID & Dermatology | 8 | Rash, Fever |
| Psychiatry & Social | 7 | Anxiety, Agitation |
| Pediatrics | 4 | Yellow Baby, Poor Feeding |
| Trauma & Toxicology | 4 | Drowning, Burns |

## Presentation playbooks (game interventions)

Full intro text captured for **8** presentations in `Step 3/ccs_presentations/`:

1. Chest Pain  
2. Altered Mental Status  
3. Pelvic Pain  
4. Abdominal Pain  
5. Headache  
6. Rash and Lethargy  
7. Generalized Weakness  
8. Burning During Urination  

All other titles use the **emergency default** playbook (monitor → IV → labs → imaging → admit) until we add more captures.

## Next actions

- [ ] Capture more presentation intros from CCS (Playwright scripts in Step 3)
- [ ] Per-case intervention orders from CCS scoring (when exported)
- [ ] Custom patient images per case
