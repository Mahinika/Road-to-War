import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

function norm(p) {
  return p.replaceAll("\\", "/");
}

function isIgnored(rel) {
  const p = norm(rel);
  return (
    p.startsWith("node_modules/") ||
    p.startsWith("dist/") ||
    p.startsWith(".git/") ||
    p.startsWith("agent-out/") ||
    p.endsWith(".png") ||
    p.endsWith(".jpg") ||
    p.endsWith(".jpeg") ||
    p.endsWith(".webp") ||
    p.endsWith(".gif") ||
    p.endsWith(".mp3") ||
    p.endsWith(".ogg") ||
    p.endsWith(".wav")
  );
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a) continue;
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (!v || v.startsWith("--")) out[k] = true;
      else {
        out[k] = v;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

async function readJson(p) {
  const s = await fs.readFile(p, "utf8");
  return JSON.parse(s);
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

function extractKeywords(task) {
  return Array.from(
    new Set(
      task
        .toLowerCase()
        .split(/[^a-z0-9_/-]+/g)
        .map((s) => s.trim())
        .filter((s) => s.length >= 4 && !["with", "from", "that", "this", "into", "when", "then"].includes(s)),
    ),
  ).slice(0, 16);
}

async function listFilesUnder(prefix) {
  const abs = path.join(ROOT, prefix);
  const out = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = norm(path.relative(ROOT, full));
      if (isIgnored(rel)) continue;
      if (e.isDirectory()) await walk(full);
      else out.push(rel);
    }
  }

  await walk(abs);
  return out;
}

function findMatches(lines, keywords, maxMatches) {
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    for (const k of keywords) {
      if (l.includes(k)) {
        hits.push(i);
        break;
      }
    }
    if (hits.length >= maxMatches) break;
  }
  return hits;
}

function makeSnippet(lines, lineIdx, ctx) {
  const start = Math.max(0, lineIdx - ctx);
  const end = Math.min(lines.length, lineIdx + ctx + 1);
  const body = lines
    .slice(start, end)
    .map((l, i) => `${start + i + 1}: ${l}`)
    .join("\n");
  return { start: start + 1, end, body };
}

async function pickContextFiles({ scope, task, maxFiles, maxMatchesPerFile, contextLines }) {
  const keywords = extractKeywords(task);
  const candidates = [];

  for (const s of scope) {
    if (s.endsWith("/")) {
      const files = await listFilesUnder(s);
      candidates.push(...files);
    } else {
      const rel = norm(s);
      if (!isIgnored(rel)) candidates.push(rel);
    }
  }

  const scored = [];
  for (const rel of candidates) {
    let content;
    try {
      content = await fs.readFile(path.join(ROOT, rel), "utf8");
    } catch {
      continue;
    }
    const low = content.toLowerCase();
    let score = 0;
    for (const k of keywords) {
      if (low.includes(k)) score += 3;
    }
    if (score > 0) scored.push({ rel, score, content });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, maxFiles).map((x) => {
    const lines = x.content.split("\n");
    const hits = findMatches(lines, keywords, maxMatchesPerFile);
    const snippets = hits.map((h) => makeSnippet(lines, h, contextLines));
    return { file: x.rel, score: x.score, snippets };
  });

  return { keywords, files: top };
}

async function loadIncludedContext(includeFiles) {
  const out = [];
  for (const rel of includeFiles) {
    const p = norm(rel);
    if (isIgnored(p)) continue;
    let content;
    try {
      content = await fs.readFile(path.join(ROOT, p), "utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    const trimmed = lines.slice(0, 200).join("\n");
    out.push({ file: p, body: trimmed });
  }
  return out;
}

function buildPrompt({ task, lane, globalContext, repoContext }) {
  const scope = lane.scope.join(", ");

  const repoSnippets =
    repoContext.files.length === 0
      ? "NO_MATCHING_FILES_FOUND_BY_SEARCH"
      : repoContext.files
          .map((f) => {
            if (!f.snippets.length) return `--- ${f.file}\n(no snippet)`;
            return f.snippets.map((s) => `--- ${f.file} (${s.start}-${s.end})\n${s.body}`).join("\n\n");
          })
          .join("\n\n");

  const globalBlock =
    globalContext.length === 0
      ? ""
      : globalContext.map((c) => `--- ${c.file}\n${c.body}`).join("\n\n");

  return [
    `TASK: ${task}`,
    ``,
    `LANE: ${lane.name}`,
    `SCOPE_ALLOWLIST: ${scope}`,
    ``,
    `INSTRUCTIONS:`,
    lane.instructions,
    ``,
    `OUTPUT_CONTRACT:`,
    `- Output ONLY a unified diff (git patch) that stays within SCOPE_ALLOWLIST.`,
    `- If you cannot proceed: output exactly ONE question (no diff).`,
    ``,
    globalBlock ? `HIGH_LEVEL_CONTEXT:\n${globalBlock}\n` : "",
    `REPO_CONTEXT_SNIPPETS (keyword search hits):`,
    repoSnippets,
  ]
    .filter(Boolean)
    .join("\n");
}

async function cmdPrep({ cfg, task, lanes }) {
  const outDir = path.join(ROOT, cfg.outDir);
  const promptsDir = path.join(ROOT, cfg.promptsDir);
  const patchesDir = path.join(ROOT, cfg.patchesDir);
  await ensureDir(outDir);
  await ensureDir(promptsDir);
  await ensureDir(patchesDir);

  const globalContext = await loadIncludedContext(cfg.context.includeFiles || []);
  const selected = cfg.lanes.filter((l) => (lanes?.length ? lanes.includes(l.name) : true));

  const summary = { task, lanes: [] };

  for (const lane of selected) {
    const repoContext = await pickContextFiles({
      scope: lane.scope,
      task,
      maxFiles: cfg.context.maxFiles,
      maxMatchesPerFile: cfg.context.maxMatchesPerFile,
      contextLines: cfg.context.contextLines,
    });

    const prompt = buildPrompt({ task, lane, globalContext, repoContext });
    const promptPath = path.join(promptsDir, `${lane.name}.md`);
    await fs.writeFile(promptPath, prompt + "\n", "utf8");

    summary.lanes.push({
      name: lane.name,
      prompt: norm(path.relative(ROOT, promptPath)),
      expectedPatch: norm(path.relative(ROOT, path.join(patchesDir, `${lane.name}.patch`))),
      keywords: repoContext.keywords,
      contextFiles: repoContext.files.map((f) => f.file),
    });
  }

  await fs.writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");

  process.stdout.write(
    [
      `Wrote prompts to ${norm(path.relative(ROOT, promptsDir))}/*.md`,
      `Paste each prompt into a Cursor chat (using your included Pro models).`,
      `Save the agent output (unified diff) into ${norm(path.relative(ROOT, patchesDir))}/*.patch`,
      `Then run: npm run agent:apply`,
      ``,
    ].join("\n"),
  );
}

async function cmdIngest({ cfg, lane, inputPath }) {
  if (!lane) throw new Error("--lane required");
  const patchesDir = path.join(ROOT, cfg.patchesDir);
  await ensureDir(patchesDir);

  const text = inputPath ? await fs.readFile(path.join(ROOT, inputPath), "utf8") : await fs.readFile(0, "utf8");
  const outPath = path.join(patchesDir, `${lane}.patch`);
  await fs.writeFile(outPath, text.trimEnd() + "\n", "utf8");
  process.stdout.write(`Wrote ${norm(path.relative(ROOT, outPath))}\n`);
}

function gitApply(patchPath) {
  const r = spawnSync("git", ["apply", "--whitespace=nowarn", patchPath], { stdio: "inherit" });
  return r.status === 0;
}

function gitApplyCheck(patchPath, reverse = false) {
  const args = ["apply", "--check", "--whitespace=nowarn"];
  if (reverse) args.push("--reverse");
  args.push(patchPath);
  const r = spawnSync("git", args, { stdio: "ignore" });
  return r.status === 0;
}

async function listPatchFiles(patchesDir) {
  let entries;
  try {
    entries = await fs.readdir(patchesDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".patch"))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
}

function matchesLane(filename, laneName) {
  return filename === `${laneName}.patch` || filename.startsWith(`${laneName}-`) || filename.startsWith(`${laneName}_`);
}

async function cmdApply({ cfg, lanes }) {
  const patchesDir = path.join(ROOT, cfg.patchesDir);
  const allPatches = await listPatchFiles(patchesDir);
  const selectedLanes = cfg.lanes.filter((l) => (lanes?.length ? lanes.includes(l.name) : true));

  let patchNames = allPatches;
  if (lanes?.length) {
    patchNames = allPatches.filter((p) => selectedLanes.some((l) => matchesLane(p, l.name)));
  }

  if (patchNames.length === 0) {
    process.stdout.write(`No patch files found in ${norm(path.relative(ROOT, patchesDir))}\n`);
    process.stdout.write(`Tip: save agent output as gameplay.patch / ui.patch / infra.patch\n`);
    return;
  }

  let applied = 0;
  let skipped = 0;

  for (const name of patchNames) {
    const patchPath = path.join(patchesDir, name);

    if (gitApplyCheck(patchPath)) {
      process.stdout.write(`APPLY ${norm(path.relative(ROOT, patchPath))}\n`);
      const ok = gitApply(patchPath);
      if (!ok) {
        process.exitCode = 1;
        return;
      }
      applied++;
      continue;
    }

    if (gitApplyCheck(patchPath, true)) {
      process.stdout.write(`SKIP (already applied) ${norm(path.relative(ROOT, patchPath))}\n`);
      skipped++;
      continue;
    }

    process.stdout.write(`FAIL (does not apply) ${norm(path.relative(ROOT, patchPath))}\n`);
    process.stdout.write(`Fix by regenerating the patch, or delete it from ${norm(path.relative(ROOT, patchesDir))}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`Done. Applied: ${applied}, Skipped: ${skipped}\n`);
}

async function main() {
  const args = parseArgs(process.argv);
  const cmd = args._[0];
  const cfgPath = path.join(ROOT, "tools/agent-manager.config.json");
  const cfg = await readJson(cfgPath);

  const lanes = typeof args.lanes === "string" ? args.lanes.split(",").map((s) => s.trim()) : null;

  if (cmd === "prep") {
    const task = String(args.task || args._.slice(1).join(" ")).trim();
    if (!task) throw new Error('Usage: node tools/agent-manager.js prep --task "..."');
    await cmdPrep({ cfg, task, lanes });
    return;
  }

  if (cmd === "ingest") {
    await cmdIngest({ cfg, lane: args.lane, inputPath: args.in });
    return;
  }

  if (cmd === "apply") {
    await cmdApply({ cfg, lanes });
    return;
  }

  throw new Error(
    [
      "Usage:",
      "  node tools/agent-manager.js prep --task \"...\" [--lanes gameplay,ui,infra]",
      "  node tools/agent-manager.js ingest --lane gameplay --in agent-out/patches/gameplay.patch",
      "  node tools/agent-manager.js apply [--lanes gameplay,ui,infra]",
    ].join("\n"),
  );
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exitCode = 1;
});


