#!/usr/bin/env python3
"""Package source, license, templates and verified deliverables; exclude local runtimes."""
import argparse,hashlib,json,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
EXCLUDE={'.git','.venv','.cache','node_modules','__pycache__','output'}

def package(output,force=False):
    out=Path(output).resolve()
    if out.exists() and not force:raise FileExistsError(out)
    out.parent.mkdir(parents=True,exist_ok=True)
    files=[]
    for p in sorted(ROOT.rglob('*')):
        rel=p.relative_to(ROOT)
        if not p.is_file() or p==out or any(s in EXCLUDE for s in rel.parts) or p.name=='.runtime.json' or p.suffix in {'.zip','.tmp'}:continue
        if any(s.startswith('.render-') for s in rel.parts):continue
        files.append((p,rel.as_posix()))
    manifest={'name':'ref2animation','version':'0.1.0','license':'MIT','sourceFiles':len(files),
              'files':{r:hashlib.sha256(p.read_bytes()).hexdigest() for p,r in files},
              'characterStatus':'Calibration only: approved Talen artwork not supplied'}
    temp=out.with_suffix('.zip.tmp')
    try:
        with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
            for p,r in files:z.write(p,'ref2animation/'+r)
            z.writestr('ref2animation/package-manifest.json',json.dumps(manifest,indent=2)+'\n')
        with zipfile.ZipFile(temp) as z:
            if z.testzip():raise ValueError('ZIP integrity failure')
            for r,digest in manifest['files'].items():
                if hashlib.sha256(z.read('ref2animation/'+r)).hexdigest()!=digest:raise ValueError('ZIP hash mismatch '+r)
        temp.replace(out)
    finally:
        if temp.exists():temp.unlink()
    print(f'Packaged and hash-verified {len(files)} files: {out} ({out.stat().st_size} bytes)')

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--out',required=True);ap.add_argument('--force',action='store_true');a=ap.parse_args();package(a.out,a.force)
