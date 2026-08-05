import { z } from "zod";
import { stripMessage } from "./message.js";
export const getRoomHistoryInputShape = {
    room_id: z
        .string()
        .min(1)
        .describe("Opaque room identifier from list_my_rooms / list_unread / get_user. NOT the human-readable room name."),
    limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum number of messages to return (default 50, max 200)."),
    before: z
        .string()
        .optional()
        .describe("ISO 8601 timestamp. Returns messages older than this — for pagination, pass the ts of the oldest message from the previous page."),
};
const inputSchema = z.object(getRoomHistoryInputShape);
export const getRoomHistoryDescription = "Reads recent messages from a room. Pass any room_id (channel, private group, or DM) — the room type is detected automatically (cached for the session). " +
    "Returns messages newest-first. Each message has id, ts, user{id,username,name}, msg, edited_at, attachments_count, reactions (emoji→count), is_thread, thread_count. " +
    "Use the 'before' parameter with the oldest message's ts to paginate further back in history.";
const HISTORY_PATH = {
    c: "/api/v1/channels.history",
    p: "/api/v1/groups.history",
    d: "/api/v1/im.history",
};
export async function getRoomHistory(client, input) {
    const limit = input.limit ?? 50;
    const roomType = await client.getRoomType(input.room_id);
    const path = HISTORY_PATH[roomType];
    const query = {
        roomId: input.room_id,
        count: limit,
    };
    if (input.before)
        query.latest = input.before;
    const res = await client.request("GET", path, { query });
    const messages = (res.messages ?? []).map(stripMessage);
    return { room_id: input.room_id, room_type: roomType, messages };
}
//# sourceMappingURL=get-room-history.js.map