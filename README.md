# rocketchat-mcp (local)

Local fork of [`rocket-chat-mcp`](https://www.npmjs.com/package/rocket-chat-mcp) for Cursor → https://rc.upzero.net

Adds room **announcement** tools (banner on channel/group), not just chat history.

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
| `get_room_info` | Room meta: **announcement**, topic, description |
| `list_announcements` | All joined channels/groups with non-empty announcement |
| `set_room_announcement` | **Write:** set/clear announcement (`confirm: true`, needs `edit-room`) |

## Auth

`~/.rocketchat-mcp/env` (`ROCKETCHAT_URL`, `ROCKETCHAT_USER_ID`, `ROCKETCHAT_AUTH_TOKEN`).

## Run

```bash
./run.sh
```

Cursor `mcp.json` points at this `run.sh`. After code changes, reload MCP servers.
