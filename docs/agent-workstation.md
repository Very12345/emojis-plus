# 制作过程、Agent API 与学校角色

## 制作过程

意图生成会显示任务创建、意图分析、模型响应接收、构图与素材选择、方案校验、逐候选渲染，以及完成、失败和取消。流式接口显示实际接收字符数；普通 JSON 响应接口在完整结果返回后显示已校验的分析与推荐理由。接口拒绝流式请求时可重试一次普通 JSON 请求。

显示的是公开的简短推荐理由、可核对的制作阶段和真实渲染进度，不显示模型内部推理字段。相同阶段的字符数与渲染百分比更新会合并，保持过程列表清楚；最初的任务时间保留，耗时不会因日志截断而重置。

渲染失败、取消或模型接口失败会保留输入和当前作品。选择“取消本次制作”会停止模型请求或待执行渲染。

## Agent 接入

普通工作台继续运行在静态网页中。外部 Agent 接入时，在本机额外启动 Skill 内的 Node 通信桥，由浏览器主动连接。通信桥提供局域网 HTTP API，图像合成和模型请求由浏览器完成。通信桥不需要 Python、图像库或模型密钥；随包 Python 客户端是可选工具，其他 Agent 可直接调用 HTTP。

1. 在工作台顶部下载 [Agent Skill ZIP](https://very12345.github.io/emojis-plus/integrations/emojis-plus-agent.zip)，解压得到 `emojis-plus-agent` 文件夹。
2. 放入 Agent 的技能目录。Codex 可放到 `~/.codex/skills/emojis-plus-agent`；其他产品使用其支持的技能目录，或直接参考包内 HTTP 文档。
3. 从 Skill 根目录运行 `node scripts/bridge.mjs --lan --show-pairing`。只在同一台电脑使用时可以省略 `--lan`。
4. 打开输出的配对链接，或在网页“Agent 接入”中输入通信桥地址和配对码，点击连接。同机使用 `http://127.0.0.1:8766`；跨设备使用输出的局域网地址。浏览器首次访问本地网络时可能需要允许相应权限。
5. 保持工作台页面连接。Agent 使用 CLI 或 HTTP 提交任务、观察进度并下载文件。刷新或关闭页面后需要重新连接；配对码在通信桥重启时更新。

默认本机连接文件为 `~/.emojis-plus/bridge.json`，包含 URL、配对码、进程 ID 和可用局域网 URL。CLI 自动读取此文件；另一台电脑可以使用 `EP_BRIDGE_URL`、`EP_BRIDGE_TOKEN`，或 CLI 的 `--url`、`--token` 指定连接。不要把运行时连接文件加入项目源码或 Skill ZIP。

页面支持多个已连接工作台。仅有一个在线浏览器时可省略浏览器 ID；多个浏览器时必须指定 `browser_id`，避免任务落到任意标签页。素材或模型配置发生变化后，重新连接可刷新对外目录与能力信息。

Agent 完成后默认先保存当前项目，再自动打开第一份成品继续编辑；其余候选也保存到“我的项目”。可在 Agent 接入面板关闭自动打开。连接在浏览器中持久保存、自动重连，同来源多个标签页共享一条通信连接，并同步成品。详见 [项目与连接说明](projects-and-sync.md)。

## 两种使用方式

**由 Agent 自行规划，浏览器渲染：**先读取当前素材、构图和动效目录，再调用 `compose`，或编辑已返回的完整方案后调用 `render`。这个路径无需再次调用网页的模型接口。

```bash
python scripts/client.py catalog --kind assets --character 北京大学
python scripts/client.py compose --asset pku-scholar-cat-think --composition deadline-story --person thu-book-spirit-tired --text "提交失败" --secondary "最后再改一行" --format gif --motion spin --wait --output ./memes
```

**由浏览器模型推荐：**调用 `generate`，使用该浏览器已保存的模型设置，返回三个候选。

```bash
python scripts/client.py generate "作业写完了却没交上" --format gif --wait --output ./memes
```

`status <id>` 查询，`status <id> --wait --output ./memes` 等待并下载，`cancel <id>` 取消。CLI 不覆盖已有图片，结果 JSON 同时保存。多个工作台时，将全局参数 `--browser <id>` 放在子命令之前。

完整端点、JSON 参数、结果、缓存与错误说明见 [API 文档](../integrations/emojis-plus-agent/references/api.md)。Codex、WorkBuddy 或其他支持 HTTP 的 Agent 使用同一接口；本轮没有依赖某一家 Agent 的私有 SDK。

## 个人动作修复

新增主角独立 `primary_motion`，与原有共享 `effect/effects` 分开。同框人物继续使用自己的 `effect/strength/speed`。画布选中人物后或右侧“主角·个人动作”中均可配置；选择个人动作会切到 GIF。

主题叙事、模板动作、共享动效和个人动作各自保留。个人动作只作用于选中人物，绑定道具随该人物的完整变换移动。与共享动效同名时使用个人参数执行一次。文字逐字出现和复制阵列仍属于共享效果，个人动作菜单只显示适用的身体动作。

## 两校素材

新增 31 张透明 PNG：北大 15 张，清华 16 张；北大原有 7 张继续保留，因此北京大学共 22 张、清华大学共 16 张，素材总数 805。新造型有团子、学士猫、书本精灵、徽章机器人、校园门楼，每类包含庆祝、疲惫和思考三种状态；清华另有完整校徽头像。

两校角色默认封面改用新学士猫，已有选择和旧 ID 保持兼容。校徽含文字，素材不允许镜像。新增人物属于本项目拟人化二创，并非学校官方吉祥物。

- 清华校徽来自 [清华大学视觉形象识别系统](https://vi.tsinghua.edu.cn/gk/xxbz/xh/bzjbzsy.htm)，原图保存于 `assets/emblem/tsinghua-official-source.jpg`，仅裁去校徽外部留白并保持完整比例。
- 北大校徽沿用 [北京大学标识管理办公室下载资源](https://vim.pku.edu.cn/xzzq/)。
- SVG 母版与来源记录在 `assets/school-characters`，工作素材及标注在 `assets/seed/school-characters-catalog.json`。
- [两校形象联系表](https://very12345.github.io/emojis-plus/previews/school-characters-contact.jpg)。

学校人物只在用户明确选择或相关学校语境中进入 AI 候选。普通情绪不会自动加入北京大学或清华大学。

## 验收范围

已用独立 Python 客户端向真实浏览器提交双人构图，成功下载 256px、40 帧、4 秒的 GIF；同时检查主角个人旋转和配角、绑定道具的关系，首轮版本的手动画布保持不变；当前版本改为先保存旧项目，再自动打开 Agent 成品。使用无密钥本机 SSE 测试接口验证接收进度、短理由、三个候选、API 下载和取消；没有使用该测试接口宣称真实模型的推荐质量。

通信桥测试覆盖配对鉴权、跨来源拒绝、多浏览器显式选择、进度、成品下载、取消及无连接错误。本机局域网地址返回 HTTP 200；未以第二台物理设备进行网络验证，跨设备还取决于本地端口可达性及浏览器权限。AI 配置不在目录、结果或 Skill ZIP 中。

来源与过程验收汇总见 [agent-verification.json](agent-verification.json)。发布继续使用现有 GitHub Pages 工作流；本机通信桥是用户按需运行的独立进程。
