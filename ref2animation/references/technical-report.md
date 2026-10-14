# Ref2Animation 0.1.0 — implementation and evidence

Delivered a runnable, installable first-version Skill, not just an architecture proposal. Source lives separately from the uploaded original. All 101 original files retained their SHA-256 hashes; no original files were added, removed or changed. The MIT license and studioigor copyright notices are preserved.

## Implemented

- Reused WebGL2 affine quad/texture infrastructure, with alpha export and reload resource cleanup. Preserved nine upstream Python preparation/comparison tools and seven architectural references in vendor.
- Added pure scene evaluation, exact integer frame seeking, numeric/vector keyframes, easing, sequential/concurrent clip layers, authored view crossfades, expression texture slots, actor/prop interaction points, attachments, camera pan/tracking/zoom and fade transitions.
- Added hierarchical head/neck/torso/pelvis/arm/leg joints, 16-part calibration rigs, stable two-bone IK, bend constraints, fixed lengths, configurable pivots/z rules and deterministic world foot contacts.
- Added 20 reusable acting/motion primitives, a structured Codex direction compiler and conflict-checked single-clip revision with conservative affected-frame ranges.
- Added local timeline preview/reload/overlays, exact-art RGBA crop extraction and manifests, every-frame numeric QA, browser/pixel QA, contact sheets, alpha PNG samples, verified silent MP4 export, native cross-platform setup/install and hash-verified ZIP packaging.

Natural-language interpretation belongs to Codex following SKILL.md; the local compiler consumes reviewed structured plans. It does not invoke a paid model or claim unrestricted prose understanding from keyword parsing.

## Verified execution

Linux cloud: Python 3.12.14, Node 24.19.0, Chromium 154.0.8037.57, FFmpeg 7.1.5. Python dependencies installed in local virtual environments; Playwright 1.58.2 installed with npm ci and the frozen lockfile. TLS/checksum/package verification was not disabled. The cloud renderer uses SwiftShader; GPU acceleration was not measured.

| Check | Actual result |
|---|---|
| Runtime/direction/revision regressions | 15 tests passed, 0 failed/skipped |
| Exact-art extraction/source preservation | 2 Python tests passed |
| Browser UI/art integration | 8 checks passed; seeking, play/pause, overlays, aspect workspace, reload preserving frame, export overlay isolation, external alpha artwork, missing-art hard failure |
| Numeric choreography | All 360 frames inspected; planted slide 0 world pixels, contact-goal error 0, limb length deviation ≈2.6e−15, swing lift ≈32 pixels |
| Pixel determinism | 9 distributed repeat/reverse samples identical; direct frame 240 identical to sequential renders 0…240 |
| Render validity | Correct 1080×1920 nonblank canvas; alpha samples have transparent background and visible characters |
| Video | 360 frames, exactly 12s, 30/1 FPS, 1080×1920, H.264, no audio; entire file decoded successfully |
| Visual evidence | Story contact sheet, 22-frame walk sheet, enlarged frames and a decoded actual MP4 frame inspected |
| Installation | Separate clean install in `/tmp/ref2animation install smoke`, including a path with spaces, dependency installation and functional QA passed |
| Original-source integrity | 101 files unchanged; no extra original-source files |

Reports/images are in `deliverables/qa`, `deliverables/browsercheck`, `deliverables/alpha-samples` and beside `calibration-demo.mp4`. The upstream comparison tool was exercised on identical frames (zero differing pixels), proving its dependencies work; that is not a source-character fidelity result.

Defects found and fixed: neck/torso rest gap, initial safe-frame clipping, pointing hand hidden by the second actor, favicon noise reported as a page error, and a revision test that accidentally included the revised clip in its unrelated-data comparison. Regression tests now cover rest gaps, frame clipping, pointing occlusion, excessive strides/clamped sliding feet, unreachable targets, root jumps, layer ordering and revision preservation. Visual passes were self-review; no independent critic approval is claimed.

## Talen acceptance status

The two uploaded files contained the project archive and specification, **not Talen's reference sheet**. The demo is visibly watermarked as synthetic calibration artwork. No claim is made that a replacement puppet preserves Talen's design. Overall production acceptance remains incomplete.

| Requested criterion | Status |
|---|---|
| Articulated Talen body and independent arm | Mechanism verified on 16-part calibration puppet; original Talen pending |
| Terminal interaction | Measured hand joint reaches actual local button goal; original texture contact/pivot still needs review |
| Articulated walking / planted feet | Geometry and walk sheet verified on calibration rig |
| Appropriate body orientation | View crossfade verified; calibration torso art is shared, production alternate body artwork is pending |
| Camera follows movement | Measured and rendered tracking verified |
| Clear pointing gesture | Calibration gesture inspected; character identity/style unverified |
| Accurate seeking | Numeric and pixel determinism verified |
| 12s / 1080×1920 / 30FPS video | Verified from exported MP4 and full decode |
| Reopen and modify | Editable JSON, compiled scene, preview reload and revision tests verified |
| Preserve approved Talen design | Not tested: missing reference sheet |

## Limits

This is a functional prototype with primitive calibration art and motion primitives, not a finished professional acting library. Existing-pixel extraction is lossless; semantic segmentation, occluded anatomy and joint identification require reviewed manifests. Imported legacy rigs are not automatically compatible with the new separate-head/hand JSON hierarchy.

IK is planar and fixed-length, most appropriate for side cutouts. Full perspective-aware front/back locomotion, automatic collision avoidance against textured silhouettes, full anatomical intersection detection, occlusion-aware physical lighting, complete automatic reference fidelity scoring and independent critic orchestration remain unimplemented. The provided joint/safe-frame/overlap heuristics and self-review must not be described as those capabilities.

Windows 11 paths/processes/install commands were adapted and audited, but native Windows execution was not available. WSL is not required by the new scripts; Windows GPU/browser/package behavior remains to be tested on an actual machine.

Cloud `install_script` and `start_skill` were saved as a draft. Publication is a separate user action in environment settings; fresh-task restoration was not tested. The GitHub repository was originally empty, so no remote source synchronization or push is implied by the local deliverable.

To complete the approved-character test: supply Talen's actual source sheet, map/crop its available views and expressions, measure pivots, replace the calibration rig without redesigning artwork, run the full mechanical/pixel QA, inspect all relevant views/contact frames and export the revised scene. A missing Marek/environment can continue to use explicitly identified placeholders.
