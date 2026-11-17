const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('stable version is consistent in every release metadata file',()=>{
  const v=JSON.parse(read('version.json')),p=JSON.parse(read('package.json')),l=JSON.parse(read('package-lock.json'));
  assert.equal(v.version,'2.4.0');assert.equal(v.releaseStatus,'stable');
  assert.equal(p.version,v.version);assert.equal(l.version,v.version);assert.equal(l.packages[''].version,v.version);
  assert.match(read('update.js'),/const BAYTAG_VERSION = '2\.4\.0';/);
  assert.match(read('sw.js'),/const CACHE = 'baytag-pwa-v2-4-0-stable';/);
});
test('release labels are stable while inventory key and Easy Mode remain compatible',()=>{
  const main=read('index.html'),upgrade=read('baytag-upgrades.js'),sw=read('sw.js');
  assert.match(main,/baytag-inventory-v1/);assert.match(main,/baytag-easy-mode\.js/);assert.match(main,/baytag-inventory-tools\.js/);
  assert.match(sw,/\.\/baytag-easy-mode\.js/);assert.match(sw,/\.\/baytag-inventory-tools\.js/);
  assert.match(upgrade,/BayTag v2\.4\.0 · Local-only inventory/);
  assert.match(upgrade,/window\.BayTagReleaseCandidate=\{version:'2\.4\.0'/);
  assert.doesNotMatch(upgrade,/LOCAL · TEST|RELEASE TEST/);
});
test('GitHub CI validates future pull requests into protected main',()=>{
  const yml=read('.github/workflows/tests.yml');
  assert.match(yml,/pull_request:\s*\n\s*branches: \[main\]/);
  assert.match(yml,/baytag-v2\.4-release/);
  assert.match(yml,/npm ci/);assert.match(yml,/npm test/);
});
