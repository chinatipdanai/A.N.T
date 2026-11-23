// Separate document pages for people, academic works and careers.
const $=s=>document.querySelector(s);
const API_BASE=window.ANT_API_BASE||'http://127.0.0.1:8000/api/v1';
const labels={author:'บุคคล',publication:'สิ่งพิมพ์',topic:'หัวข้อวิจัย'};
const paths={author:'authors',publication:'publications',topic:'topics'};
const type={people:'author',academic:'publication'}[document.body.dataset.directory];
let rows=[],page=1,version=0,detailVersion=0,timer,origin,totalPages=0;
function element(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
const record=(type,r)=>({type,id:String(r.id),name:r.label||r.title||r.display_name||r.name});
const graphURL=r=>'index.html?'+new URLSearchParams({type:r.type,id:r.id});
async function getJSON(path){
 let response;try{response=await fetch(API_BASE+path,{signal:AbortSignal.timeout(15000)});}
 catch{throw new Error('เชื่อมต่อข้อมูลไม่ได้ กรุณาตรวจสอบว่า backend เปิดใช้งาน แล้วลองใหม่');}
 const body=await response.json();
 if(response.status===404&&path.startsWith('/records?'))throw new Error('backend ยังไม่มี API รายการ กรุณาหยุดแล้วรัน backend ใหม่เพื่อโหลดเวอร์ชันล่าสุด');
 if(!response.ok)throw new Error(body.error?.message||'โหลดข้อมูลไม่สำเร็จ');return body;
}
function graphLink(r){const a=element('a','แสดงในกราฟ','button-link');a.href=graphURL(r);return a;}
function renderRows(){
 const results=$('#list-results');results.replaceChildren();
 for(const r of rows){
  const article=element('article',null,'list-item'),actions=element('div',null,'list-actions'),details=element('button','ดูรายละเอียด');
  details.onclick=()=>openDetails(r);actions.append(details,graphLink(r));article.append(element('p',labels[r.type]+(r.year?' · '+r.year:''),'eyebrow'),element('h2',r.name),actions);results.append(article);
 }
}
function renderPagination(){
 const pager=$('#list-pagination');pager.hidden=!type||totalPages<1;
 $('#list-prev').disabled=page<=1;$('#list-next').disabled=page>=totalPages;
 $('#list-page').textContent=`หน้า ${page} / ${totalPages}`;
 const numbers=$('#list-pages');numbers.replaceChildren();
 const pages=[1,page-1,page,page+1,totalPages].filter((n,i,a)=>n>=1&&n<=totalPages&&a.indexOf(n)===i).sort((a,b)=>a-b);
 for(let i=0;i<pages.length;i++){
  if(i&&pages[i]-pages[i-1]>1)numbers.append(element('span','…'));
  const n=pages[i],b=element('button',String(n));if(n===page){b.setAttribute('aria-current','page');b.className='active';}
  b.setAttribute('aria-label',`หน้า ${n}`);b.onclick=()=>renderList(n);numbers.append(b);
 }
}
async function renderList(targetPage=1,updateURL=true){
 const current=++version,q=$('#list-search').value.trim();
 targetPage=Math.max(1,Number(targetPage)||1);
 $('#list-empty').hidden=true;$('#list-pagination').hidden=true;rows=[];renderRows();
 if(!type){$('#list-count').textContent='0 รายการ';$('#list-empty').textContent='ยังไม่มีข้อมูลอาชีพเชื่อมต่อกับระบบ';$('#list-empty').hidden=false;return;}
 if($('#panel').classList.contains('open'))closeDetails();
 if(updateURL){const u=new URL(location.href);u.search='';if(q)u.searchParams.set('q',q);if(targetPage>1)u.searchParams.set('page',targetPage);if(u.href!==location.href)history.pushState(null,'',u);}
 $('#list-count').textContent='กำลังโหลด…';$('#list-results').setAttribute('aria-busy','true');
 try{
  const params=new URLSearchParams({q,type,page:String(targetPage),limit:'20'}),body=await getJSON('/records?'+params);
  if(current!==version)return;
  page=body.meta.page;totalPages=body.meta.pages;
  if(totalPages&&page>totalPages){const u=new URL(location.href);u.searchParams.set('page',totalPages);history.replaceState(null,'',u);return renderList(totalPages,false);}
  rows=body.data.map(r=>({...record(r.type,r),year:r.year}));renderRows();
  $('#list-count').textContent=body.meta.total?`แสดง ${(page-1)*body.meta.limit+1}–${(page-1)*body.meta.limit+rows.length} จาก ${body.meta.total.toLocaleString()} รายการ`:'0 รายการ';
  $('#list-empty').textContent=q?'ไม่พบรายการที่ตรงกับคำค้นหา':'ยังไม่มีข้อมูลในฐานข้อมูล';$('#list-empty').hidden=body.meta.total>0;renderPagination();
 }catch(error){if(current!==version)return;$('#list-count').textContent='';$('#list-empty').replaceChildren(element('span',error.message+' '));const retry=element('button','ลองใหม่');retry.onclick=()=>renderList(targetPage,false);$('#list-empty').append(retry);$('#list-empty').hidden=false;}
 finally{if(current===version)$('#list-results').setAttribute('aria-busy','false');}
}
function section(title){const s=element('section');s.append(element('h2',title));$('#details').append(s);return s;}
async function openDetails(r){
 if(!$('#panel').contains(document.activeElement))origin=document.activeElement;
 const current=++detailVersion,panel=$('#panel'),content=$('#details');
 panel.classList.add('open');document.body.classList.add('panel-open');panel.inert=false;panel.setAttribute('aria-hidden','false');panel.scrollTop=0;
 content.replaceChildren(element('p',labels[r.type],'eyebrow'),element('h1',r.name),element('p','กำลังโหลดรายละเอียด…'));$('#close-panel').focus({preventScroll:true});
 try{
  const {data:d}=await getJSON('/'+paths[r.type]+'/'+encodeURIComponent(r.id));if(current!==detailVersion)return;
  content.replaceChildren(element('p',labels[r.type],'eyebrow'),element('h1',r.name));
  const meta=section('ข้อมูลทั่วไป'),dl=element('dl'),entries=[['รหัส',r.id],['ประเภท',labels[r.type]]];
  if(r.type==='publication')entries.push(['ปีที่เผยแพร่',d.publication_year],['DOI',d.doi]);else entries.push(['สิ่งพิมพ์ที่เชื่อมโยง',d.publications_meta?.total??0]);
  for(const [k,v]of entries)dl.append(element('dt',k),element('dd',v??'ไม่มีข้อมูล'));meta.append(dl);
  const connections=section('ความสัมพันธ์และหลักฐาน'),groups=r.type==='publication'?[['author',d.authors],['topic',d.topics]]:[['publication',d.publications]];
  let count=0;
  for(const [kind,items]of groups)for(const item of items||[]){
   count++;const next=record(kind,item),wrap=element('div',null,'evidence-item'),b=element('button',next.name,'relation');b.append(element('small',`${labels[kind]} · ${item.match_status||'ไม่ระบุสถานะ'}`));b.onclick=()=>openDetails(next);wrap.append(b);
   if(item.source&&item.source_record_id!=null){const a=element('a',`${item.source} · ${item.source_record_id}`,'source-link');a.href=`${API_BASE}/raw/${encodeURIComponent(item.source)}/publication/${encodeURIComponent(item.source_record_id)}`;a.target='_blank';a.rel='noopener noreferrer';wrap.append(a);}
   if(item.match_status&&item.match_status!=='confirmed')wrap.append(element('p','ความสัมพันธ์นี้ยังต้องตรวจสอบ','notice'));connections.append(wrap);
  }
  if(!count)connections.append(element('p','ยังไม่มีความสัมพันธ์ในข้อมูลที่นำเข้า'));
  if(d.publications_meta?.total>d.publications?.length)connections.append(element('p',`แสดง ${d.publications.length} จาก ${d.publications_meta.total} รายการ`,'notice'));
  const sources=section('แหล่งที่มา');sources.append(element('p','ตรวจสอบข้อมูลต้นฉบับได้จากลิงก์ในแต่ละความสัมพันธ์'));
  for(const m of d.metrics||[])sources.append(element('p',`${m.source} · Citations: ${m.citations??'—'} · FWCI: ${m.fwci??'—'}`));
  content.append(element('p','ความสัมพันธ์กับหัวข้อไม่ได้ยืนยันระดับความชำนาญ และบุคคลเดียวกันอาจมีหลายระเบียนจากต่างแหล่งข้อมูล','notice'),graphLink(r));
 }catch(error){if(current!==detailVersion)return;content.replaceChildren(element('h1',r.name),element('p',error.message));const retry=element('button','ลองใหม่');retry.onclick=()=>openDetails(r);content.append(retry);}
}
function closeDetails(){++detailVersion;$('#panel').classList.remove('open');document.body.classList.remove('panel-open');$('#panel').inert=true;$('#panel').setAttribute('aria-hidden','true');if(origin?.isConnected)origin.focus({preventScroll:true});}
$('#close-panel').onclick=closeDetails;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetails();});
$('#directory').addEventListener('click',e=>{if(!e.target.closest('button,input,a,.list-item'))closeDetails();});
$('#directory-search').onsubmit=e=>{e.preventDefault();clearTimeout(timer);renderList();};
$('#list-search').oninput=()=>{++version;clearTimeout(timer);timer=setTimeout(()=>renderList(),300);};
$('#list-prev').onclick=()=>renderList(page-1);$('#list-next').onclick=()=>renderList(page+1);
$('#directory-description').textContent=type?'รายการทั้งหมดในฐานข้อมูล · ค้นหาและเลือกหน้าที่ต้องการ':'บทบาทอาชีพและทักษะที่เกี่ยวข้อง';
if(!type){$('#directory-search').hidden=true;$('#list-search').disabled=true;}
function restoreList(){clearTimeout(timer);const p=new URLSearchParams(location.search);$('#list-search').value=p.get('q')||'';renderList(Number(p.get('page'))||1,false);}
window.addEventListener('popstate',restoreList);restoreList();
