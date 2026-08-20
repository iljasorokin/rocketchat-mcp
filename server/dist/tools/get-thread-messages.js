import { z } from "zod";
import { stripMessage, computeTailOffset } from "./message.js";

export const getThreadMessagesInputShape = {
  thread_id: z
    .string()
    .min(1)
    .describe(
      "Id of the **root** message of the thread (= tmid / parent message id). Same field as post_message thread_id.",
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe("RC count when not using tail (default 50, max 200)."),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      "RC offset from the start of the thread (oldest-first API). Ignored when tail is set.",
    ),
  tail: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe(
      "Return the last N replies (preferred for incident walkthroughs). MCP probes total then sets offset = max(0, total - tail). Mutually exclusive with offset — when set, offset is ignored.",
    ),
  newest_first: z
    .boolean()
    .optional()
    .describe(
      "If true, reverse the messages array in the response. RC API order is oldest-first (unlike get_room_history which is newest-first). Default false.",
    ),
  include_root: z
    .boolean()
    .optional()
    .describe(
      "If true (default), also fetch chat.getMessage for the root and return it as root. Set false to skip.",
    ),
  reaction_usernames: z
    .boolean()
    .optional()
    .describe(
      "If true, reactions are { count, usernames[] } per emoji. Default false = emoji→count only.",
    ),
};

export const getThreadMessagesDescription =
  "Reads replies in a Rocket.Chat thread by parent message id (thread_id). " +
  "Does **not** replace get_room_history — thread replies are not in room history. " +
  "Use after you have the root id from history/search. " +
  "RC returns messages oldest-first; set newest_first=true to reverse. " +
  "For the last N replies use tail (preferred over manual offset). " +
  "include_root (default true) adds the root message (reactions) via chat.getMessage.";

/**
 * Pure helper: resolve pagination from options + optional probe total.
 * Exported for unit tests.
 */
export function resolveThreadPagination(input, probeTotal) {
  if (input.tail != null) {
    const { offset, limit, total } = computeTailOffset(probeTotal ?? 0, input.tail);
    return {
      offset,
      limit,
      total,
      usedTail: true,
      needsProbe: probeTotal == null,
    };
  }
  return {
    offset: input.offset ?? 0,
    limit: input.limit ?? 50,
    total: probeTotal,
    usedTail: false,
    needsProbe: false,
  };
}

export async function getThreadMessages(client, input) {
  const reactionUsernames = Boolean(input.reaction_usernames);
  const includeRoot = input.include_root !== false;
  const newestFirst = Boolean(input.newest_first);

  let offset;
  let limit;
  let total;
  let usedTail = false;

  if (input.tail != null) {
    const probe = await client.request("GET", "/api/v1/chat.getThreadMessages", {
      query: { tmid: input.thread_id, count: 1, offset: 0 },
    });
    const page = resolveThreadPagination(input, probe.total ?? 0);
    offset = page.offset;
    limit = page.limit;
    total = page.total;
    usedTail = true;
  } else {
    offset = input.offset ?? 0;
    limit = input.limit ?? 50;
    total = undefined;
  }

  const res = await client.request("GET", "/api/v1/chat.getThreadMessages", {
    query: {
      tmid: input.thread_id,
      count: Math.max(limit, 1),
      offset,
    },
  });

  if (total == null) {
    total = res.total ?? (res.messages ?? []).length;
  }

  let messages = (res.messages ?? []).map((m) =>
    stripMessage(m, { reactionUsernames }),
  );
  if (newestFirst) {
    messages = [...messages].reverse();
  }

  let root = null;
  if (includeRoot) {
    try {
      const rootRes = await client.request("GET", "/api/v1/chat.getMessage", {
        query: { msgId: input.thread_id },
      });
      const raw = rootRes.message ?? rootRes;
      root = stripMessage(raw, { reactionUsernames });
    } catch {
      root = null;
    }
  }

  return {
    thread_id: input.thread_id,
    total,
    offset,
    limit,
    newest_first: newestFirst,
    tail: usedTail,
    root,
    messages,
  };
}
