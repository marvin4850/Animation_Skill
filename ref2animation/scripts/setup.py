#!/usr/bin/env python3
"""Native cross-platform setup, no bash, shell interpolation or global pip changes."""
import argparse,json,os,shutil,subprocess,sys,venv
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def run(args, **kw):
    print('+', ' '.join(map(str,args)),flush=True)
    subprocess.run([str(a) for a in args],check=True,**kw)

def node_tool(name):
    # subprocess does not need a shell on Windows when the .cmd path is resolved explicitly.
    result=shutil.which(name+'.cmd' if os.name=='nt' else name)
    if not result: raise SystemExit(f'{name} missing. Install Node.js 20+ LTS from nodejs.org.')
    return result

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--system-browser',type=Path);ap.add_argument('--software-gl',action='store_true');ap.add_argument('--skip-python-install',action='store_true');a=ap.parse_args()
    if sys.version_info<(3,11):raise SystemExit('Python 3.11+ is required by the pinned image dependencies (3.12 recommended).')
    node=shutil.which('node')
    if not node:raise SystemExit('Node.js 20+ required')
    major=int(subprocess.check_output([node,'--version'],text=True).strip().lstrip('v').split('.')[0])
    if major<20:raise SystemExit('Node.js 20+ required')
    for cmd in ['ffmpeg','ffprobe']:
        if not shutil.which(cmd):raise SystemExit(f'{cmd} missing. Windows: winget install --id Gyan.FFmpeg --exact. Linux: install the distribution ffmpeg package.')
    venv_dir=ROOT/'.venv';python=venv_dir/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
    if not python.exists():venv.EnvBuilder(with_pip=True).create(venv_dir)
    if not a.skip_python_install:
        run([python,'-m','pip','install','--disable-pip-version-check','--cache-dir',ROOT/'.cache/pip','-r',ROOT/'requirements.txt'])
    run([python,'-c','import PIL,numpy,scipy;print("Python image tools OK")'])
    npm=node_tool('npm')
    npm_command=[npm]
    if os.name=='nt':
        cli=Path(npm).parent/'node_modules/npm/bin/npm-cli.js'
        if not cli.is_file():raise SystemExit(f'Cannot locate npm CLI at {cli}; use the standard Node.js Windows installer.')
        npm_command=[node,cli]
    run(npm_command+['ci','--cache',ROOT/'.cache/npm','--no-audit','--no-fund'],cwd=ROOT)
    if a.system_browser:
        browser=a.system_browser.resolve()
        if not browser.is_file():raise SystemExit(f'No browser at {browser}')
        run([browser,'--version'])
        browser_path=str(browser)
    else:
        run([node,ROOT/'node_modules/playwright/cli.js','install','chromium'],cwd=ROOT)
        browser_path=None
    runtime={'chromium':browser_path,'python':str(python),'softwareGL':a.software_gl}
    (ROOT/'.runtime.json').write_text(json.dumps(runtime,indent=2)+'\n',encoding='utf-8')
    run([python,ROOT/'scripts/create-example.py'])
    run([node,'--test',*sorted(ROOT.glob('tests/*.test.mjs'))],cwd=ROOT)
    run([python,'-m','unittest','discover','-s','tests','-p','test_*.py'],cwd=ROOT)
    # Browser capability and every-frame numeric QA are prerequisites, not inferred from packages.
    run([node,ROOT/'scripts/qa.mjs'],cwd=ROOT)
    print('Setup and functional QA completed. Start preview: node scripts/serve.mjs')

if __name__=='__main__':main()
