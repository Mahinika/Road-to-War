# MCP Manager Tool (Cursor)

This repo includes an MCP server that exposes the manager workflow as **chat-callable tools** (no paid APIs; uses whatever models Cursor provides).

## Run Command

- `npm run mcp:manager`

## Register in Cursor (stdio MCP server)

In Cursor, add a new MCP server that runs:

- **Command**: `npm`
- **Args**: `run`, `mcp:manager`
- **Working directory**: this repo root

(If Cursor asks for a JSON config, point it at the same command/args.)

## Tools

- `manager_prep({ task, lanes? })`
  - Generates prompts and returns the prompt text for each lane.
- `manager_ingest({ lane, patchText, filename? })`
  - Writes a patch into `agent-out/patches/`.
- `manager_apply({ lanes? })`
  - Applies patches in `agent-out/patches/` using `git apply` safety checks.



