import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ShoppingBag, Clock, TrendingUp, Star, Package, Truck, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Import marketplace images
import marketplaceImg from "@/assets/marketplace.jpg";
import premiumTomatoes from "@/assets/premium-tomatoes.jpg";
import organicWheat from "@/assets/organic-wheat-seeds.jpg";

const NEARBY_MARKETS = [
  {
    name: 'Koyambedu Market',
    distance: '1.8 km',
    type: 'Wholesale Market',
    timing: '4:00 AM - 2:00 PM',
    rating: 4.7,
    image: marketplaceImg,
    specialties: ['Vegetables', 'Fruits', 'Grains']
  },
  {
    name: 'Poonamallee Weekly Market',
    distance: '2.5 km',
    type: 'Farmers Market',
    timing: '6:00 AM - 12:00 PM',
    rating: 4.5,
    image: premiumTomatoes,
    specialties: ['Organic Produce', 'Local Crafts']
  },
  {
    name: 'Anna Nagar Farmers Market',
    distance: '3.2 km',
    type: 'Fresh Produce',
    timing: '5:00 AM - 10:00 AM',
    rating: 4.4,
    image: organicWheat,
    specialties: ['Fresh Vegetables', 'Dairy']
  }
];

const TOP_PRODUCTS = [
  {
    name: "Premium Tomatoes",
    price: "₹45/kg",
    change: "+₹5",
    image: premiumTomatoes,
    seller: "Rajesh Farms",
    rating: 4.8
  },
  {
    name: "Organic Wheat Seeds",
    price: "₹120/kg",
    change: "+₹15",
    image: organicWheat,
    seller: "Green Valley Seeds",
    rating: 4.9
  }
];

export function MarketplacePreview() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground dark:text-foreground">🏪 Local Markets</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/marketplace')}
          className="text-primary hover:text-primary/80"
        >
          View All
        </Button>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Markets</p>
                <p className="text-2xl font-bold text-red-600">25</p>
              </div>
              <Store className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Distance</p>
                <p className="text-2xl font-bold text-green-600">3.2km</p>
              </div>
              <MapPin className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Products</p>
                <p className="text-2xl font-bold text-blue-600">150+</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Best Rating</p>
                <p className="text-2xl font-bold text-amber-600">4.8</p>
              </div>
              <Star className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Section */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-600" />
          Trending Products
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TOP_PRODUCTS.map((product, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/marketplace')}>
              <div className="flex">
                <div className="w-20 h-20 flex-shrink-0">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-3 flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-sm">{product.name}</h4>
                    <Badge variant="secondary" className="text-xs">⭐ {product.rating}</Badge>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{product.seller}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-green-600">{product.price}</span>
                    <span className="text-xs text-green-600">{product.change}</span>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Markets List with Images */}
      <div className="space-y-4">
        <h3 className="text-md font-semibold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          Nearby Markets
        </h3>
        {NEARBY_MARKETS.map((market, index) => (
          <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/marketplace')}>
            <div className="flex">
              <div className="w-24 h-24 flex-shrink-0">
                <img
                  src={market.image}
                  alt={market.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-4 flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{market.name}</h3>
                    <Badge variant="secondary" className="text-xs">⭐ {market.rating}</Badge>
                  </div>
                  <Truck className="h-4 w-4 text-gray-400" />
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {market.distance}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {market.timing}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {market.specialties.map((specialty, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}