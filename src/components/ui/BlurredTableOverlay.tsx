import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, Star } from 'lucide-react';

interface BlurredTableOverlayProps {
  title: string;
  description: string;
  className?: string;
}

export function BlurredTableOverlay({ 
  title, 
  description, 
  className = "" 
}: BlurredTableOverlayProps) {
  const handleSignUpClick = () => {
    window.location.href = '/register';
  };

  return (
    <div className={`absolute inset-0 z-10 ${className}`}>
      {/* Blur backdrop */}
      <div className="absolute inset-0 backdrop-blur-sm bg-background/60" />
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-2 border-primary/20">
          <CardContent className="p-6 text-center space-y-4">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
            
            {/* Title */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                {title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            </div>
            
            {/* CTA Button */}
            <div className="pt-2">
              <Button 
                onClick={handleSignUpClick}
                className="w-full"
                size="lg"
              >
                Sign Up to Unlock Data
              </Button>
            </div>
            
            {/* Additional info */}
            <p className="text-xs text-muted-foreground">
              Free account • No credit card required
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
