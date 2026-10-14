#!/usr/bin/env python3
"""Install a self-contained copy. Never overwrite an existing installed skill."""
import argparse,os,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--target',type=Path,default=Path.home()/'.codex/skills/ref2animation');a=ap.parse_args();target=a.target.expanduser().resolve()
    if target.exists():raise SystemExit(f'Preserving existing installation: {target}. Choose a new --target or explicitly remove it yourself.')
    shutil.copytree(ROOT,target,ignore=shutil.ignore_patterns('node_modules','.venv','.cache','output','__pycache__','.runtime.json','deliverables','*.zip'))
    print(f'Skill installed: {target}')
    print('Run its scripts/setup.py with Python, then restart Codex to load SKILL.md.')

if __name__=='__main__':main()
