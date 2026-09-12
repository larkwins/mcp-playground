import type { Request, Response, NextFunction } from 'express';
import type { ApiError } from '@mcp-playground/shared';
import { logger } from '../logger.js';

/** 业务错误：携带规范化的错误码与可选细节。 */
export class AppError extends Error {
  code: string;
  status: number;
  detail?: unknown;

  constructor(code: string, message: string, detail?: unknown, status = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

/** 将任意错误规范化为 { code, message, detail }。 */
export function normalizeError(err: unknown): { status: number; body: ApiError } {
  if (err instanceof AppError) {
    return { status: err.status, body: { code: err.code, message: err.message, detail: err.detail } };
  }
  if (err instanceof Error) {
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: err.message } };
  }
  return { status: 500, body: { code: 'UNKNOWN_ERROR', message: String(err) } };
}

/** Express 统一错误处理中间件。 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const { status, body } = normalizeError(err);
  logger.error({ code: body.code, message: body.message }, 'request failed');
  res.status(status).json({ error: body });
}

/** 包装 async 路由，自动捕获异常转交 errorHandler。 */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
