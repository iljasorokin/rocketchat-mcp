import { RocketChatApiError } from "../rocketchat-client.js";
// Some Rocket.Chat instances do not expose subscriptions.getAll. We assemble
// the room list from the three per-type endpoints, and pull unread/mentions
// data on demand from subscriptions.getOne (one call per room,
// concurrency-limited).
const PAGE_SIZE = 100;
function pickName(doc, t, currentUsername) {
    if (t === "d") {
        // DMs: prefer the *other* participant's username, fall back to fname/name.
        if (doc.usernames && currentUsername) {
            const other = doc.usernames.find((u) => u !== currentUsername);
            if (other)
                return other;
        }
        if (doc.usernames && doc.usernames.length === 1)
            return doc.usernames[0];
        return doc.fname || doc.name || "(direct message)";
    }
    return doc.name || doc.fname || "(unnamed)";
}
function isRoomType(t) {
    return t === "c" || t === "p" || t === "d";
}
async function fetchAllPages(client, path, arrayKey) {
    const out = [];
    let offset = 0;
    while (true) {
        const res = await client.request("GET", path, {
            query: { count: PAGE_SIZE, offset },
        });
        const page = (res[arrayKey] ?? []);
        out.push(...page);
        const total = res.total ?? out.length;
        if (page.length === 0 || out.length >= total || page.length < PAGE_SIZE)
            break;
        offset += PAGE_SIZE;
        if (offset > 5000)
            break; // safety stop
    }
    return out;
}
export async function fetchAllRooms(client, opts = {}) {
    const wanted = new Set(opts.types ?? ["c", "p", "d"]);
    const tasks = [];
    if (wanted.has("c")) {
        tasks.push(fetchAllPages(client, "/api/v1/channels.list.joined", "channels").then((docs) => ({
            docs,
            t: "c",
        })));
    }
    if (wanted.has("p")) {
        tasks.push(fetchAllPages(client, "/api/v1/groups.list", "groups").then((docs) => ({
            docs,
            t: "p",
        })));
    }
    if (wanted.has("d")) {
        tasks.push(fetchAllPages(client, "/api/v1/im.list", "ims").then((docs) => ({
            docs,
            t: "d",
        })));
    }
    const groups = await Promise.all(tasks);
    const rooms = [];
    for (const { docs, t } of groups) {
        for (const doc of docs) {
            const docType = isRoomType(doc.t) ? doc.t : t;
            rooms.push({
                rid: doc._id,
                t: docType,
                name: pickName(doc, docType, opts.currentUsername),
                fname: doc.fname,
                lastMessage: doc.lastMessage,
                lm: doc.lm,
                _updatedAt: doc._updatedAt,
            });
            // Prime the room-type cache so get_room_history doesn't need rooms.info.
            client.primeRoomType(doc._id, docType);
        }
    }
    return rooms;
}
// Rocket.Chat rate-limits subscriptions.getOne at roughly 50 req / 60s on
// some instances. With 50+ rooms a single fan-out can blow the budget, then
// for the next minute every call comes back 429 and the tool reports "no
// unread" even when there is. Cache the result of one fan-out for a short
// window so repeat calls in the same session don't re-fetch.
let subscriptionMapCache = null;
const SUBSCRIPTION_CACHE_TTL_MS = 60_000;
export function clearSubscriptionMapCache() {
    subscriptionMapCache = null;
}
function parseRetryAfterSec(message) {
    const m = message.match(/wait (\d+) seconds?/i);
    return m ? Number(m[1]) : null;
}
async function fetchOneSubscription(client, rid) {
    const maxWaitMs = 5_000;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const res = await client.request("GET", "/api/v1/subscriptions.getOne", { query: { roomId: rid } });
            const sub = res.subscription;
            if (!sub)
                return null;
            return {
                unread: sub.unread ?? 0,
                userMentions: sub.userMentions ?? 0,
                groupMentions: sub.groupMentions ?? 0,
                alert: sub.alert ?? false,
                ls: sub.ls,
            };
        }
        catch (err) {
            if (err instanceof RocketChatApiError && err.status === 404) {
                return null;
            }
            if (err instanceof RocketChatApiError &&
                err.status === 429 &&
                attempt === 0) {
                const askedSec = parseRetryAfterSec(err.message) ?? 2;
                const waitMs = Math.min(maxWaitMs, askedSec * 1000);
                await new Promise((r) => setTimeout(r, waitMs));
                continue;
            }
            if (err instanceof Error) {
                console.error(`[rc] subscriptions.getOne failed for ${rid}: ${err.message}`);
            }
            return null;
        }
    }
    return null;
}
export async function fetchSubscriptionMap(client, roomIds, opts = {}) {
    const concurrency = Math.max(1, opts.concurrency ?? 4);
    const useCache = opts.useCache ?? true;
    const cacheKey = [...roomIds].sort().join(",");
    if (useCache && subscriptionMapCache) {
        const fresh = Date.now() - subscriptionMapCache.fetchedAt < SUBSCRIPTION_CACHE_TTL_MS;
        if (fresh && subscriptionMapCache.roomIds === cacheKey) {
            return subscriptionMapCache.map;
        }
    }
    const out = new Map();
    let i = 0;
    async function worker() {
        while (true) {
            const idx = i++;
            if (idx >= roomIds.length)
                return;
            const rid = roomIds[idx];
            const sub = await fetchOneSubscription(client, rid);
            if (sub)
                out.set(rid, sub);
        }
    }
    const workerCount = Math.min(concurrency, roomIds.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    if (useCache) {
        subscriptionMapCache = { fetchedAt: Date.now(), roomIds: cacheKey, map: out };
    }
    return out;
}
function previewOf(msg) {
    if (!msg)
        return "";
    const trimmed = msg.replace(/\s+/g, " ").trim();
    return trimmed.length > 200 ? trimmed.slice(0, 197) + "..." : trimmed;
}
export function buildRow(room, sub) {
    const lastTs = room.lastMessage?.ts ?? room.lm ?? room._updatedAt ?? null;
    const unread = sub?.unread ?? 0;
    const alert = sub?.alert ?? false;
    return {
        room_id: room.rid,
        room_type: room.t,
        name: room.name,
        unread_count: unread,
        mention_count: sub?.userMentions ?? 0,
        manually_marked_unread: alert && unread === 0,
        last_message_at: lastTs,
        last_message_preview: previewOf(room.lastMessage?.msg),
    };
}
export function sortByLastMessageDesc(rows) {
    return [...rows].sort((a, b) => {
        const av = a.last_message_at ? Date.parse(a.last_message_at) : 0;
        const bv = b.last_message_at ? Date.parse(b.last_message_at) : 0;
        return bv - av;
    });
}
//# sourceMappingURL=room-source.js.map