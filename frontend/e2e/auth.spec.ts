import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show login form by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Вход в Chat Real' })).toBeVisible();
    await expect(page.getByPlaceholder('Имя пользователя')).toBeVisible();
    await expect(page.getByPlaceholder('Пароль')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
  });

  test('should switch to registration form', async ({ page }) => {
    await page.getByText('Зарегистрироваться').click();
    
    await expect(page.getByRole('heading', { name: 'Регистрация в Chat Real' })).toBeVisible();
    await expect(page.getByPlaceholder('Имя пользователя')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Пароль')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Зарегистрироваться' })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Войти' }).click();
    
    // Should show validation messages
    await expect(page.getByText('Заполните все поля')).toBeVisible();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('Имя пользователя').fill('invaliduser');
    await page.getByPlaceholder('Пароль').fill('wrongpassword');
    await page.getByRole('button', { name: 'Войти' }).click();
    
    // Should show error message
    await expect(page.getByText('Неверные учетные данные')).toBeVisible();
  });

  test('should register new user successfully', async ({ page }) => {
    await page.getByText('Зарегистрироваться').click();
    
    const timestamp = Date.now();
    await page.getByPlaceholder('Имя пользователя').fill(`testuser${timestamp}`);
    await page.getByPlaceholder('Email').fill(`test${timestamp}@example.com`);
    await page.getByPlaceholder('Пароль').fill('password123');
    
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
    
    // Should redirect to chat after successful registration
    await expect(page.getByText('Комнаты')).toBeVisible();
  });

  test('should login existing user successfully', async ({ page }) => {
    // First register a user
    await page.getByText('Зарегистрироваться').click();
    
    const timestamp = Date.now();
    const username = `testuser${timestamp}`;
    const email = `test${timestamp}@example.com`;
    const password = 'password123';
    
    await page.getByPlaceholder('Имя пользователя').fill(username);
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Пароль').fill(password);
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
    
    // Wait for redirect to chat
    await expect(page.getByText('Комнаты')).toBeVisible();
    
    // Logout
    await page.getByTitle('Выйти').click();
    
    // Login with same credentials
    await page.getByPlaceholder('Имя пользователя').fill(username);
    await page.getByPlaceholder('Пароль').fill(password);
    await page.getByRole('button', { name: 'Войти' }).click();
    
    // Should be back in chat
    await expect(page.getByText('Комнаты')).toBeVisible();
  });
});