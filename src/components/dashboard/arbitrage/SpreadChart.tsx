import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { useArbitrageData } from '../context/ArbitrageContext';
import type { TimeRange, SpreadHistoryPoint } from '../../../types';

// Time range selector component
interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  disabled?: boolean;
}

function TimeRangeSelector({ selectedRange, onRangeChange, disabled }: TimeRangeSelectorProps) {
  const ranges: { value: TimeRange; label: string }[] = [
    { value: '1h', label: '1H' },
    { value: '6h', label: '6H' },
    { value: '24h', label: '24H' }
  ];

  return (
    <div className="flex items-center gap-1 border rounded-md p-1">
      {ranges.map((range) => (
        <Button
          key={range.value}
          variant={selectedRange === range.value ? 'default' : 'ghost'}
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => onRangeChange(range.value)}
          disabled={disabled}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}

// Custom tooltip component for profit chart
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
      <p className="text-sm font-medium text-foreground mb-2">
        {data.asset_symbol} • {data.exchange_name}
      </p>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Profit USD:</span>
          <span className="text-sm font-medium text-green-600">
            ${data.profit_usd.toFixed(2)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Spread:</span>
          <span className="text-sm font-medium text-primary">
            {data.spread_percentage.toFixed(3)}%
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Volume:</span>
          <span className="text-sm font-mono">
            ${data.volume.toLocaleString()}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Buy Price:</span>
          <span className="text-sm font-mono">
            ${data.buy_price.toFixed(4)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Sell Price:</span>
          <span className="text-sm font-mono">
            ${data.sell_price.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for chart
function ChartSkeleton() {
  return (
    <div className="h-[300px] w-full animate-pulse">
      <div className="h-full bg-muted rounded-md flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading chart data...</div>
      </div>
    </div>
  );
}

// Main component
interface SpreadChartProps {
  selectedAsset?: string;
  selectedExchange?: string;
  height?: number;
}

export function SpreadChart({ 
  selectedAsset, 
  selectedExchange, 
  height = 300 
}: SpreadChartProps) {
  const { 
    spreadHistory, 
    selectedTimeRange, 
    updateTimeRange,
    fetchSpreadHistory,
    loading 
  } = useArbitrageData();

  // Transform data for profit bar chart
  const chartData = React.useMemo(() => {
    return spreadHistory
      .map((point, index) => {
        // Calculate potential profit in USD using spread percentage
        // profit_usd = (spread_percentage / 100) * volume
        const profit_usd = (point.spread_percentage / 100) * point.volume;
        
        return {
          id: `${point.asset_symbol}-${point.exchange_name}-${index}`,
          rank: index + 1,
          spread_percentage: point.spread_percentage,
          volume: point.volume,
          profit_usd: profit_usd,
          asset_symbol: point.asset_symbol,
          exchange_name: point.exchange_name,
          buy_price: point.buy_price,
          sell_price: point.sell_price,
          label: `${point.asset_symbol}/${point.exchange_name}`
        };
      })
      .sort((a, b) => b.profit_usd - a.profit_usd) // Sort by profit DESC
      .slice(0, 20); // Top 20
  }, [spreadHistory]);

  // Calculate threshold line value (could be dynamic)
  const thresholdValue = 2.0; // Default 2% threshold

  // Calculate statistics for profit
  const stats = React.useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalProfit: 0,
        bestProfit: 0,
        averageProfit: 0,
        count: 0
      };
    }

    const profits = chartData.map(d => d.profit_usd);
    
    return {
      totalProfit: profits.reduce((sum, val) => sum + val, 0),
      bestProfit: Math.max(...profits),
      averageProfit: profits.reduce((sum, val) => sum + val, 0) / profits.length,
      count: profits.length
    };
  }, [chartData]);

  // Handle manual refresh of spread history
  const handleRefresh = React.useCallback(() => {
    fetchSpreadHistory(selectedAsset, selectedExchange);
  }, [fetchSpreadHistory, selectedAsset, selectedExchange]);

  // Format X-axis labels for recent opportunities
  const formatXAxisLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      // Less than 1 hour ago - show minutes
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 24) {
      // Less than 24 hours ago - show hours and minutes
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      // More than 24 hours ago - show date and hour
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit' 
      });
    }
  };

  if (loading && chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spread History</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Top Profit Opportunities</CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Top {stats.count} opportunities by potential USD profit
                {selectedAsset && ` • ${selectedAsset}`}
                {selectedExchange && ` • ${selectedExchange}`}
              </p>
              
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                  Updating...
                </div>
              )}
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border hover:border-border disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Statistics cards */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-2 bg-muted/50 rounded-md">
              <div className="text-xs text-muted-foreground">Total Profit</div>
              <div className="text-lg font-semibold text-primary">
                ${stats.totalProfit.toFixed(0)}
              </div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-md">
              <div className="text-xs text-muted-foreground">Best Profit</div>
              <div className="text-lg font-semibold text-green-600">
                ${stats.bestProfit.toFixed(0)}
              </div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-md">
              <div className="text-xs text-muted-foreground">Average Profit</div>
              <div className="text-lg font-semibold text-blue-600">
                ${stats.averageProfit.toFixed(0)}
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>No spread data available</p>
              <p className="text-sm mt-1">
                Try adjusting the time range or check back later
              </p>
            </div>
          </div>
        ) : (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 40,
                  bottom: 60,
                }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  className="opacity-30"
                />
                
                <XAxis
                  dataKey="label"
                  angle={-45}
                  textAnchor="end"
                  fontSize={10}
                  className="text-muted-foreground"
                  height={60}
                />
                
                <YAxis
                  tickFormatter={(value) => `$${value >= 1000 ? (value/1000).toFixed(0)+'k' : value.toFixed(0)}`}
                  fontSize={12}
                  className="text-muted-foreground"
                />
                
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                />
                
                <Bar
                  dataKey="profit_usd"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
