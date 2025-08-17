import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useArbitrageData } from './context/ArbitrageContext';
import type { ArbitrageFilters } from '../../types';

// Exchange and asset mapping for display names
const EXCHANGE_NAMES: Record<string, string> = {
  'binance': 'Binance',
  'bybit': 'Bybit', 
  'kraken': 'Kraken',
  'okx': 'OKX'
};

const ASSET_NAMES: Record<string, string> = {
  'BTC': 'Bitcoin',
  'ETH': 'Ethereum',
  'BNB': 'BNB',
  'XRP': 'XRP',
  'ADA': 'Cardano',
  'SOL': 'Solana',
  'DOT': 'Polkadot',
  'MATIC': 'Polygon'
};

interface ActiveFiltersProps {
  className?: string;
}

export function ActiveFilters({ className }: ActiveFiltersProps) {
  const { filters, updateFilters, showFavouritesOnly } = useArbitrageData();

  // Check if filters are active (not default values)
  const hasActiveFilters = 
    filters.exchanges.length > 0 ||
    filters.assets.length > 0 ||
    filters.types.length > 0 ||
    filters.spread_range[0] > 0 ||
    filters.spread_range[1] < 5 ||
    filters.volume_range[0] > 0 ||
    filters.volume_range[1] < 100000000 ||
    !filters.only_profitable;

  // Don't show if no active filters and not in favourites mode
  if (!hasActiveFilters && !showFavouritesOnly) {
    return null;
  }

  // Remove specific filter
  const removeExchange = (exchangeId: string) => {
    updateFilters({
      exchanges: filters.exchanges.filter(id => id !== exchangeId)
    });
  };

  const removeAsset = (assetId: string) => {
    updateFilters({
      assets: filters.assets.filter(id => id !== assetId)
    });
  };

  const removeType = (type: 'intra_exchange' | 'inter_exchange') => {
    updateFilters({
      types: filters.types.filter(t => t !== type)
    });
  };

  const resetSpreadRange = () => {
    updateFilters({
      spread_range: [0, 5]
    });
  };

  const resetVolumeRange = () => {
    updateFilters({
      volume_range: [0, 100000000]
    });
  };

  const toggleProfitable = () => {
    updateFilters({
      only_profitable: true
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    const resetFilters: ArbitrageFilters = {
      exchanges: [],
      assets: [],
      types: [],
      spread_range: [0, 5],
      volume_range: [0, 100000000],
      only_profitable: true
    };
    updateFilters(resetFilters);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg border ${className}`}>
      <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
      
      {/* Favourites Only Indicator */}
      {showFavouritesOnly && (
        <Badge variant="default" className="gap-1">
          <span>Favourites Only</span>
        </Badge>
      )}

      {/* Exchange Filters */}
      {filters.exchanges.map((exchangeId) => (
        <Badge key={exchangeId} variant="secondary" className="gap-1">
          <span>{EXCHANGE_NAMES[exchangeId] || exchangeId}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={() => removeExchange(exchangeId)}
          >
            <X className="h-2 w-2" />
          </Button>
        </Badge>
      ))}

      {/* Asset Filters */}
      {filters.assets.map((assetId) => (
        <Badge key={assetId} variant="secondary" className="gap-1">
          <span>{assetId}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={() => removeAsset(assetId)}
          >
            <X className="h-2 w-2" />
          </Button>
        </Badge>
      ))}

      {/* Type Filters */}
      {filters.types.map((type) => (
        <Badge key={type} variant="secondary" className="gap-1">
          <span>{type === 'intra_exchange' ? 'Intra-Exchange' : 'Inter-Exchange'}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={() => removeType(type)}
          >
            <X className="h-2 w-2" />
          </Button>
        </Badge>
      ))}

      {/* Spread Range Filter */}
      {(filters.spread_range[0] > 0 || filters.spread_range[1] < 5) && (
        <Badge variant="secondary" className="gap-1">
          <span>Spread: {filters.spread_range[0].toFixed(2)}% - {filters.spread_range[1].toFixed(2)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={resetSpreadRange}
          >
            <X className="h-2 w-2" />
          </Button>
        </Badge>
      )}

      {/* Volume Range Filter */}
      {(filters.volume_range[0] > 0 || filters.volume_range[1] < 100000000) && (
        <Badge variant="secondary" className="gap-1">
          <span>
            Volume: ${(filters.volume_range[0] / 1000000).toFixed(1)}M - ${(filters.volume_range[1] / 1000000).toFixed(1)}M
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={resetVolumeRange}
          >
            <X className="h-2 w-2" />
          </Button>
        </Badge>
      )}

      {/* Only Profitable Filter */}
      {!filters.only_profitable && (
        <Badge variant="secondary" className="gap-1">
          <span>Include Unprofitable</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-3 w-3 p-0 hover:bg-transparent"
            onClick={toggleProfitable}
          >
            <X className="h-2 w-2" />
          </Button>
        </Badge>
      )}

      {/* Clear All Button */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearAllFilters}
          className="ml-2 h-6 px-2 text-xs"
        >
          Clear All
        </Button>
      )}
    </div>
  );
}
