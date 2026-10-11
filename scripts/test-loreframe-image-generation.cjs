const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<button data-trigger-image-generation><span>生成图片</span></button>');
const button = dom.window.document.querySelector('button');
const base = 'src/util/酒馆助手脚本/线上功能脚本/';
let html, calls, fail, pending, chat;
const entry = { id: 'entry', active_variant_id: 'variant' };
const context = vm.createContext({
 DOMParser: dom.window.DOMParser, console,
 getCurrentOnlineData: () => ({active_entry: entry, entries: [entry]}),
 getEntryActiveVariant: () => ({ id: 'variant', html }),
 getCurrentOnlineScopeInfo: () => ({ scope_key: 'scope' }),
 getCurrentChatStorageLabel: () => chat,
 getSettings: () => ({image_generation: { enabled: true, mode: 'gpt_image', presets: [], vibe_groups: [], gpt_image: {} }}),
 normalizeImageGenerationSettings: value => value,
 planImageAssetRoutes: value => value,
 updateOnlineEntry: (_, patch) => { html = patch.html; entry.html = html; },
 appendImageGenerationLog: () => {}, showInlineToast: () => {}, renderOnlineContent: () => {},
 requestGptImage: async () => { calls++; if (pending) await pending; if (calls === fail) throw Error('mock failure'); return {image: 'data:image/png;base64,AAAA'}; },
});
vm.runInContext(ts.transpileModule(fs.readFileSync(base + 'image-generation.ts','utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText, context);
function reset() { html = '<figure data-image-asset><img data-image-prompt="sky"></figure>'.repeat(2); entry.html = html; calls=0; fail=0; pending=null; chat='a'; }
(async () => {
 reset(); fail=2; await context.generateOnlineImages(dom.window.document, true);
 assert.equal(button.disabled,false); assert.equal(button.textContent,'重试未完成图片');
 assert.equal(calls,2); assert.equal((html.match(/data-image-generation-complete/g)||[]).length,1);
 fail=0; await context.generateOnlineImages(dom.window.document); assert.equal(calls,3); assert.equal(button.textContent,'已完成 1/1');
 await context.generateOnlineImages(dom.window.document); assert.equal(calls,3);
 reset(); let release; pending=new Promise(resolve => release=resolve);
 const first=context.generateOnlineImages(dom.window.document,true);
 assert.equal(button.disabled,true); assert.equal(button.getAttribute('aria-busy'),'true'); assert.equal(button.textContent,'正在生成 0/2');
 await context.generateOnlineImages(dom.window.document); assert.equal(calls,1);
 chat='b'; release(); await first; assert.equal(calls,1); assert.ok(!html.includes('data-image-generation-complete'));
 reset(); pending=new Promise(resolve => release=resolve);
 const editing=context.generateOnlineImages(dom.window.document,true);
 html='edited'; entry.html=html; release(); await editing; assert.equal(html,'edited'); assert.equal(calls,1);
 reset(); pending=new Promise(resolve => release=resolve);
 const switching=context.generateOnlineImages(dom.window.document,true);
 entry.active_variant_id='other'; release(); await switching; assert.ok(!html.includes('data-image-generation-complete')); entry.active_variant_id='variant';
 reset(); html=html.replaceAll('data-image-asset','data-image-asset data-image-render-mode="css"'); entry.html=html;
 await context.generateOnlineImages(dom.window.document,true); assert.equal(calls,0);
 assert.match(fs.readFileSync(base+'generation.ts','utf8'), /generateOnlineImages\(iframe_document, true\)/);
 console.log('PASS automatic hook, duplicate requests, partial persistence, retry, chat guard, CSS bypass');
})().catch(error => {console.error(error);process.exitCode=1;});
