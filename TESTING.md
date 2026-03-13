# 🧪 Тестирование Chat Real

## 📋 Типы тестов

- **Unit тесты** - тестируют отдельные функции и компоненты (Jest)
- **E2E тесты** - тестируют полные пользовательские сценарии (Playwright)

## 🚀 Запуск тестов

### Unit тесты (без Docker)

```bash
# Frontend
cd frontend
npm install
npm run test              # Все тесты
npm run test:watch        # Режим наблюдения
npm run test:coverage     # С покрытием кода

# Backend  
cd backend
npm install
npm run test              # Все тесты
npm run test:watch        # Режим наблюдения
npm run test:coverage     # С покрытием кода
```

### E2E тесты (требуют запущенный проект)

```bash
# 1. Запустить проект в Docker
docker-compose up --build -d

# 2. Дождаться готовности (фронтенд на :5175, бэкенд на :4000)

# 3. Запустить E2E тесты
cd frontend
npm install
npx playwright install    # Первый раз
npm run test:e2e         # Запуск тестов
npm run test:e2e:ui      # С UI интерфейсом
```

## 📁 Структура тестов

### Frontend
```
frontend/
├── src/
│   ├── components/UI/__tests__/
│   ├── store/__tests__/
│   ├── utils/__tests__/
│   └── hooks/__tests__/
├── e2e/
├── jest.config.js
└── playwright.config.ts
```

### Backend
```
backend/
├── src/
│   ├── models/__tests__/
│   ├── routes/__tests__/
│   └── test/setup.ts
└── jest.config.js
```

## 🔧 CI/CD интеграция

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # Frontend Unit Tests
      - name: Frontend Tests
        run: |
          cd frontend
          npm ci
          npm run test:coverage
      
      # Backend Unit Tests  
      - name: Backend Tests
        run: |
          cd backend
          npm ci
          npm run test:coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # Start services
      - name: Start Docker services
        run: |
          cp .env.example .env
          docker-compose up --build -d
          
      # Wait for services
      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:5175; do sleep 2; done'
          timeout 60 bash -c 'until curl -f http://localhost:4000; do sleep 2; done'
      
      # Run E2E tests
      - name: E2E Tests
        run: |
          cd frontend
          npm ci
          npx playwright install --with-deps
          npm run test:e2e
      
      # Cleanup
      - name: Stop services
        run: docker-compose down
```

## 📊 Покрытие кода

**Цель**: 70% для всех метрик (branches, functions, lines, statements)

## 🧪 Что тестируется

### Unit тесты
- **Frontend**: NotificationManager, SoundManager, AuthStore, EmojiPicker
- **Backend**: User Model, Auth Routes

### E2E тесты  
- **Аутентификация**: Регистрация, вход, валидация
- **Чат**: Интерфейс, сообщения, эмодзи, настройки

---

**Версия**: 1.0.0