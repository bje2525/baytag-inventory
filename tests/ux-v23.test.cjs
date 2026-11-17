const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
function start(){
 const html=fs.readFileSync('index.html','utf8'),dom=new JSDOM(html,{url:'https://baytag.test/',runScripts:'outside-only'}),w=dom.window;
 w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],dom.getInternalVMContext());
 vm.runInContext(fs.readFileSync('baytag-upgrades.js','utf8'),dom.getInternalVMContext());
 vm.runInContext(fs.readFileSync('baytag-easy-mode.js','utf8'),dom.getInternalVMContext());
 return w;
}
test('redundant yellow helper is gone, original location controls remain',()=>{
 const w=start(),d=w.document;
 assert.doesNotMatch(d.body.textContent,/On the yellow tag, find the department number at the top/);
 for(const id of ['dept','aisleNumber','bayNumber','scanBay'])assert.ok(d.getElementById(id));
 w.close();
});
test('hidden photo selector still exists for the scanning engine',()=>{
 const w=start(),d=w.document;
 assert.ok(d.getElementById('photoChoice').closest('.field').classList.contains('easy-photo-picker-hidden'));
 assert.equal(typeof d.getElementById('photoChoice').onchange,'function');
 assert.equal(d.getElementById('easyPhotoNav').hidden,true);
 w.close();
});
test('multiple photos show working Previous and Next controls',()=>{
 const w=start(),d=w.document,select=d.getElementById('photoChoice'),nav=d.getElementById('easyPhotoNav');
 w.eval("selectedPhotos.bear=[{name:'a.jpg'},{name:'b.jpg'}]");
 w.eval("photoPreviewUrls=['blob:a','blob:b']");
 // The real photo upload handler clears the initial placeholder option.
 select.replaceChildren();
 for(let i=0;i<2;i++){const option=d.createElement('option');option.value=String(i);option.textContent='Photo '+(i+1);select.append(option)}
 select.disabled=false;select.value='0';select.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(nav.hidden,false);assert.match(nav.textContent,/Photo 1 of 2/);
 nav.querySelectorAll('button')[1].click();
 assert.equal(select.value,'1');assert.match(nav.textContent,/Photo 2 of 2/);
 nav.querySelectorAll('button')[0].click();assert.equal(select.value,'0');
 w.close();
});
test('progress and continue guidance never save inventory automatically',()=>{
 const w=start(),d=w.document,before=w.localStorage.getItem('baytag-inventory-v1');
 assert.match(d.querySelector('.easy-workflow-hint').textContent,/yellow location tag/i);
 assert.ok(d.querySelector('.easy-next-step'));
 d.querySelector('.easy-next-step').click();
 assert.equal(w.localStorage.getItem('baytag-inventory-v1'),before);
 w.close();
});
test('v2.3 stable cache/version match',()=>{
 assert.equal(JSON.parse(fs.readFileSync('version.json','utf8')).version,'3.0.1');
 assert.match(fs.readFileSync('sw.js','utf8'),/baytag-pwa-v3-0-1-stable/);
});
