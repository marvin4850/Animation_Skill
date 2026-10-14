# Architecture audit

Source audited: the user-supplied `ref2game-main.zip`, Codex distribution. The archive carries no Git revision metadata, so no upstream commit is asserted. The complete Codex SKILL, Python cutout/asset tools, browser tools, WebGL layer, live/blank templates and relevant animation, engine, effects, art, critique and pitfalls references were inspected. Original files are retained separately, with SHA-256 hashes checked after implementation.

| Original component | Actual interface / limitation | Decision |
|---|---|---|
| `gl.js` | Global G, affine pixel quads, GLSL programs, premultiplied textures and render targets; original default framebuffer disables alpha | Reuse; enable alpha and release owned resources during reload |
| `lib.js` | Shader/effect library and authored-angle two-bone drawing, with joint tracing; not an autonomous arbitrary-target skeletal animator | Retain architectural knowledge; use a small cinematic renderer and analytic target IK instead of hauling unused game/post systems |
| `rigcut.py` | Alpha-gap/polygon heuristics; common full canvas; splits legs/arms, optional elbow; body/head remain joined; may fill occluded holes and delete named part outputs | Preserve unchanged in vendor, optional in a copied legacy project; not a semantic character-sheet recognizer or native new rig format |
| `partrig.py` | Expects separate body, one leg, one arm; duplicates limbs; modifies dark openings; common canvas and `live/rigs.js` | Preserve unchanged, useful legacy preparation; reviewed separate head/neck/hand pieces still needed for a full new rig |
| `jointr.py` | Samples alpha half-width at knees/elbows, writes legacy rig joint-cap radii | Preserve unchanged; new calibration parts overlap at joints, art seams require visual validation |
| `softbones.py` | Three-channel deformation maps driven by explicit polygons/roots; depends on legacy crop metadata and shader inverse mapping | Preserve unchanged; not used by cinematic humanoid runtime; soft-bone deformation remains optional legacy capability |
| `slice.py` | Connected alpha components with configurable dilation/order; no body-part semantics | Preserve unchanged for detection/listing; exact reviewed extraction provided by `assets.py` |
| `prep.py` | Alpha crushing, RGB bleed, trim/scale and crop manifest; can alter artwork | Preserve unchanged as opt-in legacy tool; exact-art default uses lossless RGBA crops |
| `compare.py`, `study.py`, `sheet.py` | Offline metrics, aligned reference regions, palette/value analysis and sheets; pose differences are not automatically defects | Preserve unchanged; use same-time/actor-aligned comparisons and style measures |
| `qa.mjs` | Requires SCENE.QA, LIB.TRACE, gameplay states, fixed landscape UI assumptions and cycle meta | Replace with all-frame cinematic geometry QA plus independent browser/render checks; reuse foot-plant, target, stretch and continuity philosophy |
| `render.mjs` | Pure `__renderAt(t)` browser capture then FFmpeg, self-contained HTTP server; POSIX URL.pathname assumptions | Adapt concept into new scripts with `fileURLToPath`, frame numbers, cleanup, alpha and verified encode/decode |
| `livecheck.mjs` | Keyboard/pointer game scripts, landscape viewport, sim.js touch and FPS checks | Replace with real timeline-control/reload/artwork tests |
| `index.html`, `sim.js`, `scene.js`, blank/top templates | Interactive simulation, attract/play state and game mechanics | Replace with a cinematic preview, scene JSON and pure evaluation |
| `setup.sh`, `serve.sh`, `pack.py` | Bash/POSIX assumptions, game-specific skeleton and build output | Replace setup/packaging with pathlib/subprocess Python and Node servers; no WSL requirement |

The legacy references remain in `vendor/ref2game/references`. Their game workflows and agent directives are background material, not the governing instructions of this Skill.

New data flow: Codex shot plan → validated scene JSON → pure time evaluation → hierarchical joints + analytic IK → sorted WebGL2 cutout/layer rendering → PNG → one FFmpeg encode → ffprobe/full-decode verification. Numeric QA operates independently of the renderer; pixel checks operate through Chromium. No framework or external AI service is required.

`runtime/math.mjs` owns interpolation/easing/stateless randomness. `rig.mjs` owns hierarchy/IK/validation. `timeline.mjs` owns clips, contacts, views, prop attachments and camera. `renderer.mjs` owns assets and draw order. Scripts start servers, compile direction, revise, extract, test, export and package. Scenes and rigs remain editable data.
