#!/usr/bin/env python3
"""Create explicit synthetic calibration data. Never reads or replaces supplied art."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def example():
    joints = {
        'pelvis': {'parent': None, 'offset': [0,-185]},
        'torso': {'parent': 'pelvis', 'offset': [0,-68]},
        'neck': {'parent': 'torso', 'offset': [0,-52]},
        'head': {'parent': 'neck', 'offset': [0,-37]},
    }
    for s, x in [('L',-14),('R',14)]:
        joints.update({
            'hip'+s: {'parent':'pelvis','offset':[x,0]},
            'knee'+s: {'parent':'hip'+s,'offset':[25,89],'limits':[.06,2.6]},
            'ankle'+s: {'parent':'knee'+s,'offset':[-25,84]},
            'shoulder'+s: {'parent':'torso','offset':[-25 if s=='L' else 25,-15]},
            'elbow'+s: {'parent':'shoulder'+s,'offset':[0,80],'limits':[.04,2.7]},
            'hand'+s: {'parent':'elbow'+s,'offset':[0,72]},
        })
    parts = {
        'pelvis': {'from':'pelvis','size':[84,54],'pivot':[42,24],'z':28,'color':'#374a54','shape':'pelvis'},
        'torso': {'from':'torso','size':[92,116],'pivot':[46,26],'z':30,'color':'#3c5360','shape':'torso'},
        'neck': {'from':'neck','size':[30,36],'pivot':[15,10],'z':35,'color':'#caaa84'},
        'head': {'from':'head','size':[78,92],'pivot':[39,44],'z':45,'color':'#d4b490','shape':'head'},
    }
    for s in ['L','R']:
        z=8 if s=='L' else 40
        for name, start, end, size, pivot, col, dz in [
            ('thigh','hip','knee',[40,111],[20,8],'#354853',0),
            ('shin','knee','ankle',[36,110],[18,8],'#43545c',1),
            ('foot','ankle',None,[62,24],[20,12],'#77818a',2),
            ('upperArm','shoulder','elbow',[37,95],[18,7],'#415865',7),
            ('forearm','elbow','hand',[31,87],[15,7],'#3b505b',8),
            ('hand','hand',None,[30,32],[15,9],'#1e292e',9),
        ]:
            parts[name+s]={'from':start+s,'size':size,'pivot':pivot,'z':z+dz,'color':col,'shape':name}
            if end: parts[name+s]['to']=end+s
    rig={'version':1,'id':'calibration-worker','placeholder':True,
         'notice':'Synthetic calibration puppet. NOT approved Talen artwork.',
         'joints':joints,'parts':parts,'gait':{'stanceHalf':22,'ankleHeight':12,'stepLength':50,'lift':32},
         'layerRules':[['thighL','torso'],['upperArmL','torso'],['torso','upperArmR'],['torso','handR']],
         'armRest':{'L':[-10,142],'R':[10,142]},
         'views':{v:{'parts':{}} for v in ['front','three-quarter','side','back','back-three-quarter']},
         'expressions':['neutral','concerned','angry','surprised','afraid','concentrating']}
    scene={'version':1,'title':'Talen choreography — calibration assets only',
           'notice':'TALEN ART MISSING • SYNTHETIC CALIBRATION PUPPETS / PLACEHOLDER ENVIRONMENT',
           'width':1080,'height':1920,'fps':30,'duration':12,'seed':4850,
           'rigs':{'worker':'examples/talen-test/worker.rig.json'},
           'background':{'type':'factory','placeholder':True},
           'layers':[],
           'props':[
               {'id':'terminal','type':'terminal','position':[415,1220],'z':18,'points':{'buttons':[0,0]},'placeholder':True},
               {'id':'conveyor','type':'conveyor','position':[820,1550],'z':5,'points':{'default':[0,0]},'placeholder':True},
               {'id':'mechanism','type':'mechanism','position':[1090,1230],'z':4,'points':{'fault':[0,-70]},'placeholder':True},
               {'id':'warning','type':'warning','position':[1090,1010],'z':4,'points':{'default':[0,0]},'placeholder':True}],
           'actors':[
               {'id':'Talen','rig':'worker','position':[300,1490],'view':'three-quarter','facing':1,
                'tracks':{'expression':[{'t':0,'value':'concentrating'},{'t':9.8,'value':'concerned'}]},
                'clips':[
                    {'id':'breath','type':'breathing','start':0,'duration':12,'intensity':.6},
                    {'id':'raise','type':'reach','start':0,'duration':2,'target':'terminal.buttons','blendIn':1.6,'blendOut':0},
                    {'id':'buttons','type':'press','start':2,'duration':2,'target':'terminal.buttons','speed':2,'blendIn':0,'blendOut':0},
                    {'id':'release','type':'reach','start':4,'duration':1.5,'target':[335,1364],'fromTarget':'terminal.buttons','blendIn':0,'blendOut':0},
                    {'id':'turn','type':'turnBody','start':4,'duration':1.5,'view':'side'},
                    {'id':'travel','type':'walk','start':5.5,'duration':3.5,'from':[300,1490],'to':[730,1490],'steps':10,'lift':32},
                    {'id':'settle','type':'stop','start':9,'duration':1,'angle':.035},
                    {'id':'look','type':'lookAt','start':9.3,'duration':2.7,'target':'mechanism.fault'},
                    {'id':'point-fault','type':'point','start':10,'duration':2,'target':'mechanism.fault','blendIn':.65,'hold':True},
                ]},
               {'id':'Marek','rig':'worker','position':[950,1490],'view':'front','scale':.92,
                'clips':[{'type':'idle','start':0,'duration':12,'intensity':1},
                         {'type':'uncertain','start':9,'duration':3,'intensity':.6}]}
           ],
           'camera':{'center':[620,960],'follow':'Talen','offset':[170,-530],'followWeight':.8,
                     'tracks':{'zoom':[{'t':0,'value':1},{'t':10,'value':1},{'t':12,'value':1.045,'ease':'smooth'}]}},
           'attachments':[], 'transitions':[]}
    return rig, scene

if __name__ == '__main__':
    rig, scene=example()
    target=ROOT/'examples/talen-test'; target.mkdir(parents=True,exist_ok=True)
    for name,data in [('worker.rig.json',rig),('scene.json',scene)]:
        p=target/name
        if not p.exists(): p.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    print('Calibration example present; existing files preserved.')
