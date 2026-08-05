import { z } from "zod";
import { buildRow, fetchAllRooms, fetchSubscriptionMap, sortByLastMessageDesc, } from "./room-source.js";
export const listUnreadInputShape = {
    mentions_only: z
        .boolean()
        .optional()
        .describe("If true, only return rooms where you have unread @-mentions (userMentions > 0)."),
};
const inputSchema = z.object(listUnreadInputShape);
export const listUnreadDescription = "Lists rooms with unread messages or unread mentions. Use this for 'what needs my attention right now'. " +
    "Use list_my_rooms instead if you want to see all rooms regardless of unread state. " +
    "Returns one entry per room with room_id, room_type ('c'=channel, 'p'=private group, 'd'=direct message), " +
    "name, unread_count, mention_count, manually_marked_unread (true if you marked the room unread but there are no new messages), " +
    "last_message_at, last_message_preview. Sorted by last_message_at desc. " +
    "First call may take a few seconds: this server's Rocket.Chat does not expose a bulk subscriptions endpoint, " +
    "so per-room metadata is fetched in parallel.";
export async function listUnread(client, input) {
    const mentionsOnly = input.mentions_only ?? false;
    const rooms = await fetchAllRooms(client);
    const subs = await fetchSubscriptionMap(client, rooms.map((r) => r.rid));
    const rows = [];
    for (const room of rooms) {
        const sub = subs.get(room.rid);
        const unread = sub?.unread ?? 0;
        const mentions = sub?.userMentions ?? 0;
        const alert = sub?.alert ?? false;
        if (mentionsOnly) {
            if (mentions <= 0)
                continue;
        }
        else {
            // alert covers manually-marked-unread rooms (where Rocket.Chat sets
            // alert=true but leaves unread=0). Without this, "mark as unread"
            // from the UI is invisible to this tool.
            if (unread <= 0 && mentions <= 0 && !alert)
                continue;
        }
        rows.push(buildRow(room, sub));
    }
    return { rooms: sortByLastMessageDesc(rows) };
}
//# sourceMappingURL=list-unread.js.map