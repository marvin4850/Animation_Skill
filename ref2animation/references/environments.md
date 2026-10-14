# Layered scenes

Background can be a supplied image or the labeled synthetic factory. Image paths are skill-root relative. Add `layers` containing id/image/position/size/parallax/alpha/z and optional `foreground:true`. Background layers render before sorted actors and props; foreground layers render after, providing occlusion. Parallax factor scales the camera contribution; use 1 for ground/action-plane layers to keep contact geometry aligned.

Props can use supplied textures or built-in placeholder types: terminal, conveyor, mechanism, warning. The demo uses moving conveyor slats/boxes, rotating machinery, a warning pulse and seeded steam puffs. Their motion is a pure function of time. Custom art should match the supplied reference instead of retaining placeholder shapes.

Actors and props share explicit z ordering. Character parts have per-view near/far ordering. Contact shadows are generated on the action plane; optional lights `{position,radius,color,strength,z}` are soft radial accents inserted into the same draw order so later opaque layers occlude them. This is simple compositing, not a physical lighting/shadow solver. No texture recoloring happens in the default supplied-art pass.

Prop interaction points are local offsets. Character actions resolve those offsets to actual world goals. Attachments can bind carried props to named joints. Collision against detailed texture silhouettes, 3D perspective and automatic scene segmentation are outside the verified first version.
