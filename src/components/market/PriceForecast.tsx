import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Filter,
  X
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { INDIAN_STATES } from '@/services/mandiService';
import { getForecastAlgorithms } from '@/services/forecastService';

// Backend API base URL
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

interface PriceDataPoint {
  date: string;
  price: number;
  commodity: string;
  market: string;
  district: string;
  state: string;
}

interface PricePrediction {
  date: string;
  predictedPrice: number;
  confidence: number;
  algorithm: string;
}

interface ForecastInsights {
  currentPrice: number;
  averagePrice: number;
  trend: 'upward' | 'downward' | 'stable';
  volatility: number;
  predictedChangePercent: number;
  confidence: number;
  recommendation: string;
}

interface ValidationMetrics {
  meanAbsolutePercentageError: number;
  medianAbsolutePercentageError: number;
  errorStd: number;
  accuracy: number;
  confidence: number;
}

interface ForecastResponse {
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

interface TooltipProps {
  payload?: Array<{
    type: string;
    [key: string]: unknown;
  }>;
}

interface PriceForecastProps {
  commodity?: string;
  state?: string;
  district?: string;
  className?: string;
}

export default function PriceForecast({
  commodity = 'Wheat',
  state,
  district,
  className = ''
}: PriceForecastProps) {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('ensemble');
  const [forecastDays, setForecastDays] = useState(7);
  
  // Filter states
  const [selectedCommodity, setSelectedCommodity] = useState(commodity || 'Wheat');
  const [selectedState, setSelectedState] = useState(state || 'all');
  const [selectedDistrict, setSelectedDistrict] = useState(district || 'all');
  const [showFilters, setShowFilters] = useState(false);

  // Common agricultural commodities available in Indian mandis
  const commonCommodities = useMemo(() => [
    'Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Potato', 'Tomato', 'Onion',
    'Garlic', 'Ginger', 'Chilli', 'Turmeric', 'Coriander', 'Cumin', 'Mustard',
    'Groundnut', 'Soybean', 'Sunflower', 'Castor', 'Sesame', 'Linseed',
    'Banana', 'Mango', 'Orange', 'Apple', 'Grapes', 'Pomegranate', 'Guava',
    'Papaya', 'Pineapple', 'Coconut', 'Lemon', 'Sweet Potato', 'Brinjal',
    'Cabbage', 'Cauliflower', 'Carrot', 'Radish', 'Spinach', 'Fenugreek',
    'Coriander Leaves', 'Mint', 'Green Chilli', 'Lady Finger', 'Bitter Gourd',
    'Bottle Gourd', 'Pumpkin', 'Drumstick', 'Cluster Beans', 'French Beans'
  ], []);

  const algorithms = getForecastAlgorithms();

  const fetchForecast = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        commodity: selectedCommodity,
        algorithm: selectedAlgorithm,
        days: forecastDays.toString()
      });

      if (selectedState && selectedState !== 'all') params.append('state', selectedState);
      if (selectedDistrict && selectedDistrict !== 'all') params.append('district', selectedDistrict);

      const response = await fetch(`${BACKEND_BASE_URL}/api/market/forecast?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch forecast: ${response.statusText}`);
      }

      const data: ForecastResponse = await response.json();
      setForecast(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch forecast');
      console.error('Forecast error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCommodity, selectedState, selectedDistrict, selectedAlgorithm, forecastDays]);

  const clearFilters = () => {
    setSelectedCommodity('Wheat');
    setSelectedState('all');
    setSelectedDistrict('all');
  };

  const hasActiveFilters = selectedState !== 'all' || selectedDistrict !== 'all';

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'upward':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'downward':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.8) return 'text-green-600';
    if (accuracy >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const prepareChartData = () => {
    if (!forecast) return [];

    const historical = forecast.historicalData.map(item => ({
      date: new Date(item.date.split('/').reverse().join('-')).toLocaleDateString(),
      price: item.price / 100, // Convert from quintal to kg
      type: 'historical'
    }));

    const predictions = forecast.forecast.map(item => ({
      date: new Date(item.date).toLocaleDateString(),
      price: item.predictedPrice / 100, // Convert from quintal to kg
      type: 'forecast',
      confidence: item.confidence
    }));

    return [...historical, ...predictions];
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button onClick={fetchForecast} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            AI Price Forecasting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {(selectedState ? 1 : 0) + (selectedDistrict ? 1 : 0)}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="commodity-select" className="text-sm font-medium">
                  Commodity *
                </Label>
                <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                  <SelectTrigger id="commodity-select">
                    <SelectValue placeholder="Select Commodity" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonCommodities.map((comm) => (
                      <SelectItem key={comm} value={comm}>
                        {comm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="state-select" className="text-sm font-medium">
                  State
                </Label>
                <Select value={selectedState} onValueChange={(value) => {
                  setSelectedState(value);
                  setSelectedDistrict('all'); // Clear district when state changes
                }}>
                  <SelectTrigger id="state-select">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {INDIAN_STATES.map((stateName) => (
                      <SelectItem key={stateName} value={stateName}>
                        {stateName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="district-select" className="text-sm font-medium">
                  District
                </Label>
                <Select 
                  value={selectedDistrict} 
                  onValueChange={setSelectedDistrict}
                  disabled={selectedState === 'all'}
                >
                  <SelectTrigger id="district-select">
                    <SelectValue placeholder={selectedState !== 'all' ? "Select District" : "Select State first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {/* Note: In a real implementation, you'd fetch districts based on selected state */}
                    {/* For now, we'll keep it simple and let the API handle district filtering */}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Algorithm and Days Controls */}
          {/* Algorithm and Days Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="algorithm">Algorithm</Label>
              <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {algorithms.map((alg) => (
                    <SelectItem key={alg.value} value={alg.value}>
                      <div>
                        <div className="font-medium">{alg.label}</div>
                        <div className="text-sm text-gray-500">{alg.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="days">Forecast Days</Label>
              <Select value={forecastDays.toString()} onValueChange={(value) => setForecastDays(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Days</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchForecast} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Forecast'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Chart */}
      {forecast && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                AI Forecast for {forecast.commodity}
                {forecast.state && <span className="text-sm text-muted-foreground ml-2">({forecast.state})</span>}
                {forecast.district && <span className="text-sm text-muted-foreground"> - {forecast.district}</span>}
              </span>
              <Badge variant="outline">
                {forecast.dataPoints} data points
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={prepareChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Price per kg (₹)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: TooltipProps) => [
                      `₹${value.toFixed(2)}/kg (₹${(value * 100).toFixed(2)}/quintal)`,
                      props.payload?.[0]?.type === 'forecast' ? 'Predicted' : 'Historical'
                    ]}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {forecast && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Market Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Current Price</span>
                <div className="text-right">
                  <div className="font-semibold">₹{forecast.insights.currentPrice.toFixed(2)}/quintal</div>
                  <div className="text-sm text-gray-600">₹{(forecast.insights.currentPrice / 100).toFixed(2)}/kg</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span>Average Price</span>
                <div className="text-right">
                  <div className="font-semibold">₹{forecast.insights.averagePrice.toFixed(2)}/quintal</div>
                  <div className="text-sm text-gray-600">₹{(forecast.insights.averagePrice / 100).toFixed(2)}/kg</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span>Trend</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(forecast.insights.trend)}
                  <span className="capitalize">{forecast.insights.trend}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span>Volatility</span>
                <span>{forecast.insights.volatility.toFixed(2)}%</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Predicted Change</span>
                <span className={forecast.insights.predictedChangePercent > 0 ? 'text-green-600' : 'text-red-600'}>
                  {forecast.insights.predictedChangePercent > 0 ? '+' : ''}
                  {forecast.insights.predictedChangePercent.toFixed(2)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                AI Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Confidence Level</span>
                <div className="flex items-center gap-2">
                  <Progress value={forecast.insights.confidence * 100} className="w-20" />
                  <span className={`font-semibold ${getConfidenceColor(forecast.insights.confidence)}`}>
                    {(forecast.insights.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">Recommendation</p>
                <p className="text-blue-800">{forecast.insights.recommendation}</p>
              </div>

              <div className="text-xs text-gray-500">
                Generated using {algorithms.find(a => a.value === forecast.algorithm)?.label}
                <br />
                Based on {forecast.dataPoints} historical data points
                <br />
                Last updated: {new Date(forecast.generatedAt).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Model Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Model Accuracy</span>
                <span className={`font-semibold ${getAccuracyColor(forecast.validationMetrics.accuracy)}`}>
                  {(forecast.validationMetrics.accuracy * 100).toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Mean Error</span>
                <span className="text-sm">
                  {(forecast.validationMetrics.meanAbsolutePercentageError * 100).toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>Error Consistency</span>
                <div className="flex items-center gap-2">
                  <Progress value={forecast.validationMetrics.confidence * 100} className="w-16" />
                  <span className="text-sm">
                    {(forecast.validationMetrics.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs font-medium text-green-900 mb-1">Validation Method</p>
                <p className="text-xs text-green-800">
                  Cross-validated on {forecast.dataPoints} data points using {forecast.algorithm.toUpperCase()} algorithm
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Forecast Table */}
      {forecast && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-right p-2">Predicted Price</th>
                    <th className="text-center p-2">Confidence</th>
                    <th className="text-center p-2">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.forecast.map((prediction, index) => {
                    const prevPrice = index === 0 ? forecast.insights.currentPrice : forecast.forecast[index - 1].predictedPrice;
                    const change = ((prediction.predictedPrice - prevPrice) / prevPrice) * 100;

                    return (
                      <tr key={prediction.date} className="border-b">
                        <td className="p-2">
                          {new Date(prediction.date).toLocaleDateString()}
                        </td>
                        <td className="text-right p-2">
                          <div className="font-semibold">₹{prediction.predictedPrice.toFixed(2)}/quintal</div>
                          <div className="text-xs text-gray-600">₹{(prediction.predictedPrice / 100).toFixed(2)}/kg</div>
                        </td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={prediction.confidence * 100} className="w-16 h-2" />
                            <span className={`text-xs ${getConfidenceColor(prediction.confidence)}`}>
                              {(prediction.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <span className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}>
                            {change > 0 ? '+' : ''}{change.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}