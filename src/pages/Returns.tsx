import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { RefreshCw, Plus, Search, RotateCcw, Package, AlertTriangle, CheckCircle2, XCircle, Clock, DollarSign, BarChart3 } from 'lucide-react';
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

interface SaleItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  products: { name: string } | null;
}

interface Sale {
  id: string;
  total_amount: number;
  created_at: string;
  payment_method: string;
  customer_id: string | null;
  customers: { name: string; phone: string } | null;
  sale_items: SaleItem[];
}

interface ReturnItem {
  product_id: string;
  product_name: string;
  quantity: number;
  max_quantity: number;
  unit_price: number;
  selected: boolean;
}

export default function Returns() {
  const { user, userRole } = useAuth();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailReturn, setDetailReturn] = useState<Return | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleSearchTerm, setSaleSearchTerm] = useState('');
  const [salesSearchResults, setSalesSearchResults] = useState<Sale[]>([]);
  const [searchingSales, setSearchingSales] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  const [formData, setFormData] = useState({
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
          payment_method,
          customer_id,
          customers (name, phone),
          sale_items (
            id,
            product_id,
            quantity,
            unit_price,
            line_total,
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
    // Build return items from sale items
    const items: ReturnItem[] = sale.sale_items.map(item => ({
      product_id: item.product_id,
      product_name: item.products?.name || 'Unknown',
      quantity: item.quantity,
      max_quantity: item.quantity,
      unit_price: item.unit_price,
      selected: true,
    }));
    setReturnItems(items);
  };

  const toggleItem = (idx: number) => {
    setReturnItems(prev => prev.map((item, i) => 
      i === idx ? { ...item, selected: !item.selected } : item
    ));
  };

  const updateItemQuantity = (idx: number, qty: number) => {
    setReturnItems(prev => prev.map((item, i) => 
      i === idx ? { ...item, quantity: Math.min(Math.max(1, qty), item.max_quantity) } : item
    ));
  };

  const calculateReturnTotal = () => {
    return returnItems
      .filter(i => i.selected)
      .reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSale) {
      toast.error('Please select a sale to return');
      return;
    }

    const selectedItems = returnItems.filter(i => i.selected);
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }

    if (!formData.reason.trim()) {
      toast.error('Please provide a reason for the return');
      return;
    }

    try {
      const returnAmount = calculateReturnTotal();
      const returnItemsData = selectedItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_name: item.product_name,
      }));

      const { error } = await supabase.from('returns').insert({
        sale_id: selectedSale.id,
        return_amount: returnAmount,
        reason: formData.reason,
        refund_method: formData.refund_method,
        status: 'pending',
        return_items: returnItemsData,
        stock_restored: false,
      });

      if (error) throw error;

      toast.success('Return request created successfully');
      resetForm();
      loadReturns();
    } catch (error: any) {
      toast.error('Error creating return: ' + error.message);
    }
  };

  const resetForm = () => {
    setDialogOpen(false);
    setSelectedSale(null);
    setSalesSearchResults([]);
    setSaleSearchTerm('');
    setReturnItems([]);
    setFormData({ reason: '', refund_method: 'cash' });
  };

  const approveReturn = async (returnId: string) => {
    try {
      const { data: processed, error: processError } = await supabase
        .rpc('process_return_stock', { p_return_id: returnId });

      if (processError) throw processError;

      if (!processed) {
        toast.error('Return was already processed or could not be processed');
        return;
      }

      const { error: updateError } = await supabase
        .from('returns')
        .update({ 
          status: 'completed',
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', returnId);

      if (updateError) throw updateError;

      toast.success('Return approved — stock restored & refund processed');
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

  const filteredReturns = returns.filter(ret => {
    const matchesSearch = ret.sale_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ret.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Summary stats
  const pendingCount = returns.filter(r => r.status === 'pending').length;
  const completedCount = returns.filter(r => r.status === 'completed').length;
  const totalRefunded = returns
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.return_amount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-accent text-accent-foreground gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <RotateCcw className="h-7 w-7 text-primary" />
            Returns & Refunds
          </h1>
          <p className="text-muted-foreground">Process returns, restore inventory, and manage refunds</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Return
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                Create Return Request
              </DialogTitle>
              <DialogDescription>
                Search for a sale, select items to return, and specify the refund method.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Sale Search */}
              <div className="space-y-2">
                <Label className="font-semibold">Find Original Sale</Label>
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
              {salesSearchResults.length > 0 && !selectedSale && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {salesSearchResults.map((sale) => (
                    <div
                      key={sale.id}
                      onClick={() => handleSelectSale(sale)}
                      className="p-3 cursor-pointer hover:bg-muted transition-colors border-b last:border-b-0"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-mono text-sm font-medium">{sale.id.slice(0, 8)}...</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sale.created_at).toLocaleDateString('en-KE')} • {sale.payment_method.toUpperCase()}
                            {sale.customers && ` • ${sale.customers.name}`}
                          </p>
                        </div>
                        <p className="font-semibold">
                          KSh {sale.total_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {sale.sale_items.slice(0, 3).map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {item.products?.name} ×{item.quantity}
                          </Badge>
                        ))}
                        {sale.sale_items.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{sale.sale_items.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Sale + Item Selection */}
              {selectedSale && (
                <div className="space-y-4">
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">Sale {selectedSale.id.slice(0, 8)}</span>
                        {selectedSale.customers && (
                          <Badge variant="outline" className="text-xs">{selectedSale.customers.name}</Badge>
                        )}
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedSale(null); setReturnItems([]); }}>
                        Change
                      </Button>
                    </div>
                  </div>

                  {/* Item-level selection */}
                  <div className="space-y-2">
                    <Label className="font-semibold">Select Items to Return</Label>
                    <div className="border rounded-lg divide-y">
                      {returnItems.map((item, idx) => (
                        <div key={idx} className={`p-3 flex items-center gap-3 transition-colors ${item.selected ? 'bg-background' : 'bg-muted/30 opacity-60'}`}>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleItem(idx)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              @ KSh {item.unit_price.toLocaleString('en-KE', { minimumFractionDigits: 2 })} each
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground sr-only">Qty</Label>
                            <Input
                              type="number"
                              min={1}
                              max={item.max_quantity}
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(idx, parseInt(e.target.value) || 1)}
                              disabled={!item.selected}
                              className="w-16 h-8 text-center text-sm"
                            />
                            <span className="text-xs text-muted-foreground">/ {item.max_quantity}</span>
                          </div>
                          <div className="text-right w-24">
                            <p className="font-semibold text-sm">
                              KSh {(item.selected ? item.quantity * item.unit_price : 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Return Total */}
                  <div className="flex justify-between items-center p-3 bg-accent/10 border border-accent/20 rounded-lg">
                    <span className="font-semibold">Return Total:</span>
                    <span className="text-xl font-bold text-accent">
                      KSh {calculateReturnTotal().toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="refund_method" className="font-semibold">Refund Method</Label>
                  <Select
                    value={formData.refund_method}
                    onValueChange={(value) => setFormData({ ...formData, refund_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 Cash Refund</SelectItem>
                      <SelectItem value="mpesa">📱 M-Pesa Reversal</SelectItem>
                      <SelectItem value="store_credit">🏷️ Store Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason" className="font-semibold">Return Reason</Label>
                  <Textarea
                    id="reason"
                    required
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Describe the reason for return..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!selectedSale || returnItems.filter(i => i.selected).length === 0} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Submit Return (KSh {calculateReturnTotal().toLocaleString('en-KE')})
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <CheckCircle2 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Processed Returns</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">KSh {totalRefunded.toLocaleString('en-KE')}</p>
              <p className="text-sm text-muted-foreground">Total Refunded</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Return Requests</CardTitle>
              <CardDescription>Track all return requests and their processing status</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search returns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
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
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Refund Method</TableHead>
                  <TableHead className="hidden sm:table-cell">Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Stock</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                        <span>Loading returns...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <RotateCcw className="h-8 w-8 opacity-30" />
                        <span>No returns found</span>
                        <p className="text-xs">Create a new return request to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReturns.map((ret) => {
                    const items = Array.isArray(ret.return_items) ? ret.return_items : [];
                    return (
                      <TableRow key={ret.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setDetailReturn(ret)}>
                        <TableCell className="font-mono text-xs sm:text-sm font-medium">
                          {ret.sale_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {items.slice(0, 2).map((item: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {item.product_name} ×{item.quantity}
                              </Badge>
                            ))}
                            {items.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{items.length - 2}</Badge>
                            )}
                            {items.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          KSh {ret.return_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="capitalize">{ret.refund_method.replace('_', ' ')}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell max-w-xs">
                          <p className="truncate text-sm">{ret.reason}</p>
                        </TableCell>
                        <TableCell>{getStatusBadge(ret.status)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {ret.stock_restored ? (
                            <Badge className="bg-accent/10 text-accent border-accent/20 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Restored
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {new Date(ret.created_at).toLocaleDateString('en-KE')}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {ret.status === 'pending' && userRole === 'admin' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                className="bg-accent hover:bg-accent/90 gap-1"
                                onClick={() => approveReturn(ret.id)}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1"
                                onClick={() => rejectReturn(ret.id)}
                              >
                                <XCircle className="h-3 w-3" />
                                Reject
                              </Button>
                            </div>
                          )}
                          {ret.status === 'pending' && userRole !== 'admin' && (
                            <span className="text-xs text-muted-foreground italic">Awaiting admin</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Return Detail Dialog */}
      <Dialog open={!!detailReturn} onOpenChange={() => setDetailReturn(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Return Details
            </DialogTitle>
          </DialogHeader>
          {detailReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Sale ID</p>
                  <p className="font-mono font-medium">{detailReturn.sale_id.slice(0, 12)}...</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(detailReturn.status)}
                </div>
                <div>
                  <p className="text-muted-foreground">Return Amount</p>
                  <p className="font-bold text-lg">KSh {detailReturn.return_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Refund Method</p>
                  <p className="capitalize font-medium">{detailReturn.refund_method.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p>{new Date(detailReturn.created_at).toLocaleString('en-KE')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stock Restored</p>
                  <p>{detailReturn.stock_restored ? '✅ Yes' : '⏳ No'}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-1">Reason</p>
                <p className="bg-muted p-3 rounded-lg text-sm">{detailReturn.reason}</p>
              </div>

              {Array.isArray(detailReturn.return_items) && detailReturn.return_items.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Returned Items</p>
                  <div className="border rounded-lg divide-y">
                    {detailReturn.return_items.map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 flex justify-between items-center text-sm">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity} × KSh {item.unit_price?.toLocaleString('en-KE')}</p>
                        </div>
                        <p className="font-semibold">KSh {(item.quantity * item.unit_price).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailReturn.processed_at && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  Processed on {new Date(detailReturn.processed_at).toLocaleString('en-KE')}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
