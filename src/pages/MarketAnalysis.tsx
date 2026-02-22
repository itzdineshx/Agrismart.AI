import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  MapPin,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  BarChart3,
  Table as TableIcon,
  Target,
  DollarSign,
  Filter,
  X,
} from 'lucide-react';
import { 
  fetchMandiPrices, 
  MandiPrice, 
  findNearestMandis,
  FilterOptions,
  MandiLocation,
  INDIAN_STATES
} from '@/services/mandiService';
import { getPreferredLocation, UserLocation, getStateFromLocation } from '@/services/locationService';
import MandiTable from '@/components/market/MandiTable';
import MandiVisualizations from '@/components/market/MandiVisualizations';
import PriceForecast from '@/components/market/PriceForecast';
import { EnhancedLoading } from '@/components/common/EnhancedLoading';
import { format } from 'date-fns';

export default function MarketAnalysis() {
  const [data, setData] = useState<MandiPrice[]>([]);
  const [filteredData, setFilteredData] = useState<MandiPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearestMandis, setNearestMandis] = useState<(MandiLocation & { distance: number })[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({ onlyRecentData: true });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get user location
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { location } = await getPreferredLocation();
        setUserLocation(location);
        const nearest = findNearestMandis(location.lat, location.lng, 5);
        setNearestMandis(nearest);
        const userState = getStateFromLocation(location);
        setFilters(prev => ({ ...prev, state: userState }));
      } catch (error) {
        console.warn('Failed to get user location:', error);
      }
    };
    getUserLocation();
  }, []);

  // Fetch data
  const fetchData = useCallback(async (showLoading = true) => {
    if (!isOnline) return;
    if (showLoading) setIsLoading(true);

    try {
      const result = await fetchMandiPrices({
        commodity: filters.commodity,
        state: filters.state,
        district: filters.district,
        limit: 500,
        onlyRecentData: filters.onlyRecentData,
        prioritizeChennai: true,
        userLocation: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined,
      });
      
      setData(result.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch mandi data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, isOnline, userLocation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filters
  useEffect(() => {
    let filtered = [...data];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.commodity.toLowerCase().includes(search) ||
        item.market.toLowerCase().includes(search) ||
        (item.state || '').toLowerCase().includes(search)
      );
    }

    if (filters.commodity) {
      filtered = filtered.filter(item => item.commodity === filters.commodity);
    }
    if (filters.state) {
      filtered = filtered.filter(item => item.state === filters.state);
    }
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'price_asc': return a.modal_price_per_kg - b.modal_price_per_kg;
          case 'price_desc': return b.modal_price_per_kg - a.modal_price_per_kg;
          case 'commodity': return a.commodity.localeCompare(b.commodity);
          default: return 0;
        }
      });
    }

    setFilteredData(filtered);
  }, [data, filters, searchTerm]);

  // Stats
  const stats = filteredData.length > 0 ? {
    avgPrice: filteredData.reduce((sum, item) => sum + item.modal_price_per_kg, 0) / filteredData.length,
    maxPrice: Math.max(...filteredData.map(item => item.max_price_per_kg)),
    minPrice: Math.min(...filteredData.map(item => item.min_price_per_kg)),
    totalMarkets: new Set(filteredData.map(item => item.market)).size,
  } : null;

  // Get unique commodities
  const commodities = [...new Set(data.map(item => item.commodity))].sort();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {isLoading && <EnhancedLoading />}

      {/* Header */}
      <div className="bg-gradient-primary text-primary-foreground p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Market Analysis</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-primary-foreground/80">
                {userLocation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {userLocation.city || userLocation.state}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  {isOnline ? <Wifi className="h-3.5 w-3.5 text-green-300" /> : <WifiOff className="h-3.5 w-3.5 text-red-300" />}
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-primary-foreground/70 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(lastUpdated, 'HH:mm')}
                </span>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-white border-0"
                onClick={() => fetchData()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">Avg Price</p>
                    <p className="font-bold text-sm sm:text-base">₹{stats.avgPrice.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">Highest</p>
                    <p className="font-bold text-sm sm:text-base">₹{stats.maxPrice.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">Lowest</p>
                    <p className="font-bold text-sm sm:text-base">₹{stats.minPrice.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">Markets</p>
                    <p className="font-bold text-sm sm:text-base">{stats.totalMarkets}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search & Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search commodity, market..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              
              {/* Quick Filters */}
              <div className="flex gap-2">
                <Select
                  value={filters.commodity || 'all'}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, commodity: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger className="w-[130px] sm:w-[150px] h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Commodity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Commodities</SelectItem>
                    {commodities.slice(0, 30).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.state || 'all'}
                  onValueChange={(v) => setFilters(prev => ({ ...prev, state: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger className="w-[120px] sm:w-[140px] h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {INDIAN_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-2 sm:px-3"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Extended Filters */}
            {showFilters && (
              <div className="mt-3 pt-3 border-t flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground">Sort by:</span>
                <div className="flex gap-1.5">
                  {[
                    { value: 'price_asc', label: 'Price ↑' },
                    { value: 'price_desc', label: 'Price ↓' },
                    { value: 'commodity', label: 'Name' },
                  ].map(opt => (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={filters.sortBy === opt.value ? "default" : "outline"}
                      className="h-7 text-xs px-2"
                      onClick={() => setFilters(prev => ({ ...prev, sortBy: opt.value as FilterOptions['sortBy'] }))}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                {(filters.commodity || filters.state || filters.sortBy) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-destructive"
                    onClick={() => setFilters({ onlyRecentData: true })}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>
            Showing {filteredData.length} of {data.length} records
          </span>
          {filters.commodity && (
            <Badge variant="secondary" className="text-xs">
              {filters.commodity}
            </Badge>
          )}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="table" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-10">
            <TabsTrigger value="table" className="text-xs sm:text-sm gap-1.5">
              <TableIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Prices</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="text-xs sm:text-sm gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Charts</span>
            </TabsTrigger>
            <TabsTrigger value="forecast" className="text-xs sm:text-sm gap-1.5">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Forecast</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="mt-4">
            <MandiTable data={filteredData} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="charts" className="mt-4">
            <MandiVisualizations
              data={filteredData}
              isLoading={isLoading}
              selectedCommodity={filters.commodity}
            />
          </TabsContent>

          <TabsContent value="forecast" className="mt-4">
            <PriceForecast
              commodity={filters.commodity}
              state={filters.state}
              district={filters.district}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
