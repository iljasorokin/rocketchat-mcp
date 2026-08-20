function collapseReactions(reactions) {
  if (!reactions) return {};
  const out = {};
  for (const [emoji, val] of Object.entries(reactions)) {
    out[emoji] = val?.usernames?.length ?? 0;
  }
  return out;
}

function expandReactions(reactions) {
  if (!reactions) return {};
  const out = {};
  for (const [emoji, val] of Object.entries(reactions)) {
    const usernames = Array.isArray(val?.usernames) ? [...val.usernames] : [];
    out[emoji] = {
      count: usernames.length,
      usernames,
    };
  }
  return out;
}

/**
 * @param {object} m raw Rocket.Chat message
 * @param {{ reactionUsernames?: boolean }} [opts]
 */
export function stripMessage(m, opts = {}) {
  const reactionUsernames = Boolean(opts.reactionUsernames);
  return {
    id: m._id,
    ts: m.ts ?? null,
    user: {
      id: m.u?._id ?? "",
      username: m.u?.username ?? "",
      name: m.u?.name ?? "",
    },
    msg: m.msg ?? "",
    edited_at: m.editedAt ?? null,
    attachments_count: (m.attachments ?? []).length,
    reactions: reactionUsernames
      ? expandReactions(m.reactions)
      : collapseReactions(m.reactions),
    is_thread: !!m.tmid,
    thread_count: m.tcount ?? 0,
  };
}

/** Exported for unit tests. */
export function computeTailOffset(total, tail) {
  const t = Math.max(0, Number(total) || 0);
  const n = Math.max(1, Math.min(200, Number(tail) || 1));
  const offset = Math.max(0, t - n);
  const limit = Math.min(n, t);
  return { offset, limit, total: t };
}
