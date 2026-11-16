# BUILD REPORT — boothdesk

Clean-room rebuild of `com.dreamboothstudio/dreambooth` v0.1.0
(remote-only MCP server at `https://mcp.dreamboothstudio.com/mcp`),
built 2026-10-28 as a forwarding client. Package:
`@reneturcios/boothdesk` 0.1.0, registry name
`io.github.CloudCorpRecords/boothdesk`.

## Surface built

Full surface: **all 22 captured tools built**, no omissions.

| Tool | Required fields as served |
|------|---------------------------|
| `connect_account` | NO `required` key in the capture — served verbatim, none invented |
| `connection_status` | NO `required` key in the capture — served verbatim, none invented |
| `get_sessions` | NO `required` key in the capture — served verbatim, none invented |
| `get_gallery_stats` | NO `required` key in the capture — served verbatim, none invented |
| `search_docs` | `query` |
| `list_projects` | NO `required` key in the capture — served verbatim, none invented |
| `get_project` | `projectId` |
| `get_revenue_summary` | NO `required` key in the capture — served verbatim, none invented |
| `get_credits` | NO `required` key in the capture — served verbatim, none invented |
| `get_wallet_transactions` | NO `required` key in the capture — served verbatim, none invented |
| `create_filter` | `name`, `adjustments` |
| `duplicate_project` | `projectId` |
| `start_frame` | `prompt`, `layout` |
| `refine_frame` | `threadId`, `prompt` |
| `check_generation` | NO `required` key in the capture — served verbatim, none invented |
| `save_frame` | `threadId`, `generationId` |
| `preview_filter` | `adjustments` |
| `start_booth` | `prompt` |
| `refine_booth` | `draftId`, `what`, `instruction` |
| `create_booth` | `draftId` |
| `get_booth_draft` | `draftId` |
| `update_booth_draft` | `draftId` |

Each served tool carries exactly the keys `name`, `title`,
`description`, `inputSchema`, exactly as captured: this capture
DOES carry a `title` key on every tool, so all 22 titles are
served verbatim; the capture's `_meta` / `annotations` /
`execution` / `outputSchema` keys were dropped at fixture
slimming and are NOT part of the served literals. Input schemas
are served exactly as captured, including the draft-07
`$schema` marker on every schema and `additionalProperties:
false` on the 18 schemas that carry it (the four parameterless
tools — `connect_account`, `connection_status`, `list_projects`,
`get_credits` — carry neither `additionalProperties` nor
`required`). The tool literals were generated programmatically
from `harness/fixtures/dreambooth-tools-original.json` by the
script at `/tmp/b45-boothdesk-scratch/gen.py` (parse +
re-serialise into `src/forward.ts`) — never retyped — and a
post-generation check (the registration-integrity test suite,
plus the parity harness) confirmed the served literals
deep-equal the fixture's 22 tool objects, in order. Tools are
registered via the MCP SDK low-level Server API
(`ListToolsRequestSchema` / `CallToolRequestSchema` handlers),
not McpServer+zod.

## Fixture conflicts

**None.** The spec and the fixture agree on all 22 tools'
names, titles, descriptions, required fields (including the
nine tools with no `required` key: `connect_account`,
`connection_status`, `get_sessions`, `get_gallery_stats`,
`list_projects`, `get_revenue_summary`, `get_credits`,
`get_wallet_transactions`, `check_generation`) and property
shapes.

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://mcp.dreamboothstudio.com/mcp`.
- Env override `DREAMBOOTH_MCP_URL` — labelled reconstruction.
- The registry record declares NO headers on the remote: no auth
  header is ever sent. Tests assert that no `Authorization` header
  is sent under any environment — including with key-like env vars
  (`DREAMBOOTH_API_KEY`, `API_KEY`, `AUTHORIZATION`) set — and that
  no `X-API-Key` header is ever sent; upstream requests carry only
  `Content-Type`, `Accept` and, when issued, `Mcp-Session-Id`.
- Error rendering `boothdesk error:` text for upstream failures —
  labelled reconstruction.
- Upstream results pass through verbatim, including `isError` and
  extra fields. tools/call is forwarded as streamable-HTTP
  JSON-RPC: initialize (protocolVersion `2025-03-26`) →
  notifications/initialized → tools/call, honouring
  `Mcp-Session-Id` when issued; plain-JSON and SSE replies are
  both parsed. The forwarding core takes an injectable fetch;
  tests stub the upstream — no live network calls in tests.

## Deviations

None.

## Lockfile

- Route: generated clean from birth in the build dir with no
  `node_modules` and no pre-existing lockfile:
  `npm install --package-lock-only --ignore-scripts --offline`
  (Route 3).
- Parses as JSON; `name` == `@reneturcios/boothdesk`.
- Package entries: **128**.
- sha256: `458d0b4ca535100772fa81972ebf3d5a44aebefcf7b339b4bb04cdb46d9e34e3`
  (re-verified unchanged after the subsequent offline `npm ci`).

## server.json

- Description exactly: "Dreambooth Studio operator console:
  sessions, revenue, credits, projects and booth design tools."
  — **96 characters**.
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/boothdesk:0.1.0`) carries **no**
  `version` field. Both entries carry packageArguments
  `[{type: positional, value: mcp}]` and transport stdio. Dockerfile
  (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/boothdesk"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/boothdesk`
  and its smoke test asserts the server name `boothdesk`.

## Verification (all run 2026-10-28)

1. `npx tsc --noEmit` → exit 0.
2. `npm run build` → exit 0; real `dist/` produced (cli, forward,
   index, mcp, types — .js, .d.ts, .js.map each).
3. `node dist/cli.js --version` → `0.1.0`.
4. `npm test` → **57 tests, 57 pass, 0 fail** (registration-integrity
   suite deep-equals the served tools/list against the fixture's 22
   tools, including the title keys, the nine no-required tools, the
   captured `$schema` / `additionalProperties` markers and the
   draftId pattern assertions, plus session handling/reuse, env
   override, the no-Authorization-header assertions under any
   environment, verbatim argument forwarding and result
   pass-through including upstream isError, SSE parsing, error
   rendering, MCP-layer validation, and CLI behaviour).
5. Parity: `python3 /home/hatch/workspace/mcp-rebuild-100/harness/parity.py --original /home/hatch/workspace/mcp-rebuild-100/harness/fixtures/dreambooth-tools-original.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/boothdesk/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/boothdesk/parity-out` → **verdict PASS, parity 100.0**
   (22/22 identical, 0 missing, 0 extra, no schema diffs). Output in
   `parity-out/`.
