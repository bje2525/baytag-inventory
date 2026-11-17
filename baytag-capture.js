/* BayTag Capture v3.0.0: original, independent retail capture UI.
   Presentation/navigation only. Existing OCR, records, storage, backups and
   save/duplicate confirmation functions remain the source of truth. */
(() => {
  'use strict';
  if (window.BayTagCaptureLoaded) return;
  const byId = id => document.getElementById(id);
  const main = document.querySelector('main');
  const addView = byId('addView');
  const inventoryView = byId('inventoryView');
  const historyView = byId('historyView');
  const form = byId('entryForm');
  const oldTabs = main?.querySelector(':scope > .tabs');
  const locationPanel = byId('dept')?.closest('section.panel');
  const photoPanel = byId('bearPhoto')?.closest('section.panel');
  const reviewRows = byId('bearRows');
  const reviewEditor = byId('multiBear');
  const originalSwitch = window.switchTab;
  if (!main || !addView || !inventoryView || !form || !locationPanel ||
      !photoPanel || !reviewRows || !reviewEditor ||
      typeof originalSwitch !== 'function') return;

  const make = (tag, className, label) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (label !== undefined) el.textContent = label;
    return el;
  };
  const button = (text, className, action, id) => {
    const b = make('button', className || '', text);
    b.type = 'button';
    if (id) b.id = id;
    b.addEventListener('click', action);
    return b;
  };
  const css = make('style');
  css.id = 'captureV3Style';
  css.textContent = [
    ':root{--cap-orange:#ed6507;--cap-white:#fff;--cap-charcoal:#202123}',
    'body.capture-v3-ready{background:#171819;color:#f6f6f6}',
    'body.capture-v3-ready>header{background:linear-gradient(125deg,#f47712,#e45600);border:0;color:#fff;min-height:108px;box-shadow:0 3px 15px #0004}',
    'body.capture-v3-ready header h1{font-size:24px;font-weight:850;letter-spacing:-.4px;color:#fff}',
    'body.capture-v3-ready header .logo{color:#fff}',
    'body.capture-v3-ready header small{color:#fff5e9;display:block;margin-top:4px;font-size:12px}',
    'body.capture-v3-ready header .pill{background:#fff2;color:#fff;border:1px solid #fffa}',
    'body.capture-v3-ready main{padding-bottom:calc(100px + env(safe-area-inset-bottom));max-width:980px}',
    'body.capture-v3-ready main>.tabs{display:none!important}',
    'body.capture-v3-ready #addView>.easy-welcome,body.capture-v3-ready #addView>.easy-progress,body.capture-v3-ready #addView>.easy-workflow-hint,body.capture-v3-ready #addView>.notice{display:none!important}',
    'body.capture-v3-ready #addView .capture-pane-hidden{display:none!important}',
    'body.capture-v3-ready #addView>form>section.panel{border:1px solid #45474b;background:#222325;border-radius:17px;padding:18px}',
    'body.capture-v3-ready #addView>form>section.panel h2{font-size:20px;color:#fff}',
    'body.capture-v3-ready #addView .easy-next-step{background:#ed6507;color:#fff;border-color:#ed6507}',
    '.capture-v3-home{padding:10px 0 14px}',
    '.capture-v3-home h2{font-size:24px;margin:4px 0 6px;color:#fff}',
    '.capture-subtitle{color:#c6c8cb;font-size:14px;margin:0 0 16px;line-height:1.5}',
    '.capture-loc-card{width:100%;display:flex;align-items:center;text-align:left;gap:12px;padding:17px 15px;border-radius:15px;background:#f6f7f8;border:1px solid #d9dbdf;color:#202326;min-height:86px;margin-bottom:16px}',
    '.capture-loc-card .capture-pin{font-size:28px;color:#ed6507}',
    '.capture-loc-card small{display:block;color:#696d74;font-size:12px;margin-bottom:4px}',
    '.capture-loc-card strong{font-size:16px;line-height:1.5;display:block;color:#141517}',
    '.capture-loc-card .capture-arrow{margin-left:auto;font-size:22px;color:#555}',
    '.capture-v3-action{width:100%;min-height:74px;background:#ed6507;border:1px solid #ff8d45;color:#fff;font-size:20px;font-weight:850;display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:16px;padding:16px 18px;margin:14px 0 20px}',
    '.capture-v3-action span{font-size:25px}',
    '.capture-home-tiles{display:grid;gap:11px}',
    '.capture-home-tiles button{border:1px solid #4e5054;background:linear-gradient(145deg,#393b3f,#292b2f);color:#fff;text-align:left;min-height:88px;border-radius:15px;padding:16px;display:flex;align-items:center;gap:15px}',
    '.capture-home-tiles .tile-icon{font-size:28px;flex:0 0 35px;text-align:center}',
    '.capture-home-tiles strong{display:block;font-size:17px}',
    '.capture-home-tiles small{display:block;color:#c4c6ca;font-size:12px;margin-top:4px;line-height:1.5}',
    '.capture-home-tiles .capture-arrow{margin-left:auto;font-size:22px}',
    '.capture-home-mini{background:#26282c;padding:14px;border-radius:13px;color:#e7e7e7;margin:15px 0 6px;line-height:1.5;font-size:13px}',
    '.capture-screen-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:6px 0 14px}',
    '.capture-screen-head h2{margin:0;font-size:23px}',
    '.capture-screen-head button{padding:10px;font-size:14px;min-height:45px}',
    '.capture-steps{display:flex;align-items:stretch;justify-content:space-between;gap:6px;margin:12px 0 17px}',
    '.capture-step-button{flex:1;min-width:0;border:0;background:transparent;color:#bfc1c7;padding:7px 0 10px;font-size:12px;font-weight:700;border-bottom:3px solid #444;text-align:center;border-radius:0}',
    '.capture-step-button .capture-num{display:grid;place-items:center;border:1px solid #85878d;border-radius:999px;margin:0 auto 6px;width:34px;height:34px;font-size:15px}',
    '.capture-step-button.is-active{color:#fff;border-color:#ff7a18}',
    '.capture-step-button.is-active .capture-num{border:0;color:#fff;background:#ed6507}',
    '.capture-step-button.is-done .capture-num{background:#355943;border-color:#68a87e;color:#fff}',
    '.capture-inline-info{border-left:4px solid #ee7119;background:#2b2926;border-radius:10px;padding:13px 15px;color:#f2e8df;font-size:14px;line-height:1.5;margin:12px 0}',
    '.capture-step-actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}',
    '.capture-step-actions button{flex:1;min-height:50px;font-weight:750}',
    '.capture-step-actions .cap-cta{background:#ed6507;border-color:#ed6507;color:#fff}',
    '.capture-camera-frame{position:relative;background:linear-gradient(150deg,#353230,#17191b);border:2px solid #ec711d;border-radius:17px;overflow:hidden;min-height:210px;margin:13px 0}',
    '.capture-camera-frame:before,.capture-camera-frame:after{content:"";pointer-events:none;position:absolute;width:35px;height:35px;border:4px solid #fff;border-bottom:0;border-right:0;top:13px;left:13px;border-radius:8px 0 0 0;z-index:2}',
    '.capture-camera-frame:after{left:auto;right:13px;top:auto;bottom:13px;transform:rotate(180deg)}',
    '.capture-camera-placeholder{min-height:210px;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;text-align:center;color:#ece6de;padding:25px 20px;font-size:15px}',
    '.capture-camera-placeholder .capture-camera-glyph{font-size:52px}',
    '.capture-camera-frame.has-photo .capture-camera-placeholder{display:none}',
    '.capture-camera-frame #bearStage{margin:0;max-width:100%}',
    '.capture-camera-frame #bearStage img{border-radius:0;max-height:520px;object-fit:contain}',
    '.capture-photo-helper{color:#f4c399;font-size:13px;margin:8px 0 14px;line-height:1.5}',
    '.capture-nav{position:fixed;z-index:25;bottom:0;left:50%;transform:translateX(-50%);width:min(100%,980px);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:#1c1d20;border-top:1px solid #4c4c4c;padding:9px 8px calc(8px + env(safe-area-inset-bottom));box-shadow:0 -8px 30px #0006}',
    '.capture-nav button{border:0;background:transparent;min-height:55px;padding:5px 1px 3px;color:#d5d5d5;font-weight:650;font-size:12px;border-bottom:3px solid transparent;border-radius:0}',
    '.capture-nav button span{font-size:22px;display:block;margin-bottom:4px}',
    '.capture-nav button.is-active{color:#ff8730;border-bottom-color:#ff8730}',
    'body.capture-v3-ready footer{padding-bottom:calc(95px + env(safe-area-inset-bottom))}',
    '.capture-review-screen{background:#f3f4f6;color:#191b1f;border-radius:18px;padding:16px 13px 25px;margin:7px 0 20px}',
    '.capture-review-screen h2{font-size:22px;color:#17191c;margin:0 0 10px}',
    '.capture-review-screen .capture-steps .capture-step-button{color:#6a7077}',
    '.capture-review-screen .capture-steps .capture-step-button.is-active{color:#de610a}',
    '.capture-review-card{border:1px solid #d3d8dd;background:#fff;border-radius:13px;box-shadow:0 1px 3px #0001;padding:15px;margin:12px 0}',
    '.capture-review-card h3{font-size:16px;color:#25282d;margin:0 0 13px}',
    '.capture-location-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));text-align:center}',
    '.capture-location-grid>div{border-right:1px solid #ddd}',
    '.capture-location-grid>div:last-child{border:0}',
    '.capture-location-grid small{display:block;color:#555e68;font-size:12px}',
    '.capture-location-grid strong{display:block;font-size:25px;color:#101316;margin-top:5px;overflow-wrap:anywhere}',
    '.capture-review-summary p{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #ececec;padding:7px 0;margin:0}',
    '.capture-review-summary p:last-child{border:0}',
    '.capture-review-summary strong{font-size:19px}',
    '.capture-review-screen #multiBear{margin:16px 0!important}',
    '.capture-review-screen #multiBear h3{color:#222;font-size:18px}',
    '.capture-review-screen #multiBear>.hint{color:#4d545c}',
    '.capture-review-screen #bearRows>.panel{background:#fff;color:#17191d;border:1px solid #ced3d9;border-left:4px solid #ed6507;border-radius:12px;margin:12px 0}',
    '.capture-review-screen #bearRows .field label{color:#33383e}',
    '.capture-review-screen #bearRows input{background:#fff;color:#14171a;border:1px solid #aeb5bc}',
    '.capture-review-screen #bearRows button{background:#f1f1f1;color:#333;border-color:#b8bdc2}',
    '.capture-review-screen .easy-review-summary{background:#fff5e6;color:#333;border-color:#eeae6a}',
    '.capture-review-screen .easy-review-summary strong{color:#25272b}',
    '.capture-review-screen #saveBearRows{background:#ed6507;border-color:#ed6507;color:#fff;min-height:61px;font-size:19px}',
    '.capture-review-empty{border:1px dashed #b5bac1;border-radius:11px;padding:24px;color:#545b65;text-align:center;background:#fff;line-height:1.5}',
    '.capture-review-note{font-size:13px;color:#4e5861;line-height:1.5;padding:5px}',
    '@media(max-width:560px){body.capture-v3-ready main{padding-left:12px;padding-right:12px}.capture-v3-home h2{font-size:21px}.capture-loc-card strong{font-size:14px}.capture-home-tiles button{min-height:78px}.capture-review-screen{padding:13px 10px 20px}.capture-review-card{padding:13px}.capture-location-grid strong{font-size:21px}.capture-nav button{font-size:11px}}',
    '@media(prefers-reduced-motion:reduce){.capture-nav,.capture-step-button{scroll-behavior:auto}}'
  ].join('\n');
  document.head.append(css);

  document.title = 'BayTag Capture v3.0';
  const header = document.querySelector('body>header');
  const headline = header?.querySelector('h1');
  if (headline) headline.textContent = '▣ BayTag Capture v3.0';
  const strapline = header?.querySelector('small');
  if (strapline) strapline.textContent = 'Independent inventory management';

  const home = make('section', 'capture-v3-home');
  home.id = 'captureHome';
  home.append(make('h2', '', 'Your Bay Capture Dashboard'));
  home.append(make('p', 'capture-subtitle', 'Photograph location tags, review detected items, and manage saved inventory.'));
  const locationCard = button('', 'capture-loc-card', () => openCapture('location'), 'captureHomeLocation');
  const pin = make('span','capture-pin','📍');
  const locationInfo = make('span');
  const locationLabel = make('small','','Current location');
  const locationValue = make('strong','','No bay selected');
  locationInfo.append(locationLabel,locationValue);
  locationCard.append(pin,locationInfo,make('span','capture-arrow','›'));
  home.append(locationCard);
  const startCapture = button('', 'capture-v3-action', () => openCapture('location'), 'captureStart');
  startCapture.append(make('span','','📷'),make('strong','','Start Bay Capture'),make('span','','›'));
  home.append(startCapture);
  const tiles = make('div','capture-home-tiles');
  const makeTile = (id,icon,title,desc,onClick) => {
    const tile = button('', '', onClick, id);
    const content = make('span');
    content.append(make('strong','',title),make('small','',desc));
    tile.append(make('span','tile-icon',icon),content,make('span','capture-arrow','›'));
    tiles.append(tile);
  };
  makeTile('captureHomeReview','📋','Review Captures','Check unsaved items or recent capture activity',()=>{
    if (reviewRows.children.length) openReview();
    else openHistory();
  });
  makeTile('captureHomeInventory','📦','Saved Inventory','View SKUs, quantities, filters and backups',openInventory);
  makeTile('captureHomeHistory','◷','History','Past scanning and inventory changes',openHistory);
  home.append(tiles);
  const homeTotals = make('p','capture-home-mini');
  homeTotals.id='captureHomeTotals';
  home.append(homeTotals);
  main.insertBefore(home,oldTabs||addView);

  const reviewScreen = make('section','capture-review-screen hidden');
  reviewScreen.id = 'captureReviewView';
  reviewScreen.append(make('h2','','Review Capture'));
  const reviewSteps = make('div','capture-steps');
  reviewScreen.append(reviewSteps);
  const locationSummary = make('section','capture-review-card');
  locationSummary.append(make('h3','','📍 Capture Location'));
  const locGrid = make('div','capture-location-grid');
  const locOutput = {};
  for (const [key,label] of [['department','Department'],['aisle','Aisle'],['bay','Bay']]) {
    const field = make('div');
    field.append(make('small','',label));
    const value = make('strong','','—');
    value.id = 'captureReview'+key.charAt(0).toUpperCase()+key.slice(1);
    field.append(value);locGrid.append(field);
    locOutput[key]=value;
  }
  locationSummary.append(locGrid);
  reviewScreen.append(locationSummary);
  const countsCard = make('section','capture-review-card capture-review-summary');
  countsCard.append(make('h3','','▥ Capture Summary'));
  const countRow = (name,id) => {
    const row=make('p');
    const value=make('strong','','0');value.id=id;
    row.append(make('span','',name),value);
    countsCard.append(row);
    return value;
  };
  const itemCount = countRow('Detected SKU entries','captureItemCount');
  const quantityCount = countRow('Total quantity','captureQuantityCount');
  const needsCount = countRow('Entries to check','captureNeedsCount');
  reviewScreen.append(countsCard);
  const emptyReview = make('div','capture-review-empty','No items to review yet. Take or choose BEAR tag photos, then use “Find SKUs in my photos.”');
  emptyReview.id='captureEmptyReview';
  reviewScreen.append(emptyReview);
  const editorCard=make('section','capture-review-card');
  editorCard.id='captureEditorCard';
  editorCard.append(reviewEditor);
  reviewScreen.append(editorCard);
  reviewScreen.append(make('p','capture-review-note','Verify all detected SKU numbers, quantities and dates against the physical tags. Dates that cannot be read may be left blank. Photos are temporary; saved records stay on this device.'));
  reviewScreen.append(button('← Back to photos','',() => openCapture('photos'), 'captureBackToPhotos'));
  main.append(reviewScreen);

  const captureHeading = make('div','capture-screen-head');
  captureHeading.append(make('h2','','Bay Capture'));
  captureHeading.append(button('← Home','',openHome,'captureBackHome'));
  addView.insertBefore(captureHeading,addView.firstChild);
  const captureSteps=make('div','capture-steps');
  addView.insertBefore(captureSteps,form);
  const stepLabels=[['location','1','Location'],['photos','2','Photos'],['review','3','Review']];
  const stageButtons=[];
  for (const [stage,num,name] of stepLabels) {
    const buildStep = () => {
      const el = button('', 'capture-step-button',()=>stage==='review'?openReview():openCapture(stage));
      el.dataset.captureStepTarget=stage;
      el.setAttribute('aria-label','Step '+num+' '+name);
      el.append(make('span','capture-num',num),make('span','',name));
      stageButtons.push(el);
      return el;
    };
    captureSteps.append(buildStep());
    reviewSteps.append(buildStep());
  }
  if (locationPanel.querySelector('h2')) locationPanel.querySelector('h2').textContent = 'Step 1 · Identify the bay';
  if (photoPanel.querySelector('h2')) photoPanel.querySelector('h2').textContent = 'Step 2 · Photograph the BEAR tags';
  const locationNote = make('p','capture-inline-info','Scan the yellow bay tag or enter the department, aisle and bay. Confirm the numbers before continuing.');
  locationPanel.insertBefore(locationNote,locationPanel.querySelector('.grid')||locationPanel.firstChild);
  const oldNext=locationPanel.querySelector('.easy-next-step');
  if(oldNext){
    oldNext.textContent = 'Continue to Step 2 · Take photos →';
    oldNext.addEventListener('click',()=>openCapture('photos'));
  }
  const photoHelp = make('p','capture-photo-helper','Take a clear photo of each white BEAR tag. Photos show here for review; the app will not automatically save anything.');
  const photoField = byId('bearPhoto')?.closest('.field');
  const stage = byId('bearStage');
  if (photoField && stage) {
    const frame=make('div','capture-camera-frame');
    frame.id='captureCameraFrame';
    const placeholder=make('div','capture-camera-placeholder');
    placeholder.append(make('span','capture-camera-glyph','▣'),make('strong','','BEAR tag camera preview'),make('span','','Take or choose a tag photo to see it here.'));
    frame.append(placeholder,stage);
    const nav=byId('easyPhotoNav');
    photoField.insertBefore(frame,nav||photoField.firstChild);
    photoField.insertBefore(photoHelp,frame);
    const refreshFrame=()=>frame.classList.toggle('has-photo',!!byId('bearPreview')?.getAttribute('src'));
    const img=byId('bearPreview');
    if(img)new MutationObserver(refreshFrame).observe(img,{attributes:true,attributeFilter:['src']});
    refreshFrame();
  }
  const captureActions=make('div','capture-step-actions');
  const backLocation=button('← Edit location','',()=>openCapture('location'),'captureEditLocation');
  const goReview=button('Review detected SKUs →','cap-cta',openReview,'captureGoReview');
  captureActions.append(backLocation,goReview);
  photoPanel.append(captureActions);
  const existingReviewJump=byId('easyReviewJump');
  if(existingReviewJump){
    existingReviewJump.textContent='Review detected SKUs →';
    existingReviewJump.addEventListener('click',openReview);
  }

  const nav=make('nav','capture-nav');
  nav.id='captureBottomNav';
  nav.setAttribute('aria-label','Primary navigation');
  const navButtons={};
  for (const [id,icon,label,callback] of [
    ['home','⌂','Home',openHome],
    ['capture','📷','Capture',()=>openCapture('location')],
    ['inventory','⬡','Inventory',openInventory],
    ['history','◷','History',openHistory]
  ]) {
    const el=button('', '',callback,'captureNav'+id.charAt(0).toUpperCase()+id.slice(1));
    el.dataset.captureNav=id;
    el.setAttribute('aria-label',label);
    el.append(make('span','',icon),make('strong','',label));
    nav.append(el);
    navButtons[id]=el;
  }
  document.body.append(nav);

  let currentRoute='home';
  let captureStage='location';
  const visible = (el,isVisible) => { if(el)el.classList.toggle('hidden',!isVisible); };
  function locationParts() {
    const department=byId('dept')?.value.trim()||'';
    let aisle=byId('aisleNumber')?.value.trim()||'';
    let bay=byId('bayNumber')?.value.trim()||'';
    if (!aisle || !bay) {
      const legacy=byId('bay')?.value.trim()||'';
      const match=legacy.match(/^(\d{1,2})-(\d{1,3})$/);
      if(match){aisle=aisle||match[1];bay=bay||match[2];}
    }
    return {department,aisle,bay};
  }
  function refreshHome() {
    const data=locationParts();
    const hasCurrent=Boolean(data.department&&data.aisle&&data.bay);
    let shown=data;
    let recent=false;
    if(!hasCurrent && typeof records!=='undefined' && Array.isArray(records) && records.length){
      const item=records[0]||{};
      const m=String(item.bay||'').match(/^(\d{1,2})-(\d{1,3})$/);
      if(m){shown={department:String(item.department||''),aisle:m[1],bay:m[2]};recent=true;}
    }
    locationLabel.textContent=hasCurrent?'Current capture':recent?'Last saved location':'Current location';
    locationValue.textContent=(hasCurrent||recent)
      ? 'Dept '+(shown.department||'—')+' · Aisle '+shown.aisle+' · Bay '+shown.bay
      : 'No bay selected — start a capture';
    const list=typeof records!=='undefined'&&Array.isArray(records)?records:[];
    const units=list.reduce((a,r)=>a+(Number(r?.quantity)||0),0);
    const needs=list.filter(r=>r?.status==='Needs review').length;
    homeTotals.textContent=list.length+' saved SKU records · '+units.toLocaleString()+' units · '+needs+' need review. Inventory is stored locally on this device.';
  }
  function refreshReview() {
    const data=locationParts();
    locOutput.department.textContent=data.department||'—';
    locOutput.aisle.textContent=data.aisle||'—';
    locOutput.bay.textContent=data.bay||'—';
    const rows=[...reviewRows.children];
    let quantity=0,need=0;
    for(const row of rows){
      const sku=row.querySelector('[data-field="sku"]')?.value.trim()||'';
      const qty=row.querySelector('[data-field="qty"]')?.value.trim()||'';
      const date=row.querySelector('[data-field="tagDate"]')?.value.trim()||'';
      if(/^\d+$/.test(qty))quantity+=Number(qty);
      if(!/^\d{3}-\d{3}$/.test(sku)||!/^\d+$/.test(qty)||!date)need++;
    }
    itemCount.textContent=String(rows.length);
    quantityCount.textContent=quantity.toLocaleString();
    needsCount.textContent=String(need);
    emptyReview.classList.toggle('hidden',rows.length>0);
    editorCard.classList.toggle('hidden',rows.length===0);
    if(rows.length && reviewEditor.classList.contains('hidden'))reviewEditor.classList.remove('hidden');
    goReview.textContent=rows.length?'Review '+rows.length+' detected SKU '+(rows.length===1?'entry':'entries')+' →':'Review detected SKUs →';
  }
  function refreshSteps(stage) {
    const loc=locationParts();
    const complete=!!(loc.department&&loc.aisle&&loc.bay);
    const hasRows=reviewRows.children.length>0;
    for(const step of stageButtons) {
      const s=step.dataset.captureStepTarget;
      step.classList.toggle('is-active',s===stage);
      step.classList.toggle('is-done',(s==='location'&&complete&&stage!=='location')||(s==='photos'&&hasRows&&stage==='review'));
      if(s===stage)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');
    }
  }
  function activateNav(target) {
    for(const [id,el] of Object.entries(navButtons)){
      const yes=id===target;
      el.classList.toggle('is-active',yes);
      if(yes)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
    }
  }
  function scrollTop() {
    if(typeof window.scrollTo==='function') {
      try {window.scrollTo({top:0,behavior:'instant'});}catch(_){}
    }
  }
  function openHome() {
    currentRoute='home';
    visible(home,true);visible(addView,false);visible(inventoryView,false);
    visible(historyView,false);visible(reviewScreen,false);
    activateNav('home');refreshHome();scrollTop();
  }
  function openCapture(stage='location') {
    captureStage=stage==='photos'?'photos':'location';
    window.switchTab('add');
    refreshHome();scrollTop();
  }
  function openReview() {
    currentRoute='review';
    visible(home,false);visible(addView,false);visible(inventoryView,false);
    visible(historyView,false);visible(reviewScreen,true);
    refreshReview();refreshSteps('review');activateNav('capture');scrollTop();
  }
  function openInventory() {window.switchTab('inventory');scrollTop();}
  function openHistory() {window.switchTab('history');scrollTop();}
  window.switchTab = function(name) {
    const result=originalSwitch.call(this,name);
    if(name==='add') {
      currentRoute='capture';
      if(typeof editing!=='undefined'&&editing)captureStage='photos';
      visible(home,false);visible(reviewScreen,false);
      visible(addView,true);visible(inventoryView,false);visible(historyView,false);
      locationPanel.classList.toggle('capture-pane-hidden',captureStage!=='location');
      photoPanel.classList.toggle('capture-pane-hidden',captureStage!=='photos');
      refreshSteps(captureStage);activateNav('capture');
    } else if(name==='inventory') {
      currentRoute='inventory';
      visible(home,false);visible(reviewScreen,false);
      visible(addView,false);visible(inventoryView,true);visible(historyView,false);
      activateNav('inventory');
    } else if(name==='history') {
      currentRoute='history';
      visible(home,false);visible(reviewScreen,false);
      visible(addView,false);visible(inventoryView,false);visible(historyView,true);
      activateNav('history');
    }
    refreshHome();
    return result;
  };
  const watchLocation = ['dept','aisleNumber','bayNumber','bay'];
  for (const id of watchLocation) {
    byId(id)?.addEventListener('input',()=>{refreshHome();refreshReview();refreshSteps(currentRoute==='review'?'review':captureStage);});
    byId(id)?.addEventListener('change',()=>{refreshHome();refreshReview();refreshSteps(currentRoute==='review'?'review':captureStage);});
  }
  reviewRows.addEventListener('input',refreshReview);
  reviewRows.addEventListener('change',refreshReview);
  new MutationObserver(()=>{refreshReview();refreshSteps(currentRoute==='review'?'review':captureStage);})
    .observe(reviewRows,{childList:true});
  const reset=byId('resetBtn');
  if(reset)reset.addEventListener('click',()=>queueMicrotask(()=>{refreshHome();refreshReview();}));
  window.BayTagCapture={
    openHome,openCapture,openReview,openInventory,openHistory,
    getRoute:()=>currentRoute,getStage:()=>captureStage,
    getSummary:()=>({items:reviewRows.children.length,location:locationParts()})
  };
  window.BayTagCaptureLoaded=true;
  document.body.classList.add('capture-v3-ready');
  openHome();
})();