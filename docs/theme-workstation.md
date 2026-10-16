# 主题构图工作站

工作台预览下方的「主题构图」提供 16 个场景、48 组完整构图。已有 98 个模板和 192 个组合保持独立。每个构图都预制 JPG 和四秒 GIF；卡片默认显示 JPG，悬停、聚焦或按播放按钮才请求 GIF，离开视口或停止播放会取消未完成请求。

## 使用

- 用当前内容搭配：保留人物身份、人数、文案、字体、独立文字及用户道具，重排主题站位，替换主题生成的道具。非透明图片优先选择同角色透明版，没有适配素材时保留编辑状态并提示。
- 完整样例：替换人物、文案和主题配色；场景与角色表情根据主题选择，仍可继续编辑。
- 场景与叙事设置：调明暗、虚化、色调、细节、接触阴影、速度、反应强度、事件文字和循环方式。关闭叙事后保留完整构图。
- 画布工具栏「添加道具」支持 15 类道具。选中道具可绑定人物或场景、绑定文案、调整颜色、显示阶段、层次、隐藏或锁定。人物被移除时，其道具脱离绑定并移到场景中央；不会错误绑定到补位人物。
- 每段文字可独立设置字库、字号、效果、底板、字距、行距和关键词强调。默认固定字号，显式换行不会自动缩字。位置不足会提示错误，用户可主动开启自动缩字。
- 叙事默认 4 秒：0—25% 铺垫，25—60% 事件，60—100% 反应。淡入回切使用末段向起始完整场景过渡；直接回切保留有意的叙事跳切。JPG 使用 85% 代表帧。

## 数据及扩展

`assets/registry/themes.json`、`props.json`、`compositions.json` 是注册源数据。执行 `node scripts/prepare-themes.mjs` 可从已编写的目录重新生成这三份文件；修改注册文件后直接构建也可生效。

注册包继续使用 `schema_version: 1`、512KB 限制及每集合最多 256 条，可分主题导入。新增集合采用受信任绘制算法和事件 ID，不执行注册数据中的代码。公共 JSON Schema 同步更新。所有插画场景、道具由本项目 Canvas 程序绘制，现有角色素材及来源记录沿用。

本地兼容分发新增 `GET /themes`、`GET /props`、`GET /compositions`、`POST /compositions/{id}/apply`；最后一个请求体为 `{plan, full}`。它们是浏览器内部调用，无需后端。`Plan` 增加可选 `composition`、`narrative`、`prop_layers`、`primary_actor_id`、`element_states`，同框人物有稳定 `id`。旧方案没有这些字段时保持旧渲染路径。

绑定位置以人物局部坐标记录，尺寸以人物最大边为单位。位置变换包含模板／额外动作、叙事动作和手动变换。分身默认绑定该人物的首个实体实例。场景道具采用画布归一化坐标。前景、人物、道具和文案共用渲染顺序，编辑与导出使用同一渲染器。

AI 一次返回三个受控构图：`direct`、`story`、`contrast`。字段包含素材 ID、构图 ID、最终文案、铺垫文案、事件文案、额外人物 ID 与推荐理由，布局由程序解析。素材按场景与情绪评分，并保持角色覆盖；主题样例和 AI 候选优先采用标注过的干净抠图，避免把仅含少量透明像素的场景 GIF 当作独立角色。原始 GIF 仍可手动使用。仍保留旧模板输出校验以兼容已有方案。密钥始终来自当前浏览器设置，未写入 JSON 或静态产物。

## 完整目录

| 主题 | 分类 | 三个构图 ID |
|---|---|---|
| 早八课堂 | 校园 | early-class-direct、early-class-story、early-class-contrast |
| 考场应试 | 校园 | exam-direct、exam-story、exam-contrast |
| 作业 DDL | 校园 | deadline-direct、deadline-story、deadline-contrast |
| 图书馆自习 | 校园 | library-direct、library-story、library-contrast |
| 宿舍熬夜 | 校园 | dorm-night-direct、dorm-night-story、dorm-night-contrast |
| 小组作业 | 校园 | groupwork-direct、groupwork-story、groupwork-contrast |
| 食堂排队 | 校园 | canteen-direct、canteen-story、canteen-contrast |
| 临时通知 | 校园 | notice-direct、notice-story、notice-contrast |
| 消息等待 | 日常 | waiting-direct、waiting-story、waiting-contrast |
| 开会打工 | 日常 | office-direct、office-story、office-contrast |
| 通勤赶路 | 日常 | commute-direct、commute-story、commute-contrast |
| 周末休息 | 日常 | weekend-direct、weekend-story、weekend-contrast |
| 庆祝成功 | 日常 | celebrate-direct、celebrate-story、celebrate-contrast |
| 安慰陪伴 | 日常 | comfort-direct、comfort-story、comfort-contrast |
| 围观吃瓜 | 日常 | spectator-direct、spectator-story、spectator-contrast |
| 社交尴尬 | 日常 | awkward-direct、awkward-story、awkward-contrast |

## 样例与验收

- [48 组联系表](https://very12345.github.io/emojis-plus/previews/theme-contact.jpg)
- [DDL 动态样例](https://very12345.github.io/emojis-plus/previews/composition-deadline-story.gif)
- [宿舍反差样例](https://very12345.github.io/emojis-plus/previews/composition-dorm-night-contrast.gif)
- 每组地址为 `previews/composition-{id}.jpg` 与 `.gif`；全库构建报告为 `previews/report.json`。
- `npm test` 包含 48 组实际 GIF、各阶段帧、七种字体、固定字号、独立样式、道具完整变换、锁定、同角色替换、删除脱离、多人 1/2/6 人、原始 GIF、非法引用与无关北大语境检查。旧 72 个动作算法也继续实际编码 GIF。
- 375px 手机宽度与桌面检查分类、套用、直接编辑和元素面板；手机文档宽度与视口同为 375px。
- 40 条输入位于 `docs/theme-evaluation-cases.json`。测试来源未配置 AI，真实模型 40 条人工认可率尚未验证，文件明确标为待评估；没有把模拟协议校验当作模型质量验收。

## 性能记录

结果见 `docs/theme-performance.json`。在本机 Windows / Chromium 155 中，通过 Vite 运行 `scripts/theme-benchmark.html`，调用真实浏览器 Worker；不读取 AI 配置，不调用模型。

| 项目 | 样本数 | 中位数 ms | P95 ms |
|---|---:|---:|---:|
| 主题 JPG 首次渲染 | 1 | 566.4 | 566.4 |
| 同会话旧 JPG 路径 | 1 | 84.8 | 84.8 |
| 主题 JPG 修改 | 10 | 19.8 | 29.8 |
| 普通 256 GIF，4 秒 | 5 | 684.6 | 696.6 |
| 缩略图线程首次合成 | 1 | 588.3 | 588.3 |
| 热渲染缓存读取 | 20 | 3.4 | 4.4 |
| 六人 256 GIF | 3 | 1199.9 | 1352.4 |
| 并发浏览时的 JPG 修改 | 3 | 25.3 | 81.1 |

冷渲染指新 Worker／解码缓存，不代表清空浏览器 HTTP 磁盘缓存。结果包含资源加载、Worker 排队和编码，不包含 300ms 输入防抖、AI 耗时或人工操作时间。单样本冷测量不足以估计总体 P95。旧路径是同构建的对照，不能作为历史版本速度提升比例。首次与最终采样的记录均保留，构图几何有调整，不能据此声称优化提升百分比。

## 发布

使用现有 GitHub Pages 工作流。`npm run build` 生成注册目录、338 张静态预览、48 张动态样例和联系表；`node scripts/verify-pages.mjs` 检查项目子路径、Worker、素材、字体、预览和私密文件排除；`npm test` 通过后触发部署。所有预览使用渲染版本查询参数避免旧预览缓存。
