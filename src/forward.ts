/**
 * boothdesk core: a forwarding client for the hosted
 * Dreambooth Studio MCP server.
 *
 * No photobooth business data is held on this machine.
 * tools/list is answered from the literal definitions
 * below, which reproduce a live capture of the upstream
 * server word for word (name, title, description and
 * inputSchema exactly as captured; nine tools --
 * connect_account, connection_status, get_sessions,
 * get_gallery_stats, list_projects, get_revenue_summary,
 * get_credits, get_wallet_transactions and
 * check_generation -- carry no `required` key in their
 * inputSchema, so none is served for them). A tools/call
 * travels upstream over a streamable-HTTP JSON-RPC
 * session: an initialize POST, a
 * notifications/initialized POST, then the tools/call
 * POST, carrying the Mcp-Session-Id response header on
 * later requests when the upstream issues one. The
 * session opens lazily on the first forwarded call and
 * is reused for the client's lifetime.
 *
 * The endpoint is pinned to
 * https://mcp.dreamboothstudio.com/mcp and may be
 * replaced with the DREAMBOOTH_MCP_URL environment
 * variable (that override is a labelled reconstruction).
 * The registry record declares NO headers on the
 * upstream remote, so no auth header is ever sent,
 * under any environment.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures -- an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch
 * that throws or times out -- become an isError result
 * whose text begins with `boothdesk error:` (that
 * rendering is a labelled reconstruction). Replies may
 * be plain JSON or SSE (`data:` lines); the JSON-RPC
 * message whose id matches the request wins.
 *
 * Full surface: all 22 captured tools are built here;
 * no omissions.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://mcp.dreamboothstudio.com/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/dreambooth-tools-original.json;         */
/* generated programmatically by parsing and re-serialising the        */
/* fixture JSON, never retyped)                                        */
/* ------------------------------------------------------------------ */

export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "connect_account",
    "title": "Connect a Dreambooth account",
    "description": "Connect this conversation to the person's Dreambooth Studio account. The answer's status says what happened. already_connected: an account is connected; nothing to do. awaiting_approval: it returns a link the person opens in their own browser to sign in with Google and approve. A Google account with the same email as an existing Dreambooth account connects that account. Ask them to open it and say when they are done; do not call this tool again while waiting. use_client_sign_in: this client connects accounts through its own app or connector settings, where they can sign in with an email and password or with Google, so no link is returned. Ask them to connect Dreambooth there (the client also asks by itself when a tool needs an account), then repeat their question. Either way, someone who has no Dreambooth account yet gets one when they sign in. Call this when another tool reports that no account is connected, or when someone asks to connect or switch accounts.",
    "inputSchema": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {}
    }
  },
  {
    "name": "connection_status",
    "title": "Check Dreambooth connection",
    "description": "Whether this conversation currently has a Dreambooth account connected, and which one. Call this if you are unsure whether to run connect_account first. Cheap and read-only — it does not contact Dreambooth.",
    "inputSchema": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {}
    }
  },
  {
    "name": "get_sessions",
    "title": "Get photo sessions",
    "description": "List the photo sessions recorded on this operator's booths, with totals. Call this when the operator asks how busy a booth has been, how many sessions ran in a period, or wants to inspect individual sessions. Supports date ranges, per-booth filtering, payment status and payment channel. For money totals rather than session counts, use get_revenue_summary instead.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "startDate": {
          "type": "string",
          "description": "ISO date (YYYY-MM-DD) for the start of the range, inclusive"
        },
        "endDate": {
          "type": "string",
          "description": "ISO date (YYYY-MM-DD) for the end of the range, inclusive"
        },
        "projectIds": {
          "type": "string",
          "description": "Comma-separated project ids to limit the range to specific booths"
        },
        "transactionStatus": {
          "type": "string",
          "description": "Payment status filter, e.g. settlement, pending"
        },
        "sessionStatus": {
          "type": "string",
          "description": "Session status filter"
        },
        "paymentSource": {
          "type": "string",
          "description": "Payment channel, e.g. gateway, cash-voucher, discount-voucher"
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "description": "How many sessions to return (default 20, max 100)"
        }
      },
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_gallery_stats",
    "title": "Get gallery statistics",
    "description": "How much media this operator's booths have produced: total, still active, and expired past the retention window. Call this when the operator asks how many photos or videos a booth has taken, or whether media is being lost to retention. Returns counts only, not the media itself.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Limit to one booth. Omit for every booth this operator owns."
        },
        "includeExpired": {
          "type": "boolean",
          "description": "Count media past its retention window too (default false)"
        }
      },
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "search_docs",
    "title": "Search Dreambooth documentation",
    "description": "Search the Dreambooth Studio documentation and FAQ. Call this before answering any question about the product, hardware, printing, booth setup, guest payments, or troubleshooting — answer from the docs rather than from memory. Pages about Dreambooth's own plans and billing come back as a link only: share the link, and do not quote prices, plans or trials in the conversation. Works without a connected account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "minLength": 2,
          "maxLength": 200,
          "description": "Search terms, in English or Indonesian"
        },
        "locale": {
          "type": "string",
          "enum": [
            "en",
            "id"
          ],
          "description": "Docs language (default en)"
        },
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 10,
          "description": "Max results (default 5)"
        }
      },
      "required": [
        "query"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "list_projects",
    "title": "List booths",
    "description": "List the photobooth projects this operator owns, with id, name, public link slug, whether it is active, and its currency. Call this first whenever the operator names a booth — you need the project id to filter any other tool by booth. Does not return booth designs or page layouts.",
    "inputSchema": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {}
    }
  },
  {
    "name": "get_project",
    "title": "Get one booth in detail",
    "description": "Full detail for a single booth: its name, public link, currency, screen size, and the live status of the device running it — whether it is online, when it was last seen, app version, and camera/printer/internet state. Call this when the operator asks about one specific booth, or whether a booth is working. Get the project id from list_projects first.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "description": "Project id from list_projects"
        }
      },
      "required": [
        "projectId"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_revenue_summary",
    "title": "Get revenue summary",
    "description": "Business revenue from this operator's photobooth sessions across EVERY payment channel — gateway payments, cash vouchers (cash collected at the booth) and discount vouchers — grouped by month or day and by currency, with extra-print revenue and AI-effect purchases reported separately. Use this for any question about income, revenue or omzet. It is also the right tool when wallet earnings look too small: cash and voucher money never reaches the wallet ledger, so for operators who take cash the wallet figure legitimately understates income.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "groupBy": {
          "type": "string",
          "enum": [
            "month",
            "day"
          ],
          "description": "Bucket size (default month)"
        },
        "from": {
          "type": "string",
          "description": "Start date, ISO YYYY-MM-DD. Omit for all time."
        },
        "to": {
          "type": "string",
          "description": "End date, ISO YYYY-MM-DD. Omit for all time."
        }
      },
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_credits",
    "title": "Get AI credits and plan",
    "description": "This operator's remaining AI credit balance and their current subscription plan, including when it ends. Call this when they ask how many credits are left, whether they can still run AI effects, or what plan they are on. Credits are separate from wallet money — do not confuse the two.",
    "inputSchema": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "properties": {}
    }
  },
  {
    "name": "get_wallet_transactions",
    "title": "Get wallet transactions",
    "description": "This operator's wallet ledger: gateway earnings, withdrawals and refunds, newest first. Use for questions about the wallet, payouts or withdrawals. Do NOT use it to answer 'how much did I earn' — the wallet excludes cash and voucher income entirely, so for operators who take cash it understates real revenue. Use get_revenue_summary for income.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "limit": {
          "type": "integer",
          "minimum": 1,
          "maximum": 50,
          "description": "Max rows (default 10)"
        },
        "from": {
          "type": "string",
          "description": "Start date, ISO YYYY-MM-DD"
        },
        "to": {
          "type": "string",
          "description": "End date, ISO YYYY-MM-DD"
        }
      },
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_filter",
    "title": "Create a photo filter",
    "description": "Create a new photo filter on this operator's account from a description of the look they want — 'warm and slightly faded', 'high contrast black and white'. Translate the description into the adjustment numbers yourself; the ranges are in the schema. Call this only when the operator asks for a filter to be CREATED. It does not change an existing filter, and there is no tool that does — to edit or delete one, send them to the dashboard. Creating the same filter twice makes two filters, so do not retry a call that may have gone through.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80,
          "description": "What the operator will see in their filter list. Use their words if they named it; otherwise a short descriptive name, not 'Untitled'."
        },
        "adjustments": {
          "type": "object",
          "properties": {
            "brightness": {
              "type": "number",
              "minimum": 0,
              "maximum": 200,
              "description": "100 = unchanged"
            },
            "contrast": {
              "type": "number",
              "minimum": 0,
              "maximum": 200,
              "description": "100 = unchanged"
            },
            "saturation": {
              "type": "number",
              "minimum": 0,
              "maximum": 200,
              "description": "100 = unchanged, 0 = grey"
            },
            "temperature": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged, positive = warmer"
            },
            "tint": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged, positive = magenta"
            },
            "exposure": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "shadows": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged, positive = lifted"
            },
            "highlights": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "whites": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "blacks": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "vibrance": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "clarity": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "dehaze": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "sepia": {
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "description": "0 = off"
            },
            "grayscale": {
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "description": "0 = off, 100 = black and white"
            },
            "vignette": {
              "type": "number",
              "minimum": 0,
              "maximum": 200,
              "description": "0 = off"
            },
            "grain": {
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "description": "0 = off"
            },
            "blur": {
              "type": "number",
              "minimum": 0,
              "maximum": 10,
              "description": "0 = off, in pixels"
            },
            "hueRotate": {
              "type": "number",
              "minimum": 0,
              "maximum": 360,
              "description": "0 = unchanged, in degrees"
            }
          },
          "additionalProperties": false,
          "description": "Only include what the operator asked to change. An omitted adjustment keeps its neutral value; sending every field at its neutral value creates a filter that does nothing."
        },
        "isPublic": {
          "type": "boolean",
          "description": "Leave unset unless the operator explicitly asks for the filter to be shared. Default is private to their account."
        }
      },
      "required": [
        "name",
        "adjustments"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "duplicate_project",
    "title": "Duplicate a booth",
    "description": "Copy one of this operator's existing booths, with all of its settings, into a new one. Use it when they want another booth 'like' one they already run — a second location, a one-off event, a variant to experiment on. Call list_projects first to get the project id; the operator will name the booth, not its id. The copy is named after the original and is not published at the original's public address, so it is safe to make and they can rename it in the dashboard. To design a NEW booth from a description, use start_booth instead of this; there is no tool that edits or deletes a booth that already exists.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "projectId": {
          "type": "string",
          "minLength": 1,
          "description": "The id of the booth to copy, from list_projects. Not its name or slug."
        }
      },
      "required": [
        "projectId"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "start_frame",
    "title": "Start designing a photo frame",
    "description": "Start designing a new photo frame for this operator's booths from a description of the look they want — 'batik motifs in warm gold', 'minimal Scandinavian, lots of white space'. It opens a design thread and makes the FIRST version. It returns immediately with a job id; call check_generation to see the result, and do NOT describe the frame as made until that says so. The result is a preview in the thread — nothing is in the operator's frame list until save_frame is called with the generation they choose. To change a result, call refine_frame with the threadId that check_generation returns, rather than starting again. Every generation spends part of the account's free daily allowance, so do not call this speculatively, twice for the same request, or while another generation is still running.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "prompt": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4000,
          "description": "What the frame should look like, in the operator's own words where possible: decoration, colour, mood, occasion. Not the photo slots — those come from the layout. Do not name brands, characters or franchises; the image model refuses them."
        },
        "layout": {
          "type": "string",
          "enum": [
            "strip-3",
            "strip-4",
            "grid-4",
            "hero-3",
            "pair-2"
          ],
          "description": "How many photos and how they sit. 'strip-3': the classic photo strip — 3 photos stacked, printed as a pair on a 4x6; 'strip-4': a taller strip — 4 photos stacked, printed as a pair on a 4x6; 'grid-4': 4 photos in a 2x2 grid on one 4x6; 'hero-3': one large photo with two smaller ones beneath it; 'pair-2': two landscape photos, one above the other. Ask if it is not obvious from what the operator said; 'strip-3' is what most people mean by a photobooth strip."
        },
        "shape": {
          "type": "string",
          "enum": [
            "rect",
            "rounded",
            "circle",
            "oval",
            "square"
          ],
          "description": "The shape the photos are cut to. Defaults to rectangular. Not every layout comes in every shape; the Studio picks the closest available."
        }
      },
      "required": [
        "prompt",
        "layout"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "refine_frame",
    "title": "Refine a photo frame design",
    "description": "Ask for a changed version of a frame in an existing design thread — 'darker', 'less ornament', 'make the flowers smaller', 'more gold'. Call it with the threadId that check_generation returned for start_frame, and ONLY when the operator asks for a change: every call spends part of the account's free daily allowance, so never iterate on your own initiative. It returns immediately with a job id; call check_generation for the new preview. Earlier versions in the thread stay available to save_frame, so a change the operator dislikes loses nothing.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "threadId": {
          "type": "string",
          "minLength": 1,
          "description": "The design thread, from check_generation's result for start_frame."
        },
        "prompt": {
          "type": "string",
          "minLength": 1,
          "maxLength": 4000,
          "description": "What to change, in the operator's words. It is read with the whole thread as context, so 'the same but darker' works; there is no need to repeat the original description."
        }
      },
      "required": [
        "threadId",
        "prompt"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "check_generation",
    "title": "Check background work",
    "description": "Report on background work started by start_frame, refine_frame, start_booth, refine_booth or create_booth. Always pass the jobId that the start/refine/create call returned — keep it for the rest of the conversation, because an id keeps working for the full 15 minutes even if the connection re-authenticates partway through, and calling with no arguments does not. With no arguments it reports the most recent job of any kind, which is a convenience for when the id was lost, not the normal way to call it. Designing a booth takes 1-3 minutes, a redraw about a minute, creating a booth 2-6 minutes: tell the operator that, then poll about every 15 seconds. While it says 'running', nothing exists yet — relay the progress line if there is one, tell the operator it is still going, and wait 10-15 seconds before calling again rather than polling tightly. When it says 'done': a frame job carries imageUrl, threadId and generationId (a preview — nothing saved until save_frame); a booth design carries draft{…} (a draft — nothing created until create_booth); a booth creation carries booth{slug, boothUrl, projectId} — the one case where something now exists. This reads a status and creates nothing, so it is always safe to call.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "jobId": {
          "type": "string",
          "description": "The id a start/refine/create tool returned. Pass it whenever you have it. Omit only if it was lost, which falls back to the most recent job listed for this connection."
        }
      },
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "save_frame",
    "title": "Save a generated frame",
    "description": "Save one generation from a design thread as a real frame in this operator's frame list, with its photo windows cut out. Call it only when the operator has chosen a result — pass the threadId and generationId that check_generation returned for it. This CREATES a frame: saving the same generation twice makes two frames, so do not retry a call that may have gone through. The frame is private to the account unless the operator explicitly asks for it to be shared. After saving, the operator picks the frame in a booth's frame settings; this tool does not assign it to a booth, and there is no tool that edits or deletes a frame.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "threadId": {
          "type": "string",
          "minLength": 1,
          "description": "The design thread the generation belongs to."
        },
        "generationId": {
          "type": "string",
          "minLength": 1,
          "description": "The generation to save, from check_generation. Each version in a thread has its own id."
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80,
          "description": "What the operator will see in their frame list. Use their words if they named it; otherwise derived from the description."
        },
        "isPublic": {
          "type": "boolean",
          "description": "Leave unset unless they explicitly ask to share it. Default is private to their account."
        }
      },
      "required": [
        "threadId",
        "generationId"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "preview_filter",
    "title": "Preview a photo filter",
    "description": "Show what a filter would look like BEFORE creating it: the Studio renders its sample photo (or the operator's own preview photo, if they set one in the dashboard) through the exact pipeline the booth uses, and returns an image URL. Free and read-only — call it whenever the operator is designing a filter, adjust the numbers from their reaction ('warmer', 'less contrast'), preview again, and call create_filter with the same adjustments only once they are happy. Some adjustments (shadows, highlights, whites, blacks, clarity, dehaze, vibrance, texture) are applied by the booth but cannot be shown here; the result lists them as notPreviewed so you can say so. Nothing is created by this tool.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "adjustments": {
          "type": "object",
          "properties": {
            "brightness": {
              "type": "number",
              "minimum": 0,
              "maximum": 200,
              "description": "100 = unchanged"
            },
            "contrast": {
              "type": "number",
              "minimum": 0,
              "maximum": 200,
              "description": "100 = unchanged"
            },
            "saturation": {
              "type": "number",
              "minimum": 0,
              "maximum": 200,
              "description": "100 = unchanged, 0 = grey"
            },
            "temperature": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged, positive = warmer"
            },
            "tint": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged, positive = magenta"
            },
            "exposure": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "shadows": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged, positive = lifted"
            },
            "highlights": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "whites": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "blacks": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "vibrance": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "clarity": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "dehaze": {
              "type": "number",
              "minimum": -100,
              "maximum": 100,
              "description": "0 = unchanged"
            },
            "sepia": {
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "description": "0 = off"
            },
            "grayscale": {
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "description": "0 = off, 100 = black and white"
            },
            "vignette": {
              "type": "number",
              "minimum": 0,
              "maximum": 200,
              "description": "0 = off"
            },
            "grain": {
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "description": "0 = off"
            },
            "blur": {
              "type": "number",
              "minimum": 0,
              "maximum": 10,
              "description": "0 = off, in pixels"
            },
            "hueRotate": {
              "type": "number",
              "minimum": 0,
              "maximum": 360,
              "description": "0 = unchanged, in degrees"
            }
          },
          "additionalProperties": false,
          "description": "Only include what the operator asked to change. An omitted adjustment keeps its neutral value; sending every field at its neutral value creates a filter that does nothing."
        }
      },
      "required": [
        "adjustments"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "start_booth",
    "title": "Design a new booth",
    "description": "Design a complete photobooth (a 'booth') for this operator from a description — the Studio designs the welcome screen for phone and laptop, the in-booth background, the colour theme, the capture mode, a title and a link name, exactly as dreambooth.app/new does. Before calling, gather in chat what /new would ask and put ALL of it in the prompt: the occasion or business, the vibe or style, colours, and the language the booth should speak — there is no separate questions step. It returns a job id immediately; call check_generation, and do NOT describe the booth as designed or created until that says done. The result is a DRAFT with a draftId: nothing is in the operator's booth list until create_booth. Every call makes a new draft and spends 1 of its 3 full generations, and an account may start 10 drafts an hour — never call it speculatively or twice for one request; change a draft with refine_booth instead.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "prompt": {
          "type": "string",
          "minLength": 3,
          "maxLength": 1000,
          "description": "The booth, in the operator's words plus what you gathered: occasion or business, vibe and style, colours, mood, anything that must appear. Up to 1000 characters. Do not name brands, characters or franchises; the image model refuses them."
        },
        "language": {
          "type": "string",
          "minLength": 2,
          "maxLength": 10,
          "description": "The language the booth's own text should be in, as a code: 'id', 'en', 'es'. Defaults to English — ask if the operator's booth is not in English."
        }
      },
      "required": [
        "prompt"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "refine_booth",
    "title": "Refine a booth draft",
    "description": "Change a booth draft from start_booth, using the draftId check_generation returned. what='welcome' redraws the welcome screen from an instruction ('warmer colours', 'bigger headline', 'less clutter') while keeping the design; add orientation 'phone' or 'laptop' to redraw only that screen (1 redraw) — without it both screens are redrawn (2). what='app-background' redraws the calmer backdrop behind the rest of the booth (1 redraw). what='everything' rebuilds the whole draft from a NEW full description (spends 1 of the draft's 3 full generations) — only when the operator wants a different booth, not a tweak. A draft has 5 redraws in total; check_generation reports what is left. Title, headline, link name and colours cannot be edited directly: they change only through a redraw instruction, or at create time (title, slug). Returns a job id; call check_generation. Call only when the operator asks for a change — never iterate on your own.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "draftId": {
          "type": "string",
          "pattern": "^dft_[a-f0-9]{24}$",
          "description": "The draft to change, from check_generation's result for start_booth."
        },
        "what": {
          "type": "string",
          "enum": [
            "welcome",
            "app-background",
            "everything"
          ],
          "description": "Which part to change. 'everything' is a full rebuild from a new description."
        },
        "instruction": {
          "type": "string",
          "minLength": 1,
          "maxLength": 1000,
          "description": "For 'welcome' / 'app-background': what to change, in the operator's words, up to 300 characters — the current design is kept and only this is applied. For 'everything': the new full description of the booth, up to 1000 characters."
        },
        "orientation": {
          "type": "string",
          "enum": [
            "phone",
            "laptop"
          ],
          "description": "Only with what='welcome': redraw just the phone (portrait) or laptop (landscape) screen. Omit to redraw both."
        }
      },
      "required": [
        "draftId",
        "what",
        "instruction"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "create_booth",
    "title": "Create the booth",
    "description": "Create the booth from a finished draft — the step that makes something real, live at its public link. Call it only after the operator has seen the draft via check_generation and agreed to create it; the title and link name (slug) default to the draft's unless the operator chose others. It reads the draft first (so everything set with update_booth_draft — settings, frames, filters, AI effect — is carried), checks the link name, draws the booth's own three photo-strip frames (3 images, up to five minutes), adds three starter frames from the catalogue and the Studio's default 'Normal' filter the way dreambooth.app/new does, then creates the booth with the draft's welcome design, background, colour theme and capture mode. Frames saved with save_frame and filters made with create_filter on this connection are carried automatically; ids can also be passed. Tell the operator it takes 2-6 minutes. Returns a job id; check_generation reports progress and, when done, the booth's public link, id and a dashboard link. If the link name is taken it stops before drawing anything — ask for another and call again. Creating twice with different link names makes two booths. The booth is live (unlisted) at once; there is no tool that edits or deletes a booth — changes happen in the dashboard.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "draftId": {
          "type": "string",
          "pattern": "^dft_[a-f0-9]{24}$",
          "description": "The draft to create, from check_generation."
        },
        "title": {
          "type": "string",
          "minLength": 2,
          "maxLength": 80,
          "description": "The booth's name. Leave unset to use the draft's title (as shown by check_generation / set with update_booth_draft)."
        },
        "slug": {
          "type": "string",
          "minLength": 3,
          "maxLength": 44,
          "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          "description": "The link name: lowercase letters, digits and single hyphens (dreambooth.app/<slug>). Leave unset to use the draft's proposed slug."
        },
        "captureMode": {
          "type": "string",
          "enum": [
            "standard",
            "frame-based"
          ],
          "description": "Leave unset to keep what the draft proposed ('standard' = classic strip, 'frame-based' = frame mode)."
        },
        "aiEffectTitle": {
          "type": "string",
          "maxLength": 80,
          "description": "The title of a public AI effect to add, exactly as the operator named it. Leave unset for none."
        },
        "frameIds": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[a-f0-9]{24}$"
          },
          "maxItems": 20,
          "description": "Ids of frames to include — e.g. a frame the operator just saved with save_frame. Starter frames are added anyway."
        },
        "filterIds": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[a-f0-9]{24}$"
          },
          "maxItems": 20,
          "description": "Ids of filters to include — e.g. one the operator just made with create_filter. The default 'Normal' filter is added anyway."
        }
      },
      "required": [
        "draftId"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "get_booth_draft",
    "title": "Read a booth draft",
    "description": "Read a booth draft by its draftId — the same summary check_generation gives for a finished design, plus everything the draft has been given since (settings, chosen frames, filters, AI effect). Use it when the job from start_booth is no longer tracked, to show the draft again before create_booth, or to confirm what update_booth_draft applied. Reads only; nothing is generated or created. A draft lives 7 days on the operator's account.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "draftId": {
          "type": "string",
          "pattern": "^dft_[a-f0-9]{24}$",
          "description": "The draft, from check_generation or a previous tool result."
        }
      },
      "required": [
        "draftId"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "update_booth_draft",
    "title": "Change a booth draft's settings",
    "description": "Change a booth draft without a redraw: its title, link name, welcome button text, colours, capture mode, language, which frames and filters it carries, its AI effect, and the page settings the dashboard editor offers (photo count, countdown, timeouts, GIF/recording, retake, checkout, payment, result). Use it after check_generation shows the draft and the operator asks for one of these; what it sets is applied when create_booth runs. It cannot change the welcome headline or subtext of an AI-designed welcome (those are painted into the image — use refine_booth), and prices or packages are set in the dashboard. Answers at once with the updated draft, `applied` (what landed) and `rejected` (what did not, and why) — relay a rejection as a sentence, never as success. It never touches a booth that already exists.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "draftId": {
          "type": "string",
          "pattern": "^dft_[a-f0-9]{24}$",
          "description": "The draft to change, from check_generation or get_booth_draft."
        },
        "title": {
          "type": "string",
          "minLength": 2,
          "maxLength": 80,
          "description": "The booth's name (used as the title at create time)."
        },
        "slug": {
          "type": "string",
          "minLength": 3,
          "maxLength": 44,
          "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          "description": "The proposed link name (dreambooth.app/<slug>): lowercase letters, digits, single hyphens. Checked for availability; a taken one is reported, not stored."
        },
        "buttonText": {
          "type": "string",
          "minLength": 1,
          "maxLength": 32,
          "description": "The welcome screen's button label, e.g. 'Mulai' or 'Start'."
        },
        "headline": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80,
          "description": "Welcome headline. Only drafts whose welcome is laid out as text accept it; on an AI-designed welcome it is painted into the image and the reply says to use refine_booth."
        },
        "subtext": {
          "type": "string",
          "minLength": 1,
          "maxLength": 140,
          "description": "Welcome subtext; same rule as headline."
        },
        "language": {
          "type": "string",
          "minLength": 2,
          "maxLength": 10,
          "description": "Language code of the booth's own text: 'id', 'en', 'es'."
        },
        "captureMode": {
          "type": "string",
          "enum": [
            "standard",
            "frame-based"
          ],
          "description": "'standard' = classic strip, 'frame-based' = frame mode."
        },
        "palette": {
          "type": "object",
          "properties": {
            "primaryColor": {
              "type": "string",
              "pattern": "^#[0-9a-fA-F]{6}$"
            },
            "secondaryColor": {
              "type": "string",
              "pattern": "^#[0-9a-fA-F]{6}$"
            },
            "backgroundColor": {
              "type": "string",
              "pattern": "^#[0-9a-fA-F]{6}$"
            }
          },
          "additionalProperties": false,
          "description": "Theme colours as #RRGGBB: primaryColor, secondaryColor, backgroundColor. Only the ones given change."
        },
        "frameIds": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[a-f0-9]{24}$"
          },
          "maxItems": 20,
          "description": "Frames the booth should carry (replaces the draft's list): e.g. one saved with save_frame, or catalogue ids. create_booth adds starter frames anyway."
        },
        "filterIds": {
          "type": "array",
          "items": {
            "type": "string",
            "pattern": "^[a-f0-9]{24}$"
          },
          "maxItems": 20,
          "description": "Filters the booth should carry (replaces the draft's list): e.g. one made with create_filter. The default 'Normal' is added anyway."
        },
        "aiEffectTitle": {
          "type": "string",
          "maxLength": 80,
          "description": "The title of a public AI effect to add, exactly as the operator named it; an empty string removes the one chosen before."
        },
        "settings": {
          "type": "object",
          "properties": {
            "welcome": {
              "type": "object",
              "properties": {
                "startWithPayment": {
                  "type": "boolean"
                }
              },
              "additionalProperties": false
            },
            "capture": {
              "type": "object",
              "properties": {
                "captureCount": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 10
                },
                "captureCountdown": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 15
                },
                "prepTimeout": {
                  "type": "integer",
                  "minimum": 5,
                  "maximum": 300
                },
                "captureTimeout": {
                  "type": "integer",
                  "minimum": 30,
                  "maximum": 1800
                },
                "selfPhotoDuration": {
                  "type": "integer",
                  "minimum": 30,
                  "maximum": 1800
                },
                "gifEnabled": {
                  "type": "boolean"
                },
                "gifSpeed": {
                  "type": "integer",
                  "minimum": 200,
                  "maximum": 5000
                },
                "recordingEnabled": {
                  "type": "boolean"
                },
                "recordingSpeed": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 4
                }
              },
              "additionalProperties": false
            },
            "retake": {
              "type": "object",
              "properties": {
                "enabled": {
                  "type": "boolean"
                },
                "retakeTimeout": {
                  "type": "integer",
                  "minimum": 5,
                  "maximum": 600
                },
                "maxRetakeCount": {
                  "anyOf": [
                    {
                      "type": "integer",
                      "minimum": -1,
                      "maximum": 20
                    },
                    {
                      "type": "null"
                    }
                  ]
                },
                "maxRetakeSession": {
                  "anyOf": [
                    {
                      "type": "integer",
                      "minimum": -1,
                      "maximum": 20
                    },
                    {
                      "type": "null"
                    }
                  ]
                }
              },
              "additionalProperties": false
            },
            "select": {
              "type": "object",
              "properties": {
                "enabled": {
                  "type": "boolean"
                },
                "selectionTimeout": {
                  "type": "integer",
                  "minimum": 10,
                  "maximum": 600
                }
              },
              "additionalProperties": false
            },
            "frame": {
              "type": "object",
              "properties": {
                "displayFrameTitle": {
                  "type": "boolean"
                }
              },
              "additionalProperties": false
            },
            "filter": {
              "type": "object",
              "properties": {
                "enabled": {
                  "type": "boolean"
                },
                "useLivePreview": {
                  "type": "boolean"
                },
                "applyAfterCapture": {
                  "type": "boolean"
                }
              },
              "additionalProperties": false
            },
            "checkout": {
              "type": "object",
              "properties": {
                "enabled": {
                  "type": "boolean"
                },
                "checkoutTimeout": {
                  "type": "integer",
                  "minimum": 10,
                  "maximum": 600
                },
                "promoEnabled": {
                  "type": "boolean"
                }
              },
              "additionalProperties": false
            },
            "payment": {
              "type": "object",
              "properties": {
                "enabled": {
                  "type": "boolean"
                },
                "paymentTimeout": {
                  "type": "integer",
                  "minimum": 30,
                  "maximum": 900
                }
              },
              "additionalProperties": false
            },
            "result": {
              "type": "object",
              "properties": {
                "resultTimeout": {
                  "type": "integer",
                  "minimum": 10,
                  "maximum": 600
                },
                "askUserConsent": {
                  "type": "boolean"
                },
                "emailEnabled": {
                  "type": "boolean"
                },
                "reprintEnabled": {
                  "type": "boolean"
                },
                "reprintTimeout": {
                  "type": "integer",
                  "minimum": 10,
                  "maximum": 600
                }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false,
          "description": "Page settings, as the dashboard editor has them, keyed by page: welcome{startWithPayment}, capture{captureCount 1-10, captureCountdown 1-15, prepTimeout, captureTimeout, selfPhotoDuration, gifEnabled, gifSpeed, recordingEnabled, recordingSpeed}, retake{enabled, retakeTimeout, maxRetakeCount, maxRetakeSession}, select{enabled, selectionTimeout}, frame{displayFrameTitle}, filter{enabled, useLivePreview, applyAfterCapture}, checkout{enabled, checkoutTimeout, promoEnabled}, payment{enabled, paymentTimeout}, result{resultTimeout, askUserConsent, emailEnabled, reprintEnabled, reprintTimeout}. Prices and packages are set in the dashboard, not here."
        }
      },
      "required": [
        "draftId"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  }
];

export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured built surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `boothdesk error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class BoothdeskClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).DREAMBOOTH_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    // The registry record declares NO headers on the upstream
    // remote: no Authorization header is ever sent.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "boothdesk", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): BoothdeskClient {
  return new BoothdeskClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new BoothdeskClient(deps).callTool(name, args);
}
