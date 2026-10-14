import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import { direct } from '../scripts/director.mjs';import { revise } from '../scripts/revise.mjs';
const scene=JSON.parse(fs.readFileSync(new URL('../examples/talen-test/scene.json',import.meta.url)));
test('direction stages sequential and concurrent actions without touching other actors',()=>{
  const plan={prompt:'Operate a terminal, turn, then walk.',beats:[{actor:'Talen',action:'reach',target:'terminal.buttons',duration:2,id:'reach'},
    {actor:'Talen',action:'press',target:'terminal.buttons',duration:2,id:'press'},
    {actor:'Talen',action:'turnBody',view:'side',duration:1.5,after:'press'},
    {actor:'Talen',action:'walk',at:5.5,duration:3.5,to:[730,1490]}]};
  const s=direct(scene,plan);assert.deepEqual(s.actors[0].clips.map(c=>c.start),[0,2,4,5.5]);
  assert.deepEqual(s.actors[1],scene.actors[1]);assert.notEqual(s,scene);assert.equal(s.direction.prompt,plan.prompt);
});
test('revision preserves unrelated clips and provides a conservative affected range',()=>{
  const result=revise(scene,{actor:'Talen',clip:'raise',expected:{blendIn:1.6},set:{blendIn:1.8}});
  assert.deepEqual(result.affectedFrames,[0,60]);
  assert.deepEqual(result.scene.actors[1],scene.actors[1]);
  assert.deepEqual(result.scene.actors[0].clips.filter(c=>c.id!=='raise'),scene.actors[0].clips.filter(c=>c.id!=='raise'));
  assert.equal(scene.actors[0].clips[1].blendIn,1.6);
  assert.throws(()=>revise(scene,{actor:'Talen',clip:'raise',expected:{blendIn:0},set:{blendIn:1.8}}));
});
