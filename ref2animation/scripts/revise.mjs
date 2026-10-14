import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { options,ROOT } from './common.mjs';
import { validateScene } from '../runtime/timeline.mjs';
export function revise(source,patch) {
  const scene=structuredClone(source),actor=scene.actors.find(a=>a.id===patch.actor);
  const clip=actor?.clips?.find(c=>c.id===patch.clip);if(!clip)throw new Error('Revision selector matched no clip');
  for(const [key,value] of Object.entries(patch.expected??{}))if(JSON.stringify(clip[key])!==JSON.stringify(value))throw new Error(`Revision conflict in ${key}`);
  if(Object.keys(patch.set??{}).some(k=>['id','type'].includes(k)))throw new Error('Revision keeps clip identity and type');
  const before=structuredClone(clip);Object.assign(clip,patch.set);
  const downstream=['walk','turnBody'].includes(clip.type)||before.hold||clip.hold;
  return {scene,affectedFrames:[Math.max(0,Math.floor(Math.min(before.start,clip.start)*scene.fps)),
    Math.min(scene.duration*scene.fps,Math.ceil((downstream?scene.duration:Math.max(before.start+before.duration,clip.start+clip.duration))*scene.fps))]};
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const opt=options();if(!opt.scene||!opt.patch||!opt.out)throw new Error('revise.mjs --scene path --patch patch.json --out path');
  const source=JSON.parse(await fs.readFile(path.join(ROOT,opt.scene),'utf8')),patch=JSON.parse(await fs.readFile(path.resolve(opt.patch),'utf8'));
  const result=revise(source,patch),rigs={};for(const [id,p] of Object.entries(result.scene.rigs))rigs[id]=JSON.parse(await fs.readFile(path.join(ROOT,p),'utf8'));
  const check=validateScene(result.scene,rigs);if(check.errors.length)throw new Error(check.errors.join('\n'));
  const out=path.resolve(opt.out);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(result.scene,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({out,affectedFrames:result.affectedFrames,render:`node scripts/render.mjs sequence --scene ${path.relative(ROOT,out).split(path.sep).join('/')} --from ${result.affectedFrames[0]} --to ${result.affectedFrames[1]} --out output/revised`}));
}
