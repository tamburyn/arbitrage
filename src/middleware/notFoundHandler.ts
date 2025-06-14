import { Request, Response, NextFunction } from 'express';

/**
 * Middleware do obsługi 404 Not Found
 * Używany gdy żaden route nie zostanie dopasowany
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  });
};