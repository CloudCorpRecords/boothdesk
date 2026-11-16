# boothdesk

Run your Dreambooth Studio photobooth business from your tool list. boothdesk is a local forwarding client for the hosted Dreambooth MCP service: it answers `tools/list` locally from the captured tool definitions and forwards every call to Dreambooth Studio, returning the answers exactly as the service sends them back.

The surface is the account owner's own operator console. You connect the account once, then read sessions, gallery statistics, revenue, AI credits and wallet transactions, manage booth projects, and design the frames, filters and booth screens your guests will see. Nothing is stored or computed locally — the package is a pipe to the service, not a copy of it.

All 22 captured tools are built; there are no omissions.

## The tools

- **`connect_account`** — Connect this conversation to the person's Dreambooth Studio account; returns a sign-in link to approve, or reports the account already connected. No parameters.
- **`connection_status`** — Check whether a Dreambooth account is connected. No parameters.
- **`get_sessions`** — Read photo sessions, with optional date, project, status and payment filters. No required parameters.
- **`get_gallery_stats`** — Read gallery statistics, optionally for one project. No required parameters.
- **`search_docs`** — Search the Dreambooth documentation. `query` is required.
- **`list_projects`** — List the account's booths (projects). No parameters.
- **`get_project`** — Read one booth in detail. `projectId` is required.
- **`get_revenue_summary`** — Summarise revenue, optionally grouped and date-bounded. No required parameters.
- **`get_credits`** — Read the AI credit balance and plan. No parameters.
- **`get_wallet_transactions`** — Read wallet transactions, optionally limited and date-bounded. No required parameters.
- **`create_filter`** — Create a photo filter from colour adjustments. `name` and `adjustments` are required.
- **`duplicate_project`** — Duplicate a booth. `projectId` is required.
- **`start_frame`** — Start designing a photo frame from a prompt and a layout. `prompt` and `layout` are required.
- **`refine_frame`** — Refine a frame design in progress. `threadId` and `prompt` are required.
- **`check_generation`** — Check on background generation work, optionally by `jobId`. No required parameters.
- **`save_frame`** — Save a generated frame. `threadId` and `generationId` are required.
- **`preview_filter`** — Preview a set of filter adjustments. `adjustments` is required.
- **`start_booth`** — Start designing a new booth from a prompt. `prompt` is required.
- **`refine_booth`** — Change part of a booth draft. `draftId`, `what` and `instruction` are required.
- **`create_booth`** — Create the booth from a finished draft. `draftId` is required.
- **`get_booth_draft`** — Read a booth draft. `draftId` is required.
- **`update_booth_draft`** — Change a booth draft's settings (title, slug, text, palette, frames, filters and more). `draftId` is required.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/boothdesk mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "boothdesk": {
      "command": "npx",
      "args": ["-y", "@reneturcios/boothdesk", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/boothdesk
docker run --rm ghcr.io/cloudcorprecords/boothdesk connection_status '{}'
```

## CLI

One binary serves both the command line and the MCP server. Each tool is a subcommand taking a single JSON string with that tool's arguments:

```bash
boothdesk connection_status '{}'
boothdesk list_projects '{}'
boothdesk get_project '{"projectId":"<id>"}'
boothdesk --version
```

Exit codes: `0` when the forwarded call succeeds, `1` when the upstream result is an error, and `2` for usage problems such as an unknown subcommand or a malformed JSON argument.

## Configuration

- `DREAMBOOTH_MCP_URL` — Overrides the upstream endpoint. The default is the pinned hosted endpoint, `https://mcp.dreamboothstudio.com/mcp`. (The override variable is a reconstruction added by this rebuild.)

The upstream registry record declares no headers, so no authentication header is ever sent; the tool surface was captured keyless. Account connection happens through the `connect_account` tool itself, which returns a link the account owner opens in their own browser — no credential or token is created or returned by that tool.

Upstream failures — a JSON-RPC error from the service, a non-2xx response, an unreadable body, or a request that fails outright — are reported to the caller as an error result whose text starts with `boothdesk error:`.

## How forwarding works

The first forwarded call opens a session: an `initialize` request (protocol version `2025-03-26`), followed by a `notifications/initialized` notification, then the `tools/call` itself. If the service answers the initialize request with an `Mcp-Session-Id` header, that value is carried on every later request, and the open session is reused for the rest of the process. Replies are accepted either as plain JSON or as server-sent events. Successful results pass through verbatim, including any `isError` flag and any extra fields the service includes.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The test suite checks the served tool list against the captured surface (all 22 tools, deep-equal, in order, titles included and no `required` key added to the nine tools that carry none), exercises the session handshake and its reuse, verifies that no `Authorization` header is ever sent under any environment, and verifies that arguments go upstream untouched and results come back untouched.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
