import React, { useEffect, useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useArbitrageData } from "./context/ArbitrageContext";

interface OrderBookEntry {
  id: string;
  date: string;
  asset: string;
  exchange: string;
  ask: number;
  bid: number;
  volume: number;
  spread: number;
  updatedAt: string;
}

interface OrderBookData {
  data: {
    id: string;
    asset_id: string;
    exchange_id: string;
    snapshot: {
      asks: [number, number | null][];
      bids: [number, number | null][];
      lastUpdateId?: string;
    };
    spread: number;
    timestamp: string;
    volume: number | null;
    created_at: string;
    exchange_name?: string;
    asset_symbol?: string;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

function formatVolume(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

function getSpreadColor(spread: number): string {
  if (spread <= 0.5) return "text-green-600 bg-green-50";
  if (spread <= 1.0) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

export default function SimpleOrderBookTable() {
  const [orderBooks, setOrderBooks] = useState<OrderBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get filter state from ArbitrageContext
  const { 
    showFavouritesOnly, 
    userFavourites,
    filters 
  } = useArbitrageData();

  useEffect(() => {
    const fetchOrderBooks = async () => {
      try {
        setLoading(true);
        // Build query parameters
        const params = new URLSearchParams({
          limit: "50",
          sort: "-timestamp",
        });

        // Helper function to map exchange IDs to names
        const mapExchangeIdToName = (exchangeId: string): string => {
          const mapping: Record<string, string> = {
            'binance': 'Binance',
            'bybit': 'Bybit', 
            'kraken': 'Kraken',
            'okx': 'OKX'
          };
          return mapping[exchangeId] || exchangeId;
        };

        // Add filtering if favourites only mode is active
        if (showFavouritesOnly) {
          if (userFavourites.exchanges.length > 0) {
            const exchangeNames = userFavourites.exchanges.map(mapExchangeIdToName);
            params.set('exchanges', exchangeNames.join(','));
          }
          if (userFavourites.assets.length > 0) {
            params.set('assets', userFavourites.assets.join(','));
          }
        } else if (filters.exchanges.length > 0 || filters.assets.length > 0) {
          // Apply regular filters
          if (filters.exchanges.length > 0) {
            const exchangeNames = filters.exchanges.map(mapExchangeIdToName);
            params.set('exchanges', exchangeNames.join(','));
          }
          if (filters.assets.length > 0) {
            params.set('assets', filters.assets.join(','));
          }
        }

        const response = await fetch(`/api/orderbooks?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data: OrderBookData = await response.json();

        // Transform data to OrderBookEntry format
        const transformed = data.data.map((orderbook) => {
          // Extract best bid and ask from snapshot
          let bestBid = 0;
          let bestAsk = 0;

          if (orderbook.snapshot?.bids && orderbook.snapshot.bids.length > 0) {
            const firstBid = orderbook.snapshot.bids[0];
            if (Array.isArray(firstBid) && typeof firstBid[0] === "number") {
              bestBid = firstBid[0];
            }
          }

          if (orderbook.snapshot?.asks && orderbook.snapshot.asks.length > 0) {
            const firstAsk = orderbook.snapshot.asks[0];
            if (Array.isArray(firstAsk) && typeof firstAsk[0] === "number") {
              bestAsk = firstAsk[0];
            }
          }

          return {
            id: orderbook.id,
            date: orderbook.timestamp,
            asset: orderbook.asset_symbol || "Unknown",
            exchange: orderbook.exchange_name || "Unknown",
            ask: bestAsk,
            bid: bestBid,
            volume: orderbook.volume || 0,
            spread: orderbook.spread || 0,
            updatedAt: orderbook.created_at || orderbook.timestamp,
          };
        });

        setOrderBooks(transformed);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderBooks();

    // Refresh every 60 seconds
    const interval = setInterval(fetchOrderBooks, 60000);

    return () => clearInterval(interval);
  }, [showFavouritesOnly, userFavourites, filters]); // Re-fetch when filters change

  // Sort orderbooks by date (no filtering for now)
  const sortedOrderBooks = useMemo(() => {
    return [...orderBooks].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orderBooks]);

  if (loading && orderBooks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Latest Order Books
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Latest Order Books
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-8">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!sortedOrderBooks.length && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Latest Order Books
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            {orderBooks.length === 0 ? "No orderbook data available" : "No orderbooks match the current filters"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-2.5 pb-0">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Orderbooks
          <Badge variant="secondary" className="ml-2">
            {sortedOrderBooks.length}
          </Badge>
          {loading && <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2.5">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-200px)]">
          <Table
            className="min-w-full responsive-table"
            style={
              {
                "--tw-table-layout": "fixed",
              } as React.CSSProperties
            }
          >
            <TableHeader>
              <TableRow>
                {/* Always visible on mobile - 35% width */}
                <TableHead className="w-[35%] sm:w-auto">Asset</TableHead>
                {/* Hide on mobile */}
                <TableHead className="hidden sm:table-cell">Exchange</TableHead>
                {/* Always visible - 30% width */}
                <TableHead className="text-right w-[30%] sm:w-auto">Price</TableHead>
                {/* Hide on mobile */}
                <TableHead className="text-right hidden md:table-cell">Volume</TableHead>
                {/* Always visible - 35% width */}
                <TableHead className="text-right w-[35%] sm:w-auto">Spread</TableHead>
                {/* Hide on mobile */}
                <TableHead className="hidden sm:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrderBooks.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-gray-50 transition-colors">
                  {/* Asset - Always visible, stacked info on mobile - 35% width */}
                  <TableCell className="w-[35%] sm:w-auto">
                    <div className="space-y-1">
                      <span className="font-semibold text-gray-900 text-sm">{entry.asset}</span>
                      {/* Show extra info on mobile when other columns are hidden */}
                      <div className="sm:hidden text-xs text-gray-500 space-y-1">
                        <div>
                          <Badge variant="outline" className="text-xs">
                            {entry.exchange}
                          </Badge>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span>
                            {new Date(entry.date).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Exchange - Hidden on mobile */}
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline">{entry.exchange}</Badge>
                  </TableCell>

                  {/* Price - Always visible, enhanced on mobile - 30% width */}
                  <TableCell className="text-right w-[30%] sm:w-auto">
                    <div className="space-y-1">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3 text-red-500" />
                        <span className="font-mono text-xs sm:text-sm">{formatCurrency(entry.ask)}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <TrendingDown className="h-3 w-3 text-green-500" />
                        <span className="font-mono text-xs sm:text-sm">{formatCurrency(entry.bid)}</span>
                      </div>
                      {/* Show volume on mobile when volume column is hidden */}
                      <div className="md:hidden text-xs text-gray-500">Vol: {formatVolume(entry.volume)}</div>
                    </div>
                  </TableCell>

                  {/* Volume - Hidden on mobile */}
                  <TableCell className="text-right hidden md:table-cell">
                    <span className="font-mono text-sm">{formatVolume(entry.volume)}</span>
                  </TableCell>

                  {/* Spread - Always visible - 35% width */}
                  <TableCell className="text-right w-[35%] sm:w-auto">
                    <Badge variant="secondary" className={getSpreadColor(entry.spread)}>
                      {entry.spread.toFixed(3)}%
                    </Badge>
                  </TableCell>

                  {/* Date - Hidden on mobile */}
                  <TableCell className="hidden sm:table-cell">
                    <div className="text-xs text-gray-500">
                      <div>
                        {new Date(entry.date).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })}
                      </div>
                      <div>
                        {new Date(entry.date).toLocaleDateString("en-US", {
                          month: "2-digit",
                          day: "2-digit",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {sortedOrderBooks.length > 10 && (
          <div className="mt-4 text-center">
            <Badge variant="outline">Showing latest {Math.min(sortedOrderBooks.length, 50)} entries</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
