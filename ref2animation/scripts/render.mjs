import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { options,ROOT,openScene,writePNG } from './common.mjs';
const opt=options(),mode=opt._[0]??'stills',scenePath=opt.scene??'examples/talen-test/scene.json';
if(!['stills','video','sequence'].includes(mode))throw new Error('Modes: stills, sequence, video');
const app=await openScene(scenePath);
let temp;
try {
  const {scene}=await app.page.evaluate(()=>window.__getScene()),total=scene.duration*scene.fps;
  const start=Number(opt.from??0),end=Number(opt.to??total),alpha=!!opt.alpha;
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>total||start>=end)throw new Error('Frame range must be within scene');
  if(mode==='video' && alpha)throw new Error('H.264 has no alpha; use sequence --alpha');
  const out=path.resolve(opt.out??path.join(ROOT,mode==='video'?'output/calibration-demo.mp4':'output/frames'));
  let dir=out;if(mode==='video'){await fs.mkdir(path.dirname(out),{recursive:true});temp=await fs.mkdtemp(path.join(path.dirname(out),'.render-'));dir=temp;}else await fs.mkdir(dir,{recursive:true});
  const frames=mode==='stills'?(opt.frames??`0,${Math.floor(total/2)},${total-1}`).split(',').map(Number):Array.from({length:end-start},(_,i)=>i+start);
  if(frames.some(f=>!Number.isInteger(f)||f<0||f>=total))throw new Error('Invalid sample frame');
  for(const [i,frame] of frames.entries()) {
    const png=await app.page.evaluate(({frame,alpha})=>window.__renderFrame(frame,{transparent:alpha}),{frame,alpha});
    await writePNG(path.join(dir,`frame-${String(mode==='video'?i:frame).padStart(5,'0')}.png`),png);
    if((i+1)%60===0)console.log(`Rendered ${i+1}/${frames.length}`);
  }
  if(app.errors.length)throw new Error(app.errors.join('\n'));
  if(mode==='video') {
    const cmd=spawnSync(process.env.REF2ANIMATION_FFMPEG??'ffmpeg',['-y','-v','error','-framerate',String(scene.fps),'-i',path.join(temp,'frame-%05d.png'),'-frames:v',String(frames.length),'-an','-c:v','libx264','-crf','17','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart',out],{encoding:'utf8'});
    if(cmd.status!==0)throw new Error(cmd.stderr||String(cmd.error));
    const probe=spawnSync(process.env.REF2ANIMATION_FFPROBE??'ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',out],{encoding:'utf8'});
    if(probe.status!==0)throw new Error(probe.stderr||String(probe.error));
    const result=JSON.parse(probe.stdout),video=result.streams.find(s=>s.codec_type==='video');
    const duration=frames.length/scene.fps;
    if(video.width!==scene.width||video.height!==scene.height||Number(video.nb_read_frames)!==frames.length||video.avg_frame_rate!==`${scene.fps}/1`||Math.abs(Number(video.duration)-duration)>1/scene.fps||video.codec_name!=='h264'||result.streams.some(s=>s.codec_type==='audio'))throw new Error('Encoded video metadata mismatch');
    const decode=spawnSync(process.env.REF2ANIMATION_FFMPEG??'ffmpeg',['-v','error','-i',out,'-f','null','-'],{encoding:'utf8'});
    if(decode.status!==0)throw new Error('Video decode failed: '+decode.stderr);
    await fs.writeFile(out+'.qa.json',JSON.stringify({file:path.basename(out),width:video.width,height:video.height,fps:video.avg_frame_rate,frames:Number(video.nb_read_frames),duration:Number(video.duration),codec:video.codec_name,audio:false,decodePassed:true,source:scenePath},null,2)+'\n');
    console.log(`Verified video: ${out} (${frames.length} frames, ${duration}s)`);
  }else console.log(`Wrote ${frames.length} frames: ${out}`);
}finally{await app.close();if(temp)await fs.rm(temp,{recursive:true,force:true});}
