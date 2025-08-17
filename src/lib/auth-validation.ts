export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormErrors {
  [key: string]: string;
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Password validation
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Password confirmation validation
export function validatePasswordConfirmation(password: string, confirmPassword: string): ValidationResult {
  const errors: string[] = [];
  
  if (!confirmPassword) {
    errors.push('Please confirm your password');
  } else if (password !== confirmPassword) {
    errors.push('Passwords do not match');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Login form validation
export function validateLoginForm(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors[0];
  }
  
  if (!password) {
    errors.password = 'Password is required';
  }
  
  return errors;
}

// Registration form validation
export function validateRegistrationForm(
  email: string, 
  password: string, 
  confirmPassword: string
): FormErrors {
  const errors: FormErrors = {};
  
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors[0];
  }
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors[0];
  }
  
  const confirmPasswordValidation = validatePasswordConfirmation(password, confirmPassword);
  if (!confirmPasswordValidation.isValid) {
    errors.confirmPassword = confirmPasswordValidation.errors[0];
  }
  
  return errors;
}

// Password reset form validation
export function validatePasswordResetForm(email: string): FormErrors {
  const errors: FormErrors = {};
  
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors[0];
  }
  
  return errors;
}

// Check if form has any errors
export function hasFormErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

// Get password strength indicator
export function getPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
} {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/(?=.*[a-z])/.test(password)) score++;
  if (/(?=.*[A-Z])/.test(password)) score++;
  if (/(?=.*\d)/.test(password)) score++;
  if (/(?=.*[@$!%*?&])/.test(password)) score++;
  
  if (score <= 2) return { strength: 'weak', score };
  if (score <= 4) return { strength: 'medium', score };
  return { strength: 'strong', score };
}
