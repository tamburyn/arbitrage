import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Filter, ChevronDown } from 'lucide-react';
import { useArbitrageData } from './context/ArbitrageContext';
import type { ArbitrageFilters } from '../../types';

// Available options
const AVAILABLE_EXCHANGES = [
  { id: 'binance', name: 'Binance' },
  { id: 'bybit', name: 'Bybit' },
  { id: 'kraken', name: 'Kraken' },
  { id: 'okx', name: 'OKX' }
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

interface AdvancedFiltersProps {
  className?: string;
}

export function AdvancedFilters({ className }: AdvancedFiltersProps) {
  const { filters, updateFilters, showFavouritesOnly } = useArbitrageData();
  
  // Local state for filters before applying
  const [localFilters, setLocalFilters] = useState<ArbitrageFilters>(filters);
  const [isOpen, setIsOpen] = useState(false);

  // Update local filters when global filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Apply filters
  const handleApplyFilters = () => {
    updateFilters(localFilters);
    setIsOpen(false);
  };

  // Reset filters
  const handleResetFilters = () => {
    const resetFilters: ArbitrageFilters = {
      exchanges: [],
      assets: [],
      types: [],
      spread_range: [0, 5],
      volume_range: [0, 100000000],
      only_profitable: true
    };
    setLocalFilters(resetFilters);
    updateFilters(resetFilters);
  };

  // Count active filters
  const activeFiltersCount = 
    localFilters.exchanges.length + 
    localFilters.assets.length + 
    localFilters.types.length + 
    (localFilters.spread_range[0] > 0 || localFilters.spread_range[1] < 5 ? 1 : 0) +
    (localFilters.volume_range[0] > 0 || localFilters.volume_range[1] < 100000000 ? 1 : 0) +
    (localFilters.only_profitable ? 0 : 1);

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Advanced Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Advanced Filters</CardTitle>
                  <CardDescription>
                    Customize your arbitrage opportunity search
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Exchanges Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Exchanges</h4>
                  {localFilters.exchanges.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocalFilters(prev => ({ ...prev, exchanges: [] }))}
                      className="h-6 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_EXCHANGES.map((exchange) => (
                    <div key={exchange.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`exchange-${exchange.id}`}
                        checked={localFilters.exchanges.includes(exchange.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setLocalFilters(prev => ({
                              ...prev,
                              exchanges: [...prev.exchanges, exchange.id]
                            }));
                          } else {
                            setLocalFilters(prev => ({
                              ...prev,
                              exchanges: prev.exchanges.filter(id => id !== exchange.id)
                            }));
                          }
                        }}
                      />
                      <label
                        htmlFor={`exchange-${exchange.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {exchange.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Assets Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Assets</h4>
                  {localFilters.assets.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocalFilters(prev => ({ ...prev, assets: [] }))}
                      className="h-6 px-2 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_ASSETS.map((asset) => (
                    <div key={asset.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`asset-${asset.id}`}
                        checked={localFilters.assets.includes(asset.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setLocalFilters(prev => ({
                              ...prev,
                              assets: [...prev.assets, asset.id]
                            }));
                          } else {
                            setLocalFilters(prev => ({
                              ...prev,
                              assets: prev.assets.filter(id => id !== asset.id)
                            }));
                          }
                        }}
                      />
                      <label
                        htmlFor={`asset-${asset.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {asset.symbol}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Spread Range Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Spread Range</h4>
                  <span className="text-xs text-muted-foreground">
                    {localFilters.spread_range[0].toFixed(2)}% - {localFilters.spread_range[1].toFixed(2)}%
                  </span>
                </div>
                <Slider
                  value={localFilters.spread_range}
                  onValueChange={(value) => 
                    setLocalFilters(prev => ({ ...prev, spread_range: value as [number, number] }))
                  }
                  max={5}
                  min={0}
                  step={0.01}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>5%</span>
                </div>
              </div>

              <Separator />

              {/* Volume Range Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Volume Range</h4>
                  <span className="text-xs text-muted-foreground">
                    ${(localFilters.volume_range[0] / 1000000).toFixed(1)}M - ${(localFilters.volume_range[1] / 1000000).toFixed(1)}M
                  </span>
                </div>
                <Slider
                  value={localFilters.volume_range}
                  onValueChange={(value) => 
                    setLocalFilters(prev => ({ ...prev, volume_range: value as [number, number] }))
                  }
                  max={100000000}
                  min={0}
                  step={1000000}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>$0M</span>
                  <span>$100M</span>
                </div>
              </div>

              <Separator />

              {/* Profitability Filter */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Only Profitable</h4>
                  <p className="text-xs text-muted-foreground">Show only profitable opportunities</p>
                </div>
                <Checkbox
                  checked={localFilters.only_profitable}
                  onCheckedChange={(checked) => 
                    setLocalFilters(prev => ({ ...prev, only_profitable: checked === true }))
                  }
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleApplyFilters} className="flex-1">
                  Apply Filters
                </Button>
                <Button onClick={handleResetFilters} variant="outline">
                  Reset
                </Button>
              </div>

              {/* Note about Favourites Only */}
              {showFavouritesOnly && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-700">
                    <strong>Note:</strong> Favourites Only mode is active. These filters will be applied on top of your favourite exchanges and assets.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}
