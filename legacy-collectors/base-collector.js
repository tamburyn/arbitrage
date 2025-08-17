export class BaseCollector {
  constructor() {}
  
  async initialize(config) {
    throw new Error('Not implemented');
  }

  async fetchPrice(symbol, quote) {
    throw new Error('Not implemented');
  }

  async fetchPrices(symbols, quote) {
    throw new Error('Not implemented');
  }

  async fetchOrderBook(symbol, quote, depth = 20) {
    throw new Error('Not implemented');
  }

  async subscribeToPriceUpdates() {
    throw new Error('Not implemented');
  }

  async subscribeToOrderBookUpdates() {
    throw new Error('Not implemented');
  }

  async cleanup() {
    throw new Error('Not implemented');
  }
} 