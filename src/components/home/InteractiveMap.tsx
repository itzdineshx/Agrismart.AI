import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Search, Target, Eye, EyeOff, Maximize2, X } from 'lucide-react';

// Types for map data
interface SearchResult {
  name: string;
  lat: number;
  lng: number;
  type: string;
  description?: string;
  phone?: string;
}

interface BaseMarkerData {
  description?: string;
  phone?: string;
}

interface CropMarkerData extends BaseMarkerData {
  crop: string;
  area: string;
  health: number;
  issues?: string[];
}

interface MarketMarkerData extends BaseMarkerData {
  prices: Record<string, number>;
  volume: string;
  lastUpdate: string;
}

interface DiseaseMarkerData extends BaseMarkerData {
  crop: string;
  severity: 'high' | 'medium' | 'low';
  affectedFarms: number;
  radius: number;
}

interface HospitalMarkerData extends BaseMarkerData {
  services: string[];
}

interface SearchMarkerData extends BaseMarkerData {
  type: string;
}

interface CurrentLocationData extends BaseMarkerData {
  isCurrentLocation: true;
}

type MarkerData = CropMarkerData | MarketMarkerData | DiseaseMarkerData | HospitalMarkerData | SearchMarkerData | CurrentLocationData;

interface MapMarker {
  type: 'crop' | 'market' | 'disease' | 'hospital' | 'search' | 'current';
  data: MarkerData;
  name: string;
  lat: number;
  lng: number;
}

// Fix for default markers in React Leaflet
const iconDefault = L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: () => string };
delete iconDefault._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const PUNJAB_CENTER = { lat: 30.7333, lng: 76.7794 }; // Chandigarh, Punjab
const DEFAULT_ZOOM = 10;

// Mock data for farm monitoring - replaced with empty data for backend integration
const mockData = {
  farmer: {
    location: "Connect to backend",
    farmSize: "0 acres"
  },
  farmPlots: [],
  nearbyMarkets: [],
  diseaseOutbreaks: []
};

// Additional Punjab locations for better map context
const punjabLocations = [
  {
    lat: 30.9010,
    lng: 75.8573,
    name: "Ludhiana Agricultural Market",
    type: 'market',
    description: "Major grain and crop trading center",
    phone: "0161-2401234"
  },
  {
    lat: 31.6340,
    lng: 74.8723,
    name: "Amritsar Crop Research Center",
    type: 'hospital',
    description: "Agricultural research and plant health facility",
    phone: "0183-2258802"
  },
  {
    lat: 30.3398,
    lng: 76.3869,
    name: "Patiala Agricultural Extension Office",
    type: 'shelter',
    description: "Government agricultural support center",
    phone: "0175-2212345"
  }
];

// Custom icons for different location types
const createCustomIcon = (type: string, emoji: string) => {
  const colors = {
    crop: '#10B981',
    market: '#3B82F6',
    disease: '#EF4444',
    current: '#06B6D4',
    shelter: '#8B5CF6',
    hospital: '#EF4444',
    search: '#F59E0B'
  };

  const color = colors[type as keyof typeof colors] || '#6B7280';
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ${emoji}
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const LocationUpdater: React.FC<{ center: { lat: number; lng: number }, zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom || map.getZoom());
  }, [center, zoom, map]);

  return null;
};

export function InteractiveMap() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState(PUNJAB_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState({
    weather: true,
    crops: true,
    market: true,
    alerts: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('Punjab, India');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Add CSS to ensure map fills container
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .leaflet-container {
        height: 100% !important;
        width: 100% !important;
        border-radius: 0.5rem;
      }
      .leaflet-control-container {
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Get current location with Punjab fallback
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported, using Punjab fallback');
      setMapCenter(PUNJAB_CENTER);
      setMapZoom(DEFAULT_ZOOM);
      setSelectedLocation('Punjab, India (Fallback Location)');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        setMapCenter(location);
        setMapZoom(14);
        setSelectedLocation(`Your Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error getting location, falling back to Punjab:', error);
        setMapCenter(PUNJAB_CENTER);
        setMapZoom(DEFAULT_ZOOM);
        setSelectedLocation('Punjab, India (Location access denied - using fallback)');
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Search functionality using OpenStreetMap Nominatim API
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' Punjab India')}&limit=3&countrycodes=in`
      );
      const results = await response.json();
      
      if (results && results.length > 0) {
        const result = results[0];
        const location = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
        
        setMapCenter(location);
        setMapZoom(13);
        setSelectedLocation(result.display_name);
        
        // Clear previous search results and add new ones
        setSearchResults([{
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          name: result.display_name,
          type: 'search'
        }]);
      } else {
        // Fallback to Punjab if search fails
        setMapCenter(PUNJAB_CENTER);
        setMapZoom(DEFAULT_ZOOM);
        setSelectedLocation('Punjab, India (Search fallback)');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed, using Punjab fallback:', error);
      setMapCenter(PUNJAB_CENTER);
      setMapZoom(DEFAULT_ZOOM);
      setSelectedLocation('Punjab, India (Search error - using fallback)');
      setSearchResults([]);
    }
    setIsLoading(false);
  };

  const toggleLayer = (layer: keyof typeof visibleLayers) => {
    setVisibleLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  // Initialize with Punjab center on component mount
  useEffect(() => {
    setMapCenter(PUNJAB_CENTER);
    setMapZoom(DEFAULT_ZOOM);
    setSelectedLocation('Punjab, India');
    
    // Small delay to ensure proper map initialization
    const timer = setTimeout(() => {
      // Trigger a resize event to ensure map fills container
      window.dispatchEvent(new Event('resize'));
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const getAllMarkers = () => {
    const markers: MapMarker[] = [];

    // Add farm plots if crops layer is visible
    if (visibleLayers.crops) {
      mockData.farmPlots.forEach((plot) => {
        markers.push({
          ...plot.coordinates,
          name: plot.name,
          type: 'crop',
          data: plot
        });
      });
    }

    // Add markets if market layer is visible
    if (visibleLayers.market) {
      mockData.nearbyMarkets.forEach((market) => {
        markers.push({
          ...market.coordinates,
          name: market.name,
          type: 'market',
          data: market
        });
      });
      
      // Add Punjab locations
      punjabLocations.forEach((location) => {
        if (location.type === 'market') {
          markers.push({
            lat: location.lat,
            lng: location.lng,
            name: location.name,
            type: 'market',
            data: {
              prices: {},
              volume: 'N/A',
              lastUpdate: 'N/A',
              description: location.description,
              phone: location.phone
            } as MarketMarkerData
          });
        } else if (location.type === 'hospital') {
          markers.push({
            lat: location.lat,
            lng: location.lng,
            name: location.name,
            type: 'hospital',
            data: {
              services: ['General Services'],
              description: location.description,
              phone: location.phone
            } as HospitalMarkerData
          });
        }
      });
    }

    // Add disease alerts if alerts layer is visible
    if (visibleLayers.alerts) {
      mockData.diseaseOutbreaks.forEach((outbreak) => {
        markers.push({
          ...outbreak.coordinates,
          name: outbreak.name,
          type: 'disease',
          data: outbreak
        });
      });
    }

    // Add search results
    searchResults.forEach((result) => {
      markers.push({
        lat: result.lat,
        lng: result.lng,
        name: result.name,
        type: 'search',
        data: {
          type: result.type,
          description: result.description,
          phone: result.phone
        } as SearchMarkerData
      });
    });

    // Add user location if available
    if (userLocation) {
      markers.push({
        ...userLocation,
        name: "Your Location",
        type: 'current',
        data: {
          description: "Your current location"
        } as CurrentLocationData
      });
    }

    return markers;
  };

  const getMarkerIcon = (type: string) => {
    const icons = {
      crop: '🌾',
      market: '🛒',
      disease: '⚠️',
      current: '📍',
      search: '🔍',
      shelter: '🏠',
      hospital: '🏥'
    };
    return icons[type as keyof typeof icons] || '📍';
  };

  const renderMarkerPopup = (marker: MapMarker) => {
    const { type, data, name } = marker;
    
    switch (type) {
      case 'crop': {
        const cropData = data as CropMarkerData;
        const healthClasses = cropData.health > 80 
          ? 'text-green-600 font-bold' 
          : cropData.health > 60 
            ? 'text-amber-600 font-bold' 
            : 'text-red-600 font-bold';
        return (
          <div className="p-3 min-w-[200px]">
            <h3 className="font-semibold text-sm mb-2">{name}</h3>
            <div className="space-y-1 text-xs">
              <div><strong>Crop:</strong> {cropData.crop}</div>
              <div><strong>Area:</strong> {cropData.area}</div>
              <div><strong>Health:</strong> 
                <span className={healthClasses}> {cropData.health}%</span>
              </div>
              {cropData.issues?.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 rounded">
                  <strong className="text-yellow-800">Issues:</strong><br/>
                  <span className="text-yellow-700">{cropData.issues.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        );
      }
        
      case 'market': {
        const marketData = data as MarketMarkerData;
        return (
          <div className="p-3 min-w-[200px]">
            <h3 className="font-semibold text-sm mb-2">{name}</h3>
            <div className="space-y-1 text-xs">
              <div><strong>Volume:</strong> {marketData.volume}</div>
              <div><strong>Last Update:</strong> {marketData.lastUpdate}</div>
              {marketData.prices && (
                <>
                  <div><strong>Current Prices:</strong></div>
                  {Object.entries(marketData.prices).map(([crop, price]: [string, number]) => 
                    <div key={crop} className="ml-2">• {crop}: ₹{price}</div>
                  )}
                </>
              )}
              {marketData.phone && (
                <div><strong>Phone:</strong> 
                  <a href={`tel:${marketData.phone}`} className="text-blue-600 ml-1">{marketData.phone}</a>
                </div>
              )}
            </div>
          </div>
        );
      }
        
      case 'disease': {
        const diseaseData = data as DiseaseMarkerData;
        const severityClasses = diseaseData.severity === 'high' 
          ? 'text-red-600 font-bold capitalize' 
          : 'text-amber-600 font-bold capitalize';
        return (
          <div className="p-3 min-w-[200px]">
            <h3 className="font-semibold text-sm mb-2 text-red-600">⚠️ {name}</h3>
            <div className="space-y-1 text-xs">
              <div><strong>Crop:</strong> {diseaseData.crop}</div>
              <div><strong>Severity:</strong> 
                <span className={severityClasses}> {diseaseData.severity}</span>
              </div>
              <div><strong>Affected Farms:</strong> {diseaseData.affectedFarms}</div>
              <div><strong>Radius:</strong> {diseaseData.radius}km</div>
            </div>
          </div>
        );
      }
        
      case 'hospital': {
        const hospitalData = data as HospitalMarkerData;
        return (
          <div className="p-3 min-w-[200px]">
            <h3 className="font-semibold text-sm mb-2">{name}</h3>
            <div className="space-y-1 text-xs">
              <div><strong>Services:</strong> {hospitalData.services.join(', ')}</div>
              {hospitalData.phone && (
                <div><strong>Phone:</strong> 
                  <a href={`tel:${hospitalData.phone}`} className="text-blue-600 ml-1">{hospitalData.phone}</a>
                </div>
              )}
            </div>
          </div>
        );
      }
        
      case 'search': {
        const searchData = data as SearchMarkerData;
        return (
          <div className="p-3 min-w-[200px]">
            <h3 className="font-semibold text-sm mb-2">{name}</h3>
            <div className="space-y-1 text-xs">
              <div><strong>Type:</strong> {searchData.type}</div>
              {searchData.description && <div><strong>Info:</strong> {searchData.description}</div>}
              {searchData.phone && (
                <div><strong>Phone:</strong> 
                  <a href={`tel:${searchData.phone}`} className="text-blue-600 ml-1">{searchData.phone}</a>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'current': {
        const currentData = data as CurrentLocationData;
        return (
          <div className="p-3 min-w-[200px]">
            <h3 className="font-semibold text-sm mb-2 text-blue-600">📍 {name}</h3>
            <div className="space-y-1 text-xs">
              {currentData.description && <div>{currentData.description}</div>}
            </div>
          </div>
        );
      }
        
      default:
        return (
          <div className="p-2">
            <h3 className="font-semibold text-sm">{name}</h3>
            {data.description && <p className="text-xs text-gray-600 mt-1">{data.description}</p>}
          </div>
        );
    }
  };

  const MapContent = () => (
    <div className="relative w-full h-96 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg overflow-hidden">
      <MapContainer
        key={`${mapCenter.lat}-${mapCenter.lng}-${mapZoom}`} // Force remount when location changes
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%', minHeight: '384px' }}
        scrollWheelZoom={true}
        zoomControl={true}
        attributionControl={true}
        maxZoom={18}
        minZoom={6}
        className="rounded-lg z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
          crossOrigin="anonymous"
        />
        
        {/* Render all markers */}
        {getAllMarkers().map((marker, index) => (
          <Marker
            key={`${marker.type}-${index}-${marker.lat}-${marker.lng}`}
            position={[marker.lat, marker.lng]}
            icon={createCustomIcon(marker.type, getMarkerIcon(marker.type))}
          >
            <Popup>
              {renderMarkerPopup(marker)}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Getting your location...</p>
          </div>
        </div>
      )}
      
      {/* Search Bar */}
      <div className="absolute top-2 left-2 flex gap-2 z-10">
        <div className="flex items-center bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg border-primary/20">
          <Input
            placeholder="Search in Punjab..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="border-0 bg-transparent text-xs w-40 focus:ring-2 focus:ring-primary/20"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSearch}
            className="h-8 px-2 hover:bg-primary/10"
          >
            <Search className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
        <Button
          size="sm"
          variant="ghost"
          onClick={getCurrentLocation}
          disabled={isLoading}
          className="bg-background/95 backdrop-blur-sm shadow-lg border border-primary/20 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
          title="Get Current Location (with Punjab fallback)"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          ) : (
            <Target className="h-4 w-4" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsFullscreen(true)}
          className="bg-background/95 backdrop-blur-sm shadow-lg border border-primary/20 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Layer Controls */}
      <div className="absolute bottom-2 right-2 bg-background/95 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-primary/20 z-10">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={visibleLayers.crops ? 'default' : 'ghost'}
            onClick={() => toggleLayer('crops')}
            className="text-xs px-2 hover:scale-105 transition-all duration-200"
            title="Crops Layer"
          >
            🌾
          </Button>
          <Button
            size="sm"
            variant={visibleLayers.market ? 'default' : 'ghost'}
            onClick={() => toggleLayer('market')}
            className="text-xs px-2 hover:scale-105 transition-all duration-200"
            title="Markets Layer"
          >
            🛒
          </Button>
          <Button
            size="sm"
            variant={visibleLayers.alerts ? 'default' : 'ghost'}
            onClick={() => toggleLayer('alerts')}
            className="text-xs px-2 hover:scale-105 transition-all duration-200"
            title="Alerts Layer"
          >
            ⚠️
          </Button>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="absolute bottom-2 left-2 bg-background/95 backdrop-blur-sm rounded-lg p-2 shadow-lg border border-primary/20 z-10">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <div>
            <div className="font-medium text-primary">✅ Map Ready</div>
            {selectedLocation && (
              <div className="text-muted-foreground text-xs mt-1 max-w-40 truncate" title={selectedLocation}>
                📍 {selectedLocation}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="px-4 py-6">
        <Card className="shadow-elegant bg-gradient-to-br from-card via-card to-card/80 border-primary/10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-green-500/5 pointer-events-none" />
          <CardHeader className="pb-3 relative">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent">
                  Interactive Farm Map (Punjab)
                </span>
                <p className="text-xs text-muted-foreground font-normal mt-1">
                  Monitor your fields, markets, and alerts with OpenStreetMap
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <MapContent />
            
            {/* Enhanced Map Legend */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge 
                variant="outline" 
                className={`text-xs hover:scale-105 transition-transform cursor-pointer ${
                  visibleLayers.crops 
                    ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800' 
                    : 'opacity-50'
                }`}
                onClick={() => toggleLayer('crops')}
              >
                🌾 Farm Plots ({mockData.farmPlots.length})
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs hover:scale-105 transition-transform cursor-pointer ${
                  visibleLayers.market 
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800' 
                    : 'opacity-50'
                }`}
                onClick={() => toggleLayer('market')}
              >
                🛒 Markets ({mockData.nearbyMarkets.length + punjabLocations.length})
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs hover:scale-105 transition-transform cursor-pointer ${
                  visibleLayers.alerts 
                    ? 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800' 
                    : 'opacity-50'
                }`}
                onClick={() => toggleLayer('alerts')}
              >
                ⚠️ Disease Alerts ({mockData.diseaseOutbreaks.length})
              </Badge>
            </div>

            {/* Map Instructions */}
            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              <p>• Click markers to see detailed farm, market, and alert information</p>
              <p>• Use search to find specific places in Punjab</p>
              <p>• "Get Location" will use your location or fallback to Punjab</p>
              <p>• Toggle layer buttons to show/hide different data types</p>
              <p>• Map defaults to Punjab region for reliable farming data</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fullscreen Map Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-6xl h-[85vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Interactive Farm Map - Fullscreen View
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(false)} className="ml-auto">
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Fullscreen view of the interactive farm map showing crop locations, market data, and agricultural information.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 p-4 pt-0">
            <div className="w-full h-full">
              <MapContent />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// export default InteractiveMap; // Temporarily removed from site