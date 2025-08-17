import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('utils', () => {
  describe('cn function', () => {
    it('should merge class names correctly', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'hidden');
      expect(result).toBe('base conditional');
    });

    it('should handle undefined and null values', () => {
      const result = cn('base', undefined, null, 'valid');
      expect(result).toBe('base valid');
    });

    it('should handle object-style classes', () => {
      const result = cn({
        'active': true,
        'disabled': false,
        'error': true
      });
      expect(result).toContain('active');
      expect(result).toContain('error');
      expect(result).not.toContain('disabled');
    });

    it('should merge Tailwind classes correctly', () => {
      const result = cn('px-4 py-2', 'px-6 bg-blue-500');
      // Should override px-4 with px-6
      expect(result).toContain('px-6');
      expect(result).toContain('py-2');
      expect(result).toContain('bg-blue-500');
      expect(result).not.toContain('px-4');
    });
  });
});
