import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, MapPin, RefreshCw, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { marketService } from '@/services/marketBackend';

interface MarketAnalysisData {
  commodity: string;
  summary: {
    currentPrice: number;
    priceChange24h: number;
    priceChange7d: number;
    volatility: number;
    trend: string;
  };
  insights: string[];
  recommendations: string[];
  lastUpdated: string;
  dataSource?: string;
  recordCount?: number;
}

const MARKET_DATA = [
  {
    commodity: 'Tomato',
    price: '45/kg',
    change: '+5',
    changePercent: '+12.5%',
    trend: 'up',
    location: 'Koyambedu'
  },
  {
    commodity: 'Potato',
    price: '25/kg',
    change: '-2',
    changePercent: '-7.4%',
    trend: 'down',
    location: 'Poonamallee'
  },
  {
    commodity: 'Onion',
    price: '35/kg',
    change: '+3',
    changePercent: '+9.4%',
    trend: 'up',
    location: 'Anna Nagar'
  },
];

export function MarketAnalysisPreview() {
  const navigate = useNavigate();
  const [analysisData, setAnalysisData] = useState<MarketAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketAnalysis = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to get analysis for Wheat first, fallback to general analysis
        const response = await marketService.getMarketAnalysis({ commodity: 'Wheat' });
        setAnalysisData(response.analysis);
      } catch (err) {
        console.error('Failed to fetch market analysis:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketAnalysis();
  }, []);

  const formatPrice = (price: number) => `${price.toLocaleString()}`;
  const formatChange = (change: number) => `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold text-foreground dark:text-foreground'>📊 Market Analysis</h2>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => navigate('/market-analysis')}
          className='text-primary hover:text-primary/80'
        >
          View All
        </Button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
        <Card className='bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Commodities</p>
                <p className='text-2xl font-bold text-green-600'>150+</p>
              </div>
              <BarChart3 className='h-8 w-8 text-green-500' />
            </div>
          </CardContent>
        </Card>

        <Card className='bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Markets</p>
                <p className='text-2xl font-bold text-blue-600'>25</p>
              </div>
              <MapPin className='h-8 w-8 text-blue-500' />
            </div>
          </CardContent>
        </Card>

        <Card className='bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950/20 dark:to-slate-900/20'>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>Real-time Updates</p>
                <p className='text-2xl font-bold text-slate-700'>24/7</p>
              </div>
              <RefreshCw className='h-8 w-8 text-slate-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Market Analysis */}
      {isLoading ? (
        <Card className='mb-4'>
          <CardContent className='p-4 flex items-center justify-center'>
            <Loader2 className='h-6 w-6 animate-spin mr-2' />
            <span className='text-sm text-gray-600'>Loading market analysis...</span>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className='mb-4 border-orange-200 bg-orange-50 dark:bg-orange-950/20'>
          <CardContent className='p-4'>
            <div className='flex items-center gap-2 text-orange-700 dark:text-orange-300'>
              <RefreshCw className='h-4 w-4' />
              <span className='text-sm'>{error} - Showing sample data</span>
            </div>
          </CardContent>
        </Card>
      ) : analysisData ? (
        <Card className='mb-4 hover:shadow-md transition-shadow cursor-pointer border-green-200 bg-green-50/50 dark:bg-green-950/10' onClick={() => navigate('/market-analysis')}>
          <CardContent className='p-4'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <h3 className='font-medium text-sm'>{analysisData.commodity}</h3>
                <Badge variant='outline' className='text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'>
                  Live Data
                </Badge>
              </div>
              <div className='flex items-center gap-1'>
                {analysisData.summary.trend === 'bullish' ? (
                  <TrendingUp className='h-4 w-4 text-green-600' />
                ) : analysisData.summary.trend === 'bearish' ? (
                  <TrendingDown className='h-4 w-4 text-red-600' />
                ) : (
                  <div className='h-4 w-4 rounded-full bg-gray-400' />
                )}
              </div>
            </div>
            <div className='flex items-center gap-2 mb-2'>
              <span className='text-lg font-bold text-gray-900 dark:text-gray-100'>
                {formatPrice(analysisData.summary.currentPrice)}
              </span>
              <span className="text-sm font-medium">
                {formatChange(analysisData.summary.priceChange24h)} (24h)
              </span>
            </div>
            <div className='flex items-center justify-between text-xs text-gray-600 dark:text-gray-400'>
              <span>Volatility: {analysisData.summary.volatility.toFixed(1)}%</span>
              <span>Updated: {new Date(analysisData.lastUpdated).toLocaleTimeString()}</span>
            </div>
            {analysisData.insights && analysisData.insights.length > 0 && (
              <div className='mt-2 text-xs text-gray-700 dark:text-gray-300'>
                {analysisData.insights[0]}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Fallback to mock data */}
      <div className='space-y-3'>
        {MARKET_DATA.map((item, index) => (
          <Card key={index} className='hover:shadow-md transition-shadow cursor-pointer' onClick={() => navigate('/market-analysis')}>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <h3 className='font-medium text-sm'>{item.commodity}</h3>
                    <Badge variant='outline' className='text-xs'>{item.location}</Badge>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-lg font-bold text-gray-900 dark:text-gray-100'>{item.price}</span>
                    <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-full">
                      {item.trend === 'up' ? (
                        <TrendingUp className='h-3 w-3' />
                      ) : (
                        <TrendingDown className='h-3 w-3' />
                      )}
                      <span>{item.change} ({item.changePercent})</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
