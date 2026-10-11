const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('assert/strict');
const file='src/util/酒馆助手脚本/线上功能脚本/online-store.ts';
const source=fs.readFileSync(file,'utf8');const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
const names=['createOnlineDataStorageSnapshot','createOnlineEntryStorageSnapshot','createOnlineVariantStorageSnapshot','createOnlineVariantMetaSnapshot','saveOnlineData','writeOnlinePayloadRecord'];
const code=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name.text)).map(n=>n.getText(ast)).join('\n');
let indexed=true,pruned=false,transaction;
const context=vm.createContext({console,Map,Date,
 supportsOnlinePayloadIndexedDb:()=>indexed, normalizeOnlineData:x=>x,normalizeOnlineSelectionMaps:x=>x,
 createOnlineVariant:x=>x||{},getOnlineEntryKey:x=>'entry-'+x,getCurrentOnlineScopeInfo:()=>({scope_key:'scope'}),getCurrentChatStorageId:()=> 'chat',getOnlinePayloadStorageKey:()=> 'payload',
 getCurrentChatStorageIdentity:()=>({storage_id:'chat',aliases:[]}),attachCurrentOnlineScope:x=>x,readOnlineDataStore:()=>({}),findStoredChatKeyForCurrentChat:()=>null,writeOnlineDataStore:()=>false,pruneOnlineStorageForCurrentScope:()=>{pruned=true;},
 online_payload_cache:new Map(),ONLINE_PAYLOAD_STORE_NAME:'payloads',openOnlinePayloadDatabase:async()=>({transaction:()=>transaction}),
});
vm.runInContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
const html='<img src="data:image/png;base64,'+'A'.repeat(2700000)+'">';
const variant={id:'v',html,memory_text:'memory',raw_result:html};
const entry={id:'e',message_id:1,variants:[variant],active_variant_id:'v',html};
const data={entries:[entry],active_entry:entry,active_entry_id:'e',html,memory_text:'memory'};
const compact=context.createOnlineDataStorageSnapshot(data);
assert.ok(JSON.stringify(compact).length<5000);assert.ok(!JSON.stringify(compact).includes('data:image'));assert.equal(compact.entries[0].variants[0].html,'');assert.equal(data.html,html);
indexed=false;assert.equal(context.createOnlineDataStorageSnapshot(data).entries[0].variants[0].html,html);
assert.throws(()=>context.saveOnlineData(data),/未自动删除/);assert.equal(pruned,false);
(async()=>{
 const request={};transaction={objectStore:()=>({put:()=>request})};
 let completed=false;const pending=context.writeOnlinePayloadRecord('key','scope','chat',data).then(v=>{completed=true;return v;});
 await Promise.resolve();await Promise.resolve();assert.equal(completed,false);transaction.onabort();assert.equal(await pending,false);
 transaction={objectStore:()=>({put:()=>({})})};const saved=context.writeOnlinePayloadRecord('key','scope','chat',data);await Promise.resolve();transaction.oncomplete();assert.equal(await saved,true);
 console.log('PASS metadata-only snapshot, inline fallback, no quota pruning, IDB commit/abort');
})().catch(e=>{console.error(e);process.exitCode=1;});
