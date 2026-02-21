import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWeather } from "@/hooks/useWeather";

const WEATHER_FORECAST = [
  { day: "Today", temp: "32°C", condition: "Sunny", icon: Sun, humidity: "65%" },
  { day: "Tomorrow", temp: "31°C", condition: "Partly Cloudy", icon: Cloud, humidity: "70%" },
  { day: "Day 3", temp: "29°C", condition: "Light Rain", icon: CloudRain, humidity: "75%" },
];

export function WeatherPreview() {
  const navigate = useNavigate();
  const { weatherData, loading: weatherLoading } = useWeather();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground dark:text-foreground">🌤️ Weather & Forecast</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/weather')}
          className="text-primary hover:text-primary/80"
        >
          View Details
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temperature</p>
                <p className="text-2xl font-bold text-blue-600">
                  {weatherLoading ? "..." : `${Math.round(weatherData?.current?.temperature_2m || 0)}°C`}
                </p>
              </div>
              <Thermometer className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/20 dark:to-teal-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Humidity</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {weatherLoading ? "..." : `${Math.round(weatherData?.current?.relative_humidity_2m || 0)}%`}
                </p>
              </div>
              <Droplets className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Wind Speed</p>
                <p className="text-2xl font-bold text-gray-600">
                  {weatherLoading ? "..." : `${Math.round(weatherData?.current?.wind_speed_10m || 0)} km/h`}
                </p>
              </div>
              <Wind className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Forecast Range</p>
                <p className="text-2xl font-bold text-amber-700">10km</p>
              </div>
              <Eye className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {WEATHER_FORECAST.map((forecast, index) => {
          const IconComponent = forecast.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/weather')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-8 w-8 text-blue-500" />
                    <div>
                      <h3 className="font-medium text-sm">{forecast.day}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{forecast.condition}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{forecast.temp}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{forecast.humidity} humidity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}