import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { options, ROOT, openScene, writePNG, runtimeConfig } from './common.mjs';
import { inspectScene } from './qa-core.mjs';
const opt=options(),scenePath=opt.scene??'examples/talen-test/scene.json',out=path.resolve(opt.out??path.join(ROOT,'output/qa'));
await fs.mkdir(out,{recursive:true});
const scene=JSON.parse(await fs.readFile(path.join(ROOT,scenePath),'utf8')),rigs={};
for(const [k,p] of Object.entries(scene.rigs))rigs[k]=JSON.parse(await fs.readFile(path.join(ROOT,p),'utf8'));
const report=inspectScene(scene,rigs);report.generatedAt=new Date().toISOString();report.scene=scenePath;
report.sceneSha256=createHash('sha256').update(JSON.stringify(scene)).digest('hex');
await fs.writeFile(path.join(out,'report.json'),JSON.stringify({...report,status:'running'},null,2)+'\n');
let app;
try {app=await openScene(scenePath);}catch(e){
  report.failures.push('Browser startup: '+e.message);report.passed=false;report.status='failed';
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.error(e.message);process.exit(2);
}
try {
  const n=scene.duration*scene.fps,samples=[...new Set([0,Math.floor(n*.125),Math.floor(n*.25),Math.floor(n*.375),Math.floor(n*.5),Math.floor(n*.625),Math.floor(n*.75),Math.floor(n*.875),n-1])];
  report.determinism=[];
  for(const frame of samples) {
    const a=await app.page.evaluate(f=>window.__renderFrame(f),frame);
    await app.page.evaluate(f=>window.__renderFrame(f),Math.max(0,n-frame-1));
    const b=await app.page.evaluate(f=>window.__renderFrame(f),frame);
    if(a!==b)report.failures.push(`Nondeterministic rendered frame ${frame}`);
    report.determinism.push({frame,identical:a===b});
    await writePNG(path.join(out,`frame-${String(frame).padStart(4,'0')}.png`),b);
  }
  const target=Math.min(240,n-1),direct=await app.page.evaluate(f=>window.__renderFrame(f),target);
  // Real sequential rendering from zero, then compare pixels against a direct seek.
  const sequential=await app.page.evaluate(target=>{let result;for(let f=0;f<=target;f++)result=window.__renderFrame(f);return result;},target);
  report.directVsSequential={frame:target,identical:direct===sequential,renderedFrames:target+1};
  if(direct!==sequential)report.failures.push('Direct/sequential pixel mismatch');
  const stat=await app.page.evaluate(()=>{const c=document.getElementById('c'),copy=document.createElement('canvas');copy.width=108;copy.height=192;const g=copy.getContext('2d');g.drawImage(c,0,0,108,192);const data=g.getImageData(0,0,108,192).data;let sum=0,sum2=0;for(let i=0;i<data.length;i+=4){const v=(data[i]+data[i+1]+data[i+2])/3;sum+=v;sum2+=v*v;}const mean=sum/(data.length/4);return {width:c.width,height:c.height,mean,variance:sum2/(data.length/4)-mean*mean};});
  report.render=stat;if(stat.width!==scene.width||stat.height!==scene.height||stat.variance<5||stat.mean<3)report.failures.push('Blank/black or incorrect-resolution render');
  if(app.errors.length)report.failures.push(...app.errors.map(e=>'Browser: '+e));
  const alpha=await app.page.evaluate(()=>{const c=document.getElementById('c');window.__renderFrame(0,{transparent:true});const tmp=document.createElement('canvas');tmp.width=c.width;tmp.height=c.height;const g=tmp.getContext('2d');g.drawImage(c,0,0);const data=g.getImageData(0,0,c.width,c.height).data;let clear=0,opaque=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;if(data[i]>240)opaque++;}return {clear,opaque};});
  report.alpha=alpha;if(!alpha.clear||!alpha.opaque)report.failures.push('Transparent export lacks clear background or visible character');
  await writePNG(path.join(out,'alpha.png'),await app.page.evaluate(()=>document.getElementById('c').toDataURL()));
} finally {await app.close();}
const runtime=await runtimeConfig();
const sheet=spawnSync(process.env.REF2ANIMATION_PYTHON??runtime.python??(process.platform==='win32'?'python':'python3'),[path.join(ROOT,'scripts/contact-sheet.py'),out],{encoding:'utf8'});
if(sheet.status!==0)report.failures.push('Contact sheet failed: '+sheet.stderr);
report.passed=report.failures.length===0;report.status=report.passed?'completed':'failed';await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=2;
