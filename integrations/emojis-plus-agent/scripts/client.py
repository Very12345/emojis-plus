#!/usr/bin/env python3
"""Dependency-free client for the Emojis Plus browser renderer relay."""
import argparse
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

def main():
    if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr,'reconfigure'):sys.stderr.reconfigure(encoding='utf-8')
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--config',default=str(Path.home()/'.emojis-plus/bridge.json'))
    p.add_argument('--url',default=os.environ.get('EP_BRIDGE_URL'))
    p.add_argument('--token',default=os.environ.get('EP_BRIDGE_TOKEN'))
    p.add_argument('--browser',default=os.environ.get('EP_BRIDGE_BROWSER'))
    sub=p.add_subparsers(dest='command',required=True)
    sub.add_parser('browsers')
    c=sub.add_parser('catalog');c.add_argument('--kind');c.add_argument('--character');c.add_argument('--query')
    def wait_options(cmd):
        cmd.add_argument('--wait',action='store_true');cmd.add_argument('--output');cmd.add_argument('--timeout',type=float,default=240)
    g=sub.add_parser('generate');g.add_argument('prompt');g.add_argument('--character');g.add_argument('--format',choices=['jpg','gif'],default='jpg');wait_options(g)
    c=sub.add_parser('compose');c.add_argument('--asset',required=True);c.add_argument('--composition');c.add_argument('--template');c.add_argument('--text',default='');c.add_argument('--secondary',default='');c.add_argument('--person',action='append',default=[]);c.add_argument('--motion');c.add_argument('--presentation',choices=['chat','original'],default='chat');c.add_argument('--interaction',choices=['none','chase'],default='none');c.add_argument('--chaser',type=int,choices=[0,1],default=1);c.add_argument('--format',choices=['jpg','gif'],default='jpg');c.add_argument('--size',type=int,choices=[256,512],default=256);wait_options(c)
    r=sub.add_parser('render');r.add_argument('plan_file');r.add_argument('--candidate',type=int,choices=[1,2,3],default=1);wait_options(r)
    s=sub.add_parser('status');s.add_argument('job_id');wait_options(s)
    x=sub.add_parser('cancel');x.add_argument('job_id')
    a=p.parse_args();config={}
    if Path(a.config).is_file():config=json.loads(Path(a.config).read_text(encoding='utf-8'))
    url=(a.url or config.get('url') or '').rstrip('/');token=a.token or config.get('token')
    if not url or not token:p.error('No connection. Start the local bridge, or supply EP_BRIDGE_URL and EP_BRIDGE_TOKEN.')
    def request(route,body=None,binary=False):
        target=url+route;req=urllib.request.Request(target,data=None if body is None else json.dumps(body,ensure_ascii=False).encode(),headers={'Authorization':'Bearer '+token,**({'Content-Type':'application/json'}if body is not None else {})})
        try:
            with urllib.request.urlopen(req,timeout=35)as response:
                data=response.read();return data if binary else json.loads(data)
        except urllib.error.HTTPError as e:
            try:message=json.loads(e.read()).get('error',str(e))
            except Exception:message=str(e)
            raise RuntimeError('HTTP '+str(e.code)+': '+message)from None
    if a.command=='browsers':result=request('/api/v1/browsers')
    elif a.command=='catalog':
        result=request('/api/v1/catalog'+('?browser_id='+urllib.parse.quote(a.browser)if a.browser else ''))
        if a.kind:
            result=result.get(a.kind,[])
            if isinstance(result,list):result=[row for row in result if (not a.character or row.get('character')==a.character)and(not a.query or a.query.lower()in json.dumps(row,ensure_ascii=False).lower())]
    elif a.command=='cancel':result=request('/api/v1/jobs/'+a.job_id+'/cancel',{})
    else:
        if a.command=='status':result=request('/api/v1/jobs/'+a.job_id)
        else:
            if a.command=='generate':body={'operation':'generate','prompt':a.prompt,'format':a.format,'character':a.character}
            elif a.command=='compose':body={'operation':'compose','asset_id':a.asset,'composition_id':a.composition,'template_id':a.template,'text':a.text,'secondary_text':a.secondary,'characters':a.person,'format':a.format,'size':a.size,'presentation':a.presentation,'interaction':a.interaction,'chaser_index':a.chaser,'options':{'primary_motion':{'effect':a.motion,'strength':.5,'speed':1}}if a.motion else {}}
            else:
                plan=json.loads(Path(a.plan_file).read_text(encoding='utf-8'));plan=plan.get('result',plan);plan=plan['candidates'][a.candidate-1] if isinstance(plan,dict)and'candidates'in plan else plan;body={'operation':'render','plan':plan.get('plan',plan)}
            if a.browser:body['browser_id']=a.browser
            result=request('/api/v1/jobs',body)
        if a.wait:
            deadline=time.monotonic()+a.timeout;previous=0
            while result['status']not in ['completed','failed','cancelled']:
                for event in result.get('events',[]):
                    if event['seq']>previous:print(event['stage']+': '+event['message']+(' ('+str(event['percent'])+'%)'if'percent'in event else ''),file=sys.stderr);previous=event['seq']
                if time.monotonic()>deadline:raise RuntimeError('Timed out waiting; job '+result['id']+' is still queryable with status.')
                time.sleep(.7);result=request('/api/v1/jobs/'+result['id'])
        if a.output and result['status']=='completed':
            destination=Path(a.output).resolve();destination.mkdir(parents=True,exist_ok=True);saved=[]
            for file in result.get('files',[]):
                name=file['name']
                if Path(name).name!=name or name in ['.','..']:raise RuntimeError('Invalid result filename')
                target=destination/name;index=1
                while target.exists():target=destination/(Path(name).stem+'-'+str(index)+Path(name).suffix);index+=1
                target.write_bytes(request(file['download_path'],binary=True));saved.append(str(target))
            result['saved_files']=saved
            (destination/('result-'+result['id']+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2))
    if isinstance(result,dict)and result.get('status')in ['failed','cancelled']:return 1
    return 0
if __name__=='__main__':
    try:sys.exit(main())
    except (RuntimeError,urllib.error.URLError,OSError,ValueError)as e:print('Emojis Plus: '+str(e),file=sys.stderr);sys.exit(1)
