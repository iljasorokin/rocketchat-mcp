import { z } from "zod";
import { stripMessage } from "./message.js";
export const searchMessagesInputShape = {
    room_id: z
        .string()
        .min(1)
        .describe("Opaque room identifier from list_my_rooms / list_unread. Required — there is no global search."),
    query: z
        .string()
        .min(1)
        .describe("Free-text search string. Matches message contents in the given room."),
    limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum number of results to return (default 30, max 200)."),
};
const inputSchema = z.object(searchMessagesInputShape);
export const searchMessagesDescription = "Full-text search WITHIN a specific room. Requires room_id — there is no global search across all rooms in this server. " +
    "To search a particular room first find it via list_my_rooms (look up room_id by name), then call this tool. " +
    "Returns matching messages in the same shape as get_room_history.";
export async function searchMessages(client, input) {
    const limit = input.limit ?? 30;
    const res = await client.request("GET", "/api/v1/chat.search", {
        query: {
            roomId: input.room_id,
            searchText: input.query,
            count: limit,
        },
    });
    return {
        room_id: input.room_id,
        query: input.query,
        messages: (res.messages ?? []).map(stripMessage),
    };
}
//# sourceMappingURL=search-messages.js.map