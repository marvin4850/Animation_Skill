import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { options,ROOT } from './common.mjs';
import { CLIPS,validateScene } from '../runtime/timeline.mjs';

const defaultDurations={idle:2,breathing:2,walk:3,start:.5,stop:.7,turnHead:.8,turnBody:1,lookAt:1,
  raiseArm:1.5,point:2,reach:1.5,press:2,pickUp:1.5,place:1.5,lean:1,react:1,uncertain:2,fear:2,tension:2,hesitate:1.5};

// Codex interprets language and creates the plan. This compiler validates and stages it locally.
// No paid API, generated prose parser or invented language comprehension dependency.
export function direct(base,plan) {
  const scene=structuredClone(base),cursor={};
  scene.direction={prompt:plan.prompt??'',notes:plan.notes??[],source:'Codex-authored structured shot plan'};
  if(plan.title)scene.title=plan.title;
  if(plan.camera)scene.camera=structuredClone(plan.camera);
  if(plan.duration)scene.duration=plan.duration;
  const assigned=new Set();
  for(const [i,beat] of (plan.beats??[]).entries()) {
    const actor=scene.actors.find(a=>a.id===beat.actor);if(!actor)throw new Error(`Unknown actor ${beat.actor}`);
    if(!CLIPS.includes(beat.action))throw new Error(`Unknown action ${beat.action}`);
    if(!assigned.has(actor.id)){actor.clips=[];assigned.add(actor.id);}
    const {actor:_,action,at,after,...params}=beat;
    let start=at??cursor[actor.id]??0;
    if(after){const previous=scene.actors.flatMap(a=>a.clips??[]).find(c=>c.id===after);if(!previous)throw new Error(`Unknown preceding beat ${after}`);start=previous.start+previous.duration;}
    const duration=params.duration??defaultDurations[action],id=params.id??`${actor.id}-${action}-${i}`;
    actor.clips.push({...params,id,type:action,start,duration});
    cursor[actor.id]=start+duration;
  }
  return scene;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const opt=options();if(!opt.plan||!opt.out)throw new Error('director.mjs --plan plan.json --out examples/name/scene.json');
  const plan=JSON.parse(await fs.readFile(path.resolve(opt.plan),'utf8'));
  const base=JSON.parse(await fs.readFile(path.resolve(ROOT,plan.baseScene??'examples/talen-test/scene.json'),'utf8'));
  const scene=direct(base,plan),rigs={};for(const [id,p] of Object.entries(scene.rigs))rigs[id]=JSON.parse(await fs.readFile(path.join(ROOT,p),'utf8'));
  const check=validateScene(scene,rigs);if(check.errors.length)throw new Error(check.errors.join('\n'));
  const out=path.resolve(opt.out);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(scene,null,2)+'\n',{flag:'wx'});
  console.log(`Wrote ${out}; ${plan.beats.length} staged actions. Run scripts/qa.mjs --scene <path-relative-to-skill>.`);
}
