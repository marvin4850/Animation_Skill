# Clip library and revision

Reusable clip primitives are evaluated against an arbitrary measured rig. They are initial motion building blocks, not a polished library of final character-specific acting.

| Clips | Behavior / parameters |
|---|---|
| idle, breathing | subtle torso lean; speed, intensity, duration |
| walk | authored from/to, duration, easing, steps, lift; scale from rig; planted world contacts and arm counter-swing |
| start, stop, lean | eased body-angle layer; angle/intensity |
| turnHead, lookAt | head-angle blend / actual target look direction |
| turnBody | crossfade authored alternate artwork; view and optional facing |
| raiseArm, reach | IK goal, side, intensity, blend timing; optional fromTarget for release/transfer |
| point | hand goal along the actual prop direction, clamped to limb reach; calibration index-finger variant |
| press | target-relative rhythmic contact/retract; speed, depth |
| pickUp, place | hand target lift/lower; height; combine with explicit prop attachments |
| react, uncertain, fear, tension, hesitate | distinct posture/head/arm layers via intensity; authored expression events can accompany them |

All have start/duration, easing, intensity and blending. Walking speed is destination distance divided by duration, modified by easing; press/breath speed controls cycle frequency. Target positions resolve prop local coordinates. Concurrent layers do not require rebuilding unrelated scene objects.

One-action revision example:

```json
{"actor":"Talen","clip":"raise","expected":{"blendIn":1.6},"set":{"blendIn":1.8}}
```

```text
node scripts/revise.mjs --scene examples/talen-test/scene.json --patch revision.json --out examples/revised/scene.json
node scripts/render.mjs sequence --scene examples/revised/scene.json --from 0 --to 60 --out output/revised
node scripts/qa.mjs --scene examples/revised/scene.json --out output/revised-qa
```

The output is a new scene; existing scenes are not overwritten. The affected range is conservative: changes to held layers, orientation or locomotion include downstream frames. Preserve clip identity/type. Compare matching render times using upstream compare.py, then add a regression for the defect. Do not alter style or unrelated timing because of a local revision.
