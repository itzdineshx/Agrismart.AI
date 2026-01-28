// Market data service for backend API integration
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '/api';

export interface MarketPrice {
  commodity: string;
  market: {
    name: string;
    city: string;
    state: string;
    mandiId: string;
  };
  price: {
    min: number;
    max: number;
    modal: number;
    unit: string;
  };
  date: string;
  lastUpdated: string;
  source: string;
}

export interface MarketPriceHistoryItem {
  date: string;
  price: number;
  volume?: number;
}

export interface MarketPriceHistory {
  commodity: string;
  history: MarketPriceHistoryItem[];
}

export interface MarketTrend {
  commodity: string;
  period: string;
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    priceChange: number;
  };
  data: Array<{
    date: string;
    price: number;
    volume: number;
  }>;
  lastUpdated: string;
  source: string;
}

export interface MarketAnalysis {
  commodity: string;
  summary: {
    currentPrice: number;
    priceChange24h: number;
    priceChange7d: number;
    volatility: number;
    trend: string;
  };
  insights: string[];
  recommendations: string[];
  lastUpdated: string;
}

export interface MarketAlert {
  userId: string;
  commodity: string;
  condition: {
    type: string;
    value: number;
    unit: string;
  };
  isActive: boolean;
  triggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

class MarketService {
  private async request(endpoint: string, options?: RequestInit) {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Market API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getMarketPrices(params?: {
    commodity?: string;
    state?: string;
    district?: string;
    limit?: number;
  }): Promise<{ prices: MarketPrice[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.commodity) queryParams.append('commodity', params.commodity);
    if (params?.state) queryParams.append('state', params.state);
    if (params?.district) queryParams.append('district', params.district);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return this.request(`/market/prices?${queryParams}`);
  }

  async getMarketPricesByCommodity(
    commodity: string,
    params?: {
      state?: string;
      limit?: number;
    }
  ): Promise<{ commodity: string; prices: MarketPrice[] }> {
    const queryParams = new URLSearchParams();
    if (params?.state) queryParams.append('state', params.state);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return this.request(`/market/prices/${commodity}?${queryParams}`);
  }

  async getMarketPriceHistory(
    commodity: string,
    days: number = 30
  ): Promise<MarketPriceHistory> {
    return this.request(`/market/prices/${commodity}/history?days=${days}`);
  }

  async getMarketTrends(params?: {
    commodity?: string;
    period?: string;
  }): Promise<{ trends: MarketTrend[] }> {
    const queryParams = new URLSearchParams();
    if (params?.commodity) queryParams.append('commodity', params.commodity);
    if (params?.period) queryParams.append('period', params.period);

    return this.request(`/market/trends?${queryParams}`);
  }

  async getMarketAnalysis(params?: {
    commodity?: string;
  }): Promise<{ analysis: MarketAnalysis }> {
    const queryParams = new URLSearchParams();
    if (params?.commodity) queryParams.append('commodity', params.commodity);

    return this.request(`/market/analysis?${queryParams}`);
  }

  async createMarketPriceAlert(
    alert: {
      commodity: string;
      condition: {
        type: string;
        value: number;
        unit: string;
      };
    },
    token: string
  ): Promise<{ message: string; alert: MarketAlert }> {
    return this.request('/market/price-alerts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(alert),
    });
  }

  async deleteMarketPriceAlert(
    alertId: string,
    token: string
  ): Promise<{ message: string }> {
    return this.request(`/market/price-alerts/${alertId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
}

export const marketService = new MarketService();