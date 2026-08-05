function collapseReactions(reactions) {
    if (!reactions)
        return {};
    const out = {};
    for (const [emoji, val] of Object.entries(reactions)) {
        out[emoji] = val?.usernames?.length ?? 0;
    }
    return out;
}
export function stripMessage(m) {
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
        reactions: collapseReactions(m.reactions),
        is_thread: !!m.tmid,
        thread_count: m.tcount ?? 0,
    };
}
//# sourceMappingURL=message.js.map