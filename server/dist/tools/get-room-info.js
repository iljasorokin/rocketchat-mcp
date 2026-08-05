import { z } from "zod";

export const getRoomInfoInputShape = {
  room_id: z
    .string()
    .min(1)
    .describe(
      "Opaque room identifier from list_my_rooms / list_unread / list_announcements. NOT the human-readable room name.",
    ),
};

export const getRoomInfoDescription =
  "Reads room metadata including the Rocket.Chat **announcement** banner (and topic/description). " +
  "Works for public channels and private groups. DMs usually have no announcement. " +
  "Use list_announcements to find all joined rooms that currently have a non-empty announcement.";

const INFO_PATH = {
  c: "/api/v1/channels.info",
  p: "/api/v1/groups.info",
  d: "/api/v1/im.info",
};

const ROOM_KEY = {
  c: "channel",
  p: "group",
  d: "room",
};

function pickRoomDoc(res, roomType) {
  return res[ROOM_KEY[roomType]] || res.room || res.channel || res.group || {};
}

export async function getRoomInfo(client, input) {
  const roomType = await client.getRoomType(input.room_id);
  const path = INFO_PATH[roomType];
  const res = await client.request("GET", path, { query: { roomId: input.room_id } });
  const room = pickRoomDoc(res, roomType);
  const announcement = typeof room.announcement === "string" ? room.announcement : "";
  return {
    room_id: input.room_id,
    room_type: roomType,
    name: room.name || room.fname || null,
    fname: room.fname || null,
    topic: room.topic || "",
    description: room.description || "",
    announcement,
    announcement_details: room.announcementDetails || null,
    has_announcement: Boolean(announcement.trim()),
  };
}
