const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const KEY='baytag-inventory-v1';
const sample=[
  {id:'keep',department:'29',bay:'32-018',sku:'766-154',quantity:80,status:'Verified',legacy:'preserve-me'},
  {id:'second',department:'29',bay:'32-018',sku:'766-155',quantity:40,status:'Needs review',extra:{field:'keep'}}
];
function start(raw=JSON.stringify(sample)){
  const html=fs.readFileSync('index.html','utf8');
  const dom=new JSDOM(html,{url:'https://baytag.test/',runScripts:'outside-only'});
  const w=dom.window;
  w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;
  w.localStorage.setItem(KEY,raw);
  const ctx=dom.getInternalVMContext();
  vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
  for(const path of ['baytag-upgrades.js','baytag-easy-mode.js','baytag-inventory-tools.js','baytag-capture.js'])
    vm.runInContext(fs.readFileSync(path,'utf8'),ctx);
  return w;
}
test('v3 startup shows Home, four bottom tabs, and preserves inventory byte-for-byte',()=>{
  const raw=JSON.stringify(sample,null,2),w=start(raw),d=w.document;
  assert.equal(w.localStorage.getItem(KEY),raw);
  assert.equal(w.BayTagCaptureLoaded,true);
  assert.equal(w.BayTagCapture.getRoute(),'home');
  assert.equal(d.getElementById('captureHome').classList.contains('hidden'),false);
  assert.equal(d.getElementById('addView').classList.contains('hidden'),true);
  assert.equal(d.querySelectorAll('#captureBottomNav button').length,4);
  assert.match(d.querySelector('header h1').textContent,/BayTag Capture v3\.0/);
  assert.match(d.querySelector('header small').textContent,/Independent inventory/);
  w.close();
});
test('Home does not invent a current location when inventory is empty',()=>{
  const w=start('[]'),d=w.document;
  assert.match(d.getElementById('captureHomeLocation').textContent,/No bay selected/);
  assert.doesNotMatch(d.getElementById('captureHomeLocation').textContent,/Dept 29/);
  w.close();
});
test('Home displays saved location as last saved, not falsely as current',()=>{
  const w=start(),d=w.document;
  assert.match(d.getElementById('captureHomeLocation').textContent,/Last saved location/);
  assert.match(d.getElementById('captureHomeLocation').textContent,/Dept 29 · Aisle 32 · Bay 018/);
  w.close();
});
test('start capture and continue move between actual existing scanner panels',()=>{
  const w=start(),d=w.document;
  d.getElementById('captureStart').click();
  assert.equal(w.BayTagCapture.getRoute(),'capture');
  assert.equal(w.BayTagCapture.getStage(),'location');
  assert.equal(d.getElementById('dept').closest('section.panel').classList.contains('capture-pane-hidden'),false);
  d.querySelector('.easy-next-step').click();
  assert.equal(w.BayTagCapture.getStage(),'photos');
  assert.equal(d.getElementById('bearPhoto').closest('section.panel').classList.contains('capture-pane-hidden'),false);
  assert.equal(d.getElementById('dept').closest('section.panel').classList.contains('capture-pane-hidden'),true);
  assert.ok(d.getElementById('bayPhoto'));
  assert.ok(d.getElementById('bearUpload'));
  w.close();
});
test('photo preview is the original interactive camera stage and no photo is persisted',()=>{
  const w=start(),d=w.document,raw=w.localStorage.getItem(KEY);
  w.BayTagCapture.openCapture('photos');
  assert.ok(d.getElementById('captureCameraFrame').contains(d.getElementById('bearStage')));
  assert.ok(d.getElementById('photoChoice').closest('.field').classList.contains('easy-photo-picker-hidden'));
  assert.ok(d.getElementById('easyPhotoNav'));
  assert.equal(w.localStorage.getItem(KEY),raw);
  w.close();
});
test('review page displays actual editable SKU rows, date, quantity and location',()=>{
  const w=start(),d=w.document;
  for(const [id,value] of [['dept','29'],['aisleNumber','32'],['bayNumber','018']]){
    const input=d.getElementById(id);input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));
  }
  w.makeBearRow({sku:'766-154',qty:'80',tagDate:'2024-05-11'});
  w.makeBearRow({sku:'512-626',qty:'166',tagDate:'2025-09-19'});
  w.BayTagCapture.openReview();
  assert.equal(w.BayTagCapture.getRoute(),'review');
  assert.equal(d.getElementById('captureReviewView').classList.contains('hidden'),false);
  assert.ok(d.getElementById('captureReviewView').contains(d.getElementById('bearRows')));
  assert.ok(d.getElementById('captureReviewView').contains(d.getElementById('saveBearRows')));
  assert.equal(d.getElementById('captureReviewDepartment').textContent,'29');
  assert.equal(d.getElementById('captureReviewAisle').textContent,'32');
  assert.equal(d.getElementById('captureReviewBay').textContent,'018');
  assert.equal(d.getElementById('captureItemCount').textContent,'2');
  assert.equal(d.getElementById('captureQuantityCount').textContent,'246');
  assert.equal(d.querySelector('#bearRows [data-field="tagDate"]').value,'2024-05-11');
  w.close();
});
test('reviewed capture saves through original inventory path and retains old records',()=>{
  const w=start(),d=w.document;
  for(const [id,value] of [['dept','29'],['aisleNumber','32'],['bayNumber','018']])d.getElementById(id).value=value;
  w.makeBearRow({sku:'888-333',qty:'5',tagDate:'2026-11-16'});
  w.BayTagCapture.openReview();
  d.getElementById('saveBearRows').click();
  const saved=JSON.parse(w.localStorage.getItem(KEY));
  assert.equal(saved.length,3);
  assert.equal(saved.find(r=>r.sku==='888-333').quantity,5);
  assert.equal(saved.find(r=>r.id==='keep').legacy,'preserve-me');
  assert.equal(saved.find(r=>r.id==='second').extra.field,'keep');
  assert.equal(w.BayTagCapture.getRoute(),'inventory');
  w.close();
});
test('returning from Review to Photos keeps unsaved rows without writing storage',()=>{
  const w=start(),d=w.document,before=w.localStorage.getItem(KEY);
  w.makeBearRow({sku:'777-123',qty:'6'});
  w.BayTagCapture.openReview();
  d.getElementById('captureBackToPhotos').click();
  assert.equal(w.BayTagCapture.getStage(),'photos');
  assert.equal(d.getElementById('bearRows').children.length,1);
  assert.equal(w.localStorage.getItem(KEY),before);
  w.close();
});
test('Saved Inventory and History tabs use existing functionality',()=>{
  const w=start(),d=w.document;
  d.getElementById('captureNavInventory').click();
  assert.equal(w.BayTagCapture.getRoute(),'inventory');
  assert.equal(d.getElementById('inventoryView').classList.contains('hidden'),false);
  assert.ok(d.getElementById('baytagInventoryTools'));
  d.getElementById('captureNavHistory').click();
  assert.equal(w.BayTagCapture.getRoute(),'history');
  assert.equal(d.getElementById('historyView').classList.contains('hidden'),false);
  d.getElementById('captureNavHome').click();
  assert.equal(w.BayTagCapture.getRoute(),'home');
  assert.match(d.getElementById('captureHomeTotals').textContent,/2 saved SKU records/);
  w.close();
});
test('editing a saved SKU exposes original manual editor and preserves metadata',()=>{
  const w=start(),d=w.document;
  w.BayTagCapture.openInventory();
  const edit=d.querySelector('#items .itemactions button');
  assert.equal(edit.textContent,'Edit');
  edit.click();
  assert.equal(w.BayTagCapture.getRoute(),'capture');
  assert.equal(w.BayTagCapture.getStage(),'photos');
  assert.equal(d.getElementById('easyManualEntry').open,true);
  d.getElementById('qty').value='81';
  d.getElementById('entryForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const saved=JSON.parse(w.localStorage.getItem(KEY));
  assert.equal(saved.find(r=>r.id==='keep').legacy,'preserve-me');
  assert.equal(saved.find(r=>r.id==='keep').quantity,81);
  w.close();
});
test('Home Review Captures opens an editable review if rows exist, or History otherwise',()=>{
  const w=start(),d=w.document;
  d.getElementById('captureHomeReview').click();
  assert.equal(w.BayTagCapture.getRoute(),'history');
  w.BayTagCapture.openHome();
  w.makeBearRow({sku:'777-001',qty:'8'});
  d.getElementById('captureHomeReview').click();
  assert.equal(w.BayTagCapture.getRoute(),'review');
  assert.equal(d.getElementById('captureItemCount').textContent,'1');
  w.close();
});
test('v3 offline assets, version metadata and existing storage key are consistent',()=>{
  const version=JSON.parse(fs.readFileSync('version.json','utf8'));
  const sw=fs.readFileSync('sw.js','utf8');
  const main=fs.readFileSync('index.html','utf8');
  assert.equal(version.version,'3.0.1');assert.equal(version.releaseStatus,'stable');
  assert.match(sw,/baytag-pwa-v3-0-1-stable/);
  assert.match(sw,/baytag-capture\.js/);
  assert.match(main,/baytag-inventory-v1/);
  assert.match(main,/baytag-capture\.js/);
});
