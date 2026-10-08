import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'src/util/酒馆助手脚本/线上功能脚本');
const release = JSON.parse(await readFile(path.join(source, 'release.json'), 'utf8'));
if (release.slug !== 'loreframe' || !/^1\.7\.(0|[1-9]\d*)$/.test(release.version)) {
  throw new Error('拟界文库发布号必须为 1.7.X；调整版本系列时需同步更新发布规则。');
}
const tag = `${release.slug}-v${release.version}`;
const filename = `${release.slug}-${release.version}.js`;
const bundle = await readFile(path.join(root, 'dist/util/酒馆助手脚本/线上功能脚本/index.js'));
const output = path.join(root, 'release', tag);
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
