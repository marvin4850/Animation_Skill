import { add, sub, mul, length, distance, rotate, clamp } from './math.mjs';

// Analytic planar IK: fixed segment lengths, explicit bend sign and elbow/knee bounds.
// Unreachable goals are projected onto the allowed annulus, never stretched.
export function solveIK(root, target, l1, l2, bend = 1, limits = [0.025, 2.65]) {
  if (![...root, ...target, l1, l2, bend, ...limits].every(Number.isFinite) || l1 <= 0 || l2 <= 0)
    throw new Error('IK requires finite coordinates and positive lengths');
  if (limits[0] < 0 || limits[1] > Math.PI || limits[0] > limits[1]) throw new Error('Invalid IK constraints');
  const d = sub(target, root), raw = length(d);
  const lo = Math.sqrt(l1*l1 + l2*l2 + 2*l1*l2*Math.cos(limits[1]));
  const hi = Math.sqrt(l1*l1 + l2*l2 + 2*l1*l2*Math.cos(limits[0]));
  const reach = clamp(raw, Math.max(lo, 1e-6), hi), dir = raw > 1e-9 ? mul(d, 1/raw) : [0, 1];
  const end = add(root, mul(dir, reach));
  const a = Math.acos(clamp((l1*l1 + reach*reach - l2*l2)/(2*l1*reach), -1, 1));
  const joint = add(root, mul(rotate(dir, Math.sign(bend || 1)*a), l1));
  return { root, joint, end, error: distance(end, target), bend: Math.sign(bend || 1) };
}

export function restJoints(rig) {
  const result = {}, visiting = new Set();
  function resolve(name) {
    if (result[name]) return result[name];
    const j = rig.joints[name];
    if (!j) throw new Error(`Missing joint ${name}`);
    if (visiting.has(name)) throw new Error(`Parent cycle at ${name}`);
    visiting.add(name);
    result[name] = add(j.parent ? resolve(j.parent) : [0, 0], j.offset);
    visiting.delete(name); return result[name];
  }
  Object.keys(rig.joints).forEach(resolve);
  return result;
}

export function validateRig(rig) {
  const errors = [], warnings = [];
  let rest;
  try { rest = restJoints(rig); } catch (e) { return { errors: [e.message], warnings }; }
  for (const [name, j] of Object.entries(rig.joints)) {
    if (!Array.isArray(j.offset) || j.offset.length !== 2 || !j.offset.every(Number.isFinite)) errors.push(`Invalid offset ${name}`);
    if (j.limits && (j.limits.length !== 2 || j.limits[0] < 0 || j.limits[1] > Math.PI || j.limits[0] > j.limits[1])) errors.push(`Invalid limits ${name}`);
  }
  for (const side of ['L', 'R']) for (const j of ['hip', 'knee', 'ankle', 'shoulder', 'elbow', 'hand'])
    if (!rest[j + side]) errors.push(`Missing joint ${j + side}`);
  for (const name of ['pelvis', 'torso', 'neck', 'head']) if (!rest[name]) errors.push(`Missing joint ${name}`);
  for (const [name, part] of Object.entries(rig.parts ?? {})) {
    if (!rest[part.from] || (part.to && !rest[part.to])) errors.push(`Unknown attachment in ${name}`);
    if (!Number.isFinite(part.z)) errors.push(`Missing layer z in ${name}`);
    if (!part.size?.every(v => Number.isFinite(v) && v > 0)) errors.push(`Invalid size ${name}`);
    if (!part.pivot || part.pivot.some((v,i) => !Number.isFinite(v) || v < 0 || v > part.size[i])) errors.push(`Pivot outside part ${name}`);
    if (part.to && distance(rest[part.from], rest[part.to]) < 1e-5) errors.push(`Zero bone ${name}`);
  }
  for (const name of ['head','neck','torso','pelvis','thighL','thighR','shinL','shinR','footL','footR','upperArmL','upperArmR','forearmL','forearmR','handL','handR'])
    if (!rig.parts?.[name]) errors.push(`Missing body part ${name}`);
  if (!rig.views || !Object.keys(rig.views).length) errors.push('No artwork views');
  for(const [view,definition] of Object.entries(rig.views??{})) {
    for(const [back,front] of definition.layerRules??rig.layerRules??[]) {
      const b={...rig.parts?.[back],...definition.parts?.[back]},f={...rig.parts?.[front],...definition.parts?.[front]};
      if(!Number.isFinite(b.z)||!Number.isFinite(f.z)||b.z>=f.z)errors.push(`Incorrect layer order ${view}: ${back} before ${front}`);
    }
  }
  for(const [upper,lower] of [['head','neck'],['neck','torso'],['torso','pelvis']]) {
    const u=rig.parts?.[upper],l=rig.parts?.[lower];
    if(u?.size && u?.pivot && l?.size && l?.pivot && rest[u.from] && rest[l.from]) {
      const bottom=rest[u.from][1]+u.size[1]-u.pivot[1],top=rest[l.from][1]-l.pivot[1];
      if(top-bottom>1)errors.push(`Rest-pose joint gap ${upper}/${lower}: ${(top-bottom).toFixed(1)} px`);
    }
  }
  if (rig.placeholder) warnings.push('Synthetic test puppet; supplied character artwork has not been validated');
  return { errors, warnings };
}

export function poseRig(rig, state) {
  const rest = restJoints(rig), scale = state.scale ?? 1;
  const pelvis = add(state.position, mul(rest.pelvis, scale));
  const joints = {};
  // Torso/head hierarchy follows authored local rotations; pelvis stays on planted feet.
  function joint(name) {
    if (joints[name]) return joints[name];
    const j = rig.joints[name];
    const parent = j.parent ? joint(j.parent) : state.position;
    const angle = name === 'head' || name === 'neck' ? state.lean : (j.parent === 'pelvis' || j.parent === 'torso' ? state.lean : 0);
    joints[name] = add(parent, rotate(mul(j.offset, scale), angle ?? 0)); return joints[name];
  }
  Object.keys(rest).forEach(joint); joints.pelvis = pelvis;
  const limbs = {};
  for (const side of ['L', 'R']) for (const type of ['leg', 'arm']) {
    const names = type === 'leg' ? ['hip','knee','ankle'] : ['shoulder','elbow','hand'];
    const [r, j, e] = names.map(n => n + side);
    const target = type === 'leg' ? state.feet[side].position : state.hands[side];
    const sol = solveIK(joints[r], target, distance(rest[r],rest[j])*scale, distance(rest[j],rest[e])*scale,
      rig.joints[j].bend ?? (type === 'leg' ? -(state.facing ?? 1) : (state.facing ?? 1)), rig.joints[j].limits ?? [0.025,2.65]);
    joints[j] = sol.joint; joints[e] = sol.end; limbs[type + side] = sol;
  }
  return { joints, limbs, rest, state };
}
