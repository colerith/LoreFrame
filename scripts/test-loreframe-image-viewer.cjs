const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<body></body>',{url:'https://fixture.local'});const doc=dom.window.document;
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'));};
const base='src/util/酒馆助手脚本/线上功能脚本/';
let html='<figure data-image-asset><img data-image-prompt="tea" src="data:image/png;base64,AAAA" data-image-generation-complete="true"><figcaption data-image-generation-status>生图提示词已识别</figcaption></figure>';
const entry={id:'e',active_variant_id:'v'};const ctx=vm.createContext({DOMParser:dom.window.DOMParser,console,Map,Date,Math,
 getCurrentOnlineData:()=>({active_entry:entry}),getEntryActiveVariant:()=>({id:'v',html}),getCurrentOnlineScopeInfo:()=>({scope_key:'scope'}),getCurrentChatStorageLabel:()=> 'chat',
 active_image_jobs:new Set(),image_job_feedback:new Map(),getSettings:()=>({image_generation:{presets:[]}}),normalizeImageGenerationSettings:x=>x,
 updateOnlineEntry:(_,patch)=>{html=patch.html;},renderOnlineContent:()=>{},generateOnlineImages:async()=>{},
});
for(const name of ['image-viewer.ts','ui-render.ts'])vm.runInContext(ts.transpileModule(fs.readFileSync(base+name,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
ctx.renderOnlineContent=()=>{};
let normalized=new dom.window.DOMParser().parseFromString(ctx.normalizeImageAssetMarkup(html),'text/html');assert.equal(normalized.querySelector('[data-image-generation-status]'),null);assert.ok(normalized.querySelector('script').textContent.includes('postMessage'));
normalized=new dom.window.DOMParser().parseFromString(ctx.normalizeImageAssetMarkup('<figure data-image-asset><img data-image-prompt="tea"></figure>'),'text/html');assert.ok(!decodeURIComponent(normalized.querySelector('img').src).includes('生图提示词已识别'));assert.ok(decodeURIComponent(normalized.querySelector('img').src).includes('translate(432 272)'));
ctx.openLoreFrameImageViewer(doc,0);assert.equal(doc.querySelector('dialog').open,true);
const click=label=>{const b=[...doc.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===label||b.textContent===label);assert.ok(b,label);b.click();};
click('编辑提示词');doc.querySelector('textarea').value='new prompt';click('保存修改');assert.ok(html.includes('new prompt'));
click('编辑配文');doc.querySelector('textarea').value='<script>caption</script>';click('保存配文');assert.equal(doc.querySelector('[data-caption]').textContent,'<script>caption</script>');
click('放大 / 适应窗口');assert.ok(doc.querySelector('[data-stage]').classList.contains('zoomed'));
click('历史版本');assert.ok(doc.querySelector('[data-panel]').textContent.includes('版本 1'));
click('删除当前图片版本');click('确认删除');assert.ok(!new dom.window.DOMParser().parseFromString(html,'text/html').querySelector('img').hasAttribute('src'));
click('关闭大图');assert.equal(doc.querySelector('dialog'),null);
console.log('PASS placeholder icon, generated caption removal, viewer prompt/caption/history/delete/zoom');
