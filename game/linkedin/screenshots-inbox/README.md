# Screenshots inbox

**Steve:** drop raw screenshots here. That is all you have to do.

**Agent:** for each new image in this folder:

1. Look at it. (If you cannot read it on the current model, run `python C:\Users\steve\ollama_vision_read.py --json <path>` per the vision rule.)
2. Write one short post about what it shows and why it matters, in Steve's voice (`../VOICE_AND_FORMAT.md`).
3. Make a post folder (e.g. `../scheduled/week-XXXX/N-day-MM-DD-slug/`) from `../ideas/_TEMPLATE.md`, save it as `post.md`, and **move this image into that folder** so the post is self-contained. Set `image:` to `./<file>.png` and pick the pillar.
4. Add or update the matching row in `../CONTENT_BACKLOG.md` and set status `drafted`.
5. Once scheduled in Postiz, write the `postiz_post_id` into `post.md`. After it publishes, move the whole folder into `../published/`.

## Naming (optional, helps)

If you name the file with a hint it is easier: `attending-interpret.png`, `patient-life-bar.png`. If not, the agent will infer from the image.

## Notes to the agent per image (optional)

If Steve wants to say something specific about a shot, he can drop a `.txt` next to it with the same name (`attending-interpret.txt`) and the agent uses that as the angle.
