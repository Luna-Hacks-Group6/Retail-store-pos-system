import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Plus, ArrowRight, CheckCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Location {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Transfer {
  id: string;
  product_id: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  status: string;
  notes: string | null;
  created_at: string;
  products: { name: string; sku: string };
  from_location: { name: string };
  to_location: { name: string };
}

export default function InventoryTransfers() {
  const { role, user } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    from_location_id: '',
    to_location_id: '',
    quantity: 0,
    notes: '',
  });

  const isAdmin = role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [transfersRes, locationsRes, productsRes] = await Promise.all([
      supabase
        .from('inventory_transfers' as any)
        .select('*, products(name, sku), from_location:locations!from_location_id(name), to_location:locations!to_location_id(name)')
        .order('created_at', { ascending: false }),
      supabase.from('locations' as any).select('id, name').order('name'),
      supabase.from('products').select('id, name, sku').order('name'),
    ]);

    setTransfers((transfersRes.data as unknown as Transfer[]) || []);
    setLocations((locationsRes.data as unknown as Location[]) || []);
    setProducts(productsRes.data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.from_location_id === formData.to_location_id) {
      toast.error('Source and destination locations must be different');
      return;
    }

    const { error } = await supabase
      .from('inventory_transfers' as any)
      .insert([{
        ...formData,
        created_by: user?.id,
        status: 'pending',
      }]);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Transfer created');
      resetForm();
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      from_location_id: '',
      to_location_id: '',
      quantity: 0,
      notes: '',
    });
    setDialogOpen(false);
  };

  const completeTransfer = async (transfer: Transfer) => {
    if (!confirm('Complete this transfer? This will update inventory levels.')) return;

    try {
      // Update from location inventory
      const { data: fromInv } = await supabase
        .from('location_inventory' as any)
        .select('quantity')
        .eq('product_id', transfer.product_id)
        .eq('location_id', transfer.from_location_id)
        .maybeSingle();

      if (!fromInv || (fromInv as any).quantity < transfer.quantity) {
        toast.error('Insufficient stock at source location');
        return;
      }

      // Decrease from location
      await supabase
        .from('location_inventory' as any)
        .update({ quantity: (fromInv as any).quantity - transfer.quantity })
        .eq('product_id', transfer.product_id)
        .eq('location_id', transfer.from_location_id);

      // Increase to location (or insert if doesn't exist)
      const { data: toInv } = await supabase
        .from('location_inventory' as any)
        .select('quantity')
        .eq('product_id', transfer.product_id)
        .eq('location_id', transfer.to_location_id)
        .maybeSingle();

      if (toInv) {
        await supabase
          .from('location_inventory' as any)
          .update({ quantity: (toInv as any).quantity + transfer.quantity })
          .eq('product_id', transfer.product_id)
          .eq('location_id', transfer.to_location_id);
      } else {
        await supabase
          .from('location_inventory' as any)
          .insert([{
            product_id: transfer.product_id,
            location_id: transfer.to_location_id,
            quantity: transfer.quantity,
          }]);
      }

      // Mark transfer as completed
      const { error } = await supabase
        .from('inventory_transfers' as any)
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', transfer.id);

      if (error) throw error;

      toast.success('Transfer completed');
      loadData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Transfers</h1>
          <p className="text-muted-foreground">Transfer stock between locations</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                New Transfer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Inventory Transfer</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="product">Product *</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="from">From Location *</Label>
                  <Select
                    value={formData.from_location_id}
                    onValueChange={(value) => setFormData({ ...formData, from_location_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="to">To Location *</Label>
                  <Select
                    value={formData.to_location_id}
                    onValueChange={(value) => setFormData({ ...formData, to_location_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Transfer</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>From</TableHead>
                <TableHead className="text-center">→</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transfer.products?.name || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">{transfer.products?.sku || ''}</div>
                    </div>
                  </TableCell>
                  <TableCell>{transfer.from_location?.name || 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="h-4 w-4 mx-auto" />
                  </TableCell>
                  <TableCell>{transfer.to_location?.name || 'N/A'}</TableCell>
                  <TableCell>{transfer.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(transfer.status)}>
                      {transfer.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(transfer.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && transfer.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => completeTransfer(transfer)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
