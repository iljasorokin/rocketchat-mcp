# rocketchat-mcp (локальный)

Локальный форк [`rocket-chat-mcp`](https://www.npmjs.com/package/rocket-chat-mcp) для Cursor → https://rc.upzero.net

Добавляет tools для **объявлений** комнаты (баннер канала/группы), а не только историю чата.

Английская версия: [README.md](./README.md).

## Tools

| Tool | Назначение |
|------|------------|
| `list_unread` | Комнаты с непрочитанным |
| `list_my_rooms` | Комнаты, в которых состоит пользователь |
| `get_room_history` | История канала / ЛС |
| `search_messages` | Поиск сообщений в комнате |
| `get_user` | Пользователь по username |
| `post_message` | Отправить сообщение |
| `get_room_info` | Мета комнаты: **announcement**, topic, description |
| `list_announcements` | Все joined-каналы/группы с непустым объявлением |
| `set_room_announcement` | **Запись:** установить/очистить объявление (`confirm: true`, нужно право `edit-room`) |

### Объявления (announcement)

- Это **баннер** комнаты, не обычное сообщение в чат.
- Перед изменением: `get_room_info` / `list_announcements`, затем явное согласие человека.
- `set_room_announcement`: пустая строка `""` очищает баннер; обязателен `confirm: true`.
- DM не поддерживают announcement — только каналы и приватные группы.

## Авторизация

Файл `~/.rocketchat-mcp/env`:

- `ROCKETCHAT_URL` (по умолчанию в `run.sh`: `https://rc.upzero.net`)
- `ROCKETCHAT_USER_ID`
- `ROCKETCHAT_AUTH_TOKEN`

Либо macOS Keychain: service `rocketchat-mcp`, accounts `user-id` / `auth-token`.

## Запуск

```bash
./run.sh
```

В Cursor `mcp.json` указывает на этот `run.sh`. После правок кода — перезагрузить MCP servers.
