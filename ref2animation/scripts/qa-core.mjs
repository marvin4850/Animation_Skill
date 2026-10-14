import { validateScene, evaluate, screenPoint } from '../runtime/timeline.mjs';
import { distance, sub, length } from '../runtime/math.mjs';

// Full frame coverage. Geometry is measured in world space, framing in screen space.
// Subjective intersections and silhouette quality still require contact-sheet review.
export function inspectScene(scene,rigs) {
  const validation=validateScene(scene,rigs),failures=[...validation.errors],warnings=[...validation.warnings];
  const metrics={frames:0,maxFootSlide:0,maxContactError:0,maxStretch:0,maxRootStep:0,maxCameraStep:0,maxJointStep:0,walkLift:0,plantedPairs:0,contacts:0};
  if(failures.length)return {passed:false,failures,warnings,metrics};
  let previous,armMotion=0,legMotion=0,views=new Set();const intersections=[];
  function fail(message){if(!failures.includes(message))failures.push(message);}
  for(let frame=0;frame<scene.duration*scene.fps;frame++) {
    const state=evaluate(scene,rigs,frame/scene.fps);metrics.frames++;
    if(state.camera.zoom<=0 || !Number.isFinite(state.camera.zoom))fail('Invalid camera zoom');
    if(previous)metrics.maxCameraStep=Math.max(metrics.maxCameraStep,distance(state.camera.center,previous.camera.center));
    for(let ai=0;ai<state.actors.length;ai++) {
      const a=state.actors[ai],old=previous?.actors[ai];views.add(a.state.view);
      const points=Object.values(a.joints).map(p=>screenPoint(scene,state.camera,p));
      if(points.some(p=>!p.every(Number.isFinite)))fail(`${a.state.id}: nonfinite joint`);
      if(points.some(p=>p[0]<30 || p[0]>scene.width-30 || p[1]<100 || p[1]>scene.height-30))fail(`${a.state.id}: important joint outside safe frame`);
      for(const [key,limb] of Object.entries(a.limbs)) {
        if(limb.error>.5)fail(`${a.state.id}: unreachable ${key} target`);
        const s=key.at(-1),names=key.startsWith('leg')?['hip','knee','ankle']:['shoulder','elbow','hand'];
        const [root,joint,end]=names.map(n=>n+s);
        const lengths=[distance(a.joints[root],a.joints[joint]),distance(a.joints[joint],a.joints[end])];
        const rest=[distance(a.rest[root],a.rest[joint]),distance(a.rest[joint],a.rest[end])];
        lengths.forEach((v,i)=>metrics.maxStretch=Math.max(metrics.maxStretch,Math.abs(v/(rest[i]*a.state.scale)-1)));
      }
      for(const s of ['L','R']) {
        const foot=a.state.feet[s],last=old?.state.feet[s];
        if(foot.position[1]>a.state.position[1]-a.state.ankleHeight*a.state.scale+.2)fail(`${a.state.id}: foot below floor`);
        if(a.state.walking)metrics.walkLift=Math.max(metrics.walkLift,(a.state.position[1]-a.state.ankleHeight*a.state.scale)-foot.position[1]);
        if(old && foot.planted && last.planted && Math.abs(foot.contact-last.contact)<1e-9) {
          metrics.plantedPairs++;metrics.maxFootSlide=Math.max(metrics.maxFootSlide,distance(a.joints['ankle'+s],old.joints['ankle'+s]));
        }
      }
      for(const target of a.state.targets) if(target.type==='press' && target.weight>.99) {
        metrics.contacts++;metrics.maxContactError=Math.max(metrics.maxContactError,distance(a.joints['hand'+target.side],target.goal));
      }
      for(const target of a.state.targets.filter(t=>t.type==='point' && t.weight>.8)) {
        for(const other of state.actors.filter(v=>v!==a)) {
          const radius=rigs[other.state.rig].parts.head.size[0]*other.state.scale/2+15*a.state.scale;
          if(distance(a.joints['hand'+target.side],other.joints.head)<radius)fail(`${a.state.id}: pointing hand occluded by ${other.state.id} head`);
        }
      }
      if(old) {
        const rootStep=distance(a.state.position,old.state.position);metrics.maxRootStep=Math.max(metrics.maxRootStep,rootStep);
        for(const [name,j] of Object.entries(a.joints)) metrics.maxJointStep=Math.max(metrics.maxJointStep,distance(j,old.joints[name]));
        const rootRelative=(pose,name)=>sub(pose.joints[name],pose.state.position);
        armMotion=Math.max(armMotion,distance(rootRelative(a,'handR'),rootRelative(old,'handR')));
        legMotion=Math.max(legMotion,distance(rootRelative(a,'kneeR'),rootRelative(old,'kneeR')));
      }
      // Hand inside torso: heuristic warning, not a collision verdict for flat artwork.
      const h=a.joints.handR,b=a.joints.torso;
      if(Math.abs(h[0]-b[0])<18*a.state.scale && h[1]>b[1] && h[1]<b[1]+70*a.state.scale)intersections.push({frame,actor:a.state.id});
    }
    previous=state;
  }
  const walkers=scene.actors.some(a=>a.clips?.some(c=>c.type==='walk'));
  const presses=scene.actors.some(a=>a.clips?.some(c=>c.type==='press'));
  if(metrics.maxFootSlide>.5)fail('Planted foot sliding exceeds 0.5 world pixels');
  if(metrics.maxStretch>1e-6)fail('Limb length changed');
  if(metrics.maxRootStep>20)fail('Abrupt root position jump');
  if(metrics.maxJointStep>35)fail('Abrupt joint position jump');
  if(metrics.maxCameraStep>18)fail('Abrupt camera jump');
  if(walkers && (metrics.walkLift<10 || legMotion<.3))fail('Walking lacks leg articulation or lift');
  if(presses && (!metrics.contacts || metrics.maxContactError>.5))fail('Terminal contacts missing or inaccurate');
  if(armMotion<.01)warnings.push('No independent arm action detected');
  if(intersections.length)warnings.push(`Potential torso/hand overlap in ${intersections.length} sampled actor frames; inspect artwork`);
  metrics.armMotion=armMotion;metrics.legMotion=legMotion;
  return {passed:failures.length===0,failures,warnings,metrics,views:[...views],intersectionSamples:intersections.slice(0,12)};
}
