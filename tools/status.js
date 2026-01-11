import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

async function exists(relPath) {
  try {
    await fs.access(path.join(ROOT, relPath));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const pkg = JSON.parse(await fs.readFile(path.join(ROOT, "package.json"), "utf8"));

  const checks = [
    ["package.json", await exists("package.json")],
    ["road-to-war/project.godot", await exists("road-to-war/project.godot")],
    ["road-to-war/scripts/", await exists("road-to-war/scripts/")],
    ["road-to-war/scenes/", await exists("road-to-war/scenes/")],
  ];

  const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);

  console.log(`${pkg.name}@${pkg.version} - Godot Game`);
  console.log(`node ${process.version}`);
  console.log("");
  console.log("Godot Project Status:");
  for (const [p, ok] of checks) {
    console.log(`- ${pad(p, 22)} ${ok ? "OK" : "MISSING"}`);
  }
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exitCode = 1;
});







