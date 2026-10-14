---
name: ref2animation
description: Create, preview, revise, validate and export silent 2D cutout character animations from scene descriptions, references and existing character artwork. Use for cinematic animation, character rigging, gestures, walking, camera choreography or animation corrections; includes deterministic WebGL2 rendering and local H.264 export.
---

# Ref2Animation

AI interprets the scene and authors data. Deterministic code controls every frame.
This skill is self-contained. `<skill>` means the directory containing this file.
Do not add gameplay, speech, lip synchronization, narration or paid services.

## Start and verify

Use the existing checkout in cloud tasks; each task is already isolated. Do not create a Git worktree unless the user asks.
Read `README.md`, `references/rigging.md`, `references/timeline.md` and `references/qa.md` before authoring a scene.
Run commands from `<skill>`; quote paths. Use Python 3.12, Node 20+, Chromium and FFmpeg.

```text
python scripts/setup.py
node scripts/serve.mjs
```

On Windows, `py -3.12 scripts/setup.py` is an alternative. No WSL or bash is required by new scripts.
For the prepared Linux cloud machine: `python3 scripts/setup.py --system-browser /usr/bin/chromium --software-gl`.
Setup creates `.venv`, installs pinned Python packages and the frozen npm lockfile, then actually runs numeric and browser QA.
Reopen the preview through a local browser. Cloud onboarding has no supported user-facing loopback preview; make internal requests and report evidence in text.
Processes must restart in a new task. Retained dependencies alone do not prove readiness.

## Choose the workflow

**A — reference to scene.** Inspect supplied images; record composition, perspective, palette, line weight and intended movements in the project notes. Separate depth layers, characters and prop interaction points. Keep the input files intact. Use the available image tool only for creative generation/editing when authorized. Label temporary assets explicitly. Never infer that a generated substitute preserves an unavailable character design.

**B — supplied character assets.** Prioritize the original artwork. Inventory available views and expressions. List alpha components with `vendor/ref2game/scripts/slice.py` (no names means no files are written). Review semantic labels; component detection does not reliably recognize body parts. Use explicit crop rectangles and pivots with `scripts/assets.py`. It copies original RGBA crop pixels without recoloring. Set the rig's `placeholder` to false and supply every required part image; missing artwork must fail instead of silently regenerating it. Work on copies when using upstream tools that alter art or write `live/rigs.js`. Their legacy rig format is not the new JSON format.

**C — revision.** Diagnose the relevant clip, geometry, contact, view or camera track. Use `scripts/revise.mjs` with an expected old value and one named clip. Save a new scene and preserve approved unrelated data. Re-render its reported affected range; run full numeric QA and relevant regression tests. Compare matching times and actor-relative crops, never treat every animated difference as a fidelity defect.

## Interpret and stage the request

Codex interprets natural language; the local `director.mjs` compiler consumes a structured shot plan. It does not call an external AI API or pretend to understand arbitrary prose itself.

1. Record actors, available rigs, props and local interaction points, actions, timing and camera intent.
2. Infer ordinary staging decisions. Ask only about an essential ambiguity or missing required asset. Continue independent work on explicitly labeled calibration/prop placeholders. Never replace an approved character without authorization.
3. Write a shot plan following `examples/talen-test/plan.json` and `references/cinematic-direction.md`.
4. Compile it to a new scene:

```text
node scripts/director.mjs --plan examples/talen-test/plan.json --out examples/my-scene/scene.json
node scripts/qa.mjs --scene examples/my-scene/scene.json --out output/my-scene-qa
```

Put images inside the skill/project tree and reference them with paths relative to `<skill>`.
The preview accepts `scene=<relative JSON path>`; use the same scene path for QA and rendering.
Layer clips by action, use alternate artwork for turns, use real prop targets for contact, and use conservative gait step lengths appropriate for the rig. Camera pan/zoom and follow curves are evaluated from time, not integrated history.

## Production gates

Run `npm test`, `.venv` Python asset tests, `node scripts/qa.mjs --scene ...`, and `node scripts/livecheck.mjs` after relevant changes.
Numeric QA samples every frame. Browser QA samples nine story times, tests pixel determinism including direct versus sequential frame 240, validates nonblank frames and alpha, and produces a contact sheet.
Inspect contact sheets and enlarged character frames for anatomy, seams, limb/prop occlusion, readable gestures, style and continuity. Measurable passes and aesthetic criticism must be reported separately. If no independent reviewer is used, label visual passes self-review; do not claim an independent critique occurred.
Known limitations and the actual checks are in `references/qa.md` and `references/technical-report.md`.
Missing Talen artwork blocks the design-preservation acceptance criterion even if all mechanical checks pass.

## Export and deliver

```text
node scripts/render.mjs video --scene examples/my-scene/scene.json --out output/animation.mp4
node scripts/render.mjs sequence --scene examples/my-scene/scene.json --alpha --out output/alpha-frames
python scripts/pack.py --out output/ref2animation.zip
```

The video renderer captures exact frames, encodes once with FFmpeg, and verifies H.264, dimensions, FPS, frame count, duration, no audio and full decode. Alpha PNG sequences contain the characters; the background and props are omitted.
Deliver scene JSON, rigs, source assets/manifest, MP4, QA report/contact sheet, editable source and an installable ZIP. Distinguish calibration renders from accepted character production. State Windows testing status honestly.
