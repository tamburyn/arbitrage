import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { BlurredTableOverlay } from '../../ui/BlurredTableOverlay';
import { useArbitrageData } from '../context/ArbitrageContext';
import type { ArbitrageOpportunityVM, SortState } from '../../../types';

// Sort icons
const SortIcon = ({ direction }: { direction?: 'asc' | 'desc' }) => {
  if (!direction) {
    return (
      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }

  return direction === 'asc' ? (
    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
    </svg>
  );
};

// Time ago helper
function timeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  } else {
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
}

// Table header component with sorting
interface SortableHeaderProps {
  label: string;
  column: keyof ArbitrageOpportunityVM;
  sortState: SortState;
  onSort: (column: keyof ArbitrageOpportunityVM) => void;
  className?: string;
}

function SortableHeader({ label, column, sortState, onSort, className }: SortableHeaderProps) {
  const isActive = sortState.column === column;
  const direction = isActive ? sortState.direction : undefined;

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 hover:bg-transparent font-medium"
        onClick={() => onSort(column)}
      >
        <span className="flex items-center gap-2">
          {label}
          <SortIcon direction={direction} />
        </span>
      </Button>
    </TableHead>
  );
}

// Table row component
interface OpportunityRowProps {
  opportunity: ArbitrageOpportunityVM;
  onSelect: (opportunity: ArbitrageOpportunityVM) => void;
}

function OpportunityRow({ opportunity, onSelect }: OpportunityRowProps) {
  const getTypeVariant = (type: string) => {
    return type === 'intra_exchange' ? 'secondary' : 'outline';
  };

  const getSpreadColor = (spread: number) => {
    if (spread >= 2) return 'text-green-600 font-semibold';
    if (spread >= 1) return 'text-yellow-600 font-medium';
    return 'text-gray-600';
  };

  const getProfitabilityBadge = (isProfitable: boolean) => {
    return isProfitable ? (
      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
        Profitable
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
        Not Profitable
      </Badge>
    );
  };

  return (
    <TableRow 
      className={`cursor-pointer hover:bg-muted/50 transition-colors ${
        opportunity.isNew ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onClick={() => onSelect(opportunity)}
    >
      {/* Asset - Always visible, stacked info on mobile - 40% width */}
      <TableCell className="font-medium w-[40%] sm:w-auto">
        <div className="space-y-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-semibold text-sm">{opportunity.symbol}</span>
            {opportunity.isNew && (
              <Badge variant="destructive" className="text-xs py-0 px-1">
                NEW
              </Badge>
            )}
          </div>
          {/* Show extra info on mobile when other columns are hidden */}
          <div className="sm:hidden text-xs text-muted-foreground space-y-1">
            <div className="truncate">{opportunity.exchange_name}</div>
            <div className="flex gap-1 items-center flex-wrap">
              <Badge variant={getTypeVariant(opportunity.type)} className="text-xs">
                {opportunity.type === 'intra_exchange' ? 'Intra' : 'Inter'}
              </Badge>
              <span className="text-xs">{timeAgo(opportunity.timestamp)}</span>
            </div>
          </div>
        </div>
      </TableCell>

      {/* Exchange - Hidden on mobile */}
      <TableCell className="hidden sm:table-cell">
        <div className="space-y-1">
          <div className="text-sm">{opportunity.exchange_name}</div>
          <Badge variant={getTypeVariant(opportunity.type)} className="text-xs">
            {opportunity.type === 'intra_exchange' ? 'Intra' : 'Inter'}
          </Badge>
        </div>
      </TableCell>

      {/* Spread % - Always visible, enhanced on mobile - 30% width */}
      <TableCell className="w-[30%] sm:w-auto">
        <div className="space-y-1">
          <span className={`${getSpreadColor(opportunity.spread_percentage)} font-semibold text-sm`}>
            {opportunity.spread_percentage.toFixed(3)}%
          </span>
          {/* Show profit % on mobile when profit column is hidden */}
          <div className="md:hidden text-xs text-muted-foreground">
            Profit: {opportunity.potential_profit_percentage.toFixed(3)}%
          </div>
        </div>
      </TableCell>

      {/* Profit % - Hidden on mobile */}
      <TableCell className="hidden md:table-cell">
        <span className={getSpreadColor(opportunity.potential_profit_percentage)}>
          {opportunity.potential_profit_percentage.toFixed(3)}%
        </span>
      </TableCell>

      {/* Volume - Hidden on mobile/tablet */}
      <TableCell className="hidden lg:table-cell">
        <span className="font-mono text-sm">
          {opportunity.formatted_volume}
        </span>
      </TableCell>

      {/* Prices - Hidden on mobile/tablet */}
      <TableCell className="hidden lg:table-cell">
        <div className="text-sm space-y-1">
          <div className="text-green-600">
            Buy: ${opportunity.buy_price.toFixed(2)}
          </div>
          <div className="text-red-600">
            Sell: ${opportunity.sell_price.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            Diff: ${opportunity.price_difference.toFixed(2)}
          </div>
        </div>
      </TableCell>

      {/* Status - Always visible but compact on mobile - 30% width */}
      <TableCell className="w-[30%] sm:w-auto">
        <div className="space-y-1">
          {getProfitabilityBadge(opportunity.is_profitable)}
          {/* Show volume on mobile when volume column is hidden */}
          <div className="lg:hidden text-xs text-muted-foreground truncate">
            {opportunity.formatted_volume}
          </div>
        </div>
      </TableCell>

      {/* Time - Hidden on mobile */}
      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
        {timeAgo(opportunity.timestamp)}
      </TableCell>
    </TableRow>
  );
}

// Loading skeleton
function TableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse flex space-x-4 p-4">
          <div className="h-4 bg-muted rounded w-16"></div>
          <div className="h-4 bg-muted rounded w-20"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
          <div className="h-4 bg-muted rounded w-16"></div>
          <div className="h-4 bg-muted rounded w-16"></div>
          <div className="h-4 bg-muted rounded w-24"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
          <div className="h-4 bg-muted rounded w-20"></div>
          <div className="h-4 bg-muted rounded w-16"></div>
        </div>
      ))}
    </div>
  );
}

// Main component
interface OpportunityTableProps {
  onSelectOpportunity?: (opportunity: ArbitrageOpportunityVM) => void;
}

export function OpportunityTable({ onSelectOpportunity }: OpportunityTableProps) {
  const { 
    opportunities, 
    loading, 
    sortState, 
    updateSortState,
    filters,
    isAuthenticated
  } = useArbitrageData();

  // Handle sorting
  const handleSort = React.useCallback((column: keyof ArbitrageOpportunityVM) => {
    const newDirection = 
      sortState.column === column && sortState.direction === 'desc' 
        ? 'asc' 
        : 'desc';
    
    updateSortState({ column, direction: newDirection });
  }, [sortState, updateSortState]);

  // Sort opportunities
  const sortedOpportunities = React.useMemo(() => {
    if (!opportunities.length) return [];

    return [...opportunities].sort((a, b) => {
      const aValue = a[sortState.column];
      const bValue = b[sortState.column];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortState.direction === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortState.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [opportunities, sortState]);

  // Filter opportunities
  const filteredOpportunities = React.useMemo(() => {
    console.log('Filtering opportunities:', {
      totalOpportunities: sortedOpportunities.length,
      filters,
      firstOpp: sortedOpportunities[0]
    });
    
    return sortedOpportunities.filter(opp => {
      // Only profitable filter
      if (filters.only_profitable && !opp.is_profitable) {
        return false;
      }

      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(opp.type)) {
        return false;
      }

      // Exchange filter (simple contains for now)
      if (filters.exchanges.length > 0) {
        const hasExchange = filters.exchanges.some(exchange => 
          opp.exchange_name?.toLowerCase().includes(exchange.toLowerCase())
        );
        if (!hasExchange) return false;
      }

      // Asset filter
      if (filters.assets.length > 0) {
        const hasAsset = filters.assets.some(asset => 
          opp.symbol?.toLowerCase().includes(asset.toLowerCase())
        );
        if (!hasAsset) return false;
      }

      // Spread range filter
      if (opp.spread_percentage < filters.spread_range[0] || 
          opp.spread_percentage > filters.spread_range[1]) {
        return false;
      }

      // Volume range filter  
      if (opp.volume < filters.volume_range[0] || 
          opp.volume > filters.volume_range[1]) {
        return false;
      }

      return true;
    });
  }, [sortedOpportunities, filters]);

  const handleSelectOpportunity = React.useCallback((opportunity: ArbitrageOpportunityVM) => {
    onSelectOpportunity?.(opportunity);
  }, [onSelectOpportunity]);

  if (loading && opportunities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Arbitrage Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Arbitrage Opportunities</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredOpportunities.length} opportunities found
              {filters.only_profitable && ' (profitable only)'}
            </p>
          </div>
          
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Updating...
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="relative p-2.5 sm:p-6">
        {/* Blur overlay for unauthenticated users */}
        {!isAuthenticated && (
          <BlurredTableOverlay
            title="Premium Data"
            description="Sign up to access real-time arbitrage opportunities across all exchanges"
          />
        )}
        
        {filteredOpportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No arbitrage opportunities found matching current filters.</p>
            <p className="text-sm mt-2">Try adjusting your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-200px)]">
            <Table className="min-w-full responsive-table"
                   style={{
                     '--tw-table-layout': 'fixed'
                   } as React.CSSProperties}>
              <TableHeader>
                <TableRow>
                  {/* Always visible on mobile - 40% width */}
                  <SortableHeader 
                    label="Asset" 
                    column="symbol" 
                    sortState={sortState} 
                    onSort={handleSort}
                    className="w-[40%] sm:w-auto"
                  />
                  {/* Hide on mobile */}
                  <TableHead className="hidden sm:table-cell w-auto">Exchange</TableHead>
                  {/* Always visible - key metric - 30% width */}
                  <SortableHeader 
                    label="Spread %" 
                    column="spread_percentage" 
                    sortState={sortState} 
                    onSort={handleSort}
                    className="w-[30%] sm:w-auto"
                  />
                  {/* Hide on mobile */}
                  <SortableHeader 
                    label="Profit %" 
                    column="potential_profit_percentage" 
                    sortState={sortState} 
                    onSort={handleSort}
                    className="hidden md:table-cell"
                  />
                  {/* Hide on mobile */}
                  <SortableHeader 
                    label="Volume" 
                    column="volume" 
                    sortState={sortState} 
                    onSort={handleSort}
                    className="hidden lg:table-cell"
                  />
                  {/* Hide on mobile */}
                  <TableHead className="hidden lg:table-cell">Prices</TableHead>
                  {/* Always visible - important status - 30% width */}
                  <SortableHeader 
                    label="Status" 
                    column="is_profitable" 
                    sortState={sortState} 
                    onSort={handleSort}
                    className="w-[30%] sm:w-auto"
                  />
                  {/* Hide on mobile */}
                  <SortableHeader 
                    label="Time" 
                    column="timestamp" 
                    sortState={sortState} 
                    onSort={handleSort}
                    className="hidden sm:table-cell"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOpportunities.map((opportunity) => (
                  <OpportunityRow
                    key={opportunity.id}
                    opportunity={opportunity}
                    onSelect={handleSelectOpportunity}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {filteredOpportunities.length > 10 && (
          <div className="mt-4 text-center">
            <Badge variant="outline">
              Showing latest {Math.min(filteredOpportunities.length, 50)} entries
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
