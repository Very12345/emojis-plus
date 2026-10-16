# Emojis Plus · 表情实验室

在本机运行的中文表情工作台：一句话选择素材、生成三种语气，轻量编辑后导出 JPG / GIF。

## 启动

Windows 双击 **start.cmd**。启动器会检查依赖、按需构建前端，随后在后台启动服务并打开浏览器。

访问 http://127.0.0.1:8000 。首次打开设置共享访问口令（至少 6 字符）及独立管理员口令（至少 10 字符）。默认仅本机可以访问。已有口令不会因重启丢失。

- 需要 Python 3.11+、Node.js 22+；当前机器的 Python 和 Node.js 已通过检查。
- 首次缺少 Python 依赖时，启动器会创建 .venv 并安装 requirements.txt；前端缺少依赖时执行 npm ci，需要网络。
- 双击 **stop.cmd** 停止由启动器启动的后台服务。它核验本项目脚本路径后再停止进程。
- 更换端口：python scripts/launcher.py --port 8010
- 强制重新构建：python scripts/launcher.py --rebuild
- 服务日志：data/server.log、data/server-error.log

也可以在终端前台运行 python scripts/serve.py --port 8000，按 Ctrl+C 停止。

## 使用

1. 在“先说说你的意思”输入使用场景，选择 JPG/GIF，点击“帮我做个表情”。
2. AI 返回直白、可爱、抽象三个候选。没有配置模型时会明确提示，手动制作始终可用。
3. 在右侧先选“主体角色”，再选“角色状态”；可直接跨角色切换，保留文案、字体、配色及兼容版式。随后修改文案、模板、字号、颜色、尺寸及动效，稍候查看真实渲染结果。
4. 预览更新完成后点击“下载表情”。预览与下载使用同一个文件。

### 文案与模板库

顶部“文案与模板”提供 **80 条常用文案、38 种可修改组合**。文案按校园、考试作业、写码科研、聊天、休息、开心感谢、抽象和招呼安慰分类；可搜索、收藏，点击“用这句话”填入工作台。双句会自动切换适用版式。
组合模板带好素材、文案、字体、背景和动效，点击“套用这个组合”即可预览与修改。手动套用无需模型接口。
文字新增从右至左竖排、错落跳字，以及印章字、阴影字。

“基础版式”单独列出全部 19 种版式。编辑区、版式库和管理区都使用同一服务端渲染器生成真实样例缩略图，样例使用当前角色；不再使用抽象图标代表模板。编辑器也保持完整列表：原图不能直接用于花瓣组合时，会标注“使用本角色抠图”，点击后优先切换到该原图对应的透明版；没有适配版本时显示原因。既有组合 ID 保留，另补牛来、肥嘟嘟、小鲨鱼、八条等角色的专属组合。

### 角色总览与抠图

素材库先按角色列出素材总数、抠图数、GIF 数。切换角色会清除上一角色的格式与搜索筛选；“全部角色”按角色交错展示，避免奶蛙数量多而淹没其他角色。
透明主体明确标“透明抠图”，带字底图标“原图带字”。有派生关系的卡片可直接切换原图/抠图，完整来源和加工说明保留在卡片中。
牛来有网站现成的透明 PNG；猫耳修女、毛毛虫、肥嘟嘟、八条、小鲨鱼、奶蛋等提供 ImageGen 背景提取派生版。原始文件独立保留，AI 加工版不作为作者提供的原生透明图。加工提示与路径记录见 assets/cutout-repair-prompts.json，派生清单在 assets/seed/processed-catalog.json。
Meowl、八条、肥嘟嘟、小鲨鱼另外补充不同姿态的透明版，记录在 assets/cutout-extra-prompts.json、assets/seed/processed-extra-catalog.json。当前内置 87 份素材、29 张透明主体；每个角色都有透明版本。

| 角色 | 素材数（含原图与透明版） | 透明主体 |
| --- | ---: | ---: |
| Meowl | 11 | 3 |
| 奶蛙 | 26 | 2 |
| 牛来 | 13 | 12 |
| 肥嘟嘟 | 10 | 3 |
| 小鲨鱼 | 10 | 3 |
| 呆猫八条 | 10 | 3 |
| 猫耳修女 | 2 | 1 |
| 毛毛虫 | 2 | 1 |
| 奶蛋 | 3 | 1 |

运行 python scripts/audit_assets.py 检查内置清单、派生关联和实际 alpha，结果写入 examples/library-audit.json。

素材库可按角色、关键词筛选，也可只看透明主体或原生 GIF。新增 **24 份现成奶蛙素材（12 静图、12 GIF）及 2 张奶蛋**，均保留原文件与具体来源，联网下载后本地使用。索引来源 [奶-hub](https://nai-hub.com/)，文件来自其 GitHub 固定版本；清单在 assets/seed/naiwa-web-catalog.json，原文件哈希、贡献者及下载地址记录在 assets/seed/web-sources.json。

素材库现有 9 个角色、真实 Meowl 与奶蛙动图，以及 Meowl、奶蛙的透明主体。原图保留，透明派生与原图分开选择。
这两张透明主体由 ImageGen 参考原图生成，属于 AI 加工变体，并非精确像素分割，记录见 assets/processing.md。
背景可独立设置纯色、渐变、横线纸、放射光芒，也可导入背景图片；已有背景的原图不会自动变透明。
十九种模板包括顶部、底部、双行、白边、角色开花、复制阵列、角色发言、大字海报、左图右字、拍立得、气泡心声、双人对话、聚光舞台、漫画双格、电影字幕、心情便签、脑内弹窗、角色入场券、圆形徽章。开花模板要求真实透明主体。
配字可放图外或嵌入画面，字体支持标准、粗黑、描边、立体贴纸、站酷快乐体、印章和阴影；可用横排、竖排、错落跳字，字号、位置、旋转、缩放均可调整。
带字原图不擦除，未标注安全区域时只允许图外配字。可由管理员标注安全区域，再使用嵌入文字。
北大校徽可作为发言头像、拟人角色头部、学校象征或角标。“学校有话说”预设对应“北京大学 / 我做的局”对话表情。
AI 仅在明确抱怨北大/默认校园，或用户明确要求北大象征表达时建议校徽；用户可手动选择和移除。
GIF 支持抖动、呼吸、弹跳、逐字、上下伸缩、摇摆旋转、移动、复制波浪，并可叠加动效、调整速度和强度；静态转动图为两秒循环。
原有 GIF 保留帧时长和循环设置，导出最多使用前六秒。

## 管理

点击右上角设置图标，使用管理员口令进入。

- **模型接口**：配置 OpenAI 兼容 Chat Completions 的 base URL、模型名、API 密钥。
  base URL 通常以 /v1 结束；也可填写完整 /chat/completions 地址。
  默认 JSON 模式；支持严格 schema 的服务可选择 JSON Schema；基础接口可选择文本 JSON。
  未修改密钥时留空保留。服务端不向浏览器返回已保存密钥。
- **素材管理**：导入 PNG/JPG/WebP/GIF，分别标为主体、背景、象征道具；填写透明主体、派生原图 ID、情绪、动作、场景、来源、已有文字、安全区域和模板适配。可停用或“保存并预览”。
- **排版模板**：启停、改名；至少保留一个启用模板。

也可复制 .env.example 为 .env 配置模型及口令。环境口令应同时填写 ACCESS_CODE 和 ADMIN_CODE，
否则均留空，通过首次设置页面配置。更改 .env 后重新启动。管理员页面的模型配置优先于环境配置。

## 数据与实现

- React + TypeScript + Vite；FastAPI + Pydantic + Pillow；SQLite。
- assets/seed/catalog.json 和 assets/seed/*-catalog.json 是素材清单；新增 ID 在启动时增量导入 data/originals，保留已有标注和启停状态。
- assets/fonts 附带七款实际字体：Noto 黑体、Noto 宋体、站酷快乐体、站酷小薇、站酷黄油体、马善政楷书、龙藏草书及各自 OFL。字体来源、SHA256 和样例缺字检查记录在 assets/fonts/additional-font-sources.json。字库与加粗、描边、贴纸、印章、阴影效果独立设置。
- assets/emblem.json 指向从北京大学官方标识下载区取得的圆形校徽。
- data/emojis.sqlite3 保存标注、会话、任务、配置；data/generated 保存生成结果。
- 每个浏览器会话拥有自己的作品，生成文件保存 24 小时，每十分钟清理一次。素材长期保留。
- 渲染使用独立进程池，默认两进程；模型最多同时调用两个，每个请求最多调用两次。
- 主体、背景、文字和校徽角色由 Pillow 分层合成，最终预览与下载共用同一渲染结果；手动调整不调用模型。
- 组合模板缩略图也使用同一渲染器，在 data/preset-previews 按方案及素材标注缓存；管理员变更素材标注后重新生成。
- examples/creative-preview.jpg 展示六种组合；运行 python scripts/creative_examples.py 可重新生成样例。
- examples/content-preview.jpg 展示扩充后的版式；运行 python scripts/content_examples.py 可重新生成。
- 本地 API 文档：http://127.0.0.1:8000/docs

## 开发与检查

安装依赖：npm ci；python -m pip install -r requirements.txt

前端开发：npm run dev（Vite 将 /api 转发至 127.0.0.1:8000）。
后端开发：python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
构建：npm run build
测试：python -m pytest -q（如缺少 pytest，安装 requirements-dev.txt）

tests 覆盖真实图片解码、中文英文换行、尺寸比例、透明派生、八种动效与叠加、组合模板、艺术字体、独立背景、原 GIF 帧时长/循环、
六秒上限、缺字、损坏素材、会话隔离、权限、密钥隐藏、模型接口契约、最多一次重试和校徽语境。
测试使用临时数据目录，不读写正式 data。

## 推荐质量验收

evals/cases.json 提供 30 条校内和日常意图。配置真实模型后运行：

python scripts/evaluate.py

脚本交互读取访问口令，不放入命令行。结果保存至 data/evals，逐条记录候选和文件地址；
人工检查三个候选中是否至少一项贴切，将 human_pass 填为 true/false，再运行：

python scripts/evaluate.py --score data/evals/对应结果.json

统计必须在 30 条全部完成人工评分后才判定是否达到 80%。未配置真实模型时，不将模拟接口测试视为推荐质量达标。

## 素材记录

用户给出的猫耳修女记录作者“可爱大笨蛋”及校内计算机手册/信息科学背景；毛毛虫按用户指定的原创素材分类。
这些来源说明明确保留“用户提供”。其他素材保留公开资源链接及未独立核实的部分。
来源标签用来维护素材背景，不自动推断许可、作者或首发信息。

新模板与字体示例：examples/layout-previews.jpg、examples/font-family-previews.jpg；运行 python scripts/visual_template_examples.py 可重新生成。
前端素材选择与版式逻辑检查：node --experimental-strip-types --test tests/library.test.mjs。

## 场景与多角色

编辑区「场景背景」提供 10 张独立背景，包含 7 张牛来同人游戏场景及教室、书架走廊、岩洞实拍。牛来同人场景明确记录为第三方 AI 美术，不当作电影原帧；来源和加工说明保留在素材卡片中。

点击「添加同框角色」最多放入六个角色。主角和各同框角色可分别调整位置、大小；额外角色可旋转、翻转、调整透明度、排序并设置独立动效。使用透明素材可避免原图背景互相遮挡。场景合影模板在底部配字，也允许留空文字。多角色 JPG 和 GIF 使用与预览相同的服务端渲染结果，原生动画分别按各自帧时长采样，最长六秒。

素材库分为「角色素材」「场景背景」，百张级集合按每页 48 张浏览，并区分原始素材数与派生文件数。

## 批量获取与程序抠图

可选的批量处理程序见 `scripts/batch_cutout.py`，独立依赖在 `requirements-cutout.txt`，完整命令及审核规则见 `assets/programmatic-cutout-pipeline.md`。程序保留原图，支持来源追踪、哈希去重、断点续跑、rembg 主体分割及简单背景连通域去底；已有透明图片直接保留 alpha。新生成遮罩默认停用，人工确认完整后再启用，避免批量误抠进入推荐。种子清单中的 `enabled:false` 会被导入器保留。

2026-10-15 本机已导入 192 个素材文件，其中背景 10 张；牛来 101 份原始素材/动作状态、105 个文件（含派生），其中 97 个文件有真实透明通道。牛来百条批次包含网站表情、同人桌宠精灵图的不同动作帧和公开视频截图，数量不代表 100 个独立下载来源。来源、视频时间点、动作格坐标与去重信息见 `assets/seed/bulk-cow-sources.json`。可通过 `python scripts/acquire_cow_assets.py` 获取缓存原图，`--finalize` 按已完成的人工标注产生导入清单。实际程序抠图报告见 `examples/niulai-program-cutout-catalog.report.json`；7 张审核通过的新增透明图记录在 `assets/programmatic-approved-records.json`，其余有字幕残留的派生图不进入启用库。

同日第二轮扩充后，当前启用 **742 个素材文件**（含 10 张背景），角色分组如下。原始数量不含抠图派生副本，包含公开原图、原动画、同人场景及实际不同的动画状态；不等于独立作者或独立来源数量。

| 角色 | 原始素材/状态 | 库文件（含派生） | 透明文件 | 原动画 |
| --- | ---: | ---: | ---: | ---: |
| 奶蛙 | 243 | 311 | 71 | 103 |
| 奶龙（原版） | 37 | 37 | 23 | 23 |
| 奶蛋 | 56 | 81 | 36 | 1 |
| 肥嘟嘟 | 110 | 161 | 51 | 0 |

原版奶龙按《小七和奶龙》的大圆头、粗短黄爪及尾巴核对，与小头巨腹的奶蛙分开。名为 nailong 的第三方图库实际大多是奶蛙，已纠正角色标签，7 个身份不明候选停用；文件 ID 仍保留历史前缀。原版奶龙与奶蛋目前未达百张，没有混入别的角色或用简单形变凑数。各组来源、标注与复核见 `assets/nailong-original-notes.md`、`assets/bulk-nailong-notes.md`、`assets/naidan-acquisition.md`、`assets/seed/bulk-naiwa-sources.json`、`assets/seed/bulk-feidudu-sources.json`；审核汇总运行 `python scripts/audit_assets.py`，生成 `examples/library-audit.json`。

模型在超过120张候选时，按输入语义先筛选并为各角色保留名额，然后从精简清单中选择方案；手动素材库仍可使用全部启用素材。角色选项与素材卡片优先列出奶蛙、奶龙（原版）、奶蛋、肥嘟嘟，四组独立切换。

## JSON 模板、动作与注册接口

内置定义位于 `assets/registry/`：`templates.json` 保存26个模板的布局引用、默认样式、样例和内置动作；`effects.json` 保存9个动效及算法映射；`presets.json` 保存48个组合；`captions.json` 保存80条文案；`layouts.json` 用于自定义几何排版。全部使用 `schema_version: 1`。

角色开花默认包含 `spin` 整体旋转，默认 GIF 两秒一圈，配字层保持静止。模板内的 `motions` 可以作用于 `subject`（复制/排版前的角色）或 `composition`（组合后的主体图层），与用户另外选择的动效独立。工作台可关闭模板动作、调整速度，或选择 JPG 固定在起始姿态。转圈按完整循环安排时长，导出仍最多六秒；过慢速度受六秒上限约束。

例如，新增一个使用现有花瓣排版的模板：

```json
{
  "schema_version": 1,
  "templates": [{
    "id": "my-flower",
    "name": "我的旋转花环",
    "layout_id": "flower",
    "requires_transparency": true,
    "defaults": {"format": "gif", "size": 256, "font_style": "plain", "font_size": 32},
    "sample": {"text": "今天也要开心"},
    "motions": [{"effect_id": "spin", "target": "composition", "strength": 1, "speed": 1}]
  }]
}
```

`examples/registry-extension.json` 另提供完整示例，包含新排版、慢转动效、模板及组合预设。自定义排版的 `image` 与 `captions[].x/y/width/height` 均为0至1的归一化矩形，区域必须在画布内；文字字段为 `text` 或 `secondary_text`；`subject_mode` 可为 `single`、`flower` 或 `grid`。自定义模板继承其基础排版的素材适配规则，花瓣类仍要求真实透明主体。

管理员可在「管理空间 → JSON 注册」读取文件、编辑、校验并注册，也可导出完整定义。新增默认拒绝重复 ID；勾选允许更新时只替换包内列出的 ID，其余定义保留。定义持久保存到当前数据目录的 `registry/catalog.json`，不覆盖随项目发布的内置文件。通过校验后才原子替换文件；API与渲染任务池通过不可变定义快照协作，JSON 注册无需重启，已生成成品保持原文件。

| 接口 | 用途 |
| --- | --- |
| `GET /api/templates`、`GET /api/effects` | 获取启用定义，包括模板默认动作 |
| `GET /api/registry/schema` | 获取完整 JSON Schema |
| `GET /api/admin/registry`、`GET /api/admin/registry/export` | 查看、下载合并后的注册表 |
| `POST /api/admin/registry/validate` | 仅校验，支持 `?replace=true` |
| `POST /api/admin/registry` | 批量新增；显式 `?replace=true` 更新 |
| `PUT /api/admin/registry` | 批量更新指定 ID |
| `POST /api/admin/templates`、`effects`、`layouts`、`presets`、`captions` | 按类型注册单项定义 |

所有写接口要求管理员会话。Python 可调用 `backend.registry.register_template`、`register_effect`、`register_layout`、`register_preset` 或 `register_bundle`。本地命令 `python scripts/register_content.py examples/registry-extension.json --check` 只校验；去掉 `--check` 后注册；`--replace` 显式更新已有 ID。

JSON只引用已注册算法，不执行代码。开发者新增运动算法可在 `backend/motion_plugins.py` 中调用 `layers.register_motion_handler(name, callback)`；回调参数为 `(time, strength, phase, direction)`，返回 `sx/sy/angle/dx/dy` 的数值字典，缩放和位移有边界校验。Python插件在API及Windows渲染子进程中共同加载，修改Python算法后需要重启服务。

默认排字采用适中字重，字距为字号的6%、行距1.45倍；加粗不再重复叠加重描边。自动换行会平衡短句末行，保留手动换行。`text_backdrop: "auto"` 在文字区对比不足时增加衬底，也支持手动选择关闭、浅色或深色。工作台「字距、行距与文字衬底」可继续调整。运行 `python scripts/visual_registry_examples.py` 可重新生成全部默认版式与组合的阅读性联系表。

## 普通人物与多人物模板

北京大学现为人物库中的普通角色，与奶蛙、牛来等使用相同的选角、状态、站位和动效功能。提供张开双臂、摊手、挥手、托腮、庆祝、坐着疲惫六个透明姿势，以及完整校徽头像。角色源文件由 `scripts/prepare_pku_characters.py` 等比例合成官方完整校徽与程序绘制肢体；明确标为项目拟人化二创，并非官方角色。来源保留在 `assets/seed/pku-characters-catalog.json`，校徽字形不做镜像。

工作台在「待添加人物」选择北京大学或其他角色后，点击「添加同框角色」。人数按钮支持1至6人，增减人物自动安排站位；也可以逐人调整素材、位置、大小、旋转、透明度和动效。增减人数保留当前文案、字体、配色；换场景背景保留当前多人物模板。界面已统一为普通人物选择，原来的独立校徽开关不再显示；旧 `emblem` 发言/拟人方案会在重新制作及旧组合解析时迁移到对应普通人物，角标旧数据仍兼容。

新增六种 JSON 模板：`cast-duo` 双人同框、`cast-chat` 双人接话、`cast-trio` 三人合影、`cast-quad` 四人开会、`cast-six` 六人群像、`cast-dance` 全员摇摆。双人接话使用两个独立文字区；全员摇摆自带轻晃和呼吸动作。另有八个多人物组合，包含北大与奶蛙对话、北大与牛来接话、四人会谈及六人合影。

模板的 `cast` 保存人物站位（第一项为主角），并用 `min_characters/max_characters` 指定人数范围；组合预设的 `selector` 选择主角，`cast` 依次选择其他人物。`examples/pku-cast-template.json` 是完整注册示例，模板不绑定人物，预设再指定北京大学与奶蛙。`layouts` 可配置多个文字区及 `panels` 衬底矩形，相关定义均包含在新版 JSON Schema 中。

`POST /api/templates/{id}/apply` 接受 `plan`、可选 `count`、`additional_asset_ids` 和 `apply_defaults`。该接口自动选取缺少的人物并应用 JSON 站位，返回可继续编辑的完整方案，不调用模型；不满足人数的直接渲染请求会明确报错。`apply_defaults:false` 用于只调整人数和站位、保留字体等设置。套用人数固定的模板会保留前N位已有角色并填补缺位。AI仅在输入明确提及北大或主动选择北京大学时提供这个人物；普通负面情绪不会自动加入。

本轮完成后，库内启用749个素材文件，模板26种、组合48种；北京大学新增7个透明人物文件。
# 动态模板工作站更新（2026-10-16）

当前内置 **98 个模板、192 个组合、80 条文案**。在工作台点击「查看全部版式」，或进入「文案与模板 → 基础版式」，先选一级玩法，再选二级分类；场景、格式、人数、当前素材适配和收藏可以组合筛选。每页24项，默认只加载静态代表帧；悬停、键盘聚焦或点击播放按钮才生成动态样例。

新增72个动态模板，分为单人反应、出入画面、分身阵列、道具氛围、双人互动、多人互动，每类12个、三个二级分类。模板动作支持开关、速度、强度和适用的方向、复制数、道具颜色；额外动效独立管理。「用当前角色试试」保留文案、字体和配色；「套用完整样例」使用完整组合。JPG导出代表帧，GIF默认256像素、每秒10帧、最长6秒。

可爱大笨蛋（内部角色名仍为「猫耳修女」）与毛毛虫各新增24张独立生成的透明素材；原角色参考信息与AI派生署名分别保留。审核后的512像素素材位于 `assets/seed/generated-originals/`，高分辨率母版在其 `masters/` 子目录，每张图的提示词、参考与审核记录在 `records/`。联系表见 `examples/generated-nun-contact.jpg` 和 `examples/generated-worm-contact.jpg`。新图使用内置ImageGen生成，并非原作者亲绘。

`assets/curation.json` 记录23张归档原图及透明替代项，包括用户指定的修女、毛毛虫、小鲨鱼截图。普通素材库与推荐不再显示这些原图，来源文件和派生链保留；有独立意义的面壁墙角、场景和原始动图继续保留。管理员在素材管理页可查看归档原因。

文字使用共同字体基线，修复逗号、“一”和英文下伸字符错位；自动换行、描边、阴影、竖排及逐字出现使用统一测量。渲染前预处理静态主体，复用字体、文字测量和同任务的文字图层。编辑预览只保留最新待执行版本；后台缩略图最多占用一个渲染进程。

接口增加：

- `GET /api/template-categories`：带数量的二级分类树。
- 模板及组合缩略图支持 `format=jpg|gif`，默认JPG；`v` 为预览版本，返回私有浏览器缓存。
- `POST /api/renders?purpose=preview&editor_id=...&revision=...`：同一会话、编辑标签页仅保留最新版本；原请求格式继续兼容。
- `GET /api/admin/curation`：管理员查看归档清单。

JSON模板新增 `category_id`、`subcategory_id`、`tags`、`animation`。动画可指定已注册算法、时长、代表帧、逐人物关键帧、道具和可调参数；不能执行代码。分类注册数据位于 `assets/registry/categories.json`。可独立导入的六类注册包在 `examples/registry-packs/`，更新内置定义时显式使用 `--replace`：

```powershell
python scripts/register_content.py examples/registry-packs/props.json --check --replace
```

验证与报告：`python scripts/audit_dynamic_release.py` 导出全部192个组合（336份JPG/GIF），结果和动作分帧图保存在 `examples/dynamic-release/`。性能报告为 `examples/preview-performance.json`；复测脚本 `scripts/benchmark_previews.py` 仅针对隔离QA服务localhost:8017，访问口令由环境变量 `PREVIEW_ACCESS_CODE` 传入。正常使用仍然双击 `start.cmd`，访问 http://127.0.0.1:8000/。

