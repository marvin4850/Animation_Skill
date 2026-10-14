# Rig and asset contract

Rig coordinates use pixels, x right/y down; actor position is the ground/root origin. A rig declares `joints`, `parts`, `views`, `expressions`, optional `gait`, and `placeholder`. Start from `templates/character.rig.json` and measure against the actual artwork.

```json
{
  "joints": {
    "pelvis": {"parent": null, "offset": [0,-185]},
    "torso": {"parent":"pelvis", "offset":[0,-68]},
    "shoulderR": {"parent":"torso", "offset":[25,-15]},
    "elbowR": {"parent":"shoulderR", "offset":[0,80], "limits":[0.04,2.7], "bend":1},
    "handR": {"parent":"elbowR", "offset":[0,72]}
  },
  "parts": {
    "forearmR": {"from":"elbowR", "to":"handR", "image":"assets/forearmR.png", "size":[31,87], "pivot":[15,7], "z":48}
  }
}
```

This snippet is illustrative, not a complete rig. Required joints: pelvis/torso/neck/head, hip/knee/ankle and shoulder/elbow/hand on L and R. Required parts: pelvis, torso, neck, head and both thighs, shins, feet, upper arms, forearms, hands. Accessories are extra parts with a joint attachment and z. Bounds and parent cycles are validated before rendering.

Textures for bone segments are authored extending downward from `pivot`; the renderer rotates about that pivot without changing the physical bone length. `size` is the authored display size; do not change it to hide IK reach errors. `z` controls near/far ordering; each view can override it and the part image/size/pivot.

```json
{"views":{"side":{"parts":{}},"back":{"parts":{"head":{"image":"assets/head-back.png"},"upperArmR":{"z":8}}}}}
```

Views support front, three-quarter, side, back, back-three-quarter or your own names. `turnBody` crossfades available drawings. A missing view is reported and current art is retained; no 3D rotation is fabricated. The planar IK solver is most suitable for side-view cutouts. Front/back perspective and depth foreshortening need appropriately authored rigs; this prototype does not infer them from a flat sheet.

Head parts optionally define `expressions: {"neutral":"...", "afraid":"..."}`; expression names live in the rig's list. No mouth motion. For user art, `placeholder:false` requires an image for every part; missing images fail. Paths are relative to the skill root.

Leg/arm lengths come from measured rest joints. Limits bound the bend angle in radians; `bend` is an optional stable ±1 branch. Unreachable targets are clamped without stretching and reported by QA. Optional `armRest` supplies local shoulder-relative idle hand targets; the default comes from measured rest joints. Parameterless reach/point scales to the arm's measured reach. Choose gait stance width/ankle height/step length/lift from the character. Example `gait: {"stanceHalf":22,"ankleHeight":12,"stepLength":50,"lift":32}`. Foot contacts are fixed world positions between deterministic swing intervals. Flat ground is the verified workflow; uneven/depth-changing ground is not validated.

Optional `layerRules` lists expected `[behind,inFront]` part pairs; views can override those rules. QA rejects inverted authored orders before rendering.

For exact extraction, provide a JSON manifest relative to the sheet:

```json
{"sheet":"talen-sheet.png","parts":{"head":{"box":[10,20,88,112],"pivot":[39,44],"parent":"neck"}}}
```

Run `python scripts/assets.py manifest.json --out assets/cutouts`. Source pixels and alpha are copied unchanged. Existing outputs are refused. The asset manifest records source/output hashes, dimensions, pivots and alpha ranges. Component detection can list candidates; names, occlusion and anatomical pivots require visual review. Completing hidden anatomy or missing views requires explicit permission; retain the original asset files.

Legacy rig tools produce `window.RIGS`, not this JSON. Use them only on copies and translate reviewed metadata manually. Their combined head/body pieces cannot establish independently articulated heads without extra artwork/cuts.
