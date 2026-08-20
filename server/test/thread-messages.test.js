import { test } from "node:test";
import assert from "node:assert/strict";
import { stripMessage, computeTailOffset } from "../dist/tools/message.js";
import {
  getThreadMessages,
  getThreadMessagesInputShape,
  resolveThreadPagination,
} from "../dist/tools/get-thread-messages.js";
import { getMessage } from "../dist/tools/get-message.js";

test("computeTailOffset: last N from total", () => {
  assert.deepEqual(computeTailOffset(52, 5), { offset: 47, limit: 5, total: 52 });
  assert.deepEqual(computeTailOffset(3, 5), { offset: 0, limit: 3, total: 3 });
  assert.deepEqual(computeTailOffset(0, 5), { offset: 0, limit: 0, total: 0 });
});

test("resolveThreadPagination: tail ignores offset", () => {
  const page = resolveThreadPagination({ tail: 5, offset: 99 }, 52);
  assert.equal(page.usedTail, true);
  assert.equal(page.offset, 47);
  assert.equal(page.limit, 5);
});

test("resolveThreadPagination: limit+offset without tail", () => {
  const page = resolveThreadPagination({ limit: 10, offset: 2 }, undefined);
  assert.equal(page.usedTail, false);
  assert.equal(page.offset, 2);
  assert.equal(page.limit, 10);
});

test("stripMessage: default reactions are counts", () => {
  const m = stripMessage({
    _id: "m1",
    msg: "hi",
    u: { _id: "u1", username: "alice", name: "Alice" },
    reactions: { ":eyes:": { usernames: ["bob"] } },
  });
  assert.deepEqual(m.reactions, { ":eyes:": 1 });
});

test("stripMessage: reactionUsernames expands", () => {
  const m = stripMessage(
    {
      _id: "m1",
      msg: "hi",
      u: { _id: "u1", username: "alice", name: "Alice" },
      reactions: {
        ":eyes:": { usernames: ["bob"] },
        ":white_check_mark:": { usernames: ["alice", "carol"] },
      },
    },
    { reactionUsernames: true },
  );
  assert.deepEqual(m.reactions, {
    ":eyes:": { count: 1, usernames: ["bob"] },
    ":white_check_mark:": { count: 2, usernames: ["alice", "carol"] },
  });
});

function mockClient(handlers) {
  return {
    async request(method, path, opts = {}) {
      const key = `${method} ${path}`;
      const fn = handlers[key];
      if (!fn) throw new Error(`unexpected ${key}`);
      return fn(opts);
    },
  };
}

test("get_thread_messages: thread_id required in input shape", () => {
  const parsed = getThreadMessagesInputShape.thread_id.safeParse("");
  assert.equal(parsed.success, false);
});

test("get_thread_messages: tail probes then fetches; newest_first reverses", async () => {
  const calls = [];
  const client = mockClient({
    "GET /api/v1/chat.getThreadMessages": ({ query }) => {
      calls.push({ ...query });
      if (Number(query.count) === 1 && Number(query.offset) === 0) {
        return { success: true, total: 5, messages: [{ _id: "old" }] };
      }
      return {
        success: true,
        total: 5,
        messages: [
          { _id: "a", msg: "1", u: { username: "a" } },
          { _id: "b", msg: "2", u: { username: "b" } },
        ],
      };
    },
    "GET /api/v1/chat.getMessage": ({ query }) => ({
      success: true,
      message: {
        _id: query.msgId,
        msg: "root",
        u: { username: "root" },
        reactions: { ":eyes:": { usernames: ["x"] } },
        tcount: 5,
      },
    }),
  });

  const out = await getThreadMessages(client, {
    thread_id: "root1",
    tail: 2,
    newest_first: true,
    include_root: true,
  });

  assert.equal(out.tail, true);
  assert.equal(out.total, 5);
  assert.equal(out.offset, 3);
  assert.equal(out.limit, 2);
  assert.equal(out.newest_first, true);
  assert.equal(out.messages[0].id, "b");
  assert.equal(out.messages[1].id, "a");
  assert.equal(out.root.id, "root1");
  assert.deepEqual(out.root.reactions, { ":eyes:": 1 });
  assert.equal(calls[0].count, 1);
  assert.equal(calls[1].offset, 3);
});

test("get_thread_messages: include_root false skips getMessage", async () => {
  const client = mockClient({
    "GET /api/v1/chat.getThreadMessages": () => ({
      success: true,
      total: 1,
      messages: [{ _id: "r1", msg: "reply", u: { username: "a" } }],
    }),
  });
  const out = await getThreadMessages(client, {
    thread_id: "root1",
    include_root: false,
  });
  assert.equal(out.root, null);
  assert.equal(out.messages.length, 1);
  assert.equal(out.tail, false);
});

test("get_message: returns stripMessage shape with reaction_usernames", async () => {
  const client = mockClient({
    "GET /api/v1/chat.getMessage": ({ query }) => ({
      success: true,
      message: {
        _id: query.msgId,
        msg: "hello",
        u: { _id: "u", username: "me", name: "Me" },
        reactions: { ":eyes:": { usernames: ["you"] } },
      },
    }),
  });
  const out = await getMessage(client, {
    message_id: "abc",
    reaction_usernames: true,
  });
  assert.equal(out.message.id, "abc");
  assert.deepEqual(out.message.reactions, {
    ":eyes:": { count: 1, usernames: ["you"] },
  });
});
