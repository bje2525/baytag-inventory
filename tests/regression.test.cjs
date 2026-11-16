const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const key='baytag-inventory-v1';
function app(raw='[]'){
 const html=fs.readFileSync('index.html','utf8');
 const dom=new JSDOM(html,{url:'https://baytag.test/',runScripts:'outside-only'});
 const w=dom.window;w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};
 w.localStorage.setItem(key,raw);
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],dom.getInternalVMContext());
 vm.runInContext(fs.readFileSync('baytag-upgrades.js','utf8'),dom.getInternalVMContext());
 return w;
}
const record={id:'old',sku:'123-456',bay:'32-018',quantity:4,status:'Verified',tagId:'legacy',custom:{keep:true}};
test('startup preserves original inventory bytes and backup payload',()=>{
 const raw=JSON.stringify([record],null,2),w=app(raw);assert.equal(w.localStorage.getItem(key),raw);
 let backup;w.download=(name,content)=>backup=JSON.parse(content);w.document.getElementById('backupBtn').click();assert.deepEqual(backup,[record]);w.close();
});
test('editing preserves legacy and unknown metadata and status',()=>{
 const w=app(JSON.stringify([record]));w.render();w.document.querySelector('.itemactions button').click();
 w.document.getElementById('qty').value='9';w.document.getElementById('entryStatus').value='Moved';
 w.document.getElementById('entryForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
 const saved=JSON.parse(w.localStorage.getItem(key))[0];assert.equal(saved.quantity,9);assert.equal(saved.status,'Moved');assert.deepEqual(saved.custom,{keep:true});assert.equal(saved.tagId,'legacy');w.close();
});
test('corrupt or non-array storage cannot be overwritten through any save path',()=>{
 for(const raw of ['{bad','{}','[null]']){const w=app(raw);assert.equal(w.save(),false);assert.equal(w.localStorage.getItem(key),raw);w.close();}
});
test('per-SKU quantities never consume digits from the next SKU',()=>{
 const w=app(),parse=w.BayTagPrintedTagParser.parseTextOnlySkuRows;
 assert.deepEqual(JSON.parse(JSON.stringify(parse('123-456 789-012 8'))).map(r=>[r.sku,r.qty]),[['123-456',''],['789-012','8']]);
 assert.deepEqual(JSON.parse(JSON.stringify(parse('123-456 QTY: 0\n789-012 8'))).map(r=>r.qty),['0','8']);
 assert.equal(w.BayTagPrintedTagParser.parsePrintedDate('02/30/2026'),'');w.close();
});
test('failed rescan keeps all previous OCR and manual review rows',async()=>{
 const w=app();w.makeBearRow({sku:'123-456',qty:'4'});const old=w.document.getElementById('bearRows').lastElementChild;old.dataset.baytagAuto='yes';w.makeBearRow();
 w.eval("selectedPhotos.bear=[{}]");w.loadOcr=async()=>{};let terminated=false;
 w.Tesseract={createWorker:async()=>({recognize:async()=>{throw Error('offline')},terminate:async()=>{terminated=true}})};
 await w.scanPhoto('bear');assert.equal(w.document.getElementById('bearRows').children.length,2);assert.ok(old.isConnected);assert.ok(terminated);assert.equal(w.document.getElementById('scanBear').disabled,false);w.close();
});
test('storage quota failure rolls inventory back',()=>{
 const w=app(JSON.stringify([record]));w.render();w.Storage.prototype.setItem=()=>{throw Error('quota')};
 w.document.querySelectorAll('.itemactions button')[1].click();assert.equal(w.eval('records.length'),1);w.close();
});
test('JSON restore retains metadata and rejects invalid backup',async()=>{
 const w=app();const input=w.document.getElementById('importFile');
 await input.onchange({target:{files:[{text:async()=>JSON.stringify([record])}],value:'file'}});
 assert.deepEqual(JSON.parse(w.localStorage.getItem(key)),[record]);
 await input.onchange({target:{files:[{text:async()=>'[null]'}],value:'file'}});
 assert.deepEqual(JSON.parse(w.localStorage.getItem(key)),[record]);w.close();
});
test('offline service worker returns cached navigation and caches all runtime assets',async()=>{
 const handlers={},cached={offline:true};let assets;
 const context={self:{location:{origin:'https://baytag.test'},clients:{claim:async()=>{}},skipWaiting:()=>{},addEventListener:(name,fn)=>handlers[name]=fn},caches:{open:async()=>({addAll:async list=>assets=list}),match:async()=>cached},fetch:async()=>{throw Error('offline')},URL};
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),context);
 let install;handlers.install({waitUntil:p=>install=p});await install;
 for(const asset of assets)assert.ok(fs.existsSync(asset==='./'?'index.html':asset));
 let response;handlers.fetch({request:{url:'https://baytag.test/index.html',method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.equal(await response,cached);
});
test('successful multi-photo scan replaces OCR rows, keeps manual rows, and saves separate quantities',async()=>{
 const w=app();w.makeBearRow({sku:'999-999',qty:'1'});const manual=w.document.getElementById('bearRows').lastElementChild;
 w.makeBearRow({sku:'111-111',qty:'5'});w.document.getElementById('bearRows').lastElementChild.dataset.baytagAuto='yes';
 w.URL.createObjectURL=()=> 'blob:mock';w.URL.revokeObjectURL=()=>{};
 w.Image=class {set src(value){queueMicrotask(()=>this.onerror())}};
 w.eval('selectedPhotos.bear=[{},{}]');w.loadOcr=async()=>{};let index=0;
 w.Tesseract={createWorker:async()=>({recognize:async()=>({data:{text:index++?'789-012 QTY: 0':'123-456 8'}}),terminate:async()=>{}})};
 await w.scanPhoto('bear');const rows=w.document.getElementById('bearRows').children;
 assert.equal(rows.length,3);assert.ok(manual.isConnected);
 w.document.getElementById('aisleNumber').value='32';w.document.getElementById('bayNumber').value='18';
 w.document.getElementById('saveBearRows').click();
 const saved=JSON.parse(w.localStorage.getItem(key));assert.deepEqual(saved.map(r=>r.quantity),[1,8,0]);assert.ok(saved.every(r=>r.bay==='32-018'));w.close();
});
test('duplicate review checks both existing inventory and the current batch',()=>{
 const w=app();let warnings=0;w.confirm=()=>{warnings++;return false};
 const result=w.approveDuplicates([{sku:'123-456',bay:'32-018'},{sku:'789-012',bay:'32-018'},{sku:'789-012',bay:'32-018'}],[record]);
 assert.equal(result.approved.length,1);assert.equal(result.skipped,2);assert.equal(warnings,2);w.close();
});
test('two photographed three-SKU tags keep their own dates and quantities',()=>{
 const w=app(JSON.stringify([record]));
 const line=(text,x,y,width=150)=>({text,bbox:{x0:x,y0:y,x1:x+width,y1:y+20}});
 for(const [dx,dy] of [[500,0],[0,350]]){
  const lines=[];
  for(const [x,y,date,skus,quantities] of [[40,40,'10/01/2026',['123-456','234-567','345-678'],['8','0','12']],[40+dx,40+dy,'11/15/2026',['456-789','567-890','678-901'],['3','16','2']]]){
   lines.push(line(date,x,y));
   skus.forEach((sku,i)=>{lines.push(line(sku,x,y+50+i*35));lines.push(line(quantities[i],x+200,y+50+i*35,40));});
  }
  const rows=w.BayTagPrintedTagParser.estimateRegions({lines,text:lines.map(l=>l.text).join('\n')},{w:1000,h:800});
  assert.deepEqual(JSON.parse(JSON.stringify(rows.map(r=>[r.data.tagDate,r.data.qty]))),[
   ['2026-10-01','8'],['2026-10-01','0'],['2026-10-01','12'],
   ['2026-11-15','3'],['2026-11-15','16'],['2026-11-15','2']]);
 }
 assert.deepEqual(JSON.parse(w.localStorage.getItem(key)),[record]);w.close();
});
test('text-only OCR leaves conflicting photograph dates for manual review',()=>{
 const w=app();const rows=w.BayTagPrintedTagParser.parseTextOnlySkuRows('10/01/2026\n123-456 8\n11/15/2026\n789-012 3');
 assert.ok(rows.every(row=>row.tagDate===''));w.close();
});
test('date association preserves single-date tags and leaves equidistant conflicts blank',()=>{
 const w=app(),parser=w.BayTagPrintedTagParser;
 const line=(text,x,y)=>({text,bbox:{x0:x,y0:y,x1:x+100,y1:y+20}});
 assert.equal(parser.parseTextOnlySkuRows('Created 10/01/2026\n123-456 8')[0].tagDate,'2026-10-01');
 const rows=parser.estimateRegions({lines:[line('10/01/2026',0,0),line('11/15/2026',200,0),line('123-456',100,100)]},{w:400,h:300});
 assert.equal(rows[0].data.tagDate,'');w.close();
});
