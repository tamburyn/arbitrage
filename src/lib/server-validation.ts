// Server-side validation utilities for Supabase Auth integration
// Shares validation logic with client-side but adds server-specific checks

import { 
  validateEmail, 
  validatePassword, 
  validatePasswordConfirmation,
  type ValidationResult,
  type FormErrors 
} from './auth-validation.ts';

// Server-specific validation for login
export function validateServerLogin(email: string, password: string): {
  isValid: boolean;
  errors: FormErrors;
  sanitizedData?: { email: string; password: string };
} {
  const errors: FormErrors = {};
  
  // Basic validation
  if (!email || typeof email !== 'string') {
    errors.email = 'Email is required';
  } else {
    const emailValidation = validateEmail(email.trim());
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors[0];
    }
  }
  
  if (!password || typeof password !== 'string') {
    errors.password = 'Password is required';
  } else if (password.length === 0) {
    errors.password = 'Password cannot be empty';
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors,
    sanitizedData: isValid ? {
      email: email.trim().toLowerCase(),
      password
    } : undefined
  };
}

// Server-specific validation for registration
export function validateServerRegistration(
  email: string, 
  password: string, 
  confirmPassword: string
): {
  isValid: boolean;
  errors: FormErrors;
  sanitizedData?: { email: string; password: string };
} {
  const errors: FormErrors = {};
  
  // Email validation
  if (!email || typeof email !== 'string') {
    errors.email = 'Email is required';
  } else {
    const emailValidation = validateEmail(email.trim());
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors[0];
    }
  }
  
  // Password validation
  if (!password || typeof password !== 'string') {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }
  }
  
  // Confirm password validation
  if (!confirmPassword || typeof confirmPassword !== 'string') {
    errors.confirmPassword = 'Please confirm your password';
  } else {
    const confirmValidation = validatePasswordConfirmation(password, confirmPassword);
    if (!confirmValidation.isValid) {
      errors.confirmPassword = confirmValidation.errors[0];
    }
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors,
    sanitizedData: isValid ? {
      email: email.trim().toLowerCase(),
      password
    } : undefined
  };
}

// Server-specific validation for password reset
export function validateServerPasswordReset(email: string): {
  isValid: boolean;
  errors: FormErrors;
  sanitizedData?: { email: string };
} {
  const errors: FormErrors = {};
  
  if (!email || typeof email !== 'string') {
    errors.email = 'Email is required';
  } else {
    const emailValidation = validateEmail(email.trim());
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors[0];
    }
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors,
    sanitizedData: isValid ? {
      email: email.trim().toLowerCase()
    } : undefined
  };
}

// Server-specific validation for favourites update
export function validateServerFavourites(
  exchanges: unknown, 
  assets: unknown
): {
  isValid: boolean;
  errors: { [key: string]: string };
  sanitizedData?: { exchanges: string[]; assets: string[] };
} {
  const errors: { [key: string]: string } = {};
  
  // Validate exchanges
  if (!Array.isArray(exchanges)) {
    errors.exchanges = 'Exchanges must be an array';
  } else {
    const validExchanges = ['binance', 'bybit', 'kraken', 'okx'];
    const invalidExchanges = exchanges.filter(ex => 
      typeof ex !== 'string' || !validExchanges.includes(ex)
    );
    
    if (invalidExchanges.length > 0) {
      errors.exchanges = 'Invalid exchange IDs provided';
    }
    
    if (exchanges.length > 10) {
      errors.exchanges = 'Maximum 10 exchanges allowed';
    }
  }
  
  // Validate assets
  if (!Array.isArray(assets)) {
    errors.assets = 'Assets must be an array';
  } else {
    const validAssetPattern = /^[A-Z0-9]{2,10}$/;
    const invalidAssets = assets.filter(asset => 
      typeof asset !== 'string' || !validAssetPattern.test(asset)
    );
    
    if (invalidAssets.length > 0) {
      errors.assets = 'Invalid asset symbols provided';
    }
    
    if (assets.length > 50) {
      errors.assets = 'Maximum 50 assets allowed';
    }
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors,
    sanitizedData: isValid ? {
      exchanges: exchanges as string[],
      assets: assets as string[]
    } : undefined
  };
}

// Rate limiting helper
export function isRateLimited(
  identifier: string, 
  windowMs: number = 60000, // 1 minute default
  maxRequests: number = 5
): boolean {
  // This is a simple in-memory rate limiter
  // In production, you'd want to use Redis or similar
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Get existing requests for this identifier
  const key = `rate_limit_${identifier}`;
  const requests = global[key] || [];
  
  // Filter to only requests within the window
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);
  
  // Update the global store
  global[key] = [...recentRequests, now];
  
  return recentRequests.length >= maxRequests;
}

// Input sanitization
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .slice(0, 1000) // Prevent extremely long inputs
    .replace(/[<>]/g, ''); // Basic XSS prevention
}

// Email normalization
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
