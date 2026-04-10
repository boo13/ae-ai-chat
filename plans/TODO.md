# TODO

## Verify Implemented Plans (in AE)

### Richer Context
- [x] Select a layer with an effect. Ask "what's my blur value?" — Claude should answer with the correct value without being told.
- [x] Select a keyframed property in the Timeline. Ask about keyframe times — Claude should report them correctly.
- [ ] Select no layers. Ask a question. Confirm Claude doesn't hallucinate effect/keyframe data that isn't there.

### Error Feedback
- [ ] Send a message that generates a script. Manually introduce an error at a specific line in `.session/ai-action.jsx`. Run it. Let it fail.
- [ ] Click "Fix Last Error". Confirm the sent message contains the annotated script with `// <-- ERROR HERE` on the correct line.
- [ ] Trigger a SyntaxError (use `const` in a script). Click "Fix Last Error". Confirm the ES3 hint appears in the prompt.
- [ ] Delete `.session/ai-action.jsx`. Click "Fix Last Error". Confirm it falls back gracefully (error string only, no crash).

### Corpus Expansion
- [x] Ask `"create a shape layer with a star and trim paths animation"`. Confirm the generated script uses `ADBE Vector Shape - Star` and `ADBE Vector Filter - Trim`.
- [x] Ask `"create a text layer that says Hello World at 72pt"`. Confirm the script uses the correct `TextDocument` pattern (read `.value`, modify, `.setValue()`).
- [ ] Ask `"add a camera with shallow depth of field"`. Confirm the script uses `ADBE Camera Options Group` / `ADBE Camera Depth of Field`.

## Commit Verified Work
- [ ] Commit changes in `ae-ai-starter` (modified discovery scripts + new JSON files)
- [ ] Commit changes in `ae-ai-chat` (all modified + new files from the three plans)

## Implement Fourth Plan
- [ ] Implement `plans/few-shot-examples.md`
