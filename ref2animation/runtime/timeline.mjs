import { clamp, ease, track, lerp, add, sub, mul, distance } from './math.mjs';
import { restJoints, poseRig, validateRig } from './rig.mjs';

export const CLIPS = Object.freeze(['idle','breathing','walk','start','stop','turnHead','turnBody','lookAt',
  'raiseArm','point','reach','press','pickUp','place','lean','react','uncertain','fear','tension','hesitate']);

export function positionAt(actor,t) {
  let p=track(actor.tracks?.position,t,actor.position);
  for(const c of [...(actor.clips??[])].filter(c=>c.type==='walk').sort((a,b)=>a.start-b.start)) {
    if(t<c.start)break;p=lerp(c.from??p,c.to,walkProgress(c,t));
  }
  return p;
}
export function interaction(scene, target, t=0) {
  if (Array.isArray(target)) return target;
  const [id, name = 'default'] = String(target).split('.');
  const prop = scene.props?.find(p => p.id === id);
  if(prop?.points?.[name])return add(track(prop.tracks?.position,t,prop.position),prop.points[name]);
  const actor=scene.actors?.find(a=>a.id===id);
  if(actor?.points?.[name])return add(positionAt(actor,t),mul(actor.points[name],actor.scale??1));
  throw new Error(`Unknown interaction point: ${target}`);
}

export function validateScene(scene, rigs) {
  const errors = [], warnings = [];
  const vec = v => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);
  if (scene.version !== 1) errors.push('Scene version must be 1');
  for (const k of ['width','height','fps','duration']) if (!Number.isFinite(scene[k]) || scene[k] <= 0) errors.push(`Invalid ${k}`);
  if (!Number.isInteger(scene.width) || !Number.isInteger(scene.height) || !Number.isInteger(scene.fps)) errors.push('Resolution and fps must be integers');
  if (!Array.isArray(scene.actors) || !scene.actors.length) errors.push('Scene needs at least one actor');
  if (!Number.isInteger(scene.duration * scene.fps)) errors.push('Duration must contain a whole number of frames');
  const ids = new Set();
  for (const item of [...(scene.actors??[]),...(scene.props??[])]) {
    if (!item.id || ids.has(item.id)) errors.push(`Missing or duplicate id: ${item.id}`);
    ids.add(item.id);
    if (!vec(item.position)) errors.push(`Invalid position ${item.id}`);
  }
  function checkTrack(keys, name) {
    for (let i=0; i<(keys?.length??0); i++) {
      const key=keys[i];
      if (!Number.isFinite(key.t) || key.t < 0 || key.t > scene.duration || (i && keys[i-1].t >= key.t)) errors.push(`Invalid key time in ${name}`);
      if (key.ease) { try { ease(0.5,key.ease); } catch(e) { errors.push(e.message); } }
    }
  }
  for (const a of scene.actors??[]) {
    const rig = rigs[a.rig];
    if (!rig) { errors.push(`Missing rig ${a.rig}`); continue; }
    const vr = validateRig(rig); errors.push(...vr.errors.map(e=>`${a.id}: ${e}`)); warnings.push(...vr.warnings.map(e=>`${a.id}: ${e}`));
    if (a.scale !== undefined && (!Number.isFinite(a.scale) || a.scale <= 0)) errors.push(`Invalid scale ${a.id}`);
    Object.entries(a.tracks??{}).forEach(([k,v])=>checkTrack(v,`${a.id}.${k}`));
    for (const c of a.clips??[]) {
      if (!CLIPS.includes(c.type)) errors.push(`Unknown clip ${c.type}`);
      if (!Number.isFinite(c.start) || !Number.isFinite(c.duration) || c.start < 0 || c.duration <= 0 || c.start+c.duration > scene.duration+1e-8) errors.push(`Invalid clip timing ${c.id??c.type}`);
      if (c.type==='walk' && !vec(c.to)) errors.push(`Walk needs a destination ${c.id??a.id}`);
      if (c.type==='walk' && c.steps !== undefined && (!Number.isInteger(c.steps) || c.steps<2 || c.steps%2)) errors.push('Walk steps must be a positive even integer >= 2');
      if (['point','reach','press','pickUp','place','lookAt'].includes(c.type) && !c.target) errors.push(`${c.type} needs a target`);
      if (c.target) { try { if (!vec(interaction(scene,c.target))) errors.push('Invalid interaction point'); } catch(e) { errors.push(e.message); } }
      if (c.side && !['L','R'].includes(c.side)) errors.push(`Invalid limb side ${c.side}`);
      if (c.ease) { try { ease(.5,c.ease); } catch(e) { errors.push(e.message); } }
      if (c.type === 'turnBody' && !rig.views[c.view]) warnings.push(`${a.id}: missing view ${c.view}; retaining available artwork`);
    }
    const walks=(a.clips??[]).filter(c=>c.type==='walk').sort((a,b)=>a.start-b.start);
    walks.slice(1).forEach((c,i)=>{if(c.start<walks[i].start+walks[i].duration) errors.push(`Overlapping locomotion ${a.id}`);});
  }
  Object.entries(scene.camera?.tracks??{}).forEach(([k,v])=>checkTrack(v,`camera.${k}`));
  if (scene.camera?.follow && !scene.actors?.some(a=>a.id===scene.camera.follow)) errors.push('Camera follows a missing actor');
  for (const a of scene.attachments??[]) {
    if (!scene.props?.some(p=>p.id===a.prop) || !scene.actors?.some(p=>p.id===a.actor)) errors.push('Unknown prop/actor attachment');
    if (!Number.isFinite(a.start) || !Number.isFinite(a.end) || a.start<0 || a.end<=a.start || a.end>scene.duration) errors.push('Invalid attachment time');
  }
  return { errors, warnings: [...new Set(warnings)] };
}

function envelope(c,t) {
  const local = t-c.start, fadeIn=Math.min(c.blendIn??.3,c.duration/2), fadeOut=Math.min(c.blendOut??.3,c.duration/2);
  if (local<0) return 0;
  if (local>=c.duration) return c.hold ? 1 : 0;
  return (fadeIn ? ease(local/fadeIn,c.ease) : 1) * (c.hold || !fadeOut ? 1 : ease((c.duration-local)/fadeOut,c.ease));
}

function walkProgress(c,t) { return ease((t-c.start)/c.duration,c.ease??'smooth'); }

// Explicit world-space contacts, computed from a motion segment without history.
// Swing intervals alternate. Both feet settle at authored end positions before the segment ends.
export function walkFeet(c,t,from,scale=1,gait={}) {
  const u=walkProgress(c,t), d=sub(c.to,from), span=distance(from,c.to);
  const half=gait.stanceHalf??22,ankle=gait.ankleHeight??12;
  const n=c.steps??Math.max(2,2*Math.ceil(span/(2*(gait.stepLength??50)*scale)));
  const dir=span>1e-8 ? mul(d,1/span) : [1,0];
  const result={};
  for (const [side,index] of [['L',0],['R',1]]) {
    let last=add(from,[-half*scale*(side==='L'?1:-1),-ankle*scale]);
    const steps=[];
    for(let i=index;i<n;i+=2) {
      const a=i/n,b=(i+1)/n;
      // Final two contacts land at rest; previous landings lead the pelvis slightly.
      const center=lerp(from,c.to,Math.min(1,b+.5/n));
      const next=i>=n-2 ? add(c.to,[-half*scale*(side==='L'?1:-1),-ankle*scale]) : add(center,[0,-ankle*scale]);
      steps.push({a,b,from:last,to:next}); last=next;
    }
    let pos=steps[0].from, planted=true, contact=0;
    for(const s of steps) {
      if(u<s.a) break;
      if(u>=s.b) {pos=s.to; contact=s.b; continue;}
      const v=(u-s.a)/(s.b-s.a);
      pos=lerp(s.from,s.to,ease(v,'smoother'));
      pos[1]-=(c.lift??gait.lift??30)*scale*Math.sin(Math.PI*v)**2;
      planted=false; contact=s.b; break;
    }
    result[side]={position:pos,planted,contact};
  }
  return result;
}

export function actorState(scene,a,rig,t) {
  const scale=a.scale??1, rest=restJoints(rig), tracks=a.tracks??{};
  const gait={stanceHalf:Math.abs(rest.hipR[0]-rest.hipL[0])*.8,ankleHeight:-rest.ankleR[1],stepLength:distance(rest.hipR,rest.ankleR)*.27,...rig.gait};
  let position=track(tracks.position,t,a.position), feet;
  const ordered=[...(a.clips??[])].sort((a,b)=>a.start-b.start);
  let walking=null;
  for(const c of ordered.filter(c=>c.type==='walk')) {
    const from=c.from??position;
    if(t<c.start) break;
    position=lerp(from,c.to,walkProgress(c,t)); feet=walkFeet(c,t,from,scale,gait);
    if(t<c.start+c.duration) walking=c;
  }
  if(!feet) feet=Object.fromEntries(['L','R'].map(s=>[s,{position:add(position,[(s==='L'?-gait.stanceHalf:gait.stanceHalf)*scale,-gait.ankleHeight*scale]),planted:true,contact:0}]));
  const state={id:a.id,rig:a.rig,scale,position,feet,view:a.view??Object.keys(rig.views)[0],
    expression:track(tracks.expression,t,'neutral'),facing:track(tracks.facing,t,a.facing??1),
    lean:track(tracks.lean,t,0),headAngle:track(tracks.headAngle,t,0),viewMix:null,hands:{},targets:[],walking:!!walking,ankleHeight:gait.ankleHeight};
  const shoulder=s=>add(position,mul(rest['shoulder'+s],scale));
  const armRatio=s=>(distance(rest['shoulder'+s],rest['elbow'+s])+distance(rest['elbow'+s],rest['hand'+s]))/152;
  const handRest=s=>add(shoulder(s),mul(rig.armRest?.[s]??sub(rest['hand'+s],rest['shoulder'+s]),scale));
  for(const s of ['L','R']) state.hands[s]=track(tracks['hand'+s],t,handRest(s));
  for(const c of ordered) {
    const w=envelope(c,t)*(c.intensity??1), side=c.side??'R', local=t-c.start;
    if(c.type==='turnBody' && t>=c.start) {
      if(rig.views[c.view]) {
        const previous=state.view; state.view=c.view;
        state.viewMix={from:previous,to:c.view,weight:ease(local/c.duration,c.ease)};
      }
      if(c.facing) state.facing=c.facing;
    }
    if(!w || c.type==='walk' || c.type==='turnBody') continue;
    const intensity=c.intensity??1;
    if(['idle','breathing'].includes(c.type)) state.lean+=.008*Math.sin(local*(c.speed??1)*2.2)*w;
    else if(['start','stop','lean'].includes(c.type)) state.lean+=(c.angle??.08)*w;
    else if(['react','uncertain','fear','tension','hesitate'].includes(c.type)) {
      state.lean+=(c.type==='react'?-.08:.06)*w;
      state.headAngle+=(c.type==='uncertain'?.12:.025*Math.sin(local*9))*w;
      for(const s of ['L','R']) state.hands[s]=lerp(state.hands[s],add(shoulder(s),[(s==='L'?-1:1)*32*scale,95*scale]),w);
    } else if(c.type==='turnHead') state.headAngle=lerp(state.headAngle,c.angle??.2,w);
    else if(c.type==='lookAt') {
      const goal=interaction(scene,c.target,t), h=add(position,mul(rest.head,scale));
      state.headAngle=lerp(state.headAngle,clamp(Math.atan2(goal[1]-h[1],Math.abs(goal[0]-h[0])),-.4,.4),w);
    } else if(['raiseArm','point','reach','press','pickUp','place'].includes(c.type)) {
      const target=c.target?interaction(scene,c.target,t):add(shoulder(side),[(c.direction??state.facing)*110*scale*armRatio(side),-50*scale*armRatio(side)]);
      let goal=c.fromTarget ? lerp(interaction(scene,c.fromTarget,c.start),target,ease(local/c.duration,c.ease)) : target;
      if(c.type==='press') goal=add(target,[-(c.depth??7)*Math.sin(Math.PI*local*(c.speed??2))**2,0]);
      if(c.type==='point') {const v=sub(target,shoulder(side));goal=add(shoulder(side),mul(v,Math.min(1,148*scale*armRatio(side)/Math.hypot(...v))));}
      if(c.type==='pickUp') goal=add(target,[0,-(c.height??45)*ease(local/c.duration)]);
      if(c.type==='place') goal=add(target,[0,-(c.height??45)*(1-ease(local/c.duration))]);
      state.hands[side]=lerp(state.hands[side],goal,clamp(w));
      if(c.target) state.targets.push({clip:c.id??c.type,type:c.type,side,point:target,goal,weight:clamp(w)});
    }
    // The intensity controls pose blending; limb lengths are never multiplied by it.
    void intensity;
  }
  if(walking) {
    const phase=walkProgress(walking,t)*(walking.steps??6)*Math.PI;
    for(const s of ['L','R']) if(!state.targets.some(q=>q.side===s && q.weight>.2)) {
      state.hands[s]=add(state.hands[s],[Math.sin(phase+(s==='L'?0:Math.PI))*22*scale,0]);
    }
  }
  return state;
}

export function evaluate(scene,rigs,time) {
  const t=clamp(time,0,scene.duration), actors=scene.actors.map(a=>poseRig(rigs[a.rig],actorState(scene,a,rigs[a.rig],t)));
  const cam=scene.camera??{}, ctracks=cam.tracks??{};
  let center=track(ctracks.center,t,cam.center??[scene.width/2,scene.height/2]);
  if(cam.follow) {
    const actor=actors.find(a=>a.state.id===cam.follow);
    const follow=add(actor.state.position,cam.offset??[0,-300]);
    // Authored response is a time curve, not a history-dependent camera spring.
    center=lerp(center,follow,track(ctracks.followWeight,t,cam.followWeight??1));
  }
  const camera={center,zoom:track(ctracks.zoom,t,cam.zoom??1)};
  const props=(scene.props??[]).map(p=>({...p,position:track(p.tracks?.position,t,p.position)}));
  for(const attachment of scene.attachments??[]) if(t>=attachment.start && t<attachment.end) {
    const prop=props.find(p=>p.id===attachment.prop),actor=actors.find(p=>p.state.id===attachment.actor);
    if(!actor.joints[attachment.joint]) throw new Error(`Unknown attachment joint ${attachment.joint}`);
    prop.position=add(actor.joints[attachment.joint],attachment.offset??[0,0]);
  }
  const transition=(scene.transitions??[]).find(c=>t>=c.start && t<c.start+c.duration);
  const fade=transition?Math.sin(Math.PI*clamp((t-transition.start)/transition.duration))**2:0;
  return {t,frame:Math.min(Math.floor(t*scene.fps+1e-7),scene.duration*scene.fps-1),actors,props,camera,fade};
}

export function atFrame(scene,rigs,frame) {
  if(!Number.isInteger(frame) || frame<0 || frame>=scene.duration*scene.fps) throw new Error('Frame outside timeline');
  return evaluate(scene,rigs,frame/scene.fps);
}
export function screenPoint(scene,camera,p,parallax=1) {
  return [(p[0]-camera.center[0]*parallax)*camera.zoom+scene.width/2,
    (p[1]-camera.center[1]*parallax)*camera.zoom+scene.height/2];
}
