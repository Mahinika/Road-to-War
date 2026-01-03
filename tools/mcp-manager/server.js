import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const ROOT = process.cwd();

function norm(p) {
  return p.replaceAll("\\", "/");
}

function rel(p) {
  return norm(path.relative(ROOT, p));
}

function okText(text) {
  return { content: [{ type: "text", text }] };
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function runNode(args) {
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    ok: r.status === 0,
    status: r.status ?? -1,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

async function readTextIfExists(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!(await fileExists(abs))) return null;
  return await fs.readFile(abs, "utf8");
}

const server = new Server(
  { name: "road-of-war-manager", version: "1.0.0" },
  { capabilities: { tools: { listChanged: true } } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "manager_prep",
        description:
          "Generate per-lane prompts for a task (gameplay/ui/infra) and return prompt text + expected patch paths.",
        inputSchema: {
          type: "object",
          properties: {
            task: { type: "string" },
            lanes: {
              type: "array",
              items: { type: "string" },
              description: "Optional list of lanes (gameplay/ui/infra). Default: all.",
            },
          },
          required: ["task"],
        },
      },
      {
        name: "manager_ingest",
        description:
          "Write an agent-produced unified diff into agent-out/patches/<lane>.patch (or custom filename).",
        inputSchema: {
          type: "object",
          properties: {
            lane: { type: "string", description: "gameplay/ui/infra (used for default filename)" },
            patchText: { type: "string", description: "Unified diff text" },
            filename: {
              type: "string",
              description: "Optional custom filename under agent-out/patches/",
            },
          },
          required: ["lane", "patchText"],
        },
      },
      {
        name: "manager_apply",
        description:
          "Apply patch files under agent-out/patches using git apply (safe check + skip if already applied).",
        inputSchema: {
          type: "object",
          properties: {
            lanes: {
              type: "array",
              items: { type: "string" },
              description: "Optional lanes to apply (gameplay/ui/infra). Default: all.",
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = (request.params.arguments || {}) ?? {};

  if (name === "manager_prep") {
    const task = String(args.task || "").trim();
    if (!task) return okText("ERROR: task is required");

    const lanesArr = Array.isArray(args.lanes) ? args.lanes.map(String) : [];
    const laneArg = lanesArr.length ? ["--lanes", lanesArr.join(",")] : [];

    const run = runNode(["tools/agent-manager.js", "prep", "--task", task, ...laneArg]);
    if (!run.ok) return okText(`ERROR running agent-manager prep\n\n${run.stderr || run.stdout}`);

    const summaryText = await readTextIfExists("agent-out/summary.json");
    const promptsDir = "agent-out/prompts";
    const patchesDir = "agent-out/patches";

    const promptFiles = [
      "gameplay.md",
      "ui.md",
      "infra.md",
    ].filter((f) => !lanesArr.length || lanesArr.some((l) => f.startsWith(l)));

    const prompts = {};
    for (const f of promptFiles) {
      const t = await readTextIfExists(`${promptsDir}/${f}`);
      if (t != null) prompts[f.replace(".md", "")] = t;
    }

    const text =
      `OK\n` +
      `promptsDir: ${promptsDir}\n` +
      `patchesDir: ${patchesDir}\n` +
      (summaryText ? `\nsummary.json:\n${summaryText}\n` : "") +
      `\nPROMPTS:\n` +
      Object.entries(prompts)
        .map(([lane, prompt]) => `\n--- ${lane} ---\n${prompt}`)
        .join("\n");

    return okText(text);
  }

  if (name === "manager_ingest") {
    const lane = String(args.lane || "").trim();
    const patchText = String(args.patchText || "");
    const filename = args.filename ? String(args.filename) : "";
    if (!lane) return okText("ERROR: lane is required");
    if (!patchText.trim()) return okText("ERROR: patchText is required");

    const patchesDirAbs = path.join(ROOT, "agent-out", "patches");
    await ensureDir(patchesDirAbs);

    const baseName = filename
      ? path.basename(filename)
      : `${lane}.patch`;

    const outPath = path.join(patchesDirAbs, baseName);
    await fs.writeFile(outPath, patchText.trimEnd() + "\n", "utf8");

    return okText(`OK wrote ${rel(outPath)}`);
  }

  if (name === "manager_apply") {
    const lanesArr = Array.isArray(args.lanes) ? args.lanes.map(String) : [];
    const laneArg = lanesArr.length ? ["--lanes", lanesArr.join(",")] : [];

    const run = runNode(["tools/agent-manager.js", "apply", ...laneArg]);
    const combined = [run.stdout, run.stderr].filter(Boolean).join("\n");
    if (!run.ok) return okText(`ERROR applying patches\n\n${combined || `(exit ${run.status})`}`);
    return okText(combined || "OK");
  }

  return okText(`ERROR: unknown tool ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);







