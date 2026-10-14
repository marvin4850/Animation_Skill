# From language to a shot plan

Codex is the interpreter. It studies supplied reference images, preserves approved designs, lists real actors/props, resolves spatial relationships and authors the shot plan. The runtime never invokes a model or parses free prose with brittle keyword rules.

A plan includes `prompt`, `baseScene`, optional title/duration/camera, staging notes and `beats`. A beat names actor, action and optional id, duration, at/after, side, target, view, from/to and clip parameters. Without `at`, the next beat for that actor starts after its previous beat. `after` names a previously compiled beat; explicit `at` supports concurrent acting layers. Unsupported actions and invalid targets/times fail.

See `examples/talen-test/plan.json`. Start from the template scene; add measured rigs and real props before compiling. The compiler preserves actors not assigned new beats. Make actor ids/interaction points specific: `terminal.buttons`, `mechanism.fault`, not a generic unconnected arm wave.

Choose static shots for readable work, modest tracking for travel, and authored zoom for emphasis. Vertical composition needs head/hand/feet margins, room ahead of travel, and spacing that does not hide pointing hands behind a second actor. Establishing/medium/close-up are staging choices expressed with center/zoom, not special hidden modes. Avoid close-up during full-body QA where it intentionally clips feet; use a separately configured framing policy if adding such shots.

Use ambiguity notes for missing actor assignment, essential reference gaps or unavailable views. Infer minor timing and staging. Label every temporary prop/environment asset. A missing approved main-character sheet must be reported, even when a calibration choreography can run.
