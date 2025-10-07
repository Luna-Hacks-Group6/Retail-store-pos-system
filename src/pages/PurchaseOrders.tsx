import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  vendors: { name: string } | null;
}

export default function PurchaseOrders() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase
      .from('purchase_orders')
      .select('*, vendors(name)')
      .order('created_at', { ascending: false });
    setOrders(data || []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      case 'received': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`PO ${newStatus}`);
      loadOrders();
    }
  };

  const isAdmin = role === 'admin';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage inventory procurement</p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('/purchase-orders/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New PO
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.po_number}</TableCell>
                  <TableCell>{order.vendors?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>KSh {order.total_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString('en-KE')}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {isAdmin && order.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(order.id, 'sent')}
                      >
                        Send
                      </Button>
                    )}
                    {isAdmin && order.status === 'sent' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/purchase-orders/${order.id}/receive`)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Receive
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStatus(order.id, 'cancelled')}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
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
