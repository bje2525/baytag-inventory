/* BayTag v2.1.0 stable feature add-on. No network calls; no inventory migration. */
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
  const reviewLabel=textNode('p','One printed BEAR tag can contain up to 3 SKU lines. Each SKU has its own quantity. Upload a photo, then review OCR suggestions or draw a blue outline manually. Orange OCR rectangles are estimates.','hint');
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

  function parsePrintedDate(text){
    const m=String(text||'').match(/\b(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2}|\d{4})\b/);
    if(!m)return '';
    const month=Number(m[1]),day=Number(m[2]),year=Number(m[3].length===2?'20'+m[3]:m[3]);
    const test=new Date(Date.UTC(year,month-1,day));
    if(test.getUTCFullYear()!==year||test.getUTCMonth()!==month-1||test.getUTCDate()!==day)return '';
    return year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
  }
  function uniquePrintedDate(text){
    const dates=[...String(text||'').matchAll(/\b\d{1,2}\s*[/.-]\s*\d{1,2}\s*[/.-]\s*(?:\d{4}|\d{2})\b/g)]
      .map(match=>parsePrintedDate(match[0])).filter(Boolean);
    const unique=[...new Set(dates)];
    return unique.length===1?unique[0]:'';
  }
  function parseTextOnlySkuRows(text){
    const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),date=uniquePrintedDate(text);
    const output=[];
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      const pattern=/(?:^|[^\d])(\d{3})\s*[-–—]\s*(\d{3})(?!\d)/g;
      for(const match of line.matchAll(pattern)){
        const sku=match[1]+'-'+match[2];
        // Quantity immediately following SKU on the SAME line is a per-SKU value.
        const remaining=line.slice((match.index||0)+match[0].length).split(/\d{3}\s*[-–—]\s*\d{3}/)[0];
        const quantity=remaining.match(/^\s*(?:QTY\s*[:#]?\s*)?(\d{1,5})(?=\s|$)/i)?.[1]||'';
        output.push({sku,qty:quantity,tagDate:date});
      }
    }
    // On a single-SKU tag, QTY may be printed above the SKU. Do not guess a shared
    // quantity for a tag containing two or three SKU rows.
    if(output.length===1&&!output[0].qty){
      const direct=String(text||'').match(/\bQTY\s*[:#]?\s*(\d{1,5})\b/i);
      const reverse=String(text||'').match(/\b(\d{1,5})\s*QTY\b/i);
      output[0].qty=direct?.[1]||reverse?.[1]||'';
    }
    return output;
  }
  function estimateRegions(data,dims){
    const lines=flattenOcrLines(data);
    const width=dims?.w||Number(data.imageSize?.width)||Math.max(1,...lines.map(x=>x.bbox.x1));
    const height=dims?.h||Number(data.imageSize?.height)||Math.max(1,...lines.map(x=>x.bbox.y1));
    const fallbackDate=uniquePrintedDate(data.text||lines.map(l=>l.text).join('\n'));
    const dateLines=lines.map(line=>({date:uniquePrintedDate(line.text),bbox:line.bbox}))
      .filter(line=>line.date);
    // Associate each SKU with a local printed date, never the first date in the photo.
    // Equal-distance conflicting dates stay blank for manual review.
    const dateFor=anchor=>{
      const ranked=dateLines.map(line=>({date:line.date,distance:Math.hypot(
        anchor.cx-(line.bbox.x0+line.bbox.x1)/2,
        anchor.cy-(line.bbox.y0+line.bbox.y1)/2)})).sort((a,b)=>a.distance-b.distance);
      if(!ranked.length)return fallbackDate;
      if(ranked.some(other=>other.date!==ranked[0].date&&Math.abs(other.distance-ranked[0].distance)<1))return '';
      return ranked[0].date;
    };
    const anchors=[];
    const skuPattern=/(?:^|[^\d])(\d{3})\s*[-–—]\s*(\d{3})(?!\d)/g;
    for(const line of lines){
      for(const m of String(line.text).matchAll(skuPattern)){
        const b=line.bbox;
        anchors.push({sku:m[1]+'-'+m[2],bbox:b,cx:(b.x0+b.x1)/2,cy:(b.y0+b.y1)/2,h:b.y1-b.y0});
      }
    }
    if(!anchors.length)return [];
    const quantities=[];
    for(const line of lines){
      const t=line.text.trim();
      if(skuPattern.test(t)){skuPattern.lastIndex=0;
        // Some OCR engines return "766-154 80" as one wide line.
        const trailing=t.match(/\d{3}\s*[-–—]\s*\d{3}\s+(\d{1,5})\s*$/);
        if(trailing){
          const b=line.bbox;
          quantities.push({value:trailing[1],x:b.x1-1,y:(b.y0+b.y1)/2,bbox:b,embedded:true});
        }
        continue;
      }
      skuPattern.lastIndex=0;
      // Ignore 7-digit Tag IDs, barcode digits, dates, printed department codes.
      const q=t.match(/^(?:QTY\s*[:#]?\s*)?(\d{1,5})(?:\s*QTY)?$/i);
      if(!q)continue;
      const b=line.bbox;
      quantities.push({value:q[1],x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2,bbox:b});
    }
    const used=new Set();
    const regions=anchors.map(a=>{
      let best=-1,bestScore=Infinity;
      for(let i=0;i<quantities.length;i++){
        if(used.has(i))continue;
        const q=quantities[i];
        const dy=Math.abs(q.y-a.cy),dx=q.x-a.cx;
        // Printed quantity is to the RIGHT of its corresponding SKU line.
        if(dx<=0||dy>Math.max(height*.065,a.h*1.4))continue;
        const score=dy/Math.max(1,height)*4+dx/Math.max(1,width);
        if(score<bestScore){bestScore=score;best=i;}
      }
      const q=best<0?null:quantities[best];if(q)used.add(best);
      const boxes=[a.bbox,...(q?[q.bbox]:[])];
      const pad=Math.max(5,Math.min(width,height)*.008);
      const x0=Math.max(0,Math.min(...boxes.map(b=>b.x0))-pad),y0=Math.max(0,Math.min(...boxes.map(b=>b.y0))-pad);
      const x1=Math.min(width,Math.max(...boxes.map(b=>b.x1))+pad),y1=Math.min(height,Math.max(...boxes.map(b=>b.y1))+pad);
      return {data:{sku:a.sku,qty:q?q.value:'',tagDate:dateFor(a)},rect:{left:x0/width*100,top:y0/height*100,width:(x1-x0)/width*100,height:(y1-y0)/height*100}};
    });
    if(regions.length===1&&!regions[0].data.qty){
      const value=parseTextOnlySkuRows(data.text||'')[0]?.qty;
      if(value)regions[0].data.qty=value;
      else {
        // Another common single-tag layout: QTY sits left and quantity sits
        // in a large box above the SKU. Never apply this to multi-SKU tags.
        const qtyWords=lines.filter(l=>/^QTY\b/i.test(l.text.trim()));
        if(qtyWords.length){
          const label=qtyWords[0].bbox;
          const candidates=quantities.filter(q=>q.x>(label.x0+label.x1)/2&&Math.abs(q.y-(label.y0+label.y1)/2)<height*.20);
          if(candidates.length===1)regions[0].data.qty=candidates[0].value;
        }
      }
    }
    return regions;
  }
  // For isolated tests. This parser does not upload photographs or store OCR content.
  window.BayTagPrintedTagParser={parseTextOnlySkuRows,estimateRegions,parsePrintedDate};

  async function improvedScan(kind){
    const isBay=kind==='bay';
    const files=(typeof selectedPhotos!=='undefined'&&selectedPhotos[kind])?[...selectedPhotos[kind]]:[];
    const status=byId(isBay?'bayScanStatus':'bearScanStatus'),button=byId(isBay?'scanBay':'scanBear');
    if(!files.length){if(status)status.textContent='Take or upload a photo first.';return;}
    if(button.disabled)return;
    button.disabled=true;
    let worker=null,created=0,failed=false;
    try{
      status.textContent='Loading on-device OCR (internet needed on first use)…';
      await loadOcr();worker=await Tesseract.createWorker('eng',1);
      if(isBay){
        const result=await worker.recognize(files[0],{},{text:true,blocks:true});
        const proposed=suggestBay(result.data.text||'');
        const found=String(result.data.text||'').match(/\b(\d{1,2})\s*[-–—]\s*(\d{1,3})\b/);
        const loc=found?found[1].padStart(2,'0')+'-'+found[2].padStart(3,'0'):proposed.bay;
        const fields=[...(proposed.dept?[['dept',proposed.dept]]:[]),...(loc?[['bay',loc]]:[])];
        if(fields.length){
          if(confirm('Possible bay values:\n\n'+fields.map(([k,v])=>k+': '+v).join('\n')+'\n\nApply?')){
            for(const [k,v] of fields)byId(k).value=v;
            showLocationFields();
          }
          status.textContent='Review bay location before saving.';
        }else status.textContent='No clear bay number found. Enter the bay manually.';
      }else{
        const oldAuto=[...(byId('bearRows')?.children||[])].filter(r=>r.dataset.baytagAuto==='yes');
        if(oldAuto.length){
          if(!confirm('Replace '+oldAuto.length+' previous OCR review rows? Manually added rows will be kept.')){
            status.textContent='Scan canceled. Previous review rows were kept.';return;
          }

        }
        const pending=[];
        for(let i=0;i<files.length;i++){
          if(selectedPhotos.bear[i]!==files[i])throw Error('Photos changed during scanning. Review the new selection and retry.');
          status.textContent='Scanning photo '+(i+1)+' of '+files.length+'…';
          const result=await worker.recognize(files[i],{},{text:true,blocks:true});
          const dimensions=await imageDimensionsFor(files[i]);
          const regions=estimateRegions(result.data,dimensions);
          const guesses=regions.length?regions.map(r=>r.data):parseTextOnlySkuRows(result.data.text||'');
          pending.push({regions,guesses});
        }
        if(files.length!==selectedPhotos.bear.length||files.some((file,i)=>file!==selectedPhotos.bear[i]))throw Error('Photos changed during scanning. Review the new selection and retry.');
        // Commit temporary OCR results only after every photo has succeeded.
        for(const row of oldAuto)row.remove();
        scannedPhotoRegions=pending.map(photo=>photo.regions);
        for(const [i,{regions,guesses}] of pending.entries()){
          for(const [j,guess] of guesses.entries()){
            window.makeBearRow({...guess,photoIndex:i});
            const row=byId('bearRows').lastElementChild;
            row.dataset.regionIndex=String(j);row.dataset.baytagAuto='yes';
            addRowPreview(row);created++;
          }
          if(i===activePhotoIndex()){renderTagOutlines(regions);redrawManualBoxes();}
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

  /* Location and BEAR tag rules from photographed examples (v2.1.0):
     Yellow: parse department, aisle and bay. Ignore direction and barcode.
     White: each SKU line has its OWN quantity; ignore tag ID and barcode.
     All existing JSON inventory keys are kept for backward compatibility. */
  const legacyBay=byId('bay');
  const locWrapper=legacyBay?.closest('.field');
  const deptField=byId('dept');
  function makeLocationField(id,label,placeholder,maxLength){
    const wrapper=textNode('div','','field');
    const caption=document.createElement('label');caption.htmlFor=id;caption.textContent=label;
    const input=document.createElement('input');
    input.id=id;input.type='text';input.inputMode='numeric';input.maxLength=maxLength;
    input.pattern='[0-9]+';input.required=true;input.placeholder=placeholder;
    wrapper.append(caption,input);return {wrapper,input};
  }
  const aisleField=makeLocationField('aisleNumber','Aisle number *','32',2);
  const bayNumberField=makeLocationField('bayNumber','Bay number *','018',3);
  if(locWrapper){
    legacyBay.required=false;
    locWrapper.classList.add('hidden');
    locWrapper.after(aisleField.wrapper,bayNumberField.wrapper);
    const locHelp=textNode('p','Yellow location tag: Department 29 · Aisle 32 · Bay 018. Direction and barcode are not used.','hint');
    bayNumberField.wrapper.after(locHelp);
  }
  for(const id of ['direction','bayBarcode','tagid']){
    const input=byId(id);
    input?.closest('.field')?.classList.add('hidden');
    if(input)input.value='';
  }
  const tagDateLabel=document.querySelector('label[for="tagDate"]');
  if(tagDateLabel)tagDateLabel.textContent='Date tag was created';
  function unpackLocation(loc){
    const match=String(loc||'').trim().match(/^(\d{1,2})\s*[-–—]\s*(\d{1,3})$/);
    if(match)return {aisle:match[1].padStart(2,'0'),bay:match[2].padStart(3,'0')};
    return {aisle:'',bay:''};
  }
  function showLocationFields(){
    if(!legacyBay)return;
    const {aisle,bay}=unpackLocation(legacyBay.value);
    aisleField.input.value=aisle;bayNumberField.input.value=bay;
  }
  function syncLocation(){
    const aisle=aisleField.input.value.trim(),bay=bayNumberField.input.value.trim();
    if(!/^\d{1,2}$/.test(aisle)||!/^\d{1,3}$/.test(bay)){
      const bad=!/^\d{1,2}$/.test(aisle)?aisleField.input:bayNumberField.input;
      bad.setCustomValidity('Enter a numeric aisle (1–2 digits) and bay (1–3 digits).');
      bad.reportValidity();return false;
    }
    aisleField.input.setCustomValidity('');bayNumberField.input.setCustomValidity('');
    legacyBay.value=aisle.padStart(2,'0')+'-'+bay.padStart(3,'0');
    return true;
  }
  for(const field of [aisleField.input,bayNumberField.input]){
    field.addEventListener('input',()=>{field.setCustomValidity('');if(legacyBay)legacyBay.value='';});
  }
  const form=byId('entryForm');
  if(form)form.addEventListener('submit',event=>{
    if(!syncLocation()){
      event.preventDefault();event.stopImmediatePropagation();return;
    }
    // No tag number / barcode / direction is collected from new entries.
    for(const id of ['direction','bayBarcode','tagid'])if(!editing&&byId(id))byId(id).value='';
  },true);
  byId('saveBearRows')?.addEventListener('click',event=>{
    if(!syncLocation()){event.preventDefault();event.stopImmediatePropagation();return;}
  },true);
  const beforeSwitchLocation=window.switchTab;
  if(typeof beforeSwitchLocation==='function')window.switchTab=function(name){
    if(name==='add' && editing)showLocationFields();
    return beforeSwitchLocation(name);
  };
  const beforeClearLocation=window.clearForm;
  if(typeof beforeClearLocation==='function')window.clearForm=function(...args){
    const result=beforeClearLocation.apply(this,args);
    aisleField.input.value='';bayNumberField.input.value='';
    return result;
  };
  // One SKU + bay is the duplicate key. An old tag ID is never read to decide duplicates.
  window.approveDuplicates=function(incoming,existing,ignoreId=null){
    const norm=v=>String(v??'').trim().toUpperCase().replace(/\s+/g,'');
    const approved=[];let skipped=0;
    for(const item of incoming){
      const matches=[...existing,...approved].filter(r=>r.id!==ignoreId&&norm(r.bay)===norm(item.bay)&&norm(r.sku)===norm(item.sku));
      if(matches.length){
        const message='POSSIBLE DUPLICATE SKU\\nBay '+item.bay+' / SKU '+item.sku+'\\nExisting quantity '+matches[0].quantity+'\\n\\nOK = save anyway; Cancel = skip this entry.';
        if(!confirm(message.replace(/\\n/g,'\n'))){skipped++;continue;}
      }
      approved.push(item);
    }
    return {approved,skipped};
  };
  // Hide obsolete metadata without rewriting historical records in localStorage.
  const beforeRenderLocation=window.render;
  if(typeof beforeRenderLocation==='function')window.render=function(...args){
    const result=beforeRenderLocation.apply(this,args);
    const q=(byId('search')?.value||'').toLowerCase();
    const visible=records.filter(r=>[r.sku,r.bay,r.department,r.description,r.brand,r.model].some(v=>String(v||'').toLowerCase().includes(q)));
    const all=byId('items')?.querySelectorAll('.item')||[];
    all.forEach((card,i)=>{
      const record=visible[i];if(!record)return;
      const muted=card.querySelectorAll('.muted');
      for(const line of muted){
        if(line.textContent.startsWith('Tag ID:')||line.textContent.startsWith('Direction:'))line.remove();
        else if(line.textContent.startsWith('Bay ')){
          const parts=unpackLocation(record.bay);
          if(parts.aisle)line.textContent='Aisle '+parts.aisle+' · Bay '+parts.bay+' · Dept '+(record.department||'—');
        }
      }
    });
    return result;
  };
  byId('search') && (byId('search').oninput=()=>window.render());
  // CSV intentionally contains only fields requested for current inventory use.
  byId('exportBtn') && (byId('exportBtn').onclick=()=>{
    const columns=[['department','Department'],['aisle','Aisle'],['bayNumber','Bay'],['sku','SKU'],['quantity','Quantity'],['tagDate','Date Tag Created'],['description','Description'],['brand','Brand'],['model','Model'],['status','Status'],['updatedAt','Updated At']];
    const normalizeRecord=r=>({...r,aisle:unpackLocation(r.bay).aisle,bayNumber:unpackLocation(r.bay).bay});
    const rows=[columns.map(c=>csvCell(c[1])).join(','),...records.map(r=>{const v=normalizeRecord(r);return columns.map(c=>csvCell(v[c[0]])).join(',')})];
    download('baytag-inventory-'+new Date().toISOString().slice(0,10)+'.csv','\ufeff'+rows.join('\r\n'),'text/csv;charset=utf-8');
  });
  // New manual/OCR rows should not request or use the old Tag ID field.
  const beforeMakeRowFields=window.makeBearRow;
  if(typeof beforeMakeRowFields==='function')window.makeBearRow=function(data={}){
    const result=beforeMakeRowFields({...data,tagid:''});
    const row=byId('bearRows')?.lastElementChild;
    const tagInput=row?.querySelector('[data-field="tagid"]');
    if(tagInput){tagInput.value='';tagInput.closest('.field')?.classList.add('hidden');}
    return result;
  };

  // Stable release label. OCR results still need review before saving.
  const versionFooter = document.querySelector('footer');
if (versionFooter) versionFooter.textContent = 'BayTag Capture v3.0.0 · Local-only inventory · Not affiliated with The Home Depot';
  const localPill = document.querySelector('header .pill');
if (localPill) localPill.textContent = 'LOCAL';
  const historyView = byId('historyView');
  if(historyView){
    const releasePanel=textNode('section','','panel');
    releasePanel.append(textNode('h2','Release safety and iPhone verification'));
    releasePanel.append(textNode('p','Stable release: review all scanned SKU quantities and dates before saving. Export a backup of existing inventory before updating, and confirm camera, uploads and offline inventory access after publishing.','hint'));
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
 window.BayTagReleaseCandidate={version:'3.0.0',featureSet:['status','history','multi-sku-quantities','simple-location','manual-outlines','release-checklist','inventory-tools','capture-ui'],storageKey:'baytag-inventory-v1'};
})();
