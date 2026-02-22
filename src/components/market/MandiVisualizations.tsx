import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  MapPin,
} from 'lucide-react';
import { MandiPrice } from '@/services/mandiService';

interface MandiVisualizationsProps {
  data: MandiPrice[];
  isLoading?: boolean;
  selectedCommodity?: string;
  className?: string;
}

const COLORS = [
  'hsl(142, 76%, 36%)', // green-600
  'hsl(48, 96%, 53%)',  // yellow-400
  'hsl(221, 83%, 53%)', // blue-500
  'hsl(262, 83%, 58%)', // violet-500
  'hsl(0, 84%, 60%)',   // red-500
  'hsl(173, 80%, 40%)', // teal-500
  'hsl(24, 95%, 53%)',  // orange-500
  'hsl(330, 81%, 60%)', // pink-500
];

export default function MandiVisualizations({
  data,
  isLoading = false,
  selectedCommodity,
  className,
}: MandiVisualizationsProps) {
  // Process data for charts
  const chartData = useMemo(() => {
    if (!data.length) return { commodities: [], markets: [], states: [], prices: [] };

    // Commodity price summary - top 10
    const commodityMap = new Map<string, { min: number; max: number; modal: number; count: number }>();
    data.forEach(item => {
      const existing = commodityMap.get(item.commodity);
      if (existing) {
        existing.min = Math.min(existing.min, item.min_price_per_kg);
        existing.max = Math.max(existing.max, item.max_price_per_kg);
        existing.modal = (existing.modal * existing.count + item.modal_price_per_kg) / (existing.count + 1);
        existing.count++;
      } else {
        commodityMap.set(item.commodity, {
          min: item.min_price_per_kg,
          max: item.max_price_per_kg,
          modal: item.modal_price_per_kg,
          count: 1,
        });
      }
    });
    const commodities = Array.from(commodityMap.entries())
      .map(([name, vals]) => ({ name: name.slice(0, 12), ...vals }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Market comparison - top 8 markets by data points
    const marketMap = new Map<string, { total: number; count: number }>();
    data.forEach(item => {
      const name = item.market.split('(')[0].trim().slice(0, 15);
      const existing = marketMap.get(name);
      if (existing) {
        existing.total += item.modal_price_per_kg;
        existing.count++;
      } else {
        marketMap.set(name, { total: item.modal_price_per_kg, count: 1 });
      }
    });
    const markets = Array.from(marketMap.entries())
      .map(([name, vals]) => ({ name, avgPrice: Math.round(vals.total / vals.count * 100) / 100 }))
      .sort((a, b) => b.avgPrice - a.avgPrice)
      .slice(0, 8);

    // State distribution
    const stateMap = new Map<string, number>();
    data.forEach(item => {
      if (item.state) {
        stateMap.set(item.state, (stateMap.get(item.state) || 0) + 1);
      }
    });
    const states = Array.from(stateMap.entries())
      .map(([name, value]) => ({ name: name.slice(0, 10), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Price range for selected commodity or all
    const priceData = selectedCommodity 
      ? data.filter(d => d.commodity === selectedCommodity)
      : data;
    const prices = priceData.slice(0, 20).map((item, i) => ({
      name: item.market.split('(')[0].trim().slice(0, 10),
      min: item.min_price_per_kg,
      max: item.max_price_per_kg,
      modal: item.modal_price_per_kg,
    }));

    return { commodities, markets, states, prices };
  }, [data, selectedCommodity]);

  const formatPrice = (value: number) => `₹${value.toFixed(0)}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-background/95 backdrop-blur border rounded-lg p-2 shadow-lg text-xs">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? formatPrice(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-48 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Tabs defaultValue="prices" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="prices" className="text-xs gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Prices</span>
          </TabsTrigger>
          <TabsTrigger value="markets" className="text-xs gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Markets</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-xs gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Trends</span>
          </TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs gap-1">
            <PieChartIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Distribution</span>
          </TabsTrigger>
        </TabsList>

        {/* Prices Tab */}
        <TabsContent value="prices" className="mt-4 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Commodity Prices
                {selectedCommodity && <Badge variant="outline" className="text-xs ml-auto">{selectedCommodity}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="h-56 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.commodities} margin={{ top: 5, right: 5, left: -15, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 9 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => `₹${v}`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="min" fill={COLORS[2]} name="Min" radius={[2, 2, 0, 0]} maxBarSize={25} />
                    <Bar dataKey="modal" fill={COLORS[0]} name="Modal" radius={[2, 2, 0, 0]} maxBarSize={25} />
                    <Bar dataKey="max" fill={COLORS[1]} name="Max" radius={[2, 2, 0, 0]} maxBarSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: COLORS[2] }} />Min</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: COLORS[0] }} />Modal</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: COLORS[1] }} />Max</span>
              </div>
            </CardContent>
          </Card>

          {/* Price Range Chart */}
          {chartData.prices.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Price Range by Market
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <div className="h-48 sm:h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.prices} margin={{ top: 5, right: 5, left: -15, bottom: 50 }}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 8 }}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 9 }}
                        tickFormatter={(v) => `₹${v}`}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="modal" stroke={COLORS[0]} fill="url(#priceGrad)" name="Modal Price" strokeWidth={2} />
                      <Line type="monotone" dataKey="max" stroke={COLORS[4]} strokeDasharray="3 3" name="Max" dot={false} />
                      <Line type="monotone" dataKey="min" stroke={COLORS[2]} strokeDasharray="3 3" name="Min" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Markets Tab */}
        <TabsContent value="markets" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Top Markets by Price
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="h-56 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.markets} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                    <XAxis 
                      type="number"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => `₹${v}`}
                      tickLine={false}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name" 
                      tick={{ fontSize: 9 }}
                      width={80}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avgPrice" fill={COLORS[0]} name="Avg Price" radius={[0, 4, 4, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Price Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="h-56 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.commodities} margin={{ top: 5, right: 5, left: -15, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 9 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => `₹${v}`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="modal" 
                      stroke={COLORS[0]} 
                      strokeWidth={2}
                      dot={{ fill: COLORS[0], strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Modal Price"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="max" 
                      stroke={COLORS[1]} 
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Max Price"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="min" 
                      stroke={COLORS[2]} 
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Min Price"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* State Distribution */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                  Data by State
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <div className="h-48 sm:h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.states}
                        cx="50%"
                        cy="50%"
                        outerRadius="75%"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {chartData.states.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Commodity Distribution */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Top Commodities
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <div className="h-48 sm:h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.commodities.slice(0, 6)} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 9 }}
                        width={70}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" fill={COLORS[3]} name="Records" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
