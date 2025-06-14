import { Router } from 'express';
import { getOrderbookById } from '../controllers/orderbooksController';
import { validateOrderbookId } from '../middleware/validation';

const router = Router();

/**
 * GET /orderbooks/:orderbookId
 * Pobiera szczegóły orderbooku na podstawie ID
 * 
 * @param orderbookId - UUID orderbooku (parametr ścieżki)
 * @returns OrderbookDTO - pełne szczegóły orderbooku
 * 
 * Obsługuje błędy:
 * - 400 Bad Request - nieprawidłowy format UUID
 * - 404 Not Found - orderbook nie został znaleziony  
 * - 500 Internal Server Error - błąd serwera
 */
router.get('/:orderbookId', validateOrderbookId, getOrderbookById);

export { router as orderbooksRouter };