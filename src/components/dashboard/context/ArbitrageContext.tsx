import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { 
  ArbitrageContextState, 
  ArbitrageOpportunityVM, 
  ArbitrageSummaryDTO,
  SpreadHistoryPoint,
  ArbitrageFilters,
  SortState,
  TimeRange,
  ArbitrageOpportunityDTO,
  SpreadHistoryDTO
} from '../../../types';

// Actions
type ArbitrageAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_OPPORTUNITIES'; payload: ArbitrageOpportunityVM[] }
  | { type: 'SET_SUMMARY'; payload: ArbitrageSummaryDTO }
  | { type: 'SET_SPREAD_HISTORY'; payload: SpreadHistoryPoint[] }
  | { type: 'SET_FILTERS'; payload: ArbitrageFilters }
  | { type: 'SET_SORT_STATE'; payload: SortState }
  | { type: 'SET_TIME_RANGE'; payload: TimeRange }
  | { type: 'MARK_OPPORTUNITIES_OLD'; payload: string[] } // IDs to mark as old
  | { type: 'SET_LAST_UPDATED'; payload: Date }
  | { type: 'SET_FAVOURITES_ONLY'; payload: boolean }
  | { type: 'SET_USER_FAVOURITES'; payload: { exchanges: string[]; assets: string[] } }
  | { type: 'SET_IS_AUTHENTICATED'; payload: boolean };

// Initial state
const initialState: ArbitrageContextState = {
  opportunities: [],
  summary: null,
  spreadHistory: [],
  filters: {
    exchanges: [],
    assets: [],
    types: [],
    spread_range: [0, 5], // Changed from [0, 100] to [0, 5] since API returns percentages as decimals (0.015 = ~0.02%)
    volume_range: [0, 100000000], // Increased volume range 
    only_profitable: true
  },
  sortState: {
    column: 'spread_percentage',
    direction: 'desc'
  },
  selectedTimeRange: '24h',
  loading: false,
  error: null,
  lastUpdated: null,
  showFavouritesOnly: false,
  userFavourites: { exchanges: [], assets: [] },
  isAuthenticated: false
};

// Reducer
function arbitrageReducer(state: ArbitrageContextState, action: ArbitrageAction): ArbitrageContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_OPPORTUNITIES':
      return { ...state, opportunities: action.payload, loading: false, error: null };
    
    case 'SET_SUMMARY':
      return { ...state, summary: action.payload };
    
    case 'SET_SPREAD_HISTORY':
      return { ...state, spreadHistory: action.payload };
    
    case 'SET_FILTERS':
      return { ...state, filters: action.payload };
    
    case 'SET_SORT_STATE':
      return { ...state, sortState: action.payload };
    
    case 'SET_TIME_RANGE':
      return { ...state, selectedTimeRange: action.payload };
    
    case 'MARK_OPPORTUNITIES_OLD':
      return {
        ...state,
        opportunities: state.opportunities.map(opp => 
          action.payload.includes(opp.id) 
            ? { ...opp, isNew: false }
            : opp
        )
      };
    
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdated: action.payload };
    
    case 'SET_FAVOURITES_ONLY':
      const newFilters = action.payload ? {
        ...state.filters,
        exchanges: state.userFavourites.exchanges,
        assets: state.userFavourites.assets
      } : {
        ...state.filters,
        exchanges: [],
        assets: []
      };
      return { 
        ...state, 
        showFavouritesOnly: action.payload,
        filters: newFilters
      };
    
    case 'SET_USER_FAVOURITES':
      const updatedFilters = state.showFavouritesOnly ? {
        ...state.filters,
        exchanges: action.payload.exchanges,
        assets: action.payload.assets
      } : state.filters;
      return { 
        ...state, 
        userFavourites: action.payload,
        filters: updatedFilters
      };
    
    case 'SET_IS_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: action.payload
      };
    
    default:
      return state;
  }
}

// Context
interface ArbitrageContextValue extends ArbitrageContextState {
  fetchOpportunities: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  fetchSpreadHistory: (asset?: string, exchange?: string) => Promise<void>;
  updateFilters: (filters: Partial<ArbitrageFilters>) => void;
  updateSortState: (sortState: SortState) => void;
  updateTimeRange: (timeRange: TimeRange) => void;
  setFavouritesOnly: (enabled: boolean) => void;
  setUserFavourites: (favourites: { exchanges: string[]; assets: string[] }) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
}

const ArbitrageContext = createContext<ArbitrageContextValue | undefined>(undefined);

// Helper functions
function transformOpportunityDTO(dto: any): ArbitrageOpportunityVM {
  const now = new Date();
  const opportunityTime = new Date(dto.timestamp);
  const isNew = (now.getTime() - opportunityTime.getTime()) < 30000; // 30 seconds

  // Handle both API formats - the actual API returns numbers, not strings
  const spreadPercentage = typeof dto.spreadPercentage === 'number' 
    ? dto.spreadPercentage 
    : parseFloat(dto.spread_percentage || '0');
  
  const volume = typeof dto.volume === 'number' 
    ? dto.volume 
    : parseFloat(dto.volume || '0');
    
  const buyPrice = typeof dto.buyPrice === 'number' 
    ? dto.buyPrice 
    : parseFloat(dto.buy_price || '0');
    
  const sellPrice = typeof dto.sellPrice === 'number' 
    ? dto.sellPrice 
    : parseFloat(dto.sell_price || '0');

  const potentialProfitPercentage = typeof dto.potentialProfitPercentage === 'number'
    ? dto.potentialProfitPercentage
    : parseFloat(dto.potential_profit_percentage || '0');

  const thresholdUsed = typeof dto.thresholdUsed === 'number'
    ? dto.thresholdUsed
    : parseFloat(dto.threshold_used || '0');

  // Extract symbol and exchange name from the API response format
  const symbol = dto.asset?.symbol || (dto.additional_data as any)?.symbol || 'Unknown';
  const exchangeName = dto.exchange || (dto.additional_data as any)?.exchange || 'Unknown';

  return {
    id: dto.id,
    timestamp: dto.timestamp,
    type: dto.type,
    asset_id: dto.asset_id || '',
    exchange_id: dto.exchange_id || '',
    exchange_from_id: dto.exchange_from_id || null,
    exchange_to_id: dto.exchange_to_id || null,
    spread_percentage: spreadPercentage,
    potential_profit_percentage: potentialProfitPercentage,
    volume: volume,
    buy_price: buyPrice,
    sell_price: sellPrice,
    threshold_used: thresholdUsed,
    is_profitable: dto.isProfitable || dto.is_profitable || false,
    additional_data: dto.additionalData || dto.additional_data || {},
    created_at: dto.created_at || dto.timestamp,
    isNew,
    symbol,
    exchange_name: exchangeName,
    price_difference: sellPrice - buyPrice,
    formatted_volume: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(volume)
  };
}

function transformSpreadHistoryDTO(dto: SpreadHistoryDTO): SpreadHistoryPoint {
  return {
    time: new Date(dto.timestamp),
    spread_percentage: dto.spread_percentage,
    volume: dto.volume,
    asset_symbol: dto.asset_symbol,
    exchange_name: dto.exchange_name
  };
}

// Provider component
interface ArbitrageProviderProps {
  children: React.ReactNode;
  refreshInterval?: number; // milliseconds, default 60000 (60s)
  user?: { id: string; email?: string } | null;
}

export function ArbitrageProvider({ children, refreshInterval = 60000, user }: ArbitrageProviderProps) {
  const [state, dispatch] = useReducer(arbitrageReducer, initialState);

  // Fetch opportunities
  const fetchOpportunities = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      const queryParams = new URLSearchParams();
      queryParams.set('limit', '50'); // Limit to 50 records like OrderBooks
      
      // Apply filters
      if (state.filters.only_profitable) {
        queryParams.set('profitable', 'true');
      }
      
      if (state.filters.types.length > 0) {
        queryParams.set('type', state.filters.types[0]); // API supports single type for now
      }

      const response = await fetch(`/api/arbitrage-opportunities?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Transform DTOs to ViewModels
      const transformedOpportunities = data.data?.map(transformOpportunityDTO) || [];
      
      // Debug logging
      console.log('API Response data length:', data.data?.length || 0);
      console.log('Transformed opportunities length:', transformedOpportunities.length);
      if (transformedOpportunities.length > 0) {
        console.log('First opportunity:', transformedOpportunities[0]);
      }
      
      dispatch({ type: 'SET_OPPORTUNITIES', payload: transformedOpportunities });
      dispatch({ type: 'SET_LAST_UPDATED', payload: new Date() });

    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [state.filters]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const hours = state.selectedTimeRange === '1h' ? 1 : 
                   state.selectedTimeRange === '6h' ? 6 : 24;

      // Build query parameters
      const params = new URLSearchParams({ hours: hours.toString() });
      
      // Add filters if favourites only mode is active
      if (state.showFavouritesOnly) {
        if (state.userFavourites.exchanges.length > 0) {
          // Map exchange IDs to names (binance -> Binance)
          const exchangeNames = state.userFavourites.exchanges.map(exchangeId => {
            const mapping: Record<string, string> = {
              'binance': 'Binance',
              'bybit': 'Bybit', 
              'kraken': 'Kraken',
              'okx': 'OKX'
            };
            return mapping[exchangeId] || exchangeId;
          });
          params.set('exchanges', exchangeNames.join(','));
        }
        if (state.userFavourites.assets.length > 0) {
          params.set('assets', state.userFavourites.assets.join(','));
        }
      } else if (state.filters.exchanges.length > 0 || state.filters.assets.length > 0) {
        // Apply regular filters
        if (state.filters.exchanges.length > 0) {
          params.set('exchanges', state.filters.exchanges.join(','));
        }
        if (state.filters.assets.length > 0) {
          params.set('assets', state.filters.assets.join(','));
        }
      }

      const response = await fetch(`/api/arbitrage-summary?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const summary = await response.json();
      
      if (summary.error) {
        throw new Error(summary.error);
      }

      dispatch({ type: 'SET_SUMMARY', payload: summary });

    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  }, [state.selectedTimeRange, state.showFavouritesOnly, state.userFavourites, state.filters]);

  // Fetch spread history using recent opportunities (top 20)
  const fetchSpreadHistory = useCallback(async (asset?: string, exchange?: string) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('limit', '50'); // Top 50 most recent opportunities  
      queryParams.set('profitable', 'true'); // Only profitable ones
      
      if (asset) queryParams.set('asset', asset);
      if (exchange) queryParams.set('exchange', exchange);

      const response = await fetch(`/api/arbitrage-opportunities?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Transform opportunities to spread history format
      const transformedHistory = data.data?.map((opp: any) => ({
        time: new Date(opp.timestamp),
        spread_percentage: opp.spreadPercentage || 0,
        volume: opp.volume || 0,
        asset_symbol: opp.asset?.symbol || 'Unknown',
        exchange_name: opp.exchange || 'Unknown',
        buy_price: opp.buyPrice || 0,
        sell_price: opp.sellPrice || 0,
        potential_profit_percentage: opp.potentialProfitPercentage || 0
      })) || [];
      
      console.log('Spread History API Response:', {
        dataLength: data.data?.length || 0,
        transformedLength: transformedHistory.length,
        firstItem: transformedHistory[0]
      });
      
      dispatch({ type: 'SET_SPREAD_HISTORY', payload: transformedHistory });

    } catch (error) {
      console.error('Failed to fetch spread history:', error);
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<ArbitrageFilters>) => {
    dispatch({ 
      type: 'SET_FILTERS', 
      payload: { ...state.filters, ...newFilters }
    });
  }, [state.filters]);

  // Update sort state
  const updateSortState = useCallback((sortState: SortState) => {
    dispatch({ type: 'SET_SORT_STATE', payload: sortState });
  }, []);

  // Update time range
  const updateTimeRange = useCallback((timeRange: TimeRange) => {
    dispatch({ type: 'SET_TIME_RANGE', payload: timeRange });
  }, []);

  // Set favourites only mode
  const setFavouritesOnly = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_FAVOURITES_ONLY', payload: enabled });
  }, []);

  // Set user favourites
  const setUserFavourites = useCallback((favourites: { exchanges: string[]; assets: string[] }) => {
    dispatch({ type: 'SET_USER_FAVOURITES', payload: favourites });
  }, []);

  const setIsAuthenticated = useCallback((isAuthenticated: boolean) => {
    dispatch({ type: 'SET_IS_AUTHENTICATED', payload: isAuthenticated });
  }, []);

  // Set authentication status on mount
  useEffect(() => {
    const isAuth = !!user;
    setIsAuthenticated(isAuth);
  }, [user, setIsAuthenticated]);

  // Load user favourites on mount
  useEffect(() => {
    const loadUserFavourites = async () => {
      try {
        const response = await fetch('/api/user/favourites');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUserFavourites({
              exchanges: data.favourites.exchanges || [],
              assets: data.favourites.assets || []
            });
          }
        }
      } catch (error) {
        console.log('Could not load user favourites:', error);
        // Silent fail - user might not be authenticated
      }
    };

    loadUserFavourites();
  }, [setUserFavourites]);

  // Listen for global filter events
  useEffect(() => {
    const handleFilterChange = (event: CustomEvent) => {
      console.log('ArbitrageContext received filter change:', event.detail.showFavouritesOnly);
      setFavouritesOnly(event.detail.showFavouritesOnly);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('filterChange', handleFilterChange as EventListener);
      return () => {
        window.removeEventListener('filterChange', handleFilterChange as EventListener);
      };
    }
  }, [setFavouritesOnly]);

  // Auto-refresh data
  useEffect(() => {
    // Initial fetch
    fetchOpportunities();
    fetchSummary();
    fetchSpreadHistory();

    // Set up interval
    const interval = setInterval(() => {
      fetchOpportunities();
      fetchSummary();
      fetchSpreadHistory();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchOpportunities, fetchSummary, fetchSpreadHistory, refreshInterval]);

  // Mark opportunities as old after 30 seconds
  useEffect(() => {
    const newOpportunities = state.opportunities.filter(opp => opp.isNew);
    
    if (newOpportunities.length > 0) {
      const timeout = setTimeout(() => {
        dispatch({ 
          type: 'MARK_OPPORTUNITIES_OLD', 
          payload: newOpportunities.map(opp => opp.id)
        });
      }, 30000);

      return () => clearTimeout(timeout);
    }
  }, [state.opportunities]);

  // Re-fetch when filters or time range change
  useEffect(() => {
    fetchOpportunities();
    fetchSummary(); // Also re-fetch summary when filters change
    
    // If favourites only mode is active and we have favourites, fetch filtered spread history
    if (state.showFavouritesOnly && state.userFavourites.assets.length > 0) {
      // Fetch for first asset and exchange combination
      const asset = state.userFavourites.assets[0];
      const exchange = state.userFavourites.exchanges[0];
      fetchSpreadHistory(asset, exchange);
    } else {
      // Fetch all data
      fetchSpreadHistory();
    }
  }, [state.filters, state.showFavouritesOnly, state.userFavourites, fetchOpportunities, fetchSummary, fetchSpreadHistory]);



  const contextValue: ArbitrageContextValue = {
    ...state,
    fetchOpportunities,
    fetchSummary,
    fetchSpreadHistory,
    updateFilters,
    updateSortState,
    updateTimeRange,
    setFavouritesOnly,
    setUserFavourites,
    setIsAuthenticated
  };

  return (
    <ArbitrageContext.Provider value={contextValue}>
      {children}
    </ArbitrageContext.Provider>
  );
}

// Hook to use context
export function useArbitrageData() {
  const context = useContext(ArbitrageContext);
  
  if (context === undefined) {
    throw new Error('useArbitrageData must be used within an ArbitrageProvider');
  }
  
  return context;
}
