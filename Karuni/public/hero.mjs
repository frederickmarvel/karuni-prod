import * as T from '/three.mjs';
const stage=document.querySelector('.stage');
if(stage&&location.pathname==='/'){const go=()=>{if(stage.getBoundingClientRect().width>0)boot();else requestAnimationFrame(go)};go()}
function boot(){
 const canvas=stage.querySelector('canvas');let r;try{r=new T.WebGLRenderer({canvas,alpha:true,antialias:true, powerPreference:'high-performance'});}catch{return}
 const scene=new T.Scene(), cam=new T.PerspectiveCamera(38,1,.1,80);cam.position.set(0,.15,8.6);const rig=new T.Group();scene.add(rig);
 const geom=new T.TorusKnotGeometry(1.24,.37,220,24,2,3);
 const pos=geom.attributes.position;for(let i=0;i<pos.count;i++){let x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);pos.setXYZ(i,x,y,z+.22*Math.sin(x*2));}geom.computeVertexNormals();
 const mat=new T.ShaderMaterial({uniforms:{},vertexShader:`varying vec3 n;varying vec3 v;varying vec3 p;void main(){vec4 m=modelViewMatrix*vec4(position,1.);v=-m.xyz;n=normalize(normalMatrix*normal);p=position;gl_Position=projectionMatrix*m;}`,fragmentShader:`varying vec3 n;varying vec3 v;varying vec3 p;void main(){vec3 N=normalize(n);vec3 V=normalize(v);float f=pow(1.-max(dot(N,V),0.),2.4);float l=max(dot(N,normalize(vec3(-.5,.8,.8))),0.);float s=pow(max(dot(reflect(-normalize(vec3(.6,.8,1.)),N),V),0.),28.);float b=.5+.5*sin(8.*N.x+5.*N.y+3.*p.z);vec3 c=mix(vec3(.16,.115,.06),vec3(.62,.47,.25),b*l)+f*mix(vec3(.85,.62,.28),vec3(1.,.9,.62),b)+s*.9;gl_FragColor=vec4(c,1.);}`});
 const sculpture=new T.Mesh(geom,mat);rig.add(sculpture);rig.rotation.set(.47,-.36,.49);
 const tracks=new T.Group();scene.add(tracks);for(let k=0;k<3;k++){const pts=[];for(let i=0;i<160;i++){const a=i/160*Math.PI*2;pts.push(new T.Vector3(2.34*Math.cos(a),.82*Math.sin(a),0))}const t=new T.LineLoop(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:k===1?0x9fc7ac:0xd9b46a,transparent:true,opacity:.38}));t.rotation.set(.96,k*.71,.25+k*1.03);tracks.add(t);const bead=new T.Mesh(new T.SphereGeometry(.037,10,10),new T.MeshBasicMaterial({color:k===1?0xf0d79c:0xd9b46a}));bead.position.copy(pts[13+k*43]);t.add(bead);}
 let seed=314;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};const stars=[];for(let i=0;i<180;i++)stars.push((rand()-.5)*9,(rand()-.5)*6,-4+rand()*3);const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute(stars,3));scene.add(new T.Points(sg,new T.PointsMaterial({color:0xc9b88f,size:.023,transparent:true,opacity:.7})));
 let x=0,y=0,visible=true,next=0;const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 function draw(t){next=0;if(!visible||document.hidden||!stage.clientWidth)return;sculpture.rotation.y=t*.00021;rig.rotation.x=.47+y*.32;rig.rotation.z=.49+x*.22;tracks.rotation.y=t*.00009;r.render(scene,cam);stage.classList.add('rendered');if(!reduce.matches)next=requestAnimationFrame(draw);}
 function refresh(){if(!next)next=requestAnimationFrame(draw)}
 new ResizeObserver(()=>{const {width,height}=stage.getBoundingClientRect();if(!width||!height)return;r.setPixelRatio(Math.min(devicePixelRatio,1.65));r.setSize(width,height,false);cam.aspect=width/height;cam.fov=cam.aspect<1?48:38;cam.updateProjectionMatrix();refresh()}).observe(stage);
 new IntersectionObserver(([e])=>{visible=e.isIntersecting;refresh()}).observe(stage);document.addEventListener('visibilitychange',refresh);reduce.addEventListener('change',refresh);
 stage.addEventListener('pointermove',e=>{if(reduce.matches)return;const b=stage.getBoundingClientRect();x=(e.clientX-b.left)/b.width-.5;y=(e.clientY-b.top)/b.height-.5});stage.addEventListener('pointerleave',()=>{x=0;y=0});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;stage.classList.remove('rendered')});canvas.addEventListener('webglcontextrestored',()=>{visible=true;refresh()});refresh();
}
