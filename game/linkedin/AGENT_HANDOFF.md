# Agent handoff — LinkedIn content snapshot

**You are drafting LinkedIn posts for Steve about Immersa / MeWorld.** This file is your full context. Read it once, then work from `CONTENT_BACKLOG.md` and `screenshots-inbox/`.

---

## 1. What the product is

**Immersa** (product surface; the engine/world is **MeWorld**, the education arm is **Me.dici**) is a clinical simulation that teaches medicine by **running real cases instead of flashcards**. A learner walks into a scene (ER, ICU, ward), talks to a simulated patient, orders labs and treatments, and an AI **attending** teaches at the mechanism — physics, biochemistry, anatomy — tied to what is happening to *this* patient at the bedside.

The thesis: **you understand the body, you do not memorize it.** Anyone can walk through a case, not just med students.

Born from Steve's frustration with memorization-based medical training.

---

## 2. The four brand pillars (your content pillars)

Every post should ladder up to one of these. Tag each draft with its pillar. (Full source: `C:\Users\steve\Downloads\teleprompter-station\MEWORLD_FOUR_LAYER_FRAMEWORK.md`.)

| Pillar | What it is | Sounds like |
|--------|-----------|-------------|
| **Personal brand** (umbrella) | Why trust this person. Credibility from lived experience: founder, doctor, builder. | Direct, philosophical, sometimes raw. Not corporate, not hype. |
| **MeWorld / Me.dici** (education) | The simulation / real-case learning layer. The product itself. | Real cases over memorization, the body as something to understand. |
| **Beiza** (legacy) | Documenting how you think so the next generation inherits the blueprint, not just the money. | Legacy, baton, "my sons," DNA/blueprint, documenting the thinking. |
| **SAW / 99 Bitters / scale** (systems) | Building systems that run without the founder in every room. Operator/investor layer. | Build it, document it, hand it off. Compounding. The long game. |

Most product/build-in-public posts are **MeWorld** pillar. The deeper "why I'm doing this" posts are **Personal brand** or **Beiza**. The "how I build" posts are **SAW/scale**.

---

## 3. What we have actually built (your post bank)

These are shipped or working features. Each is a post seed — there are screenshots in the repo for many. Pull these into the backlog.

### The attending (the core magic)
- **AI attending tutor** that teaches at the mechanism, not the textbook. Same model that runs the case.
- **Live case ledger** — the attending sees the learner's orders, lab results, exam findings, and notes **in real time**. Ask "why is she hypotensive?" and it answers using the actual numbers on the monitor, and remembers what you already discussed.
- **Attending style control** — A/B attending "slots" plus a **depth slider** (Brief → Standard → Deep → Full arc) and **teaching leans** (physics / biochemistry / abstraction / meaning). Same question, different teacher: a tight 40-word answer or a full mechanism walk-through that ends with a Socratic question. (Screenshots: `docs/screenshots/command-ui-smoke/03-attending-BRIEF.png`, `04-attending-FULLARC.png`.)
- **"Interpret" button** on every lab/result card — one tap and the attending interprets *those* values against *this* patient and logs the explanation into the chat.

### The case engine
- **Deterministic clinical trajectory** — mistakes produce visible deterioration; correct orders stabilize or reverse. Vitals, K⁺, ECG stage follow explicit physiology rules, not vibes. The LLM explains; it does not decide whether potassium rose. (Gold spec: hyperkalemia.)
- **Order results are LLM-generated but case-grounded and cached** — the labs you see are accurate to the specific case, consistent across the session.
- **Patient life bar** — a live "how is this patient doing" read from vitals, misses, and time.

### The patient
- **Simulated patient** that stays fully in character, speaks in lay language, and does not protect you from going down the wrong diagnostic path.
- **Patient identity** — each case has a consistent name, sex, and portrait across every surface (we run an integrity audit so voice, pronouns, and face never disagree).

### The play surface
- **Command UI** — an in-scene floating dock: SOAP chart, physical exam, treatment stacks, results, and the attending chat, all over a cinematic bedside scene. (Blueprint: `docs/COMMAND_UI_ARCHITECTURE.md`.)
- **Verbatim voice dictation** — dictate notes and they are transcribed exactly as spoken, no AI rewrite.
- **Teach Me storyboard / case story** — the case replays as a visual before/after of what your decisions did.
- **Uber cases (U01–U15)** — composite, multi-system cases built from real CCS case stacks.

---

## 4. Where to query for more (do not guess)

When you need depth on a feature, read the source doc. When you need code-level truth, use graphify.

| Need | Go to |
|------|-------|
| Brand pillars + voice | `C:\Users\steve\Downloads\teleprompter-station\MEWORLD_FOUR_LAYER_FRAMEWORK.md` |
| How the attending works | `docs/BRILLIANT_ATTENDING_ARCHITECTURE.md` |
| Case engine / deterioration | `docs/CLINICAL_SIMULATION_ENGINE.md` |
| Command UI | `docs/COMMAND_UI_ARCHITECTURE.md` |
| Chart / SOAP | `docs/CHART_ARCHITECTURE.md` |
| Recent changes | `docs/CHANGELOG-2026-06-21-agent-handoff.md` |
| Any code question | run `graphify query "<question>"` in `C:\Users\steve\MeWorld\game` (see `.cursor/rules/graphify.mdc`) |
| How a post should sound | `VOICE_AND_FORMAT.md` (this folder) |

**Skills that help you write** (read the SKILL.md, then follow it):
- `content-creator` — SEO + brand voice + frameworks
- `writing-system` — locked voice rules, remix one idea into thread/post/newsletter
- `immersa-explainer` / `immersa-case-story` — if a post needs a real medical teaching moment
- `marketing-strategy-pmm` — positioning when a post is about the product's place in the market
- `social-media-analyzer` — when Steve wants performance read on posted content

**If you need something that is not here:** ask Steve a short, specific question (one decision at a time). Do not invent product claims. Every feature you describe must trace to section 3 or a doc above.

---

## 5. Your standing instructions

1. Stay in Steve's voice (see `VOICE_AND_FORMAT.md`). **No em dashes** in posts.
2. One screenshot in `screenshots-inbox/` = one short draft. Write what it shows and why it matters, in his voice, tagged to a pillar.
3. Never claim a feature we have not built. If unsure, check section 3 or ask.
4. Keep `CONTENT_BACKLOG.md` alive: take from it, and add new ideas as features ship.
5. Build toward a year of posts. Variety across the four pillars, not all product demos.
