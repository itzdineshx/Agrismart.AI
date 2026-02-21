import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, AlertTriangle, CloudRain, TrendingUp, Bug } from "lucide-react";

export function AlertsSection() {
  const alerts = [
    {
      id: 1,
      type: "weather",
      title: "Heavy Rain Warning",
      message: "Heavy rainfall expected in your area within the next 2 hours. Secure outdoor equipment and prepare drainage.",
      severity: "high",
      time: "2 hours ago",
      icon: CloudRain,
      color: "text-blue-600"
    },
    {
      id: 2,
      type: "market",
      title: "Price Alert: Wheat",
      message: "Wheat prices increased by 12% to ₹2,450/quintal at Delhi Mandi. Consider selling your stock.",
      severity: "medium",
      time: "4 hours ago",
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      id: 3,
      type: "pest",
      title: "Aphid Infestation Risk",
      message: "High risk of aphid infestation detected in nearby fields. Monitor crops and consider preventive measures.",
      severity: "medium",
      time: "6 hours ago",
      icon: Bug,
      color: "text-orange-600"
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Critical Alerts</h2>
        <Button variant="ghost" size="sm">
          View All
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full bg-gray-100 ${alert.color}`}>
                  <alert.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm text-foreground">{alert.title}</h3>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getSeverityColor(alert.severity)}`}
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">{alert.time}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}