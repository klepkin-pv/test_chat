import { test, expect } from '@playwright/test';

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login a test user
    await page.goto('/');
    await page.getByText('Зарегистрироваться').click();
    
    const timestamp = Date.now();
    await page.getByPlaceholder('Имя пользователя').fill(`testuser${timestamp}`);
    await page.getByPlaceholder('Email').fill(`test${timestamp}@example.com`);
    await page.getByPlaceholder('Пароль').fill('password123');
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
    
    // Wait for chat to load
    await expect(page.getByText('Комнаты')).toBeVisible();
  });

  test('should display chat interface', async ({ page }) => {
    // Should show sidebar with rooms
    await expect(page.getByText('Комнаты')).toBeVisible();
    
    // Should show empty state when no room selected
    await expect(page.getByText('Выберите комнату')).toBeVisible();
  });

  test('should send message in room', async ({ page }) => {
    // Assume there's a default room or create one
    // This test would need a room to exist or create one first
    
    // Click on first room if available
    const firstRoom = page.locator('[data-testid="room-item"]').first();
    if (await firstRoom.isVisible()) {
      await firstRoom.click();
      
      // Should show chat window
      await expect(page.getByPlaceholder('Введите сообщение...')).toBeVisible();
      
      // Send a message
      const messageText = 'Hello, this is a test message!';
      await page.getByPlaceholder('Введите сообщение...').fill(messageText);
      await page.getByRole('button', { name: 'Отправить' }).click();
      
      // Should see the message in chat
      await expect(page.getByText(messageText)).toBeVisible();
    }
  });

  test('should open emoji picker', async ({ page }) => {
    // Click on first room if available
    const firstRoom = page.locator('[data-testid="room-item"]').first();
    if (await firstRoom.isVisible()) {
      await firstRoom.click();
      
      // Click emoji picker button
      await page.getByTitle('Добавить эмодзи').click();
      
      // Should show emoji picker
      await expect(page.getByText('Смайлики')).toBeVisible();
      
      // Click on an emoji
      await page.getByText('😀').click();
      
      // Should add emoji to input
      await expect(page.getByPlaceholder('Введите сообщение...')).toHaveValue('😀');
    }
  });

  test('should toggle sound settings', async ({ page }) => {
    // Click sound toggle button
    await page.getByTitle('Отключить звуки').click();
    
    // Should change to "Включить звуки"
    await expect(page.getByTitle('Включить звуки')).toBeVisible();
    
    // Click again to enable
    await page.getByTitle('Включить звуки').click();
    
    // Should change back to "Отключить звуки"
    await expect(page.getByTitle('Отключить звуки')).toBeVisible();
  });

  test('should open notification settings', async ({ page }) => {
    // Click notification settings button
    await page.getByTitle('Настройки уведомлений').click();
    
    // Should show notification settings modal
    await expect(page.getByText('Настройки уведомлений')).toBeVisible();
    await expect(page.getByText('Браузерные уведомления')).toBeVisible();
    
    // Close modal
    await page.getByRole('button', { name: 'Готово' }).click();
    
    // Modal should be closed
    await expect(page.getByText('Настройки уведомлений')).not.toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Click logout button
    await page.getByTitle('Выйти').click();
    
    // Should redirect to login page
    await expect(page.getByRole('heading', { name: 'Вход в Chat Real' })).toBeVisible();
  });
});