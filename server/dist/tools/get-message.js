import { z } from "zod";
import { stripMessage } from "./message.js";

export const getMessageInputShape = {
  message_id: z
    .string()
    .min(1)
    .describe(
      "Message id (thread root or any message). Same opaque id as in get_room_history / get_thread_messages.",
    ),
  reaction_usernames: z
    .boolean()
    .optional()
    .describe(
      "If true, reactions are { count, usernames[] } per emoji. Default false = emoji→count only.",
    ),
};

export const getMessageDescription =
  "Reads a single Rocket.Chat message by id (thread root or any message). " +
  "Use for reactions on the root and for verifying a post. " +
  "Prefer get_thread_messages when you need the discussion tail.";

export async function getMessage(client, input) {
  const res = await client.request("GET", "/api/v1/chat.getMessage", {
    query: { msgId: input.message_id },
  });
  const raw = res.message ?? res;
  return {
    message: stripMessage(raw, {
      reactionUsernames: Boolean(input.reaction_usernames),
    }),
  };
}
