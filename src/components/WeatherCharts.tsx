import { useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { TooltipProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  CloudRain,
  Brain,
  RefreshCw,
  Trash2,
  Sparkles,
} from "lucide-react";
import { WeatherData } from "@/services/weatherService";
import { useWeatherML } from "@/hooks/useWeatherML";

interface WeatherChartsProps {
  weatherData: WeatherData | null;
}

export const WeatherCharts: React.FC<WeatherChartsProps> = ({ weatherData }) => {
  // ML predictions hook
  const {
    predictions,
    isModelReady,
    isTraining,
    isLoading: mlLoading,
    metrics,
    trainModel,
    clearModel,
    trainingProgress,
  } = useWeatherML(weatherData);

  // Process ML predictions for charts
  const mlChartData = useMemo(() => {
    if (!predictions.length) return [];
    return predictions.slice(0, 48).map((pred, i) => ({
      time: pred.time.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        hour12: true,
        ...(i % 6 === 0 ? { month: 'short', day: 'numeric' } : {})
      }),
      temp: Math.round(pred.temperature),
      humidity: Math.round(pred.humidity),
      precip: Math.round(pred.precipitation * 10) / 10,
      wind: Math.round(pred.windSpeed),
      confidence: Math.round(pred.confidence * 100),
    }));
  }, [predictions]);

  if (!weatherData) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading weather charts...</p>
        </CardContent>
      </Card>
    );
  }

  // Process hourly data for the next 24 hours
  const hourlyChartData = useMemo(() => {
    if (!weatherData.hourly || !weatherData.hourly.time) return [];
    
    const hoursToShow = Math.min(24, weatherData.hourly.time.length);
    return Array.from({ length: hoursToShow }, (_, i) => {
      const time = weatherData.hourly.time[i];
      const temperature = weatherData.hourly.temperature_2m?.[i];
      const humidity = weatherData.hourly.relative_humidity_2m?.[i];
      const precipitation = weatherData.hourly.precipitation?.[i] || 0;
      const windSpeed = weatherData.hourly.wind_speed_10m?.[i];
      
      return {
        time: time ? new Date(time).toLocaleTimeString('en-US', { 
          hour: 'numeric',
          hour12: true
        }) : `${i}h`,
        temp: temperature ? Math.round(temperature) : 0,
        humidity: humidity ? Math.round(humidity) : 0,
        precip: typeof precipitation === 'number' ? Math.round(precipitation * 10) / 10 : 0,
        wind: windSpeed ? Math.round(windSpeed) : 0,
      };
    });
  }, [weatherData]);

  // Process daily data for 7-day charts
  const dailyChartData = useMemo(() => {
    if (!weatherData.daily) return [];
    
    const daysToShow = Math.min(7, weatherData.daily.time.length);
    return Array.from({ length: daysToShow }, (_, i) => {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);
      
      return {
        day: i === 0 ? 'Today' : forecastDate.toLocaleDateString('en-US', { weekday: 'short' }),
        high: Math.round(weatherData.daily.temperature_2m_max[i]),
        low: Math.round(weatherData.daily.temperature_2m_min[i]),
        precip: Math.round((weatherData.daily.precipitation_sum[i] || 0) * 10) / 10,
        wind: Math.round(weatherData.daily.wind_speed_10m_max[i]),
      };
    });
  }, [weatherData]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-2 shadow-lg text-sm">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry?.color }}>
              {entry?.name}: {entry?.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Thermometer className="h-5 w-5 text-primary" />
          Weather Charts
          {isModelReady && (
            <Badge variant="secondary" className="ml-auto text-xs">
              <Brain className="h-3 w-3 mr-1" />
              AI Ready
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="temperature" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="temperature" className="text-xs sm:text-sm">
              <Thermometer className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Temp</span>
            </TabsTrigger>
            <TabsTrigger value="precipitation" className="text-xs sm:text-sm">
              <CloudRain className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Rain</span>
            </TabsTrigger>
            <TabsTrigger value="humidity" className="text-xs sm:text-sm">
              <Droplets className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Humidity</span>
            </TabsTrigger>
            <TabsTrigger value="wind" className="text-xs sm:text-sm">
              <Wind className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Wind</span>
            </TabsTrigger>
            <TabsTrigger value="ml" className="text-xs sm:text-sm">
              <Brain className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
          </TabsList>

          {/* Temperature Tab */}
          <TabsContent value="temperature" className="mt-0">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">24-Hour Forecast</h4>
                <div className="h-48 sm:h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}°`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="temp" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Temperature (°C)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">7-Day Range</h4>
                <div className="h-40 sm:h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}°`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="high" 
                        fill="hsl(var(--primary))" 
                        name="High (°C)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                      <Bar 
                        dataKey="low" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.4}
                        name="Low (°C)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Precipitation Tab */}
          <TabsContent value="precipitation" className="mt-0">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">24-Hour Forecast</h4>
                <div className="h-48 sm:h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}mm`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="precip" 
                        stroke="hsl(210, 100%, 50%)" 
                        fill="hsl(210, 100%, 70%)"
                        fillOpacity={0.4}
                        name="Precipitation (mm)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">7-Day Total</h4>
                <div className="h-40 sm:h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}mm`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="precip" 
                        fill="hsl(210, 100%, 60%)" 
                        name="Precipitation (mm)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Humidity Tab */}
          <TabsContent value="humidity" className="mt-0">
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">24-Hour Forecast</h4>
              <div className="h-56 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="hsl(200, 80%, 50%)" 
                      fill="hsl(200, 80%, 70%)"
                      fillOpacity={0.4}
                      name="Humidity (%)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Wind Tab */}
          <TabsContent value="wind" className="mt-0">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">24-Hour Forecast</h4>
                <div className="h-48 sm:h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="wind" 
                        stroke="hsl(160, 60%, 45%)" 
                        strokeWidth={2}
                        name="Wind (km/h)"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">7-Day Max Wind</h4>
                <div className="h-40 sm:h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-20" vertical={false} />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="wind" 
                        fill="hsl(160, 60%, 50%)" 
                        name="Max Wind (km/h)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ML Predictions Tab */}
          <TabsContent value="ml" className="mt-0">
            <div className="space-y-4">
              {/* Model Status & Controls */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-accent/30 rounded-lg">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Brain className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {isModelReady ? 'LSTM Model Ready' : 'Statistical Model'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isModelReady && metrics 
                        ? `Trained on ${metrics.dataPoints} points • Loss: ${metrics.loss.toFixed(4)}`
                        : 'Train LSTM for better accuracy'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={isModelReady ? "outline" : "default"}
                    onClick={trainModel}
                    disabled={isTraining}
                    className="text-xs"
                  >
                    {isTraining ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Training...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1" />
                        {isModelReady ? 'Retrain' : 'Train AI'}
                      </>
                    )}
                  </Button>
                  {isModelReady && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearModel}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Training Progress */}
              {isTraining && trainingProgress && (
                <div className="p-3 bg-primary/5 rounded-lg">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Training Progress</span>
                    <span>Epoch {trainingProgress.epoch}/50</span>
                  </div>
                  <Progress value={(trainingProgress.epoch / 50) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Loss: {trainingProgress.loss.toFixed(4)}
                  </p>
                </div>
              )}

              {/* 48-Hour AI Prediction Chart */}
              {mlChartData.length > 0 && (
                <>
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-3 w-3" />
                      48-Hour AI Temperature Forecast
                      {!isModelReady && (
                        <Badge variant="outline" className="text-xs ml-auto">Statistical</Badge>
                      )}
                    </h4>
                    <div className="h-52 sm:h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mlChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 9 }}
                            interval="preserveStartEnd"
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}°`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <ReferenceLine 
                            y={hourlyChartData[0]?.temp || 0} 
                            stroke="hsl(var(--muted-foreground))" 
                            strokeDasharray="5 5"
                            label={{ value: 'Current', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="temp" 
                            stroke="hsl(var(--primary))" 
                            fill="url(#tempGradient)"
                            strokeWidth={2}
                            name="Predicted Temp (°C)"
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Confidence Chart */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Prediction Confidence
                    </h4>
                    <div className="h-32 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mlChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 9 }}
                            interval="preserveStartEnd"
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="confidence" 
                            stroke="hsl(120, 60%, 45%)" 
                            fill="hsl(120, 60%, 70%)"
                            fillOpacity={0.3}
                            strokeWidth={2}
                            name="Confidence (%)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Multi-feature Predictions */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Multi-Feature 48h Forecast
                    </h4>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mlChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 9 }}
                            interval="preserveStartEnd"
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Line 
                            type="monotone" 
                            dataKey="temp" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            name="Temperature (°C)"
                            dot={false}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="humidity" 
                            stroke="hsl(200, 80%, 50%)" 
                            strokeWidth={2}
                            name="Humidity (%)"
                            dot={false}
                            strokeDasharray="5 5"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="wind" 
                            stroke="hsl(160, 60%, 45%)" 
                            strokeWidth={2}
                            name="Wind (km/h)"
                            dot={false}
                            strokeDasharray="3 3"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {mlChartData.length === 0 && !isTraining && (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No predictions available</p>
                  <p className="text-xs">Weather data is required to generate forecasts</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
