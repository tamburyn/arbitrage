import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Removed useAuth - using direct API calls instead
import { 
  validatePasswordResetForm, 
  hasFormErrors, 
  type FormErrors 
} from '@/lib/auth-validation';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

interface PasswordResetFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function PasswordResetForm({ onSuccess, className }: PasswordResetFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear field error when user starts typing
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
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
      // Validate form
      const validationErrors = validatePasswordResetForm(email);
      setErrors(validationErrors);
      
      if (hasFormErrors(validationErrors)) {
        return;
      }
      
      // Direct API call to reset password
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsSuccess(true);
        onSuccess?.();
      } else {
        setSubmitError(data.error || 'Password reset failed. Please try again.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setSubmitError('Password reset failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    window.location.href = '/login';
  };

  if (isSuccess) {
    return (
      <Card className={className}>
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We've sent a password reset link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setIsSuccess(false)}
                className="text-sm"
              >
                Try again
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handleBackToLogin}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password
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
              value={email}
              onChange={handleEmailChange}
              aria-invalid={!!errors.email}
              disabled={isLoading}
              autoFocus
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
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
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              'Send reset link'
            )}
          </Button>

          {/* Back to Login */}
          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBackToLogin}
              className="w-full"
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
