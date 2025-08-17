import React, { createContext, useContext, useState } from 'react';

interface FilterState {
  exchange: string;
  searchAssets: string;
  minSpread: number | null;
  highVolumeOnly: boolean;
  majorPairsOnly: boolean;
  activeOpportunitiesOnly: boolean;
}

interface FilterContextType {
  filters: FilterState;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  exchange: '',
  searchAssets: '',
  minSpread: null,
  highVolumeOnly: false,
  majorPairsOnly: false,
  activeOpportunitiesOnly: false,
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <FilterContext.Provider value={{ filters, updateFilter, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
