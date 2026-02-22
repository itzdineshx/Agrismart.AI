import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Brain,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { INDIAN_STATES } from '@/services/mandiService';
import { getForecastAlgorithms } from '@/services/forecastService';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

interface PriceDataPoint {
  date: string;
  price: number;
}

interface PricePrediction {
  date: string;
  predictedPrice: number;
  confidence: number;
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
  accuracy: number;
  meanAbsolutePercentageError: number;
  confidence: number;
}

interface ForecastResponse {
  commodity: string;
  state?: string;
  algorithm: string;
  historicalData: PriceDataPoint[];
  forecast: PricePrediction[];
  insights: ForecastInsights;
  validationMetrics: ValidationMetrics;
  dataPoints: number;
}

interface PriceForecastProps {
  commodity?: string;
  state?: string;
  className?: string;
}

const COMMODITIES = [
  'Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Potato', 'Tomato', 'Onion',
  'Garlic', 'Ginger', 'Chilli', 'Turmeric', 'Mustard', 'Groundnut', 'Soybean',
  'Banana', 'Mango', 'Orange', 'Apple', 'Grapes', 'Pomegranate', 'Coconut',
];

export default function PriceForecast({ commodity = 'Wheat', state, className = '' }: PriceForecastProps) {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCommodity, setSelectedCommodity] = useState(commodity);
  const [selectedState, setSelectedState] = useState(state || 'all');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('ensemble');
  const [forecastDays, setForecastDays] = useState(7);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const algorithms = getForecastAlgorithms();

  const fetchForecast = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        commodity: selectedCommodity,
        algorithm: selectedAlgorithm,
        days: forecastDays.toString(),
      });
      if (selectedState !== 'all') params.append('state', selectedState);

      const response = await fetch(`${BACKEND_BASE_URL}/api/market/forecast?${params}`);
      if (!response.ok) throw new Error('Failed to fetch forecast');
      setForecast(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCommodity, selectedState, selectedAlgorithm, forecastDays]);

  const chartData = useMemo(() => {
    if (!forecast) return [];
    const historical = forecast.historicalData.map(d => ({
      date: new Date(d.date.split('/').reverse().join('-')).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      price: d.price / 100,
      type: 'historical',
    }));
    const predictions = forecast.forecast.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      price: d.predictedPrice / 100,
      predicted: d.predictedPrice / 100,
      type: 'forecast',
    }));
    return [...historical, ...predictions];
  }, [forecast]);

  const TrendIcon = forecast?.insights.trend === 'upward' ? TrendingUp : TrendingDown;
  const trendColor = forecast?.insights.trend === 'upward' ? 'text-green-500' : forecast?.insights.trend === 'downward' ? 'text-red-500' : 'text-gray-500';

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <Button size="sm" onClick={fetchForecast}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Price Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Main Controls Row */}
          <div className="flex flex-wrap gap-2">
            <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMODITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={forecastDays.toString()} onValueChange={v => setForecastDays(parseInt(v))}>
              <SelectTrigger className="w-[90px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Days</SelectItem>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Button size="sm" onClick={fetchForecast} disabled={isLoading} className="h-8">
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Generate'}
            </Button>
          </div>

          {/* Collapsible Advanced Options */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground">
                Advanced Options <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-md">
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {algorithms.map(a => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Results */}
      {forecast && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-lg font-bold">₹{(forecast.insights.currentPrice / 100).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">per kg</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="text-lg font-bold">₹{(forecast.insights.averagePrice / 100).toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">per kg</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Trend</p>
                <div className="flex items-center gap-1">
                  <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                  <span className={`text-sm font-medium capitalize ${trendColor}`}>{forecast.insights.trend}</span>
                </div>
                <p className={`text-xs ${forecast.insights.predictedChangePercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {forecast.insights.predictedChangePercent > 0 ? '+' : ''}{forecast.insights.predictedChangePercent.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Accuracy</p>
                <p className="text-lg font-bold">{(forecast.validationMetrics.accuracy * 100).toFixed(0)}%</p>
                <Progress value={forecast.validationMetrics.accuracy * 100} className="h-1 mt-1" />
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {forecast.commodity} Price Forecast
                </span>
                <Badge variant="outline" className="text-xs">{forecast.dataPoints} points</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="h-52 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `₹${v}`} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                      formatter={(v: number, name: string) => [`₹${v.toFixed(2)}/kg`, name === 'predicted' ? 'Predicted' : 'Price']}
                    />
                    <Area type="monotone" dataKey="price" stroke="hsl(142, 76%, 36%)" fill="url(#forecastGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="predicted" stroke="hsl(48, 96%, 53%)" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recommendation */}
          <Card className="shadow-sm bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-primary mb-1">AI Recommendation</p>
                  <p className="text-sm">{forecast.insights.recommendation}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>Confidence: {(forecast.insights.confidence * 100).toFixed(0)}%</span>
                    <span>Volatility: {forecast.insights.volatility.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Forecast Table - Compact */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detailed Predictions</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Date</th>
                      <th className="text-right py-2 px-2">Price</th>
                      <th className="text-center py-2 px-2">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.forecast.map((p, i) => {
                      const prev = i === 0 ? forecast.insights.currentPrice : forecast.forecast[i - 1].predictedPrice;
                      const change = ((p.predictedPrice - prev) / prev) * 100;
                      return (
                        <tr key={p.date} className="border-b last:border-0">
                          <td className="py-2 px-2">{new Date(p.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                          <td className="text-right py-2 px-2">
                            <span className="font-medium">₹{(p.predictedPrice / 100).toFixed(1)}/kg</span>
                            <span className={`ml-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({change > 0 ? '+' : ''}{change.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-center gap-1">
                              <Progress value={p.confidence * 100} className="w-12 h-1.5" />
                              <span className="text-muted-foreground">{(p.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!forecast && !isLoading && (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Brain className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm text-center">
              Select a commodity and click Generate to see AI price predictions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
