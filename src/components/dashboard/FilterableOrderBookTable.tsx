import React from 'react';
import { useFilters } from './FilterContext';
import SimpleOrderBookTable from './SimpleOrderBookTable';

// Client-only wrapper that provides filters to SimpleOrderBookTable
export default function FilterableOrderBookTable() {
  const { filters } = useFilters();
  
  return <SimpleOrderBookTable filters={filters} />;
}
