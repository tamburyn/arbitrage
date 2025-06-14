import { describe, it, expect } from 'vitest';
import { 
  isValidISODate, 
  convertToCSV, 
  validateQueryParams, 
  generateCSVFilename 
} from './orderbook-export';
import type { OrderbookDTO } from '../types';

describe('isValidISODate', () => {
  it('should return true for valid ISO dates', () => {
    expect(isValidISODate('2024-01-15T10:30:00Z')).toBe(true);
    expect(isValidISODate('2024-01-15T10:30:00.123Z')).toBe(true);
    expect(isValidISODate('2024-01-15T10:30:00+02:00')).toBe(true);
    expect(isValidISODate('2024-01-15T10:30:00.123+02:00')).toBe(true);
  });

  it('should return false for invalid ISO dates', () => {
    expect(isValidISODate('')).toBe(false);
    expect(isValidISODate('2024-01-15')).toBe(false);
    expect(isValidISODate('2024-01-15 10:30:00')).toBe(false);
    expect(isValidISODate('invalid-date')).toBe(false);
    expect(isValidISODate('2024-13-01T10:30:00Z')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isValidISODate('2024-02-29T10:30:00Z')).toBe(true); // leap year
    expect(isValidISODate('2023-02-29T10:30:00Z')).toBe(false); // non-leap year
  });
});

describe('convertToCSV', () => {
  it('should return headers only for empty array', () => {
    const result = convertToCSV([]);
    expect(result).toBe('id,exchange_id,asset_id,snapshot,spread,timestamp,volume,created_at\n');
  });

  it('should convert single orderbook to CSV', () => {
    const orderbook: OrderbookDTO = {
      id: '1',
      exchange_id: 'binance',
      asset_id: 'BTC',
      snapshot: { bids: [[50000, 1]], asks: [[50100, 1]] },
      spread: 100,
      timestamp: '2024-01-15T10:30:00Z',
      volume: 1000,
      created_at: '2024-01-15T10:30:00Z'
    };

    const result = convertToCSV([orderbook]);
    const lines = result.split('\n');
    
    expect(lines[0]).toBe('id,exchange_id,asset_id,snapshot,spread,timestamp,volume,created_at');
    expect(lines[1]).toContain('1,binance,BTC');
    expect(lines[1]).toContain('""{""bids"":[[50000,1]],""asks"":[[50100,1]]}""');
    expect(lines[1]).toContain('100,2024-01-15T10:30:00Z,1000,2024-01-15T10:30:00Z');
  });

  it('should handle multiple orderbooks', () => {
    const orderbooks: OrderbookDTO[] = [
      {
        id: '1',
        exchange_id: 'binance',
        asset_id: 'BTC',
        snapshot: {},
        spread: 100,
        timestamp: '2024-01-15T10:30:00Z',
        volume: 1000,
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        exchange_id: 'kraken',
        asset_id: 'ETH',
        snapshot: {},
        spread: 50,
        timestamp: '2024-01-15T10:31:00Z',
        volume: null,
        created_at: null
      }
    ];

    const result = convertToCSV(orderbooks);
    const lines = result.split('\n');
    
    expect(lines).toHaveLength(3); // header + 2 data rows
    expect(lines[2]).toContain('2,kraken,ETH');
    expect(lines[2]).toContain(',,'); // null values should be empty
  });

  it('should properly escape quotes in JSON', () => {
    const orderbook: OrderbookDTO = {
      id: '1',
      exchange_id: 'test',
      asset_id: 'TEST',
      snapshot: { message: 'Contains "quotes" inside' },
      spread: 0,
      timestamp: '2024-01-15T10:30:00Z',
      volume: null,
      created_at: null
    };

    const result = convertToCSV([orderbook]);
    expect(result).toContain('""Contains """"quotes"""" inside""');
  });
});

describe('validateQueryParams', () => {
  it('should return error for missing parameters', () => {
    expect(validateQueryParams(null, '2024-01-15T10:30:00Z')).toEqual({
      error: 'Missing required parameter: from'
    });
    
    expect(validateQueryParams('2024-01-15T10:30:00Z', null)).toEqual({
      error: 'Missing required parameter: to'
    });
  });

  it('should return error for invalid date formats', () => {
    expect(validateQueryParams('invalid-date', '2024-01-15T10:30:00Z')).toEqual({
      error: 'Invalid date format for parameter "from". Expected ISO 8601 format.'
    });
    
    expect(validateQueryParams('2024-01-15T10:30:00Z', 'invalid-date')).toEqual({
      error: 'Invalid date format for parameter "to". Expected ISO 8601 format.'
    });
  });

  it('should return error when from is later than to', () => {
    expect(validateQueryParams('2024-01-15T10:30:00Z', '2024-01-14T10:30:00Z')).toEqual({
      error: 'Parameter "from" cannot be later than "to"'
    });
  });

  it('should return error when date range exceeds 3 months', () => {
    const from = '2024-01-01T10:30:00Z';
    const to = '2024-05-01T10:30:00Z'; // 4 months later
    
    expect(validateQueryParams(from, to)).toEqual({
      error: 'Date range cannot exceed 3 months'
    });
  });

  it('should return valid dates for correct parameters', () => {
    const from = '2024-01-15T10:30:00Z';
    const to = '2024-02-15T10:30:00Z';
    
    expect(validateQueryParams(from, to)).toEqual({ from, to });
  });

  it('should allow date range exactly at 3 months limit', () => {
    const from = '2024-01-01T00:00:00Z';
    const to = '2024-03-30T00:00:00Z'; // just under 3 months
    
    const result = validateQueryParams(from, to);
    expect(result).toEqual({ from, to });
  });
});

describe('generateCSVFilename', () => {
  it('should generate correct filename from ISO dates', () => {
    const from = '2024-01-15T10:30:00Z';
    const to = '2024-02-15T15:45:30Z';
    
    expect(generateCSVFilename(from, to)).toBe('orderbooks_export_2024-01-15_to_2024-02-15.csv');
  });

  it('should handle dates with different time zones', () => {
    const from = '2024-01-15T10:30:00+02:00';
    const to = '2024-02-15T15:45:30-05:00';
    
    expect(generateCSVFilename(from, to)).toBe('orderbooks_export_2024-01-15_to_2024-02-15.csv');
  });

  it('should extract date part correctly', () => {
    const from = '2024-12-01T23:59:59.999Z';
    const to = '2024-12-31T00:00:00.000Z';
    
    expect(generateCSVFilename(from, to)).toBe('orderbooks_export_2024-12-01_to_2024-12-31.csv');
  });
});