# Chat Real

Чат-приложение с комнатами, личными сообщениями, файлами, реакциями, PWA и web-push.

## Стек

- Frontend: Next.js 15, React, TypeScript, Tailwind CSS, Zustand, Socket.IO client
- Backend: Node.js, Express, TypeScript, Socket.IO, MongoDB, Redis, JWT
- Infra: nginx, Docker Compose

## Структура

```text
chat_real/
├── frontend/
├── backend/
├── uploads/
├── restart.ps1
├── restart.sh
├── nginx.example.conf
├── .env
├── .env.example
└── docker-compose.yml
```

## Конфигурация

Основные URL и порты собраны в корневом `.env`.

Ключевые переменные:

- `APP_PROTOCOL` — протокол приложения, обычно `http` или `https`
- `APP_HOST` — основной хост
- `PUBLIC_ORIGIN` — внешний origin, например `https://worksource.share.zrok.io`
- `NGINX_PORT` — локальный прокси-порт nginx
- `FRONTEND_PORT` — локальный порт Next.js
- `PORT` — локальный порт Express/Socket.IO
- `MONGODB_PORT`
- `REDIS_PORT`

Фронтенд и бэкенд стараются автоматически определять режим запуска:

- прямой локальный запуск `localhost:5176` использует локальный backend
- запуск через nginx/zrok использует same-origin маршруты `/api`, `/uploads`, `/socket.io`

## Быстрый старт

Установка зависимостей:

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

Запуск в Windows:

```powershell
.\restart.ps1
.\restart.ps1 -bf
.\restart.ps1 -bb
.\restart.ps1 -bfb
```

Запуск в Linux/macOS:

```bash
./restart.sh
./restart.sh -bf
./restart.sh -bb
./restart.sh -bfb
```

Флаги:

- `-bf` — build frontend, backend в dev
- `-bb` — build backend, frontend в dev
- `-bfb` — build frontend и backend, затем оба в production-режиме

Локальные адреса по умолчанию:

- frontend: `http://localhost:5176/chat`
- backend: `http://localhost:4000`
- nginx proxy: `http://localhost:5175/chat`

## nginx

Пример конфига лежит в [nginx.example.conf](/c:/projects/chat_real/nginx.example.conf).

Для корректной работы нужны как минимум эти маршруты:

- `/chat`
- `/chat/_next`
- `/api/`
- `/uploads`
- `/socket.io`

Если меняете только `nginx.example.conf`, этого недостаточно: изменения нужно перенести в реальный nginx-конфиг и сделать reload nginx.

Важно: для аватарок и файлов обязательно должен проксироваться `/uploads`.

## Комнаты и аватарки

- Данные об аватарке комнаты и пользователя приходят вместе с JSON-объектами, отдельный API-запрос за "метаданными аватарки" не нужен.
- Само изображение затем загружается обычным запросом к `/uploads/...`.
- Обновление комнаты и её аватарки можно отправлять одним `PUT /chat/rooms/:roomId` обычным JSON, передавая `avatarDataUrl`, чтобы не зависеть от multipart-upload на внешнем прокси.
- Перед отправкой аватарка комнаты на фронтенде уменьшается и сжимается, чтобы обновление стабильнее проходило через proxy/zrok.

## PWA

Manifest и service worker настроены под запуск из `/chat/`.

Если на Android/Chrome приложение раньше было добавлено как shortcut и при каждом запуске показывается баннер вида:

- `Chrome`
- `ChatReal`
- `Нажмите, чтобы скопировать URL этого приложения`

то после обновления нужно:

1. удалить старый ярлык/установленное приложение
2. открыть `/chat/`
3. установить приложение заново

Это нужно, чтобы Chrome подхватил обновлённые `manifest.json` и `sw.js` и воспринимал приложение как PWA, а не как обычный shortcut.

## Администрирование

Создание супер-админа:

```bash
cd backend
npm run create-admin
```

Роли:

- `user` — обычный пользователь
- `moderator` — модерация и баны по разрешённым сценариям
- `admin` — глобальное администрирование, настройка реакций, комнаты, роли

## Реакции

- В пикере показываются первые 6 реакций + кнопка «Развернуть» для полного списка с вкладками (руки, сердца, лица и т.д.).
- В личных сообщениях доступны все реакции. В комнатах — только те, что настроены для комнаты.
- Уже поставленные реакции на сообщении: показываются первые 6, остальные скрыты за кнопкой `+N`.

## Проверка и тесты

Сборки:

```bash
cd backend && npm run build
cd frontend && npm run build
```

Тесты:

```bash
cd backend && npm test      # 41 тест
cd frontend && npm test     # 22 теста
```

E2E (требует запущенного приложения):

```bash
cd frontend && npm run test:e2e
```

Smoke-тест (`e2e/smoke.spec.ts`) проверяет: регистрация → создание комнаты → смена аватара → проверка через API что `room.avatar` не пустой.

## Что важно помнить

- После изменения `.env` нужно перезапускать процессы.
- После изменения nginx-конфига нужен reload nginx.
- После изменения `manifest.json` или `sw.js` на телефоне может потребоваться переустановка PWA.
