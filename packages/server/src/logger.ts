import pino from 'pino';

/**
 * 轻量日志实例。
 * 通过 redact 对敏感字段脱敏，避免打印 Header / Token。
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'headers',
      'headers.authorization',
      'headers.Authorization',
      'config.headers',
      '*.headers',
      '*.authorization',
      'req.headers.authorization',
    ],
    censor: '[redacted]',
  },
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
});
