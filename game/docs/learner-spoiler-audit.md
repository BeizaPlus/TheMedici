# Learner spoiler audit

Generated: 2026-06-24T13:09:18.545Z

| Metric | Count |
|--------|------:|
| Cases | 194 |
| Cases with issues | 0 |
| Missing practice_hpi | 0 |
| HPI issue cases | 0 |
| Exam issue cases | 0 |
| Order-cache hits | 3 |

## Promotion template (case markdown)

When writing `docs/cases/case-NNN-*.md`, split like **case 122**:

| Section | Goes to |
|---------|---------|
| **Initial history (learner-facing — `practice_hpi`)** | Symptoms, PMH, meds as facts — no diagnosis window, no exam, no treatment |
| **Answer-key HPI (`hpi_narrative`)** | Attendant / teach only |
| **Initial bedside exam** | Objective findings only |
| **Full skin exam / labs / biopsy order results** | Raw values — learner classifies |
| **Attendant demo arc** | Tutor chat canon — never copy into `practice_hpi` |

Gold file: `docs/cases/case-122-painful-rash.md`

## Commands

```bash
npm run audit:learner-spoilers
npm run fix:learner-presentation   # after build-prepared-cases or new imports
```

## Worst offenders (first 25)

