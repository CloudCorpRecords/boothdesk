# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the hosted Dreambooth Studio MCP server. All 22 captured tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: `connect_account`, `connection_status`, `get_sessions`, `get_gallery_stats`, `search_docs`, `list_projects`, `get_project`, `get_revenue_summary`, `get_credits`, `get_wallet_transactions`, `create_filter`, `duplicate_project`, `start_frame`, `refine_frame`, `check_generation`, `save_frame`, `preview_filter`, `start_booth`, `refine_booth`, `create_booth`, `get_booth_draft`, `update_booth_draft`. Full surface, no omissions. Each tool carries the capture's `title` key; `connect_account`, `connection_status`, `get_sessions`, `get_gallery_stats`, `list_projects`, `get_revenue_summary`, `get_credits`, `get_wallet_transactions` and `check_generation` carry no `required` key in the capture and none is served.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `boothdesk error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `DREAMBOOTH_MCP_URL`. The upstream record declares no headers, so no auth header is ever sent.
