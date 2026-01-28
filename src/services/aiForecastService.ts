// AI Price Forecasting Service
// Uses historical price data to predict future commodity prices

// Backend API base URL
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

export interface PriceDataPoint {
  date: string;
  price: number;
  commodity: string;
  market?: string;
  state?: string;
}

export interface PricePrediction {
  commodity: string;
  currentPrice: number;
  predictedPrice: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  predictionDate: string;
  historicalData: PriceDataPoint[];
  forecastData: PriceDataPoint[];
}

export interface ForecastOptions {
  commodity: string;
  daysAhead?: number;
  market?: string;
  state?: string;
  algorithm?: 'linear' | 'moving_average' | 'exponential_smoothing';
}

/**
 * Simple Linear Regression for price forecasting
 */
function linearRegression(data: PriceDataPoint[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  // Convert dates to numeric values (days since first date)
  const firstDate = new Date(data[0].date);
  const xValues = data.map(point => {
    const date = new Date(point.date);
    return (date.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24); // days
  });

  const yValues = data.map(point => point.price);

  // Calculate means
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
  const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  const yPredicted = xValues.map(x => slope * x + intercept);
  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    ssRes += Math.pow(yValues[i] - yPredicted[i], 2);
    ssTot += Math.pow(yValues[i] - yMean, 2);
  }

  const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

  return { slope, intercept, r2 };
}

/**
 * Moving Average forecasting
 */
function movingAverage(data: PriceDataPoint[], windowSize: number = 7): number {
  if (data.length < windowSize) return data[data.length - 1]?.price || 0;

  const recentData = data.slice(-windowSize);
  const average = recentData.reduce((sum, point) => sum + point.price, 0) / windowSize;

  return average;
}

/**
 * Exponential Smoothing forecasting
 */
function exponentialSmoothing(data: PriceDataPoint[], alpha: number = 0.3): number {
  if (data.length === 0) return 0;
  if (data.length === 1) return data[0].price;

  let smoothed = data[0].price;

  for (let i = 1; i < data.length; i++) {
    smoothed = alpha * data[i].price + (1 - alpha) * smoothed;
  }

  return smoothed;
}

/**
 * Analyze price trend
 */
function analyzeTrend(data: PriceDataPoint[]): 'up' | 'down' | 'stable' {
  if (data.length < 2) return 'stable';

  const recent = data.slice(-7); // Last 7 days
  const older = data.slice(-14, -7); // Previous 7 days

  if (recent.length === 0 || older.length === 0) return 'stable';

  const recentAvg = recent.reduce((sum, p) => sum + p.price, 0) / recent.length;
  const olderAvg = older.reduce((sum, p) => sum + p.price, 0) / older.length;

  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

  if (changePercent > 5) return 'up';
  if (changePercent < -5) return 'down';
  return 'stable';
}

/**
 * Calculate prediction confidence based on data quality and trend consistency
 */
function calculateConfidence(data: PriceDataPoint[], r2?: number): number {
  if (data.length < 5) return 0.3; // Low confidence with little data
  if (data.length < 10) return 0.5; // Medium confidence
  if (data.length < 20) return 0.7; // Good confidence

  // Factor in R-squared if available
  if (r2 !== undefined) {
    return Math.min(0.9, 0.8 + (r2 * 0.2)); // Base 80% + R-squared bonus
  }

  return 0.8; // High confidence with good data volume
}

/**
 * Generate price forecast for a commodity
 */
export async function generatePriceForecast(
  historicalData: PriceDataPoint[],
  options: ForecastOptions
): Promise<PricePrediction> {
  const { commodity, daysAhead = 7, algorithm = 'linear' } = options;

  if (historicalData.length === 0) {
    throw new Error('No historical data available for forecasting');
  }

  // Sort data by date
  const sortedData = [...historicalData].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Filter data for the specific commodity
  const commodityData = sortedData.filter(point =>
    point.commodity.toLowerCase() === commodity.toLowerCase()
  );

  if (commodityData.length === 0) {
    throw new Error(`No data available for commodity: ${commodity}`);
  }

  const currentPrice = commodityData[commodityData.length - 1].price;
  let predictedPrice: number;
  let confidence: number;

  // Generate prediction based on algorithm
  switch (algorithm) {
    case 'moving_average':
      predictedPrice = movingAverage(commodityData);
      confidence = calculateConfidence(commodityData);
      break;

    case 'exponential_smoothing':
      predictedPrice = exponentialSmoothing(commodityData);
      confidence = calculateConfidence(commodityData);
      break;

    case 'linear':
    default: {
      const { slope, intercept, r2 } = linearRegression(commodityData);
      const lastDate = new Date(commodityData[commodityData.length - 1].date);
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + daysAhead);

      const daysSinceFirst = (forecastDate.getTime() - new Date(commodityData[0].date).getTime()) / (1000 * 60 * 60 * 24);
      predictedPrice = slope * daysSinceFirst + intercept;
      confidence = calculateConfidence(commodityData, r2);
      break;
    }
  }

  // Ensure predicted price is reasonable (not negative, not too extreme)
  predictedPrice = Math.max(0, predictedPrice);
  predictedPrice = Math.min(predictedPrice, currentPrice * 2); // Cap at 2x current price

  const trend = analyzeTrend(commodityData);

  // Generate forecast data points for visualization
  const forecastData: PriceDataPoint[] = [];
  const lastDate = new Date(commodityData[commodityData.length - 1].date);

  for (let i = 1; i <= daysAhead; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i);

    // Simple linear interpolation for forecast points
    const progress = i / daysAhead;
    const interpolatedPrice = currentPrice + (predictedPrice - currentPrice) * progress;

    forecastData.push({
      date: forecastDate.toISOString().split('T')[0],
      price: interpolatedPrice,
      commodity: commodity,
      market: options.market,
      state: options.state
    });
  }

  return {
    commodity,
    currentPrice,
    predictedPrice,
    confidence,
    trend,
    predictionDate: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    historicalData: commodityData,
    forecastData
  };
}

/**
 * Get AI-powered price insights
 */
export function getPriceInsights(prediction: PricePrediction): string[] {
  const insights: string[] = [];

  const priceChange = ((prediction.predictedPrice - prediction.currentPrice) / prediction.currentPrice) * 100;

  if (Math.abs(priceChange) < 1) {
    insights.push(`💰 Price expected to remain stable at ₹${prediction.predictedPrice.toFixed(2)} per kg`);
  } else if (priceChange > 0) {
    insights.push(`📈 Price predicted to increase by ${priceChange.toFixed(1)}% to ₹${prediction.predictedPrice.toFixed(2)} per kg`);
  } else {
    insights.push(`📉 Price predicted to decrease by ${Math.abs(priceChange).toFixed(1)}% to ₹${prediction.predictedPrice.toFixed(2)} per kg`);
  }

  insights.push(`🎯 Prediction confidence: ${(prediction.confidence * 100).toFixed(0)}%`);

  switch (prediction.trend) {
    case 'up':
      insights.push('📊 Current trend: Prices are rising - consider buying soon if planning to purchase');
      break;
    case 'down':
      insights.push('📊 Current trend: Prices are falling - consider waiting before selling');
      break;
    case 'stable':
      insights.push('📊 Current trend: Prices are stable - good time for regular transactions');
      break;
  }

  if (prediction.historicalData.length < 10) {
    insights.push('⚠️ Limited historical data - predictions may be less accurate');
  }

  return insights;
}

/**
 * Fetch price forecast from backend API
 */
export async function fetchPriceForecast(options: ForecastOptions): Promise<PricePrediction> {
  try {
    const params = new URLSearchParams({
      commodity: options.commodity,
      daysAhead: (options.daysAhead || 7).toString(),
      algorithm: options.algorithm || 'linear'
    });

    if (options.market) params.append('market', options.market);
    if (options.state) params.append('state', options.state);

    const response = await fetch(`${BACKEND_BASE_URL}/api/market/forecast?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Forecast API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching price forecast:', error);
    throw error;
  }
}