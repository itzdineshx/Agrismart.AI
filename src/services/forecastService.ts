export interface PriceDataPoint {
  date: string;
  price: number;
  commodity: string;
  market: string;
  district: string;
  state: string;
}

// Backend API base URL
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

export interface PricePrediction {
  date: string;
  predictedPrice: number;
  confidence: number;
  algorithm: string;
}

export interface ForecastInsights {
  currentPrice: number;
  averagePrice: number;
  trend: 'upward' | 'downward' | 'stable';
  volatility: number;
  predictedChangePercent: number;
  confidence: number;
  recommendation: string;
}

export interface ValidationMetrics {
  meanAbsolutePercentageError: number;
  medianAbsolutePercentageError: number;
  errorStd: number;
  accuracy: number;
  confidence: number;
}

export interface ForecastResponse {
  commodity: string;
  state?: string;
  district?: string;
  algorithm: string;
  historicalData: PriceDataPoint[];
  forecast: PricePrediction[];
  insights: ForecastInsights;
  validationMetrics: ValidationMetrics;
  generatedAt: string;
  dataPoints: number;
}

export interface ForecastParams {
  commodity: string;
  state?: string;
  district?: string;
  days?: number;
  algorithm?: 'linear_regression' | 'moving_average' | 'exponential_smoothing' | 'arima' | 'lstm' | 'random_forest' | 'xgboost' | 'svr' | 'ensemble';
}

/**
 * Fetches price forecast data from the backend API
 */
export const getPriceForecast = async (params: ForecastParams): Promise<ForecastResponse> => {
  const queryParams = new URLSearchParams({
    commodity: params.commodity,
    ...(params.state && { state: params.state }),
    ...(params.district && { district: params.district }),
    ...(params.days && { days: params.days.toString() }),
    ...(params.algorithm && { algorithm: params.algorithm }),
  });

  const response = await fetch(`${BACKEND_BASE_URL}/api/market/forecast?${queryParams.toString()}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch forecast: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Gets available forecasting algorithms
 */
export const getForecastAlgorithms = () => [
  {
    value: 'ensemble' as const,
    label: 'AI Ensemble (Recommended)',
    description: 'Combines multiple advanced AI models for highest accuracy'
  },
  {
    value: 'arima' as const,
    label: 'ARIMA',
    description: 'AutoRegressive Integrated Moving Average - Advanced statistical model'
  },
  {
    value: 'lstm' as const,
    label: 'LSTM Neural Network',
    description: 'Long Short-Term Memory - Deep learning for time series'
  },
  {
    value: 'xgboost' as const,
    label: 'XGBoost',
    description: 'Extreme Gradient Boosting - Ensemble learning algorithm'
  },
  {
    value: 'random_forest' as const,
    label: 'Random Forest',
    description: 'Ensemble of decision trees for robust predictions'
  },
  {
    value: 'svr' as const,
    label: 'Support Vector Regression',
    description: 'Kernel-based regression for complex patterns'
  },
  {
    value: 'linear_regression' as const,
    label: 'Linear Regression',
    description: 'Best for steady trends over time'
  },
  {
    value: 'moving_average' as const,
    label: 'Moving Average',
    description: 'Good for smoothing out short-term fluctuations'
  },
  {
    value: 'exponential_smoothing' as const,
    label: 'Exponential Smoothing',
    description: 'Responsive to recent changes while maintaining trend'
  }
];

/**
 * Formats forecast data for chart display
 */
export const formatForecastForChart = (forecast: ForecastResponse) => {
  const historical = forecast.historicalData.map(item => ({
    date: new Date(item.date.split('/').reverse().join('-')).toLocaleDateString(),
    price: item.price,
    type: 'historical' as const
  }));

  const predictions = forecast.forecast.map(item => ({
    date: new Date(item.date).toLocaleDateString(),
    price: item.predictedPrice,
    type: 'forecast' as const,
    confidence: item.confidence
  }));

  return [...historical, ...predictions];
};

/**
 * Calculates forecast accuracy metrics
 */
export const calculateForecastMetrics = (forecast: ForecastResponse) => {
  if (forecast.forecast.length === 0) return null;

  const predictions = forecast.forecast;
  const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

  const priceChanges = predictions.slice(1).map((p, i) => ({
    change: ((p.predictedPrice - predictions[i].predictedPrice) / predictions[i].predictedPrice) * 100,
    confidence: p.confidence
  }));

  const volatility = priceChanges.length > 0
    ? Math.sqrt(priceChanges.reduce((sum, change) => sum + Math.pow(change.change, 2), 0) / priceChanges.length)
    : 0;

  return {
    averageConfidence: Math.round(avgConfidence * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    trendDirection: predictions[predictions.length - 1].predictedPrice > predictions[0].predictedPrice ? 'up' : 'down',
    totalChange: ((predictions[predictions.length - 1].predictedPrice - predictions[0].predictedPrice) / predictions[0].predictedPrice) * 100
  };
};