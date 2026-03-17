const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, '$1');

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const mode = process.argv[2];
if (!mode) {
  console.error('Usage: node scripts/next-port.cjs <dev|start>');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');

loadEnvFile(path.join(workspaceRoot, '.env'));
loadEnvFile(path.join(projectRoot, '.env.local'));

const port = process.env.FRONTEND_PORT || process.env.NEXT_PUBLIC_FRONTEND_PORT || '5176';
const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

const child = spawn(process.execPath, [nextBin, mode, '-p', port], {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
