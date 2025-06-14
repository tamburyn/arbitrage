import type { OrderbookDTO } from '../types';

/**
 * Waliduje format daty ISO 8601
 */
export function isValidISODate(dateString: string): boolean {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  
  // Sprawdź czy data jest prawidłowa
  if (isNaN(date.getTime())) return false;
  
  // Sprawdź czy string odpowiada formatowi ISO (z timezoną lub bez)
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  const isoWithTimezoneRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?[+-]\d{2}:\d{2}$/;
  
  return isoRegex.test(dateString) || isoWithTimezoneRegex.test(dateString);
}

/**
 * Konwertuje dane orderbooków do formatu CSV
 */
export function convertToCSV(orderbooks: OrderbookDTO[]): string {
  if (orderbooks.length === 0) {
    return 'id,exchange_id,asset_id,snapshot,spread,timestamp,volume,created_at\n';
  }

  // Nagłówki CSV
  const headers = [
    'id',
    'exchange_id', 
    'asset_id',
    'snapshot',
    'spread',
    'timestamp',
    'volume',
    'created_at'
  ];

  // Konwersja danych na CSV
  const csvRows = orderbooks.map(orderbook => {
    return [
      orderbook.id,
      orderbook.exchange_id,
      orderbook.asset_id,
      JSON.stringify(orderbook.snapshot).replace(/"/g, '""'), // Escape quotes
      orderbook.spread.toString(),
      orderbook.timestamp,
      orderbook.volume?.toString() || '',
      orderbook.created_at || ''
    ].join(',');
  });

  return [headers.join(','), ...csvRows].join('\n');
}

/**
 * Waliduje parametry zapytania dla eksportu orderbooków
 */
export function validateQueryParams(from: string | null, to: string | null): { from: string; to: string } | { error: string } {
  // Sprawdź czy parametry są obecne
  if (!from) {
    return { error: 'Missing required parameter: from' };
  }

  if (!to) {
    return { error: 'Missing required parameter: to' };
  }

  // Waliduj format dat
  if (!isValidISODate(from)) {
    return { error: 'Invalid date format for parameter "from". Expected ISO 8601 format.' };
  }

  if (!isValidISODate(to)) {
    return { error: 'Invalid date format for parameter "to". Expected ISO 8601 format.' };
  }

  // Sprawdź czy data "from" nie jest późniejsza niż "to"
  const fromDate = new Date(from);
  const toDate = new Date(to);
  
  if (fromDate > toDate) {
    return { error: 'Parameter "from" cannot be later than "to"' };
  }

  // Sprawdź czy zakres nie przekracza 3 miesięcy (zgodnie z PRD)
  const threeMonthsInMs = 3 * 30 * 24 * 60 * 60 * 1000; // przybliżona wartość
  if (toDate.getTime() - fromDate.getTime() > threeMonthsInMs) {
    return { error: 'Date range cannot exceed 3 months' };
  }

  return { from, to };
}

/**
 * Generuje nazwę pliku CSV na podstawie dat
 */
export function generateCSVFilename(from: string, to: string): string {
  const fromDate = from.split('T')[0];
  const toDate = to.split('T')[0];
  return `orderbooks_export_${fromDate}_to_${toDate}.csv`;
}