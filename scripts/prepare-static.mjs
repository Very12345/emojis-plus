#!/usr/bin/env node
/** Export only the reviewed repository library. Never opens server data or credentials. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import wawoff2 from 'wawoff2';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = path.join(ROOT, 'assets', 'seed');
const OUT = path.join(ROOT, 'public', 'library');
const VERSION = 'static-library-v1-webp-q90-1024';
const EXPECTED = { assets: 774, templates: 98, presets: 192, captions: 80, fonts: 7 };
const FONTS = [
  ['sans', 'Noto 黑体', '清晰通用', 'NotoSansSC.ttf', 'OFL.txt'],
  ['serif', 'Noto 宋体', '细节衬线', 'NotoSerifSC.ttf', 'NotoSerifSC-OFL.txt'],
  ['kuaile', '站酷快乐体', '轻快手写', 'ZCOOLKuaiLe-Regular.ttf', 'ZCOOLKuaiLe-OFL.txt'],
  ['xiaowei', '站酷小薇体', '文艺宋体', 'ZCOOLXiaoWei-Regular.ttf', 'ZCOOLXiaoWei-OFL.txt'],
  ['qingke', '站酷黄油体', '圆润醒目', 'ZCOOLQingKeHuangYou-Regular.ttf', 'ZCOOLQingKeHuangYou-OFL.txt'],
  ['mashan', '马善政楷书', '毛笔书写', 'MaShanZheng-Regular.ttf', 'MaShanZheng-OFL.txt'],
  ['longcang', '龙藏草书', '随性草书', 'LongCang-Regular.ttf', 'LongCang-OFL.txt'],
];
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
const serialize = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const relative = file => path.relative(ROOT, file).split(path.sep).join('/');

function gifLoop(bytes) {
  let at = 13;
  if (bytes[10] & 0x80) at += 3 * (1 << ((bytes[10] & 7) + 1));
  const blocks = () => {
    const result = [];
    while (at < bytes.length && bytes[at]) { const size = bytes[at++]; result.push(bytes.subarray(at, at + size)); at += size; }
    at++;
    return result;
  };
  while (at < bytes.length) {
    const marker = bytes[at++];
    if (marker === 0x3b) break;
    if (marker === 0x21) {
      const label = bytes[at++], data = blocks();
      if (label === 0xff && ['NETSCAPE2.0', 'ANIMEXTS1.0'].includes(data[0]?.toString('ascii')) && data[1]?.[0] === 1 && data[1].length >= 3) return data[1].readUInt16LE(1);
    } else if (marker === 0x2c) {
      const flags = bytes[at + 8]; at += 9;
      if (flags & 0x80) at += 3 * (1 << ((flags & 7) + 1));
      at++; blocks();
    } else break;
  }
  return null;
}

function within(root, name) {
  const full = path.resolve(root, name);
  if (full === root || !full.startsWith(root + path.sep)) throw new Error(`Unsafe library path: ${name}`);
  return full;
}

async function atomic(file, bytes) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  try { if ((await fs.readFile(file)).equals(bytes)) return; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const temp = `${file}.${process.pid}.tmp`;
  try { await fs.writeFile(temp, bytes, { flag: 'wx' }); await fs.rename(temp, file); }
  finally { await fs.unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}

/** Unicode cmap formats 4 and 12, filtering glyph zero, then compact inclusive ranges. */
export function fontCoverage(buffer) {
  const tableCount = buffer.readUInt16BE(4);
  let cmap;
  for (let i = 0; i < tableCount; i++) {
    const at = 12 + 16 * i;
    if (buffer.toString('ascii', at, at + 4) === 'cmap') cmap = buffer.readUInt32BE(at + 8);
  }
  if (cmap === undefined) throw new Error('Font has no cmap');
  const points = new Set();
  const seen = new Set();
  for (let i = 0; i < buffer.readUInt16BE(cmap + 2); i++) {
    const record = cmap + 4 + i * 8;
    const platform = buffer.readUInt16BE(record), encoding = buffer.readUInt16BE(record + 2);
    if (!(platform === 0 || (platform === 3 && [1, 10].includes(encoding)))) continue;
    const at = cmap + buffer.readUInt32BE(record + 4);
    if (seen.has(at)) continue;
    seen.add(at);
    const format = buffer.readUInt16BE(at);
    if (format === 12) {
      const groups = buffer.readUInt32BE(at + 12);
      for (let j = 0; j < groups; j++) {
        const pos = at + 16 + j * 12;
        const start = buffer.readUInt32BE(pos), end = buffer.readUInt32BE(pos + 4), glyph = buffer.readUInt32BE(pos + 8);
        if (end > 0x10ffff || start > end) throw new Error('Invalid cmap range');
        for (let cp = start; cp <= end; cp++) if (glyph + cp - start !== 0) points.add(cp);
      }
    } else if (format === 4) {
      const count = buffer.readUInt16BE(at + 6) / 2, ends = at + 14;
      const starts = ends + count * 2 + 2, deltas = starts + count * 2, offsets = deltas + count * 2;
      for (let j = 0; j < count; j++) {
        const start = buffer.readUInt16BE(starts + j * 2), end = buffer.readUInt16BE(ends + j * 2);
        const delta = buffer.readInt16BE(deltas + j * 2), offset = buffer.readUInt16BE(offsets + j * 2);
        for (let cp = start; cp <= end && cp < 0xffff; cp++) {
          let glyph;
          if (offset === 0) glyph = (cp + delta) & 0xffff;
          else {
            const value = buffer.readUInt16BE(offsets + j * 2 + offset + 2 * (cp - start));
            glyph = value === 0 ? 0 : (value + delta) & 0xffff;
          }
          if (glyph) points.add(cp);
        }
      }
    }
  }
  const result = [];
  for (const cp of [...points].sort((a, b) => a - b)) {
    const previous = result.at(-1);
    if (previous && previous[1] + 1 === cp) previous[1] = cp;
    else result.push([cp, cp]);
  }
  return result;
}

function normalizeMetadata(item, templateIds) {
  const metadata = {
    emotion: [], scenes: [], examples: [], action: '', intensity: 2, existing_text: '',
    source_type: 'reference', author: '', source_url: '', source_note: '', role: 'subject',
    is_cutout: false, allow_flip: true, derived_from: '', text_safe_area: null, templates: templateIds,
  };
  for (const key of Object.keys(metadata)) if (item[key] !== undefined) metadata[key] = item[key];
  // Previous complete template lists represented unrestricted compatibility. Preserve explicit subsets.
  const legacySets = [
    ['top', 'bottom', 'split', 'frame'],
    ['top', 'bottom', 'split', 'frame', 'flower', 'grid', 'message'],
    ['top', 'bottom', 'split', 'frame', 'flower', 'grid', 'message', 'poster', 'side', 'polaroid', 'bubble', 'dialogue', 'spotlight'],
    ['top', 'bottom', 'split', 'frame', 'flower', 'grid', 'message', 'poster', 'side', 'polaroid', 'bubble', 'dialogue', 'spotlight', 'comic', 'subtitle', 'note', 'window', 'ticket', 'medal'],
    templateIds.filter(id => id !== 'scene'),
  ];
  const same = (a, b) => a.length === b.length && a.every(id => b.includes(id));
  if (legacySets.some(ids => same(metadata.templates, ids))) metadata.templates = templateIds;
  else if (legacySets.some(ids => same(metadata.templates, ids.filter(id => id !== 'flower')))) metadata.templates = templateIds.filter(id => id !== 'flower');
  return metadata;
}

export async function prepareStatic() {
  const old = await json(path.join(OUT, 'build-report.json')).catch(error => { if (error.code === 'ENOENT') return { files: [] }; throw error; });
  const prior = new Map((old.files || []).map(file => [file.url, file]));
  const files = [], sourceFiles = new Map(), duplicates = [], omissions = [];
  const registries = {};
  for (const kind of ['layouts', 'effects', 'templates', 'presets', 'captions', 'categories', 'themes', 'props', 'compositions']) {
    const source = path.join(ROOT, 'assets', 'registry', `${kind}.json`);
    const bytes = await fs.readFile(source);
    sourceFiles.set(relative(source), digest(bytes));
    registries[kind] = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''))[kind];
    if (!Array.isArray(registries[kind])) throw new Error(`Missing ${kind} registry`);
    if (new Set(registries[kind].map(item => item.id)).size !== registries[kind].length) throw new Error(`Conflicting registry IDs: ${kind}`);
  }
  const curationPath = path.join(ROOT, 'assets', 'curation.json');
  const curationBytes = await fs.readFile(curationPath), curation = JSON.parse(curationBytes.toString());
  sourceFiles.set(relative(curationPath), digest(curationBytes));
  const archived = new Map(curation.archived.map(item => [item.id, item]));
  const templateIds = registries.templates.map(item => item.id);
  const sources = new Map();
  for (const name of ['catalog.json', ...(await fs.readdir(SEED)).filter(name => name.endsWith('-catalog.json')).sort()]) {
    const full = path.join(SEED, name), bytes = await fs.readFile(full);
    sourceFiles.set(relative(full), digest(bytes));
    for (const item of JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''))) {
      if (!/^[a-zA-Z0-9_-]+$/.test(item.id)) throw new Error(`Unsafe asset id: ${item.id}`);
      const first = sources.get(item.id);
      if (first) {
        const a = await fs.readFile(within(SEED, first.item.filename));
        const b = await fs.readFile(within(SEED, item.filename));
        if (!a.equals(b) || first.item.character !== item.character || (first.item.role || 'subject') !== (item.role || 'subject')) throw new Error(`Conflicting duplicate asset: ${item.id} (${first.manifest}, ${name})`);
        duplicates.push({ id: item.id, selected_manifest: first.manifest, ignored_manifest: name, reason: 'Byte-identical image and same character/role; canonical first ID wins.' });
      } else sources.set(item.id, { item, manifest: name });
    }
  }

  async function publish(url, fingerprint, make, extra = {}) {
    const file = within(OUT, url.replace(/^library\//, ''));
    let bytes;
    const previous = prior.get(url);
    if (previous?.fingerprint === fingerprint) {
      bytes = await fs.readFile(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (bytes && digest(bytes) === previous.sha256) { files.push({ ...previous, ...extra }); return; }
    }
    bytes = Buffer.from(await make());
    await atomic(file, bytes);
    files.push({ url, bytes: bytes.length, sha256: digest(bytes), fingerprint, ...extra });
  }

  const assets = [];
  for (const { item, manifest } of sources.values()) {
    if (item.enabled === false || archived.has(item.id)) {
      omissions.push({ id: item.id, reason: archived.get(item.id)?.reason || 'Disabled in canonical seed catalog.' });
      continue;
    }
    const source = within(SEED, item.filename), bytes = await fs.readFile(source), hash = digest(bytes);
    sourceFiles.set(relative(source), hash);
    const animated = path.extname(source).toLowerCase() === '.gif';
    const fingerprint = digest(Buffer.from(VERSION + hash));
    const url = `library/assets/${item.id}-${hash.slice(0, 12)}.${animated ? 'gif' : 'webp'}`;
    let info = prior.get(url)?.fingerprint === fingerprint ? prior.get(url).info : null;
    if (!info) {
      const meta = await sharp(bytes, { animated }).metadata();
      if (!['gif', 'png', 'webp', 'jpeg'].includes(meta.format)) throw new Error(`Unsupported source: ${item.filename}`);
      const frames = meta.pages || 1;
      const delays = Array.from({ length: frames }, (_, i) => Math.max(20, meta.delay?.[i] || 100));
      const width = meta.width, height = meta.pageHeight || meta.height;
      const factor = animated ? 1 : Math.min(1, 1024 / width, 1024 / height);
      info = { width: Math.round(width * factor), height: Math.round(height * factor), frames, duration_ms: frames > 1 ? delays.reduce((a, b) => a + b, 0) : 0, format: animated ? 'gif' : 'webp', has_transparency: !!meta.hasAlpha, loop: animated ? gifLoop(bytes) : null, delays: frames > 1 ? delays : [], source_width: width, source_height: height };
    }
    if (animated) info = { ...info, loop: gifLoop(bytes) };
    await publish(url, fingerprint, async () => animated ? bytes : sharp(bytes).rotate().resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100, effort: 5 }).toBuffer(), { kind: 'asset', id: item.id, source: relative(source), source_sha256: hash, info });
    const poster_url = `library/posters/${item.id}-${hash.slice(0, 12)}.webp`;
    await publish(poster_url, digest(Buffer.from('poster-v1-384-q84' + hash)), () => sharp(bytes).rotate().resize({ width: 384, height: 384, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84, alphaQuality: 100, effort: 4 }).toBuffer(), { kind: 'poster', id: item.id });
    assets.push({ id: item.id, name: item.name, character: item.character, enabled: true, metadata: normalizeMetadata(item, templateIds), info, url, poster_url, source_manifest: manifest });
  }

  const fonts = [];
  for (const [id, name, description, filename, license] of FONTS) {
    const source = path.join(ROOT, 'assets', 'fonts', filename), bytes = await fs.readFile(source), hash = digest(bytes);
    sourceFiles.set(relative(source), hash);
    const url = `library/fonts/${id}-${hash.slice(0, 12)}.woff2`;
    const licenseSource = path.join(ROOT, 'assets', 'fonts', license), licenseBytes = await fs.readFile(licenseSource);
    const licenseUrl = `library/fonts/${license}`;
    sourceFiles.set(relative(licenseSource), digest(licenseBytes));
    const fingerprint = digest(Buffer.from('woff2-v1' + hash));
    const coverage = prior.get(url)?.fingerprint === fingerprint ? prior.get(url).coverage : fontCoverage(bytes);
    await publish(url, fingerprint, () => wawoff2.compress(bytes), { kind: 'font', id, source: relative(source), source_sha256: hash, coverage });
    await publish(licenseUrl, digest(licenseBytes), () => licenseBytes, { kind: 'license' });
    fonts.push({ id, name, description, url, coverage, license_url: licenseUrl, sample_url: '', weight: ['sans', 'serif'].includes(id) ? '100 900' : '400' });
  }

  const emblemDefinition = await json(path.join(ROOT, 'assets', 'emblem.json'));
  const emblemSource = within(path.join(ROOT, 'assets'), emblemDefinition.filename), emblemBytes = await fs.readFile(emblemSource), emblemHash = digest(emblemBytes);
  const emblem_url = `library/assets/pku-emblem-${emblemHash.slice(0, 12)}.webp`;
  await publish(emblem_url, digest(Buffer.from(VERSION + emblemHash)), () => sharp(emblemBytes).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).webp({ quality: 95, alphaQuality: 100 }).toBuffer(), { kind: 'emblem', source: relative(emblemSource), source_sha256: emblemHash });
  sourceFiles.set(relative(emblemSource), emblemHash);
  const categories = registries.categories.filter(item => item.enabled !== false).map(item => ({ enabled: true, parent_id: null, order: 0, ...item }));
  const layouts = registries.layouts.filter(item => item.enabled !== false).map(item => ({ enabled: true, panels: [], subject_mode: 'single', ...item }));
  const categoryById = new Map(categories.map(item => [item.id, item]));
  const templates = registries.templates.filter(item => item.enabled !== false).map(item => {
    const layout = layouts.find(layout => layout.id === item.layout_id) || null;
    const template = { enabled: true, category_id: null, subcategory_id: null, tags: [], animation: null, description: '', requires_transparency: false, supports_embedded: false, defaults: {}, sample: { text: '今天也要开心' }, motions: [], cast: [], min_characters: 1, max_characters: 6, ...item, layout };
    template.requires_transparency ||= item.layout_id === 'flower' || layout?.subject_mode === 'flower';
    return { ...template, category_name: categoryById.get(template.category_id)?.name || '', subcategory_name: categoryById.get(template.subcategory_id)?.name || '' };
  });
  const templateById = new Map(templates.map(item => [item.id, item]));
  const presets = registries.presets.filter(item => item.enabled !== false).map(item => {
    const template = templateById.get(item.plan.template_id || 'bottom');
    if (!template) throw new Error(`Unknown preset template: ${item.id}`);
    return { enabled: true, description: '', category: '自定义组合', cast: [], ...item, selector: { asset_id: '', character: '', prefer_transparent: true, ...item.selector }, category_id: template.category_id, subcategory_id: template.subcategory_id, category_name: template.category_name, subcategory_name: template.subcategory_name, tags: template.tags, animation: template.animation };
  });
  const catalog = { schema_version: 1, version: VERSION, assets, templates, layouts, presets, captions: registries.captions, effects: registries.effects.filter(item => item.enabled !== false).map(item => ({ enabled: true, strength_scale: 1, speed_scale: 1, ...item })), categories, themes:registries.themes, props:registries.props, compositions:registries.compositions, fonts, curation, emblem_url, emblem: emblemDefinition };
  const counts = Object.fromEntries(Object.keys(EXPECTED).map(kind => [kind, catalog[kind].length]));
  for (const kind of Object.keys(EXPECTED)) if (!counts[kind]) throw new Error(`Canonical ${kind} library must not be empty`);
  for (const row of curation.archived) if (!assets.some(asset => asset.id === row.replacement)) throw new Error(`Missing enabled replacement for ${row.id}: ${row.replacement}`);
  const catalogBytes = serialize(catalog);
  await publish('library/catalog.json', digest(catalogBytes), () => catalogBytes, { kind: 'catalog' });
  const report = { schema_version: 1, version: VERSION, counts, total_bytes: files.reduce((sum, file) => sum + file.bytes, 0), source_sha256: digest(serialize([...sourceFiles].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))), omitted_assets: omissions, identical_duplicates: duplicates, excluded_sources: ['data/**', '.env', 'generated personal works', 'high-resolution AI masters', 'AI reference sheets', 'server registry overrides'], files };
  await atomic(path.join(OUT, 'build-report.json'), serialize(report));
  console.log(`Static library ready: ${assets.length} assets, ${templates.length} templates, ${presets.length} presets, ${fonts.length} fonts; ${(report.total_bytes / 1024 / 1024).toFixed(1)} MiB.`);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareStatic().catch(error => { console.error(error.message); process.exitCode = 1; });
}
