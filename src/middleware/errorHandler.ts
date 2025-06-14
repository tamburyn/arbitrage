import { Request, Response, NextFunction } from 'express';

// Interfejs dla błędów z kodem statusu
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Middleware do globalnej obsługi błędów
 * Obsługuje różne typy błędów zgodnie z planem implementacji:
 * - 404 Not Found
 * - 500 Internal Server Error
 * - Błędy walidacji
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Domyślny kod statusu dla nieznanych błędów
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Logowanie błędów (w środowisku produkcyjnym użyj odpowiedniego loggera)
  console.error(`Error ${statusCode}: ${message}`);
  console.error('Stack:', error.stack);

  // Dodatkowe logowanie szczegółów żądania
  console.error(`Request: ${req.method} ${req.path}`);
  console.error('Request params:', req.params);
  console.error('Request body:', req.body);

  // W środowisku produkcyjnym ukryj szczegóły błędów wewnętrznych
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal Server Error';
  }

  // Odpowiedź JSON z informacją o błędzie
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  });
};