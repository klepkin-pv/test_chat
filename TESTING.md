# Testing

## Запуск тестов

```bash
cd backend

# Все тесты
npm test

# С покрытием
npm run test:coverage

# Watch-режим (разработка)
npm run test:watch
```

## Структура

```
backend/src/
├── models/__tests__/
│   ├── User.test.ts      — модель пользователя
│   ├── Room.test.ts      — модель комнаты
│   └── Message.test.ts   — модель сообщения
├── routes/__tests__/
│   └── auth.test.ts      — роуты аутентификации
└── test/
    └── setup.ts          — MongoDB in-memory, очистка между тестами
```

## Что покрыто

### User.test.ts
- Хэширование пароля при сохранении
- Повторное сохранение не перехэширует пароль
- `comparePassword` — верный/неверный пароль
- Валидация обязательных полей (username, displayName, email)
- Уникальность username и email
- Дефолтные значения (isOnline, role, lastSeen)

### Room.test.ts
- Создание комнаты с обязательными полями
- Валидация (name required, owner required, maxlength 50)
- Приватные комнаты (isPrivate, password)
- Добавление/удаление участников
- Кастомные реакции (массив emoji, дефолт null)

### Message.test.ts
- Создание текстового сообщения
- Валидация (content required, sender required, maxlength 2000)
- Типы сообщений (text, image, file, system)
- Реакции на сообщения
- Флаги isEdited / isDeleted

### auth.test.ts
- `POST /auth/register` — успешная регистрация, дубликат username, неполные данные
- `POST /auth/login` — успешный вход, нечувствительность к регистру, неверный пароль, несуществующий пользователь
- `GET /auth/me` — получение профиля, 401 без токена, 401 с невалидным токеном

## Окружение

Тесты используют [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server) — реальная MongoDB в памяти, без внешних зависимостей. Redis и Socket.io не мокируются — тесты покрывают только модели и HTTP-роуты.

## Добавление тестов

Файлы с тестами кладутся в `__tests__/` рядом с тестируемым модулем или роутом. Jest подхватывает их автоматически по паттерну `**/__tests__/**/*.ts`.
