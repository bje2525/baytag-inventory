/* BayTag optional development add-on v2.1. No network calls; does not migrate inventory. */
(() => {
  'use strict';
  if (window.BayTagUpgradesLoaded) return;
  window.BayTagUpgradesLoaded = true;
  const HISTORY_KEY = 'baytag-scan-history-v1';
  const STATUSES = ['Unverified', 'Verified', 'Needs review', 'Moved', 'Removed'];
  const byId = id => document.getElementById(id);
  const textNode = (tag, text, className) => {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const readHistory = () => {
    try { const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); return Array.isArray(data) ? data : []; }
    catch (_) { return []; }
  };
  const history = readHistory();
  const activity = (type, description, extra = {}) => {
    const event = { id: (globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random()), time: new Date().toISOString(), type, description, ...extra };
    history.unshift(event);
    if (history.length > 300) history.length = 300;
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
    catch (_) { console.warn('BayTag history could not be saved. Inventory remains separate.'); }
    renderHistory();
  };
  const statusFor = r => STATUSES.includes(r.status) ? r.status : 'Unverified';
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const prior = new Map(records.map(r => [r.id, JSON.parse(JSON.stringify(r))]));

  const formPanel = byId('sku')?.closest('section.panel');
  if (formPanel) {
    const field = textNode('div', '', 'field');
    const label = textNode('label', 'Inventory status'); label.htmlFor = 'entryStatus';
    const selector = document.createElement('select'); selector.id = 'entryStatus';
    for (const name of STATUSES) { const opt = document.createElement('option'); opt.value = name; opt.textContent = name; selector.append(opt); }
    field.append(label, selector);
    const grid = formPanel.querySelector('.grid');
    if (grid) { field.classList.add('full'); grid.append(field); }
    else formPanel.append(field);
  }

  // Wrap the existing storage function. A failed storage write is never logged as a success.
  const originalSave = window.save;
  if (typeof originalSave === 'function') {
    window.save = function () {
      const entryStatus = byId('entryStatus');
      for (const record of records) {
        if (!prior.has(record.id) || record.id === editing) {
          if (!STATUSES.includes(record.status)) record.status = entryStatus?.value || 'Unverified';
          else if (record.id === editing && entryStatus) record.status = entryStatus.value;
        }
      }
      const ok = originalSave();
      if (!ok) return false;
      const current = new Map(records.map(r => [r.id, JSON.parse(JSON.stringify(r))]));
      let added = 0, updated = 0, deleted = 0;
      for (const [id, record] of current) {
        if (!prior.has(id)) added++;
        else if (!same(prior.get(id), record)) updated++;
      }
      for (const id of prior.keys()) if (!current.has(id)) deleted++;
      prior.clear(); for (const [id, value] of current) prior.set(id, value);
      if (added || updated || deleted) activity('inventory', `${added} added · ${updated} updated · ${deleted} removed`, { added, updated, deleted });
      return true;
    };
  }

  const originalClearForm = window.clearForm;
  if (typeof originalClearForm === 'function') {
    window.clearForm = function (...args) {
      const result = originalClearForm.apply(this, args);
      if (byId('entryStatus')) byId('entryStatus').value = 'Unverified';
      return result;
    };
  }

  const originalRender = window.render;
  if (typeof originalRender === 'function') {
    window.render = function (...args) {
      const result = originalRender.apply(this, args);
      const q = (byId('search')?.value || '').toLowerCase();
      const visible = records.filter(r => [r.sku,r.bay,r.department,r.tagId,r.description,r.brand,r.model,r.bayBarcode].some(v => String(v || '').toLowerCase().includes(q)));
      const cards = byId('items')?.querySelectorAll('.item') || [];
      cards.forEach((card, index) => {
        const record = visible[index]; if (!record) return;
        const field = textNode('div', '', 'field');
        const label = textNode('label', 'Status');
        const select = document.createElement('select');
        select.setAttribute('aria-label', 'Status for SKU ' + record.sku + ' in bay ' + record.bay);
        for (const name of STATUSES) { const opt = document.createElement('option'); opt.value = name; opt.textContent = name; select.append(opt); }
        select.value = statusFor(record);
        select.onchange = () => {
          const previous = record.status;
          record.status = select.value;
          if (!window.save()) { record.status = previous; select.value = statusFor(record); }
          else window.render();
        };
        field.append(label, select); card.append(field);
        const edit = card.querySelector('.itemactions button');
        if (edit) edit.addEventListener('click', () => {
          queueMicrotask(() => { const el = byId('entryStatus'); if (el) el.value = statusFor(record); });
        });
      });
      return result;
    };
  }

  // Add a local activity tab; do not store camera images or OCR raw text.
  const tabs = document.querySelector('.tabs');
  const main = document.querySelector('main');
  const view = textNode('div', ''); view.id = 'historyView'; view.className = 'hidden';
  const panel = textNode('section', '', 'panel');
  panel.append(textNode('h2', 'Scan and inventory history'));
  const note = textNode('p', 'This history is stored only in this browser. It contains event summaries, not photographs.', 'hint');
  panel.append(note);
  const actions = textNode('div', '', 'actions');
  const exportButton = textNode('button', 'Export history JSON'); exportButton.type = 'button';
  exportButton.onclick = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'baytag-history-' + new Date().toISOString().slice(0,10) + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  actions.append(exportButton); panel.append(actions);
  const list = textNode('div', ''); list.id = 'historyEntries'; panel.append(list); view.append(panel);
  if (tabs && main) {
    const btn = textNode('button', 'History'); btn.id = 'tabHistory'; btn.type = 'button'; tabs.append(btn); main.append(view);
    const oldSwitchTab = window.switchTab;
    if (typeof oldSwitchTab === 'function') {
      window.switchTab = function (name) {
        view.classList.toggle('hidden', name !== 'history');
        btn.classList.toggle('active', name === 'history');
        if (name === 'history') { byId('addView')?.classList.add('hidden'); byId('inventoryView')?.classList.add('hidden'); byId('tabAdd')?.classList.remove('active'); byId('tabInventory')?.classList.remove('active'); renderHistory(); }
        else oldSwitchTab(name);
      };
      btn.onclick = () => window.switchTab('history');
    }
  }
  function renderHistory() {
    const target = byId('historyEntries'); if (!target) return;
    target.replaceChildren();
    if (!history.length) { target.append(textNode('p', 'No activity recorded yet.', 'muted')); return; }
    for (const event of history) {
      const card = textNode('div', '', 'item');
      const time = new Date(event.time);
      card.append(textNode('strong', event.type === 'scan' ? 'Photo scan' : 'Inventory change'));
      card.append(textNode('div', Number.isNaN(time.valueOf()) ? event.time : time.toLocaleString(), 'muted'));
      card.append(textNode('div', event.description)); target.append(card);
    }
  }

  const originalScanPhoto = window.scanPhoto;
  if (typeof originalScanPhoto === 'function') {
    window.scanPhoto = async function (kind) {
      const before = byId('bearRows')?.children.length || 0;
      try {
        await originalScanPhoto(kind);
        const after = byId('bearRows')?.children.length || 0;
        const status = byId(kind === 'bay' ? 'bayScanStatus' : 'bearScanStatus')?.textContent || '';
        activity('scan', (kind === 'bay' ? 'Bay' : 'BEAR') + ' photo review · ' + (kind === 'bear' ? Math.max(0,after-before) + ' review rows created · ' : '') + status.slice(0, 120));
      } catch (error) {
        activity('scan', (kind === 'bay' ? 'Bay' : 'BEAR') + ' scan failed');
        throw error;
      }
    };
  }
  renderHistory();

  /* v2.1 release-candidate enhancements: photo review, drawing boxes, resilient OCR.
     All outlines are ESTIMATES; photos remain temporary on this device. */
  const rcStyles = document.createElement('style');
  rcStyles.textContent = `
    .tabs{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scroll-snap-type:x proximity}
    .tabs button{flex:0 0 auto;min-width:108px;white-space:nowrap;scroll-snap-align:start;min-height:44px}
    .itemactions{flex-wrap:wrap}
    button,.filebtn{min-height:44px}
    .baytag-photo-tools{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
    .baytag-photo-tools-panel{background:#30251a;border:1px solid #a86a31;border-radius:12px;padding:12px;margin:12px 0}
    .baytag-photo-tools-panel h3{font-size:16px;margin:0 0 8px;color:#ffb677}
    .baytag-photo-tools button{flex:1 1 180px}
    .baytag-drawing #bearPreview{cursor:crosshair;touch-action:none}
    .baytag-drawing #bearOverlays{pointer-events:none}
    .baytag-drawing{outline:3px solid #64dbf3;outline-offset:3px}
    .baytag-row-tools{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
    .baytag-review-thumbnail{display:block;max-width:220px;max-height:130px;object-fit:contain;border:1px solid #805b36;border-radius:9px;margin-top:10px}
    .baytag-draw-box{position:absolute;border:3px dashed #61c5fb;background:#61c5fb20;pointer-events:none;border-radius:5px}
    .baytag-manual-box{position:absolute;border:3px solid #64dbf3;background:#64dbf320;border-radius:6px;padding:0;min-width:20px;min-height:20px}
    .baytag-manual-box span{position:absolute;top:0;left:0;background:#64dbf3;color:#121212;font-size:12px;padding:1px 4px}
    #baytagZoom{border:1px solid #f47b20;background:#171717;color:white;border-radius:14px;max-width:min(96vw,900px);max-height:92dvh;padding:14px}
    #baytagZoom::backdrop{background:#000c}
    #baytagZoom img{display:block;max-width:100%;max-height:72dvh;object-fit:contain;margin:12px auto}
    @media(max-width:560px){.tabs{margin-bottom:12px}.tabs button{font-size:13px;padding:11px 12px}#baytagZoom{width:96vw}}
  `;
  document.head.append(rcStyles);
  const zoom = document.createElement('dialog');
  zoom.id = 'baytagZoom';
  zoom.setAttribute('aria-label', 'BEAR tag image review');
  const zoomTitle = textNode('strong', 'Review original photo');
  const zoomImage = document.createElement('img');
  zoomImage.alt = 'Selected BEAR tag image for manual review';
  const zoomNote = textNode('p', 'OCR suggestions and orange outlines are estimates. Confirm every SKU and quantity.', 'hint');
  const zoomClose = textNode('button', 'Close image'); zoomClose.type = 'button';
  zoomClose.onclick = () => zoom.close();
  zoom.append(zoomTitle, zoomImage, zoomNote, zoomClose);
  document.body.append(zoom);

  async function displayedPhoto(index, rect = null) {
    const files = typeof selectedPhotos !== 'undefined' ? selectedPhotos.bear : [];
    const file = files?.[index];
    if (!file) return null;
    const src = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload=resolve; img.onerror=reject; img.src=src; });
      if (!rect) return { url:src, revoke:()=>URL.revokeObjectURL(src) };
      const x = Math.max(0, Math.min(100, rect.left))/100*img.naturalWidth;
      const y = Math.max(0, Math.min(100, rect.top))/100*img.naturalHeight;
      const w = Math.max(1, Math.min(100-rect.left, rect.width)/100*img.naturalWidth);
      const h = Math.max(1, Math.min(100-rect.top, rect.height)/100*img.naturalHeight);
      const scale = Math.min(1, 800 / Math.max(w,h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1,Math.floor(w*scale)); canvas.height=Math.max(1,Math.floor(h*scale));
      canvas.getContext('2d').drawImage(img,x,y,w,h,0,0,canvas.width,canvas.height);
      URL.revokeObjectURL(src);
      return {url:canvas.toDataURL('image/jpeg',.82),revoke:()=>{}};
    } catch (error) {URL.revokeObjectURL(src);return null;}
  }
  let currentZoomUrl = null;
  const zoomPreviousClose = zoomClose.onclick;
  zoomClose.onclick = () => {zoomPreviousClose();if(currentZoomUrl){URL.revokeObjectURL(currentZoomUrl);currentZoomUrl=null;}};
  zoom.addEventListener('close',()=>{if(currentZoomUrl){URL.revokeObjectURL(currentZoomUrl);currentZoomUrl=null;}});
  async function openZoom(photoIndex,rect=null) {
    const photo = await displayedPhoto(photoIndex,rect);
    if(!photo) {alert('The selected photo is not available. Upload the image again to review it.');return;}
    if(currentZoomUrl){URL.revokeObjectURL(currentZoomUrl);currentZoomUrl=null;}
    zoomImage.src = photo.url;
    currentZoomUrl = photo.url.startsWith('blob:') ? photo.url : null;
    zoomTitle.textContent = rect ? 'Review estimated tag crop — verify the original photo' : 'Review full BEAR photo';
    if(!zoom.open) zoom.showModal();
  }
  let drawingRow = null;
  let drawingStart = null;
  let drawingPreview = null;
  const stage = byId('bearStage');
  const overlay = byId('bearOverlays');
  const photoChoice = byId('photoChoice');
  function activePhotoIndex(){return Number(photoChoice?.value || 0);}
  function rowBounds(row){
    try {if (row.dataset.manualRect) return JSON.parse(row.dataset.manualRect);}catch(_){}
    const idx=Number(row.dataset.photoIndex),ri=Number(row.dataset.regionIndex);
    return typeof scannedPhotoRegions !== 'undefined' ? scannedPhotoRegions[idx]?.[ri]?.rect || null : null;
  }
  function redrawManualBoxes() {
    if(!overlay)return;
    overlay.querySelectorAll('.baytag-manual-box').forEach(el=>el.remove());
    const photoIndex=activePhotoIndex();
    for(const row of byId('bearRows')?.children || []){
      if(Number(row.dataset.photoIndex)!==photoIndex||!row.dataset.manualRect)continue;
      const rect=rowBounds(row);if(!rect)continue;
      const el=document.createElement('button');el.className='baytag-manual-box';el.type='button';
      for(const k of ['left','top','width','height'])el.style[k]=rect[k]+'%';
      el.setAttribute('aria-label','Review manually outlined BEAR tag');
      el.append(textNode('span','Manual tag'));
      el.onclick=()=>{row.scrollIntoView({block:'center',behavior:'smooth'});row.querySelector('input')?.focus({preventScroll:true});};
      overlay.append(el);
    }
  }
  const oldShowBearPhoto=window.showBearPhoto;
  if(typeof oldShowBearPhoto==='function'){
    window.showBearPhoto=function(i){const value=oldShowBearPhoto(i);redrawManualBoxes();return value;};
  }
  function finishDrawMode(){
    stage?.classList.remove('baytag-drawing');
    if(stage) stage.style.touchAction='';
    if(overlay) overlay.style.pointerEvents='';
  }
  function selectDrawRow(row){
    if(typeof selectedPhotos==='undefined'||!selectedPhotos.bear?.length){alert('Take or upload a BEAR photo first.');return;}
    drawingRow=row;
    row.dataset.photoIndex=String(activePhotoIndex());
    // Disable overlay hit targets and touch scrolling while drawing, especially on iPhone Safari.
    if(stage){stage.classList.add('baytag-drawing');stage.style.touchAction='none';}
    if(overlay)overlay.style.pointerEvents='none';
    byId('bearScanStatus').textContent='Draw mode ON: drag one blue rectangle around ONE tag. After drawing, scroll to its review row and enter the SKU and quantity. Blue boxes are manual, orange boxes are OCR estimates.';
    stage?.scrollIntoView({block:'center',behavior:'auto'});
  }
  function coords(event){
    const img=byId('bearPreview');if(!img)return null;
    const rect=img.getBoundingClientRect();
    if(!rect.width||!rect.height)return null;
    return {x:Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100)),y:Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100))};
  }
  function drawRect(start,end){
    return {left:Math.min(start.x,end.x),top:Math.min(start.y,end.y),width:Math.abs(end.x-start.x),height:Math.abs(end.y-start.y)};
  }
  function setRectStyle(node,r){for(const k of ['left','top','width','height'])node.style[k]=r[k]+'%';}
  if(stage&&overlay){
    stage.addEventListener('pointerdown',e=>{
      if(!drawingRow||!drawingRow.isConnected||e.target!==byId('bearPreview'))return;
      drawingStart=coords(e);if(!drawingStart)return;
      stage.setPointerCapture?.(e.pointerId);
      drawingPreview=document.createElement('div');drawingPreview.className='baytag-draw-box';overlay.append(drawingPreview);
      setRectStyle(drawingPreview,{left:drawingStart.x,top:drawingStart.y,width:0,height:0});
      e.preventDefault();
    });
    stage.addEventListener('pointermove',e=>{
      if(!drawingStart||!drawingPreview)return;
      const end=coords(e);if(end)setRectStyle(drawingPreview,drawRect(drawingStart,end));
    });
    stage.addEventListener('pointerup',e=>{
      if(!drawingStart)return;
      const end=coords(e);const rect=end?drawRect(drawingStart,end):null;
      drawingPreview?.remove();drawingPreview=null;drawingStart=null;
      if(rect&&rect.width>=3&&rect.height>=3&&drawingRow?.isConnected){
        drawingRow.dataset.manualRect=JSON.stringify(rect);
        drawingRow.dataset.regionIndex='-1';
        redrawManualBoxes();
        addRowPreview(drawingRow);
        byId('bearScanStatus').textContent='Manual blue outline set. Review this tag’s SKU and quantity before saving.';
      }else byId('bearScanStatus').textContent='Outline too small. Drag across the whole tag to try again.';
      drawingRow=null;finishDrawMode();
    });
    stage.addEventListener('pointercancel',()=>{drawingStart=null;drawingPreview?.remove();drawingPreview=null;drawingRow=null;finishDrawMode();});
  }

  let thumbnailSerial=0;
  async function addRowPreview(row){
    const index=Number(row.dataset.photoIndex);if(index<0||!Number.isInteger(index))return;
    const r=rowBounds(row);if(!r)return;
    const serial=String(++thumbnailSerial);row.dataset.previewSerial=serial;
    const photo=await displayedPhoto(index,r);
    if(!photo||!row.isConnected||row.dataset.previewSerial!==serial)return;
    const old=row.querySelector('.baytag-review-thumbnail');if(old)old.remove();
    const image=document.createElement('img');image.className='baytag-review-thumbnail';image.alt='Estimated tag crop for review; verify original image';image.src=photo.url;
    const tools=row.querySelector('.baytag-row-tools');if(tools)tools.after(image);
  }
  const oldMakeBearRow=window.makeBearRow;
  if(typeof oldMakeBearRow==='function'){
    window.makeBearRow=function(data){
      const result=oldMakeBearRow(data);
      const row=byId('bearRows')?.lastElementChild;
      if(!row)return result;
      const tools=textNode('div','','baytag-row-tools');
      const review=textNode('button','Review photo');review.type='button';
      review.onclick=()=>{
        const index=Number(row.dataset.photoIndex);
        if(index<0){alert('Assign a photo with Draw outline first.');return;}
        openZoom(index,rowBounds(row));
      };
      const show=textNode('button','Show on photo');show.type='button';
      show.onclick=()=>{
        const index=Number(row.dataset.photoIndex);
        if(index<0){alert('Draw an outline to associate a photo with this manually entered tag.');return;}
        window.showBearPhoto(index);stage?.scrollIntoView({block:'center',behavior:'smooth'});
      };
      const draw=textNode('button','Draw outline');draw.type='button';
      draw.onclick=()=>selectDrawRow(row);
      tools.append(review,show,draw);
      row.append(tools);
      queueMicrotask(()=>addRowPreview(row));
      return result;
    };
  }
  // Keep photo review and manual outlines visible BEFORE OCR or a review row is created.
  const photoToolsPanel=textNode('section','','baytag-photo-tools-panel');
  photoToolsPanel.id='baytagPhotoTools';
  photoToolsPanel.append(textNode('h3','Photo review & manual outlines'));
  const photoTools=textNode('div','','baytag-photo-tools');
  const viewFull=textNode('button','Review full photo');viewFull.type='button';
  viewFull.onclick=()=>openZoom(activePhotoIndex());
  const drawNew=textNode('button','Draw outline for a new tag');drawNew.type='button';
  drawNew.onclick=()=>{
    if(typeof selectedPhotos==='undefined'||!selectedPhotos.bear?.length){
      byId('bearScanStatus').textContent='Choose or take a BEAR photo first, then tap Draw outline for a new tag.';
      return;
    }
    const index=activePhotoIndex();
    window.showBearPhoto?.(index);
    window.makeBearRow({photoIndex:index});
    const row=byId('bearRows')?.lastElementChild;
    if(row)selectDrawRow(row);
  };
  photoTools.append(viewFull,drawNew);
  photoToolsPanel.append(photoTools);
  const reviewLabel=textNode('p','First take or upload a BEAR photo. Review the entire image, or tap Draw outline for a new tag and drag a blue rectangle around a tag. This creates its own editable review row. Orange OCR rectangles are only estimates.','hint');
  photoToolsPanel.append(reviewLabel);
  const scanButton=byId('scanBear');
  if(scanButton)scanButton.before(photoToolsPanel);

  function flattenOcrLines(data) {
    const entries=[];const seen=new Set();
    const add=l=>{
      if(!l||!l.bbox||!l.text)return;
      const b=l.bbox;const bb={x0:Number(b.x0),y0:Number(b.y0),x1:Number(b.x1),y1:Number(b.y1)};
      if(Object.values(bb).some(n=>!Number.isFinite(n))||bb.x1<=bb.x0||bb.y1<=bb.y0)return;
      const key=[bb.x0,bb.y0,bb.x1,bb.y1,String(l.text).trim()].join('|');
      if(seen.has(key))return;seen.add(key);entries.push({text:String(l.text),bbox:bb});
    };
    // Tesseract 5 often returns blocks instead of top-level lines/words.
    const blocks=data.blocks;
    if(Array.isArray(blocks))for(const b of blocks){
      let any=false;
      for(const p of (b.paragraphs || [])){
        for(const l of (p.lines || [])){add(l);any=true;}
      }
      if(!any&&b.text)add(b);
    }
    if(!entries.length)for(const l of data.lines || [])add(l);
    if(!entries.length)for(const w of data.words || [])add(w);
    return entries;
  }
  function imageDimensionsFor(file){
    return new Promise(resolve=>{
      const url=URL.createObjectURL(file);const img=new Image();
      img.onload=()=>{const dimensions={w:img.naturalWidth,h:img.naturalHeight};URL.revokeObjectURL(url);resolve(dimensions);};
      img.onerror=()=>{URL.revokeObjectURL(url);resolve(null);};img.src=url;
    });
  }
  function estimateRegions(data,dims){
    const lines=flattenOcrLines(data);
    const anchors=[];
    const skuPattern=/(?:SKU\s*[:#-]?\s*)?(\d{3})\s*[-– ]\s*(\d{3})\b/i;
    for(const line of lines){
      const match=line.text.match(skuPattern);if(!match)continue;
      const b=line.bbox;
      anchors.push({sku:match[1]+'-'+match[2],bbox:b,cx:(b.x0+b.x1)/2,cy:(b.y0+b.y1)/2});
    }
    if(!anchors.length)return [];
    const width=dims?.w||Number(data.imageSize?.width)||Math.max(1,...lines.map(x=>x.bbox.x1));
    const height=dims?.h||Number(data.imageSize?.height)||Math.max(1,...lines.map(x=>x.bbox.y1));
    const groups=anchors.map(a=>[a.bbox]);
    const groupedText=anchors.map(a=>[a.sku]);
    for(const line of lines){
      const midX=(line.bbox.x0+line.bbox.x1)/2,midY=(line.bbox.y0+line.bbox.y1)/2;
      let idx=0,shortest=Infinity;
      anchors.forEach((a,i)=>{
        const distance=Math.hypot((midX-a.cx), (midY-a.cy));
        if(distance<shortest){shortest=distance;idx=i;}
      });
      if(shortest<=Math.max(width,height)*.38){groups[idx].push(line.bbox);groupedText[idx].push(line.text);}
    }
    return anchors.map((anchor,i)=>{
      const boxes=groups[i];const pad=Math.max(9,Math.min(width,height)*.018);
      const x0=Math.max(0,Math.min(...boxes.map(b=>b.x0))-pad),y0=Math.max(0,Math.min(...boxes.map(b=>b.y0))-pad);
      const x1=Math.min(width,Math.max(...boxes.map(b=>b.x1))+pad),y1=Math.min(height,Math.max(...boxes.map(b=>b.y1))+pad);
      const parsed=typeof suggestBear==='function'?suggestBear(groupedText[i].join('\n')):{};
      return {data:{...parsed,sku:anchor.sku},rect:{left:x0/width*100,top:y0/height*100,width:(x1-x0)/width*100,height:(y1-y0)/height*100}};
    });
  }
  async function improvedScan(kind){
    const isBay=kind==='bay';
    const files=(typeof selectedPhotos!=='undefined'&&selectedPhotos[kind])?[...selectedPhotos[kind]]:[];
    const status=byId(isBay?'bayScanStatus':'bearScanStatus'),button=byId(isBay?'scanBay':'scanBear');
    if(!files.length){if(status)status.textContent='Take or upload a photo first.';return;}
    button.disabled=true;
    let worker=null,created=0,failed=false;
    try{
      status.textContent='Loading on-device OCR (internet needed on first use)…';
      await loadOcr();worker=await Tesseract.createWorker('eng',1);
      if(isBay){
        const result=await worker.recognize(files[0],{},{text:true,blocks:true});
        const fields=Object.entries(suggestBay(result.data.text||'')).filter(([k,v])=>v&&byId(k));
        if(fields.length){
          if(confirm('Possible bay values:\n\n'+fields.map(([k,v])=>k+': '+v).join('\n')+'\n\nApply?')){
            for(const [k,v] of fields)byId(k).value=v;
          }
          status.textContent='Review bay location before saving.';
        }else status.textContent='No clear bay number found. Enter the bay manually.';
      }else{
        const oldAuto=[...(byId('bearRows')?.children||[])].filter(r=>r.dataset.baytagAuto==='yes');
        if(oldAuto.length){
          if(!confirm('Replace '+oldAuto.length+' previous OCR review rows? Manually added rows will be kept.')){
            status.textContent='Scan canceled. Previous review rows were kept.';return;
          }
          for(const r of oldAuto)r.remove();
        }
        scannedPhotoRegions=[];
        for(let i=0;i<files.length;i++){
          if(selectedPhotos.bear[i]!==files[i])throw Error('Photos changed during scanning. Review the new selection and retry.');
          status.textContent='Scanning photo '+(i+1)+' of '+files.length+'…';
          const result=await worker.recognize(files[i],{},{text:true,blocks:true});
          const dimensions=await imageDimensionsFor(files[i]);
          const regions=estimateRegions(result.data,dimensions);
          const guesses=regions.length?regions.map(r=>r.data):detectMultipleBear(result.data.text||'');
          scannedPhotoRegions[i]=regions;
          for(let j=0;j<guesses.length;j++){
            window.makeBearRow({...guesses[j],photoIndex:i});
            const row=byId('bearRows').lastElementChild;
            row.dataset.regionIndex=String(j);
            row.dataset.baytagAuto='yes';
            addRowPreview(row);
            created++;
          }
          if(i===activePhotoIndex()){
            renderTagOutlines(regions);redrawManualBoxes();
          }
        }
        if(!created){
          status.textContent='No clearly formatted SKUs detected. Add each missing tag manually; existing manual rows were kept.';
          if(!byId('bearRows').children.length)window.makeBearRow();
        }else status.textContent=created+' possible tag(s) detected across '+files.length+' photo(s). Review orange text estimates and each separate entry. Use Draw outline if needed; remove false detections before saving.';
      }
    }catch(error){
      failed=true;
      status.textContent='OCR unavailable: '+(error.message||String(error))+'. Add or correct tags manually.';
    }finally{
      if(worker)try{await worker.terminate();}catch(_){}
      button.disabled=false;
      activity('scan',(isBay?'Bay':'BEAR')+' image scan '+(failed?'failed': 'completed')+' · '+(isBay?'bay OCR':created+' review rows')+' · '+files.length+' photo(s)', {kind,photoCount:files.length,proposedRows:created,success:!failed});
    }
  }
  window.scanPhoto=improvedScan;
  // Distinguish checked developer functionality from unverified device accuracy.
  const versionFooter = document.querySelector('footer');
  if (versionFooter) versionFooter.textContent = 'BayTag v2.1 RC2 · Development / iPhone testing · Local-only inventory · Not affiliated with The Home Depot';
  const localPill = document.querySelector('header .pill');
  if (localPill) localPill.textContent = 'LOCAL · TEST';
  const historyView = byId('historyView');
  if(historyView){
    const releasePanel=textNode('section','','panel');
    releasePanel.append(textNode('h2','Release safety and iPhone verification'));
    releasePanel.append(textNode('p','AUTOMATED CHECKS: JavaScript syntax, sample two-tag OCR, status persistence, history and photo review. DEVICE TEST REQUIRED: actual camera, BEAR labels, iPhone Safari storage and airplane-mode behavior.','hint'));
    releasePanel.append(textNode('p','EXPERIMENTAL: automatic orange outlines estimate OCR text regions, not physical tag borders. Blue boxes are manual and temporary. Review all detected numbers before saving.','hint'));
    const items=[
      'Back up real inventory JSON before changing the published app',
      'Confirm iPhone camera and photo upload both work',
      'Test two BEAR tags together; review each SKU and quantity',
      'Test blue outline drawing, crop review and manual entry',
      'Test duplicate warning, record editing and five statuses',
      'Test CSV backup, JSON restore and History export',
      'Check offline inventory view, then review the branch before merging'
    ];
    const checklist=textNode('div','','baytag-release-list');
    let checks={};try{checks=JSON.parse(localStorage.getItem('baytag-release-checklist-v1')||'{}')||{};}catch(_){}
    for(const [i,item] of items.entries()){
      const label=document.createElement('label');label.style.cssText='display:flex;gap:10px;align-items:flex-start;margin:11px 0;font-size:14px;';
      const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.style.cssText='width:20px;height:20px;flex:0 0 20px;margin-top:0';checkbox.checked=!!checks[i];
      checkbox.onchange=()=>{checks[i]=checkbox.checked;try{localStorage.setItem('baytag-release-checklist-v1',JSON.stringify(checks))}catch(_){}};
      label.append(checkbox,textNode('span',item));checklist.append(label);
    }
    releasePanel.append(checklist);
    historyView.prepend(releasePanel);
  }
  // Keep the existing inventory storage key and export format. History/checklist keys are independent.
  window.BayTagReleaseCandidate={version:'2.1.0-rc.2',featureSet:['status','history','multiple-tag-review','manual-outlines','release-checklist'],storageKey:'baytag-inventory-v1'};
})();
