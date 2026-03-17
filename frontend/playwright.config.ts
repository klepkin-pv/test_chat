import fs from 'fs';
import path from 'path';
import { defineConfig, devices } from '@playwright/test';

function readEnvValue(key: string, defaultValue: string): string {
  const envPath = path.resolve(process.cwd(), '../.env');
  if (fs.existsSync(envPath)) {
    const line = fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .find((entry) => entry.startsWith(`${key}=`));

    if (line) {
      return line.slice(key.length + 1).replace(/^"(.*)"$/, '$1') || defaultValue;
    }
  }

  return process.env[key] || defaultValue;
}

const appProtocol = readEnvValue('APP_PROTOCOL', 'http');
const appHost = readEnvValue('APP_HOST', 'localhost');
const nginxPort = readEnvValue('NGINX_PORT', '5175');
const proxyBaseUrl = `${appProtocol}://${appHost}:${nginxPort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: proxyBaseUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: proxyBaseUrl,
    reuseExistingServer: !process.env.CI,
  },
});
