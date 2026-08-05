import { z } from "zod";
export const getUserInputShape = {
    username: z
        .string()
        .min(1)
        .describe("Username to look up. The leading '@' is optional and will be stripped. Examples: 'lukas', '@julia_koster'."),
};
const inputSchema = z.object(getUserInputShape);
export const getUserDescription = "Looks up a Rocket.Chat user by username. Useful for resolving '@someone' to their full name, role, status, or to confirm they exist before posting. " +
    "Returns id, username, name, status, status_text, email (only when visible to you), active, roles.";
export async function getUser(client, input) {
    const username = input.username.replace(/^@+/, "");
    const res = await client.request("GET", "/api/v1/users.info", {
        query: { username },
    });
    const u = res.user ?? {};
    const primaryEmail = u.emails?.find((e) => e.address)?.address ?? null;
    return {
        id: u._id ?? "",
        username: u.username ?? username,
        name: u.name ?? "",
        status: u.status ?? "unknown",
        status_text: u.statusText ?? null,
        email: primaryEmail,
        active: u.active ?? false,
        roles: u.roles ?? [],
    };
}
//# sourceMappingURL=get-user.js.map