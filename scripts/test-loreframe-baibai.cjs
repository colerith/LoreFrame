const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const base = 'src/util/酒馆助手脚本/线上功能脚本/';
const host = { location: new URL('https://tavern.example/'), setTimeout, clearTimeout };
const st = { extensionSettings: {} };
let calls = [];
const context = vm.createContext({
  console,
  URL,
  Response,
  Uint8Array,
  TextDecoder,
  DataView,
  Blob,
  crypto,
  btoa,
  AbortSignal,
  host_window: host,
  SillyTavern: st,
  window: {},
  $: () => ({ on() {} }),
  appendImageGenerationLog() {},
  fetch: async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ image: 'cGl4ZWw=' }), { headers: { 'content-type': 'application/json' } });
  },
});
for (const name of ['settings.ts', 'baibai.ts', 'ui-events.ts']) {
  vm.runInContext(
    ts.transpileModule(fs.readFileSync(base + name, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context,
  );
}
(async () => {
  const settings = {
    nai: {
      model: 'nai-diffusion-5-full',
      portraitSize: '896x1152',
      sampler: 'k_euler',
      endpoints: [{ id: 'proxy', name: '代理', url: 'https://proxy.example/prefix', key: 'fixture-key' }],
      artistPresets: [{ id: 'a', prompt: 'watercolor', quality: 'detailed', negative: 'text' }],
      activeArtistId: 'a',
    },
  };
  const before = JSON.stringify(settings);
  const original = context.getDefaultImageGenerationSettings();
  const first = context.importLoreFrameBaibaiPresets(settings, original);
  assert.equal(first.settings.presets.length, 2);
  const second = context.importLoreFrameBaibaiPresets(settings, first.settings);
  assert.equal(second.settings.presets.length, 2);
  assert.equal(second.settings.enabled, false);
  assert.equal(JSON.stringify(settings), before);
  const preset = second.settings.presets[1];
  assert.equal(preset.endpoint, 'https://proxy.example/prefix/ai/generate-image');
  assert.equal(preset.positive_prompt, 'watercolor, detailed');
  assert.equal(preset.width, 896);
  assert.equal(preset.height, 1152);
  assert.throws(() => context.loreFrameNovelAiEndpoint('https://x.example/?key=secret'));
  assert.throws(() => context.importLoreFrameBaibaiPresets({}, original), /未找到/);
  st.extensionSettings.baibai_image = {
    nai: { vibes: [{ id: 'v', name: '编码', strength: 0.7, encodings: { v5full: { encoding: 'fixture-encoding' } } }] },
  };
  const vibe = await context.readLoreFrameBaibaiVibe('v');
  assert.equal(vibe.id, 'baibai-v');
  assert.equal(vibe.encodings.v5full.encoding, 'fixture-encoding');
  const result = await context.requestNovelAiImage(preset, 'portrait', 'text', [vibe]);
  assert.equal(result.image, 'data:image/png;base64,cGl4ZWw=');
  assert.equal(calls.length, 1, 'matching cached encoding skips encode-vibe');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.parameters.params_version, 4);
  // Compare the actual shipped Electric Phone payload with equivalent settings.
  const waveSource = fs.readFileSync('.wave-publish/Electric-Phone/tavern-helper/电波手机/services/image/generate.ts', 'utf8');
  const waveContext = vm.createContext({ exports: {}, require: () => ({}), crypto,
    imagePrompt: () => 'portrait' });
  vm.runInContext(ts.transpileModule(waveSource.slice(waveSource.indexOf('export function novelAiBody'), waveSource.indexOf('export function bytesBase64')), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, waveContext);
  const expected = waveContext.exports.novelAiBody({ model: preset.model, width: preset.width, height: preset.height,
    scale: preset.prompt_guidance, steps: preset.steps, sampler: context.imageGenerationSamplerValue(preset.sampler),
    noiseSchedule: preset.noise_schedule, cfgRescale: preset.prompt_guidance_rescale, seed: body.parameters.seed,
    negative: 'text', normalizeRefStrength: false }, {}, 'portrait');
  for (const key of Object.keys(expected.parameters)) if (key.includes('reference')) delete expected.parameters[key];
  assert.deepEqual(body, JSON.parse(JSON.stringify(expected)), 'NAI 5 matches Electric Phone except omitted Vibe');

  assert.ok(!Object.keys(body.parameters).some(key => key.includes('reference')), 'NAI 5 omits all Vibe fields');
  for (const model of ['nai-diffusion-5', 'nai-diffusion-5-full', 'nai-diffusion-5-curated']) {
    calls = [];
    const references = Array.from({length: 9}, () => ({...vibe, image_data: 'data:image/png;base64,cGl4ZWw=', encodings: {}}));
    const before = JSON.stringify(references);
    await context.requestNovelAiImage({...preset, model}, 'p', '', references);
    assert.equal(calls.length, 1, 'NAI 5 skips encoding and Vibe validation');
    assert.ok(calls[0].url.endsWith('/ai/generate-image'));
    assert.ok(!Object.keys(JSON.parse(calls[0].init.body).parameters).some(key => key.includes('reference')));
    assert.equal(JSON.stringify(references), before);
  }
  calls = [];
  const compatible = {...preset, model: 'nai-diffusion-4-5-full'};
  await context.requestNovelAiImage(compatible, 'p', '', [{...vibe, encodings: {'v4-5full': {encoding: 'fixture-encoding'}}}]);
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(calls[0].init.body).parameters.reference_image_multiple_cached[0].data, 'fixture-encoding');
  calls = [];
  await assert.rejects(
    context.requestNovelAiImage({ ...preset, model: 'nai-diffusion-4-5-full' }, 'p', '', [vibe]),
    /编码或原图/,
  );
  assert.equal(calls.length, 0);
  await context.requestNovelAiImage(compatible, 'p', '', [{ ...vibe, strength: 0 }]);
  assert.equal(JSON.parse(calls[0].init.body).parameters.reference_image_multiple_cached.length, 0);
  st.extensionSettings.baibai_image.nai.vibes = [{ id: 'remote', dataPath: 'https://other.example/user/files/v.json' }];
  await assert.rejects(context.readLoreFrameBaibaiVibe('remote'), /当前酒馆/);
  console.log('PASS: 柏宝绘只读导入、去重、原配置保留、自定义尺寸、代理路径、Vibe 缓存复用及模型隔离');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
