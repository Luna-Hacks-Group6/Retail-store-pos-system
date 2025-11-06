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
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Plus, Search } from 'lucide-react';

interface Return {
  id: string;
  sale_id: string;
  return_amount: number;
  reason: string;
  status: string;
  created_at: string;
  refund_method: string;
}

export default function Returns() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    sale_id: '',
    return_amount: '',
    reason: '',
    refund_method: 'cash',
    status: 'pending'
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
    } catch (error) {
      toast({
        title: 'Error loading returns',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('returns').insert([{
        sale_id: formData.sale_id,
        return_amount: parseFloat(formData.return_amount),
        reason: formData.reason,
        refund_method: formData.refund_method,
        status: formData.status
      }]);

      if (error) throw error;

      toast({
        title: 'Return created',
        description: 'Return request has been recorded successfully'
      });

      setDialogOpen(false);
      setFormData({
        sale_id: '',
        return_amount: '',
        reason: '',
        refund_method: 'cash',
        status: 'pending'
      });
      loadReturns();
    } catch (error) {
      toast({
        title: 'Error creating return',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const updateReturnStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('returns')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: `Return status changed to ${status}`
      });
      
      loadReturns();
    } catch (error) {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive'
      });
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
          <h1 className="text-2xl sm:text-3xl font-bold">Returns & Refunds</h1>
          <p className="text-muted-foreground">Manage product returns and refund requests</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Return
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Return Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="sale_id">Sale ID</Label>
                <Input
                  id="sale_id"
                  required
                  value={formData.sale_id}
                  onChange={(e) => setFormData({ ...formData, sale_id: e.target.value })}
                  placeholder="Enter sale ID"
                />
              </div>
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
                <Button type="submit">Create Return</Button>
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
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading returns...
                    </TableCell>
                  </TableRow>
                ) : filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(ret.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {ret.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateReturnStatus(ret.id, 'completed')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateReturnStatus(ret.id, 'rejected')}
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
