import { z } from "zod";
import { RocketChatApiError } from "../rocketchat-client.js";

export const setRoomAnnouncementInputShape = {
  room_id: z
    .string()
    .min(1)
    .describe(
      "Opaque room identifier from list_my_rooms / list_announcements / get_room_info. NOT the human-readable name.",
    ),
  announcement: z
    .string()
    .describe(
      "New announcement banner text. Pass empty string \"\" to clear the announcement.",
    ),
  confirm: z
    .literal(true)
    .describe(
      "Required safety gate. Must be true. Do not set announcements without explicit human intent — this is visible to everyone in the room.",
    ),
};

export const setRoomAnnouncementDescription =
  "WRITES TO ROCKET.CHAT: sets or clears the room **announcement** banner (not a chat message). " +
  "Requires confirm=true and edit-room permission. Works for public channels and private groups; DMs are not supported. " +
  "Empty announcement clears the banner. Prefer get_room_info first to show the current value. " +
  "Ask the human before changing duty/incident channel banners.";

const SET_PATH = {
  c: "/api/v1/channels.setAnnouncement",
  p: "/api/v1/groups.setAnnouncement",
};

export async function setRoomAnnouncement(client, input) {
  if (input.confirm !== true) {
    throw new Error('Refusing to set announcement: confirm must be true (explicit human intent).');
  }
  const roomType = await client.getRoomType(input.room_id);
  if (roomType === "d") {
    throw new RocketChatApiError(
      "Cannot set announcement on a DM — only channels and private groups support announcements.",
      400,
      "unsupported_room_type",
      "setAnnouncement",
    );
  }
  const path = SET_PATH[roomType];
  const announcement = input.announcement ?? "";
  const res = await client.request("POST", path, {
    body: { roomId: input.room_id, announcement },
  });
  return {
    room_id: input.room_id,
    room_type: roomType,
    announcement: res.announcement ?? announcement,
    cleared: !String(res.announcement ?? announcement).trim(),
    success: res.success !== false,
  };
}
