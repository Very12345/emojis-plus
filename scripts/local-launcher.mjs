import {spawn,spawnSync} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import net from 'node:net'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),server=path.join(root,'scripts/static-server.mjs'),record=path.join(root,'.local-server.json'),npm=process.platform==='win32'?'npm.cmd':'npm'
const args=process.argv.slice(2),port=Number(args.includes('--port')?args[args.indexOf('--port')+1]:8000)
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('端口需为1024—65535。')
await new Promise((resolve,reject)=>{const probe=net.createServer();probe.once('error',()=>reject(Error('端口'+port+'已占用。请先运行stop.cmd，或 start.cmd --port 8010。')));probe.listen(port,'127.0.0.1',()=>probe.close(resolve))})
if(!fs.existsSync(path.join(root,'node_modules'))){const result=spawnSync(npm,['ci'],{cwd:root,stdio:'inherit',shell:process.platform==='win32'});if(result.status!==0)process.exit(result.status||1)}
const build=spawnSync(npm,['run','build'],{cwd:root,stdio:'inherit',shell:process.platform==='win32'});if(build.status!==0)process.exit(build.status||1)
const log=fs.openSync(path.join(root,'static-server.log'),'a'),child=spawn(process.execPath,[server,...args],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',log,log]});child.unref();fs.closeSync(log);let failed=false;child.on('error',()=>{failed=true});await new Promise(resolve=>setTimeout(resolve,800));if(child.exitCode!==null||failed){console.error('启动失败，请查看static-server.log。');process.exit(1)}fs.writeFileSync(record,JSON.stringify({pid:child.pid,script:server,started:new Date().toISOString()}));console.log('工作台已在后台启动：http://127.0.0.1:'+port+'/。停止请运行stop.cmd。')
