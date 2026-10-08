const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const base = 'src/util/酒馆助手脚本/线上功能脚本/';
let calls = [];
const context = vm.createContext({
  URL,
  Response,
  Uint8Array,
  AbortSignal,
  btoa,
  console,
  bytesToBase64: bytes => Buffer.from(bytes).toString('base64'),
  fetch: async (url, init) => {
    calls.push({ url, init });
    return Response.json({ data: [{ b64_json: 'cGl4ZWw=' }] });
  },
});
for (const name of ['settings.ts', 'gpt-image.ts', 'prompt-builder.ts']) {
  vm.runInContext(
    ts.transpileModule(fs.readFileSync(base + name, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context,
  );
}
(async () => {
  const old = context.getDefaultImageGenerationSettings();
  const settings = context.normalizeImageGenerationSettings({
    ...old,
    mode: 'gpt_image',
    gpt_image: { api_key: 'fixture-key', output_format: 'webp' },
  });
  assert.equal(settings.presets[0].model, old.presets[0].model);
  context.getSettings = () => ({ image_generation: { ...settings, enabled: true } });
  const messages = context.buildOnlineOrderedPrompts(
    { world_info: 'world', last_chat: 'chat' },
    { base_content: 'task' },
  );
  assert.deepEqual(
    Array.from(messages, m => m.role),
    ['system', 'user'],
  );
  assert(!messages.some(m => m.content.startsWith('不使用其他思考方式')));
  assert(messages.at(-1).content.includes('data-image-provider="gpt_image"'));
  assert(!JSON.stringify(messages).includes('fixture-key'));
  assert(!JSON.stringify(messages).includes('data-image-provider="novelai"'));
  context.getSettings = () => ({ image_generation: old });
  assert.equal(context.buildOnlineOrderedPrompts({}, {}).at(-1).role, 'user');
  const config = settings.gpt_image;
  const result = await context.requestGptImage(config, 'A watercolor garden');
  assert.equal(result.image, 'data:image/webp;base64,cGl4ZWw=');
  assert.equal(calls[0].url, 'https://api.openai.com/v1/images/generations');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.output_format, 'webp');
  for (const key of ['response_format', 'negative_prompt', 'reference_image_multiple_cached', 'sampler'])
    assert(!(key in body));
  for (const suffix of ['/v1', '/v1/images/generations', '/v1/images/edits', '/v1/models/']) {
    assert.equal(
      context.loreFrameGptImageRoot('https://proxy.example/prefix' + suffix),
      'https://proxy.example/prefix',
    );
  }
  await assert.rejects(
    context.requestGptImage({ ...config, background: 'transparent', output_format: 'jpeg' }, 'p'),
    /透明/,
  );
  await assert.rejects(context.requestGptImage({ ...config, api_key: '' }, 'p'), /API Key/);
  context.fetch = async () => new Response('', { status: 401 });
  await assert.rejects(context.requestGptImage(config, 'p'), /401/);
  context.fetch = async () => Response.json({ data: [] });
  await assert.rejects(context.requestGptImage(config, 'p'), /没有可识别/);
  context.fetch = async (url, init) => {
    if (url.endsWith('/generations')) return Response.json({ data: [{ url: 'https://cdn.example/image.png' }] });
    assert(!init.headers, 'do not forward API key to image download host');
    return new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'image/png' } });
  };
  assert.equal((await context.requestGptImage(config, 'p')).image, 'data:image/png;base64,AQI=');
  context.fetch = async () => Response.json({ data: [null, { id: 'proxy-art' }, { id: 'proxy-art' }] });
  assert.deepEqual(Array.from(await context.requestGptImageModels(config)), ['proxy-art']);
  const template = fs.readFileSync(base + 'iframe-template.ts', 'utf8');
  const start = template.indexOf('<section class="settings-card" data-image-provider-panel="gpt_image"');
  const end = template.indexOf('</section>', start) + '</section>'.length;
  const doc = new JSDOM(template.slice(start, end) + '<section data-image-provider-panel="novelai"></section>').window
    .document;
  context.renderGptImageSettings(doc, settings);
  const panelRule = template.match(/\[data-image-provider-panel\]\[hidden\]\s*\{[^}]+\}/)?.[0];
  assert(panelRule, 'provider panels must override the settings-card grid display');
  const style = doc.createElement('style');
  style.textContent = '.settings-card { display: grid; }' + panelRule;
  doc.head.append(style);
  assert.equal(doc.querySelector('[data-image-provider-panel="gpt_image"]').hidden, false);
  assert.equal(doc.querySelector('[data-image-provider-panel="novelai"]').hidden, true);
  doc.querySelector('[data-gpt-image-field="size"]').value = '1536x1024';
  const draft = context.readGptImageSettingsFromDom(doc);
  assert.equal(draft.size, '1536x1024');
  assert.equal(draft.api_key, 'fixture-key');
  context.renderGptImageSettings(doc, { ...settings, mode: 'novelai' });
  assert.equal(doc.querySelector('[data-image-provider-panel="gpt_image"]').hidden, true);
  assert.equal(doc.defaultView.getComputedStyle(doc.querySelector('[data-image-provider-panel="gpt_image"]')).display, 'none');
  assert.equal(context.readGptImageSettingsFromDom(doc).api_key, 'fixture-key');
  console.log(
    'PASS: user tail/no prefill, provider prompt isolation, GPT payload/base64/URL/errors, settings DOM roundtrip',
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
