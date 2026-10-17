import fs from 'node:fs/promises'
import path from 'node:path'
const root=process.cwd(),out=path.join(root,'dist'),baseArg=process.argv.find(a=>a.startsWith('--base=')),base=baseArg?new URL(baseArg.slice(7)):null
const read=async p=>JSON.parse(await fs.readFile(path.join(out,p),'utf8'))
const catalog=await read('library/catalog.json'),previews=await read('previews/report.json')
const paths=new Set(['index.html','robots.txt','integrations/emojis-plus-agent.zip','library/catalog.json','previews/theme-contact.jpg','previews/school-characters-contact.jpg',...catalog.assets.flatMap(a=>[a.url,a.poster_url]),...catalog.fonts.flatMap(f=>[f.url,f.license_url]),catalog.emblem_url,...catalog.templates.map(t=>'previews/template-'+t.id+'.jpg'),...catalog.presets.map(p=>'previews/preset-'+p.id+'.jpg'),...(catalog.compositions||[]).flatMap(c=>['previews/composition-'+c.id+'.jpg','previews/composition-'+c.id+'.gif'])].filter(Boolean))
const index=await fs.readFile(path.join(out,'index.html'),'utf8')
paths.add('previews/material-supplements-contact.jpg');paths.add('previews/material-review.json');
for(const match of index.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g))paths.add(match[1].replace(/^\.\//,''))
for(const file of await fs.readdir(path.join(out,'assets')))if(file.startsWith('worker-')&&file.endsWith('.js'))paths.add('assets/'+file)
if(![...paths].some(p=>p.startsWith('assets/worker-')))throw Error('No bundled render Worker')
if(/(?:src|href)="\/assets\//.test(index))throw Error('Root-relative bundle URL would break project Pages')
if(!index.includes('noindex,nofollow,noarchive'))throw Error('Search exclusion metadata missing')
if(previews.success!==catalog.templates.length+catalog.presets.length+(catalog.compositions?.length||0)||previews.failures.length)throw Error('Incomplete template/preset posters')
let total=0
for(const file of await fs.readdir(out,{recursive:true})){const full=path.join(out,file),stat=await fs.stat(full);if(!stat.isFile())continue;total+=stat.size;if(/(^|[\\/])(?:data|backend|node_modules|\.env)([\\/]|$)|\.(?:db|sqlite|py)$/i.test(file))throw Error('Private/runtime-server file found: '+file);if(/\.(?:js|json|html|css|txt)$/i.test(file)){const text=await fs.readFile(full,'utf8');if(/\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{24,})\b|-----BEGIN [^-]*PRIVATE KEY-----/.test(text))throw Error('Credential-like value in '+file)}}
for(const file of paths){const absolute=path.resolve(out,file);if(!absolute.startsWith(out+path.sep)||!await fs.stat(absolute).then(s=>s.isFile()).catch(()=>false))throw Error('Missing/unsafe deployed path: '+file)}
for(const font of catalog.fonts){const bytes=await fs.readFile(path.join(out,font.url));if(bytes.subarray(0,4).toString()!=='wOF2')throw Error('Invalid WOFF2: '+font.id)}
const result={counts:{assets:catalog.assets.length,fonts:catalog.fonts.length,templates:catalog.templates.length,presets:catalog.presets.length,themes:catalog.themes?.length,compositions:catalog.compositions?.length},files:paths.size,bytes:total,base:base?.href||null,remote_checked:0,failures:[]}
if(base){if(!base.pathname.endsWith('/'))throw Error('Pages base URL must end with /');const queue=[...paths],failures=[];await Promise.all(Array.from({length:10},async()=>{while(queue.length){const file=queue.shift(),url=new URL(file,base);try{const response=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('HTTP '+response.status);const type=response.headers.get('content-type')||'';if(/\.(?:gif|webp|jpg)$/.test(file)&&!type.startsWith('image/'))throw Error('Unexpected image MIME '+type);if(file.endsWith('.js')&&!/javascript/.test(type))throw Error('Unexpected worker/script MIME '+type);result.remote_checked++}catch(e){failures.push({file,error:String(e)})}}}));result.failures=failures;if(failures.length)process.exitCode=1}
await fs.mkdir(path.join(root,'.deployment'),{recursive:true});await fs.writeFile(path.join(root,'.deployment',base?'remote-verification.json':'build-verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2))
