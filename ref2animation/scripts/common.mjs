import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function runtimeConfig() {
  try {return JSON.parse(await fs.readFile(path.join(ROOT,'.runtime.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw e;}
}
export function options(args=process.argv.slice(2)) {
  const values={_:[]};for(let i=0;i<args.length;i++){if(args[i].startsWith('--')){const key=args[i].slice(2);values[key]=args[i+1] && !args[i+1].startsWith('--')?args[++i]:true;}else values._.push(args[i]);}return values;
}
export async function serve(root=ROOT,port=0) {
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.css':'text/css'};
  const server=http.createServer(async(req,res)=>{
    try {
      const url=new URL(req.url,'http://localhost');let p=decodeURIComponent(url.pathname);if(p==='/')p='/runtime/index.html';
      const file=path.resolve(root,'.'+p),relative=path.relative(root,file);
      if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(s=>s.startsWith('.'))){res.writeHead(403).end();return;}
      const real=await fs.realpath(file);const realRelative=path.relative(root,real);
      if(realRelative.startsWith('..') || path.isAbsolute(realRelative)){res.writeHead(403).end();return;}
      const st=await fs.stat(real);if(!st.isFile()){res.writeHead(404).end();return;}
      res.writeHead(200,{'content-type':types[path.extname(real)]??'application/octet-stream','content-length':st.size,'cache-control':'no-store','etag':`"${st.size}-${st.mtimeMs}"`});
      res.end(req.method==='HEAD'?undefined:await fs.readFile(real));
    }catch{res.writeHead(404).end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {server,url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r))};
}
export async function openScene(scenePath='examples/talen-test/scene.json') {
  const host=await serve();let browser;const config=await runtimeConfig();
  try {
    browser=await chromium.launch({executablePath:process.env.REF2ANIMATION_CHROMIUM || config.chromium || undefined,
      args:process.env.REF2ANIMATION_SOFTWARE_GL==='1' || config.softwareGL ? ['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]});
    const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(host.url+'/runtime/index.html?render=1&scene='+encodeURIComponent(scenePath));
    await page.waitForFunction(()=>window.__ready||window.__loadError,null,{timeout:30000});
    const error=await page.evaluate(()=>window.__loadError);if(error)throw new Error(error);
    return {page,browser,host,errors,close:async()=>{await browser.close();await host.close();}};
  }catch(e){if(browser)await browser.close();await host.close();throw e;}
}
export async function writePNG(file,data) {await fs.mkdir(path.dirname(path.resolve(file)),{recursive:true});await fs.writeFile(file,Buffer.from(data.split(',')[1],'base64'));}
