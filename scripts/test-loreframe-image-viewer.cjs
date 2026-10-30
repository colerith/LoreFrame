const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<body><div class="online-preview-shell"></div></body>',{url:'https://fixture.local'});const doc=dom.window.document;
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new dom.window.Event('close'));};
const base='src/util/酒馆助手脚本/拟界文库/';
let html='<figure data-image-asset><img data-image-prompt="tea" src="data:image/png;base64,AAAA" data-image-generation-complete="true"><figcaption data-image-generation-status>生图提示词已识别</figcaption></figure>';
const entry={id:'e',active_variant_id:'v'};const ctx=vm.createContext({imageCharacterThinkingPrompt:()=>'',effectiveImageCharacters:()=>[],imageCharacterNames:()=>[],resolveImageCharacterPrompt:image=>({prompt:image.dataset.imagePrompt||'',negative:''}),DOMParser:dom.window.DOMParser,console,Map,Date,Math,
 getCurrentOnlineData:()=>({active_entry:entry}),getEntryActiveVariant:()=>({id:'v',html}),getCurrentOnlineScopeInfo:()=>({scope_key:'scope'}),getCurrentChatStorageLabel:()=> 'chat',
 active_image_jobs:new Set(),image_job_feedback:new Map(),getSettings:()=>({image_generation:{presets:[]}}),normalizeImageGenerationSettings:x=>x,
 updateOnlineEntry:(_,patch)=>{html=patch.html;},renderOnlineContent:()=>{},generateOnlineImages:async()=>{},
});
for(const name of ['image-viewer.ts','ui-render.ts'])vm.runInContext(ts.transpileModule(fs.readFileSync(base+name,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
ctx.renderOnlineContent=()=>{};
let normalized=new dom.window.DOMParser().parseFromString(ctx.normalizeImageAssetMarkup(html),'text/html');assert.equal(normalized.querySelector('[data-image-generation-status]'),null);assert.equal(normalized.querySelector('script'),null);assert.equal(normalized.querySelector('img').getAttribute('role'),null);assert.ok(normalized.querySelector('style').textContent.includes('scrollbar-width: none'));
normalized=new dom.window.DOMParser().parseFromString(ctx.normalizeImageAssetMarkup('<figure data-image-asset><img data-image-prompt="tea"></figure>'),'text/html');assert.ok(!decodeURIComponent(normalized.querySelector('img').src).includes('生图提示词已识别'));assert.ok(decodeURIComponent(normalized.querySelector('img').src).includes('translate(432 272)'));
ctx.openLoreFrameImageControls(doc,0);assert.equal(doc.querySelector('dialog'),null);assert.ok(doc.querySelector('[data-loreframe-image-controls]'));assert.equal(doc.querySelector('[data-loreframe-image-controls]').nextElementSibling.className,'online-preview-shell');
const click=label=>{const b=[...doc.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===label||b.textContent===label);assert.ok(b,label);b.click();};
click('编辑提示词');doc.querySelector('textarea').value='new prompt';click('保存修改');assert.ok(html.includes('new prompt'));
click('编辑配文');doc.querySelector('textarea').value='<script>caption</script>';click('保存配文');assert.equal(doc.querySelector('[data-caption]').textContent,'<script>caption</script>');
assert.ok(!doc.querySelector('[data-stage]'));
click('历史版本');assert.ok(doc.querySelector('[data-panel]').textContent.includes('版本 1'));
click('删除当前图片版本');click('确认删除');assert.ok(!new dom.window.DOMParser().parseFromString(html,'text/html').querySelector('img').hasAttribute('src'));
click('收起图片操作');assert.equal(doc.querySelector('[data-loreframe-image-controls]'),null);
console.log('PASS placeholder icon, generated caption removal, inline controls prompt/caption/history/delete; no viewer or image click bridge');
