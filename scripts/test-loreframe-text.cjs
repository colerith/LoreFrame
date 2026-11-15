const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const base = 'src/util/酒馆助手脚本/拟界文库/';
const context = vm.createContext({ console, sanitizeMemoryText: String, escapeHtml: s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'), TEXT_THEATER_TEMPLATE: fs.readFileSync(base + 'text-theater-template.html', 'utf8') });
vm.runInContext(ts.transpileModule(fs.readFileSync(base + 'prompt-builder.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
for (const [source, expected] of [
 ['# **生成标题**\n正文', '生成标题'], ['## 前言\n# 主标题', '主标题'],
 ['<thinking># 假标题</thinking>\n# 真标题', '真标题'], ['标题：新的故事', '新的故事'],
 ['**开场标题**\n正文', '开场标题'], ['标题\n===\n正文', '标题'],
 ['```\n# 示例\n```\n# 正式标题', '正式标题'], ['正文', '旧名称'],
]) {
 const parsed = context.parseOnlineGenerationResult(source, 'text', '旧名称');
 assert.equal(parsed.title, expected);
 assert.ok(parsed.html.includes('<title>' + expected + '</title>'));
}
const source = '# 新标题\n- **负荷**：|| ⚠️ **99.8%**（严重超载） ||\n> 引用 ||*重点*||\n|| 外层 **粗体** ||内部重点|| 末尾 ||\n普通 **||强调||** 和 `||代码||`\n恶意 ||<img src=x onerror=alert(1)>||\n| 列一 | 列二 |\n| --- | --- |\n| ||**表格高亮**|| | 正文 |';
const dom = new JSDOM(context.parseOnlineGenerationResult(source, 'text', '旧名称').html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://loreframe.test' });
const doc = dom.window.document;
assert.equal(doc.querySelector('li .highlight-inline strong').textContent, '99.8%');
assert.equal(doc.querySelector('.quote-center .highlight-inline em').textContent, '重点');
assert.equal(doc.querySelector('.highlight-block .highlight-inline').textContent, '内部重点');
assert.equal(doc.querySelector('strong .highlight-inline').textContent, '强调');
assert.equal(doc.querySelector('code').textContent, '||代码||');
assert.equal(doc.querySelectorAll('#animated-content img').length, 0);
assert.equal(doc.querySelector('td .highlight-inline strong').textContent, '表格高亮');
assert.equal(doc.querySelectorAll('td').length, 2);
dom.window.close();
console.log('PASS generated titles, nested inline highlights, tables, code and escaping');
