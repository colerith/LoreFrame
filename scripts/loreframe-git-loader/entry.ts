import { loadLoreFrameGit } from './runtime';

// 去重范围限定为当前脚本 iframe，卸载后不会留下阻止重启的宿主标记。
const scope = window as Window & { __loreFrameGitLoading?: Promise<unknown> };
if (!scope.__loreFrameGitLoading) {
  scope.__loreFrameGitLoading = loadLoreFrameGit().catch(error => {
    delete scope.__loreFrameGitLoading;
    console.error('[拟界文库 Git] 加载失败', error);
    toastr.error(`拟界文库加载失败：${error instanceof Error ? error.message : String(error)}`);
  });
}
