import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

function isEnabled(value?: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value || '').trim().toLowerCase());
}

export async function ensureAdminFromEnv(): Promise<void> {
  if (!isEnabled(process.env.AUTO_CREATE_ADMIN)) {
    return;
  }

  const username = process.env.ADMIN_USERNAME?.trim() || 'admin';
  const displayName = process.env.ADMIN_DISPLAY_NAME?.trim() || 'Батя';
  const email = process.env.ADMIN_EMAIL?.trim() || '';
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!password) {
    logger.warn('AUTO_CREATE_ADMIN is enabled, but ADMIN_PASSWORD is empty. Skipping admin bootstrap.');
    return;
  }

  const existingUser = await User.findOne({
    $or: [
      { username },
      { email },
    ],
  });

  if (existingUser) {
    if (existingUser.role !== 'admin') {
      existingUser.role = 'admin';
      await existingUser.save();
      logger.info(`Admin bootstrap: promoted existing user "${existingUser.username}" to admin`);
      return;
    }

    logger.info(`Admin bootstrap: user "${existingUser.username}" already exists`);
    return;
  }

  const admin = new User({
    username,
    displayName,
    email,
    password,
    role: 'admin',
  });

  await admin.save();
  logger.info(`Admin bootstrap: created admin "${username}"`);
}
