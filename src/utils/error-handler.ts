import { logger } from './logger';

export class ErrorHandler {
  static handle(error: any, context: string): void {
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      code: error?.code,
      timestamp: new Date().toISOString(),
      context
    };

    logger.error(`[${context}] Error occurred:`, errorDetails);
  }

  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context: string = 'unknown'
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        logger.warn(`[${context}] Attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    throw new Error('Unexpected error in withRetry');
  }

  static isBinanceError(error: any): boolean {
    return error?.code !== undefined || error?.body !== undefined;
  }

  static getBinanceErrorMessage(error: any): string {
    if (error?.body?.msg) {
      return `Binance API Error: ${error.body.msg} (Code: ${error.code})`;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return 'Unknown Binance API error';
  }
} 