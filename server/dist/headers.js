export function buildHeaders(includeContentType = false) {
    const userId = process.env.ROCKETCHAT_USER_ID;
    const token = process.env.ROCKETCHAT_AUTH_TOKEN;
    if (!userId || !token) {
        throw new Error("Missing ROCKETCHAT_USER_ID or ROCKETCHAT_AUTH_TOKEN. Create a Personal Access Token in Rocket.Chat (My Account → Personal Access Tokens) and set both env vars.");
    }
    const headers = {
        "X-User-Id": userId,
        "X-Auth-Token": token,
    };
    if (includeContentType)
        headers["Content-Type"] = "application/json";
    return headers;
}
//# sourceMappingURL=headers.js.map