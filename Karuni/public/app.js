'use strict';
const $=id=>document.getElementById(id),path=location.pathname,fmt=new Intl.NumberFormat('en-US',{maximumFractionDigits:6});
const text=(id,v)=>{$(id).textContent=v},status=v=>{text('status',v);if(v)setTimeout(()=>{if($('status').textContent===v)text('status','')},4200)};
async function api(p,data){const r=await fetch(p,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});let j={};try{j=await r.json()}catch{}if(!r.ok)throw Error(j.error?.message||'Request failed');return j}
const safe=fn=>async e=>{e?.preventDefault();try{await fn(e)}catch(x){status(x.message)}};
const fields=e=>Object.fromEntries(new FormData(e.currentTarget));
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
function empty(box,title,sub){box.replaceChildren();const d=el('div','empty');d.append(el('b','',title),el('span','',sub));box.append(d)}
function list(box,items,none,render){box.replaceChildren();if(!items.length)return empty(box,none[0],none[1]);for(const x of items){const row=el('div','item');render(row,x);box.append(row)}}
const origin=location.origin;
function snippet(model){const body=JSON.stringify({model,messages:[{role:'user',content:'Hello'}],max_tokens:64},null,2);return ['curl '+origin+'/v1/chat/completions \\', '  -H "Authorization: Bearer $KARUNI_API_KEY" \\', '  -H "Content-Type: application/json" \\', "  -d '"+body+"'"].join('\n')}
import('/connection.js').then(({connection})=>connection(document.querySelector('#docs .side')));
// Home: catalog + snippet
async function home(){
 let models=[];try{models=await api('/api/catalog')}catch{}
 const box=$('catalog');box.replaceChildren();
 if(!models.length)empty(box,'No models published yet','Models appear here once they are available on Karuni.');
 else{const head=el('div','trow thead');for(const h of ['Model','Developer','Input / 1M','Output / 1M'])head.append(el('span','',h));box.append(head);
  for(const m of models){const row=el('div','trow'),name=el('div');name.append(el('strong','',m.name),el('small','',m.id));row.append(name,el('span','fam',m.family),el('span','num','Rp '+fmt.format(m.input/1e6)),el('span','num','Rp '+fmt.format(m.output/1e6)));box.append(row)}}
 text('snippet',snippet(models[0]?.id||'MODEL_ID'));
 $('copy-code').onclick=safe(async()=>{await navigator.clipboard.writeText($('snippet').textContent);status('Copied to clipboard')});
}
async function account(){
 let a;try{a=await api('/api/account')}catch{$('login').hidden=false;$('account').hidden=true;$('admin').hidden=true;return}
 if(path==='/dashboard'){await (await import('/workspace.js')).mount(a);return}
 $('login').hidden=true;$('account').hidden=false;text('console-title','Dashboard');
 text('balance',`${a.email} · Available Balance: ${fmt.format(a.balance/1e6)} credits`);$('admin-link').hidden=!['admin','master'].includes(a.role);
 list($('keys'),a.keys,['No API keys yet','Create your first key to get started.'],(r,k)=>{r.append(el('span','',`${k.name}`),el('small','',`${k.prefix}… · ${k.active?'active':'revoked'}`));if(k.active){const b=el('button','btn ghost','Revoke');b.type='button';b.onclick=safe(async()=>{await api('/api/revoke',{id:k.id});await account()});r.append(b)}});
 list($('history'),a.history,['No usage yet','Your requests will appear here.'],(r,x)=>{r.append(el('span','',`${x.model} · ${x.state}`),el('small','',`${x.at} UTC · ${x.charge==null?'cost pending':'cost '+fmt.format(x.charge/1e6)+' credits'}`))});
 if(path==='/admin'){if(['admin','master'].includes(a.role)){$('admin').hidden=false;$('account').hidden=true;text('console-title','Admin');await admin()}else status('Admin access required')}
}
async function admin(){text('inventory',JSON.stringify(await api('/api/admin/state'),null,2))}
function wire(){
 const invite=new URLSearchParams(location.search).get('invite');if(invite)$('login').elements.invite.value=invite;
 $('login').onsubmit=safe(async e=>{await api('/api/login',fields(e));e.target.reset();await account()});
 $('register').onclick=safe(async()=>{const f=$('login');if(!f.reportValidity())return;await api('/api/register',Object.fromEntries(new FormData(f)));f.reset();await account()});
 $('logout').onclick=safe(async()=>{await api('/api/logout',{});$('new-key').hidden=true;text('new-key','');await account()});
 $('create-key').onsubmit=safe(async e=>{const r=await api('/api/key',fields(e));text('new-key','Copy your key now. It will not be shown again:\n'+r.key);$('new-key').hidden=false;e.target.reset();await account()});
 $('sync').onclick=safe(async()=>{const r=await api('/api/admin/sync',{});await admin();status(`${r.count} models checked`)});
 $('model').onsubmit=safe(async e=>{await api('/api/admin/model',JSON.parse(fields(e).value));await admin();status('Settings saved')});
 $('adjust').onsubmit=safe(async e=>{const b=fields(e);if(!b.reason?.trim()||!b.password)throw Error('Reason and password are required');const r=await api('/api/admin/adjust',{uid:Number(b.uid),delta:Number(b.delta),ref:b.ref,reason:b.reason.trim(),password:b.password});e.target.elements.password.value='';status(r.applied?'Adjustment applied':'Reference already recorded')});
}
// Model families: logos, developer filter, search
async function showcase(){
 let data=[];try{data=await (await fetch('/showcase.json')).json()}catch{return}
 const mono=new Set(['openai','grok','kimi','elevenlabs']),logos=new Map();
 for(const x of data)if(!logos.has(x.dev))logos.set(x.dev,x.logo);
 const mark=(dev,cls)=>{const f=logos.get(dev);if(f){const i=el('img',cls||'');i.src='/brands/'+f+'.svg';i.alt='';i.loading='lazy';if(mono.has(f))i.classList.add('mono');return i}return el('b','',dev.replace(/[^A-Za-z]/g,'').slice(0,2).toUpperCase())};
 const devs=[...logos.keys()],loop=[...devs,...devs];
 const track=$('marquee');track.replaceChildren();for(const d of loop){const s=el('span');s.append(mark(d),d);track.append(s)}
 let dev='All',more=false;const LIM=12;
 const chips=$('chips');
 const drawChips=()=>{chips.replaceChildren();for(const d of ['All',...devs]){const b=el('button','chip',d);b.type='button';b.setAttribute('aria-pressed',String(d===dev));b.onclick=()=>{dev=d;more=false;drawChips();draw()};chips.append(b)}};
 const draw=()=>{const q=$('sc-search').value.trim().toLowerCase();const m=data.filter(x=>(dev==='All'||x.dev===dev)&&(x.id+' '+x.dev).toLowerCase().includes(q));const shown=more||q||dev!=='All'?m:m.slice(0,LIM);const g=$('sc-grid');g.replaceChildren();
  if(!m.length)empty(g,'No matching models','Try a different search or developer.');
  for(const x of shown){const c=el('article','mcard'),h=el('div','mhead'),l=el('div','logo');l.append(mark(x.dev));const t=el('div');t.append(el('small','','Developer'),el('span','',x.dev));h.append(l,t);c.append(h,el('div','mid',x.id),el('span','kind',x.kind));g.append(c)}
  const b=$('sc-more');b.hidden=Boolean(q)||dev!=='All'||data.length<=LIM;b.textContent=more?'Show less':`View all ${data.length} models`;};
 $('sc-search').oninput=()=>{more=false;draw()};$('sc-more').onclick=()=>{more=!more;draw()};drawChips();draw();
}

wire();
if(path==='/dashboard'||path==='/admin'){$('home').hidden=true;$('console').hidden=false;safe(account)()}
else{home();showcase();if(path==='/models'||path==='/docs')requestAnimationFrame(()=>document.getElementById(path==='/docs'?'docs':'models').scrollIntoView())}
