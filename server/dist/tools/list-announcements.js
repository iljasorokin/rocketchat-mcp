import { z } from "zod";

const PAGE_SIZE = 100;

export const listAnnouncementsInputShape = {
  type: z
    .enum(["channel", "private", "all"])
    .optional()
    .describe(
      "Room types to scan. 'channel' = public, 'private' = private groups, 'all' = both (default). DMs are skipped — they rarely have announcements.",
    ),
  include_empty: z
    .boolean()
    .optional()
    .describe("If true, include rooms with empty announcement (default false — only rooms with text)."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Max rooms to return after filtering (default 100)."),
};

export const listAnnouncementsDescription =
  "Lists Rocket.Chat **room announcements** (the banner text on a channel/group, not chat messages). " +
  "Scans joined public channels and private groups via channels.list.joined / groups.list. " +
  "By default returns only rooms where announcement is non-empty (e.g. duty officer on _Инциденты_прода). " +
  "For one room in detail use get_room_info. This is NOT a feed of release posts — for message history use get_room_history.";

async function fetchAllPages(client, path, arrayKey) {
  const out = [];
  let offset = 0;
  while (true) {
    const res = await client.request("GET", path, {
      query: { count: PAGE_SIZE, offset },
    });
    const page = res[arrayKey] ?? [];
    out.push(...page);
    const total = res.total ?? out.length;
    if (page.length === 0 || out.length >= total || page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    if (offset > 5000) break;
  }
  return out;
}

function mapDoc(doc, roomType) {
  const announcement = typeof doc.announcement === "string" ? doc.announcement : "";
  return {
    room_id: doc._id,
    room_type: roomType,
    name: doc.fname || doc.name || "(unnamed)",
    fname: doc.fname || null,
    topic: doc.topic || "",
    description: doc.description || "",
    announcement,
    has_announcement: Boolean(announcement.trim()),
  };
}

export async function listAnnouncements(client, input) {
  const typeFilter = input.type ?? "all";
  const includeEmpty = Boolean(input.include_empty);
  const limit = input.limit ?? 100;

  const tasks = [];
  if (typeFilter === "all" || typeFilter === "channel") {
    tasks.push(
      fetchAllPages(client, "/api/v1/channels.list.joined", "channels").then((docs) =>
        docs.map((d) => {
          client.primeRoomType(d._id, "c");
          return mapDoc(d, "c");
        }),
      ),
    );
  }
  if (typeFilter === "all" || typeFilter === "private") {
    tasks.push(
      fetchAllPages(client, "/api/v1/groups.list", "groups").then((docs) =>
        docs.map((d) => {
          client.primeRoomType(d._id, "p");
          return mapDoc(d, "p");
        }),
      ),
    );
  }

  const batches = await Promise.all(tasks);
  let rows = batches.flat();
  if (!includeEmpty) {
    rows = rows.filter((r) => r.has_announcement);
  }
  rows.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return {
    count: Math.min(rows.length, limit),
    total_matched: rows.length,
    rooms: rows.slice(0, limit),
  };
}
