const labels={author:'บุคคล',topic:'หัวข้อวิจัย',publication:'สิ่งพิมพ์',continent:'ทวีป',country:'ประเทศ',institution:'มหาวิทยาลัย / สถาบัน',institution_type:'ประเภทองค์กร'};
let data=[],links=[];
const $=s=>document.querySelector(s),svg=$('#graph'),view=$('#viewport'),tip=$('#tooltip'),panel=$('#panel'),nav=$('#navigation');
const NS='http://www.w3.org/2000/svg';let width=innerWidth,height=innerHeight,scale=1,tx=width/2,ty=height/2,selected=null,hovered=null,drag=null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,pointer={x:0,y:0},query='',kind='all';
const page='graph';let panelOrigin=null;
function el(tag,attrs,parent){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;}
function drawGraph(){
links.forEach(l=>{
 l.el=el('line',{class:'edge'},$('#edges'));
 l.hit=el('line',{class:'edge-hit',tabindex:0,role:'img','aria-label':`${l.a.name} → ${l.b.name}: ${l.label}`},$('#edges'));
 l.hit.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;pointer={x:e.clientX,y:e.clientY};showEdgeTip(l);});
 l.hit.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};placeTip();});
 l.hit.addEventListener('pointerleave',()=>{tip.hidden=true;});
 l.hit.addEventListener('focus',()=>{const r=l.hit.getBoundingClientRect();pointer={x:r.x+r.width/2,y:r.y+r.height/2};showEdgeTip(l);});
 l.hit.addEventListener('blur',()=>{tip.hidden=true;});
 l.hit.addEventListener('click',e=>{e.stopPropagation();pointer={x:e.clientX,y:e.clientY};showEdgeTip(l);});
});
data.forEach(n=>{n.el=el('g',{class:'node',tabindex:0,role:'button','aria-label':`${n.name} — ${labels[n.type]} คลิกเพื่อดูรายละเอียด`},$('#nodes'));el('circle',{r:n.r,fill:{author:'#888',topic:'#555',publication:'#bbb',continent:'#ccc',country:'#ddd',institution:'#bbb',institution_type:'#ccc'}[n.type]},n.el);
 if(n.drill||n.primary){const count=el('text',{class:'aggregate-count',y:4},n.el);count.textContent=n.primary?(n.name==='KMUTT'?'KMUTT':'สถาบัน'):n.publication_count??'';}
 n.labelEl=el('g',{class:'node-label',hidden:''},$('#node-labels'));
 n.labelLeader=el('line',{class:'label-leader',hidden:'','data-owner':key(n)},$('#label-leaders'));
 n.labelBackground=el('rect',{class:'node-label-background',rx:3},n.labelEl);
 n.nameEl=el('text',{class:'node-name',hidden:''},n.labelEl);
 n.captions={compact:wrapNodeName(n.name,1),expanded:wrapNodeName(n.name,2)};
 updateNodeCaption(n,n.captions.compact);
 n.el.addEventListener('pointerenter',e=>{if(e.pointerType==='touch')return;hovered=n;pointer={x:e.clientX,y:e.clientY};showTip(n);});n.el.addEventListener('pointermove',e=>{pointer={x:e.clientX,y:e.clientY};if(hovered===n&&!drag)placeTip();});n.el.addEventListener('pointerleave',()=>{hovered=null;tip.hidden=true;});
 n.el.addEventListener('focus',()=>{if(drag)return;const r=n.el.getBoundingClientRect();pointer={x:r.right,y:r.top};hovered=n;showTip(n);});n.el.addEventListener('blur',()=>{hovered=null;tip.hidden=true;});
 n.el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPanel(n);}});
});
}
function showTip(n){if(drag)return;tip.replaceChildren();const category=document.createElement('span'),title=document.createElement('strong'),summary=document.createElement('div'),hint=document.createElement('div');category.textContent=labels[n.type];title.textContent=n.name;summary.textContent=n.summary;hint.textContent='คลิกเพื่อดูรายละเอียดทั้งหมด →';hint.className='hint';tip.append(category,title,summary,hint);tip.hidden=false;placeTip();}
function showEdgeTip(l){
 if(drag)return;tip.replaceChildren();para(tip,'ความสัมพันธ์','eyebrow');
 const title=document.createElement('strong');title.textContent=l.label;tip.append(title);
 para(tip,`${l.a.name} → ${l.b.name}`);
 if(l.status&&l.status!=='confirmed')para(tip,'ความสัมพันธ์นี้ยังต้องตรวจสอบ','hint');
 tip.hidden=false;placeTip();
}
function placeTip(){tip.style.left=Math.max(8,Math.min(pointer.x+18,width-268))+'px';tip.style.top=Math.max(8,Math.min(pointer.y+16,height-tip.offsetHeight-12))+'px';}
function transform(){view.setAttribute('transform',`translate(${tx},${ty}) scale(${scale})`);}
function paint(){
 data.forEach(n=>n.el.setAttribute('transform',`translate(${n.x},${n.y})`));
 links.forEach(l=>{for(const line of [l.el,l.hit]){line.setAttribute('x1',l.a.x);line.setAttribute('y1',l.a.y);line.setAttribute('x2',l.b.x);line.setAttribute('y2',l.b.y);}});
 transform();layoutNodeLabels();
}
// Measure captions once in screen pixels so zoom never makes them unreadable.
const nameMeasure=document.createElement('canvas').getContext('2d');
nameMeasure.font='12px Arial, Tahoma, sans-serif';
const graphemes=new Intl.Segmenter('th',{granularity:'grapheme'});
function wrapNodeName(name,maxLines=1){
 let remaining=Array.from(graphemes.segment(name.replace(/\s+/g,' ').trim()),s=>s.segment);
 const lines=[],maxWidth=160;
 while(remaining.length&&lines.length<maxLines){
  let count=0;
  const suffix=lines.length===maxLines-1?'…':'';
  while(count<remaining.length&&nameMeasure.measureText(remaining.slice(0,count+1).join('')+(count+1<remaining.length?suffix:'')).width<=maxWidth)count++;
  count=Math.max(1,count);
  if(maxLines>1&&lines.length===0&&count<remaining.length){
   const space=remaining.slice(0,count).lastIndexOf(' ');
   if(space>count*.5)count=space;
  }
  const line=remaining.splice(0,count).join('').trim();
  lines.push(line+(lines.length===maxLines-1&&remaining.length?'…':''));
  while(remaining[0]===' ')remaining.shift();
 }
 return {lines,width:Math.ceil(Math.max(0,...lines.map(s=>nameMeasure.measureText(s).width)))+12,height:lines.length*16+6};
}
function updateNodeCaption(n,caption){
 if(n.caption===caption)return;
 n.caption=caption;n.nameEl.replaceChildren();
 caption.lines.forEach((line,i)=>{const span=el('tspan',{x:6,y:15+i*16},n.nameEl);span.textContent=line;});
 n.labelBackground.setAttribute('width',caption.width);n.labelBackground.setAttribute('height',caption.height);
}
function boxesOverlap(a,b,gap=5){return a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;}
function boxHitsNode(box,n){
 const x=tx+n.x*scale,y=ty+n.y*scale,r=n.r*scale+5;
 const dx=x-Math.max(box.x,Math.min(x,box.x+box.width)),dy=y-Math.max(box.y,Math.min(y,box.y+box.height));
 return dx*dx+dy*dy<r*r;
}
function labelAnchor(box,x,y){return {x:Math.max(box.x,Math.min(x,box.x+box.width)),y:Math.max(box.y,Math.min(y,box.y+box.height))};}
function leaderForLabel(box,n){
 const x=tx+n.x*scale,y=ty+n.y*scale,r=n.r*scale,end=labelAnchor(box,x,y);
 const dx=end.x-x,dy=end.y-y,d=Math.hypot(dx,dy)||1;
 return {start:{x:x+dx/d*r,y:y+dy/d*r},end};
}
function leaderHitsNode(leader,n){
 const x=tx+n.x*scale,y=ty+n.y*scale,{start:a,end:b}=leader,dx=b.x-a.x,dy=b.y-a.y;
 const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot(x-a.x-t*dx,y-a.y-t*dy)<n.r*scale+2;
}
function layoutNodeLabels(){
 if(page!=='graph')return;
 const placed=[];
 const right=width-(panel.classList.contains('open')?panel.offsetWidth:0)-8;
 const top=Math.max(nav.classList.contains('nav-open')?$('.nav-content').offsetHeight+8:30,$('#explorer-bar').offsetHeight+48);
 // The selected name gets first choice; retain each direction while it stays clear.
 const candidates=data.filter(n=>n.labelWanted).sort((a,b)=>(b===selected)-(a===selected)||key(a).localeCompare(key(b)));
 for(const n of data){
  updateNodeCaption(n,n===selected?n.captions.expanded:n.captions.compact);
  if(!n.labelWanted){n.labelEl.setAttribute('hidden','');n.nameEl.setAttribute('hidden','');n.labelLeader.setAttribute('hidden','');}
 }
 for(const n of candidates){
  const x=tx+n.x*scale,y=ty+n.y*scale,w=n.caption.width,h=n.caption.height,r=n.r*scale;
  const positions=[];
  // Local anchors only: never push a caption into another node's neighborhood.
  for(const clearance of [6,12]){
   const gap=r+clearance,diagonal=gap/Math.SQRT2;
   positions.push(
    {x:x-w/2,y:y+gap},{x:x-w/2,y:y-gap-h},
    {x:x+gap,y:y-h/2},{x:x-gap-w,y:y-h/2},
    {x:x+diagonal,y:y+diagonal},{x:x-diagonal-w,y:y+diagonal},
    {x:x+diagonal,y:y-diagonal-h},{x:x-diagonal-w,y:y-diagonal-h}
   );
  }
  const order=positions.map((p,i)=>({...p,width:w,height:h,index:i}));
  if(n.labelPosition!=null&&n.labelPosition<order.length)order.unshift(order.splice(n.labelPosition,1)[0]);
  const bottom=height-35;
  const box=order.find(b=>{
   if(b.x<8||b.y<top||b.x+w>right||b.y+h>bottom||placed.some(p=>boxesOverlap(b,p))||data.some(other=>boxHitsNode(b,other)))return false;
   const leader=leaderForLabel(b,n),clearance=Math.hypot(leader.end.x-x,leader.end.y-y)-r;
   // The attachment point must belong to this node, with a short unobstructed leader.
   return clearance<=12.01&&!data.some(other=>other!==n&&(leaderHitsNode(leader,other)||Math.hypot(leader.end.x-(tx+other.x*scale),leader.end.y-(ty+other.y*scale))-other.r*scale<clearance-.5));
  });
  // Extremely dense areas remain readable through the full-name tooltip.
  n.labelEl.toggleAttribute('hidden',!box);n.nameEl.toggleAttribute('hidden',!box);n.labelLeader.toggleAttribute('hidden',!box);
  if(!box)continue;
  n.labelPosition=box.index;placed.push(box);
  const leader=leaderForLabel(box,n);
  n.labelLeader.setAttribute('x1',(leader.start.x-tx)/scale);n.labelLeader.setAttribute('y1',(leader.start.y-ty)/scale);
  n.labelLeader.setAttribute('x2',(leader.end.x-tx)/scale);n.labelLeader.setAttribute('y2',(leader.end.y-ty)/scale);
  n.labelLeader.classList.toggle('is-selected',n===selected);
  n.labelEl.setAttribute('transform',`translate(${(box.x-tx)/scale},${(box.y-ty)/scale}) scale(${1/scale})`);
 }
}
function tick(){if(!paused&&page==='graph'){for(const n of data){n.vx-=n.x*.00065;n.vy-=n.y*.00065;}for(let i=0;i<data.length;i++)for(let j=i+1;j<data.length;j++){const a=data[i],b=data[j],dx=b.x-a.x,dy=b.y-a.y,d2=Math.max(dx*dx+dy*dy,80),f=145/d2,d=Math.sqrt(d2);a.vx-=dx/d*f;a.vy-=dy/d*f;b.vx+=dx/d*f;b.vy+=dy/d*f;}for(const l of links){const dx=l.b.x-l.a.x,dy=l.b.y-l.a.y,d=Math.hypot(dx,dy)||1,f=(d-125)*.003;l.a.vx+=dx/d*f;l.a.vy+=dy/d*f;l.b.vx-=dx/d*f;l.b.vy-=dy/d*f;}for(const n of data){if(n.primary||drag?.node===n||hovered===n){n.vx=n.vy=0;continue;}n.vx*=.87;n.vy*=.87;n.x+=n.vx;n.y+=n.vy;}paint();}requestAnimationFrame(tick);}
function section(title){const s=document.createElement('section'),h=document.createElement('h2');h.textContent=title;s.append(h);$('#details').append(s);return s;}
function para(p,s,cls){const n=document.createElement('p');n.textContent=s;if(cls)n.className=cls;p.append(n);return n;}
function related(p,n,label){const b=document.createElement('button');b.className='relation';b.textContent=n.name;const s=document.createElement('small');s.textContent=labels[n.type]+' · '+label;b.append(s);b.onclick=()=>openPanel(data.find(r=>key(r)===key(n))||n);p.append(b);}
function closePanel(restoreFocus=true){panel.classList.remove('open');document.body.classList.remove('panel-open');panel.inert=true;panel.setAttribute('aria-hidden','true');++detailVersion;const old=selected;selected=null;mark();if(restoreFocus){const target=page==='graph'?old?.el:panelOrigin;if(target?.isConnected)target.focus({preventScroll:true});}tip.hidden=true;}
function mark(){filter();}
$('#close-panel').onclick=()=>closePanel();
function navOpen(open){open=open||page!=='graph';nav.classList.toggle('nav-open',open);$('.nav-content').inert=!open;$('#reveal').setAttribute('aria-expanded',String(open));layoutNodeLabels();}
nav.addEventListener('pointerenter',()=>navOpen(true));nav.addEventListener('pointerleave',()=>{if(!nav.contains(document.activeElement))navOpen(false);});$('#reveal').onclick=()=>navOpen(true);$('#reveal').onfocus=()=>navOpen(true);nav.addEventListener('focusout',()=>setTimeout(()=>{if(!nav.contains(document.activeElement)&&!nav.matches(':hover'))navOpen(false);},0));
function filter(){const match=new Set(data.filter(n=>(kind==='all'||n.type===kind)&&(n.name+' '+(n.summary||'')+' '+labels[n.type]).toLowerCase().includes(query)).map(n=>key(n)));const neighborhood=new Set(selected?[key(selected)]:[]);if(selected)links.filter(l=>l.a===selected||l.b===selected).forEach(l=>{neighborhood.add(key(l.a));neighborhood.add(key(l.b));});data.forEach(n=>{const matches=match.has(key(n));n.el.classList.toggle('dim',!matches||!!selected&&!neighborhood.has(key(n)));n.el.classList.toggle('selected',selected===n);n.el.setAttribute('tabindex',matches?'0':'-1');n.el.setAttribute('aria-pressed',String(selected===n));n.el.style.pointerEvents=matches?'':'none';n.labelWanted=(n.aggregate||n.primary||!!selected&&neighborhood.has(key(n)))&&matches;});links.forEach(l=>{const connected=selected===l.a||selected===l.b,matches=match.has(key(l.a))&&match.has(key(l.b));l.el.classList.toggle('connected',connected);l.el.classList.toggle('dim',!matches||!!selected&&!connected);l.hit.style.pointerEvents=matches?'stroke':'none';l.hit.setAttribute('tabindex',matches?'0':'-1');});layoutNodeLabels();$('#count').textContent=match.size+' / '+data.length+' nodes';$('#empty').hidden=page!=='graph'||data.length>0;}
$('#search').oninput=queueSearch;$('#kind').onchange=e=>{kind=e.target.value;filter();searchRecords();};function reset(){kind='all';query='';$('#kind').value='all';$('#search').value='';filter();}$('#reset').onclick=initialize;
function fit(){if(!data.length)return;const xs=data.map(n=>n.x),ys=data.map(n=>n.y),minx=Math.min(...xs)-70,maxx=Math.max(...xs)+70,miny=Math.min(...ys)-70,maxy=Math.max(...ys)+70;const available=width-(panel.classList.contains('open')&&width>700?panel.offsetWidth:0);scale=Math.min(1.4,available/(maxx-minx),(height-220)/(maxy-miny));tx=available/2-(minx+maxx)/2*scale;ty=height/2+35-(miny+maxy)/2*scale;paint();}$('#fit').onclick=fit;
function pauseLabel(){$('#pause').textContent=paused?'ให้กราฟเคลื่อนไหว':'หยุดการเคลื่อนไหว';$('#pause').setAttribute('aria-pressed',String(paused));}$('#pause').onclick=()=>{paused=!paused;pauseLabel();};$('#help').onclick=()=>{$('#instructions').showModal();};
svg.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.edge-hit'))return;const node=data.find(n=>n.el===e.target.closest('.node'));drag={node,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};tip.hidden=true;svg.setPointerCapture(e.pointerId);});
svg.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;drag.lastX=e.clientX;drag.lastY=e.clientY;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>4)drag.moved=true;if(drag.node){drag.node.x+=dx/scale;drag.node.y+=dy/scale;drag.node.vx=drag.node.vy=0;}else{tx+=dx;ty+=dy;}paint();});
svg.addEventListener('pointerup',e=>{if(!drag)return;const d=drag;drag=null;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);if(!d.moved){if(d.node)openPanel(d.node);else if(selected)closePanel(false);}});svg.addEventListener('pointercancel',()=>{drag=null;});
svg.addEventListener('wheel',e=>{e.preventDefault();tip.hidden=true;const before=scale;scale=Math.max(.25,Math.min(3,scale*Math.exp(-e.deltaY*.001)));tx=e.clientX-(e.clientX-tx)*scale/before;ty=e.clientY-(e.clientY-ty)*scale/before;paint();},{passive:false});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){tip.hidden=true;if(panel.classList.contains('open'))closePanel();if(nav.contains(document.activeElement))document.activeElement.blur();navOpen(false);}});window.addEventListener('resize',()=>{width=innerWidth;height=innerHeight;fit();});
// Data and provenance come from the existing read-only backend.
const API_BASE=window.ANT_API_BASE||'http://127.0.0.1:8000/api/v1';
const paths={author:'authors',publication:'publications',topic:'topics'};
let detailVersion=0,graphVersion=0,searchVersion=0,searchTimer;
let searchPage=1,searchRows=[];
const key=n=>`${n.type}:${n.id}`;
function record(type,r){return {id:String(r.id),type,name:r.label||r.title||r.display_name||r.name};}
async function getJSON(path){
 let response;
 try{response=await fetch(API_BASE+path,{signal:AbortSignal.timeout(15000)});}
 catch{throw new Error('เชื่อมต่อข้อมูลไม่ได้ กรุณาตรวจสอบว่า backend เปิดใช้งาน แล้วลองใหม่');}
 const body=await response.json();if(!response.ok)throw new Error(body.error?.message||'โหลดข้อมูลไม่สำเร็จ');return body;
}
function sourceLink(parent,source,id){
 if(!source||id==null)return;
 const a=document.createElement('a');a.textContent=`${source} · ${id}`;a.className='source-link';
 a.href=`${API_BASE}/raw/${encodeURIComponent(source)}/publication/${encodeURIComponent(id)}`;
 a.target='_blank';a.rel='noopener noreferrer';parent.append(a);
}
function installGraph(records,relations){
 closePanel(false);hovered=null;drag=null;tip.hidden=true;
 $('#nodes').replaceChildren();$('#edges').replaceChildren();$('#node-labels').replaceChildren();$('#label-leaders').replaceChildren();
 data=records.map((n,i)=>({...n,name:n.name||n.label,summary:n.summary||(n.year?`ปี ${n.year}`:'ข้อมูลจากเครือข่ายวิชาการ'),x:Math.cos(i*2.399)*Math.sqrt(i+1)*62,y:Math.sin(i*2.399)*Math.sqrt(i+1)*62,vx:0,vy:0,r:n.primary?34:n.drill?24:n.type==='topic'?17:n.type==='author'?13:10}));
 const map=new Map(data.map(n=>[key(n),n]));
 links=relations.map(l=>({...l,a:map.get(l.a),b:map.get(l.b)})).filter(l=>l.a&&l.b);
 drawGraph();filter();fit();
 if(!data.length)$('#graph-status').textContent='ยังไม่มีความสัมพันธ์ที่แสดงได้';
}
function starGraph(n,d){
 const records=new Map([[key(n),n]]),relations=[];
 const add=(type,items,label)=>items?.forEach(r=>{const other=record(type,r);records.set(key(other),other);relations.push({a:key(n),b:key(other),label,evidence:{source:r.source,record_id:r.source_record_id},status:r.match_status});});
 if(n.type==='publication'){add('author',d.authors,'ผู้เขียน');add('topic',d.topics,'หัวข้อที่เกี่ยวข้อง');}
 else add('publication',d.publications,n.type==='author'?'ผู้เขียน':'หัวข้อที่เกี่ยวข้อง');
 return {records:[...records.values()],relations};
}
async function explore(n,showDetails=true){
 enterRecordView(n);
 const version=++graphVersion;$('#network-caption').textContent='กำลังโหลดเครือข่าย…';
 try{
  let records,relations,note='';
  if(n.type==='topic'){
   const b=await getJSON(`/graph?topic_id=${encodeURIComponent(n.id)}&limit=25`);
   records=b.nodes;relations=b.edges.map(e=>({a:`${e.type==='AUTHORED'?'author':'topic'}:${e.source}`,b:`publication:${e.target}`,label:e.type==='AUTHORED'?'ผู้เขียน':'หัวข้อที่เกี่ยวข้อง',evidence:e.evidence,status:'confirmed'}));
   if(b.meta.truncated)note=' · แสดงสิ่งพิมพ์ 25 รายการแรก';
  }else{
   const b=await getJSON(`/${paths[n.type]}/${encodeURIComponent(n.id)}`);({records,relations}=starGraph(n,b.data));
   if(b.data.publications_meta?.total>b.data.publications?.length)note=' · แสดงสิ่งพิมพ์ 20 รายการแรก';
  }
  if(version!==graphVersion)return;
  installGraph(records,relations);$('#network-caption').textContent=`${n.name} · ${records.length} nodes${note}`;
  if(showDetails&&page==='graph'){const target=data.find(r=>key(r)===key(n));if(target)openPanel(target);}
 }catch(error){if(version!==graphVersion)return;$('#network-caption').textContent=error.message;if(!data.length){$('#graph-status').textContent=error.message;$('#empty').hidden=page!=='graph';}}
}
async function openPanel(n){
 if(n.drill){navigateHierarchy(n.drill);return;}
 n=data.find(r=>key(r)===key(n))||n;
 if(!panel.contains(document.activeElement))panelOrigin=document.activeElement;
 selected=n;tip.hidden=true;panel.classList.add('open');document.body.classList.add('panel-open');panel.inert=false;panel.setAttribute('aria-hidden','false');panel.scrollTop=0;mark();
 const content=$('#details');content.replaceChildren();para(content,labels[n.type],'eyebrow');
 const title=document.createElement('h1');title.textContent=n.name;content.append(title);para(content,'กำลังโหลดรายละเอียด…');$('#close-panel').focus({preventScroll:true});
 const version=++detailVersion;
 try{
  const {data:d}=await getJSON(`/${paths[n.type]}/${encodeURIComponent(n.id)}`);if(version!==detailVersion)return;
  content.replaceChildren();para(content,labels[n.type],'eyebrow');content.append(title);
  const meta=section('ข้อมูลทั่วไป'),dl=document.createElement('dl');
  const entries=[['รหัส',n.id],['ประเภท',labels[n.type]]];
  if(n.type==='publication')entries.push(['ปีที่เผยแพร่',d.publication_year],['DOI',d.doi]);
  else entries.push(['สิ่งพิมพ์ที่เชื่อมโยง',d.publications_meta?.total??0]);
  for(const [k,v]of entries){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v??'ไม่มีข้อมูล';dl.append(dt,dd);}meta.append(dl);
  const connections=section('ความสัมพันธ์และหลักฐาน');let total=0;
  const groups=n.type==='publication'?[['author',d.authors],['topic',d.topics]]:[['publication',d.publications]];
  for(const [type,items]of groups)for(const item of items||[]){
   total++;const wrap=document.createElement('div');wrap.className='evidence-item';related(wrap,record(type,item),item.match_status||'ไม่ระบุสถานะ');sourceLink(wrap,item.source,item.source_record_id);connections.append(wrap);
   if(item.match_status&&item.match_status!=='confirmed')para(wrap,'ความสัมพันธ์นี้ยังต้องตรวจสอบ','notice');
  }
  if(!total)para(connections,'ยังไม่มีความสัมพันธ์ในข้อมูลที่นำเข้า');
  if(d.publications_meta?.total>d.publications?.length)para(connections,`แสดง ${d.publications.length} จาก ${d.publications_meta.total} รายการ`,'notice');
  const sources=section('แหล่งที่มา');para(sources,'ข้อมูลจากแหล่งที่นำเข้า ตรวจสอบข้อมูลต้นฉบับได้จากลิงก์ในแต่ละความสัมพันธ์');
  for(const m of d.metrics||[])para(sources,`${m.source} · Citations: ${m.citations??'—'} · FWCI: ${m.fwci??'—'}`);
  para(content,'ความสัมพันธ์กับหัวข้อไม่ได้ยืนยันระดับความชำนาญ และบุคคลเดียวกันอาจมีหลายระเบียนจากต่างแหล่งข้อมูล','notice');
  const expand=document.createElement('button');expand.textContent='สำรวจความสัมพันธ์ในกราฟ';expand.onclick=()=>{explore(n);};content.append(expand);
 }catch(error){if(version===detailVersion){content.replaceChildren(title);para(content,error.message);const retry=document.createElement('button');retry.textContent='ลองใหม่';retry.onclick=()=>openPanel(n);content.append(retry);}}
}
function queueSearch(){++searchVersion;clearTimeout(searchTimer);searchTimer=setTimeout(()=>searchRecords(),300);}
async function searchRecords(more=false){
 const version=++searchVersion,q=$('#search').value.trim();
 if(!more){searchPage=1;searchRows=[];}else searchPage++;
 $('#search-results').hidden=!q;$('#search-more').hidden=true;if(!q)return;
 $('#search-status').textContent='กำลังค้นหา…';if(!more)$('#search-items').replaceChildren();
 try{
  const params=new URLSearchParams({q,type:kind,page:String(searchPage),limit:'20'}),b=await getJSON(`/search?${params}`);if(version!==searchVersion)return;
  searchRows.push(...b.data);$('#search-items').replaceChildren();
  for(const r of searchRows){const n=record(r.type,r),button=document.createElement('button');button.className='relation';button.textContent=n.name;const small=document.createElement('small');small.textContent=labels[n.type];button.append(small);button.onclick=()=>{$('#search-results').hidden=true;$('#search').blur();navOpen(false);explore(n);};$('#search-items').append(button);}
  $('#search-status').textContent=`พบ ${b.meta.total} รายการ · แสดง ${searchRows.length} รายการ`;$('#search-more').hidden=searchRows.length>=b.meta.total;
 }catch(error){if(version===searchVersion){if(more)searchPage--;$('#search-status').textContent=error.message;}}
}
$('#search-more').onclick=()=>searchRecords(true);
async function initialize(){
 const navigationVersion=++hierarchy.navigationVersion;
 $('#empty').hidden=false;$('#graph-status').textContent='กำลังโหลดเครือข่าย…';$('#reset').disabled=true;
 try{
  const params=new URLSearchParams(location.search),type=params.get('type'),id=params.get('id');
  if(paths[type]&&/^\d+$/.test(id||'')){saveHierarchyView();hierarchy.params=scopeParams(params);const b=await getJSON('/'+paths[type]+'/'+encodeURIComponent(id));if(navigationVersion!==hierarchy.navigationVersion)return;await explore(record(type,b.data));return;}
  await loadHierarchy(params);}
 catch(error){if(navigationVersion===hierarchy.navigationVersion)$('#graph-status').textContent=error.message;}finally{if(navigationVersion===hierarchy.navigationVersion)$('#reset').disabled=false;}
}
filter();pauseLabel();tick();initialize();
