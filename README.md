# rocketchat-mcp (local)

Local fork of [`rocket-chat-mcp`](https://www.npmjs.com/package/rocket-chat-mcp) for Cursor.

Adds room **announcement** tools, **thread read** tools (`get_thread_messages`, `get_message`), and **message reactions** (`set_reaction`).

Русская документация: [README.ru.md](./README.ru.md).

## Tools

| Tool | Purpose |
|------|---------|
| `list_unread` | Rooms with unread |
| `list_my_rooms` | Joined rooms |
| `get_room_history` | Channel / DM history |
| `search_messages` | Search in a room |
| `get_user` | User by username |
| `post_message` | Send a message |
| `set_reaction` | **Write:** add/remove emoji reaction on a message (`chat.react`) |
| `get_thread_messages` | Thread replies by root id (`tail` / `include_root`) |
| `get_message` | One message + reactions |
| `get_room_info` | Room meta: **announcement**, topic, description |
| `list_announcements` | All joined channels/groups with non-empty announcement |
| `set_room_announcement` | **Write:** set/clear announcement (`confirm: true`, needs `edit-room`) |

### Reactions

- `set_reaction`: `message_id` + `emoji` (shortname, with or without colons, e.g. `eyes` / `:eyes:`).
- `should_react` defaults to `true` (add); `false` removes this user's reaction. Always sent as a setter (not a toggle) so retries stay idempotent.
- Read reactions via `get_message` / `get_thread_messages` / `get_room_history`.

## Auth

`~/.rocketchat-mcp/env` (or env vars):

- `ROCKETCHAT_URL` — base URL, e.g. `https://chat.example.com` (**required**, no built-in default)
- `ROCKETCHAT_USER_ID`
- `ROCKETCHAT_AUTH_TOKEN`

Or macOS Keychain: service `rocketchat-mcp`, accounts `user-id` / `auth-token`.

Do **not** commit tokens or `*.env` files. See [SECURITY.md](./SECURITY.md).

## Run

```bash
export ROCKETCHAT_URL="https://chat.example.com"
./run.sh
```

Cursor `mcp.json` points at this `run.sh`. After code changes, reload MCP servers.
