import { serve, options } from './common.mjs';
const opt=options(),host=await serve(undefined,Number(opt.port??8765));
console.log(`Preview server listening on loopback port ${host.server.address().port}. Open /runtime/index.html in a local browser.`);
process.on('SIGINT',async()=>{await host.close();process.exit(0);});
