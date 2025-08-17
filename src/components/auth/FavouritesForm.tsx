import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
// Removed useAuth - using direct API calls instead
import { Loader2 } from 'lucide-react';

interface FavouritesFormProps {
  onSuccess?: () => void;
  className?: string;
}

// Available exchanges and assets - in a real app, these would come from an API
const AVAILABLE_EXCHANGES = [
  { id: 'binance', name: 'Binance', description: 'World\'s largest crypto exchange' },
  { id: 'bybit', name: 'Bybit', description: 'Crypto derivatives exchange' },
  { id: 'kraken', name: 'Kraken', description: 'Established US-based exchange' },
  { id: 'okx', name: 'OKX', description: 'Global crypto exchange platform' }
];

const AVAILABLE_ASSETS = [
  { id: 'BTC', name: 'Bitcoin', symbol: 'BTC' },
  { id: 'ETH', name: 'Ethereum', symbol: 'ETH' },
  { id: 'BNB', name: 'BNB', symbol: 'BNB' },
  { id: 'XRP', name: 'XRP', symbol: 'XRP' },
  { id: 'ADA', name: 'Cardano', symbol: 'ADA' },
  { id: 'SOL', name: 'Solana', symbol: 'SOL' },
  { id: 'DOT', name: 'Polkadot', symbol: 'DOT' },
  { id: 'MATIC', name: 'Polygon', symbol: 'MATIC' }
];

export function FavouritesForm({ onSuccess, className }: FavouritesFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Load user favourites on mount
  useEffect(() => {
    const loadUserFavourites = async () => {
      try {
        const response = await fetch('/api/user/favourites');
        const data = await response.json();
        
        if (data.success) {
          setSelectedExchanges(data.favourites.exchanges || []);
          setSelectedAssets(data.favourites.assets || []);
          // We'll assume user is authenticated if favourites loaded successfully
          setUser({ id: 'authenticated-user', email: 'user@example.com' });
        }
      } catch (error) {
        console.error('Failed to load user favourites:', error);
        // User not authenticated or error occurred
      }
    };

    loadUserFavourites();
  }, []);

  const handleExchangeToggle = (exchangeId: string) => {
    setSelectedExchanges(prev => 
      prev.includes(exchangeId)
        ? prev.filter(id => id !== exchangeId)
        : [...prev, exchangeId]
    );
    
    // Clear messages when user makes changes
    if (submitError) {
      setSubmitError('');
    }
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
    
    // Clear messages when user makes changes
    if (submitError) {
      setSubmitError('');
    }
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (selectedExchanges.length === 0) {
        setSubmitError('Please select at least one exchange to track.');
        return;
      }
      
      if (selectedAssets.length === 0) {
        setSubmitError('Please select at least one asset to track.');
        return;
      }
      
      // Direct API call to update favourites
      const response = await fetch('/api/user/favourites', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exchanges: selectedExchanges,
          assets: selectedAssets,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Your preferences have been saved successfully!');
        setSubmitError(''); // Clear any previous errors
        onSuccess?.();
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
      } else {
        setSubmitError(data.error || 'Failed to update preferences. Please try again.');
        setSuccessMessage(''); // Clear any previous success message
      }
    } catch (error) {
      console.error('Update favourites error:', error);
      setSubmitError('Failed to update preferences. Please try again.');
      setSuccessMessage(''); // Clear any previous success message
    } finally {
      setIsLoading(false);
    }
  };



  if (!user) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Exchanges Column */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Exchanges</CardTitle>
              <CardDescription>
                Select the exchanges you want to monitor for arbitrage opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {AVAILABLE_EXCHANGES.map((exchange) => (
                  <div
                    key={exchange.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`exchange-${exchange.id}`}
                      checked={selectedExchanges.includes(exchange.id)}
                      onCheckedChange={() => handleExchangeToggle(exchange.id)}
                      disabled={isLoading}
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={`exchange-${exchange.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {exchange.name}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {exchange.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Assets Column */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Assets</CardTitle>
              <CardDescription>
                Choose the cryptocurrencies you're interested in tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {AVAILABLE_ASSETS.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`asset-${asset.id}`}
                      checked={selectedAssets.includes(asset.id)}
                      onCheckedChange={() => handleAssetToggle(asset.id)}
                      disabled={isLoading}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={`asset-${asset.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {asset.symbol}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {asset.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 rounded-md bg-green-50 border border-green-200">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}

          {/* Submit Error */}
          {submitError && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-center">
            <Button 
              type="submit" 
              className="px-8" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving preferences...
                </>
              ) : (
                'Save preferences'
              )}
            </Button>
          </div>

        </form>
    </div>
  );
}
