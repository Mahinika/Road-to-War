import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import path from "node:path";

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

function openFile(filePath) {
  const p = path.resolve(filePath);
  if (process.platform === "win32") {
    spawnSync("cmd", ["/c", "start", "", p], { stdio: "ignore", windowsHide: true });
    return;
  }
  if (process.platform === "darwin") {
    spawnSync("open", [p], { stdio: "ignore" });
    return;
  }
  spawnSync("xdg-open", [p], { stdio: "ignore" });
}

async function main() {
  const args = parseArgs(process.argv);

  let task = String(args.task || args._.join(" ")).trim();
  const lanes = typeof args.lanes === "string" ? args.lanes : "";
  const shouldOpen = Boolean(args.open);

  if (!task) {
    const rl = createInterface({ input: stdin, output: stdout });
    task = String(await rl.question("Manager task: ")).trim();
    rl.close();
  }

  if (!task) {
    console.error('Missing task. Usage: npm run manager -- --task "..."');
    process.exitCode = 1;
    return;
  }

  const cmd = [
    "tools/agent-manager.js",
    "prep",
    "--task",
    task,
    ...(lanes ? ["--lanes", lanes] : []),
  ];

  const r = spawnSync(process.execPath, cmd, { stdio: "inherit" });
  if (r.status !== 0) {
    process.exitCode = r.status ?? 1;
    return;
  }

  if (shouldOpen) {
    if (!lanes || lanes.includes("gameplay")) openFile("agent-out/prompts/gameplay.md");
    if (!lanes || lanes.includes("ui")) openFile("agent-out/prompts/ui.md");
    if (!lanes || lanes.includes("infra")) openFile("agent-out/prompts/infra.md");
  }
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exitCode = 1;
});







