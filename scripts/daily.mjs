import { spawn } from 'node:child_process';

function run(cmd,args,env=process.env) {
  return new Promise((resolve,reject)=>{
    const child=spawn(cmd,args,{stdio:'inherit',env});
    child.on('exit',(code)=>code===0?resolve():reject(new Error(`${cmd} exited ${code}`)));
  });
}

await run(process.execPath,['scripts/generate-news.mjs']);
await run(process.execPath,['scripts/render-carousel.mjs']);
if (String(process.env.INSTAGRAM_AUTO_PUBLISH).toLowerCase()==='true') {
  await run(process.execPath,['scripts/publish-instagram.mjs'],{...process.env,DRY_RUN:'false'});
} else {
  console.log('Instagram auto-publish disabled; generation/render completed.');
}
