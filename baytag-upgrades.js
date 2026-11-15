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
    const event = { id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()), time: new Date().toISOString(), type, description, ...extra };
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
})();
