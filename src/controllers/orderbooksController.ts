import { Request, Response, NextFunction } from 'express';
import { OrderbookDTO } from '../types';
import { orderbooksService } from '../services/orderbooksService';
import { AppError } from '../middleware/errorHandler';

/**
 * Kontroler dla GET /orderbooks/:orderbookId
 * Implementuje przepływ danych zgodnie z planem:
 * 1. Walidacja orderbookId (już wykonana przez middleware)
 * 2. Przekazanie do warstwy serwisowej
 * 3. Mapowanie wyniku na OrderbookDTO
 * 4. Zwrócenie odpowiedzi lub obsługa błędów
 */
export const getOrderbookById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderbookId } = req.params;
    
    console.log(`Fetching orderbook with ID: ${orderbookId}`);
    
    // Przekazanie do warstwy serwisowej
    const orderbook: OrderbookDTO | null = await orderbooksService.getById(orderbookId);
    
    // Sprawdzenie czy orderbook został znaleziony
    if (!orderbook) {
      const error: AppError = new Error(`Orderbook with ID ${orderbookId} not found`);
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }
    
    // Zwrócenie odpowiedzi 200 OK z pełnymi danymi
    res.status(200).json(orderbook);
    
  } catch (error) {
    // Przekazanie błędu do globalnego handlera błędów
    console.error('Error in getOrderbookById:', error);
    next(error);
  }
};