import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Smoke: login → room → avatar', () => {
  test('login, open room, change avatar, verify room.avatar is set', async ({ page, request }) => {
    // 1. Register a fresh user
    await page.goto('/');
    await page.getByText('Зарегистрироваться').click();

    const ts = Date.now();
    const username = `smokeuser${ts}`;
    const password = 'password123';

    await page.getByPlaceholder('Имя пользователя').fill(username);
    await page.getByPlaceholder('Email').fill(`smoke${ts}@example.com`);
    await page.getByPlaceholder('Пароль').fill(password);
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

    await expect(page.getByText('Комнаты')).toBeVisible({ timeout: 10000 });

    // 2. Open first available room
    const firstRoom = page.locator('[data-testid="room-item"]').first();
    const hasRoom = await firstRoom.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasRoom) {
      test.skip(true, 'No rooms available to test avatar change');
      return;
    }

    await firstRoom.click();
    await expect(page.getByPlaceholder('Введите сообщение...')).toBeVisible({ timeout: 5000 });

    // 3. Get room id from URL or store — check via API after avatar change
    // Open edit room modal (only available for room owner/admin, so we create a room first)
    // Create a room instead
    const createBtn = page.getByTitle('Создать комнату').or(page.getByText('Создать комнату')).first();
    const canCreate = await createBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (!canCreate) {
      test.skip(true, 'Cannot create room in this environment');
      return;
    }

    await createBtn.click();
    await page.getByPlaceholder('Название комнаты').fill(`SmokeRoom${ts}`);
    await page.getByRole('button', { name: 'Создать' }).click();

    // Wait for room to appear and be selected
    await expect(page.getByText(`SmokeRoom${ts}`)).toBeVisible({ timeout: 5000 });
    await page.getByText(`SmokeRoom${ts}`).click();

    // 4. Open edit room modal
    const editBtn = page.getByTitle('Настройки комнаты').or(page.getByTitle('Редактировать комнату')).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // 5. Upload avatar via file input
    const avatarInput = page.locator('input[type="file"][accept="image/*"]');
    await expect(avatarInput).toBeAttached({ timeout: 3000 });

    // Create a minimal 1x1 PNG in memory as a temp file
    const tmpDir = path.join(process.cwd(), 'e2e');
    const tmpFile = path.join(tmpDir, `test-avatar-${ts}.png`);
    // Minimal valid 1x1 red PNG (67 bytes)
    const pngBytes = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108020000009001' +
      '2e00000000c4944415478016360f8cfc00000000200016e21bc330000000049454e44ae426082',
      'hex'
    );
    fs.writeFileSync(tmpFile, pngBytes);

    await avatarInput.setInputFiles(tmpFile);

    // 6. Save
    await page.getByRole('button', { name: 'Сохранить' }).click();

    // 7. Verify modal closed (save succeeded)
    await expect(avatarInput).not.toBeVisible({ timeout: 5000 });

    // Cleanup temp file
    fs.unlinkSync(tmpFile);

    // 8. Verify via API that room has avatar set
    const baseUrl = page.url().replace(/\/chat.*/, '');
    const loginResp = await request.post(`${baseUrl}/auth/login`, {
      data: { username, password },
    });
    expect(loginResp.ok()).toBeTruthy();
    const { token } = await loginResp.json();

    const roomsResp = await request.get(`${baseUrl}/chat/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(roomsResp.ok()).toBeTruthy();
    const { rooms } = await roomsResp.json();
    const createdRoom = rooms.find((r: { name: string }) => r.name === `SmokeRoom${ts}`);
    expect(createdRoom).toBeDefined();
    expect(createdRoom.avatar).not.toBeNull();
    expect(createdRoom.avatar).not.toBe('');
  });
});
