# GitHub Pages 部署验收

验收日期：2026-10-16。

- 正式网址：https://very12345.github.io/emojis-plus/
- 公开仓库：https://github.com/Very12345/emojis-plus
- 成功工作流：https://github.com/Very12345/emojis-plus/actions/runs/38839054964
- 首次部署代码：`8d6581692629dbda0ac40f2cdc7dd775bb64a651`。之后的提交补充说明文档，不改变已部署应用。

GitHub Actions 在 Ubuntu + Node24 干净环境完成 npm ci、资源构建、发布文件验证、14项回归测试和Pages部署。启用HTTPS，保持手动workflow_dispatch更新。

## 在线资源与操作

`node scripts/verify-pages.mjs --base=https://very12345.github.io/emojis-plus/`检查1859个正式地址全部成功，涵盖774个素材与各自封面、7种WOFF2字体及许可、98个模板样例、192个组合样例、页面/CSS/JavaScript和Worker，没有缺失文件或图片/脚本类型错误。发布包约253.5MiB。

正式站点浏览器实测：

- 七种字体逐一切换，字体样例加载和JPG渲染均成功。
- 多人分类下“接力蹦跳”卡片能播放，套用后在Worker生成四人GIF。
- 成品下载重新解码为256×256、40帧、4000ms、disposal2。
- 浏览器控制台无错误。
- 无密钥的临时模型名保存后刷新仍存在，确认设置持久化；随后还原空模型名。没有调用真实AI服务，也未填写或上传真实模型密钥。

AI设置仍使用浏览器localStorage，导入和注册使用IndexedDB。线上来源与localhost不同，首次使用需重新填写。模型服务须允许`https://very12345.github.io`的CORS请求。本次没有创建Actions模型密钥或把本机模型配置写入仓库。

## 提交范围

发布源文件由`scripts/github-source-files.mjs`白名单收集：前端、构建/验证脚本、精选素材实际依赖的文件、注册JSON和字库。排除backend、data、.env、个人成品、未精选截图、生图母版和参考拼图。构建产物再次检查没有凭据形态值或数据库/后端文件。

本机验收记录保存在忽略目录`.deployment/`：`remote-verification.json`、`download-verification.json`、`pages-live.png`和`pages-multiplayer.gif`。它们不会被普通Git提交上传。
