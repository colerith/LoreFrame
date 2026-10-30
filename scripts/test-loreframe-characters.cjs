const fs = require('fs'), vm = require('vm'), ts = require('typescript'), assert = require('assert/strict');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<section data-image-character-settings></section>');
let globalRows = [], current = { chatMetadata: {}, saveMetadata: async () => {} }, chat = 'a';
const host = { SillyTavern: { extensionSettings: { baibai_image_char_global: { entries: [{ name: 'Imported', fields: { hair: 'black hair', eyes: 'blue eyes' } }] } } } };
const ctx = vm.createContext({ console, host_window: host, DOMParser: dom.window.DOMParser,
  getSillyTavernContext: () => current, getCurrentChatStorageLabel: () => chat,
  getCurrentOnlineScopeInfo: () => ({ scope_key: 'character' }),
  readGlobalVariableValue: () => globalRows, writeGlobalVariableValue: (_, rows) => (globalRows = rows, true),
});
for (const name of ['image-characters', 'ui-render']) vm.runInContext(ts.transpileModule(fs.readFileSync(`src/util/酒馆助手脚本/拟界文库/${name}.ts`, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
const plain = value => JSON.parse(JSON.stringify(value));
(async () => {
  await ctx.saveImageCharacters('global', [{ name: 'Alice', prompt: 'red hair', negative: 'hat' }, { name: 'Bob', prompt: 'beard' }]);
  await ctx.saveImageCharacters('chat', [{ name: 'Alice', prompt: 'blue hair', negative: 'glasses' }]);
  const chatA = current;
  assert.equal(ctx.effectiveImageCharacters()[0].prompt, 'blue hair');
  const image = dom.window.document.createElement('img'); image.dataset.imagePrompt = 'portrait'; image.dataset.imageCharacters = '["Alice","Alice"]';
  assert.deepEqual(plain(ctx.resolveImageCharacterPrompt(image)), { prompt: 'portrait\nAlice: blue hair', negative: 'glasses' });
  image.dataset.imagePrompt = '@{Alice} in a cafe';
  assert.equal(ctx.resolveImageCharacterPrompt(image).prompt, 'blue hair in a cafe');
  await ctx.saveImageCharacters('chat', [{ name: 'Alice', prompt: 'blue hair', enabled: false }]);
  assert.equal(ctx.effectiveImageCharacters().some(row => row.name === 'Alice'), false);
  current = { chatMetadata: {}, saveMetadata: async () => {} }; chat = 'b';
  assert.equal(ctx.effectiveImageCharacters()[0].prompt, 'red hair');
  assert.equal(ctx.readImageCharacters('chat').length, 0);
  current = { ...chatA, chatMetadata: JSON.parse(JSON.stringify(chatA.chatMetadata)) }; chat = 'a';
  assert.equal(ctx.readImageCharacters('chat')[0].enabled, false);
  const original = JSON.stringify(host);
  assert.equal((await ctx.importBaibaiImageCharacters())[0].prompt, 'black hair, blue eyes');
  assert.equal(JSON.stringify(host), original);
  ctx.renderImageCharacterSettings(dom.window.document);
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const click = label => [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === label).click();
  click('从柏宝绘导入角色'); await tick();
  assert.equal(globalRows.filter(row => row.name === 'Imported').length, 1);
  globalRows.find(row => row.name === 'Imported').prompt = 'manual edit';
  click('从柏宝绘导入角色'); await tick();
  assert.equal(globalRows.find(row => row.name === 'Imported').prompt, 'manual edit');
  let finish;
  host.STBaiBaiImage = { getCharacters: () => new Promise(resolve => { finish = resolve; }) };
  click('从柏宝绘导入角色'); chat = 'b'; finish({ characters: [{ name: 'Wrong chat', tag: 'test', scope: 'chat' }] }); await tick();
  assert.equal(ctx.readImageCharacters('chat').some(row => row.name === 'Wrong chat'), false);
  const source = '<figure data-image-asset style="height:200px;overflow:hidden"><div style="height:100px"><img style="height:100%;object-fit:cover;position:absolute" src="data:image/png;base64,AAAA"></div></figure>';
  const parsed = new dom.window.DOMParser().parseFromString(ctx.normalizeImageAssetMarkup(source), 'text/html');
  assert.equal(parsed.querySelector('img').style.height, 'auto');
  assert.equal(parsed.querySelector('img').style.objectFit, 'contain');
  assert.equal(parsed.querySelector('figure').style.height, 'auto');
  assert.equal(parsed.querySelector('div').style.height, 'auto');
  assert.equal(parsed.querySelector('img').style.getPropertyPriority('height'), 'important');
  const css = ctx.normalizeImageAssetMarkup('<figure data-image-asset data-image-render-mode="css"><img style="height:30px"></figure>');
  assert.ok(css.includes('height:30px'));
  console.log('PASS character scope isolation, metadata roundtrip, disabled overrides, selected prompt expansion, read-only import, deduplication, switched-chat import guard, full image layout');
})().catch(error => { console.error(error); process.exitCode = 1; });
