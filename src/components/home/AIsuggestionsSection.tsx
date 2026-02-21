import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Droplets, Sprout, Thermometer, TrendingUp } from "lucide-react";

export function AISuggestionsSection() {
  const aiSuggestions = [
    {
      id: 1,
      type: "irrigation",
      title: "Optimal Irrigation Schedule",
      description: "Based on current weather patterns and soil moisture levels, irrigate your wheat field tomorrow morning between 6-8 AM.",
      confidence: 92,
      icon: Droplets,
      color: "text-blue-600",
      action: "Schedule Irrigation"
    },
    {
      id: 2,
      type: "pest",
      title: "Preventive Pest Control",
      description: "High humidity levels detected. Apply neem oil spray to prevent fungal diseases in tomato plants.",
      confidence: 87,
      icon: Sprout,
      color: "text-green-600",
      action: "View Treatment Guide"
    },
    {
      id: 3,
      type: "market",
      title: "Optimal Selling Time",
      description: "Market analysis suggests selling your potato harvest this Friday when prices are expected to peak at ₹1,200/quintal.",
      confidence: 78,
      icon: TrendingUp,
      color: "text-orange-600",
      action: "Check Market Prices"
    }
  ];

  return (
    <div className="h-full">
      <Card className="shadow-sm border border-border bg-card dark:bg-card h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-card-foreground">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="font-semibold">AI Suggestions</span>
              <p className="text-xs text-muted-foreground font-normal mt-1">
                Personalized farming recommendations powered by AI
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full bg-accent ${suggestion.color}`}>
                  <suggestion.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm text-foreground">{suggestion.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.confidence}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
                  <Button variant="outline" size="sm" className="text-xs">
                    {suggestion.action}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}