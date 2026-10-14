#!/usr/bin/env python3
"""Lossless explicit sheet extraction; no recoloring, completion or redesign.

Manifest: {"sheet":"sheet.png","parts": {"head":{"box":[x0,y0,x1,y1],
"pivot":[x,y],"parent":"neck"}}}. Pivots are in crop coordinates.
Automatic connected-component listing is upstream slice.py; semantic labels need review.
"""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

def extract(manifest, output):
    src=Path(manifest);cfg=json.loads(src.read_text(encoding='utf-8'));sheet=(src.parent/cfg['sheet']).resolve()
    with Image.open(sheet) as raw:
        image=raw.convert('RGBA');w,h=image.size
        out=Path(output);report={'sheetSha256':hashlib.sha256(sheet.read_bytes()).hexdigest(),'parts':{}};pending=[]
        if (out/'asset-manifest.json').exists():raise FileExistsError(out/'asset-manifest.json')
        for name,part in cfg['parts'].items():
            if not name or not all(c.isalnum() or c in '_-' for c in name): raise ValueError('Invalid part name')
            x0,y0,x1,y1=part['box']
            if not all(isinstance(v,int) for v in part['box']) or not (0<=x0<x1<=w and 0<=y0<y1<=h): raise ValueError(f'Invalid crop {name}')
            pivot=part['pivot']
            if len(pivot)!=2 or not (0<=pivot[0]<=x1-x0 and 0<=pivot[1]<=y1-y0): raise ValueError(f'Invalid pivot {name}')
            target=out/(name+'.png')
            if target.exists(): raise FileExistsError(f'Preserving existing output: {target}')
            crop=image.crop(part['box'])
            alpha=crop.getchannel('A');lo,hi=alpha.getextrema()
            if hi==0: raise ValueError(f'Blank part {name}')
            pending.append((name,target,crop,pivot,part.get('parent'),[lo,hi]))
        out.mkdir(parents=True,exist_ok=True)
        for name,target,crop,pivot,parent,alpha_range in pending:
            crop.save(target)
            report['parts'][name]={'image':target.name,'size':list(crop.size),'pivot':pivot,'parent':parent,'alphaRange':alpha_range,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
        (out/'asset-manifest.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    return report

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('manifest');ap.add_argument('--out',required=True);a=ap.parse_args()
    print(json.dumps(extract(a.manifest,a.out),indent=2))
