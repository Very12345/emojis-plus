import fs from 'node:fs/promises'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
const root=process.cwd(),read=async p=>JSON.parse(await fs.readFile(p,'utf8')),report=await read('public/library/build-report.json'),files=new Set(['.gitignore','.gitattributes','README.md','index.html','package.json','package-lock.json','tsconfig.json','vite.config.ts','start.cmd','stop.cmd','assets/curation.json','assets/emblem.json','public/robots.txt'])
for(const file of report.files)if(file.source)files.add(file.source)
const walk=async(dir,accept)=>{for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=dir+'/'+entry.name;if(entry.isDirectory())await walk(file,accept);else if(accept(file))files.add(file)}}
await walk('src',()=>true);await walk('docs',f=>f.endsWith('.md'));await walk('.github',f=>/\.ya?ml$/.test(f));await walk('assets/registry',f=>f.endsWith('.json'))
for(const name of ['prepare-static.mjs','prepare-previews.ts','verify-pages.mjs','github-source-files.mjs','static-server.mjs','local-launcher.mjs','stop-local.ps1','stop.ps1'])files.add('scripts/'+name)
for(const name of await fs.readdir('tests'))if(/^browser-.*\.test\.ts$/.test(name))files.add('tests/'+name)
for(const name of await fs.readdir('assets/fonts'))if(/(?:OFL\.txt|-OFL\.txt|-sources\.json)$/.test(name))files.add('assets/fonts/'+name)
const seen=new Map()
for(const name of ['catalog.json',...(await fs.readdir('assets/seed')).filter(n=>n.endsWith('-catalog.json')).sort()]){files.add('assets/seed/'+name);for(const item of await read('assets/seed/'+name)){if(seen.has(item.id)){files.add('assets/seed/'+item.filename);files.add('assets/seed/'+seen.get(item.id))}else seen.set(item.id,item.filename)}}
let bytes=0;const selected=[...files].sort()
for(const file of selected){const full=path.resolve(root,file);if(!full.startsWith(root+path.sep)||/^(?:data|backend|examples|node_modules|\.env)(?:\/|$)/.test(file))throw Error('Unsafe publication path: '+file);const stat=await fs.stat(full);if(!stat.isFile()||stat.size>95*1024*1024)throw Error('Unsupported file: '+file);bytes+=stat.size;if(/\.(?:ts|tsx|js|mjs|json|md|txt|html|css|ya?ml|ps1|cmd)$/.test(file)){const text=await fs.readFile(full,'utf8');if(/\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{24,})\b|-----BEGIN [^-]*PRIVATE KEY-----/.test(text))throw Error('Credential-like value: '+file)}}
await fs.mkdir('.deployment',{recursive:true});await fs.writeFile('.deployment/source-files.json',JSON.stringify({files:selected,bytes},null,2));await fs.writeFile('.deployment/source-files.nul',Buffer.from(selected.join('\0')+'\0'))
console.log(JSON.stringify({files:files.size,totalMiB:Math.round(bytes/1024/1024)},null,2))
if(process.argv.includes('--stage')){const result=spawnSync('git',['add','-f','--pathspec-from-file=.deployment/source-files.nul','--pathspec-file-nul'],{cwd:root,stdio:'inherit'});if(result.status!==0)process.exit(result.status||1)}
