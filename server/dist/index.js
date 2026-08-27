#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RocketChatClient } from "./rocketchat-client.js";
import { listUnread, listUnreadDescription, listUnreadInputShape } from "./tools/list-unread.js";
import { listMyRooms, listMyRoomsDescription, listMyRoomsInputShape } from "./tools/list-my-rooms.js";
import { getRoomHistory, getRoomHistoryDescription, getRoomHistoryInputShape } from "./tools/get-room-history.js";
import { searchMessages, searchMessagesDescription, searchMessagesInputShape } from "./tools/search-messages.js";
import { getUser, getUserDescription, getUserInputShape } from "./tools/get-user.js";
import { postMessage, postMessageDescription, postMessageInputShape } from "./tools/post-message.js";
import { getRoomInfo, getRoomInfoDescription, getRoomInfoInputShape } from "./tools/get-room-info.js";
import { listAnnouncements, listAnnouncementsDescription, listAnnouncementsInputShape } from "./tools/list-announcements.js";
import { setRoomAnnouncement, setRoomAnnouncementDescription, setRoomAnnouncementInputShape } from "./tools/set-room-announcement.js";
import { getThreadMessages, getThreadMessagesDescription, getThreadMessagesInputShape } from "./tools/get-thread-messages.js";
import { getMessage, getMessageDescription, getMessageInputShape } from "./tools/get-message.js";
import { setReaction, setReactionDescription, setReactionInputShape } from "./tools/set-reaction.js";

function readEnv() {
  const url = process.env.ROCKETCHAT_URL?.trim();
  if (!url) {
    console.error("Missing ROCKETCHAT_URL. Set it to your Rocket.Chat base URL (e.g. https://chat.example.com).");
    process.exit(1);
  }
  if (url.endsWith("/")) {
    console.error(`ROCKETCHAT_URL must not end with a slash. Got: ${url}`);
    process.exit(1);
  }
  if (/\/api\/v\d+/i.test(url)) {
    console.error(`ROCKETCHAT_URL must not include /api/v1. Got: ${url}`);
    process.exit(1);
  }
  if (!process.env.ROCKETCHAT_USER_ID?.trim() || !process.env.ROCKETCHAT_AUTH_TOKEN?.trim()) {
    console.error("Missing ROCKETCHAT_USER_ID or ROCKETCHAT_AUTH_TOKEN.");
    process.exit(1);
  }
  return { url, debug: process.env.DEBUG === "1" };
}

async function main() {
  const { url, debug } = readEnv();
  const client = new RocketChatClient(url, { debug });
  try {
    const me = await client.selfTest();
    console.error(`[rocketchat-mcp-local] Connected as @${me.username} (${url})`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[rocketchat-mcp-local] Startup self-test failed: ${reason}`);
    process.exit(1);
  }

  const server = new McpServer({
    name: "rocketchat-mcp-local",
    version: "0.5.0",
  });

  function ok(data) {
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }

  server.registerTool("list_unread", { description: listUnreadDescription, inputSchema: listUnreadInputShape }, async (input) => ok(await listUnread(client, input)));
  server.registerTool("list_my_rooms", { description: listMyRoomsDescription, inputSchema: listMyRoomsInputShape }, async (input) => ok(await listMyRooms(client, input)));
  server.registerTool("get_room_history", { description: getRoomHistoryDescription, inputSchema: getRoomHistoryInputShape }, async (input) => ok(await getRoomHistory(client, input)));
  server.registerTool("search_messages", { description: searchMessagesDescription, inputSchema: searchMessagesInputShape }, async (input) => ok(await searchMessages(client, input)));
  server.registerTool("get_user", { description: getUserDescription, inputSchema: getUserInputShape }, async (input) => ok(await getUser(client, input)));
  server.registerTool("post_message", { description: postMessageDescription, inputSchema: postMessageInputShape }, async (input) => ok(await postMessage(client, input)));
  server.registerTool("get_room_info", { description: getRoomInfoDescription, inputSchema: getRoomInfoInputShape }, async (input) => ok(await getRoomInfo(client, input)));
  server.registerTool("list_announcements", { description: listAnnouncementsDescription, inputSchema: listAnnouncementsInputShape }, async (input) => ok(await listAnnouncements(client, input)));
  server.registerTool("set_room_announcement", { description: setRoomAnnouncementDescription, inputSchema: setRoomAnnouncementInputShape }, async (input) => ok(await setRoomAnnouncement(client, input)));
  server.registerTool("get_thread_messages", { description: getThreadMessagesDescription, inputSchema: getThreadMessagesInputShape }, async (input) => ok(await getThreadMessages(client, input)));
  server.registerTool("get_message", { description: getMessageDescription, inputSchema: getMessageInputShape }, async (input) => ok(await getMessage(client, input)));
  server.registerTool("set_reaction", { description: setReactionDescription, inputSchema: setReactionInputShape }, async (input) => ok(await setReaction(client, input)));

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[rocketchat-mcp-local] Listening on stdio.");
}

main().catch((err) => {
  const reason = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error(`[rocketchat-mcp-local] Fatal: ${reason}`);
  process.exit(1);
});
