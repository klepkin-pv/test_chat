# 💬 Chat Real

Чат в реальном времени с WebSocket, комнатами, личными сообщениями, PWA и пуш-уведомлениями.

## Стек

**Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, Socket.io Client, Zustand  
**Backend:** Node.js, Express.js, Socket.io, TypeScript, MongoDB, Mongoose, Redis, JWT  
**DevOps:** Docker, Docker Compose

## Структура

```
chat_real/
├── frontend/          # Next.js 15 приложение
├── backend/           # Express.js API + Socket.io
├── data/              # MongoDB и Redis данные
├── restart.sh         # Скрипт перезапуска (Linux/Mac)
├── restart.ps1        # Скрипт перезапуска (Windows)
└── docker-compose.yml
```

## Запуск

### Локальная разработка

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (отдельный терминал)
cd frontend && npm install && npm run dev
```

Приложение: **http://localhost:5176/chat**

### Скрипты перезапуска

Если билдим — то запускаем через `start`, коиначе — через `dev`.

```bash
# Linux/Mac
./restart.sh           # билд фронта → frontend: start, backend: dev
./restart.sh -bf       # то же самое
./restart.sh -bb       # билд бэка   → frontend: dev,   backend: start
./restart.sh -bfb      # билд обоих  → оба: start

# Windows PowerShell
.\restart.ps1          # билд фронта → frontend: start, backend: dev
.\restart.ps1 -bf      # то же самое
.\restart.ps1 -bb      # билд бэка   → frontend: dev,   backend: start
.\restart.ps1 -bfb     # билд обоих  → оба: start
```

### Docker (продакшен)

```bash
cp .env.docker .env
docker-compose up --build -d
```

Приложение: **http://localhost:5175/chat**

## Сервисы

| Сервис    | Порт        |
|-----------|-------------|
| Frontend  | 5175 / 5176 |
| Backend   | 4000        |
| MongoDB   | 27018       |
| Redis     | 6380        |

## Возможности

- Регистрация и аутентификация (логин нечувствителен к регистру)
- Система ролей: User / Moderator / Admin
- Комнаты: публичные и приватные (с паролем), аватарки
- Сообщения в реальном времени, индикатор набора текста
- Личные сообщения (DM) со статусами доставки/прочтения
- Реакции на сообщения (настраиваются админом)
- Ответы на сообщения, редактирование, удаление
- Отправка файлов и изображений
- Аватарки пользователей и комнат
- Статусы онлайн/оффлайн
- Тёмная/светлая тема
- Избранные пользователи, блокировки
- Баны: временные/постоянные, в комнате/глобально
- PWA — устанавливается на Android, iOS, Desktop
- Пуш-уведомления (Web Push API, VAPID)
- Поиск по сообщениям в комнате
- ESC — закрывает/открывает боковую панель
- Адаптивный дизайн

## Администрирование

Создать супер-админа после первого запуска:

```bash
cd backend && npm run create-admin
```

Логин: `admin` / Пароль: `123123`

### Роли
- **User** — обычный пользователь
- **Moderator** — баны в комнатах
- **Admin** — управление ролями, глобальные баны, создание комнат, настройка реакций

### Контекстные действия
- **Правый клик** (десктоп) или **долгое нажатие** (мобиль) на вкладку комнат → создать комнату (только админ)
- **Правый клик / долгое нажатие** на вкладку личных сообщений → начать новый чат
- **Долгое нажатие** на сообщение (мобиль) → меню реакций

## Тесты

```bash
cd backend && npm test
```

Покрытие: модели User, Room, Message + роуты аутентификации.

## Безопасность

JWT, bcrypt, CORS, Helmet, валидация входных данных

## Лицензия

MIT — **Автор:** Klepkin Pavel
