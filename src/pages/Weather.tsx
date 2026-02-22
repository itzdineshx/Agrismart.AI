import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { EnhancedLoading } from '@/components/common/EnhancedLoading';
import { useRealtimeWeather } from '@/hooks/useRealtimeWeather';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow,
  Zap,
  Thermometer, 
  Droplets, 
  Wind, 
  Calendar,
  MapPin,
  AlertTriangle,
  RefreshCw,
  Map,
  Sunrise,
  Sunset,
  Target,
} from "lucide-react";
import { 
  getWeatherCondition, 
  generateAgricultureRecommendations, 
  processDailyForecast,
  type DailyForecast,
  type AgricultureRecommendation 
} from "@/services/weatherService";
import { WeatherMapModal } from "@/components/WeatherMapModal";
import { WeatherCharts } from "@/components/WeatherCharts";
import { formatWeatherTime } from "@/utils/weatherUtils";

export default function Weather() {
  const {
    weatherData,
    location,
    loading,
    error,
    refreshWeatherData,
  } = useRealtimeWeather();
  
  const [agricultureRecommendations, setAgricultureRecommendations] = useState<AgricultureRecommendation[]>([]);
  const [dailyForecasts, setDailyForecasts] = useState<DailyForecast[]>([]);
  const [isMapOpen, setIsMapOpen] = useState(false);

  useEffect(() => {
    if (weatherData) {
      const recommendations = generateAgricultureRecommendations(weatherData);
      const forecasts = processDailyForecast(weatherData);
      setAgricultureRecommendations(recommendations);
      setDailyForecasts(forecasts);
    }
  }, [weatherData]);

  if (loading) {
    return <EnhancedLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Weather Unavailable</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => refreshWeatherData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!weatherData) return null;

  const currentWeather = {
    temperature: Math.round(weatherData.current.temperature_2m),
    condition: getWeatherCondition(weatherData.current.weather_code),
    humidity: weatherData.current.relative_humidity_2m,
    windSpeed: Math.round(weatherData.current.wind_speed_10m),
    location: typeof location === 'string' ? location : location?.address || "Unknown Location",
    feelsLike: Math.round(weatherData.current.apparent_temperature),
    precipitation: weatherData.current.precipitation || 0
  };

  const conditionText = typeof currentWeather.condition === 'string' ? 
    currentWeather.condition : currentWeather.condition.condition;

  const WeatherIcon = conditionText.includes('cloud') ? Cloud :
                      conditionText.includes('rain') ? CloudRain :
                      conditionText.includes('snow') ? CloudSnow :
                      conditionText.includes('storm') ? Zap : Sun;

  const forecastData = dailyForecasts.slice(0, 7).map((forecast, index) => {
    const conditionText = getWeatherCondition(forecast.weather_code || 0);
    const condition = typeof conditionText === 'string' ? conditionText : conditionText.condition;
    const forecastDate = new Date();
    forecastDate.setDate(forecastDate.getDate() + index);

    return {
      day: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : forecastDate.toLocaleDateString('en-US', { weekday: 'short' }),
      date: forecastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      high: Math.round(forecast.temperature_max || 25),
      low: Math.round(forecast.temperature_min || 15),
      condition,
      icon: condition.includes('cloud') ? Cloud :
            condition.includes('rain') ? CloudRain :
            condition.includes('snow') ? CloudSnow :
            condition.includes('storm') ? Zap : Sun,
      rainChance: Math.round(forecast.precipitation_probability || 0),
      windSpeed: Math.round(forecast.wind_speed_max || 10),
      sunrise: forecast.sunrise,
      sunset: forecast.sunset
    };
  });

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setIsMapOpen(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header */}
      <div className="bg-gradient-primary text-primary-foreground p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Weather</h1>
              <p className="text-primary-foreground/80 flex items-center gap-1.5 text-sm">
                <MapPin className="h-3.5 w-3.5" />
                {currentWeather.location}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="secondary" 
                className="bg-white/10 hover:bg-white/20 text-white border-0"
                onClick={() => refreshWeatherData()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0">
                    <Map className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">Location</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Select Location</DialogTitle>
                    <DialogDescription>
                      Choose a location to get weather forecasts for that area.
                    </DialogDescription>
                  </DialogHeader>
                  <WeatherMapModal 
                    onLocationSelect={handleLocationSelect}
                    currentLocation={undefined}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Current Weather */}
        <Card className="shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Main Temperature */}
              <div className="flex items-center gap-3 text-center sm:text-left">
                <WeatherIcon className="h-14 w-14 sm:h-16 sm:w-16 text-primary" />
                <div>
                  <p className="text-4xl sm:text-5xl font-bold">{currentWeather.temperature}°</p>
                  <p className="text-muted-foreground text-sm">{conditionText}</p>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 flex-1 w-full sm:w-auto sm:ml-auto">
                <div className="text-center p-2 sm:p-3 bg-accent/40 rounded-lg">
                  <Thermometer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                  <p className="text-xs text-muted-foreground">Feels</p>
                  <p className="font-semibold text-sm">{currentWeather.feelsLike}°</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-accent/40 rounded-lg">
                  <Droplets className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Humidity</p>
                  <p className="font-semibold text-sm">{currentWeather.humidity}%</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-accent/40 rounded-lg">
                  <Wind className="h-4 w-4 mx-auto mb-1 text-teal-500" />
                  <p className="text-xs text-muted-foreground">Wind</p>
                  <p className="font-semibold text-sm">{currentWeather.windSpeed} km/h</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weather Charts */}
        <WeatherCharts weatherData={weatherData} />

        {/* 7-Day Forecast */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              7-Day Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {forecastData.map((day, index) => {
                const IconComponent = day.icon;
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2.5 sm:p-3 bg-accent/30 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-16 sm:w-20">
                        <p className="font-medium text-sm">{day.day}</p>
                        <p className="text-xs text-muted-foreground">{day.date}</p>
                      </div>
                      <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">{day.condition}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-4 text-sm">
                      <div className="flex items-center gap-1 text-blue-500">
                        <Droplets className="h-3 w-3" />
                        <span className="text-xs">{day.rainChance}%</span>
                      </div>
                      <div className="flex gap-1 font-medium">
                        <span className="text-foreground">{day.high}°</span>
                        <span className="text-muted-foreground">{day.low}°</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Today's Sunrise/Sunset */}
            {forecastData[0]?.sunrise && forecastData[0]?.sunset && (
              <div className="flex justify-center gap-6 mt-4 pt-3 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Sunrise className="h-4 w-4 text-orange-400" />
                  <span>{formatWeatherTime(forecastData[0].sunrise)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sunset className="h-4 w-4 text-orange-600" />
                  <span>{formatWeatherTime(forecastData[0].sunset)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agriculture Recommendations */}
        {agricultureRecommendations.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Farming Tips
                </span>
                <Badge variant="outline" className="text-xs">{agricultureRecommendations.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {agricultureRecommendations.slice(0, 3).map((rec, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-3 ${
                      rec.priority === "high"
                        ? "border-l-red-500 bg-red-50 dark:bg-red-950/20"
                        : rec.priority === "medium"
                        ? "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                        : "border-l-green-500 bg-green-50 dark:bg-green-950/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm">{rec.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-1.5 py-0 ${
                          rec.priority === "high" ? "border-red-300 text-red-700" :
                          rec.priority === "medium" ? "border-yellow-300 text-yellow-700" :
                          "border-green-300 text-green-700"
                        }`}
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{rec.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
