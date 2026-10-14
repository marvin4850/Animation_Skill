# Deterministic scene data

The full runnable schema is illustrated by `templates/scene.json`. Scene version 1 includes integer width/height/FPS, a duration containing whole frames, seed, rig paths, actors, props, camera, optional layers/lights/attachments/transitions.

Actor fields: `id`, `rig`, `position`, `scale`, `view`, `facing`, `tracks`, `clips`. Root coordinates are world ground positions. `facing` controls IK bend direction; use supplied views for artwork direction changes. Authored joint bend signs can override it.

Tracks are sorted keyframes `{t,value,ease?}`; time is in seconds. Supported easings: linear, smooth, smoother, in, out, hold. Numeric scalars/vectors interpolate; strings/booleans hold until the next key. Tracks include actor position, expression, headAngle, lean, facing, handL/handR; hand targets are world coordinates. Unknown additional data is not automatically animated.

Clips define `{id,type,start,duration,...parameters}`. Evaluation sorts by start; independent body/face/arm layers can overlap. Later arm layers blend over earlier layers. `blendIn` and `blendOut` default to 0.3s; `hold:true` retains the layer through the remainder of the timeline, so author subsequent actions intentionally. `fromTarget` gives a deterministic reach/release origin. Duration/targets/steps and known clip/easing types are validated.

Locomotion segments may specify `from` and must specify `to`; even `steps` >= 2 and lift can override the rig gait. Root travel eases over duration; foot swing/stance comes from the travel fraction. A finished walk retains the final root and planted feet. Overlapping walks are rejected. Very long strides or unreachable targets fail numeric QA instead of stretching.

Camera supports fixed `center`, `zoom`, keyframe tracks (`center`, `zoom`, `followWeight`), `follow:<actor id>`, `offset` and a follow weight. Push-in/pull-out uses zoom; pan uses center; tracking uses the evaluated actor position. The temporal follow curve is deterministic and reversible, not a playback-dependent spring. Shot transitions use `{start,duration}` fade-through-black windows.

Props have id, position, z, points, optional image/size/pivot and position tracks. `terminal.buttons` resolves to the evaluated moving prop position + its local points.buttons. Actors can declare named local `points` too, enabling actions aimed at another character's evaluated root-relative interaction point. These are authored offsets, not automatically inferred animated joints. Attachments `{prop,actor,joint,start,end,offset}` follow an actor joint during their interval, providing pick-up/place scaffolding. Release destinations must be explicitly authored.

Pure API: `evaluate(scene,rigs,seconds)`, `atFrame(scene,rigs,integerFrame)`. Frame range is 0 through duration×FPS−1. Browser export calls `__renderFrame(frame, options)`; the compatibility `__renderAt(seconds)` also exists. No random state, integration, wall clock or previous-frame dependency enters evaluation. Wall time is used only to advance preview time.
