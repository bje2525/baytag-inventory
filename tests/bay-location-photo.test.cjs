const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const KEY='baytag-inventory-v1';
const seeded=JSON.stringify([{id:'keep',department:'29',bay:'32-018',sku:'766-154',quantity:80,legacy:'keep-me'}]);
function start(raw=seeded){
 const html=fs.readFileSync('index.html','utf8');
 const dom=new JSDOM(html,{url:'https://baytag.test/',runScripts:'outside-only'});
 const w=dom.window;
 w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};
 w.localStorage.setItem(KEY,raw);
 const context=dom.getInternalVMContext();
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
 for(const f of ['baytag-upgrades.js','baytag-easy-mode.js','baytag-inventory-tools.js','baytag-capture.js']){
   vm.runInContext(fs.readFileSync(f,'utf8'),context);
 }
 return w;
}
const formValues=w=>['dept','aisleNumber','bayNumber'].map(id=>w.document.getElementById(id).value);
const mockOcr=(w,text)=>{
 let calls=0;
 w.Tesseract={createWorker:async()=>({
   recognize:async()=>{calls++;return {data:{text}};},
   terminate:async()=>{}
 })};
 return ()=>calls;
};
test('Step 1 presents photo-first iPhone camera and upload above manual inputs',()=>{
 const w=start(),d=w.document;
 w.BayTagCapture.openCapture('location');
 const panel=d.getElementById('dept').closest('section.panel');
 const photo=d.getElementById('bayPhoto').closest('.field');
 const grid=panel.querySelector('.grid');
 assert.equal(photo.classList.contains('capture-location-photo'),true);
 assert.equal(photo.parentElement,panel);
 assert.ok([...panel.children].indexOf(photo)<[...panel.children].indexOf(grid));
 assert.equal(d.querySelector('label.filebtn[for="bayPhoto"]').textContent,'📷 Scan Yellow Bay Tag');
 assert.equal(d.querySelector('label.filebtn[for="bayUpload"]').textContent,'🖼️ Choose Existing Tag Photo');
 assert.equal(d.getElementById('bayPhoto').getAttribute('capture'),'environment');
 assert.equal(d.getElementById('bayPhoto').getAttribute('accept'),'image/*');
 assert.equal(d.getElementById('scanBay').classList.contains('capture-rescan-hidden'),true);
 assert.match(d.getElementById('bayScanStatus').textContent,/automatic location reading/);
 w.close();
});
test('yellow location parser reads complete three-part location 29-32-018',()=>{
 const w=start(),p=w.BayTagLocationParser.parseYellowLocation;
 assert.deepEqual(JSON.parse(JSON.stringify(p('29-32-018'))),{ambiguous:false,department:'29',aisle:'32',bay:'018'});
 assert.deepEqual(JSON.parse(JSON.stringify(p('29–32–018'))),{ambiguous:false,department:'29',aisle:'32',bay:'018'});
 w.close();
});
test('parser recognizes explicit department aisle and bay, and split line layout',()=>{
 const w=start(),p=w.BayTagLocationParser.parseYellowLocation;
 const labeled=p('DEPARTMENT 29\nAISLE 32\nBAY 018\nBARCODE 324111');
 assert.equal(labeled.department,'29');assert.equal(labeled.aisle,'32');assert.equal(labeled.bay,'018');
 const separate=p('29\n32-018\nBARCODE 0189588');
 assert.equal(separate.department,'29');assert.equal(separate.aisle,'32');assert.equal(separate.bay,'018');
 const pair=p('DEPT 29\n32-018');
 assert.equal(pair.department,'29');assert.equal(pair.bay,'018');
 w.close();
});
test('conflicting and unreadable yellow tag OCR cannot be treated as certain',()=>{
 const w=start(),p=w.BayTagLocationParser.parseYellowLocation;
 assert.equal(p('29-32-018 and 29-33-019').ambiguous,true);
 assert.equal(p('32-018 and 33-019').ambiguous,true);
 assert.equal(p('UNREADABLE BARCODE 012358888').aisle,'');
 w.close();
});
test('OCR suggestion confirms before filling separate Department Aisle Bay fields',async()=>{
 const w=start(),d=w.document,before=w.localStorage.getItem(KEY);
 const calls=mockOcr(w,'29-32-018');
 w.eval("selectedPhotos.bay=[{name:'bay.jpg'}]");
 w.BayTagCapture.openCapture('location');
 await w.scanPhoto('bay');
 assert.equal(calls(),1);
 assert.deepEqual(formValues(w),['29','32','018']);
 assert.equal(d.getElementById('bay').value,'32-018');
 assert.match(d.getElementById('bayScanStatus').textContent,/Location filled from photo/);
 assert.equal(w.localStorage.getItem(KEY),before);
 assert.match(d.getElementById('captureHomeLocation').textContent,/Dept 29 · Aisle 32 · Bay 018/);
 w.close();
});
test('user rejecting OCR suggestion leaves all location inputs and inventory unchanged',async()=>{
 const w=start(),before=w.localStorage.getItem(KEY);
 mockOcr(w,'29-32-018');
 w.confirm=()=>false;
 w.eval("selectedPhotos.bay=[{name:'bay.jpg'}]");
 await w.scanPhoto('bay');
 assert.deepEqual(formValues(w),['','','']);
 assert.match(w.document.getElementById('bayScanStatus').textContent,/not applied/);
 assert.equal(w.localStorage.getItem(KEY),before);
 w.close();
});
test('ambiguous OCR never prompts to overwrite fields or old saved records',async()=>{
 const w=start(),before=w.localStorage.getItem(KEY);
 const d=w.document;
 d.getElementById('dept').value='12';d.getElementById('aisleNumber').value='01';d.getElementById('bayNumber').value='002';
 mockOcr(w,'29-32-018 and 29-33-019');
 let confirmations=0;w.confirm=()=>{confirmations++;return true};
 w.eval("selectedPhotos.bay=[{name:'bay.jpg'}]");
 await w.scanPhoto('bay');
 assert.equal(confirmations,0);
 assert.deepEqual(formValues(w),['12','01','002']);
 assert.match(d.getElementById('bayScanStatus').textContent,/More than one possible bay/);
 assert.equal(w.localStorage.getItem(KEY),before);
 w.close();
});
test('new yellow-tag camera input automatically calls original OCR scanner once',async()=>{
 const w=start(),d=w.document,before=w.localStorage.getItem(KEY);
 const count=mockOcr(w,'DEPT 29 AISLE 32 BAY 018');
 const file=new w.File(['photo'],'yellow.jpg',{type:'image/jpeg'});
 const input=d.getElementById('bayPhoto');
 Object.defineProperty(input,'files',{configurable:true,value:[file]});
 input.dispatchEvent(new w.Event('change',{bubbles:true}));
 // Original file-input reader and new automatic OCR both run after the change event.
 await new Promise(resolve=>setTimeout(resolve,50));
 assert.equal(count(),1);
 assert.deepEqual(formValues(w),['29','32','018']);
 assert.equal(d.getElementById('scanBay').classList.contains('capture-rescan-hidden'),false);
 assert.equal(w.localStorage.getItem(KEY),before);
 w.close();
});
test('selecting an existing yellow tag photo also triggers OCR',async()=>{
 const w=start(),d=w.document,before=w.localStorage.getItem(KEY);
 const count=mockOcr(w,'29\n32-018');
 const file=new w.File(['photo'],'upload.png',{type:'image/png'});
 const input=d.getElementById('bayUpload');
 Object.defineProperty(input,'files',{configurable:true,value:[file]});
 input.dispatchEvent(new w.Event('change',{bubbles:true}));
 await new Promise(resolve=>setTimeout(resolve,50));
 assert.equal(count(),1);
 assert.deepEqual(formValues(w),['29','32','018']);
 assert.equal(w.localStorage.getItem(KEY),before);
 w.close();
});
test('OCR error keeps existing location, saved inventory, and manual entry available',async()=>{
 const w=start(),d=w.document,before=w.localStorage.getItem(KEY);
 d.getElementById('dept').value='29';d.getElementById('aisleNumber').value='32';d.getElementById('bayNumber').value='018';
 w.Tesseract={createWorker:async()=>{throw Error('OCR unavailable');}};
 w.eval("selectedPhotos.bay=[{name:'bad.jpg'}]");
 await w.scanPhoto('bay');
 assert.deepEqual(formValues(w),['29','32','018']);
 assert.match(d.getElementById('bayScanStatus').textContent,/OCR unavailable/);
 assert.equal(w.localStorage.getItem(KEY),before);
 w.close();
});
test('Step 1 can advance to Steps 2 and 3 after scanned location without auto-saving',async()=>{
 const w=start(),d=w.document,before=w.localStorage.getItem(KEY);
 mockOcr(w,'29-32-018');
 w.eval("selectedPhotos.bay=[{name:'yellow.jpg'}]");
 w.BayTagCapture.openCapture('location');
 await w.scanPhoto('bay');
 d.querySelector('.easy-next-step').click();
 assert.equal(w.BayTagCapture.getStage(),'photos');
 w.BayTagCapture.openReview();
 assert.equal(d.getElementById('captureReviewDepartment').textContent,'29');
 assert.equal(d.getElementById('captureReviewAisle').textContent,'32');
 assert.equal(d.getElementById('captureReviewBay').textContent,'018');
 assert.equal(w.localStorage.getItem(KEY),before);
 w.close();
});