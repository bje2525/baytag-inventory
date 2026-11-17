const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const KEY='baytag-inventory-v1';
const sample=[
 {id:'a',sku:'766-154',bay:'32-018',department:'29',quantity:80,status:'Unverified',updatedAt:'2026-11-01T12:00:00Z',extra:'keep-a'},
 {id:'b',sku:'766-155',bay:'32-018',department:'29',quantity:40,status:'Needs review',updatedAt:'2026-11-02T12:00:00Z',extra:'keep-b'},
 {id:'c',sku:'512-626',bay:'21-004',department:'21',quantity:166,status:'Verified',updatedAt:'2026-11-03T12:00:00Z',extra:'keep-c'}
];
function start(raw=JSON.stringify(sample)){
 const html=fs.readFileSync('index.html','utf8');
 const dom=new JSDOM(html,{url:'https://baytag.test/',runScripts:'outside-only'});
 const w=dom.window;w.confirm=()=>true;w.alert=()=>{};w.scrollTo=()=>{};
 w.localStorage.setItem(KEY,raw);
 const context=dom.getInternalVMContext();
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
 for(const name of ['baytag-upgrades.js','baytag-easy-mode.js','baytag-inventory-tools.js'])
   vm.runInContext(fs.readFileSync(name,'utf8'),context);
 w.document.getElementById('tabInventory').click();
 return w;
}
const visible=w=>[...w.document.querySelectorAll('#items>.item')].filter(x=>!x.hidden);
test('power tools leave existing inventory JSON byte-for-byte unchanged at startup',()=>{
 const raw=JSON.stringify(sample,null,2),w=start(raw);
 assert.equal(w.localStorage.getItem(KEY),raw);
 assert.ok(w.document.getElementById('baytagInventoryTools'));
 assert.equal(w.BayTagInventoryTools.getCounts().all,3);
 w.close();
});
test('department and status filters show only matching inventory without editing records',()=>{
 const w=start(),d=w.document,before=w.localStorage.getItem(KEY);
 d.getElementById('powerDepartment').value='29';
 d.getElementById('powerDepartment').dispatchEvent(new w.Event('change'));
 assert.equal(visible(w).length,2);
 d.getElementById('powerStatus').value='Needs review';
 d.getElementById('powerStatus').dispatchEvent(new w.Event('change'));
 assert.equal(visible(w).length,1);
 assert.match(visible(w)[0].textContent,/766-155/);
 assert.equal(w.localStorage.getItem(KEY),before);
 w.close();
});
test('sort by quantity changes only display order, not inventory storage',()=>{
 const w=start(),d=w.document,before=w.localStorage.getItem(KEY);
 d.getElementById('powerSort').value='qty-high';
 d.getElementById('powerSort').dispatchEvent(new w.Event('change'));
 assert.match(visible(w)[0].textContent,/512-626/);
 assert.equal(w.localStorage.getItem(KEY),before);
 w.close();
});
test('Needs review shortcut clears filters and shows review candidates',()=>{
 const w=start(),d=w.document;
 d.getElementById('powerDepartment').value='21';
 d.getElementById('powerNeedsReview').click();
 assert.equal(d.getElementById('powerDepartment').value,'');
 assert.equal(d.getElementById('powerStatus').value,'Needs review');
 assert.equal(visible(w).length,1);
 assert.match(visible(w)[0].textContent,/766-155/);
 w.close();
});
test('bulk status update saves only selected items and preserves custom fields',()=>{
 const w=start(),d=w.document;
 const checkbox=visible(w)[0].querySelector('.baytag-tools-card-selection input');
 checkbox.click();
 d.getElementById('powerBulkStatus').value='Moved';
 d.getElementById('powerApplyStatus').click();
 const data=JSON.parse(w.localStorage.getItem(KEY));
 assert.equal(data.filter(x=>x.status==='Moved').length,1);
 assert.equal(data.find(x=>x.id==='a').extra,'keep-a');
 assert.equal(data.find(x=>x.id==='b').status,'Needs review');
 assert.equal(w.BayTagInventoryTools.getCounts().selected,0);
 w.close();
});
test('cancelling a batch edit leaves original storage unchanged',()=>{
 const w=start(),d=w.document,before=w.localStorage.getItem(KEY);
 w.confirm=()=>false;
 visible(w)[0].querySelector('.baytag-tools-card-selection input').click();
 d.getElementById('powerApplyStatus').click();
 assert.equal(w.localStorage.getItem(KEY),before);
 w.close();
});
test('storage failure rolls back all attempted batch statuses',()=>{
 const w=start(),d=w.document,before=w.localStorage.getItem(KEY);
 visible(w)[0].querySelector('.baytag-tools-card-selection input').click();
 w.Storage.prototype.setItem=()=>{throw Error('quota');};
 d.getElementById('powerApplyStatus').click();
 assert.equal(w.localStorage.getItem(KEY),before);
 assert.equal(w.eval("records.find(x=>x.id==='a').status"),'Unverified');
 w.close();
});
test('matching-items CSV exports only visible items with safe field values',()=>{
 const w=start(),d=w.document;let downloaded;
 w.download=(name,data)=>downloaded={name,data};
 d.getElementById('powerStatus').value='Needs review';
 d.getElementById('powerStatus').dispatchEvent(new w.Event('change'));
 d.getElementById('powerExportMatching').click();
 assert.match(downloaded.name,/matching-items/);
 assert.match(downloaded.data,/766-155/);
 assert.doesNotMatch(downloaded.data,/766-154|512-626/);
 assert.match(downloaded.data,/Date Tag Created/);
 w.close();
});
test('backup button exports all records even when filters are active',()=>{
 const w=start(),d=w.document;let backup;
 w.download=(name,data)=>backup={name,data};
 d.getElementById('powerStatus').value='Verified';
 d.getElementById('powerStatus').dispatchEvent(new w.Event('change'));
 d.getElementById('powerBackup').click();
 assert.equal(JSON.parse(backup.data).length,3);
 assert.match(backup.name,/backup/);
 w.close();
});
test('new inventory tools are included in the offline service-worker cache',()=>{
 const sw=fs.readFileSync('sw.js','utf8');
 assert.match(sw,/\.\/baytag-inventory-tools\.js/);
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/baytag-inventory-tools\.js/);
});
