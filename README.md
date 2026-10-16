# Emojis Plus · 纯前端版

React、TypeScript、Canvas 完成编辑与绘制，Web Worker 处理动画，gifuct-js 解码原生 GIF，gifenc 编码成品。JPG/GIF 预览和下载使用同一份浏览器生成文件。运行时不需要 Python、FastAPI、SQLite、登录服务或合成服务器。

保留 774 个精选素材、98 个模板（含72种独立动态动作）、192个组合、80条文案、7种中文字体。素材来源、字体许可与归档记录随静态包提供。角色和背景独立，多角色支持2—6人。

## 本机启动

Node.js 22+（本机验证为24）。Windows双击 **start.cmd**，访问 <http://127.0.0.1:8000/>。首次自动安装npm依赖并构建；之后启动也会更新构建。Node进程只发送`dist`静态文件，绘图在浏览器执行。

```powershell
npm ci
npm run build
npm run serve
```

- `stop.cmd`：核验本项目进程路径后停止静态服务，也可停止遗留Python服务。
- `start.cmd --port 8010`：后台使用其他端口。
- `npm run serve -- --port 8010`：前台运行，Ctrl+C停止。
- `npm run dev`：Vite开发，无API代理；先运行一次build准备素材和样例。
- 日志：`static-server.log`；进程记录：`.local-server.json`。

旧`backend/`、`data/`、`.env`和Python脚本保留作历史档案，**不会进入dist**。历史说明见[legacy-server.md](docs/legacy-server.md)。旧服务端模型密钥不会自动迁入网页，请在浏览器重新配置。

## AI与本地数据

右上角“浏览器设置”填写接口地址、模型名、API密钥和输出模式，支持Chat Completions兼容接口。地址例：`https://example.com/v1`；无鉴权本机模型可留空密钥。

- 配置保存在**当前来源、当前浏览器的localStorage**；其他人各自填写。“清除密钥”可移除保存值。共享页面、JSON导出和构建包不包含这份配置。
- 请求由浏览器直接发送到所填服务。服务须允许页面来源、Authorization和Content-Type的CORS请求；HTTPS Pages应使用HTTPS接口。本项目没有转发代理。
- AI只收到意图文字与精简素材/模板标注，不上传素材图片。服务商可能按自身规则保存请求。
- 未配置模型、超时、CORS失败或无效方案时，手动编辑和下载仍可用。无效返回最多重试一次，错误不清空输入。
- 导入图片/GIF、标注和模板注册保存到IndexedDB，仅当前浏览器有效。清理网站数据会移除这些修改。收藏与意图也仅本地保存。
- 成品是内存Blob，关闭页面可能失效，请及时下载；没有24小时作品服务器。

## 静态部署 / GitHub Pages

完整上传`npm run build`生成的`dist/`即可。相对路径`base: './'`已通过`/emojis-plus/`子目录测试，字体、Worker和素材均适配仓库型Pages路径。不要直接双击index.html，Worker和字体加载需要HTTP(S)。

提供`.github/workflows/pages.yml`，只允许手动`workflow_dispatch`。将项目及`assets/seed`、`assets/registry`、`assets/fonts`提交到自己的仓库，Settings → Pages选择GitHub Actions，再手动运行工作流。只上传dist，不需要模型密钥或应用服务器。本次未创建仓库或发布网页。参见[GitHub官方工作流说明](https://docs.github.com/zh/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

页面有`noindex,nofollow,noarchive`和robots.txt，不附公开介绍页。这些只用于减少搜索发现，**不是访问控制**；知晓URL的人仍可访问静态文件。

资源包约249MiB，主要是128份原始GIF。首页不下载整包：卡片使用774张WebP封面，字体按选择加载，默认静态样例，播放时才生成GIF。首次加载字库和所选GIF会比缓存命中慢。

## 扩展

- `scripts/prepare-static.mjs`：Node构建资源，执行归档规则，保留来源链，优化静态图、转换WOFF2，输出字形覆盖区间与文件校验报告。增量重建跳过不变文件。
- `scripts/prepare-previews.ts`：使用与网页相同的Canvas核心生成98张模板、192张组合样例。
- `src/render/core.ts`、`scene.ts`：共享文字基线、完整运动包络、72种动作。先计算整段边界再固定缩放，避免旋转和伸缩被中间画布截断；探头、出入场保留有意遮罩。
- `src/render/browser.ts`：GIF帧合成、透明区域联合裁切、有限解码缓存、共享调色板。默认256px、10fps，可选512px，最长6秒；超内存预算显示错误。
- `src/render/client.ts`：编辑、卡片各一个Worker，取消旧任务，列表不占用编辑队列。
- `src/local/`：本地目录、模板套用、IndexedDB、AI直连与校验。`api.ts`保留组件函数名，内部本地调度，不请求`/api`。

共享模板在`assets/registry/*.json`，修改后重新构建。浏览器JSON注册用于本地试验，只引用已实现算法，布局使用0—1坐标；可导出定义，不含AI配置。共享素材标注在`assets/seed/*-catalog.json`，归档在`assets/curation.json`。各资源权利信息见来源和许可记录。

## 验证

运行`npm test`、`npm run build`。覆盖七字体共享基线、字形效果/排版、完整动画边界、72种动作实际GIF编码、原生GIF帧处置、2/4/6人、AI非法返回与CORS错误。机器样例在`examples/browser-migration/`；页面验证和限制见[browser-migration.md](docs/browser-migration.md)。
