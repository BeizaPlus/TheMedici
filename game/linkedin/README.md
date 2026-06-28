# LinkedIn content workspace

This folder is the single home for Steve's LinkedIn posting about **Immersa / MeWorld** (and the wider brand). Point any new agent here.

Posts are scheduled through a local **Postiz** instance (the social scheduler). Each scheduled post here carries its `postiz_post_id` so the file and the queue stay in sync.

## If you are the agent, start here

1. Read **`AGENT_HANDOFF.md`** — the snapshot of what we built and the framework behind it. This is your context.
2. Read **`VOICE_AND_FORMAT.md`** — how a post must sound and how it is structured. Non-negotiable.
3. Open **`CONTENT_BACKLOG.md`** — the running list of post ideas mapped to brand pillars and shipped features. Pull the next idea from here.
4. Check **`screenshots-inbox/`** — Steve drops raw screenshots here. Each one becomes a short post.
5. Build a post as a **self-contained folder** (see layout below) using **`ideas/_TEMPLATE.md`**: a `post.md` plus the image it uses, living together.
6. After it publishes, move the folder into **`published/`** and log it in **`PUBLISHED_LOG.md`**.

## Folder layout

Each post is its own folder containing the copy and its image, so nothing is ambiguous and nothing gets separated.

```
linkedin/
├── scheduled/
│   └── week-2026-06-29/              one folder per week (Monday-anchored)
│       ├── README.md                 the week's schedule table + Postiz IDs
│       ├── 1-mon-06-29-simulated-hospital/
│       │   ├── post.md               copy + frontmatter (status, date, postiz_post_id)
│       │   └── case-library-tom-hayes.png
│       ├── 2-tue-06-30-no-practice-round/
│       │   ├── post.md
│       │   └── the-room-found-unconscious.png
│       ├── 3-thu-07-02-sore-throat/
│       │   ├── post.md
│       │   └── sore-throat-emergency-medicine.png
│       └── 4-fri-07-03-immersa-changes-that/
│           ├── post.md
│           ├── attending-teaches-pressors.png
│           └── _VERSIONS.md           backup history of this post's copy
├── held/                             written, deliberately NOT scheduled (needs a decision)
│   └── not-only-hearts-and-labs/
│       ├── post.md
│       └── psychiatry-social-case.png
├── ideas/                            unscheduled drafts + the template
│   ├── _TEMPLATE.md
│   └── same-question-two-teachers.md
├── published/                        archive of posts that have gone live
├── screenshots-inbox/                Steve drops raw screenshots here
├── AGENT_HANDOFF.md
├── VOICE_AND_FORMAT.md
├── CONTENT_BACKLOG.md
└── PUBLISHED_LOG.md
```

## The loop

```
Steve drops a screenshot in screenshots-inbox/
  -> agent writes a post package (post.md + image) under scheduled/week-XXXX/
  -> agent schedules it in Postiz and writes the postiz_post_id into post.md
  -> Steve reviews
  -> it publishes
  -> agent moves the folder to published/ and logs it in PUBLISHED_LOG.md
```

## post.md frontmatter

```
pillar:          PB | MW | BZ | SC      (see AGENT_HANDOFF.md)
type:            screenshot-demo | worldview | build-in-public | teaching | operator
status:          idea | drafting | drafted | held | scheduled | published
channel:         linkedin
scheduled:       ISO datetime in UTC (blank if not scheduled)
local_time:      human-readable post time
image:           ./file-in-this-folder.png   (blank for text-only)
image_url:       the served Postiz URL (…/api/uploads/…)
postiz_post_id:  the id returned by Postiz
hook:            the first line, the one that earns the click
```

Plain Markdown, grep-able and diff-able, living next to the product it talks about. No database, no spreadsheet.

## Version control: back up before you overwrite

Steve often edits the live post in the Postiz UI after it's scheduled. **Before changing or
replacing an existing post, snapshot the current copy** into a `_VERSIONS.md` file inside that
post's folder (newest entry on top, with a timestamp). Then change it. This keeps a plain-text
history so a hand edit can never be silently lost.

- Prefer **editing** an existing scheduled post over deleting and recreating it (recreating
  changes the `postiz_post_id` and can revert UI edits).
- Postiz **soft-deletes**, so older versions stay in its database and can be recovered. The
  full recovery + restore procedure is in `C:\dev\Schedular\AGENT_RUNBOOK.md` (section 0).
- See `scheduled/week-2026-06-29/4-fri-07-03-immersa-changes-that/_VERSIONS.md` for an example.
