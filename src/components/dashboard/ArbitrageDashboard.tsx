import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArbitrageProvider } from './context/ArbitrageContext';
import { SummaryCards } from './arbitrage/SummaryCards';
import { OpportunityTable } from './arbitrage/OpportunityTable';
import { SpreadChart } from './arbitrage/SpreadChart';
import SimpleOrderBookTable from './SimpleOrderBookTable';
import { AdvancedFilters } from './AdvancedFilters';
import { ActiveFilters } from './ActiveFilters';
import type { ArbitrageOpportunityVM } from '../../types';

interface ArbitrageDashboardProps {
  user?: { id: string; email?: string } | null;
}

// Main dashboard component
function ArbitrageDashboard({ user }: ArbitrageDashboardProps) {
  const [selectedOpportunity, setSelectedOpportunity] = React.useState<ArbitrageOpportunityVM | null>(null);

  const handleSelectOpportunity = React.useCallback((opportunity: ArbitrageOpportunityVM) => {
    setSelectedOpportunity(opportunity);
    // TODO: Open side panel with opportunity details
  }, []);

  return (
    <ArbitrageProvider refreshInterval={60000} user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Arbitrage Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor real-time arbitrage opportunities across crypto exchanges
            </p>
          </div>
          <AdvancedFilters />
        </div>

        {/* Active Filters */}
        <ActiveFilters />

        {/* Summary Cards */}
        <SummaryCards />

        {/* Chart Section */}
        <SpreadChart height={400} />

        {/* Data Tables Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Arbitrage Opportunities */}
          <OpportunityTable onSelectOpportunity={handleSelectOpportunity} />
          
          {/* Order Books */}
          <SimpleOrderBookTable />
        </div>

        {/* TODO: Add filters sidebar */}
        {/* TODO: Add side panel for opportunity details */}
        {/* TODO: Add real-time notifications */}
      </div>
    </ArbitrageProvider>
  );
}

// Mount function for Astro integration
export function mountArbitrageDashboard(container: HTMLElement, user?: { id: string; email?: string } | null) {
  // Clear any existing content
  container.innerHTML = '';
  
  // Create root and render
  const root = createRoot(container);
  root.render(<ArbitrageDashboard user={user} />);
  
  // Return cleanup function
  return () => {
    root.unmount();
  };
}

// Default export for direct import
export default ArbitrageDashboard;
