import webpack from 'webpack';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'src/util/酒馆助手脚本/拟界文库');
const release = JSON.parse(await readFile(path.join(source, 'release.json'), 'utf8'));
if (release.slug !== 'loreframe' || !/^1\.7\.(0|[1-9]\d*)$/.test(release.version)) {
  throw new Error('拟界文库发布号必须为 1.7.X；调整版本系列时需同步更新发布规则。');
}
const tag = `${release.slug}-v${release.version}`;
const filename = `${release.slug}-${release.version}.js`;
const bundle = await readFile(path.join(root, 'dist/util/酒馆助手脚本/拟界文库/index.js'));
const output = path.join(root, 'release', '拟界文库', tag);
// 同版本不可覆盖，避免悄悄替换已交付的产物。
await mkdir(path.dirname(output), { recursive: true });
await mkdir(output);
await writeFile(path.join(output, filename), bundle);
await writeFile(
  path.join(output, 'manifest.json'),
  JSON.stringify(
    { ...release, tag, file: filename, sha256: createHash('sha256').update(bundle).digest('hex') },
    null,
    2,
  ) + '\n',
);
console.info(`拟界文库发布产物：${output}`);

// A standalone loader, with bundled SHA-256; no runtime CDN module dependencies.
await new Promise((resolve, reject) => {
  const compiler = webpack({
    mode: 'production', target: ['web', 'es2020'],
    entry: path.join(root, 'scripts/loreframe-git-loader/entry.ts'),
    output: { path: output, filename: 'loreframe-git-loader.js' },
    resolve: { extensions: ['.ts', '.js'] },
    module: { rules: [{ test: /\.ts$/, loader: 'ts-loader', options: { transpileOnly: true } }] },
  });
  compiler.run((error, stats) => compiler.close(closeError => {
    if (error || closeError || stats?.hasErrors()) reject(error || closeError || new Error(stats.toString({ all:false, errors:true })));
    else resolve();
  }));
});
await writeFile(path.join(output, 'loreframe-release-v1.json'), JSON.stringify({
  version: release.version, sha256: createHash('sha256').update(bundle).digest('hex'),
}, null, 2) + '\n');
await copyFile(path.join(root, 'node_modules/@noble/hashes/LICENSE'), path.join(output, 'SHA256-LICENSE.txt'));
const loader = await readFile(path.join(output, 'loreframe-git-loader.js'), 'utf8');
await writeFile(path.join(output, 'loreframe-git-loader.json'), JSON.stringify({
  type: 'script', enabled: true, name: '«LoreFrame»拟界文库（GitHub 版）',
  id: '6b672dad-77b5-4ef8-9172-fa2819afccf5', content: loader,
  info: `v${release.version}；使用本地缓存启动，后台检查更新，下次重载生效。与旧版只启用一个。`,
  button: { enabled: true, buttons: [] }, data: {},
}, null, 2) + '\n');
console.info('GitHub 加载器与导入 JSON 已生成。');
