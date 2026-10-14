# Calibration choreography for the Talen acceptance scene

12 seconds, 1080 × 1920, 30 FPS, silent. Both actors use an explicitly marked synthetic calibration rig. Original Talen artwork is missing; this example does not validate its design.

| Time | Beat |
|---|---|
| 0–2 | Raise right hand to actual terminal button point |
| 2–4 | Four press/retract cycles |
| 4–5.5 | Release hand and crossfade three-quarter to side artwork |
| 5.5–9 | Articulated walk with deterministic world foot contacts and camera tracking |
| 9–10 | Settle beside Marek, look at fault |
| 10–12 | Reach pointing pose toward actual mechanism fault, hold gesture |

`worker.rig.json` has 16 body parts and a hierarchical skeleton. The head, torso, hands and segmented limbs move independently. The example scene can be reopened, seeked, compiled from plan.json and revised by clip id.

The calibration environment intentionally uses modest geometry. Replace it only with explicitly approved assets; supplied Talen artwork must be measured and imported before accepting the final production scene. No character regeneration is necessary for the mechanical test.
