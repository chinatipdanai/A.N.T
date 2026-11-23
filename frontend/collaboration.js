// KMUTT -> country -> institution -> publications / affiliated authors.
const hierarchy={params:new URLSearchParams(),cache:new Map(),active:false,current:null,cacheKey:null,navigationVersion:0};
const countryNames=new Intl.DisplayNames(['th'],{type:'region'});
const continentNames={AS:'เอเชีย (ต่างประเทศ)',EU:'ยุโรป',AF:'แอฟริกา',NA:'อเมริกาเหนือ',SA:'อเมริกาใต้',OC:'โอเชียเนีย',AN:'แอนตาร์กติกา',UNKNOWN:'ไม่ระบุประเทศ / ทวีป'};
function continentName(code){return continentNames[code]||continentNames.UNKNOWN;}
function rootScope(p){return p.get('overview')==='countries'?{overview:'countries'}:{};}
function geographyScope(p){return {...rootScope(p),...(p.get('continent')?{continent:p.get('continent')}:{})};}
const institutionTypeNames={education:'มหาวิทยาลัย / สถานศึกษา',company:'บริษัท',government:'หน่วยงานรัฐ',nonprofit:'องค์กรไม่แสวงหากำไร',facility:'Facility / หน่วยงานเฉพาะทาง',healthcare:'หน่วยงานด้านสุขภาพ',archive:'หน่วยงานคลังข้อมูล',funder:'หน่วยงานให้ทุน',other:'ประเภทอื่น',unknown:'ไม่ระบุประเภท'};
function institutionTypeName(code){return institutionTypeNames[code]||institutionTypeNames.unknown;}
function countryScope(p){return {...geographyScope(p),country:p.get('country'),...(p.get('group_by')==='type'||p.get('institution_type')?{group_by:'type'}:{})};}
function parentInstitutionScope(p){return {...countryScope(p),...(p.get('institution_type')?{institution_type:p.get('institution_type')}:{})};}
function countryName(code){return code==='ZZ'?'ไม่ระบุประเทศ':countryNames.of(code)||code;}
function scopeParams(params){const p=new URLSearchParams(params);for(const k of ['type','id','page','limit','all'])p.delete(k);return p;}
function hierarchyURL(params){const s=new URLSearchParams(params).toString();return 'index.html'+(s?'?'+s:'');}
function saveHierarchyView(){
 if(!hierarchy.active||!hierarchy.current)return;
 const state=hierarchy.cache.get(hierarchy.cacheKey);
 if(state)state.view={positions:data.map(n=>({id:key(n),x:n.x,y:n.y})),scale,tx,ty};
}
function hierarchyLink(label,params){
 const a=document.createElement('a');a.textContent=label;a.href=hierarchyURL(params);
 a.onclick=e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();navigateHierarchy(params);};return a;
}
function renderBreadcrumb(record=null){
 const p=hierarchy.params,breadcrumb=$('#breadcrumbs');breadcrumb.replaceChildren(hierarchyLink('KMUTT',rootScope(p)));
 const add=(label,params)=>{const separator=document.createElement('span');separator.textContent='›';separator.setAttribute('aria-hidden','true');breadcrumb.append(separator,hierarchyLink(label,params));};
 if(p.get('continent'))add(continentName(p.get('continent')),geographyScope(p));
 if(p.get('country'))add(countryName(p.get('country')),countryScope(p));
 if(p.get('institution_type'))add(institutionTypeName(p.get('institution_type')),parentInstitutionScope(p));
 if(p.get('institution'))add(p.get('institution_name')||hierarchy.current?.scope.institution?.label||'สถาบัน',Object.fromEntries(p));
 if(record){const s=document.createElement('span');s.textContent='› '+record.name;breadcrumb.append(s);}
 const last=breadcrumb.lastElementChild;if(last)last.setAttribute('aria-current','page');
}
function navigateHierarchy(params){
 saveHierarchyView();++hierarchy.navigationVersion;const next=new URLSearchParams(params);
 history.pushState(null,'',hierarchyURL(next));loadHierarchy(next);
}
async function loadHierarchy(params=new URLSearchParams(location.search)){
 saveHierarchyView();const p=scopeParams(params);hierarchy.params=p;hierarchy.active=true;
 const version=++graphVersion;closePanel(false);$('#empty').hidden=false;$('#graph-status').textContent='กำลังโหลดความร่วมมือ…';$('#reset').disabled=true;
 $('#search-results').hidden=true;$('#institution-views').hidden=true;$('#country-grouping').hidden=true;$('#overview-mode').hidden=true;
 $('#kind').value='all';kind='all';paused=true;pauseLabel();renderBreadcrumb();$('#scope-summary').textContent='กำลังโหลด…';
 try{
  const cacheKey=p.toString(),cached=hierarchy.cache.get(cacheKey),request=new URLSearchParams(p);request.delete('institution_name');request.set('all','1');request.set('overview',p.get('overview')||'continents');
  const body=cached?.body||await getJSON('/collaborations?'+request);
  if(version!==graphVersion)return;
  if(body.items.length!==body.meta.total)throw new Error('backend ยังแบ่งหน้ากราฟอยู่ กรุณาหยุดแล้วรัน backend ใหม่เพื่อโหลดเวอร์ชันล่าสุด');
  if(request.get('overview')==='continents'&&body.scope.overview!=='continents')throw new Error('backend ยังไม่รองรับการจัดตามทวีป กรุณาหยุดแล้วรัน backend ใหม่เพื่อโหลดเวอร์ชันล่าสุด');
  if((p.get('group_by')==='type'||p.get('institution_type'))&&body.scope.group_by==null)throw new Error('backend ยังไม่รองรับการแบ่งประเภทองค์กร กรุณาหยุดแล้วรัน backend ใหม่เพื่อโหลดเวอร์ชันล่าสุด');
  hierarchy.current=body;hierarchy.cacheKey=cacheKey;
  const records=[],relations=[],scope=body.scope;
  const center={id:'root',type:'institution',name:scope.institution?.label||'KMUTT',summary:'เลือกทวีป ประเทศ ประเภทองค์กร หรือสถาบันเพื่อสำรวจสิ่งพิมพ์ร่วม',drill:p.get('institution')?parentInstitutionScope(p):rootScope(p),primary:true};
  records.push(center);
  for(const item of body.items){
   const name=item.type==='continent'?continentName(item.id):item.type==='country'?countryName(item.id):item.type==='institution_type'?institutionTypeName(item.id):item.label;
   const drill=item.type==='continent'?{...rootScope(p),continent:item.id}:item.type==='country'?{...geographyScope(p),country:item.id,...(body.level==='continents'&&item.id==='TH'?{group_by:'type'}:{})}:item.type==='institution_type'?{...countryScope(p),institution_type:item.id}:item.type==='institution'?{...parentInstitutionScope(p),institution:item.id,institution_name:item.label}:null;
   const typeDescription=item.type==='institution_type'?item.id:item.institution_type;
   records.push({...item,name,summary:`${item.publication_count??1} สิ่งพิมพ์ร่วม${item.institution_count!=null?' · '+item.institution_count+' สถาบัน':''}${item.country_count!=null?' · '+item.country_count+' ประเทศ / กลุ่ม':''}${typeDescription?' · '+institutionTypeName(typeDescription):''}${typeDescription==='facility'?' (ประเภทจากต้นทาง ยังไม่ได้ยืนยันว่าเป็นแล็บ)':''}`,drill,aggregate:true});
   relations.push({a:key(center),b:`${item.type}:${item.id}`,label:item.publication_count?`${item.publication_count} สิ่งพิมพ์ร่วม`:'สิ่งพิมพ์ร่วม',status:'confirmed'});
  }
  installGraph(records,relations);
  let ring=1,slot=0;
  data.forEach((n,i)=>{
   if(!i){n.x=n.y=0;return;}
   const capacity=Math.min(16*ring,data.length-1-(8*(ring-1)*ring));
   const angle=slot/Math.max(1,capacity)*Math.PI*2-Math.PI/2,radius=240*ring;
   n.x=Math.cos(angle)*radius;n.y=Math.sin(angle)*radius*.85;
   if(++slot>=capacity){ring++;slot=0;}
  });
  if(cached?.view){const v=cached.view,map=new Map(v.positions.map(n=>[n.id,n]));data.forEach(n=>{const pos=map.get(key(n));if(pos){n.x=pos.x;n.y=pos.y;}});scale=v.scale;tx=v.tx;ty=v.ty;}
  else fit();
  hierarchy.cache.set(cacheKey,{body,view:cached?.view});
  renderBreadcrumb();
  const summary=body.summary;
  $('#scope-summary').textContent=`${summary.publications.toLocaleString()} สิ่งพิมพ์ร่วม · ${summary.institutions.toLocaleString()} สถาบัน${!p.get('country')?' · '+summary.countries+' ประเทศ / กลุ่ม':''}`;
  $('#network-caption').textContent=body.level==='continents'?'จำนวนในวงกลม = สิ่งพิมพ์ร่วม · ประเทศไทยแยกจากเอเชีย · ผลรวมกลุ่มอาจมีผลงานซ้ำกัน':'นับสิ่งพิมพ์ไม่ซ้ำ · ประเทศตามสังกัดสถาบัน ไม่ใช่สัญชาติผู้เขียน';
  $('#overview-mode').hidden=!!p.get('country')||!!p.get('continent')||!!scope.institution;
  document.querySelectorAll('[data-overview]').forEach(b=>{const active=b.dataset.overview===(p.get('overview')||'continents');b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('#institution-views').hidden=!scope.institution;
  $('#country-grouping').hidden=!p.get('country')||!!scope.institution;
  document.querySelectorAll('[data-country-grouping]').forEach(b=>{const active=b.dataset.countryGrouping===(p.get('institution_type')?'type':p.get('group_by')||'none');b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  document.querySelectorAll('[data-institution-view]').forEach(b=>{const active=b.dataset.institutionView===(p.get('view')||'publications');b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('#scope-summary').textContent+=` · แสดงครบ ${body.items.length.toLocaleString()} ${body.level==='continents'?'ทวีป / กลุ่ม':body.level==='countries'?'ประเทศ / กลุ่ม':body.level==='institution_types'?'ประเภทองค์กร':body.level==='institutions'?'สถาบัน':body.level==='authors'?'บุคคล':'สิ่งพิมพ์'}`;
  $('#empty').hidden=body.items.length>0;
  if(!body.items.length)$('#graph-status').textContent=body.level==='authors'?'ยังไม่มีข้อมูลยืนยันสังกัดของบุคคลในผลงานร่วมชุดนี้':'ยังไม่มีสิ่งพิมพ์ร่วมในข้อมูลที่นำเข้าสำหรับกลุ่มนี้';
  paint();
 }catch(error){if(version!==graphVersion)return;$('#graph-status').textContent=error.message;$('#scope-summary').textContent='โหลดความร่วมมือไม่สำเร็จ';$('#empty').hidden=false;}
 finally{if(version===graphVersion)$('#reset').disabled=false;}
}
function enterRecordView(n){
 saveHierarchyView();hierarchy.active=false;paused=matchMedia('(prefers-reduced-motion: reduce)').matches;pauseLabel();$('#institution-views').hidden=true;$('#country-grouping').hidden=true;$('#overview-mode').hidden=true;
 renderBreadcrumb(n);$('#scope-summary').textContent='ความสัมพันธ์ของ'+(labels[n.type]||'รายการ')+'ที่เลือก';
 const params=new URLSearchParams(hierarchy.params);params.set('type',n.type);params.set('id',n.id);
 if(location.search!=='?'+params.toString())history.pushState(null,'',hierarchyURL(params));
}
window.addEventListener('popstate',()=>initialize());
document.querySelectorAll('[data-institution-view]').forEach(b=>b.onclick=()=>{const p=new URLSearchParams(hierarchy.params);p.set('view',b.dataset.institutionView);p.delete('page');navigateHierarchy(p);});
document.querySelectorAll('[data-country-grouping]').forEach(b=>b.onclick=()=>{const p=countryScope(hierarchy.params);if(b.dataset.countryGrouping==='type')p.group_by='type';else delete p.group_by;navigateHierarchy(p);});
document.querySelectorAll('[data-overview]').forEach(b=>b.onclick=()=>navigateHierarchy(b.dataset.overview==='countries'?{overview:'countries'}:{}));
