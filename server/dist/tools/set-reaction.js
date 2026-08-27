import { z } from "zod";

/**
 * Normalize emoji for chat.react: API accepts with or without colons;
 * we strip surrounding colons so ":eyes:" and "eyes" are the same.
 * @param {string} raw
 * @returns {string}
 */
export function normalizeReactionEmoji(raw) {
  let s = String(raw ?? "").trim();
  if (s.length >= 2 && s.startsWith(":") && s.endsWith(":")) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export const setReactionInputShape = {
  message_id: z
    .string()
    .min(1)
    .describe(
      "Message id to react to (from get_room_history / get_thread_messages / get_message / post_message).",
    ),
  emoji: z
    .string()
    .min(1)
    .describe(
      'Emoji shortname, with or without colons (e.g. "eyes" or ":eyes:"). Must exist on the server.',
    ),
  should_react: z
    .boolean()
    .optional()
    .describe(
      "true (default) = add reaction; false = remove this user's reaction. Always sent to the API (no toggle) so retries are idempotent.",
    ),
};

const inputSchema = z.object(setReactionInputShape);

export const setReactionDescription =
  "WRITES TO ROCKET.CHAT: adds or removes the authenticated user's emoji reaction on a message (chat.react). " +
  "Do not call without explicit user intent. Pass message_id + emoji (shortname, optional colons). " +
  "should_react defaults to true (add); set false to remove. Prefer get_message afterwards to verify. " +
  "Does not post a chat message — only a reaction.";

export async function setReaction(client, input) {
  const parsed = inputSchema.parse(input);
  const emoji = normalizeReactionEmoji(parsed.emoji);
  if (!emoji) {
    throw new Error("emoji must be a non-empty shortname (e.g. eyes or :eyes:)");
  }
  const shouldReact = parsed.should_react !== false;
  const body = {
    messageId: parsed.message_id,
    emoji,
    shouldReact,
  };
  console.error(`[WRITE] chat.react ${JSON.stringify(body)}`);
  const res = await client.request("POST", "/api/v1/chat.react", { body });
  return {
    success: res.success !== false,
    message_id: parsed.message_id,
    emoji,
    reacted: shouldReact,
  };
}
