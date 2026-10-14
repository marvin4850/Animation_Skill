import { screenPoint } from './timeline.mjs';
import { random, distance } from './math.mjs';

const rgba = (hex,alpha=1) => {
  const h=hex.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).concat(alpha);
};

export class Renderer {
  constructor(canvas,scene,rigs) {
    this.canvas=canvas;this.scene=scene;this.rigs=rigs;this.G=window.G;
    this.G.init(canvas,scene.width,scene.height);
    this.sprite=this.G.program('cinema-sprite',`uniform sampler2D u_tex; uniform float u_alpha;
      void main(){o=texture(u_tex,v_uv)*u_alpha;}`);
    this.solid=this.G.program('cinema-solid',`uniform vec4 u_color; uniform float u_disc;
      void main(){float a=u_color.a;if(u_disc>0.5)a*=1.0-smoothstep(0.46,0.5,length(v_uv-0.5));o=vec4(u_color.rgb*a,a);}`);
    this.glow=this.G.program('cinema-glow',`uniform vec4 u_color;
      void main(){float d=length(v_uv*2.0-1.0);float a=exp(-d*d*5.0)*(1.0-smoothstep(0.8,1.0,d))*u_color.a;o=vec4(u_color.rgb*a,a);}`);
    this.assetKeys=new Map();
  }
  async init() {
    for(const [id,rig] of Object.entries(this.rigs)) {
      for(const view of Object.keys(rig.views)) for(const [name,p] of Object.entries(rig.parts)) {
        const part={...p,...rig.views[view].parts?.[name]};
        for(const expression of (name==='head'?rig.expressions??['neutral']:name.startsWith('hand') && rig.placeholder?['neutral','point']:['neutral'])) {
          const key=`${id}:${view}:${name}:${expression}`;
          const src=part.expressions?.[expression]??part.image;
          if(src) await this.G.load(key,src.startsWith('/')?src:'/'+src);
          else if(rig.placeholder) this.G.canvasTex(key,this.placeholder(part,view,expression));
          else throw new Error(`Missing artwork for ${key}; automatic redesign is disabled`);
          this.assetKeys.set(key,key);
        }
      }
    }
    for(const layer of this.scene.layers??[]) {
      await this.G.load(`layer:${layer.id}`,layer.image.startsWith('/')?layer.image:'/'+layer.image);
    }
    for(const prop of this.scene.props??[]) if(prop.image) await this.G.load(`prop:${prop.id}`,prop.image.startsWith('/')?prop.image:'/'+prop.image);
    if(this.scene.background?.image) await this.G.load('background',this.scene.background.image.startsWith('/')?this.scene.background.image:'/'+this.scene.background.image);
    else if(this.scene.background?.type==='factory') this.G.canvasTex('background',this.factory());
    if(this.scene.notice) {
      const c=document.createElement('canvas');c.width=this.scene.width;c.height=70;
      const g=c.getContext('2d');g.fillStyle='#13232dda';g.fillRect(0,0,c.width,70);
      g.fillStyle='#f1d299';g.font='22px sans-serif';g.textAlign='center';
      g.fillText(this.scene.notice,c.width/2,43,c.width-36);this.G.canvasTex('notice',c);
    }
  }
  placeholder(p,view,expression) {
    const c=document.createElement('canvas');[c.width,c.height]=p.size;const ctx=c.getContext('2d'),w=c.width,h=c.height;
    ctx.lineWidth=3;ctx.strokeStyle='#142129';ctx.fillStyle=p.color??'#61717c';
    ctx.beginPath();ctx.roundRect(3,3,w-6,h-6,Math.min(w/2-3,12));ctx.fill();ctx.stroke();
    ctx.fillStyle='#ffffff16';ctx.fillRect(8,7,Math.max(3,w*.18),h-15);
    if(p.shape==='hand' && expression==='point') {
      ctx.clearRect(0,0,w,h);ctx.fillStyle=p.color;ctx.strokeStyle='#142129';
      ctx.beginPath();ctx.roundRect(5,3,w-10,18,5);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.roundRect(w/2-4,15,8,h-16,3);ctx.fill();ctx.stroke();
    }
    if(p.shape==='torso') {
      ctx.fillStyle='#8a9eab';ctx.fillRect(w*.5-2,12,4,h-18);
      ctx.fillStyle='#203740';ctx.fillRect(12,38,22,16);
      ctx.strokeRect(12,38,22,16);ctx.fillStyle='#dabb75';ctx.fillRect(w-25,40,12,6);
    }
    if(p.shape==='head') {
      ctx.fillStyle='#563e32';ctx.beginPath();ctx.roundRect(4,3,w-8,29,10);ctx.fill();
      const back=view.startsWith('back');
      if(!back) {
        ctx.fillStyle='#182a32';const xs=view==='side'?[w*.78]:view==='front'?[w*.3,w*.7]:[w*.47,w*.8];
        for(const x of xs) {
          ctx.beginPath();ctx.ellipse(x,h*.48,expression==='surprised'?4:3,expression==='afraid'?5:3,0,0,Math.PI*2);ctx.fill();
          ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-5,h*.40);ctx.lineTo(x+5,h*(expression==='concerned'?.37:.40));ctx.stroke();
        }
        ctx.strokeStyle='#725340';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.60,h*.76);ctx.lineTo(w*.76,h*.76);ctx.stroke();
        if(view!=='front') {ctx.fillStyle='#d4b490';ctx.beginPath();ctx.moveTo(w-6,h*.48);ctx.lineTo(w+0,h*.61);ctx.lineTo(w-6,h*.65);ctx.fill();}
      } else {ctx.fillStyle='#654b3a';ctx.fillRect(8,20,w-16,38);}
    }
    return c;
  }
  factory() {
    const c=document.createElement('canvas');c.width=2400;c.height=1920;
    const g=c.getContext('2d'),gradient=g.createLinearGradient(0,0,0,1920);
    gradient.addColorStop(0,'#172831');gradient.addColorStop(.6,'#39474b');gradient.addColorStop(1,'#202d34');
    g.fillStyle=gradient;g.fillRect(0,0,c.width,c.height);
    for(let i=0;i<10;i++) {
      const x=i*270;
      g.fillStyle='#13252b';g.fillRect(x,0,25,1520);
      g.fillStyle='#59676b';g.fillRect(x+4,0,5,1520);
      g.fillStyle='#1d3037';g.fillRect(x+42,500,186,460);
      g.fillStyle='#647d7e';g.fillRect(x+47,510,176,12);
      for(let j=0;j<4;j++) {g.fillStyle=j%2?'#bd986229':'#718b891a';g.fillRect(x+48,540+j*90,174,60);}
    }
    g.strokeStyle='#82928e';g.lineWidth=14;g.beginPath();g.moveTo(0,450);g.lineTo(2400,450);g.stroke();
    g.strokeStyle='#172a31';g.lineWidth=5;g.beginPath();g.moveTo(0,435);g.lineTo(2400,435);g.stroke();
    g.fillStyle='#3a494e';g.fillRect(0,1495,2400,425);
    g.strokeStyle='#25343b';g.lineWidth=3;
    for(let y=1520;y<1920;y+=88){g.beginPath();g.moveTo(0,y);g.lineTo(2400,y);g.stroke();}
    for(let x=-400;x<2700;x+=200){g.beginPath();g.moveTo(x,1495);g.lineTo(x+190,1920);g.stroke();}
    g.fillStyle='#d5bc72';g.font='bold 27px sans-serif';g.fillText('FORGE / LINE 07',670,860);
    return c;
  }
  rect(x,y,w,h,color,rot=0,disc=false) {
    const G=this.G;G.draw(this.solid,{u_color:rgba(color),u_disc:disc?1:0},G.xf(x,y,w,h,rot,w/2,h/2));
  }
  image(key,x,y,w,h,rot=0,pivot=[0,0],alpha=1) {
    this.G.draw(this.sprite,{u_tex:this.G.tex(key),u_alpha:alpha},this.G.xf(x,y,w,h,rot,...pivot));
  }
  prop(p,state) {
    const {scene}=this, k=state.camera.zoom, [x,y]=screenPoint(scene,state.camera,p.position);
    const r=(dx,dy,w,h,c,rot=0,disc=false)=>this.rect(x+dx*k,y+dy*k,w*k,h*k,c,rot,disc);
    if(p.image) {this.image(`prop:${p.id}`,x-(p.pivot?.[0]??0)*k,y-(p.pivot?.[1]??0)*k,p.size[0]*k,p.size[1]*k);return;}
    if(p.type==='terminal') {
      r(-38,34,76,210,'#24343c');r(-90,-115,180,160,'#16272f');r(-80,-106,160,130,'#789997');
      r(-68,-94,136,72,'#243e44');r(-58,-80,95,5,'#85c7ac');r(-58,-61,116,4,'#85c7ac');
      for(let i=0;i<5;i++)r(-60+i*25,-10,17,13,i%2?'#d9b065':'#54737c');
      r(-110,244,220,17,'#15262d');
    } else if(p.type==='conveyor') {
      r(-390,-40,780,48,'#1b2c32');r(-390,8,780,70,'#506067');
      for(let i=0;i<18;i++) {const dx=((i*48+state.t*48)%864)-432;if(dx>=-385 && dx<=370)r(dx,-37,12,41,'#7e8b8d');}
      r(-360,78,36,78,'#21343b');r(310,78,36,78,'#21343b');
      for(let i=0;i<4;i++)r(-300+((i*210+state.t*43)%750),-90,65,50,'#997b58');
    } else if(p.type==='mechanism') {
      r(-75,-80,150,290,'#22353c');r(-120,-30,240,110,'#65747a');r(-54,-54,108,108,'#203138',0,true);
      for(let i=0;i<8;i++) {const a=i*Math.PI/4+state.t*.7;r(-8+60*Math.cos(a),-8+60*Math.sin(a),16,16,'#9ea6a4',a);}
      r(-22,-22,44,44,'#b88452',state.t*.7);
    } else if(p.type==='warning') {
      const color=Math.sin(state.t*6)>0?'#ffbb57':'#835c3c';r(-24,-24,48,48,color,0,true);
    } else {r(-25,-25,50,50,p.color??'#a48862');}
  }
  actor(pose,state) {
    const rig=this.rigs[pose.state.rig], actorScale=pose.state.scale, z=state.camera.zoom;
    const views=pose.state.viewMix && pose.state.viewMix.weight<1 ? [[pose.state.viewMix.from,1-pose.state.viewMix.weight],[pose.state.viewMix.to,pose.state.viewMix.weight]] : [[pose.state.view,1]];
    for(const [view,weight] of views) {
      if(weight<=0)continue;
      const parts=Object.entries(rig.parts).map(([name,p])=>[name,{...p,...rig.views[view].parts?.[name]}]).sort((a,b)=>a[1].z-b[1].z);
      for(const [name,p] of parts) {
        const from=pose.joints[p.from], to=p.to?pose.joints[p.to]:null;
        let rot=to?Math.atan2(to[1]-from[1],to[0]-from[0])-Math.PI/2:name==='head'?pose.state.headAngle: ['torso','neck'].includes(name)?pose.state.lean:0;
        if(name.startsWith('hand')){const elbow=pose.joints['elbow'+name.at(-1)];rot=Math.atan2(from[1]-elbow[1],from[0]-elbow[0])-Math.PI/2;}
        const [x,y]=screenPoint(this.scene,state.camera,from), size=p.size.map(v=>v*actorScale*z),pivot=p.pivot.map(v=>v*actorScale*z);
        const pointing=rig.placeholder && name.startsWith('hand') && pose.state.targets.some(t=>t.type==='point' && t.side===name.at(-1) && t.weight>.5);
        const expression=pointing?'point':name==='head' && rig.expressions?.includes(pose.state.expression)?pose.state.expression:'neutral';
        const key=`${pose.state.rig}:${view}:${name}:${expression}`;
        this.image(key,x-pivot[0],y-pivot[1],...size,rot,pivot,weight);
      }
    }
  }
  render(state,{transparent=false,overlay=false}={}) {
    const G=this.G;G.bind(null,transparent?[0,0,0,0]:[.05,.09,.12,1]);G.blend();
    if(!transparent) {
      if(this.scene.background?.image || this.scene.background?.type==='factory') {
        const p=screenPoint(this.scene,state.camera,[0,0]),k=state.camera.zoom;
        const tex=G.tex('background');this.image('background',p[0],p[1],tex.w*k,tex.h*k);
      }
      this.drawLayers(state,false);
    }
    const drawables=state.props.map(p=>({z:p.z??0,draw:()=>this.prop(p,state)}));
    if(!transparent) for(const light of this.scene.lights??[])drawables.push({z:light.z??10,draw:()=>{
      const [x,y]=screenPoint(this.scene,state.camera,light.position),radius=light.radius*state.camera.zoom;
      this.G.draw(this.glow,{u_color:rgba(light.color??'#ffc77b',light.strength??.2)},G.xf(x-radius,y-radius,2*radius,2*radius));
    }});
    for(const a of state.actors) {
      drawables.push({z:this.scene.actors.find(v=>v.id===a.state.id).z??20,draw:()=>{
        if(!transparent){const p=screenPoint(this.scene,state.camera,a.state.position);this.rect(p[0]-55,p[1]-5,110,18,'#15272e',0,true);}
        this.actor(a,state);
      }});
    }
    if(transparent) drawables.splice(0,state.props.length);
    drawables.sort((a,b)=>a.z-b.z).forEach(v=>v.draw());
    if(!transparent) {
      this.drawLayers(state,true);
      const base=[1050,1070];
      for(let i=0;i<16;i++) {
        const age=(state.t*.3+random(this.scene.seed??1,i))%1,p=screenPoint(this.scene,state.camera,[base[0]+random(this.scene.seed??1,i+20)*65-32,base[1]-age*170]);
        const k=state.camera.zoom;this.G.draw(this.solid,{u_color:[.7,.76,.77,.1*Math.sin(Math.PI*age)],u_disc:1},G.xf(p[0],p[1],(18+age*36)*k,(18+age*36)*k));
      }
      if(state.fade>0)this.G.draw(this.solid,{u_color:[0,0,0,state.fade],u_disc:0},G.xf(0,0,this.scene.width,this.scene.height));
      if(this.scene.notice)this.image('notice',0,0,this.scene.width,70);
    }
    if(overlay) for(const a of state.actors) {
      for(const j of Object.values(a.joints)) {const p=screenPoint(this.scene,state.camera,j);this.rect(p[0]-4,p[1]-4,8,8,'#ed82cf',0,true);}
      const points=Object.values(a.joints).map(p=>screenPoint(this.scene,state.camera,p));
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs)-30,y=Math.min(...ys)-50,w=Math.max(...xs)-x+30,h=Math.max(...ys)-y+25;
      this.rect(x,y,w,2,'#71d7c9');this.rect(x,y+h,w,2,'#71d7c9');this.rect(x,y,2,h,'#71d7c9');this.rect(x+w,y,2,h,'#71d7c9');
    }
    return this.canvas;
  }
  drawLayers(state,foreground) {
    for(const layer of (this.scene.layers??[]).filter(l=>!!l.foreground===foreground).sort((a,b)=>(a.z??0)-(b.z??0))) {
      const [x,y]=screenPoint(this.scene,state.camera,layer.position??[0,0],layer.parallax??1),z=state.camera.zoom;
      const size=layer.size??[this.G.tex(`layer:${layer.id}`).w,this.G.tex(`layer:${layer.id}`).h];
      this.image(`layer:${layer.id}`,x,y,size[0]*z,size[1]*z,0,[0,0],layer.alpha??1);
    }
  }
}
