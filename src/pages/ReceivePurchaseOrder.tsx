import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface POItem {
  id: string;
  product_id: string;
  quantity: number;
  received_quantity: number;
  unit_cost: number;
  products: { name: string; stock_on_hand: number } | null;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  total_amount: number;
  vendors: { name: string } | null;
}

export default function ReceivePurchaseOrder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<POItem[]>([]);

  useEffect(() => {
    if (role !== 'admin') {
      toast.error('Access denied');
      navigate('/purchase-orders');
      return;
    }
    loadPO();
  }, [id, role]);

  const loadPO = async () => {
    if (!id) return;

    const { data: poData } = await supabase
      .from('purchase_orders')
      .select('*, vendors(name)')
      .eq('id', id)
      .single();

    if (poData) {
      setPO(poData);

      const { data: itemsData } = await supabase
        .from('po_items')
        .select('*, products(name, stock_on_hand)')
        .eq('po_id', id);

      setItems(itemsData || []);
    }
  };

  const updateReceivedQuantity = (itemId: string, value: number) => {
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, received_quantity: Math.min(value, item.quantity) }
        : item
    ));
  };

  const handleReceive = async () => {
    if (!po) return;

    const hasUnreceivedItems = items.some(item => item.received_quantity < item.quantity);
    
    if (hasUnreceivedItems) {
      const confirmed = window.confirm(
        'Some items have not been fully received. Do you want to proceed anyway?'
      );
      if (!confirmed) return;
    }

    setLoading(true);

    try {
      // Update received quantities in po_items
      const updatePromises = items.map(item =>
        supabase
          .from('po_items')
          .update({ received_quantity: item.received_quantity })
          .eq('id', item.id)
      );

      // Update product stock levels
      const stockPromises = items.map(item =>
        supabase.rpc('increment_stock', {
          product_id: item.product_id,
          quantity_change: item.received_quantity
        })
      );

      await Promise.all([...updatePromises, ...stockPromises]);

      // Update PO status to received
      const { error: statusError } = await supabase
        .from('purchase_orders')
        .update({ status: 'received' })
        .eq('id', po.id);

      if (statusError) throw statusError;

      toast.success('Purchase order received successfully');
      navigate('/purchase-orders');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!po) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/purchase-orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Receive Purchase Order</h1>
          <p className="text-muted-foreground">
            PO #{po.po_number} - {po.vendors?.name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items to Receive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{item.products?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Current Stock: {item.products?.stock_on_hand || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Ordered Quantity</p>
                  <p className="text-2xl font-bold">{item.quantity}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`received-${item.id}`}>Received Quantity</Label>
                  <Input
                    id={`received-${item.id}`}
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={item.received_quantity}
                    onChange={(e) => updateReceivedQuantity(item.id, parseInt(e.target.value) || 0)}
                    className="text-lg font-semibold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Cost</Label>
                  <Input
                    value={`KSh ${item.unit_cost.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Line Total</Label>
                  <Input
                    value={`KSh ${(item.received_quantity * item.unit_cost).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
                    disabled
                  />
                </div>
              </div>

              {item.received_quantity < item.quantity && (
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    ⚠️ Partially received: {item.received_quantity} of {item.quantity}
                  </p>
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Total Received Value</p>
              <p className="text-2xl font-bold">
                KSh {items.reduce((sum, item) => sum + (item.received_quantity * item.unit_cost), 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/purchase-orders')}>
                Cancel
              </Button>
              <Button onClick={handleReceive} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm Receipt'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
