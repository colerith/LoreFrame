const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
const base='src/util/酒馆助手脚本/拟界文库/';
function load(c,file,names){const s=fs.readFileSync(base+file,'utf8'),a=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true);const text=names?a.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name.text)).map(n=>n.getText(a)).join('\n'):s;vm.runInContext(ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,c);}
(async()=>{
const original={entries:[{id:'e',message_id:12,variants:[{id:'v',html:'<p>剧场<img src="data:image/png;base64,YQ=="></p>'}]}],scope:{scope_key:'s'},chat_aliases:['chat-file'],payload_storage:'indexeddb',payload_key:'s/old'};
const shell={...original,entries:[{...original.entries[0],variants:[{id:'v',html:''}]}]};
let store={old:shell},writes=0,finishRead;
const c=vm.createContext({console,setTimeout,clearTimeout,online_payload_read_failures:new Set(),CHAT_STORAGE_PREFIX:"legacy:",current_iframe_document:null,online_payload_cache:new Map(),online_payload_load_promises:new Map(),online_missing_snapshot_pending:new Set(),deleted_online_payload_keys:new Set(),supportsOnlinePayloadIndexedDb:()=>true,readOnlinePayloadRecord:()=>new Promise(resolve=>{finishRead=resolve;}),getOnlineChatStorageKey:()=> 'shell',readJsonStorage:()=>shell,getCurrentChatStorageIdentity:()=>({storage_id:'new-fingerprint',aliases:['chat-file']}),getCurrentOnlineScopeInfo:()=>({scope_key:'s'}),readOnlineDataStore:()=>store,normalizeOnlineData:x=>({...x,entries:x?.entries||[]}),getEmptyOnlineData:()=>({entries:[]}),normalizeChatAliasList:x=>x,writeOnlineDataStore:s=>{writes++;store=s;return true;},appendRunLog:()=>{},registerOnlineChatIndex:()=>{},getOnlinePayloadStorageKey:(scope,id)=>scope+'/'+id,attachCurrentOnlineScope:x=>x,getChatMetadataStore:()=>null,host_window:{localStorage:{removeItem(){}}},pruneOnlineStorageForCurrentScope:()=>({removed_entries:0}),getSettings:()=>({online_storage:{limit_mb:24}}),hasInlineOnlinePayload:x=>x.entries?.some(e=>e.variants?.some(v=>v.html)),buildCurrentMessageIdentityMap:()=>new Map(),normalizeOnlineSelectionMaps:x=>x});
load(c,'online-store.ts',['findStoredChatKeyForCurrentChat','queueOnlinePayloadHydration','syncOnlineDataWithCurrentChat','saveOnlineData','shouldPruneOnlineDataForReason','pruneOnlineDataAgainstCurrentMessages']);
c.queueOnlinePayloadHydration('s','old','s/old');
for(const reason of ['chat_changed','读取当前页面','message_deleted']){assert.equal(c.syncOnlineDataWithCurrentChat(reason).entries.length,1);assert.equal(writes,0);}
assert.throws(()=>c.saveOnlineData(original),/正在从本地缓存恢复/);
finishRead({data:original});await c.online_payload_load_promises.get('s/old');
store.old=c.online_payload_cache.get('s/old');
assert.equal(c.syncOnlineDataWithCurrentChat('chat_changed').entries[0].variants[0].html,original.entries[0].variants[0].html);
assert.equal(writes,0,'cold read must not rename the old key');
assert.equal(c.pruneOnlineDataAgainstCurrentMessages(original).changed,false,'empty host chat must not destroy saved theatres');
c.saveOnlineData(store.old);assert.ok(store.old);assert.ok(!store['new-fingerprint']);assert.equal(writes,1);
store.old=shell;assert.throws(()=>c.saveOnlineData(original),/尚未读取成功/);assert.equal(writes,1);
store.old={...shell,entries:[],inherit_disabled:true};c.saveOnlineData(original);assert.equal(writes,2,'manually cleared chat can generate again');
c.online_payload_load_promises.set('s/other', new Promise(()=>{})); store.other=shell; c.saveOnlineData(original); assert.equal(writes,3,'another chat hydration must not block current chat save');
assert.equal(c.shouldPruneOnlineDataForReason('chat_changed'),false);assert.equal(c.shouldPruneOnlineDataForReason('message_deleted'),true);
// Exercise the real preview -> hydration -> save ordering for a never-saved chat.
const emptyContext = vm.createContext({console, online_payload_cache:new Map(),online_payload_load_promises:new Map(),online_payload_read_failures:new Set(),supportsOnlinePayloadIndexedDb:()=>true,
 getOnlinePayloadStorageKey:()=> 'new-chat',getOnlineChatStorageKey:()=> 'new-shell',readJsonStorage:()=>null,
 getCurrentOnlineScopeInfo:()=>({scope_key:'s'}),getCurrentChatStorageId:()=> 'new-chat',
 getCurrentOnlineDataFromResolvedPayload:x=>x});
let emptyReads=0;
emptyContext.readOnlinePayloadRecord=async()=>{emptyReads++;return null;};
load(emptyContext,'online-store.ts',['getEmptyOnlineData','getCurrentOnlineData','queueOnlinePayloadHydration']);
emptyContext.syncOnlineDataWithCurrentChat=()=>emptyContext.getEmptyOnlineData();
for(let i=0;i<5;i++) emptyContext.getCurrentOnlineData();
assert.equal(emptyReads,0,'new chat preview must not open a nonexistent payload');
assert.equal(emptyContext.online_payload_load_promises.size,0,'new chat save must not be blocked by the preview read');
// A real missing payload settles as failure, not a new pending read on every refresh.
emptyContext.readJsonStorage=()=>({entries:[{id:'old'}]});
emptyContext.queueOnlinePayloadHydration('s','old','missing');
await emptyContext.online_payload_load_promises.get('missing');
assert.ok(emptyContext.online_payload_read_failures.has('missing'));
emptyContext.queueOnlinePayloadHydration('s','old','missing');
assert.equal(emptyReads,1,'failed read should not automatically restart forever');
assert.equal(emptyContext.online_payload_load_promises.size,0);
const p=vm.createContext({console});load(p,'settings.ts');const long='正负提示词, '.repeat(2500);assert.equal(p.clampPromptText(long),long);assert.equal(p.normalizeImageGenerationPreset({positive_prompt:long,negative_prompt:long}).positive_prompt,long);assert.equal(p.normalizeImageGenerationPreset({negative_prompt:long}).negative_prompt,long);assert.equal(p.normalizeGptImageSettings({positive_prompt:long}).positive_prompt,long);
console.log('PASS cold restart with delayed payload, empty host chat, stable old key, failed hydration preservation, long positive/negative prompts');
})().catch(e=>{console.error(e);process.exitCode=1;});
