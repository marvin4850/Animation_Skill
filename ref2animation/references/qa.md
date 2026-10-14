# What QA proves

`npm test`: hierarchy errors/pivots/rest gaps, IK lengths/constraints at reachable and unreachable goals, data immutability, seek independence, every clip primitive, view fallback, track boundaries, attachments, direction scheduling, local revision/conflict checks, and regressions for jumps, unreachable contacts and pointing occlusion.

Python tests verify exact RGBA extraction, source-byte preservation, existing-output protection and crop bounds. The upstream slicing/preparation tools have their own legacy semantics; importing them does not make them valid for every sheet.

`qa.mjs` first runs numeric geometry QA at **every frame**, then launches Chromium. It measures planted ankle slide, ground penetration, leg lift/articulation, fixed lengths, hand contact goals, root/joint/camera discontinuity, safe-frame joints and pointing-hand/head occlusion. Torso/hand overlap is a heuristic warning. Rest gap tests cover vertical head/neck/torso/pelvis placement; textured seams and per-view layer ordering still need visual inspection.

Browser checks render nine distributed story frames in repeated/reversed orders, compare PNG bytes, render 0…240 sequentially and compare frame 240 against a direct seek, verify nonblank/nonblack resolution and character alpha, collect browser errors and make a contact sheet. These are measured results, not claims inferred from a PID or successful installation.

`livecheck.mjs` exercises actual UI seeking, play/pause, overlays, workspace aspect, JSON hot reload retaining frame, export excluding overlays, external artwork with alpha/source preservation, and hard failure on a missing texture. Expected missing-art failures are isolated from successful scene errors.

Export verifies ffprobe stream dimensions, frame rate, count, duration, H.264, no audio; FFmpeg decodes the whole resulting file. Read video metadata reports beside the MP4. Contact-sheet visual checks evaluate anatomy, composition, style, continuity and technical output separately. Current visual passes are **self-review**, not independent external critic approval.

Limitations: bounding tests use joint geometry and approximated head radii, not full texture collision; no complete hand/torso collision avoidance or per-frame image classifier; no automated source-design fidelity pass without the approved reference; front/back foreshortening requires authored data. A mechanical QA pass does not establish polished animation or Talen identity.

Acceptance for the provided Talen task is partial: choreography mechanics/export/editability can be verified on calibration assets. The preserved approved design and production-quality view-specific animation cannot be accepted until Talen's source sheet is supplied and visually checked.
