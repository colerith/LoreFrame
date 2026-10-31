const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const base = 'src/util/酒馆助手脚本/拟界文库/';
const context = vm.createContext({ console, escapeHtml: value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') });
function load(file) {
  vm.runInContext(ts.transpileModule(fs.readFileSync(base + file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
}
load('settings.ts');
context.readScriptVariableValue = (_, fallback) => fallback;
context.PUBLISHED_BASE_PROMPTS_KEY = 'base';
context.PUBLISHED_DETAIL_PROMPTS_KEY = 'detail';
context.PUBLISHED_PROMPTS_KEY = 'presets';
context.PUBLISHED_SUMMARY_TAGS_KEY = 'tags';
const settings = context.normalizeSettings(context.getDefaultSettings());
const htmlId = 'base-aurora-theater';
const textId = 'base-aurora-theater-text';
assert.equal(settings.base_prompts.find(p => p.id === textId).name, '极光小剧场·文字版 @电波系');
const ids = selected => Array.from(selected, p => p.id);
assert.deepEqual(ids(context.selectGenerationBasePrompts(settings)), [htmlId]);
settings.random_base_prompt = { enabled: true, resident_ids: [textId], prompt_ids: [htmlId, textId], count: 10, trigger_probability: 100 };
assert.deepEqual(ids(context.selectGenerationBasePrompts(settings)), [textId, htmlId]);
settings.random_base_prompt.trigger_probability = 0;
assert.deepEqual(ids(context.selectGenerationBasePrompts(settings)), [textId]);
assert.deepEqual(ids(context.selectGenerationBasePrompts(settings, true)), [textId, htmlId]);
settings.random_base_prompt.resident_ids = [];
assert.equal(context.selectGenerationBasePrompts(settings).length, 0);
settings.random_base_prompt.enabled = false;
settings.random_base_prompt.resident_ids = [htmlId, textId];
assert.deepEqual(ids(context.selectGenerationBasePrompts(settings)), [htmlId, textId]);
const roundtrip = context.normalizeSettings(JSON.parse(JSON.stringify(settings)));
assert.deepEqual(ids(context.selectGenerationBasePrompts(roundtrip)), [htmlId, textId]);
const old = context.getDefaultSettings();
old.base_prompts[0].name = '极光小剧场 @电波系';
old.base_prompts[0].content = '用户修改的正文';
const migrated = context.normalizeSettings(old);
assert.equal(migrated.base_prompts[0].name, '极光小剧场·交互版 @电波系');
assert.equal(migrated.base_prompts[0].content, '用户修改的正文');
load('prompt-builder.ts');
context.TEXT_THEATER_TEMPLATE = fs.readFileSync(base + 'text-theater-template.html', 'utf8');
context.sanitizeMemoryText = value => String(value);
const content = '# 春日番外 🌸\n\n> **引用内容**\n> 第二行\n\n|| 高亮故事 ||\n\n- 第一项\n- 第二项\n\n“暖色引文” **粗体** *斜体* ~~删除~~\n</script><script>window.injected=true</script>\n<img src=x onerror="window.injected=true">\n$& $1';
const parsed = context.parseOnlineGenerationResult(content, 'text');
assert.equal(parsed.memory_text, content);
assert.equal(parsed.raw_result, content);
const dom = new JSDOM(parsed.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://loreframe.test' });
const doc = dom.window.document;
assert.equal(dom.window.injected, undefined);
assert.equal(doc.querySelectorAll('script').length, 1);
assert.equal(doc.querySelectorAll('#animated-content img').length, 0);
assert.equal(doc.querySelector('h1').textContent, '春日番外 🌸');
assert.equal(doc.querySelector('.quote-center strong').textContent, '引用内容');
assert.equal(doc.querySelector('.highlight-block').textContent, '高亮故事');
assert.equal(doc.querySelectorAll('.content li').length, 2);
assert.ok(doc.querySelector('.content').textContent.includes('$& $1'));
assert.ok(!doc.querySelector('.content').textContent.includes('<start>'));
doc.querySelector('#btn-dark').click();
assert.equal(doc.documentElement.dataset.theme, 'dark');
doc.querySelector('#btn-light').click();
assert.equal(doc.documentElement.dataset.theme, 'light');
let scrolled = false;
doc.querySelector('#ryx-card').scrollIntoView = () => { scrolled = true; };
doc.querySelector('#bottom-to-top').click();
assert.ok(scrolled);
dom.window.close();
const prompts = context.buildOnlineOrderedPrompts({ last_chat: '原文' }, { output_mode: 'text', base_content: '文字版', detail_content: '论坛' });
assert.equal(prompts.length, 2);
assert.ok(prompts[0].content.includes('纯文本'));
assert.ok(!prompts.map(p => p.content).join('').includes('你必须输出一个完整可渲染的 HTML 文档'));
// A standalone local fixture supports browser layout checks without contacting an LLM.
fs.writeFileSync('.loreframe-text-theater-preview.html', context.parseOnlineGenerationResult(content.split('\n</script>')[0] + '\n\n' + '正文段落，测试手机端换行与排版。\n\n'.repeat(20), 'text').html);
console.log('PASS base selection, probability, deduplication, settings roundtrip, old-name migration, text rendering, escaping and theme controls');
// Exercise actual saveSettings serialization, rather than only normalized in-memory settings.
let persisted;
Object.assign(context, {
  PERSONAL_SETTINGS_KEY: 'personal', SETTINGS_STORAGE_KEY: 'settings',
  writeGlobalVariableValue: (_, value) => { persisted = value; },
  writeJsonStorage: () => true,
});
context.saveSettings(settings);
assert.deepEqual(ids(context.selectGenerationBasePrompts(context.normalizeSettings(JSON.parse(JSON.stringify(persisted))))), [htmlId, textId]);

load('generation.ts');
const calls = [], saved = [], status = [];
const noop = () => {};
let failText = false;
Object.assign(context, {
  console: { info: noop, error: noop, warn: noop },
  online_is_generating: false, active_online_generation_id: '', last_online_generation_finished_at: 0,
  getSettings: () => settings, getOnlineFeatureExclusionState: () => ({ excluded: false }),
  consumeTemporaryGenerationDetailPrompt: () => null,
  setOnlineStatus: (_, title, detail) => status.push([title, detail]),
  setBubbleGenerationState: noop, appendRunLog: noop, clearHostTypingIndicator: noop,
  markGenerationStarted: noop, markGenerationFinished: noop, createGenerationId: () => 'batch',
  buildSecondaryApiConfig: () => null, describeGenerationApi: () => 'test', describeGenerationModel: () => 'test',
  maskGenerationApiConfig: () => ({}), getEventApi: () => null, host_window: {}, window: {},
  waitForCurrentOnlineDataReady: async () => {},
  collectOnlineSourceMaterial: async () => ({ latest_message_id: 8, latest_swipe_id: 0, message_count: 1 }),
  buildImageGenerationThinkingPrompt: () => '',
  getApiFunction: name => name === 'generateRaw' ? async args => {
    assert.equal(context.online_is_generating, true);
    calls.push(args);
    if (args.ordered_prompts[0].content.includes('纯文本')) {
      if (failText) throw Error('模拟文字版请求失败');
      return '# 文字版结果\n\n> 引用';
    }
    return '<html><body><main data-online-memory>交互版结果</main></body></html>';
  } : undefined,
  DOMParser: new JSDOM('').window.DOMParser,
  planImageAssetRoutes: html => html,
  saveCurrentOnlineData: data => { saved.push(data); return { updated_at: '2026-10-30' }; },
  recordDetailPromptActivation: noop, renderOnlineContent: noop, switchMainView: noop, stopEventListener: noop,
  generateOnlineImages: async () => {}, appendImageGenerationLog: noop, showHostEchoToast: noop,
  formatErrorForDisplay: error => error.message,
});
(async () => {
  await context.generateOnlineForCurrentChat({}, '手动生成');
  assert.equal(calls.length, 2, JSON.stringify(status));
  assert.equal(saved.length, 2, JSON.stringify(status));
  assert.notEqual(calls[0].generation_id, calls[1].generation_id);
  assert.ok(saved[0].html.includes('交互版结果'));
  assert.ok(saved[1].html.includes('ryx-card'));
  assert.equal(saved[1].memory_text, '# 文字版结果\n\n> 引用');
  assert.equal(saved[0].message_id, saved[1].message_id);
  assert.equal(context.online_is_generating, false);
  assert.equal(context.active_online_generation_id, '');
  // Failure in the second request must retain the already saved first theatre.
  failText = true;
  await context.generateOnlineForCurrentChat({}, '手动生成');
  assert.equal(saved.length, 3);
  assert.equal(context.online_is_generating, false);
  assert.equal(status.at(-1)[0], '生成失败');
  console.log('PASS persistent base settings, separate HTML/text requests and saves, unique stream IDs, partial failure preservation and lock cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });

const named = context.parseOnlineGenerationResult('正文', 'text', '量体裁衣 <测试>');
assert.equal(named.title, '量体裁衣 <测试>');
assert.ok(named.html.includes('<title>量体裁衣 &lt;测试&gt;</title>'));
