import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import { openScene,ROOT,writePNG } from './common.mjs';
const out=path.join(ROOT,'output/browsercheck');await fs.mkdir(out,{recursive:true});
const src=JSON.parse(await fs.readFile(path.join(ROOT,'examples/talen-test/scene.json'),'utf8'));
const scenePath='output/browsercheck/scene.json';await fs.writeFile(path.join(ROOT,scenePath),JSON.stringify(src));
const app=await openScene(scenePath),checks=[];
try {
  const p=app.page;await p.goto(app.host.url+'/runtime/index.html?scene='+encodeURIComponent(scenePath));
  await p.waitForFunction(()=>window.__ready);
  await p.locator('#frame').fill('240');await p.locator('#frame').dispatchEvent('change');
  assert.match(await p.locator('#clock').textContent(),/frame 240/);checks.push('UI seeks to frame 240');
  await p.locator('#play').click();await p.waitForTimeout(350);await p.locator('#play').click();
  const paused=await p.locator('#frame').inputValue();assert.ok(+paused>240);await p.waitForTimeout(150);
  assert.equal(await p.locator('#frame').inputValue(),paused);checks.push('Play advances; pause retains frame');
  await p.locator('#overlay').check();await p.locator('#guides').check();
  assert.equal(await p.locator('#safe').isVisible(),true);checks.push('Rig and safe-guide overlays enabled');
  await p.locator('#aspect').selectOption('square');assert.equal(await p.locator('#stage').evaluate(e=>e.style.aspectRatio),'1 / 1');checks.push('Aspect workspace selectable');
  src.title='Reloaded calibration scene';await fs.writeFile(path.join(ROOT,scenePath),JSON.stringify(src));
  await p.waitForFunction(()=>document.getElementById('title').textContent==='Reloaded calibration scene',null,{timeout:10000});
  assert.equal(await p.locator('#frame').inputValue(),paused);checks.push('Scene hot reload retains paused frame');
  await p.screenshot({path:path.join(out,'preview.png')});
  const encoded=await p.evaluate(()=>window.__renderFrame(240));await p.locator('#overlay').uncheck();
  assert.equal(await p.evaluate(()=>window.__renderFrame(240)),encoded);checks.push('Export ignores UI overlays');
  await writePNG(path.join(out,'seek-240.png'),encoded);
  // Real supplied-art path, distinct from code-drawn calibration textures.
  const art='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect x="3" y="3" width="26" height="26" rx="6" fill="#ff0099" fill-opacity="0.5"/></svg>';
  await fs.writeFile(path.join(out,'part.svg'),art);
  const rig=JSON.parse(await fs.readFile(path.join(ROOT,'examples/talen-test/worker.rig.json'),'utf8'));
  rig.placeholder=false;for(const part of Object.values(rig.parts))part.image='output/browsercheck/part.svg';
  await fs.writeFile(path.join(out,'art.rig.json'),JSON.stringify(rig));
  src.rigs.worker='output/browsercheck/art.rig.json';await fs.writeFile(path.join(ROOT,scenePath),JSON.stringify(src));
  await p.evaluate(()=>window.__reload());assert.equal(await fs.readFile(path.join(out,'part.svg'),'utf8'),art);
  await writePNG(path.join(out,'supplied-art.png'),await p.evaluate(()=>window.__renderFrame(30,{transparent:true})));
  checks.push('External artwork loads with alpha; source bytes preserved');
  assert.equal(app.errors.length,0,app.errors.join('\n'));
}finally {await app.close();}
// A missing texture must fail; no silent replacement with a different character.
const bad=structuredClone(src);bad.background.image='output/browsercheck/missing.png';await fs.writeFile(path.join(out,'missing-scene.json'),JSON.stringify(bad));
let rejected=false;try {const a=await openScene('output/browsercheck/missing-scene.json');await a.close();}catch(e){rejected=/failed to load/.test(e.message);}
assert.equal(rejected,true);checks.push('Missing artwork is a hard failure');
await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,checks},null,2)+'\n');console.log(JSON.stringify({passed:true,checks},null,2));
