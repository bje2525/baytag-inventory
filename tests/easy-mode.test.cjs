const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const INVENTORY_KEY='baytag-inventory-v1';
function setup(saved='[]'){
  const html=fs.readFileSync('index.html','utf8');
  const dom=new JSDOM(html,{url:'https://baytag.test/',runScripts:'outside-only'});
  const w=dom.window;
  w.confirm=()=>true;w.alert=()=>{};w.scrollTo=()=>{};
  w.localStorage.setItem(INVENTORY_KEY,saved);
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],dom.getInternalVMContext());
  vm.runInContext(fs.readFileSync('baytag-upgrades.js','utf8'),dom.getInternalVMContext());
  vm.runInContext(fs.readFileSync('baytag-easy-mode.js','utf8'),dom.getInternalVMContext());
  return w;
}
test('beginner dashboard initializes and leaves inventory bytes unchanged',()=>{
 const raw=JSON.stringify([{id:'keep',sku:'123-456',quantity:5,bay:'32-018',legacy:'keep-me'}],null,2);const w=setup(raw);
 assert.equal(w.localStorage.getItem(INVENTORY_KEY),raw);
 assert.match(w.document.querySelector('.easy-welcome').textContent,/What would you like to do/);
 assert.equal(w.document.querySelector('#tabAdd').textContent,'📷 Scan Items');
 assert.equal(w.document.querySelector('#tabInventory').textContent,'📦 Saved Items');
 assert.equal(w.document.querySelector('#easyManualEntry').open,false);
 w.close();
});
test('big View saved items action works',()=>{
 const w=setup();const btn=[...w.document.querySelectorAll('.easy-quick-actions button')].find(x=>x.textContent.includes('View saved items'));
 btn.click();assert.equal(w.document.getElementById('inventoryView').classList.contains('hidden'),false);
 w.close();
});
test('manual save controls remain in entry form and can be opened',()=>{
 const w=setup();const d=w.document;
 assert.ok(d.querySelector('#entryForm').contains(d.querySelector('#sku')));
 assert.ok(d.querySelector('#entryForm').contains(d.querySelector('#qty')));
 assert.ok(d.querySelector('#entryForm').contains(d.querySelector('#saveBtn')));
 d.querySelector('#easyManualEntry').open=true;
 assert.ok(d.querySelector('#sku').closest('details').open);
 w.close();
});
test('review warns of missing quantity and avoids rewriting review rows',()=>{
 const w=setup(),d=w.document;w.makeBearRow({sku:'766-154',qty:'80',tagDate:'2024-05-11'});
 d.querySelector('#bearRows').dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.match(d.querySelector('.easy-review-summary').textContent,/1 SKU entry/);
 const qty=d.querySelector('#bearRows [data-field="qty"]');qty.value='';qty.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.match(d.querySelector('.easy-review-summary').textContent,/missing quantity/);
 assert.equal(d.querySelector('#bearRows').children.length,1);
 w.close();
});
test('easy mode is cached for offline app startup',()=>{
 const sw=fs.readFileSync('sw.js','utf8');
 assert.ok(sw.includes("'./baytag-easy-mode.js'"));
 assert.ok(sw.includes('baytag-pwa-v3-0-1-stable'));
});
test('stable release label and inventory storage key unchanged',()=>{
 const v=JSON.parse(fs.readFileSync('version.json','utf8'));
 assert.equal(v.version,'3.0.1');assert.equal(v.releaseStatus,'stable');
 const w=setup();assert.match(w.document.querySelector('footer').textContent,/BayTag Capture v3\.0\.1/); assert.doesNotMatch(w.document.querySelector('footer').textContent,/RELEASE TEST/);
 assert.equal(w.document.querySelector('header .pill').textContent,'LOCAL');
 w.close();
});
test('editing through Easy Mode opens and saves the existing record without losing metadata',async()=>{
 const original={id:'existing',sku:'123-456',bay:'32-018',quantity:5,status:'Verified',custom:'preserve'};
 const w=setup(JSON.stringify([original])),d=w.document;
 d.querySelector('#tabInventory').click();d.querySelector('#items .itemactions button').click();
 await Promise.resolve();
 assert.equal(d.querySelector('#easyManualEntry').open,true);
 d.querySelector('#qty').value='7';
 d.querySelector('#entryForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 const saved=JSON.parse(w.localStorage.getItem(INVENTORY_KEY));
 assert.equal(saved.length,1);assert.equal(saved[0].quantity,7);
 assert.equal(saved[0].custom,'preserve');assert.equal(saved[0].status,'Verified');
 w.close();
});
