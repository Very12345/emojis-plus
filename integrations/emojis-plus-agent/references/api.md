# Local / LAN API v1

Base URL: `http://127.0.0.1:8766`, or `http://<workbench-host-LAN-IP>:8766` when launched with `--lan`. All `/api/v1/*` calls require `Authorization: Bearer <pairing-code>`. JSON is UTF-8. AI keys stay in the connected browser; there is no model-settings endpoint.

| Method / path | Behavior |
|---|---|
| `GET /health` | Protocol availability, no credentials or browser data |
| `GET /api/v1/browsers` | Connected browser IDs, names and online state |
| `GET /api/v1/catalog?browser_id=...` | Current registered assets, templates, themes, compositions, effects, props, fonts and capabilities |
| `POST /api/v1/jobs` | Queue `generate`, `compose` or `render`; returns HTTP 202 and a job ID |
| `GET /api/v1/jobs/{id}` | State, timestamped public process events, result plans and completed file descriptors |
| `POST /api/v1/jobs/{id}/cancel` | Cancel queued or active work |
| `GET /api/v1/jobs/{id}/files/{name}` | Download completed JPG/GIF/PNG with the same authorization header |

Pass `browser_id` when multiple tabs are connected. With exactly one connected browser it is optional. Without a connected browser requests return 409. Do not call internal `/bridge/*` browser transport endpoints from an Agent.

## Job payloads

Generate three candidates using the browser's AI configuration:

```json
{"operation":"generate","prompt":"学校临时改安排，有点无语","format":"gif","character":"毛毛虫"}
```

Compose using the Agent's choice of existing library resources; this does not call AI:

```json
{
  "operation":"compose",
  "asset_id":"pku-scholar-cat-think",
  "composition_id":"deadline-story",
  "text":"提交失败",
  "secondary_text":"最后再改一行",
  "format":"gif",
  "size":256,
  "characters":["thu-book-spirit-tired"],
  "options":{"primary_motion":{"effect":"shake","strength":0.5,"speed":1}}
}
```

`compose` accepts `asset_id` or a base `plan`, optional `template_id` or `composition_id`, `characters` as an array of additional asset IDs, `text`, `secondary_text`, `format`, `size`, and `options` containing valid plan-field overrides. `full_sample:true` deliberately applies the composition's complete sample; otherwise requested identities and wording are retained. Theme selection places actors and creates theme props; `options` is applied afterward, then validated.

Render an edited result:

```json
{"operation":"render","plan":{"asset_id":"...","template_id":"..."}}
```

The example render plan is abbreviated. Send a complete plan from a compose/generate result, not this two-field placeholder. `primary_motion` affects only the main actor; additional people use their own `characters[i].effect/strength/speed`. Shared `effect/effects` remain separate. Text effects and copy arrays are shared composition effects rather than personal actor motions.

## Results and process

`GET jobs/{id}` returns `status`, `events`, `result`, `files`, and optional `error`. States include `queued`, `working`, `analyzing`, `receiving`, `planning`, `validating`, `rendering`, `completed`, `failed`, `cancelled`. Events have `seq`, `at`, `stage`, `message`, and optional actual render `percent` or candidate number. Receiving-model events report output-character counts, not invented model reasoning.

Single-image results contain `plan`, `info`, and `file_name`. AI results have `intent` and three `candidates` with plans, public recommendation reasons, metadata and file names. Each file descriptor includes `name`, `mime`, `bytes`, `download_path`; resolve the path against the bridge base URL and send authorization. Browser `blob:` URLs are never returned as download links.

The bridge retains at most 64 jobs, up to 32 nonterminal jobs, 24MB per uploaded file, and 128MB of image buffers. Results expire after one hour or when the bridge restarts; download promptly. A disconnected browser fails outstanding work after 45 seconds, and jobs expire after 15 minutes. Reconnect and submit a new job instead of polling forever. Render-format and pixel limits follow the browser workbench (JPG/GIF, 256/512, GIF up to six seconds, 1–6 actors).

The API provides no arbitrary JavaScript execution, shell commands, local-file reads, settings export, or model-key access. Private imported assets may be rendered by ID in their owning browser, but their `blob:` source URLs are omitted from the catalog.

## Any HTTP-capable Agent

```bash
curl -H "Authorization: Bearer $EP_BRIDGE_TOKEN" "$EP_BRIDGE_URL/api/v1/browsers"
curl -H "Authorization: Bearer $EP_BRIDGE_TOKEN" -H "Content-Type: application/json" \
  -d '{"operation":"compose","asset_id":"pku-dumpling-cheer","composition_id":"celebrate-direct","text":"这次真的成了","format":"gif"}' \
  "$EP_BRIDGE_URL/api/v1/jobs"
```

Codex and other products that understand `SKILL.md` can discover the skill after it is placed in their skill directory. WorkBuddy or another Agent can use the same HTTP interface and Python client; its installation directory depends on that product's configuration. No vendor-specific SDK is required.

Browser local-network requests require appropriate browser permission. The page initiates requests to a loopback/LAN bridge and includes `targetAddressSpace` for supporting browsers; see [MDN local network access](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Local_network_access). Do not bypass permission or certificate warnings. A local static workbench can be used when the browser does not support Pages-to-local connectivity; model settings are stored separately for each browser origin.

## Reconnection and editable results (v1.1)

The web page remembers pairing and reconnects after refresh or a network interruption. Tabs of the same website share one transport, so they appear as one browser in `/api/v1/browsers`. A `client_id` on `/bridge/register` resumes that logical browser ID, rotates its private transport key, and fails an interrupted active job explicitly. Jobs can then be retried; they are never silently replayed. The standalone bridge reuses its existing config token after restart unless launched with `--rotate-token`.

Every completed candidate is saved in the browser project library. By default it opens the first result in the workbench after saving current edits. This can be disabled by the owner. The Agent receives the same plans and rendered files as before; it cannot read arbitrary browser projects or model credentials. Projects survive page/bridge restarts in that browser; relay jobs/files remain temporary memory.
