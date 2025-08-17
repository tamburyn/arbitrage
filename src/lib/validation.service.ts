import type { CreateAlertCommand } from '../types';

/**
 * Serwis walidacji danych wejściowych
 */
export class ValidationService {
  
  /**
   * Waliduje dane wejściowe dla tworzenia alertu
   */
  static validateCreateAlertCommand(data: any): {
    isValid: boolean;
    errors: string[];
    command?: CreateAlertCommand;
  } {
    const errors: string[] = [];

    // Sprawdzenie czy data jest obiektem
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['Request body must be a valid JSON object']
      };
    }

    const { assetId, exchangeId, spread, additional_info } = data;

    // Walidacja assetId
    if (!assetId) {
      errors.push('assetId is required');
    } else if (typeof assetId !== 'string') {
      errors.push('assetId must be a string');
    } else if (assetId.trim().length === 0) {
      errors.push('assetId cannot be empty');
    } else if (assetId.length > 100) {
      errors.push('assetId cannot exceed 100 characters');
    }

    // Walidacja exchangeId
    if (!exchangeId) {
      errors.push('exchangeId is required');
    } else if (typeof exchangeId !== 'string') {
      errors.push('exchangeId must be a string');
    } else if (exchangeId.trim().length === 0) {
      errors.push('exchangeId cannot be empty');
    } else if (exchangeId.length > 100) {
      errors.push('exchangeId cannot exceed 100 characters');
    }

    // Walidacja spread
    if (spread === undefined || spread === null) {
      errors.push('spread is required');
    } else if (typeof spread !== 'number') {
      errors.push('spread must be a number');
    } else if (isNaN(spread)) {
      errors.push('spread must be a valid number');
    } else if (!isFinite(spread)) {
      errors.push('spread must be a finite number');
    } else if (spread <= 0) {
      errors.push('spread must be greater than 0');
    } else if (spread > 1000) {
      errors.push('spread cannot exceed 1000% (seems unrealistic)');
    }

    // Walidacja additional_info (opcjonalnie)
    if (additional_info !== undefined && additional_info !== null) {
      if (typeof additional_info !== 'object') {
        errors.push('additional_info must be a valid JSON object');
      } else {
        // Sprawdzenie czy można zserializować do JSON
        try {
          JSON.stringify(additional_info);
        } catch (jsonError) {
          errors.push('additional_info must be a valid JSON serializable object');
        }
      }
    }

    // Sprawdzenie dodatkowych, nieoczekiwanych pól
    const allowedFields = ['assetId', 'exchangeId', 'spread', 'additional_info'];
    const extraFields = Object.keys(data).filter(key => !allowedFields.includes(key));
    if (extraFields.length > 0) {
      errors.push(`Unexpected fields: ${extraFields.join(', ')}`);
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors
      };
    }

    // Jeśli walidacja przeszła pomyślnie, tworzenie command object
    const command: CreateAlertCommand = {
      assetId: assetId.trim(),
      exchangeId: exchangeId.trim(),
      spread: spread,
      additional_info: additional_info || null
    };

    return {
      isValid: true,
      errors: [],
      command
    };
  }

  /**
   * Waliduje format UUID (jeśli używany)
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Waliduje token Bearer
   */
  static validateBearerToken(authHeader: string | null): {
    isValid: boolean;
    token?: string;
    error?: string;
  } {
    if (!authHeader) {
      return {
        isValid: false,
        error: 'Authorization header is required'
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return {
        isValid: false,
        error: 'Authorization header must start with "Bearer "'
      };
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token || token.trim().length === 0) {
      return {
        isValid: false,
        error: 'Bearer token cannot be empty'
      };
    }

    // Podstawowa walidacja formatu JWT (3 części oddzielone kropkami)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        isValid: false,
        error: 'Invalid JWT token format'
      };
    }

    return {
      isValid: true,
      token: token
    };
  }

  /**
   * Waliduje Content-Type header
   */
  static validateContentType(contentType: string | null): {
    isValid: boolean;
    error?: string;
  } {
    if (!contentType) {
      return {
        isValid: false,
        error: 'Content-Type header is required'
      };
    }

    if (!contentType.includes('application/json')) {
      return {
        isValid: false,
        error: 'Content-Type must be application/json'
      };
    }

    return {
      isValid: true
    };
  }
}

/**
 * Waliduje czy podany URL jest prawidłowym endpointem API
 * @param url - URL do walidacji
 * @returns true jeśli URL jest prawidłowy dla endpointu API
 */
export function validateApiEndpointFormat(url: string): { isValid: boolean; error?: string } {
  try {
    const parsedUrl = new URL(url);
    
    // Sprawdzenie protokołu - tylko HTTPS lub HTTP
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: 'API endpoint must use HTTP or HTTPS protocol'
      };
    }
    
    // Sprawdzenie czy URL nie zawiera fragmentów lub query params (opcjonalne ostrzeżenie)
    if (parsedUrl.hash) {
      return {
        isValid: false,
        error: 'API endpoint should not contain URL fragments (#)'
      };
    }
    
    // Sprawdzenie minimalnej długości domeny
    if (parsedUrl.hostname.length < 4) {
      return {
        isValid: false,
        error: 'API endpoint must have a valid domain name'
      };
    }
    
    // Sprawdzenie czy nie jest localhost (w produkacji)
    if (process.env.NODE_ENV === 'production' && 
        (parsedUrl.hostname === 'localhost' || 
         parsedUrl.hostname === '127.0.0.1' || 
         parsedUrl.hostname.startsWith('192.168.') ||
         parsedUrl.hostname.startsWith('10.') ||
         parsedUrl.hostname.includes('local'))) {
      return {
        isValid: false,
        error: 'Local endpoints are not allowed in production environment'
      };
    }
    
    return { isValid: true };
    
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format'
    };
  }
}

/**
 * Waliduje długość i format nazwy exchange
 * @param name - nazwa do walidacji
 * @returns obiekt z wynikiem walidacji
 */
export function validateExchangeName(name: string): { isValid: boolean; error?: string } {
  const trimmedName = name.trim();
  
  // Sprawdzenie minimalnej długości
  if (trimmedName.length < 2) {
    return {
      isValid: false,
      error: 'Exchange name must be at least 2 characters long'
    };
  }
  
  // Sprawdzenie maksymalnej długości
  if (trimmedName.length > 100) {
    return {
      isValid: false,
      error: 'Exchange name cannot exceed 100 characters'
    };
  }
  
  // Sprawdzenie dozwolonych znaków (litery, cyfry, spacje, myślniki, kropki)
  const allowedCharsRegex = /^[a-zA-Z0-9\s\-\.\_]+$/;
  if (!allowedCharsRegex.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Exchange name can only contain letters, numbers, spaces, hyphens, dots and underscores'
    };
  }
  
  // Sprawdzenie czy nazwa nie zaczyna się od liczby
  if (/^\d/.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Exchange name cannot start with a number'
    };
  }
  
  return { isValid: true };
}

/**
 * Sanityzuje dane wejściowe dla exchange
 * @param exchangeData - dane do sanityzacji
 * @returns zsanityzowane dane
 */
export function sanitizeExchangeData(exchangeData: {
  name: string;
  api_endpoint: string;
  integration_status: string;
  metadata?: any;
}): {
  name: string;
  api_endpoint: string;
  integration_status: 'active' | 'inactive';
  metadata: any;
} {
  return {
    name: exchangeData.name.trim().replace(/\s+/g, ' '), // normalizacja spacji
    api_endpoint: exchangeData.api_endpoint.trim().toLowerCase(), // lowercase URL
    integration_status: exchangeData.integration_status.toLowerCase() as 'active' | 'inactive',
    metadata: exchangeData.metadata || null
  };
}

/**
 * Waliduje strukturę metadata dla exchange
 * @param metadata - obiekt metadata do walidacji
 * @returns wynik walidacji
 */
export function validateExchangeMetadata(metadata: any): { isValid: boolean; error?: string } {
  if (metadata === null || metadata === undefined) {
    return { isValid: true };
  }
  
  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {
      isValid: false,
      error: 'Metadata must be a valid JSON object'
    };
  }
  
  try {
    // Sprawdzenie czy obiekt można zserializować do JSON
    JSON.stringify(metadata);
    
    // Sprawdzenie rozmiaru zserializowanego obiektu (max 10KB)
    const serializedSize = JSON.stringify(metadata).length;
    if (serializedSize > 10240) {
      return {
        isValid: false,
        error: 'Metadata object is too large (max 10KB allowed)'
      };
    }
    
    return { isValid: true };
    
  } catch (error) {
    return {
      isValid: false,
      error: 'Metadata contains non-serializable data'
    };
  }
} 