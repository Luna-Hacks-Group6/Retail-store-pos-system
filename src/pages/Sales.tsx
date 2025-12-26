import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Search, Trash2, ShoppingCart, Plus, Minus, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Receipt } from '@/components/Receipt';
import { Badge } from '@/components/ui/badge';
import { HybridPaymentPanel } from '@/components/HybridPaymentPanel';
import { useHybridPayment } from '@/hooks/useHybridPayment';
import { useLoyaltyPoints } from '@/hooks/useLoyaltyPoints';
import { LoyaltyRedemption } from '@/components/LoyaltyRedemption';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  retail_price: number;
  tax_rate: number;
  stock_on_hand: number;
  category?: string;
}

interface CartItem extends Product {
  quantity: number;
  lineTotal: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

export default function Sales() {
  const { user } = useAuth();
  const { awardLoyaltyPoints, redeemLoyaltyPoints } = useLoyaltyPoints();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('walk-in');
  const [loading, setLoading] = useState(false);
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);
  const [currentSaleId, setCurrentSaleId] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // Loyalty redemption state
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);

  const getSubtotalWithDiscount = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
    return Math.max(0, subtotal - loyaltyDiscount);
  };

  const getTotalAmount = () => {
    const subtotalWithDiscount = getSubtotalWithDiscount();
    const taxAmount = cart.reduce((sum, item) => sum + (item.lineTotal * item.tax_rate) / 100, 0);
    return subtotalWithDiscount + taxAmount;
  };
  
  const payment = useHybridPayment(currentSaleId, getTotalAmount());

  // Reset loyalty discount when customer changes
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomer(customerId);
    setLoyaltyDiscount(0);
    setLoyaltyPointsToRedeem(0);
  };

  const handleLoyaltyDiscount = (discount: number, pointsUsed: number) => {
    setLoyaltyDiscount(discount);
    setLoyaltyPointsToRedeem(pointsUsed);
  };

  useEffect(() => {
    loadProducts();
    loadCustomers();
    barcodeInputRef.current?.focus();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('name');
    setProducts(data || []);
  };

  const loadCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone')
      .order('name');
    setCustomers(data || []);
  };

  const handleBarcodeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const barcode = e.currentTarget.value.trim();
      if (barcode) {
        handleBarcodeScanned(barcode);
        e.currentTarget.value = '';
      }
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(
      (p) =>
        p.barcode === barcode ||
        p.sku.toLowerCase() === barcode.toLowerCase()
    );

    if (product) {
      addToCart(product);
      toast.success(`Added ${product.name} to cart`);
    } else {
      toast.error('Product not found');
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm))
  );

  const addToCart = (product: Product) => {
    if (product.stock_on_hand <= 0) {
      toast.error('Product out of stock');
      return;
    }

    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock_on_hand) {
        toast.error('Cannot exceed available stock');
        return;
      }
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      const lineTotal = product.retail_price;
      setCart([...cart, { ...product, quantity: 1, lineTotal }]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    setCart(
      cart.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: newQuantity,
              lineTotal: item.retail_price * newQuantity,
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
    const subtotalWithDiscount = Math.max(0, subtotal - loyaltyDiscount);
    const taxAmount = cart.reduce(
      (sum, item) => sum + (item.lineTotal * item.tax_rate) / 100,
      0
    );
    return {
      subtotal: subtotal.toFixed(2),
      subtotalWithDiscount: subtotalWithDiscount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: (subtotalWithDiscount + taxAmount).toFixed(2),
    };
  };

  // Create a pending sale when items are added to cart
  const createPendingSale = async (paymentMethod: 'cash' | 'mpesa' | 'hybrid' = 'cash') => {
    if (!user?.id || currentSaleId) return null;
    
    const currentTotals = calculateTotals();
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        cashier_id: user.id,
        customer_id: selectedCustomer === 'walk-in' ? null : selectedCustomer,
        subtotal: parseFloat(currentTotals.subtotal),
        tax_amount: parseFloat(currentTotals.taxAmount),
        total_amount: parseFloat(currentTotals.total),
        payment_method: paymentMethod,
        status: 'pending',
        payment_status: 'pending',
        cash_amount: 0,
        mpesa_amount: 0,
      })
      .select()
      .single();

    if (saleError) {
      console.error('Failed to create pending sale:', saleError);
      toast.error('Failed to create sale: ' + saleError.message);
      return null;
    }
    
    setCurrentSaleId(saleData.id);
    return saleData.id;
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!payment.isFullyPaid) {
      toast.error('Payment not complete');
      return;
    }

    setLoading(true);
    try {
      let saleId = currentSaleId;
      
      // Create sale if doesn't exist
      if (!saleId) {
        saleId = await createPendingSale();
        if (!saleId) throw new Error('Failed to create sale');
      }

      // Insert sale items
      for (const item of cart) {
        const { error: itemError } = await supabase.from('sale_items').insert({
          sale_id: saleId,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.retail_price,
          tax_rate: item.tax_rate,
          line_total: parseFloat(item.lineTotal.toFixed(2)),
        });

        if (itemError) throw itemError;

        // Update stock
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock_on_hand: item.stock_on_hand - item.quantity })
          .eq('id', item.id);

        if (stockError) throw stockError;
      }

      // Update sale with final payment details
      const paymentMethod = payment.cashAmount > 0 && payment.mpesaAmount > 0 
        ? 'hybrid' 
        : payment.cashAmount > 0 ? 'cash' : 'mpesa';

      // Redeem loyalty points if applicable
      if (loyaltyPointsToRedeem > 0 && selectedCustomer !== 'walk-in') {
        await redeemLoyaltyPoints(selectedCustomer, loyaltyPointsToRedeem);
      }

      // Award loyalty points and get points earned
      let pointsEarned = 0;
      if (selectedCustomer && selectedCustomer !== 'walk-in') {
        pointsEarned = await awardLoyaltyPoints(selectedCustomer, getTotalAmount());
        
        const { data: customerData } = await supabase
          .from('customers')
          .select('total_purchases, purchase_count')
          .eq('id', selectedCustomer)
          .single();

        if (customerData) {
          await supabase
            .from('customers')
            .update({
              total_purchases: Number(customerData.total_purchases) + getTotalAmount(),
              purchase_count: customerData.purchase_count + 1,
              is_frequent: customerData.purchase_count + 1 >= 5,
            })
            .eq('id', selectedCustomer);
        }
      }

      const { error: updateError } = await supabase
        .from('sales')
        .update({
          status: 'completed',
          payment_status: 'paid',
          payment_method: paymentMethod,
          cash_amount: payment.cashAmount,
          mpesa_amount: payment.mpesaAmount,
          change_amount: payment.changeAmount,
          loyalty_discount: loyaltyDiscount,
          loyalty_points_redeemed: loyaltyPointsToRedeem,
          loyalty_points_earned: pointsEarned,
        })
        .eq('id', saleId);

      if (updateError) throw updateError;

      toast.success('Sale completed successfully!');
      setCompletedSaleId(saleId);
      setCart([]);
      setSelectedCustomer('walk-in');
      setCurrentSaleId(null);
      setLoyaltyDiscount(0);
      setLoyaltyPointsToRedeem(0);
      payment.reset();
      loadProducts();
    } catch (error: any) {
      console.error('Error completing sale:', error);
      toast.error('Failed to complete sale: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMpesaPayment = async (phone: string, amount: number) => {
    let saleId = currentSaleId;
    
    // Create pending sale if doesn't exist - use mpesa as initial method
    if (!saleId && cart.length > 0) {
      saleId = await createPendingSale('mpesa');
      if (!saleId) {
        return false;
      }
    }
    
    return payment.initiateSTKPush(phone, amount);
  };

  const handleCashPayment = async (amount: number) => {
    let saleId = currentSaleId;
    
    // Create pending sale if doesn't exist - use cash as initial method
    if (!saleId && cart.length > 0) {
      saleId = await createPendingSale('cash');
      if (!saleId) {
        return false;
      }
    }
    
    payment.setCashAmount(amount);
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Point of Sale
            </h1>
            <p className="text-muted-foreground mt-1">Fast, modern checkout experience</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">{cart.length} items</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_450px]">
          {/* Product Section */}
          <div className="space-y-4">
            {/* Search Bar */}
            <Card className="border-2 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Product Catalog</CardTitle>
                </div>
                <div className="space-y-3 pt-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        ref={barcodeInputRef}
                        placeholder="🔍 Scan barcode or enter SKU..."
                        onKeyDown={handleBarcodeInput}
                        className="pl-10 h-12 text-lg border-2 focus:border-primary transition-all"
                      />
                    </div>
                    <BarcodeScanner onScan={handleBarcodeScanned} />
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, SKU, or barcode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="group relative p-4 border-2 rounded-xl hover:border-primary hover:shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 bg-card"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-sm line-clamp-2 flex-1 group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                          {product.stock_on_hand <= 5 && (
                            <Badge variant={product.stock_on_hand === 0 ? 'destructive' : 'secondary'} className="text-xs">
                              {product.stock_on_hand === 0 ? 'Out' : 'Low'}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            SKU: {product.sku}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Stock: <span className={product.stock_on_hand <= 5 ? 'text-destructive font-semibold' : 'text-accent font-semibold'}>{product.stock_on_hand}</span>
                          </p>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xl font-bold text-primary">
                            KSh {product.retail_price.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary rounded-xl pointer-events-none transition-all duration-300" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cart Section */}
          <div className="space-y-4">
            <Card className="border-2 shadow-xl sticky top-4">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b-2">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-primary rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-primary-foreground" />
                  </div>
                  Shopping Cart
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">Cart is empty</p>
                    <p className="text-sm text-muted-foreground mt-1">Scan or select products to start</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {cart.map((item) => (
                        <div key={item.id} className="p-3 border-2 rounded-lg bg-card hover:border-primary/50 transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                KSh {item.retail_price.toFixed(2)} each
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.id)}
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                className="h-8 w-8"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-12 text-center font-semibold">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(item.id, Math.min(item.stock_on_hand, item.quantity + 1))}
                                className="h-8 w-8"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="font-bold text-primary">
                              KSh {item.lineTotal.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 pt-4 border-t-2">
                      <div>
                        <Label className="text-xs font-semibold text-muted-foreground">CUSTOMER</Label>
                        <Select value={selectedCustomer} onValueChange={handleCustomerChange}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Walk-in customer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="walk-in">Walk-in customer</SelectItem>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} - {customer.phone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Loyalty Redemption - only show for registered customers */}
                      {selectedCustomer !== 'walk-in' && cart.length > 0 && (
                        <LoyaltyRedemption
                          customerId={selectedCustomer}
                          totalAmount={cart.reduce((sum, item) => sum + item.lineTotal, 0)}
                          onApplyDiscount={handleLoyaltyDiscount}
                          appliedDiscount={loyaltyDiscount}
                          appliedPoints={loyaltyPointsToRedeem}
                        />
                      )}

                      {/* Hybrid Payment Panel */}
                      <HybridPaymentPanel
                        totalAmount={getTotalAmount()}
                        cashAmount={payment.cashAmount}
                        mpesaAmount={payment.mpesaAmount}
                        remainingAmount={payment.remainingAmount}
                        changeAmount={payment.changeAmount}
                        status={payment.status}
                        mpesaPending={payment.mpesaPending}
                        onCashAmountChange={handleCashPayment}
                        onMpesaPayment={handleMpesaPayment}
                        onCompleteSale={completeSale}
                        isFullyPaid={payment.isFullyPaid}
                        disabled={loading || cart.length === 0}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {completedSaleId && (
        <Receipt
          saleId={completedSaleId}
          onClose={() => setCompletedSaleId(null)}
        />
      )}
    </div>
  );
}