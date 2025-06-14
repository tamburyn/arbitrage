import { Request, Response, NextFunction } from 'express';
import { param, validationResult } from 'express-validator';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';

/**
 * Middleware walidacji dla parametru orderbookId
 * Sprawdza czy orderbookId jest prawidłowym UUID
 * Zgodne z planem implementacji - rygorystyczna weryfikacja parametru
 */
export const validateOrderbookId = [
  param('orderbookId')
    .isUUID('4')
    .withMessage('orderbookId must be a valid UUID v4'),
  
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: {
          message: 'Validation failed',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method,
          details: errors.array().map(error => ({
            field: error.param,
            message: error.msg,
            value: error.value
          }))
        }
      });
      return;
    }
    
    next();
  }
];

/**
 * Funkcja pomocnicza do walidacji UUID
 * @param id - string do sprawdzenia
 * @returns boolean - czy string jest prawidłowym UUID
 */
export const isValidUuid = (id: string): boolean => {
  return validateUuid(id);
};