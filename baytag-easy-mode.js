/* BayTag Easy Mode v2.2 development: presentation and guidance only.
   Does not read, write, migrate or delete saved inventory. */
(() => {
  'use strict';
  if (window.BayTagEasyModeLoaded) return;
  window.BayTagEasyModeLoaded = true;

  const $ = (id) => document.getElementById(id);
  const addView = $('addView');
  const form = $('entryForm');
  const tabAdd = $('tabAdd');
  const tabInventory = $('tabInventory');
  const tabs = document.querySelector('main > .tabs');
  const main = document.querySelector('main');
  if (!addView || !form || !tabAdd || !tabInventory || !main) return;

  const style = document.createElement('style');
  style.textContent = `
    .easy-welcome{padding:18px;border:1px solid #664121;border-radius:15px;background:linear-gradient(135deg,#292019,#161616);margin-bottom:15px}
    .easy-welcome h2{font-size:21px;margin:0 0 5px;line-height:1.25}
    .easy-welcome p{color:#e0d4ca;font-size:14px;line-height:1.55;margin:0 0 14px}
    .easy-quick-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .easy-quick-actions button{min-height:56px;font-size:16px;font-weight:750;padding:12px 14px;text-align:center}
    .easy-quick-actions button:first-child{background:#f47b20;color:#1a130e;border-color:#f47b20}
    .easy-progress{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 16px}
    .easy-step{border:1px solid #4b4641;background:#242222;border-radius:12px;padding:12px 9px;min-height:74px}
    .easy-step .easy-step-label{display:block;font-size:13px;font-weight:750;line-height:1.25}
    .easy-step .easy-step-note{display:block;color:#bfb5ac;font-size:11px;line-height:1.35;margin-top:6px}
    .easy-step.is-done{border-color:#5d956f;background:#1b2b20}
    .easy-step.is-current{border-color:#f47b20;box-shadow:inset 0 0 0 1px rgba(244,123,32,.3)}
    .easy-step.is-done .easy-step-note{color:#b2e6bf}
    .easy-info{background:#25231f;border:1px solid #555049;border-radius:11px;padding:12px 13px;font-size:13px;line-height:1.5;color:#ece5dc;margin:10px 0}
    .easy-info strong{color:#fff}
    .easy-manual{margin:14px 0 5px;border:1px solid #50483f;border-radius:13px;overflow:hidden;background:#1b1b1b}
    .easy-manual>summary{cursor:pointer;list-style:none;font-weight:750;padding:16px;min-height:52px;background:#292520}
    .easy-manual>summary::-webkit-details-marker{display:none}
    .easy-manual>summary:after{content:' +';float:right;color:#ff9b51}
    .easy-manual[open]>summary:after{content:' −'}
    .easy-manual .easy-manual-inside{padding:14px}
    .easy-manual .easy-manual-inside>.grid{margin:12px 0}
    .easy-advanced{margin:12px 0;border-top:1px solid #4b4440;padding-top:13px}
    .easy-advanced summary{cursor:pointer;color:#f8c598;font-size:14px;min-height:40px;padding:10px 0}
    .easy-review-summary{margin:12px 0;border:1px solid #635b48;background:#29261c;border-radius:11px;padding:12px 13px;line-height:1.5;font-size:13px}
    .easy-review-summary strong{display:block;font-size:15px;margin-bottom:4px}
    .easy-review-summary.is-ready{border-color:#5c9469;background:#1b2d20}
    .easy-review-summary.is-warning{border-color:#ce884a;background:#33251c}
    .easy-help{margin:16px 0 12px;border:1px solid #4b4945;border-radius:12px;padding:0;background:#191919}
    .easy-help>summary{padding:15px;cursor:pointer;font-size:15px;font-weight:750;min-height:50px}
    .easy-help .easy-help-content{padding:0 16px 15px;color:#ddd;font-size:14px;line-height:1.6}
    .easy-help p{margin:7px 0}
    .easy-help strong{color:#ffad67}
    .easy-help .easy-help-content button{margin-top:10px}
    #addView .panel{scroll-margin-top:16px}
    #scanBear,#saveBearRows,#scanBay{width:100%;font-size:16px;font-weight:750;min-height:52px;margin-top:8px}
    #saveBearRows{background:#f47b20;color:#111;border-color:#f47b20}
    #bearRows>.panel{border-left:4px solid #f47b20}
    #inventoryView #search{font-size:18px;min-height:52px}
    #inventoryView #items .item{padding:16px}
    .easy-beginner-note{font-size:13px;line-height:1.55;color:#d6cec7;margin:6px 0 14px}
    @media(max-width:380px){.easy-quick-actions{grid-template-columns:1fr}.easy-step{padding:10px 7px}.easy-step .easy-step-label{font-size:12px}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
  `;
  document.head.append(style);

  function make(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }
  function rename(id, name) {
    const node = $(id);
    if (node) node.textContent = name;
  }
  function labelFor(id, text) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) label.textContent = text;
  }
  function jump(target) {
    if (target?.scrollIntoView) target.scrollIntoView({block:'start',behavior:'smooth'});
  }

  rename('tabAdd', '📷 Scan Items');
  rename('tabInventory', '📦 Saved Items');
  const welcome = make('section', 'easy-welcome');
  welcome.setAttribute('aria-label', 'Get started');
  welcome.append(make('h2', '', 'What would you like to do?'));
  welcome.append(make('p', '', 'Scan a tag to add items, or open your saved inventory. No technical setup needed.'));
  const quick = make('div', 'easy-quick-actions');
  const start = make('button', '', '📷 Scan new items');
  start.type = 'button';
  const browse = make('button', '', '📦 View saved items');
  browse.type = 'button';
  start.addEventListener('click', () => {tabAdd.click();jump($('entryForm'));});
  browse.addEventListener('click', () => {tabInventory.click();jump($('inventoryView'));});
  quick.append(start, browse);
  welcome.append(quick);
  main.insertBefore(welcome, main.firstChild);

  // Keep update checking available but out of the main day-to-day navigation.
  const updateButton = tabs?.querySelector('button[onclick*="checkBayTagUpdates"]');
  if (updateButton) {
    updateButton.textContent = 'Check app version';
    updateButton.type = 'button';
  }

  const panels = Array.from(form.querySelectorAll(':scope > section.panel'));
  const locationPanel = $('dept')?.closest('section.panel') || panels[0];
  const bearPanel = $('sku')?.closest('section.panel') || panels[1];
  if (!locationPanel || !bearPanel) return;
  const locationHeading = locationPanel.querySelector('h2');
  if (locationHeading) locationHeading.textContent = 'Step 1 · Where are these items?';
  const bearHeading = bearPanel.querySelector('h2');
  if (bearHeading) bearHeading.textContent = 'Step 2 · Take a photo of the white BEAR tag';

  const oldNotice = addView.querySelector('.notice');
  if (oldNotice) oldNotice.textContent = 'Follow the steps below. You can check and correct every number before anything is saved.';
  labelFor('dept', 'Department number');
  labelFor('aisleNumber', 'Aisle number');
  labelFor('bayNumber', 'Bay number');
  labelFor('tagDate', 'Date printed on tag (optional)');
  labelFor('sku', 'SKU number');
  labelFor('qty', 'How many?');
  labelFor('search', 'Find an item by SKU, location, or name');
  rename('scanBay', 'Read yellow location tag');
  rename('scanBear', 'Find SKUs in my photos');
  rename('addBearRow', '➕ Add a missing SKU');
  rename('clearBearRows', 'Clear unsaved review');
  rename('saveBearRows', '✅ Save reviewed items');
  rename('exportBtn', 'Download spreadsheet (CSV)');
  rename('backupBtn', 'Save inventory backup');
  const restoreLabel = document.querySelector('label[for="importFile"]');
  if (restoreLabel) restoreLabel.textContent = 'Restore a backup';

  const cameraNames = {
    bayPhoto:'📷 Take yellow tag photo',bayUpload:'🖼 Choose yellow tag photo',
    bearPhoto:'📷 Take white tag photo',bearUpload:'🖼 Choose tag photos'
  };
  for (const [id, text] of Object.entries(cameraNames)) labelFor(id,text);

  const progress = make('div','easy-progress');
  progress.setAttribute('aria-label','Your progress');
  const stepData = [
    ['1 · Location','Department, aisle, bay'],
    ['2 · Photos','Take or choose photos'],
    ['3 · Review','Check SKUs, then save']
  ];
  const stepBoxes = stepData.map(([name,note]) => {
    const item = make('div','easy-step');
    item.append(make('span','easy-step-label',name),make('span','easy-step-note',note));
    progress.append(item);
    return item;
  });
  addView.insertBefore(progress,form);

  // Place manual single-item entry behind a clear optional disclosure. The
  // original inputs, IDs and submit button remain attached to the same form.
  const manual = make('details','easy-manual');
  manual.id = 'easyManualEntry';
  const summary = make('summary','', '✏️ Enter one item without photos');
  manual.append(summary);
  const inside = make('div','easy-manual-inside');
  inside.append(make('p','easy-beginner-note','Use this only if scanning does not work or when you want to edit one saved item.'));
  const manualGrid = make('div','grid');
  const moveManualField = (id, dest) => {
    const field = $(id)?.closest('.field');
    if (field && field !== dest && !dest.contains(field)) dest.append(field);
  };
  for (const id of ['sku','qty','tagDate','product','brand','model','entryStatus','lookupBtn']) moveManualField(id,manualGrid);
  inside.append(manualGrid);
  const advanced = make('details','easy-advanced');
  advanced.append(make('summary','', 'More options (advanced)'));
  moveManualField('pageHtml',advanced);
  if (advanced.children.length > 1) inside.append(advanced);
  const buttons = $('saveBtn')?.closest('.actions');
  if (buttons) inside.append(buttons);
  manual.append(inside);
  bearPanel.append(manual);

  const photoHelp = make('div','easy-info');
  photoHelp.innerHTML = '<strong>Photo tips:</strong> Get the entire white tag in the picture, avoid glare, and keep the SKU and quantity lines readable. One tag may contain up to three SKUs.';
  const photoField = $('bearPhoto')?.closest('.field');
  if (photoField) photoField.insertBefore(photoHelp, photoField.firstChild);

  const bayHelp = make('div','easy-info');
  bayHelp.textContent = 'On the yellow tag, find the department number at the top and the aisle-bay numbers below it. You do not need the barcode or direction.';
  locationPanel.append(bayHelp);

  const reviewPanel = $('multiBear');
  if (reviewPanel) {
    const h3 = reviewPanel.querySelector('h3');
    if (h3) h3.textContent = 'Step 3 · Check each SKU before saving';
  }
  const reviewSummary = make('div','easy-review-summary');
  reviewSummary.setAttribute('role','status');
  reviewSummary.setAttribute('aria-live','polite');
  if (reviewPanel) {
    const h3 = reviewPanel.querySelector('h3');
    if (h3) h3.after(reviewSummary); else reviewPanel.prepend(reviewSummary);
  }
  function updateReview() {
    const rows = Array.from($('bearRows')?.children || []);
    if (!rows.length) {
      reviewSummary.replaceChildren(make('strong','','No items to review yet'),make('span','','Take a photo and tap “Find SKUs in my photos,” or add one SKU by hand.'));
      reviewSummary.className = 'easy-review-summary';
      return;
    }
    const missingSku = rows.filter(r => !/^\d{3}-\d{3}$/.test(r.querySelector('[data-field="sku"]')?.value.trim()||'')).length;
    const missingQty = rows.filter(r => !/^\d+$/.test(r.querySelector('[data-field="qty"]')?.value.trim()||'')).length;
    const missingDate = rows.filter(r => !(r.querySelector('[data-field="tagDate"]')?.value||'').trim()).length;
    const pieces = [];
    if (missingSku) pieces.push(`${missingSku} missing or invalid SKU`);
    if (missingQty) pieces.push(`${missingQty} missing quantity`);
    if (missingDate) pieces.push(`${missingDate} missing date (check the photo)`);
    reviewSummary.className = 'easy-review-summary ' + (missingSku||missingQty?'is-warning':'is-ready');
    reviewSummary.replaceChildren(
      make('strong','',`${rows.length} SKU ${rows.length===1?'entry':'entries'} ready for review`),
      make('span','',pieces.length ? 'Check these before saving: '+pieces.join(' · ')+'.' : 'All SKUs and quantities are filled in. Confirm the numbers match the photos, then save.')
    );
  }
  function updateProgress() {
    const dept = $('dept')?.value.trim()||'';
    const aisle = $('aisleNumber')?.value.trim()||'';
    const bay = $('bayNumber')?.value.trim()||'';
    const locationComplete = /^\d{1,2}$/.test(dept)&&/^\d{1,2}$/.test(aisle)&&/^\d{1,3}$/.test(bay);
    const photoLoaded = !!($('bearPreview')?.getAttribute('src')) || Array.from($('bearRows')?.children||[]).length>0;
    const rows = Array.from($('bearRows')?.children || []);
    const reviewComplete = rows.length > 0 && rows.every(row =>
      /^\d{3}-\d{3}$/.test(row.querySelector('[data-field="sku"]')?.value.trim() || '') &&
      /^\d+$/.test(row.querySelector('[data-field="qty"]')?.value.trim() || '')
    );
    [locationComplete,photoLoaded,reviewComplete].forEach((done,i) => {
      stepBoxes[i].classList.toggle('is-done',done);
      stepBoxes[i].classList.toggle('is-current',!done && (i===0 || (i===1&&locationComplete) || (i===2&&photoLoaded)));
    });
    updateReview();
  }
  for (const id of ['dept','aisleNumber','bayNumber','sku','qty','tagDate','bearUpload','bearPhoto']) {
    $(id)?.addEventListener('input', updateProgress);
    $(id)?.addEventListener('change', updateProgress);
  }
  $('bearRows')?.addEventListener('input',updateProgress);
  $('bearRows')?.addEventListener('change',updateProgress);
  const observer = new MutationObserver(updateProgress);
  if ($('bearRows')) observer.observe($('bearRows'),{childList:true});
  if ($('bearPreview')) observer.observe($('bearPreview'),{attributes:true,attributeFilter:['src']});
  if ($('resetBtn')) $('resetBtn').addEventListener('click',()=>queueMicrotask(updateProgress));
  if ($('saveBearRows')) $('saveBearRows').addEventListener('click',()=>queueMicrotask(updateProgress));

  // Opening an existing inventory record must also reveal its edit form.
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button && button.closest('#items .itemactions') && button.textContent.trim() === 'Edit') {
      manual.open = true;
      queueMicrotask(() => jump(manual));
    }
  });

  rename('lookupBtn','Look up this SKU');
  rename('extractBtn','Read copied product details');
  const help = make('details','easy-help');
  help.append(make('summary','', '❓ Help: How do I use BayTag?'));
  const helpContent = make('div','easy-help-content');
  for (const [title,desc] of [
    ['1. Where are the items?','Read department, aisle and bay from the yellow location tag. You can take its picture or type the numbers.'],
    ['2. Take photos','Take or choose photos of the white BEAR product tags. Tap “Find SKUs in my photos.”'],
    ['3. Check and save','Check each SKU, quantity and date against the photo. Change anything that looks wrong. Tap “Save reviewed items.”'],
    ['Find saved items','Tap “Saved Items,” then search by SKU or location.'],
    ['Protect your data','Use “Save inventory backup” regularly. Inventory is saved only in this browser, not in a cloud account.'],
    ['No internet?','Saved inventory can be viewed offline after the app loads. The first photo scan may need internet to download the text reader.']
  ]) {
    const p = make('p');
    p.append(make('strong','',title+' '),document.createTextNode(desc));
    helpContent.append(p);
  }
  if (updateButton) helpContent.append(updateButton);
  help.append(helpContent);
  main.append(help);

  updateProgress();
})();
