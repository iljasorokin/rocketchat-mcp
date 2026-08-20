# rocketchat-mcp (локальный)

Локальный форк [`rocket-chat-mcp`](https://www.npmjs.com/package/rocket-chat-mcp) для Cursor.

Добавляет tools для **объявлений** комнаты и **чтения тредов** (`get_thread_messages`, `get_message`).

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
| `get_thread_messages` | Хвост треда по id корня (`tail` / `include_root`) |
| `get_message` | Одно сообщение + реакции |
| `get_room_info` | Мета комнаты: **announcement**, topic, description |
| `list_announcements` | Все joined-каналы/группы с непустым объявлением |
| `set_room_announcement` | **Запись:** установить/очистить объявление (`confirm: true`, нужно право `edit-room`) |

### Объявления (announcement)

- Это **баннер** комнаты, не обычное сообщение в чат.
- Перед изменением: `get_room_info` / `list_announcements`, затем явное согласие человека.
- `set_room_announcement`: пустая строка `""` очищает баннер; обязателен `confirm: true`.
- DM не поддерживают announcement — только каналы и приватные группы.

## Авторизация

Файл `~/.rocketchat-mcp/env` (или переменные окружения):

- `ROCKETCHAT_URL` — базовый URL, напр. `https://chat.example.com` (**обязателен**, встроенного дефолта нет)
- `ROCKETCHAT_USER_ID`
- `ROCKETCHAT_AUTH_TOKEN`

Либо macOS Keychain: service `rocketchat-mcp`, accounts `user-id` / `auth-token`.

Токены и `*.env` **не** коммитить. См. [SECURITY.md](./SECURITY.md).

## Запуск

```bash
export ROCKETCHAT_URL="https://chat.example.com"
./run.sh
```

В Cursor `mcp.json` указывает на этот `run.sh`. После правок кода — перезагрузить MCP servers.
