const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('');
const context = vm.createContext({ DOMParser: dom.window.DOMParser, console });
const base = 'src/util/酒馆助手脚本/线上功能脚本/';
for (const file of ['settings.ts', 'image-routing.ts', 'ui-render.ts']) {
  vm.runInContext(
    ts.transpileModule(fs.readFileSync(base + file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context,
  );
}
const builtins = context.getBuiltinAppearancePresets();
assert.equal(builtins.length, 2);
assert.equal(builtins[1].colors.day.panel_accent, '#5e80be');
const custom = context.normalizeAppearancePresets([{ id: 'custom-a', name: 'A', colors: builtins[1].colors }]);
const restored = context.normalizeAppearancePresets(JSON.parse(JSON.stringify(custom)));
assert.equal(restored[0].colors.night.panel_accent_strong, '#ffc2d7');
restored[0].colors.day.panel_accent = '#000000';
assert.equal(context.getBuiltinAppearancePresets()[1].colors.day.panel_accent, '#5e80be');
assert.equal(custom[0].colors.day.panel_accent, '#5e80be');
assert.equal(context.normalizeAppearancePresets([{ id: 'builtin-default', colors: {} }]).length, 0);
const settings = {
  ...context.getDefaultImageGenerationSettings(),
  enabled: true,
  probability_enabled: true,
  api_probability: 50,
};
const html =
  '<html><body><figure data-image-asset><img data-image-prompt="sky"><div data-image-css-fallback style="background:blue">sky</div></figure><figure data-image-asset><img data-image-prompt="mountain"></figure></body></html>';
let rolls = [0.49, 0.5];
const planned = context.planImageAssetRoutes(html, settings, () => rolls.shift());
let doc = new dom.window.DOMParser().parseFromString(planned, 'text/html');
assert.equal(doc.querySelectorAll('[data-image-render-mode="api"]').length, 1);
assert.equal(doc.querySelectorAll('[data-image-render-mode="css"]').length, 1);
assert.equal(doc.querySelector('[data-image-render-mode="css"] img').style.display, 'none');
assert(
  doc.querySelector('[data-image-render-mode="css"] [data-image-css-fallback]').style.background.includes('gradient'),
);
const rerun = context.planImageAssetRoutes(planned, { ...settings, api_probability: 100 }, () => {
  throw Error('must not reroll');
});
assert.equal(
  new dom.window.DOMParser().parseFromString(rerun, 'text/html').querySelectorAll('[data-image-render-mode="css"]')
    .length,
  1,
);
for (const [probability, route] of [
  [0, 'css'],
  [100, 'api'],
]) {
  const result = context.planImageAssetRoutes(html, { ...settings, api_probability: probability }, () => {
    throw Error('boundary does not need random');
  });
  assert.equal(
    new dom.window.DOMParser()
      .parseFromString(result, 'text/html')
      .querySelectorAll(`[data-image-render-mode="${route}"]`).length,
    2,
  );
}
const preview = context.normalizeImageAssetMarkup(planned);
doc = new dom.window.DOMParser().parseFromString(preview, 'text/html');
assert(!doc.querySelector('[data-image-render-mode="css"] [data-image-generation-status]'));
assert(!doc.querySelector('[data-image-render-mode="css"] img').getAttribute('src'));
assert(doc.querySelector('[data-image-render-mode="api"] img').getAttribute('src'));
console.log(
  'PASS theme persistence/isolation; probability boundaries, per-slot routes, stable retries, CSS fallback and preview',
);
