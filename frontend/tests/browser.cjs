// Dependency-free Chromium smoke test. Run: node frontend/tests/browser.cjs
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const {spawn} = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(),'ant-browser-'));
const fixtures = {
  nodes:[{id:'1',type:'topic',label:'Nanofluid'},{id:'1',type:'author',label:'Researcher A'},{id:'1',type:'publication',label:'Heat transfer study'}],
  edges:[{source:'1',target:'1',type:'AUTHORED',evidence:{source:'openalex',record_id:'W1'}},{source:'1',target:'1',type:'HAS_TOPIC',evidence:{source:'openalex',record_id:'W1'}}],
  meta:{truncated:false}
};
let offline = false,graphRequests=0;
const server = http.createServer(async (req,res)=>{
  const url = new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
    if(process.env.ANT_LIVE_API){try{const response=await fetch(process.env.ANT_LIVE_API+url.pathname.slice(4)+url.search);res.writeHead(response.status,{'Content-Type':'application/json'});res.end(await response.text());}catch(error){res.writeHead(503);res.end(JSON.stringify({error:{message:error.message}}));}return;}
    res.setHeader('Content-Type','application/json');
    if(offline){res.writeHead(503);res.end(JSON.stringify({error:{message:'Test backend unavailable'}}));return;}
    let body;
    if(url.pathname==='/api/records'){
      const type=url.searchParams.get('type'),page=Number(url.searchParams.get('page')||1),limit=Number(url.searchParams.get('limit')||20);
      const all=url.searchParams.get('q')==='missing'?[]:Array.from({length:41},(_,i)=>({id:String(i+1),type,label:type==='author'?(i?'Person '+(i+1):'Researcher A'):(i?'Paper '+(i+1):'Heat transfer study'),year:type==='publication'?2025:undefined}));
      body={data:all.slice((page-1)*limit,page*limit),meta:{page,limit,total:all.length,pages:Math.ceil(all.length/limit)}};
    }else if(url.pathname==='/api/collaborations'){
      graphRequests++;
      const country=url.searchParams.get('country'),institution=url.searchParams.get('institution'),authors=url.searchParams.get('view')==='authors';
      const currentPage=Number(url.searchParams.get('page')||1);
      body={level:institution?(authors?'authors':'publications'):country?'institutions':'countries',root:{id:'I60837268',label:'KMUTT'},scope:{country,institution:institution?{id:'2',label:'Example University'}:null},items:institution?[{id:'1',type:authors?'author':'publication',label:authors?'Researcher A':'Heat transfer study',publication_count:1}]:country?[{id:'2',type:'institution',label:'Example University',publication_count:1}]:[{id:'JP',type:'country',label:'JP',publication_count:1,institution_count:1},{id:'ZZ',type:'country',label:'ZZ',publication_count:1,institution_count:1}],summary:{publications:2,institutions:2,countries:2},meta:{page:1,limit:24,total:!country?2:1,all:true,root_publications:2,unknown_country_institutions:1}};
      const groupBy=url.searchParams.get('group_by')||'none',organization=url.searchParams.get('institution_type');
      body.scope.group_by=groupBy;body.scope.institution_type=organization;
      const overview=url.searchParams.get('overview')||'countries',continent=url.searchParams.get('continent');
      body.scope.overview=overview;body.scope.continent=continent;
      if(!country&&!institution&&overview==='continents'&&!continent){body.level='continents';body.items=[{id:'TH',type:'country',label:'TH',publication_count:1,country_count:1,institution_count:1},{id:'AS',type:'continent',label:'AS',publication_count:1,country_count:1,institution_count:1},{id:'NA',type:'continent',label:'NA',publication_count:1,country_count:1,institution_count:1},{id:'UNKNOWN',type:'continent',label:'UNKNOWN',publication_count:1,country_count:1,institution_count:1}];body.meta.total=4;}
      else if(!country&&!institution&&continent){body.items=[{id:continent==='AS'?'JP':continent==='NA'?'US':'ZZ',type:'country',label:continent==='AS'?'JP':continent==='NA'?'US':'ZZ',publication_count:1,institution_count:1}];body.meta.total=1;}
      if(country&&groupBy==='type'&&!organization&&!institution){body.level='institution_types';body.items=[{id:'education',type:'institution_type',label:'education',publication_count:2,institution_count:1},{id:'company',type:'institution_type',label:'company',publication_count:1,institution_count:1},{id:'unknown',type:'institution_type',label:'unknown',publication_count:1,institution_count:1}];body.meta.total=3;}
      assert.equal(url.searchParams.get('all'),'1','Graph must request the entire scope');
    }else if(url.pathname==='/api/search'){
      const type=url.searchParams.get('type');
      const rows=fixtures.nodes.filter(n=>!type||type==='all'||n.type===type);
      body={data:url.searchParams.get('q')==='missing'?[]:rows,meta:{total:url.searchParams.get('q')==='missing'?0:rows.length}};
    }else if(url.pathname==='/api/graph'){graphRequests++;body=fixtures;}
    else if(url.pathname==='/api/publications/1')body={data:{id:1,title:'Heat transfer study',publication_year:2025,doi:'10.example/test',authors:[{id:1,display_name:'Researcher A',source:'openalex',source_record_id:'W1',match_status:'confirmed'}],topics:[{id:1,name:'Nanofluid',source:'scival',source_record_id:'W1',match_status:'needs_review'}],metrics:[]}};
    else body={data:{id:1,name:'Nanofluid',publications:[{id:1,title:'Heat transfer study',source:'openalex',source_record_id:'W1',match_status:'confirmed'}],publications_meta:{total:1}}};
    res.end(JSON.stringify(body));return;
  }
  const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!['index.html','people.html','academic.html','roles.html','directory.js','collaboration.js','app.js','styles.css'].includes(file)){res.writeHead(404);res.end();return;}
  let content=fs.readFileSync(path.join(root,file),'utf8');
  if(file.endsWith('.html'))content=content.replace('<head>','<head><script>window.ANT_API_BASE="/api"</script>');
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html; charset=utf-8');res.end(content);
});
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const chrome=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const child=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${temporary}`,'--remote-debugging-port=0','about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  let logs='';child.stderr.on('data',b=>logs+=b);
  let ws;
  try{
    for(let i=0;i<100&&!logs.includes('DevTools listening on');i++)await sleep(100);
    const endpoint=logs.match(/DevTools listening on (ws:\/\/\S+)/)?.[1];
    if(!endpoint)throw new Error('Chromium did not start: '+logs.slice(-1000));
    ws=new WebSocket(endpoint);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
    let id=0;const pending=new Map(),errors=[];
    ws.onmessage=e=>{const msg=JSON.parse(e.data);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(new Error(msg.error.message)):p.resolve(msg.result);}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text);};
    function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const request=++id;const timer=setTimeout(()=>reject(new Error('CDP timeout: '+method)),10000);pending.set(request,{resolve:r=>{clearTimeout(timer);resolve(r);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id:request,method,params,...(sessionId?{sessionId}:{})}));});}
    const {targetId}=await send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const cmd=(m,p)=>send(m,p,sessionId);
    await cmd('Runtime.enable');await cmd('Page.enable');
    const evaluate=async expression=>{const r=await cmd('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
    async function wait(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(50);}throw new Error('Timed out: '+expression);}
    await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    await cmd('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});
    if(process.env.ANT_LIVE_API){
      await wait('typeof hierarchy!=="undefined"&&hierarchy.current?.level==="continents"');
      await evaluate('paused=true');await sleep(350);
      const shot=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temporary,'live-countries.png'),Buffer.from(shot.data,'base64'));
      console.log('Live continent/domestic groups: '+await evaluate('hierarchy.current.meta.total'));
      await evaluate('openPanel(data.find(n=>n.id==="AS"))');await wait('hierarchy.current?.level==="countries"');
      assert.ok(await evaluate('!data.some(n=>n.id==="TH")'));
      await evaluate('openPanel(data.find(n=>n.id==="JP"))');
      await wait('hierarchy.current?.level==="institutions"');
      await evaluate('document.querySelector("[data-country-grouping=type]").click()');
      await wait('hierarchy.current?.level==="institution_types"');
      const groups=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temporary,'live-organization-groups.png'),Buffer.from(groups.data,'base64'));
      console.log('Live organization groups: '+await evaluate('hierarchy.current.items.map(n=>n.id).join(", ")'));
      await evaluate('openPanel(data.find(n=>n.id==="education"))');
      await wait('hierarchy.current?.level==="institutions"&&hierarchy.params.get("institution_type")==="education"');
      assert.ok(await evaluate('hierarchy.current.items.every(n=>n.institution_type==="education")'));
      const institutions=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temporary,'live-institutions.png'),Buffer.from(institutions.data,'base64'));
      await evaluate('openPanel(data.find(n=>n.id!=="root"))');
      await wait('hierarchy.current?.level==="publications"');
      assert.ok(await evaluate('hierarchy.current.meta.total>0'));
      await evaluate('document.querySelector("[data-institution-view=authors]").click()');
      await wait('hierarchy.current?.level==="authors"');
      console.log('Live affiliated authors: '+await evaluate('hierarchy.current.meta.total'));
      await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
      await cmd('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/index.html`});
      await wait('typeof hierarchy!=="undefined"&&hierarchy.current?.level==="continents"');
      assert.ok(await evaluate('data.length===hierarchy.current.meta.total+1&&document.documentElement.scrollWidth<=innerWidth'));
      const mobile=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temporary,'live-mobile.png'),Buffer.from(mobile.data,'base64'));
      await cmd('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/people.html`});
      await wait('document.querySelectorAll(".list-item").length===20');
      assert.ok(await evaluate('totalPages>1'));
      await evaluate('document.querySelector("#list-next").click()');
      await wait('page===2&&document.querySelectorAll(".list-item").length===20');
      console.log('Live directory: '+await evaluate('document.querySelector("#list-count").textContent'));
      await cmd('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/academic.html`});
      await wait('document.querySelectorAll(".list-item").length===20');
      const directory=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temporary,'live-directory.png'),Buffer.from(directory.data,'base64'));
      assert.deepEqual(errors,[]);console.log('PASS: live countries -> institutions -> publications / affiliated authors. Screenshots: '+temporary);return;
    }
    await wait('typeof hierarchy!=="undefined"&&hierarchy.current?.level==="continents"');
    assert.equal(await evaluate('data.length'),5);
    await evaluate('openPanel(data.find(n=>n.id==="TH"))');
    await wait('hierarchy.current?.level==="institution_types"&&hierarchy.params.get("country")==="TH"');
    assert.equal(await evaluate('hierarchy.params.has("continent")'),false,'Domestic path skips continents');
    await evaluate('document.querySelector("#breadcrumbs a").click()');await wait('hierarchy.current?.level==="continents"');
    await evaluate('paused=true;tx=610;ty=470;scale=.9;paint()');
    await evaluate('openPanel(data.find(n=>n.id==="AS"))');await wait('hierarchy.current?.level==="countries"');
    assert.equal(await evaluate('data.some(n=>n.id==="TH")'),false,'Thailand is excluded from Asia');
    await evaluate('openPanel(data.find(n=>n.id==="JP"))');
    await wait('hierarchy.current?.level==="institutions"');
    assert.equal(await evaluate('location.search.includes("country=JP")'),true);
    await evaluate('document.querySelector("#breadcrumbs a").click()');
    await wait('hierarchy.current?.level==="continents"');
    assert.equal(await evaluate('tx===610&&ty===470&&scale===.9'),true,'Breadcrumb return preserves camera');
    await evaluate('document.querySelector("[data-overview=countries]").click()');
    await wait('hierarchy.current?.level==="countries"&&hierarchy.params.get("overview")==="countries"');
    await evaluate('openPanel(data.find(n=>n.id==="JP"))');
    await wait('hierarchy.current?.level==="institutions"');
    assert.equal(await evaluate('document.querySelector("#country-grouping").hidden'),false);
    await evaluate('document.querySelector("[data-country-grouping=type]").click()');
    await wait('hierarchy.current?.level==="institution_types"');
    assert.equal(await evaluate('data.some(n=>n.name==="บริษัท")&&data.some(n=>n.name==="ไม่ระบุประเภท")'),true);
    await evaluate('openPanel(data.find(n=>n.id==="education"))');
    await wait('hierarchy.current?.level==="institutions"&&hierarchy.params.get("institution_type")==="education"');
    await cmd('Page.reload');await wait('typeof hierarchy!=="undefined"&&hierarchy.current?.scope.institution_type==="education"');
    assert.equal(await evaluate('document.querySelector("#breadcrumbs").textContent.includes("มหาวิทยาลัย / สถานศึกษา")'),true);
    await evaluate('history.back()');await wait('hierarchy.current?.level==="institution_types"');
    await evaluate('document.querySelector("[data-country-grouping=none]").click()');
    await wait('hierarchy.current?.level==="institutions"&&!hierarchy.params.has("institution_type")');
    await evaluate('openPanel(data.find(n=>n.id==="2"))');
    await wait('hierarchy.current?.level==="publications"');
    assert.equal(await evaluate('document.querySelector("#breadcrumbs").textContent.includes("Example University")'),true);
    await evaluate('document.querySelector("[data-institution-view=authors]").click()');
    await wait('hierarchy.current?.level==="authors"');
    await evaluate('openPanel(data.find(n=>n.type==="author"))');
    await wait('document.querySelector("#details").textContent.includes("Researcher A")');
    await evaluate('closePanel(false);document.querySelector("#breadcrumbs a").click()');
    await wait('hierarchy.current?.level==="countries"&&document.querySelectorAll(".node").length===3');
    assert.equal(await evaluate('document.querySelector("#explorer-paging")===null'),true,'Graph has no pagination');
    await cmd('Page.reload');await wait('hierarchy.current?.level==="countries"');
    await sleep(350);
    const hierarchyShot=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temporary,'hierarchy.png'),Buffer.from(hierarchyShot.data,'base64'));
    await cmd('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/index.html?type=topic&id=1`});
    await wait('document.querySelectorAll(".node").length===3&&data.some(n=>n.type==="publication")');
    await evaluate('closePanel(false)');
    assert.equal(await evaluate('document.querySelector("#directory")===null'),true,'Home contains only the network workspace');
    assert.equal(await evaluate('document.querySelector("#panel").inert'),true);
    assert.equal(await evaluate('document.querySelectorAll(".node-name:not([hidden])").length'),0);
    await evaluate("paused=true;navOpen(true);document.querySelector('#kind').value='author';document.querySelector('#kind').onchange({target:document.querySelector('#kind')})");
    assert.equal(await evaluate('document.querySelectorAll(".node:not(.dim)").length'),1,'IDs must be distinct by entity type');
    await evaluate("document.querySelector('#kind').value='all';document.querySelector('#kind').onchange({target:document.querySelector('#kind')});openPanel(data.find(n=>n.type==='publication'))");
    await wait('document.querySelector("#details").textContent.includes("DOI")');
    assert.equal(await evaluate('document.querySelectorAll("#details .source-link").length'),2);
    assert.equal(await evaluate('document.querySelector("#details").textContent.includes("ยังต้องตรวจสอบ")'),true);
    assert.equal(await evaluate('document.querySelectorAll(".edge-label:not([hidden])").length'),0,'Relationship text should appear only in the tooltip');
    await evaluate('links[0].hit.focus()');
    assert.equal(await evaluate('!document.querySelector("#tooltip").hidden&&document.querySelector("#tooltip").textContent.includes(links[0].label)'),true,'Keyboard focus exposes relationship');
    await evaluate('links[0].hit.blur()');
    const edgeMidpoint=await evaluate('({x:tx+(links[0].a.x+links[0].b.x)/2*scale,y:ty+(links[0].a.y+links[0].b.y)/2*scale})');
    await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',...edgeMidpoint});
    assert.equal(await evaluate('!document.querySelector("#tooltip").hidden&&document.querySelector("#tooltip").textContent.includes("ความสัมพันธ์")'),true,'Hovering the edge exposes relationship');
    await cmd('Input.dispatchMouseEvent',{type:'mouseMoved',x:20,y:300});
    await sleep(350);
    assert.equal(await evaluate('Math.round(document.querySelector("#panel").getBoundingClientRect().right)===innerWidth'),true,'Details panel must fit the viewport');
    const desktop=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temporary,'desktop.png'),Buffer.from(desktop.data,'base64'));
    const beforeDirectories=graphRequests;
    await evaluate("closePanel();sessionStorage.clear();document.querySelector('a[href=\"people.html\"]').click()");
    await wait('location.pathname.endsWith("people.html")&&document.querySelectorAll(".list-item").length===20');
    assert.equal(await evaluate('document.querySelector("#graph")===null'),true,'People is a separate document without a graph');
    assert.equal(await evaluate('document.querySelectorAll(".list-item").length'),20);
    assert.equal(await evaluate('document.querySelector("#list-count").textContent.includes("41")'),true,'Directory includes records outside the graph');
    await evaluate('document.querySelector("#list-next").click()');
    await wait('location.search.includes("page=2")&&document.querySelector(".list-item h2")?.textContent==="Person 21"');
    await cmd('Page.reload');await wait('document.querySelector(".list-item h2")?.textContent==="Person 21"');
    await evaluate('document.querySelector("#list-next").click()');
    await wait('document.querySelectorAll(".list-item").length===1&&document.querySelector(".list-item h2")?.textContent==="Person 41"');
    assert.equal(await evaluate('document.querySelector("#list-next").disabled'),true);
    await evaluate('history.back()');await wait('document.querySelector(".list-item h2")?.textContent==="Person 21"');
    await evaluate('document.querySelector("#list-prev").click()');await wait('document.querySelector(".list-item h2")?.textContent==="Researcher A"');
    await evaluate('document.querySelector(".list-actions button").click()');
    await wait('document.querySelectorAll("#details .source-link").length===1');
    await evaluate('closeDetails()');
    const peopleScreenshot=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temporary,'people.png'),Buffer.from(peopleScreenshot.data,'base64'));
    await evaluate("document.querySelector('#list-search').value='missing';renderList()");
    await wait('!document.querySelector("#list-empty").hidden');
    await evaluate('document.querySelector("#list-search").value="";renderList()');
    await cmd('Page.reload');await wait('document.querySelectorAll(".list-item").length===20');
    await evaluate(`document.querySelector('a[href="roles.html"]').click()`);
    await wait('location.pathname.endsWith("roles.html")&&document.querySelector("#list-search")?.disabled');
    assert.equal(await evaluate('document.querySelector("#graph")===null'),true);
    assert.equal(await evaluate('document.querySelector("#directory-search").hidden'),true);
    await evaluate(`document.querySelector('a[href="academic.html"]').click()`);
    await wait('location.pathname.endsWith("academic.html")&&document.querySelectorAll(".list-item").length===20');
    assert.equal(graphRequests,beforeDirectories,'Directories must not load or simulate a network');
    await evaluate('document.querySelector(".list-actions button").click()');
    await wait('document.querySelector("#details").textContent.includes("DOI")');
    await evaluate('closeDetails()');
    await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await sleep(300);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Directory mobile overflow');
    const directoryMobile=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temporary,'directory-mobile.png'),Buffer.from(directoryMobile.data,'base64'));
    await cmd('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    await evaluate('document.querySelector(".list-actions a").click()');
    await wait('location.pathname.endsWith("index.html")&&location.search.includes("type=publication")&&document.querySelectorAll(".node").length===3');
    await wait('document.querySelector("#details")?.textContent.includes("DOI")');
    await evaluate('history.back()');
    await wait('location.pathname.endsWith("academic.html")&&document.querySelectorAll(".list-item").length===20');
    await evaluate(`document.querySelector('a[href="index.html"]').click()`);
    await wait('location.pathname.endsWith("index.html")&&!location.search&&typeof hierarchy!=="undefined"&&hierarchy.current?.level==="continents"');
    await evaluate("paused=true;navOpen(true);document.querySelector('#search').value='Heat';searchRecords()");
    await wait('document.querySelectorAll("#search-items button").length===3');
    await evaluate('document.querySelector("#search-items button").click()');
    await wait('document.querySelector("#panel").classList.contains("open")');
    // A crowded cluster with long English, Thai and unbroken names.
    await evaluate(`
      closePanel(false);navOpen(false);paused=true;
      installGraph(Array.from({length:13},(_,i)=>({id:String(i),type:i?'author':'publication',name:i%3===0?'การวิเคราะห์ข้อมูลเครือข่ายความสัมพันธ์ทางวิชาการและการประยุกต์ใช้ปัญญาประดิษฐ์ในมหาวิทยาลัย':i%3===1?'A very long publication title about academic network analysis and evidence backed research discovery':'UnbrokenResearchName'.repeat(8)})),Array.from({length:12},(_,i)=>({a:'publication:0',b:'author:'+String(i+1),label:'ผู้เขียน'})));
      data.forEach((n,i)=>{n.x=(i%4-1.5)*75;n.y=(Math.floor(i/4)-1.5)*70;});
      selected=data[0];tx=600;ty=430;scale=1;mark();paint();
    `);
    async function verifyLabels(){
      assert.equal(await evaluate('data.every(n=>n.nameEl.children.length===(n===selected?2:1))'),true,'Only the selected long name expands to two lines');
      assert.equal(await evaluate('data.filter(n=>n!==selected).every(n=>n.nameEl.textContent.endsWith("…"))'),true,'Long compact captions show an ellipsis');
      const geometry=await evaluate(`({
        selectedVisible:!data[0].nameEl.hasAttribute('hidden'),
        boxes:data.filter(n=>!n.labelEl.hasAttribute('hidden')).map(n=>{const b=n.labelEl.getBoundingClientRect();const line=n.labelLeader;return {x:b.x,y:b.y,width:b.width,height:b.height,lines:n.nameEl.children.length,owner:{x:tx+n.x*scale,y:ty+n.y*scale,r:n.r*scale},leader:{start:{x:tx+Number(line.getAttribute('x1'))*scale,y:ty+Number(line.getAttribute('y1'))*scale},end:{x:tx+Number(line.getAttribute('x2'))*scale,y:ty+Number(line.getAttribute('y2'))*scale}}};}),
        nodes:data.map(n=>({x:tx+n.x*scale,y:ty+n.y*scale,r:n.r*scale}))
      })`);
      assert.equal(geometry.selectedVisible,true,'Selected name gets priority');
      assert.ok(geometry.boxes.length>1,'Neighbors keep readable names');
      for(const [i,a]of geometry.boxes.entries()){
        const {owner,leader}=a;
        assert.ok(Math.abs(Math.hypot(leader.start.x-owner.x,leader.start.y-owner.y)-owner.r)<.01,'Leader starts at its own node boundary');
        assert.ok(Math.hypot(leader.end.x-owner.x,leader.end.y-owner.y)-owner.r<=12.01,'Caption stays within 12px of its owner');
        assert.ok(leader.end.x>=a.x-.01&&leader.end.x<=a.x+a.width+.01&&leader.end.y>=a.y-.01&&leader.end.y<=a.y+a.height+.01,'Leader ends on its own caption');
        assert.ok(a.width<=173&&a.lines<=2,'Caption must fit 160px of text and two lines');
        for(const b of geometry.boxes.slice(i+1))assert.ok(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),'Captions overlap');
        for(const n of geometry.nodes){const dx=n.x-Math.max(a.x,Math.min(n.x,a.x+a.width)),dy=n.y-Math.max(a.y,Math.min(n.y,a.y+a.height));assert.ok(dx*dx+dy*dy>=n.r*n.r,'Caption overlaps a node');}
      }
    }
    await verifyLabels();
    await evaluate('scale=.5;tx=550;ty=450;paint()');await verifyLabels();
    await evaluate('scale=1.8;paint()');await verifyLabels();
    await evaluate('data[0].x-=25;data[0].y+=15;tx+=30;ty+=20;paint()');await verifyLabels();
    await evaluate('selected=data[1];mark();paint()');await verifyLabels();
    assert.equal(await evaluate('data[0].nameEl.children.length'),1,'The previous selection returns to one line');
    await evaluate('selected=data[0];mark();paint()');
    await evaluate('showTip(data[0])');
    assert.equal(await evaluate('document.querySelector("#tooltip strong").textContent===data[0].name'),true,'Tooltip retains full name');
    const labelsScreenshot=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temporary,'labels.png'),Buffer.from(labelsScreenshot.data,'base64'));
    await evaluate('closePanel(false)');
    assert.equal(await evaluate('data.every(n=>n.nameEl.children.length===1)'),true,'Clearing selection restores all one-line captions');
    assert.equal(await evaluate('data.every(n=>n.labelLeader.hasAttribute("hidden")===n.labelEl.hasAttribute("hidden"))'),true,'Hidden names never leave orphan leader lines');
    await evaluate(`
      installGraph(Array.from({length:120},(_,i)=>({id:String(i),type:'author',name:'Dense researcher '+i,aggregate:true})),[]);
      data.forEach((n,i)=>{n.x=(i%12)*14;n.y=Math.floor(i/12)*14;});tx=500;ty=300;scale=1;mark();paint();
    `);
    assert.equal(await evaluate('data.some(n=>n.labelWanted&&n.labelEl.hasAttribute("hidden"))'),true,'Dense names hide locally instead of drifting away');
    assert.equal(await evaluate('data.every(n=>n.labelLeader.hasAttribute("hidden")===n.labelEl.hasAttribute("hidden"))'),true);
    assert.equal(await evaluate('data.filter(n=>!n.labelEl.hasAttribute("hidden")).every(n=>{const b=n.labelEl.getBoundingClientRect(),x=tx+n.x*scale,y=ty+n.y*scale,p=labelAnchor(b,x,y);return Math.hypot(p.x-x,p.y-y)-n.r*scale<=12.01;})'),true,'Dense layout retains node ownership');
    await evaluate("explore(record('topic',{id:'1',label:'Nanofluid'}),false)");
    await cmd('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate("closePanel();navOpen(true)");await sleep(300);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Mobile layout overflows');
    const mobile=await cmd('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(temporary,'mobile.png'),Buffer.from(mobile.data,'base64'));
    await evaluate("openPanel(data.find(n=>n.type==='publication'))");await sleep(350);
    assert.equal(await evaluate('document.querySelector("#panel").getBoundingClientRect().left>=0'),true,'Mobile details panel must fit the viewport');
    offline=true;
    await cmd('Page.reload');await wait('document.querySelector("#graph-status")?.textContent.includes("unavailable")');
    assert.equal(await evaluate('document.querySelectorAll(".node").length'),0,'Never replace offline API with fabricated nodes');
    offline=false;await evaluate('document.querySelector("#reset").click()');await wait('document.querySelectorAll(".node").length===3');
    assert.deepEqual(errors,[]);
    console.log('PASS: country/institution/author drill-down, breadcrumbs, camera restoration, pagination, graph, IDs, evidence, directories, mobile, offline/retry, label collisions and tooltips.');
    console.log('Screenshots: '+temporary);
  }finally{ws?.close();child.kill();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
