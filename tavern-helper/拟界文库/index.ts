import constantsSource from './constants?raw';
import stateSource from './state?raw';
import typesSource from './types?raw';
import settingsSource from './settings?raw';
import onlineStoreSource from './online-store?raw';
import utilsSource from './utils?raw';
import storageSource from './storage?raw';
import tavernSource from './tavern?raw';
import uiRenderSource from './ui-render?raw';
import sourceCollectorSource from './source-collector?raw';
import promptBuilderSource from './prompt-builder?raw';
import generationSource from './generation?raw';
import monitorSource from './monitor?raw';
import iframeStylesSource from './iframe-styles?raw';
import iframeTemplateSource from './iframe-template?raw';
import uiEventsSource from './ui-events?raw';
import hostButtonsSource from './host-buttons?raw';
import releaseSource from './release.json?raw';
import baibaiSource from './baibai?raw';

const loreFrameBranding = {
  title: '拟界文库',
  version: (JSON.parse(releaseSource) as { version: string }).version,
  copyrightYear: '2026',
  originalAuthor: 'BABYLON',
  remixAuthor: '电波系',
} as const;

const brandingSource = `
const APP_TITLE = ${JSON.stringify(loreFrameBranding.title)};
const APP_VERSION = ${JSON.stringify(loreFrameBranding.version)};
const APP_COPYRIGHT_YEAR = ${JSON.stringify(loreFrameBranding.copyrightYear)};
const APP_ORIGINAL_AUTHOR = ${JSON.stringify(loreFrameBranding.originalAuthor)};
const APP_REMIX_AUTHOR = ${JSON.stringify(loreFrameBranding.remixAuthor)};
`;

const onlineFeatureParts = [
  ['branding.ts', brandingSource],
  ['constants.ts', constantsSource],
  ['state.ts', stateSource],
  ['types.ts', typesSource],
  ['settings.ts', settingsSource],
  ['baibai.ts', baibaiSource],
  ['online-store.ts', onlineStoreSource],
  ['utils.ts', utilsSource],
  ['storage.ts', storageSource],
  ['tavern.ts', tavernSource],
  ['ui-render.ts', uiRenderSource],
  ['source-collector.ts', sourceCollectorSource],
  ['prompt-builder.ts', promptBuilderSource],
  ['generation.ts', generationSource],
  ['monitor.ts', monitorSource],
  ['iframe-styles.ts', iframeStylesSource],
  ['iframe-template.ts', iframeTemplateSource],
  ['ui-events.ts', uiEventsSource],
  ['host-buttons.ts', hostButtonsSource],
] as const;

const onlineFeatureScript = ['(() => {', ...onlineFeatureParts.map(([, source]) => source), '})();'].join('\n');

const base64VlqChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toVlqSigned(value: number): number {
  return value < 0 ? (-value << 1) + 1 : value << 1;
}

function encodeVlq(value: number): string {
  let vlq = toVlqSigned(value);
  let encoded = '';

  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) {
      digit |= 32;
    }
    encoded += base64VlqChars[digit];
  } while (vlq > 0);

  return encoded;
}

function encodeSegment(values: number[]): string {
  return values.map(encodeVlq).join('');
}

function buildMappings(parts: readonly (readonly [string, string])[]): string {
  const lines: string[] = [];
  let previousSource = 0;
  let previousOriginalLine = 0;
  let previousOriginalColumn = 0;

  parts.forEach(([, source], sourceIndex) => {
    const sourceLines = source.split('\n');

    sourceLines.forEach((_, originalLine) => {
      lines.push(
        encodeSegment([
          0,
          sourceIndex - previousSource,
          originalLine - previousOriginalLine,
          0 - previousOriginalColumn,
        ]),
      );
      previousSource = sourceIndex;
      previousOriginalLine = originalLine;
      previousOriginalColumn = 0;
    });
  });

  return lines.join(';');
}

function base64EncodeUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function buildInlineSourceMap(parts: readonly (readonly [string, string])[]): string {
  const sourceMap = {
    version: 3,
    file: 'src/util/酒馆助手脚本/线上功能脚本/assembled.js',
    sources: parts.map(([filename]) => `src/util/酒馆助手脚本/线上功能脚本/${filename}`),
    sourcesContent: parts.map(([, source]) => source),
    names: [],
    mappings: buildMappings(parts),
  };

  return `data:application/json;charset=utf-8;base64,${base64EncodeUtf8(JSON.stringify(sourceMap))}`;
}

// 仍保持单文件脚本的运行语义，但给拼装后的脚本补一份行级 sourcemap。
// 这样 DevTools 里不再只看到 assembled.js，也能定位到拆分后的片段文件。
new Function(
  `${onlineFeatureScript}\n//# sourceMappingURL=${buildInlineSourceMap(onlineFeatureParts)}\n//# sourceURL=src/util/酒馆助手脚本/线上功能脚本/assembled.js`,
)();
