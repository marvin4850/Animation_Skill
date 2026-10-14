# Ref2Animation 0.1.0

A local Codex Skill for silent 2D character animation. Codex interprets the prompt and prepares a structured shot plan; a deterministic WebGL2 runtime handles cutout puppets, IK, timelines, camera movement, preview, QA and video rendering. Derived in part from [studioigor/ref2game](https://github.com/studioigor/ref2game), MIT.

**The bundled 12-second demo is a calibration render. The Talen reference sheet was not included in the supplied files. Neither calibration puppet is approved Talen artwork.** Environment and Marek are labeled placeholders. The completed mechanical prototype cannot establish character-design fidelity without that sheet.

## Install

Prerequisites: Python 3.12, Node.js 20+ LTS, FFmpeg/ffprobe. Chromium is installed by Playwright, or use `--system-browser <executable>`.

```text
python scripts/install-skill.py
```

This copies into `~/.codex/skills/ref2animation` and refuses to overwrite an existing installation. Change to that folder, run `python scripts/setup.py`, and restart Codex. Use `--target <folder>` for an alternate installation. See [Windows setup](references/windows-setup.md) for native PowerShell commands and testing limits.

For this cloud checkout:

```text
cd /workspace/Animation_Skill/ref2animation
python3 scripts/setup.py --system-browser /usr/bin/chromium --software-gl
```

No keys, paid APIs or GPU are required. Software WebGL is slower; Windows can use Chromium's normal GPU path. Dependencies use `package-lock.json` and pinned `requirements.txt`; setup creates a local `.venv`, uses `npm ci`, and preserves existing example files.

## Preview and export

All commands run from the skill root.

```text
node scripts/serve.mjs --port 8765
node scripts/qa.mjs --out output/qa
node scripts/render.mjs video --out output/calibration-demo.mp4
node scripts/render.mjs sequence --alpha --out output/alpha-frames
node scripts/render.mjs stills --frames 0,60,120,180,240,300,359 --out output/story-frames
```

Open the local browser at loopback port 8765, path `/runtime/index.html`. Cloud onboarding has no public preview URL. The UI supports play/pause, frame stepping/seeking, scene reload, alternate workspace aspects, joint/bounds overlays and safe guides. It watches the scene and rig JSON; asset changes require Reload. Workspace aspect choices fit the existing scene rather than rewriting its export dimensions.

Video defaults are authored by scene JSON: the example is 1080 × 1920, 30 FPS, 12 seconds. H.264 output has no audio; `--alpha` is supported for PNG sequences, with characters isolated from the environment. `--from` and `--to` are integer frames, with an exclusive end.

## Make your own animation

Invoke `$ref2animation` with a prompt, character-sheet path and environment-reference path. Example:

> Use $ref2animation. Preserve `assets/talen-sheet.png`. Animate the worker operating the terminal, walking to Marek and pointing at the faulty gear. Use `assets/factory-reference.png` for staging. Make a silent 12-second vertical clip; do not generate missing character views without asking.

Codex inventories artwork, records style/layout, maps or extracts parts, measures pivots, authors rig JSON and a shot plan, compiles it, previews, checks QA, inspects contact sheets, revises and exports. A character sheet with touching/overlapping parts needs reviewed crop/mask definitions; autonomous semantic segmentation is not guaranteed.

For a deterministic structured plan:

```text
node scripts/director.mjs --plan examples/talen-test/plan.json --out examples/custom/scene.json
node scripts/qa.mjs --scene examples/custom/scene.json --out output/custom-qa
node scripts/render.mjs video --scene examples/custom/scene.json --out output/custom.mp4
```

Explicit asset extraction:

```text
python scripts/assets.py assets/crops.json --out assets/cutouts
```

See [rigging](references/rigging.md), [timeline](references/timeline.md) and [direction](references/cinematic-direction.md) for schemas. See [revision](references/animation.md) for editing one action without changing unrelated work.

## Validation and delivery

```text
npm test
python -m unittest discover -s tests -p "test_*.py"
node scripts/livecheck.mjs
node scripts/qa.mjs
python scripts/pack.py --out output/ref2animation.zip
```

Use the `.venv` interpreter for Python tests outside setup. The provided reports describe actual results and limitations. Windows-native execution and fidelity to Talen remain unverified. See [technical report](references/technical-report.md) and [architecture audit](references/architecture.md).

The supplied original ZIP was extracted separately under `/workspace/sources/ref2game-main` and left unchanged. This project does not contain game input, collision gameplay, voice or lip sync. The original MIT license and copyright notice are preserved in `LICENSE` and `vendor/ref2game/LICENSE`.
