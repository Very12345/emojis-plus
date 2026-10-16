---
name: emojis-plus-agent
description: Create and edit JPG/GIF memes through a connected Emojis Plus browser workbench using its local or LAN HTTP API. Use for choosing registered characters and themes, submitting meme intentions or explicit compositions, tracking progress, and downloading rendered files; it does not generate unrelated images or configure model credentials.
---

# Emojis Plus Agent

Use the browser workbench's renderer and curated library. The optional Node communication bridge only relays commands and completed images. Keep a browser workbench connected while running jobs.

## Connect

- The bridge uses Node.js 20+. The optional `scripts/client.py` helper uses Python 3.10+; an Agent can also call HTTP directly. No additional packages are required.
- Look for an existing bridge before starting another: `python scripts/client.py browsers`. The default connection file is `~/.emojis-plus/bridge.json`; `EP_BRIDGE_URL` and `EP_BRIDGE_TOKEN` or the CLI options can connect to another computer on the LAN.
- If no bridge is running, start `node scripts/bridge.mjs --lan --show-pairing` as a background process appropriate to the host. On Windows hide the background helper window. Keep its process alive until work is complete. Omit `--lan` for same-computer access only.
- Open the printed workbench pairing link, or enter the local bridge address and pairing code in the page's **Agent 接入** panel. Connect the intended browser using **连接通信桥**. If the browser requires an owner-only local-network permission interaction, let the owner handle that prompt. Do not disable browser security checks. A page can be opened from `https://very12345.github.io/emojis-plus/` or the user's local static workbench.
- A pairing code authenticates this local API. Do not publish it, embed it in generated works, or confuse it with an AI model key. The browser's AI settings are not accessible through this API.
- If more than one browser is connected, choose an explicit `--browser` ID instead of letting a job go to an arbitrary tab.

## Make a meme

Choose either route:

1. **Browser AI:** `python scripts/client.py generate "作业写完了却没交上" --format gif --wait --output ./memes`. This uses the AI interface configured in the connected browser. If the browser has no model configured, use explicit composition or ask the owner to configure it in the page; do not request model secrets in chat.
2. **Agent plans, browser renders:** inspect `catalog` first. For example, use `catalog --kind assets --character 北京大学`, `catalog --kind compositions --query 作业`, and `catalog --kind effects`. Then run `compose --asset <asset-id> --composition <composition-id> --text "提交失败" --secondary "最后再改一行" --format gif --motion shake --wait --output ./memes`.

Use only IDs returned by the current connected catalog. Preserve a requested character. School characters are selected when the user actually refers to that school or deliberately requests them. Prefer annotated cutouts for theme scenes. An explicit composition can include `--person <asset-id>` repeatedly for up to five additional people.

Check catalog capabilities for `presentations: ["chat", ...]` and `interactions: ["chase"]`. An old still-open tab can hold the shared renderer connection after deployment; save edits and refresh all workbench tabs if capabilities are missing. The Python client checks this before submitting a new chat/chase request, rather than silently receiving an older layout.

New `compose` requests default to chat presentation: tightly grouped characters, nearby captions, bold 56px design text (28px at 256 output), and zero extra letter spacing. Use `--presentation original` only for an intentional original layout. To portray pursuit, use `--interaction chase --chaser 1`: actor 0 is `--asset`, actor 1 is the first `--person`; `--chaser 1` means the supporting character chases the main character. For example, inspect the current IDs, then `compose --asset <crying-runner-id> --person <angry-chaser-id> --interaction chase --chaser 1 --text "别打了，我错了！" --format gif --wait --output ./memes`. Do not substitute two idle people for a requested interaction.

The output's `info.quality` reports small-preview text size and layout warnings. Inspect the actual image at a 128px chat size: the characters, action, and punchline should be recognizable immediately. If the report says subjects are small, text is thin/small, or captions are distant/occluding faces, adjust before delivering. The browser also shows the 128px preview and **一键紧凑排版**. Prefer 2–10 Chinese characters in the main punchline; omit unnecessary narration. Do not add unrelated environments just to fill empty space. Low-level `render` preserves the submitted plan and never silently reflows an existing manual edit.

To edit an existing result, modify its returned plan JSON and use `render <plan-file> --wait --output ./memes`. Font sizes are measured at a 512px design reference: `text_boxes.text.font_size` and each independent text layer override the plan's default font size. Preserve fields you do not intend to change, including theme and personal-motion settings.

## Inspect and finish

- Creation returns a job ID. Use `status <job-id>` or `status <job-id> --wait --output ./memes` for progress and files. `--wait` reports phase changes while waiting. `cancel <job-id>` cancels an unwanted job.
- Report actual phases and concise public recommendation reasons. Do not fabricate hidden model reasoning, completion percentages, or a successful export before a result is available.
- The client downloads completed image files and saves a result JSON. Inspect the actual JPG or GIF when image-viewing tools are available. Explain a visible failure, keep the user's intent, and correct the specific invalid field. Stop after two failed corrected submissions unless the owner supplies new information.
- Completed candidates are saved as editable browser-local projects. By default, the page saves its current project and automatically opens the first new Agent result for further editing; the owner can turn this off in **Agent 接入**. Other candidates remain in **我的项目**. Do not use repeated jobs to overwrite the owner's manual adjustments.
- Pairing is remembered per website/browser and reconnects automatically; tabs of the same origin share one transport. The bridge reuses its config pairing token on restart (use `--rotate-token` only when requested). A disconnected or suspended browser must reconnect before retrying; do not silently move the job to another browser. Local projects and AI credentials are not sent to the bridge; exported project backups exclude AI settings and pairing tokens.

For raw HTTP endpoints, payloads, limits, and examples usable by other Agent products, read [references/api.md](references/api.md).
