/* BayTag 2.4 Stable — optional, local-only inventory tools.
   Uses existing records/save/render. Does not change storage keys or auto-save. */
(() => {
  'use strict';
  if (window.BayTagInventoryToolsLoaded) return;
  const byId = id => document.getElementById(id);
  const view = byId('inventoryView');
  const host = view?.querySelector('section.panel');
  const items = byId('items');
  if (!host || !items || typeof window.render !== 'function') return;
  window.BayTagInventoryToolsLoaded = true;
  const statuses = ['Unverified','Verified','Needs review','Moved','Removed'];
  const selected = new Set();
  let viewRows = [];
  let shownRows = [];
  const make = (tag, cls, value) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value !== undefined) el.textContent = value;
    return el;
  };
  const style = make('style');
  style.textContent = [
    '.baytag-tools{border:1px solid #66503b;border-radius:15px;padding:15px;margin:14px 0 17px;background:#211d19}',
    '.baytag-tools h3{margin:0 0 5px;font-size:17px}',
    '.baytag-tools .hint{line-height:1.5}',
    '.baytag-tools-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin:14px 0}',
    '.baytag-tools-grid .field{min-width:0}',
    '.baytag-tools-grid select{min-height:48px}',
    '.baytag-tools-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}',
    '.baytag-tools-actions button{flex:1;min-height:49px}',
    '.baytag-tools-small{font-size:13px;color:#eee;line-height:1.5;margin-top:8px}',
    '.baytag-tools-picks{border-top:1px solid #55483d;padding-top:13px;margin-top:14px}',
    '.baytag-tools-picks .field{max-width:100%}',
    '.baytag-tools-picks select{min-height:48px}',
    '.baytag-tools-selected{padding:10px 0;color:#ffc58c;font-weight:700}',
    '.baytag-tools-card-selection{margin:0 0 12px;padding-bottom:10px;border-bottom:1px solid #444;display:flex;align-items:center;gap:12px;cursor:pointer;font-size:14px}',
    '.baytag-tools-card-selection input{width:21px;height:21px;flex:0 0 21px}',
    '#items>.item[hidden]{display:none!important}',
    '.baytag-tools-result{color:#ffcc95;font-size:14px;font-weight:700;line-height:1.5;margin:10px 0}',
    '@media(max-width:420px){.baytag-tools-grid{grid-template-columns:1fr}.baytag-tools-actions button{flex-basis:100%}}'
  ].join('\n');
  document.head.append(style);
  const panel = make('section','baytag-tools');
  panel.id='baytagInventoryTools';
  panel.append(make('h3','','Find and update saved items'));
  panel.append(make('p','hint','Filter by department or status. Sort items and change the status of several at once. Nothing changes until you confirm.'));
  const summary = make('p','baytag-tools-result','');
  summary.id='powerResults';
  summary.setAttribute('role','status');
  panel.append(summary);
  const filters = make('div','baytag-tools-grid');
  const field = (id,label,select) => {
    const div=make('div','field');
    const lab=make('label','',label);lab.htmlFor=id;
    select.id=id;div.append(lab,select);
    return div;
  };
  const makeSelect=(pairs)=>{
    const select=make('select');
    for(const [value,label] of pairs){const opt=make('option','',label);opt.value=value;select.append(opt);}
    return select;
  };
  const dept = makeSelect([['','All departments']]);
  const status = makeSelect([['','All statuses'],...statuses.map(x=>[x,x])]);
  const sort = makeSelect([
    ['newest','Recently updated'],['sku','SKU number A–Z'],['bay','Bay location A–Z'],
    ['qty-high','Quantity: most first'],['qty-low','Quantity: fewest first']
  ]);
  filters.append(field('powerDepartment','Department',dept),field('powerStatus','Status',status),field('powerSort','Sort items',sort));
  panel.append(filters);
  const actions=make('div','baytag-tools-actions');
  const review=make('button','','Show needs review');
  review.type='button';
  review.id='powerNeedsReview';
  const reset=make('button','','Clear filters');
  reset.type='button';
  reset.id='powerClearFilters';
  const exportView=make('button','','Download matching items (CSV)');
  exportView.type='button';
  exportView.id='powerExportMatching';
  actions.append(review,reset,exportView);
  panel.append(actions);
  const picks=make('div','baytag-tools-picks');
  const pickLabel=make('label','baytag-tools-card-selection');
  const selectAll=make('input');
  selectAll.id='powerSelectAll';selectAll.type='checkbox';
  pickLabel.append(selectAll,make('span','','Select all items shown'));
  picks.append(pickLabel);
  const picked=make('p','baytag-tools-selected','0 items selected');
  picked.id='powerSelectedCount';picks.append(picked);
  const statusChoice=makeSelect(statuses.map(x=>[x,x]));
  statusChoice.value='Verified';
  picks.append(field('powerBulkStatus','Change selected items to',statusChoice));
  const bulk=make('button','primary','Apply status to selected items');
  bulk.id='powerApplyStatus';bulk.type='button';bulk.disabled=true;
  picks.append(bulk);
  panel.append(picks);
  const backup=make('button','','Save a full inventory backup');
  backup.id='powerBackup';backup.type='button';
  panel.append(backup);
  panel.append(make('p','baytag-tools-small','Your inventory stays in this browser. Save a full backup before making large changes. Downloading matching items does not remove or change anything.'));
  const first=host.querySelector('h2');
  if(first)first.after(panel);else host.prepend(panel);
  const getRecords=()=>Array.isArray(records)?records.filter(r=>r&&typeof r==='object'):[];
  const getStatus=r=>statuses.includes(r.status)?r.status:'Unverified';
  const asId=r=>r?.id==null?'':String(r.id);
  const matchesSearch=(r,q)=>[r.sku,r.bay,r.department,r.tagId,r.description,r.brand,r.model,r.bayBarcode].some(v=>String(v??'').toLowerCase().includes(q));
  const location=r=>String(r.bay||'').trim();
  const comparer=(a,b)=>{
    const x=a.record,y=b.record;
    if(sort.value==='sku')return String(x.sku||'').localeCompare(String(y.sku||''),undefined,{numeric:true});
    if(sort.value==='bay')return location(x).localeCompare(location(y),undefined,{numeric:true});
    if(sort.value==='qty-high')return (Number(y.quantity)||0)-(Number(x.quantity)||0);
    if(sort.value==='qty-low')return (Number(x.quantity)||0)-(Number(y.quantity)||0);
    return String(y.updatedAt||'').localeCompare(String(x.updatedAt||''));
  };
  function syncDepartments(){
    const existing=dept.value;
    const values=[...new Set(getRecords().map(r=>String(r.department||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    if(dept.options.length===values.length+1&&values.every((v,i)=>dept.options[i+1]?.value===v))return;
    dept.replaceChildren();
    for(const [v,t] of [['','All departments'],...values.map(v=>[v,'Department '+v])]){const opt=make('option','',t);opt.value=v;dept.append(opt);}
    dept.value=values.includes(existing)?existing:'';
  }
  function updateSelection(){
    const visibleIds=new Set(shownRows.map(o=>asId(o.record)).filter(Boolean));
    for(const id of [...selected])if(!visibleIds.has(id))selected.delete(id);
    for(const row of viewRows){
      const input=row.card.querySelector('.baytag-tools-card-selection input');
      if(input)input.checked=selected.has(asId(row.record));
    }
    const all=shownRows.length>0&&shownRows.every(o=>selected.has(asId(o.record)));
    selectAll.disabled=shownRows.length===0;
    selectAll.checked=all;
    selectAll.indeterminate=!all&&shownRows.some(o=>selected.has(asId(o.record)));
    picked.textContent=selected.size+' '+(selected.size===1?'item':'items')+' selected';
    bulk.disabled=selected.size===0;
  }
  function applyFilters(){
    const all=getRecords();
    const deptValue=dept.value,statusValue=status.value;
    const sorted=viewRows.slice().sort(comparer);
    shownRows=[];
    for(const row of sorted){
      const visible=(!deptValue||String(row.record.department||'').trim()===deptValue)&&(!statusValue||getStatus(row.record)===statusValue);
      row.card.hidden=!visible;
      if(visible)shownRows.push(row);
      items.append(row.card);
    }
    updateSelection();
    const total=shownRows.reduce((s,row)=>s+(Number(row.record.quantity)||0),0);
    const needing=all.filter(r=>getStatus(r)==='Needs review').length;
    summary.textContent=shownRows.length+' of '+all.length+' items shown · '+total.toLocaleString()+' units shown · '+needing+' need review';
    exportView.disabled=shownRows.length===0;
  }
  function decorate(){
    syncDepartments();
    const q=(byId('search')?.value||'').toLowerCase();
    const matching=getRecords().filter(r=>matchesSearch(r,q));
    const cards=[...items.children].filter(el=>el.classList.contains('item'));
    viewRows=[];
    cards.forEach((card,i)=>{
      const record=matching[i];if(!record)return;
      const id=asId(record);
      if(id){
        const label=make('label','baytag-tools-card-selection');
        const checkbox=make('input');
        checkbox.type='checkbox';
        checkbox.setAttribute('aria-label','Select SKU '+String(record.sku||'')+' at '+location(record));
        checkbox.onchange=()=>{if(checkbox.checked)selected.add(id);else selected.delete(id);updateSelection();};
        label.append(checkbox,make('span','','Select this item'));
        card.prepend(label);
      }
      viewRows.push({record,card});
    });
    applyFilters();
  }
  const oldRender=window.render;
  window.render=function(...args){
    const result=oldRender.apply(this,args);
    decorate();
    return result;
  };
  dept.onchange=applyFilters;
  status.onchange=applyFilters;
  sort.onchange=applyFilters;
  reset.onclick=()=>{dept.value='';status.value='';sort.value='newest';byId('search').value='';selected.clear();window.render();};
  review.onclick=()=>{dept.value='';status.value='Needs review';byId('search').value='';selected.clear();window.render();};
  selectAll.onchange=()=>{
    for(const row of shownRows){const id=asId(row.record);if(!id)continue;if(selectAll.checked)selected.add(id);else selected.delete(id);}
    updateSelection();
  };
  bulk.onclick=()=>{
    if(!selected.size)return;
    if(typeof editing!=='undefined'&&editing){alert('Finish or cancel the item you are editing before changing several statuses.');return;}
    const targets=getRecords().filter(r=>selected.has(asId(r)));
    if(!targets.length)return;
    const value=statusChoice.value;
    if(!statuses.includes(value))return;
    if(!confirm('Change '+targets.length+' saved '+(targets.length===1?'item':'items')+' to "'+value+'"?'))return;
    const before=targets.map(r=>({r,had:Object.prototype.hasOwnProperty.call(r,'status'),status:r.status}));
    for(const r of targets)r.status=value;
    if(!window.save()){
      for(const old of before){if(old.had)old.r.status=old.status;else delete old.r.status;}
      updateSelection();
      return;
    }
    selected.clear();
    window.render();
    summary.textContent+=' · Saved status changes';
  };
  const csvCell=value=>{
    let val=String(value??'');
    if(/^\s*[=+\-@\t\r]/.test(val)&&! /^\s*-?\d+(?:\.\d+)?\s*$/.test(val))val="'"+val;
    return '"'+val.replace(/"/g,'""')+'"';
  };
  const parts=value=>{
    const m=String(value||'').match(/^\s*(\d{1,2})\s*-\s*(\d{1,3})\s*$/);
    return m?{aisle:m[1],bay:m[2]}:{aisle:'',bay:String(value||'')};
  };
  exportView.onclick=()=>{
    if(!shownRows.length){alert('No matching items to download.');return;}
    const columns=['Department','Aisle','Bay','SKU','Quantity','Date Tag Created','Description','Brand','Model','Status','Updated At'];
    const rows=[columns.map(csvCell).join(',')];
    for(const {record:r} of shownRows){
      const loc=parts(r.bay);
      rows.push([r.department,loc.aisle,loc.bay,r.sku,r.quantity,r.tagDate,r.description,r.brand,r.model,getStatus(r),r.updatedAt].map(csvCell).join(','));
    }
    if(typeof window.download==='function')window.download('baytag-matching-items-'+new Date().toISOString().slice(0,10)+'.csv','\ufeff'+rows.join('\r\n'),'text/csv;charset=utf-8');
  };
  backup.onclick=()=>byId('backupBtn')?.click();
  byId('search')?.addEventListener('input',()=>queueMicrotask(()=>{if(!view.classList.contains('hidden'))applyFilters();}));
  // No inventory changes on startup. The existing Inventory tab invokes render().
  window.BayTagInventoryTools={getCounts:()=>({shown:shownRows.length,selected:selected.size,all:getRecords().length})};
})();