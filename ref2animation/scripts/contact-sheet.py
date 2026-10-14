#!/usr/bin/env python3
import argparse
from pathlib import Path
from PIL import Image, ImageDraw

def create(folder, output=None, columns=3, crop=None):
    files=sorted(Path(folder).glob('frame-*.png'))
    if not files: raise ValueError('No rendered samples')
    w,h=270,480 if crop is None else round(270*(crop[3]-crop[1])/(crop[2]-crop[0])); image=Image.new('RGB',(columns*w,((len(files)+columns-1)//columns)*(h+30)), '#172630')
    d=ImageDraw.Draw(image)
    for i,p in enumerate(files):
        with Image.open(p) as im:
            im=im.convert('RGB')
            if crop:im=im.crop(crop)
            im.thumbnail((w,h))
            x,y=(i%columns)*w,(i//columns)*(h+30)
            image.paste(im,(x,y));d.text((x+8,y+h+8),p.stem,fill='#eee4c4')
    target=Path(output) if output else Path(folder)/'contact-sheet.jpg';image.save(target,quality=92)
    print(target)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('folder');ap.add_argument('--out');ap.add_argument('--cols',type=int,default=3);ap.add_argument('--crop');a=ap.parse_args();create(a.folder,a.out,a.cols,tuple(map(int,a.crop.split(','))) if a.crop else None)
