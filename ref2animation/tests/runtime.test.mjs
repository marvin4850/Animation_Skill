import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { solveIK,validateRig } from '../runtime/rig.mjs';
import { evaluate,atFrame,CLIPS,validateScene } from '../runtime/timeline.mjs';
import { distance,track } from '../runtime/math.mjs';
import { inspectScene } from '../scripts/qa-core.mjs';
const scene=JSON.parse(fs.readFileSync(new URL('../examples/talen-test/scene.json',import.meta.url)));
const rigs={worker:JSON.parse(fs.readFileSync(new URL('../examples/talen-test/worker.rig.json',import.meta.url)))};

test('IK preserves both lengths for reachable, unreachable, coincident and asymmetric goals',()=>{
  for(const lengths of [[80,72],[120,40],[48,96]])for(const target of [[30,75],[1000,0],[0,0],[-50,-70]])for(const bend of [-1,1]){
    const r=solveIK([0,0],target,...lengths,bend,[.1,2.3]);
    assert.ok(Math.abs(distance(r.root,r.joint)-lengths[0])<1e-6);
    assert.ok(Math.abs(distance(r.joint,r.end)-lengths[1])<1e-6);
    assert.ok(Number.isFinite(r.error));
    const reach=distance(r.root,r.end),angle=Math.acos(Math.max(-1,Math.min(1,(reach**2-lengths[0]**2-lengths[1]**2)/(2*lengths[0]*lengths[1]))));
    assert.ok(angle>=.1-1e-6 && angle<=2.3+1e-6);
  }
});
test('IK rejects invalid constraints rather than corrupting a frame',()=>{
  assert.throws(()=>solveIK([0,0],[1,1],0,20));
  assert.throws(()=>solveIK([0,0],[1,1],20,20,1,[2,1]));
});
test('frame 240 is independent of previous evaluations and input data stays immutable',()=>{
  const before=JSON.stringify({scene,rigs}),direct=atFrame(scene,rigs,240);
  for(let i=0;i<=240;i++)evaluate(scene,rigs,i/30);
  assert.deepEqual(atFrame(scene,rigs,240),direct);
  evaluate(scene,rigs,11);evaluate(scene,rigs,0);
  assert.deepEqual(atFrame(scene,rigs,240),direct);
  assert.equal(JSON.stringify({scene,rigs}),before);
  assert.throws(()=>atFrame(scene,rigs,360));
});
test('calibration choreography has planted feet, accurate contacts and articulated limbs at all 360 frames',()=>{
  const r=inspectScene(scene,rigs);assert.equal(r.passed,true,JSON.stringify(r));
  assert.equal(r.metrics.frames,360);assert.ok(r.metrics.plantedPairs>200);
  assert.ok(r.metrics.maxFootSlide<1e-6);assert.ok(r.metrics.contacts>40);
  assert.ok(r.metrics.maxContactError<1e-6);assert.ok(r.metrics.walkLift>25);
  assert.ok(r.metrics.armMotion>1 && r.metrics.legMotion>1);
});
test('QA catches a root jump and unreachable hand target',()=>{
  const bad=structuredClone(scene);bad.actors[0].clips.find(c=>c.type==='press').target=[10000,0];
  bad.actors[0].tracks.position=[{t:0,value:[300,1490]},{t:1,value:[600,1490],ease:'hold'}];
  const r=inspectScene(bad,rigs);assert.equal(r.passed,false);
  assert.ok(r.failures.some(f=>f.includes('unreachable')));assert.ok(r.failures.some(f=>f.includes('jump')));
});
test('QA catches a second character covering the pointing hand',()=>{
  const bad=structuredClone(scene);bad.actors[1].position=[900,1490];
  assert.ok(inspectScene(bad,rigs).failures.some(f=>f.includes('pointing hand occluded')));
});
test('QA catches an excessive stride that causes clamped, sliding feet',()=>{
  const bad=structuredClone(scene);bad.actors[0].clips.find(c=>c.type==='walk').steps=2;
  const r=inspectScene(bad,rigs);assert.equal(r.passed,false);assert.ok(r.failures.some(f=>f.includes('unreachable')));assert.ok(r.metrics.maxFootSlide>.5);
});
test('missing part, bad pivot and parent cycles are rejected before rendering',()=>{
  let bad=structuredClone(rigs.worker);delete bad.parts.head;assert.ok(validateRig(bad).errors.some(e=>e.includes('Missing body part head')));
  bad=structuredClone(rigs.worker);bad.parts.head.pivot=[1000,0];assert.ok(validateRig(bad).errors.some(e=>e.includes('Pivot outside')));
  bad=structuredClone(rigs.worker);bad.joints.pelvis.parent='head';assert.ok(validateRig(bad).errors.some(e=>e.includes('cycle')));
  bad=structuredClone(rigs.worker);bad.joints.neck.offset=[0,-95];assert.ok(validateRig(bad).errors.some(e=>e.includes('joint gap')));
  bad=structuredClone(rigs.worker);bad.parts.upperArmR.z=0;assert.ok(validateRig(bad).errors.some(e=>e.includes('layer order')));
});
test('every library clip evaluates with stable finite geometry on an independent rig instance',()=>{
  for(const type of CLIPS){
    const s=structuredClone(scene);s.actors=s.actors.slice(0,1);s.camera.follow='Talen';
    s.actors[0].clips=[{type,start:0,duration:4,target:'terminal.buttons',to:[410,1490],view:'back',side:'L',steps:4}];
    assert.equal(validateScene(s,rigs).errors.length,0);
    for(const t of [0,.5,1,2,3.9,4,8]) {
      const result=evaluate(s,rigs,t);assert.ok(Object.values(result.actors[0].joints).flat().every(Number.isFinite),type);
    }
  }
});
test('view transitions use alternate assets; a missing view is reported and retains the current artwork',()=>{
  const s=structuredClone(scene);s.actors[0].clips=[{type:'turnBody',start:0,duration:2,view:'back'}];
  const a=evaluate(s,rigs,1).actors[0].state;assert.equal(a.view,'back');assert.equal(a.viewMix.from,'three-quarter');assert.equal(a.viewMix.weight,.5);
  s.actors[0].clips[0].view='nonexistent';assert.ok(validateScene(s,rigs).warnings.some(w=>w.includes('missing view')));
  assert.equal(evaluate(s,rigs,1).actors[0].state.view,'three-quarter');
});
test('keyframe easing and held discrete values obey authored time boundaries',()=>{
  assert.equal(track([{t:0,value:0},{t:2,value:10,ease:'linear'}],1),5);
  assert.equal(track([{t:0,value:'front'},{t:2,value:'back'}],1),'front');
  assert.equal(track([{t:0,value:'front'},{t:2,value:'back'}],2),'back');
});
test('prop attachments follow a hand only within their time interval',()=>{
  const s=structuredClone(scene);s.attachments=[{prop:'warning',actor:'Talen',joint:'handR',start:1,end:3,offset:[1,2]}];
  const r=evaluate(s,rigs,2),hand=r.actors[0].joints.handR;
  assert.deepEqual(r.props.find(p=>p.id==='warning').position,[hand[0]+1,hand[1]+2]);
  assert.deepEqual(evaluate(s,rigs,4).props.find(p=>p.id==='warning').position,[1090,1010]);
});
test('interaction goals follow moving props and named points on other actors',()=>{
  const s=structuredClone(scene);s.props[0].tracks={position:[{t:0,value:[415,1220]},{t:4,value:[435,1220],ease:'linear'}]};
  let a=evaluate(s,rigs,3).actors[0];assert.deepEqual(a.state.targets.find(t=>t.type==='press').point,[430,1220]);
  s.actors[1].points={button:[-400,-270]};s.actors[0].clips=[{type:'reach',start:0,duration:12,target:'Marek.button'}];
  a=evaluate(s,rigs,1).actors[0];assert.deepEqual(a.state.targets[0].point,[582,1241.6]);
});
