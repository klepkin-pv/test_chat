type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getCurrentLevel(): LogLevel {
  const configuredLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (configuredLevel && configuredLevel in levelPriority) {
    return configuredLevel;
  }

  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[getCurrentLevel()];
}

function serializeMeta(meta?: unknown): string {
  if (meta === undefined) {
    return '';
  }

  if (meta instanceof Error) {
    return `\n${meta.stack || meta.message}`;
  }

  if (typeof meta === 'string') {
    return ` ${meta}`;
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ` ${String(meta)}`;
  }
}

function write(level: LogLevel, message: string, meta?: unknown) {
  if (!shouldLog(level)) {
    return;
  }

  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${serializeMeta(meta)}`;

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
};
