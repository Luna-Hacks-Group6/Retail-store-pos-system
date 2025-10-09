import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Search, Trash2, ShoppingCart, User } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Receipt } from '@/components/Receipt';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  retail_price: number;
  tax_rate: number;
  stock_on_hand: number;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('walk-in');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
    loadCustomers();
    
    // Focus barcode input on mount for keyboard wedge scanners
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
    const taxAmount = cart.reduce(
      (sum, item) => sum + (item.lineTotal * item.tax_rate) / 100,
      0
    );
    return {
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: (subtotal + taxAmount).toFixed(2),
    };
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (paymentMethod === 'mpesa') {
      if (!mpesaPhone) {
        toast.error('Please enter MPESA phone number');
        return;
      }
      if (!/^254[0-9]{9}$/.test(mpesaPhone)) {
        toast.error('Invalid phone number. Use format: 254XXXXXXXXX');
        return;
      }
    }

    setLoading(true);
    try {
      const totals = calculateTotals();

      // Create sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          cashier_id: user?.id!,
          customer_id: selectedCustomer === 'walk-in' ? null : selectedCustomer,
          subtotal: parseFloat(totals.subtotal),
          tax_amount: parseFloat(totals.taxAmount),
          total_amount: parseFloat(totals.total),
          payment_method: paymentMethod,
          status: paymentMethod === 'mpesa' ? 'pending' : 'completed',
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items and update stock
      for (const item of cart) {
        const { error: itemError } = await supabase.from('sale_items').insert({
          sale_id: saleData.id,
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

      // Handle MPESA payment
      if (paymentMethod === 'mpesa') {
        const { error: mpesaError } = await supabase
          .from('mpesa_transactions')
          .insert({
            sale_id: saleData.id,
            transaction_code: `TMP${Date.now()}`,
            phone_number: mpesaPhone,
            amount: parseFloat(totals.total),
            status: 'pending',
          });

        if (mpesaError) throw mpesaError;

        toast.success('Sale pending MPESA confirmation');
        toast.info(`Please pay KSh ${totals.total} to the till/paybill number`);
      } else {
        toast.success('Sale completed successfully!');
      }

      // Update customer purchase stats if customer selected
      if (selectedCustomer && selectedCustomer !== 'walk-in') {
        const { data: customerData } = await supabase
          .from('customers')
          .select('total_purchases, purchase_count')
          .eq('id', selectedCustomer)
          .single();

        if (customerData) {
          await supabase
            .from('customers')
            .update({
              total_purchases: Number(customerData.total_purchases) + parseFloat(totals.total),
              purchase_count: customerData.purchase_count + 1,
              is_frequent: customerData.purchase_count + 1 >= 5,
            })
            .eq('id', selectedCustomer);
        }
      }

      setCompletedSaleId(saleData.id);
      setCart([]);
      setSelectedCustomer('walk-in');
      setMpesaPhone('');
      loadProducts();
    } catch (error: any) {
      console.error('Error completing sale:', error);
      toast.error('Failed to complete sale: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Sale</h1>
        <p className="text-muted-foreground">Create a new sales transaction</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Search</CardTitle>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={barcodeInputRef}
                    placeholder="Scan barcode or type SKU/name..."
                    onKeyDown={handleBarcodeInput}
                    className="pl-10"
                  />
                </div>
                <BarcodeScanner onScan={handleBarcodeScanned} />
              </div>
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => addToCart(product)}
                >
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.sku} • Stock: {product.stock_on_hand}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      KSh {product.retail_price.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Cart is empty. Scan or add products to start.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              KSh {item.retail_price.toFixed(2)} each
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max={item.stock_on_hand}
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.id, parseInt(e.target.value) || 1)
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          KSh {item.lineTotal.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <Label>Customer (Optional)</Label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger>
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

                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>KSh {totals.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VAT (16%):</span>
                    <span>KSh {totals.taxAmount}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>KSh {totals.total}</span>
                  </div>

                  <div className="space-y-3 pt-4">
                    <Label>Payment Method</Label>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(value) => setPaymentMethod(value as 'cash' | 'mpesa')}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash" className="cursor-pointer">Cash</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mpesa" id="mpesa" />
                        <Label htmlFor="mpesa" className="cursor-pointer">MPESA</Label>
                      </div>
                    </RadioGroup>

                    {paymentMethod === 'mpesa' && (
                      <div>
                        <Label htmlFor="mpesa_phone">MPESA Phone Number</Label>
                        <Input
                          id="mpesa_phone"
                          placeholder="254700000000"
                          value={mpesaPhone}
                          onChange={(e) => setMpesaPhone(e.target.value.replace(/\D/g, ''))}
                          pattern="254[0-9]{9}"
                          maxLength={12}
                          title="Enter phone number in format: 254700000000"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Format: 254XXXXXXXXX (12 digits starting with 254)
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={completeSale}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Complete Sale'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
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
