import { z } from "zod";
export const postMessageInputShape = {
    room_id: z
        .string()
        .min(1)
        .describe("Opaque room identifier from list_my_rooms / list_unread / get_user. NOT the human-readable room name."),
    text: z
        .string()
        .min(1)
        .refine((s) => s.trim().length > 0, {
        message: "text must contain non-whitespace content",
    })
        .describe("Message body. Must contain non-whitespace content."),
    thread_id: z
        .string()
        .min(1)
        .optional()
        .describe("If set, post as a reply in this thread. Pass the parent message's id (from get_room_history)."),
};
const inputSchema = z.object(postMessageInputShape);
export const postMessageDescription = "WRITES TO ROCKET.CHAT: posts a new message to a room. Do not call without explicit user intent — this is a side-effecting tool. " +
    "IMPORTANT: Rocket.Chat does NOT deduplicate messages; if a call appears to fail, the message may still have been delivered, and retrying could post it twice. " +
    "If you're unsure, use get_room_history immediately afterwards to verify before retrying. " +
    "Pass an opaque room_id (from list_my_rooms / list_unread / get_user). Set thread_id to reply in a thread.";
export async function postMessage(client, input) {
    const text = input.text.trim();
    const body = {
        roomId: input.room_id,
        text,
    };
    if (input.thread_id)
        body.tmid = input.thread_id;
    // Always log to stderr regardless of DEBUG. Cheap audit trail for writes.
    console.error(`[WRITE] chat.postMessage ${JSON.stringify(body)}`);
    const res = await client.request("POST", "/api/v1/chat.postMessage", { body });
    const m = res.message ?? {};
    return {
        posted: true,
        message_id: m._id ?? "",
        room_id: m.rid ?? input.room_id,
        thread_id: m.tmid ?? null,
        ts: m.ts ?? null,
    };
}
//# sourceMappingURL=post-message.js.map