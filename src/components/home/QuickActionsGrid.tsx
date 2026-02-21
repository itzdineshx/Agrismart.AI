import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Camera, 
  ShoppingCart, 
  Users, 
  BarChart3, 
  BookOpen, 
  Headphones,
  Cloud
} from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickActionsGrid() {
  const navigate = useNavigate();

  const actions = [
    {
      id: "diagnose",
      title: "Diagnose Crop",
      icon: Camera,
      route: "/diagnose",
      emoji: "🧪",
      description: "AI crop analysis"
    },
    {
      id: "weather",
      title: "Weather & Forecast",
      icon: Cloud,
      route: "/weather",
      emoji: "🌦️",
      description: "Local weather & forecast"
    },
    {
      id: "marketplace",
      title: "Marketplace",
      icon: ShoppingCart,
      route: "/buy",
      emoji: "🛒",
      description: "Buy & sell crops",
      featured: true
    },
    {
      id: "reports",
      title: "Reports & Insights",
      icon: BarChart3,
      route: "/market-analysis",
      emoji: "📊",
      description: "Analytics dashboard"
    },
    {
      id: "news",
      title: "News & Articles",
      icon: BookOpen,
      route: "/blogs",
      emoji: "📰",
      description: "Latest agri news & tips"
    },
    {
      id: "support",
      title: "Support",
      icon: Headphones,
      route: "/support",
      emoji: "📞",
      description: "Get help 24/7"
    }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground dark:text-foreground">Quick Actions</h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((action) => {
          const IconComponent = action.icon;
          
          if (action.featured) {
            return (
              <Card 
                key={action.id}
                className="col-span-2 lg:col-span-1 bg-card shadow-elegant border border-border hover:shadow-elegant-lg transition-all duration-300 cursor-pointer group"
                onClick={() => navigate(action.route)}
              >
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 mb-4 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                    <span className="text-2xl">{action.emoji}</span>
                  </div>
                  <h3 className="font-bold text-card-foreground mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card 
              key={action.id}
              className={cn(
                "bg-card shadow-elegant border border-border hover:shadow-elegant-lg transition-all duration-200 cursor-pointer group",
                action.id === "support" && "hidden md:block"
              )}
              onClick={() => navigate(action.route)}
            >
              <CardContent className="p-4 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 dark:bg-primary/20 mb-3 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                  <span className="text-lg">{action.emoji}</span>
                </div>
                <h3 className="font-semibold text-card-foreground text-sm mb-1">{action.title}</h3>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
