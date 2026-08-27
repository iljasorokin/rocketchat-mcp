import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeReactionEmoji,
  setReaction,
  setReactionInputShape,
} from "../dist/tools/set-reaction.js";

test("normalizeReactionEmoji strips surrounding colons", () => {
  assert.equal(normalizeReactionEmoji(":eyes:"), "eyes");
  assert.equal(normalizeReactionEmoji("eyes"), "eyes");
  assert.equal(normalizeReactionEmoji("  :white_check_mark:  "), "white_check_mark");
});

test("set_reaction input rejects empty message_id", () => {
  assert.equal(setReactionInputShape.message_id.safeParse("").success, false);
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

test("set_reaction: defaults shouldReact true and normalizes emoji", async () => {
  let body;
  const client = mockClient({
    "POST /api/v1/chat.react": (opts) => {
      body = opts.body;
      return { success: true };
    },
  });
  const out = await setReaction(client, {
    message_id: "msg1",
    emoji: ":thumbsup:",
  });
  assert.deepEqual(body, {
    messageId: "msg1",
    emoji: "thumbsup",
    shouldReact: true,
  });
  assert.deepEqual(out, {
    success: true,
    message_id: "msg1",
    emoji: "thumbsup",
    reacted: true,
  });
});

test("set_reaction: should_react false removes", async () => {
  let body;
  const client = mockClient({
    "POST /api/v1/chat.react": (opts) => {
      body = opts.body;
      return { success: true };
    },
  });
  const out = await setReaction(client, {
    message_id: "msg1",
    emoji: "eyes",
    should_react: false,
  });
  assert.equal(body.shouldReact, false);
  assert.equal(out.reacted, false);
});
