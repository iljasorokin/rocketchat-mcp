import { buildHeaders } from "./headers.js";
export class RocketChatApiError extends Error {
    status;
    errorType;
    path;
    constructor(message, status, errorType, path) {
        super(message);
        this.status = status;
        this.errorType = errorType;
        this.path = path;
        this.name = "RocketChatApiError";
    }
}
export class RocketChatClient {
    baseUrl;
    debug;
    fetcher;
    roomTypeCache = new Map();
    constructor(baseUrl, opts = {}) {
        this.baseUrl = baseUrl.replace(/\/+$/, "");
        this.debug = opts.debug ?? false;
        this.fetcher = opts.fetcher ?? ((input, init) => fetch(input, init));
    }
    buildUrl(path, query) {
        const url = new URL(this.baseUrl + path);
        if (query) {
            for (const [k, v] of Object.entries(query)) {
                if (v === undefined)
                    continue;
                url.searchParams.set(k, String(v));
            }
        }
        return url.toString();
    }
    async request(method, path, opts = {}) {
        const url = this.buildUrl(path, opts.query);
        const isPost = method === "POST";
        const headers = buildHeaders(isPost);
        const init = { method, headers };
        if (isPost && opts.body !== undefined) {
            init.body = JSON.stringify(opts.body);
        }
        const startedAt = Date.now();
        let res;
        try {
            res = await this.fetcher(url, init);
        }
        catch (err) {
            const parts = [];
            if (err instanceof Error)
                parts.push(err.message);
            const cause = err.cause;
            if (cause instanceof Error) {
                const code = cause.code;
                parts.push(`cause: ${code ? `${code} — ` : ""}${cause.message}`);
            }
            else if (cause !== undefined) {
                parts.push(`cause: ${String(cause)}`);
            }
            throw new Error(`Network error calling ${method} ${url}: ${parts.join(" | ") || String(err)}`);
        }
        const durationMs = Date.now() - startedAt;
        if (this.debug) {
            console.error(`[rc] ${method} ${path} -> ${res.status} (${durationMs}ms)`);
        }
        if (res.status === 401) {
            throw new RocketChatApiError("Rocket.Chat returned 401 Unauthorized. Check ROCKETCHAT_USER_ID and ROCKETCHAT_AUTH_TOKEN — the token may be revoked, expired, or paired with the wrong user id.", 401, "unauthorized", path);
        }
        if (!res.ok) {
            const raw = await res.text().catch(() => "");
            let body;
            try {
                body = raw ? JSON.parse(raw) : undefined;
            }
            catch {
                // non-JSON error body — keep raw for diagnostics
            }
            const jsonDetail = body?.error ?? body?.message;
            const rawDetail = raw && !body ? raw.slice(0, 200).replace(/\s+/g, " ").trim() : "";
            const detail = jsonDetail ?? (rawDetail ? `non-JSON body: ${rawDetail}` : res.statusText);
            throw new RocketChatApiError(`Rocket.Chat ${res.status} on ${method} ${url}: ${detail}`, res.status, body?.errorType, path);
        }
        return (await res.json());
    }
    async getRoomType(roomId) {
        const cached = this.roomTypeCache.get(roomId);
        if (cached)
            return cached;
        const res = await this.request("GET", "/api/v1/rooms.info", { query: { roomId } });
        const t = res.room?.t;
        if (t !== "c" && t !== "p" && t !== "d") {
            throw new RocketChatApiError(`rooms.info returned unsupported room type ${JSON.stringify(t)} for ${roomId}`, 500, "unsupported_room_type", "/api/v1/rooms.info");
        }
        this.roomTypeCache.set(roomId, t);
        return t;
    }
    /** Test-only: prime the cache without an HTTP call. */
    primeRoomType(roomId, type) {
        this.roomTypeCache.set(roomId, type);
    }
    async selfTest() {
        const me = await this.request("GET", "/api/v1/me");
        if (!me.username || !me._id) {
            throw new Error("GET /api/v1/me returned an unexpected payload (missing username or _id).");
        }
        return { username: me.username, userId: me._id };
    }
}
//# sourceMappingURL=rocketchat-client.js.map