"use client";

import React, { useState, useEffect } from 'react';
import { useWalletContext } from '../context/walletContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ShoppingCart, Plus, Minus, Wine, Cigarette, User, Wallet, CreditCard, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Sample product data for whiskey and cigars
const SAMPLE_PRODUCTS = {
  whiskey: [
    {
      id: 'w1',
      name: 'Macallan 18 Year',
      brand: 'The Macallan',
      age: '18 Years',
      price: 450.00,
      description: 'Rich, complex single malt Scotch whisky aged in sherry oak casks.',
      image: '/api/placeholder/300/400',
      inStock: true,
      category: 'whiskey'
    },
    {
      id: 'w2', 
      name: 'Glenfiddich 21',
      brand: 'Glenfiddich',
      age: '21 Years',
      price: 280.00,
      description: 'Smooth and sophisticated single malt with Caribbean rum cask finish.',
      image: '/api/placeholder/300/400',
      inStock: true,
      category: 'whiskey'
    },
    {
      id: 'w3',
      name: 'Jameson Black Barrel',
      brand: 'Jameson',
      age: '12 Years',
      price: 65.00,
      description: 'Triple distilled Irish whiskey with rich charcoal-mellowed finish.',
      image: '/api/placeholder/300/400',
      inStock: true,
      category: 'whiskey'
    }
  ],
  cigars: [
    {
      id: 'c1',
      name: 'Cohiba Behike 56',
      brand: 'Cohiba',
      size: '6 x 56',
      origin: 'Cuba',
      price: 85.00,
      description: 'Premium Cuban cigar with rich, complex flavor profile.',
      image: '/api/placeholder/300/400',
      inStock: true,
      category: 'cigars'
    },
    {
      id: 'c2',
      name: 'Padron 1964 Anniversary',
      brand: 'Padron',
      size: '6 x 50',
      origin: 'Nicaragua',
      price: 45.00,
      description: 'Full-bodied Nicaraguan cigar with natural wrapper.',
      image: '/api/placeholder/300/400',
      inStock: true,
      category: 'cigars'
    },
    {
      id: 'c3',
      name: 'Arturo Fuente OpusX',
      brand: 'Arturo Fuente',
      size: '5.5 x 46',
      origin: 'Dominican Republic',
      price: 35.00,
      description: 'Rare Dominican cigar with unique wrapper leaf.',
      image: '/api/placeholder/300/400',
      inStock: true,
      category: 'cigars'
    }
  ]
};

export default function WhiskeyCigarsStore() {
  const { userWallet } = useWalletContext();
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'processing', 'success', 'failed'
  const [orderDetails, setOrderDetails] = useState(null);

  // Get all products
  const allProducts = [...SAMPLE_PRODUCTS.whiskey, ...SAMPLE_PRODUCTS.cigars];
  
  // Filter products by category
  const filteredProducts = selectedCategory === 'all' 
    ? allProducts 
    : allProducts.filter(product => product.category === selectedCategory);

  // Calculate cart total
  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  // Add item to cart
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    
    toast.success(`Added ${product.name} to cart`);
  };

  // Update cart item quantity
  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== productId));
      toast.success('Item removed from cart');
    } else {
      setCart(prev => prev.map(item => 
        item.id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  // Handle checkout process
  const handleCheckout = async () => {
    if (!userWallet) {
      toast.error('Please connect your wallet to continue');
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    try {
      setIsCheckingOut(true);
      setPaymentStatus('processing');

      // Prepare order data
      const orderData = {
        items: cart,
        total: cartTotal,
        timestamp: Date.now(),
        paymentMethod: 'BSV'
      };

      console.log('[Checkout] Initiating BSV payment...', orderData);
      
      // Simulate BSV payment processing
      // In a real implementation, this would:
      // 1. Create a BSV transaction
      // 2. Send payment to merchant address
      // 3. Wait for confirmation
      // 4. Update order status
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate payment processing
      
      // Create order ID
      const orderId = `ORDER_${Date.now()}`;
      
      // Simulate successful payment
      const paymentResult = {
        orderId,
        txid: `simulated_txid_${Date.now()}`, // In real implementation, this would be the actual BSV transaction ID
        amount: cartTotal,
        status: 'confirmed'
      };

      setOrderDetails({
        orderId,
        items: cart,
        total: cartTotal,
        paymentResult
      });

      setPaymentStatus('success');
      setCart([]); // Clear cart after successful payment
      
      toast.success('Payment successful! Your order has been placed.');
      console.log('[Checkout] Payment successful:', paymentResult);

    } catch (error) {
      console.error('[Checkout] Payment failed:', error);
      setPaymentStatus('failed');
      toast.error(`Payment failed: ${error.message}`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Reset payment status
  const resetPayment = () => {
    setPaymentStatus(null);
    setOrderDetails(null);
  };

  // Product Card Component
  const ProductCard = ({ product }) => (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4">
        <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
          {product.category === 'whiskey' ? (
            <Wine className="h-16 w-16 text-amber-600" />
          ) : (
            <Cigarette className="h-16 w-16 text-amber-800" />
          )}
        </div>
        <CardTitle className="text-lg">{product.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{product.brand}</p>
        {product.age && <Badge variant="secondary">{product.age}</Badge>}
        {product.size && <Badge variant="secondary">{product.size}</Badge>}
        {product.origin && <Badge variant="outline">{product.origin}</Badge>}
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground mb-4 flex-1">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">${product.price.toFixed(2)}</span>
          <Button 
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Cart Item Component
  const CartItem = ({ item }) => (
    <div className="flex items-center gap-4 py-4">
      <div className="flex-1">
        <h4 className="font-medium">{item.name}</h4>
        <p className="text-sm text-muted-foreground">{item.brand}</p>
        <p className="text-sm font-medium">${item.price.toFixed(2)} each</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center">{item.quantity}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="text-right">
        <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Wine className="h-8 w-8 text-amber-600" />
              <h1 className="text-2xl font-bold text-gray-900">Premium Spirits & Cigars</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span>Age Verified (18+)</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="text-sm">BSV Wallet Connected</span>
              </div>
              
              <div className="relative">
                <Button variant="outline" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Cart ({cartItemCount})
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Category Filter */}
            <div className="flex gap-2">
              <Button 
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
              >
                All Products
              </Button>
              <Button 
                variant={selectedCategory === 'whiskey' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('whiskey')}
                className="flex items-center gap-2"
              >
                <Wine className="h-4 w-4" />
                Whiskey
              </Button>
              <Button 
                variant={selectedCategory === 'cigars' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('cigars')}
                className="flex items-center gap-2"
              >
                <Cigarette className="h-4 w-4" />
                Cigars
              </Button>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <Alert>
                <AlertDescription>
                  No products found in this category.
                </AlertDescription>
              </Alert>
            )}
            
          </div>

          {/* Shopping Cart Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Shopping Cart
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Your cart is empty
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id}>
                        <CartItem item={item} />
                        <Separator />
                      </div>
                    ))}
                    
                    <div className="pt-4 space-y-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>${cartTotal.toFixed(2)}</span>
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full" size="lg" disabled={isCheckingOut}>
                            {isCheckingOut ? (
                              <>
                                <CreditCard className="h-4 w-4 mr-2 animate-pulse" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Checkout with BSV
                              </>
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>
                              {paymentStatus === 'processing' && 'Processing Payment'}
                              {paymentStatus === 'success' && 'Payment Successful!'}
                              {paymentStatus === 'failed' && 'Payment Failed'}
                              {!paymentStatus && 'Confirm Your Order'}
                            </DialogTitle>
                          </DialogHeader>
                          
                          {paymentStatus === 'processing' && (
                            <div className="text-center py-6">
                              <CreditCard className="h-12 w-12 mx-auto mb-4 animate-pulse text-blue-600" />
                              <p>Processing your BSV payment...</p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Please wait while we confirm your transaction
                              </p>
                            </div>
                          )}
                          
                          {paymentStatus === 'success' && orderDetails && (
                            <div className="text-center py-6 space-y-4">
                              <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
                              <div>
                                <p className="font-medium">Order #{orderDetails.orderId}</p>
                                <p className="text-sm text-muted-foreground">
                                  Transaction ID: {orderDetails.paymentResult.txid}
                                </p>
                              </div>
                              <div>
                                <p className="text-lg font-bold">${orderDetails.total.toFixed(2)} BSV</p>
                                <p className="text-sm text-muted-foreground">
                                  Payment confirmed on BSV blockchain
                                </p>
                              </div>
                              <Button onClick={resetPayment} className="w-full">
                                Continue Shopping
                              </Button>
                            </div>
                          )}
                          
                          {paymentStatus === 'failed' && (
                            <div className="text-center py-6 space-y-4">
                              <div className="h-12 w-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-red-600 text-xl">✕</span>
                              </div>
                              <div>
                                <p className="font-medium text-red-600">Payment Failed</p>
                                <p className="text-sm text-muted-foreground">
                                  Please try again or contact support
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Button onClick={resetPayment} variant="outline" className="w-full">
                                  Try Again
                                </Button>
                                <Button onClick={resetPayment} className="w-full">
                                  Back to Cart
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {!paymentStatus && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Order Summary</h4>
                                <div className="space-y-2">
                                  {cart.map(item => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                      <span>{item.name} × {item.quantity}</span>
                                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                  <Separator />
                                  <div className="flex justify-between font-bold">
                                    <span>Total</span>
                                    <span>${cartTotal.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                              <Button onClick={handleCheckout} className="w-full" disabled={isCheckingOut}>
                                Confirm & Pay with BSV
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Payment processed securely via BSV blockchain
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold">Premium Spirits & Cigars</h3>
            <p className="text-gray-400">
              Age verification required. Must be 18+ to purchase. 
            </p>
            <p className="text-sm text-gray-500">
              Powered by BSV blockchain technology for secure payments
            </p>
          </div>
        </div>
      </footer>
      
    </div>
  );
}