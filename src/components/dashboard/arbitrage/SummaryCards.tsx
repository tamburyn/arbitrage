import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { useArbitrageData } from '../context/ArbitrageContext';
import type { SummaryCardVM } from '../../../types';

// Icons components (using simple SVG for now)
const TrendUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const OpportunityIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const SpreadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const VolumeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
);

// Static counter component (no animation on data refresh)
interface CountUpProps {
  end: number;
  formatType: 'number' | 'percentage' | 'currency';
  duration?: number;
  animate?: boolean; // Control whether to animate
}

function CountUp({ end, formatType, duration = 1000, animate = true }: CountUpProps) {
  const [count, setCount] = React.useState(animate ? 0 : end);
  const [hasAnimated, setHasAnimated] = React.useState(false);

  React.useEffect(() => {
    // Only animate on first mount, not on subsequent data updates
    if (!animate || hasAnimated) {
      setCount(end);
      return;
    }

    let startTime: number;
    let animationFrame: number;

    const animateCounter = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      setCount(end * easedProgress);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animateCounter);
      } else {
        setCount(end);
        setHasAnimated(true);
      }
    };

    animationFrame = requestAnimationFrame(animateCounter);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration, animate, hasAnimated]);

  const formatValue = (value: number) => {
    switch (formatType) {
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'number':
      default:
        return Math.round(value).toLocaleString();
    }
  };

  return <span>{formatValue(count)}</span>;
}

// Individual card component
interface SummaryCardProps {
  card: SummaryCardVM;
  isLoading?: boolean;
  animate?: boolean;
}

function SummaryCard({ card, isLoading, animate = true }: SummaryCardProps) {
  const getIcon = () => {
    switch (card.id) {
      case 'opportunities':
        return <OpportunityIcon />;
      case 'avg_spread':
      case 'best_spread':
        return <SpreadIcon />;
      case 'volume':
        return <VolumeIcon />;
      default:
        return <OpportunityIcon />;
    }
  };

  const getTrendIcon = () => {
    if (card.delta === undefined || card.delta === 0) return null;
    
    return card.isPositive ? (
      <TrendUpIcon />
    ) : (
      <TrendDownIcon />
    );
  };

  const getTrendColor = () => {
    if (card.delta === undefined || card.delta === 0) return 'text-muted-foreground';
    
    // For opportunities and volume, higher is better
    // For spreads, it depends on context - for now, treat higher as better (more profit potential)
    return card.isPositive ? 'text-green-600' : 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {card.label}
          </CardTitle>
          <div className="text-muted-foreground">
            {getIcon()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-20 mb-2"></div>
            <div className="h-4 bg-muted rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {card.label}
        </CardTitle>
        <div className="text-muted-foreground">
          {getIcon()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <CountUp 
            end={card.current} 
            formatType={card.formatType}
            duration={1200}
            animate={animate}
          />
        </div>
        
        {card.delta !== undefined && card.previous !== undefined && (
          <div className={`flex items-center text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="ml-1">
              {Math.abs(card.delta).toFixed(1)}% from previous period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main component
export function SummaryCards() {
  const { summary, loading, selectedTimeRange } = useArbitrageData();
  const [isFirstLoad, setIsFirstLoad] = React.useState(true);

  // Track first load to enable animation only once
  React.useEffect(() => {
    if (summary && isFirstLoad) {
      setIsFirstLoad(false);
    }
  }, [summary, isFirstLoad]);

  // Transform summary data to card view models
  const cards: SummaryCardVM[] = React.useMemo(() => {
    if (!summary) {
      return [
        {
          id: 'opportunities',
          label: 'Active Opportunities',
          current: 0,
          formatType: 'number'
        },
        {
          id: 'avg_spread',
          label: 'Average Spread',
          current: 0,
          formatType: 'percentage'
        },
        {
          id: 'best_spread',
          label: 'Best Opportunity',
          current: 0,
          formatType: 'percentage'
        },
        {
          id: 'volume',
          label: 'Total Volume',
          current: 0,
          formatType: 'currency'
        }
      ];
    }

    const calculateDelta = (current: number, previous?: number) => {
      if (previous === undefined || previous === 0) return undefined;
      return ((current - previous) / previous) * 100;
    };

    return [
      {
        id: 'opportunities',
        label: 'Active Opportunities',
        current: summary.active_opportunities_count,
        formatType: 'number' as const,
        delta: undefined, // No previous data for count comparison
        isPositive: undefined
      },
      {
        id: 'avg_spread',
        label: 'Average Spread',
        current: summary.average_spread,
        previous: summary.previous_period_avg_spread,
        delta: calculateDelta(summary.average_spread, summary.previous_period_avg_spread),
        isPositive: summary.previous_period_avg_spread 
          ? summary.average_spread > summary.previous_period_avg_spread
          : undefined,
        formatType: 'percentage' as const
      },
      {
        id: 'best_spread',
        label: 'Best Opportunity',
        current: summary.best_spread,
        formatType: 'percentage' as const,
        delta: undefined, // No previous data for best spread
        isPositive: undefined
      },
      {
        id: 'volume',
        label: 'Total Volume',
        current: summary.total_volume,
        formatType: 'currency' as const,
        delta: undefined, // No previous data for volume comparison
        isPositive: undefined
      }
    ];
  }, [summary]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Market Overview</h2>
          <p className="text-muted-foreground">
            Real-time arbitrage opportunities across exchanges
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Last {selectedTimeRange}
        </Badge>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <SummaryCard 
            key={card.id} 
            card={card} 
            isLoading={loading}
            animate={isFirstLoad}
          />
        ))}
      </div>

      {/* Status indicator */}
      {!loading && summary && (
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
