import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCw, Plus, Search, RotateCcw, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Return {
  id: string;
  sale_id: string;
  return_amount: number;
  reason: string;
  status: string;
  created_at: string;
  refund_method: string;
  stock_restored: boolean;
  processed_at: string | null;
  return_items: any;
}

interface Sale {
  id: string;
  total_amount: number;
  created_at: string;
  sale_items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    products: { name: string } | null;
  }>;
}

export default function Returns() {
  const { user } = useAuth();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleSearchTerm, setSaleSearchTerm] = useState('');
  const [salesSearchResults, setSalesSearchResults] = useState<Sale[]>([]);
  const [searchingSales, setSearchingSales] = useState(false);

  const [formData, setFormData] = useState({
    return_amount: '',
    reason: '',
    refund_method: 'cash',
  });

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (error: any) {
      toast.error('Error loading returns: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const searchSales = async () => {
    if (!saleSearchTerm.trim()) return;
    
    setSearchingSales(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          total_amount,
          created_at,
          sale_items (
            id,
            product_id,
            quantity,
            unit_price,
            products (name)
          )
        `)
        .or(`id.ilike.%${saleSearchTerm}%`)
        .eq('status', 'completed')
        .limit(10);

      if (error) throw error;
      setSalesSearchResults(data || []);
    } catch (error: any) {
      toast.error('Error searching sales: ' + error.message);
    } finally {
      setSearchingSales(false);
    }
  };

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setFormData({
      ...formData,
      return_amount: sale.total_amount.toString(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSale) {
      toast.error('Please select a sale to return');
      return;
    }

    try {
      const returnItems = selectedSale.sale_items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_name: item.products?.name,
      }));

      const { error } = await supabase.from('returns').insert({
        sale_id: selectedSale.id,
        return_amount: parseFloat(formData.return_amount),
        reason: formData.reason,
        refund_method: formData.refund_method,
        status: 'pending',
        return_items: returnItems,
        stock_restored: false,
      });

      if (error) throw error;

      toast.success('Return request created successfully');
      setDialogOpen(false);
      setSelectedSale(null);
      setSalesSearchResults([]);
      setSaleSearchTerm('');
      setFormData({
        return_amount: '',
        reason: '',
        refund_method: 'cash',
      });
      loadReturns();
    } catch (error: any) {
      toast.error('Error creating return: ' + error.message);
    }
  };

  const approveReturn = async (returnId: string) => {
    try {
      // Call the process_return_stock function to restore inventory
      const { data: processed, error: processError } = await supabase
        .rpc('process_return_stock', { p_return_id: returnId });

      if (processError) throw processError;

      if (!processed) {
        toast.error('Return was already processed or could not be processed');
        return;
      }

      // Update return status
      const { error: updateError } = await supabase
        .from('returns')
        .update({ 
          status: 'completed',
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', returnId);

      if (updateError) throw updateError;

      toast.success('Return approved and stock restored');
      loadReturns();
    } catch (error: any) {
      toast.error('Error approving return: ' + error.message);
    }
  };

  const rejectReturn = async (id: string) => {
    try {
      const { error } = await supabase
        .from('returns')
        .update({ 
          status: 'rejected',
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Return rejected');
      loadReturns();
    } catch (error: any) {
      toast.error('Error rejecting return: ' + error.message);
    }
  };

  const filteredReturns = returns.filter(ret => 
    ret.sale_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ret.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <RotateCcw className="h-7 w-7" />
            Returns & Refunds
          </h1>
          <p className="text-muted-foreground">Manage product returns and refund requests</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Return
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Return Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sale Search */}
              <div className="space-y-2">
                <Label>Search Sale</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter sale ID..."
                    value={saleSearchTerm}
                    onChange={(e) => setSaleSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchSales())}
                  />
                  <Button type="button" variant="outline" onClick={searchSales} disabled={searchingSales}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Sale Search Results */}
              {salesSearchResults.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {salesSearchResults.map((sale) => (
                    <div
                      key={sale.id}
                      onClick={() => handleSelectSale(sale)}
                      className={`p-3 cursor-pointer hover:bg-muted transition-colors border-b last:border-b-0 ${
                        selectedSale?.id === sale.id ? 'bg-primary/10 border-primary' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-sm">{sale.id.slice(0, 8)}...</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="font-semibold">
                          KSh {sale.total_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {sale.sale_items.slice(0, 3).map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {item.products?.name} x{item.quantity}
                          </Badge>
                        ))}
                        {sale.sale_items.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{sale.sale_items.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Sale Display */}
              {selectedSale && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4" />
                    <span className="font-semibold">Selected Sale</span>
                  </div>
                  <p className="text-sm font-mono">{selectedSale.id}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSale.sale_items.length} items - KSh {selectedSale.total_amount.toLocaleString('en-KE')}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="return_amount">Return Amount (KSh)</Label>
                <Input
                  id="return_amount"
                  type="number"
                  step="0.01"
                  required
                  value={formData.return_amount}
                  onChange={(e) => setFormData({ ...formData, return_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="refund_method">Refund Method</Label>
                <Select
                  value={formData.refund_method}
                  onValueChange={(value) => setFormData({ ...formData, refund_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="store_credit">Store Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Describe the reason for return..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!selectedSale}>
                  Create Return
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Return Requests</CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search returns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={loadReturns}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Refund Method</TableHead>
                  <TableHead className="hidden sm:table-cell">Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Stock Restored</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading returns...
                    </TableCell>
                  </TableRow>
                ) : filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No returns found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReturns.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell className="font-mono text-xs sm:text-sm">
                        {ret.sale_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        KSh {ret.return_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="hidden md:table-cell capitalize">{ret.refund_method}</TableCell>
                      <TableCell className="hidden sm:table-cell max-w-xs truncate">
                        {ret.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(ret.status)} className="capitalize">
                          {ret.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {ret.stock_restored ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(ret.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {ret.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveReturn(ret.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectReturn(ret.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
