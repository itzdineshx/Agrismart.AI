import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Product } from '@/types/marketplace';
import { useCart } from '@/contexts/CartContext';
import { addToCart } from '@/lib/marketplace';
import {
  Star,
  ShoppingCart,
  Shield,
  Lock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Clock,
  MinusCircle,
  PlusCircle,
  Eye,
  CreditCard,
  Wallet,
  Zap,
  Globe,
  BarChart3,
  Award,
  ThumbsUp
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProductDetailModalProps {
  product: Product;
  children: React.ReactNode;
}

export function ProductDetailModal({ product, children }: ProductDetailModalProps) {
  const { setCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  const handleAddToCart = () => {
    const updatedCart = addToCart(product, quantity);
    setCart(updatedCart);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
    setQuantity(1);
    setIsOpen(false);
  };

  const paymentFeatures = product.paymentFeatures || {
    razorpayEnabled: true,
    escrowProtection: true,
    blockchainRecording: true,
    fraudDetection: true,
    autoRelease: true,
    disputeResolution: true
  };

  const blockchainInfo = product.blockchainInfo || {
    transactionCount: 1247,
    lastTransactionHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12',
    network: 'Ethereum Mainnet',
    verificationStatus: 'verified' as const
  };

  const securityFeatures = product.securityFeatures || {
    buyerProtection: true,
    sellerVerification: true,
    paymentGuarantee: true,
    transparentPricing: true
  };

  const analytics = product.analytics || {
    totalSales: 2847,
    successRate: 98.5,
    averageRating: 4.8,
    customerSatisfaction: 96.2
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{product.name}</DialogTitle>
          <DialogDescription>
            View detailed information about this product including pricing, features, and secure payment options.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Image and Basic Info */}
          <div className="space-y-4">
            <div className="aspect-square relative rounded-lg overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="object-cover w-full h-full"
              />
              {product.stock <= 0 && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Badge variant="destructive">Out of Stock</Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">₹{product.price}</span>
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-primary text-primary" />
                  <span className="font-medium">{product.rating || 4.5}</span>
                </div>
              </div>
              <p className="text-muted-foreground">{product.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Seller: {product.seller}</span>
                <span>Unit: {product.unit}</span>
                <span>Stock: {product.stock}</span>
              </div>
            </div>
          </div>

          {/* Payment & Blockchain Features */}
          <div className="space-y-6">
            {/* Payment Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment & Security Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Razorpay Integration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Escrow Protection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Blockchain Recording</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">Fraud Detection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Auto Release</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm">Dispute Resolution</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Blockchain Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Blockchain Transparency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Network:</span>
                  <Badge variant="outline">{blockchainInfo.network}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Transactions:</span>
                  <span className="font-medium">{blockchainInfo.transactionCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status:</span>
                  <Badge variant={blockchainInfo.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                    {blockchainInfo.verificationStatus}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-sm">Last Transaction:</span>
                  <div className="font-mono text-xs bg-muted p-2 rounded break-all">
                    {blockchainInfo.lastTransactionHash}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Product Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{analytics.totalSales.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Sales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{analytics.successRate}%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{analytics.averageRating}</div>
                    <div className="text-sm text-muted-foreground">Avg Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{analytics.customerSatisfaction}%</div>
                    <div className="text-sm text-muted-foreground">Satisfaction</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Security & Trust
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {securityFeatures.buyerProtection && (
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Buyer Protection Guarantee</span>
                    </div>
                  )}
                  {securityFeatures.sellerVerification && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Verified Seller</span>
                    </div>
                  )}
                  {securityFeatures.paymentGuarantee && (
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Payment Guarantee</span>
                    </div>
                  )}
                  {securityFeatures.transparentPricing && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Transparent Pricing</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quantity Selector and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-medium">Quantity:</span>
                <div className="flex items-center gap-2 bg-accent/50 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart - ₹{(product.price * quantity).toLocaleString()}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>🔒 Secure payment with escrow protection</p>
                <p>⛓️ All transactions recorded on blockchain</p>
                <p>🛡️ Buyer protection guarantee</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}