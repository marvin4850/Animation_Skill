import importlib.util,json,tempfile,unittest
from pathlib import Path
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('assets',ROOT/'scripts/assets.py');assets=importlib.util.module_from_spec(spec);spec.loader.exec_module(assets)

class AssetTests(unittest.TestCase):
    def test_preserves_pixels_alpha_and_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);im=Image.new('RGBA',(20,20),(70,90,100,0));im.putpixel((5,5),(222,120,73,127));im.save(p/'sheet.png');before=(p/'sheet.png').read_bytes()
            cfg={'sheet':'sheet.png','parts':{'head':{'box':[4,4,8,8],'pivot':[1,1],'parent':'neck'}}};(p/'crop.json').write_text(json.dumps(cfg))
            assets.extract(p/'crop.json',p/'out')
            with Image.open(p/'out/head.png') as out:self.assertTrue(np.array_equal(np.array(out),np.array(im.crop((4,4,8,8)))))
            self.assertEqual((p/'sheet.png').read_bytes(),before)
            with self.assertRaises(FileExistsError):assets.extract(p/'crop.json',p/'out')
    def test_rejects_outside_crop(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp);Image.new('RGBA',(8,8),'red').save(p/'sheet.png');(p/'m.json').write_text(json.dumps({'sheet':'sheet.png','parts':{'head':{'box':[0,0,9,9],'pivot':[1,1]}}}))
            with self.assertRaises(ValueError):assets.extract(p/'m.json',p/'out')

if __name__=='__main__':unittest.main()
