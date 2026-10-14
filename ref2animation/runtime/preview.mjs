import { evaluate, atFrame, validateScene } from './timeline.mjs';
import { Renderer } from './renderer.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const scenePath=params.get('scene')??'examples/talen-test/scene.json';
const renderMode=params.has('render');if(renderMode)document.body.classList.add('render');
let scene,rigs,renderer,current=0,playing=false,last=0,polling=false,signature='',resourcePaths=[];
async function fetchJSON(path) {const r=await fetch('/'+path+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(`Cannot load ${path}: ${r.status}`);return r.json();}
async function fingerprint(paths) {
  return Promise.all(paths.map(async p=>{const r=await fetch('/'+p,{method:'HEAD',cache:'no-store'});return p+':'+r.status+':'+r.headers.get('etag');})).then(v=>v.join('|'));
}
async function load() {
  window.__ready=false;window.__loadError=null;$('error').textContent='';
  const next=await fetchJSON(scenePath),nextRigs={};
  for(const [id,path] of Object.entries(next.rigs??{}))nextRigs[id]=await fetchJSON(path);
  const validation=validateScene(next,nextRigs);if(validation.errors.length)throw new Error(validation.errors.join('\n'));
  const nextRenderer=new Renderer($('c'),next,nextRigs);await nextRenderer.init();
  scene=next;rigs=nextRigs;renderer=nextRenderer;current=Math.min(current,scene.duration-1/scene.fps);
  // Export mode never resumes wall-clock playback.
  resourcePaths=[scenePath,...Object.values(scene.rigs)];signature=await fingerprint(resourcePaths);
  $('title').textContent=scene.title;$('notice').textContent=scene.notice??'';$('stats').textContent=`${scene.width} × ${scene.height} · ${scene.fps} FPS · ${scene.duration}s · WebGL2`;
  $('timeline').max=$('frame').max=scene.duration*scene.fps-1;$('stage').style.aspectRatio=`${scene.width}/${scene.height}`;
  window.__ready=true;draw();
}
function draw() {
  const state=evaluate(scene,rigs,current);renderer.render(state,{overlay:!renderMode && $('overlay').checked});
  $('clock').textContent=`${current.toFixed(3)}s / ${scene.duration}s · frame ${state.frame}`;
  $('timeline').value=$('frame').value=state.frame;return state;
}
function seek(frame) {playing=false;$('play').textContent='Play';current=Number(frame)/scene.fps;draw();}
window.__renderAt=t=>{current=t;renderer.render(evaluate(scene,rigs,t));return $('c').toDataURL('image/png');};
window.__renderFrame=(frame,options={})=>{current=frame/scene.fps;renderer.render(atFrame(scene,rigs,frame),options);return $('c').toDataURL('image/png');};
window.__stateAt=t=>evaluate(scene,rigs,t);
window.__getScene=()=>({scene,rigs});
window.__reload=load;
$('timeline').oninput=e=>seek(e.target.value);$('frame').onchange=e=>seek(Math.max(0,Math.min(+e.target.value,scene.duration*scene.fps-1)));
$('play').onclick=()=>{playing=!playing;if(playing && current>=scene.duration-1/scene.fps)current=0;last=performance.now();$('play').textContent=playing?'Pause':'Play';};
$('reload').onclick=()=>load().catch(fail);$('overlay').onchange=draw;$('guides').onchange=()=>{$('safe').style.display=$('guides').checked?'block':'none';};
$('aspect').onchange=e=>{$('stage').style.aspectRatio=e.target.value==='wide'?'16/9':e.target.value==='square'?'1/1':`${scene.width}/${scene.height}`;};
document.onkeydown=e=>{if(e.target.tagName==='INPUT')return;if(e.code==='Space'){e.preventDefault();$('play').click();}if(e.code==='ArrowRight')seek(Math.min(scene.duration*scene.fps-1,Math.floor(current*scene.fps)+1));if(e.code==='ArrowLeft')seek(Math.max(0,Math.floor(current*scene.fps)-1));};
function fail(e){$('error').textContent=e.message;window.__loadError=e.message;console.error(e);}
function tick(now) {if(playing && window.__ready){current=Math.min(scene.duration-1/scene.fps,current+(now-last)/1000);draw();if(current>=scene.duration-1/scene.fps){playing=false;$('play').textContent='Play';}}last=now;requestAnimationFrame(tick);}
await load().catch(fail);if(!renderMode){requestAnimationFrame(tick);setInterval(async()=>{if(polling)return;polling=true;try {if(await fingerprint(resourcePaths)!==signature)await load();}catch(e){fail(e);}finally{polling=false;}},1200);}
