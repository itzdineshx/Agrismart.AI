import { GreetingSection } from "@/components/home/GreetingSection";
import { QuickActionsGrid } from "@/components/home/QuickActionsGrid";
import { AlertsSection } from "@/components/home/AlertsSection";
import { AISuggestionsSection } from "@/components/home/AIsuggestionsSection";
import { FieldIntelligenceMap } from "@/components/cards/FieldIntelligenceMap";
import { MarketplacePreview } from "@/components/home/MarketplacePreview";
import { MarketAnalysisPreview } from "@/components/home/MarketAnalysisPreview";
import { WeatherPreview } from "@/components/home/WeatherPreview";

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark:bg-background pb-20">
      
      <div className="container mx-auto px-4 space-y-8 max-w-7xl py-6">
        {/* Greeting + Smart Overview */}
        <GreetingSection />

        {/* Quick Actions Grid */}
        <QuickActionsGrid />

        {/* Alerts Section */}
        <AlertsSection />

        {/* Intelligence Map Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Field Intelligence</h2>
          </div>
          <div className="rounded-xl overflow-hidden border bg-card shadow-sm">
            <FieldIntelligenceMap className="w-full h-[400px]" />
          </div>
        </section>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weather & AI Column */}
          <div className="space-y-8">
            <WeatherPreview />
            <AISuggestionsSection />
          </div>

          {/* Market & Trade Column */}
          <div className="space-y-8">
            <MarketAnalysisPreview />
            <MarketplacePreview />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;