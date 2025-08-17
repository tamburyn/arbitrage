import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
// Removed useAuth - using direct API calls instead
import { 
  validateRegistrationForm, 
  hasFormErrors, 
  getPasswordStrength,
  type FormErrors 
} from '@/lib/auth-validation';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface RegistrationFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function RegistrationForm({ onSuccess, className }: RegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const passwordStrength = getPasswordStrength(formData.password);

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear submit error
    if (submitError) {
      setSubmitError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Check terms acceptance
      if (!acceptTerms) {
        setSubmitError('Please accept the terms and conditions to continue.');
        return;
      }
      
      // Validate form
      const validationErrors = validateRegistrationForm(
        formData.email, 
        formData.password, 
        formData.confirmPassword
      );
      setErrors(validationErrors);
      
      if (hasFormErrors(validationErrors)) {
        return;
      }
      
      // Direct API call to register
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.requiresConfirmation) {
          setSubmitError(data.message || 'Please check your email for confirmation.');
        } else {
          onSuccess?.();
          // Redirect to dashboard
          window.location.href = '/';
        }
      } else {
        setSubmitError(data.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setSubmitError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'strong': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStrengthText = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      default: return '';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Get started with crypto arbitrage tracking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange('email')}
              aria-invalid={!!errors.email}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={formData.password}
                onChange={handleInputChange('password')}
                aria-invalid={!!errors.password}
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {showPassword ? 'Hide password' : 'Show password'}
                </span>
              </Button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">Password strength:</div>
                  <div className={`text-xs font-medium ${getStrengthColor(passwordStrength.strength)}`}>
                    {getStrengthText(passwordStrength.strength)}
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5, 6].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full ${
                        level <= passwordStrength.score
                          ? passwordStrength.strength === 'weak'
                            ? 'bg-red-500'
                            : passwordStrength.strength === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                aria-invalid={!!errors.confirmPassword}
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {showConfirmPassword ? 'Hide password' : 'Show password'}
                </span>
              </Button>
            </div>
            
            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <div className="flex items-center gap-2">
                {formData.password === formData.confirmPassword ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs text-red-600">Passwords don't match</span>
                  </>
                )}
              </div>
            )}
            
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="terms" 
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked === true)}
              disabled={isLoading}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label 
                htmlFor="terms" 
                className="text-sm font-normal cursor-pointer leading-relaxed"
              >
                I agree to the{' '}
                <a 
                  href="/terms" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline font-medium"
                >
                  Terms of Service
                </a>
                {' '}and{' '}
                <a 
                  href="/privacy" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline font-medium"
                >
                  Privacy Policy
                </a>
              </Label>
            </div>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !acceptTerms}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>

          {/* Additional Links */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <a 
                href="/login" 
                className="text-primary underline-offset-4 hover:underline font-medium"
              >
                Sign in
              </a>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
