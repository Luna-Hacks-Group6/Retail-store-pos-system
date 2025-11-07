import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock, Play, Square, DollarSign, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Shift {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  opening_cash: number;
  closing_cash: number | null;
  total_sales: number;
  status: string;
  profiles?: { full_name: string };
}

export default function Shifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadShifts();
    loadActiveShift();
  }, []);

  const loadShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts' as any)
        .select('*')
        .order('start_time', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      // Fetch profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((s: any) => s.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, { full_name: p.full_name }]));
        
        const shiftsWithProfiles = data.map((shift: any) => ({
          ...shift,
          profiles: profilesMap.get(shift.user_id)
        }));
        
        setShifts(shiftsWithProfiles as Shift[]);
      } else {
        setShifts([]);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading shifts',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActiveShift = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts' as any)
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .maybeSingle();

      if (data) setActiveShift(data as unknown as Shift);
    } catch (error) {
      // No active shift, which is fine
    }
  };

  const startShift = async () => {
    if (!openingCash || parseFloat(openingCash) < 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid opening cash amount',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shifts' as any)
        .insert([{
          user_id: user?.id,
          opening_cash: parseFloat(openingCash),
          status: 'active'
        } as any])
        .select()
        .single();

      if (error) throw error;

      setActiveShift(data as unknown as Shift);
      setOpeningCash('');
      toast({
        title: 'Shift started',
        description: 'Your shift has been started successfully'
      });
      loadShifts();
    } catch (error: any) {
      toast({
        title: 'Error starting shift',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const endShift = async () => {
    if (!activeShift) return;
    
    if (!closingCash || parseFloat(closingCash) < 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid closing cash amount',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Calculate total sales for the shift
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('cashier_id', user?.id)
        .gte('created_at', activeShift.start_time);

      const totalSales = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

      const { error } = await supabase
        .from('shifts' as any)
        .update({
          end_time: new Date().toISOString(),
          closing_cash: parseFloat(closingCash),
          total_sales: totalSales,
          status: 'completed'
        } as any)
        .eq('id', activeShift.id);

      if (error) throw error;

      setActiveShift(null);
      setClosingCash('');
      toast({
        title: 'Shift ended',
        description: `Total sales: KSh ${totalSales.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`
      });
      loadShifts();
    } catch (error) {
      toast({
        title: 'Error ending shift',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const calculateShiftDuration = (start: string, end: string | null) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const diff = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Shift Management</h1>
        <p className="text-muted-foreground">Track and manage cashier shifts and performance</p>
      </div>

      {/* Active Shift Card */}
      <Card className={activeShift ? 'border-primary' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Shift
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeShift ? (
            <>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Started</p>
                  <p className="font-semibold">
                    {new Date(activeShift.start_time).toLocaleTimeString()}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Duration</p>
                  <p className="font-semibold">
                    {calculateShiftDuration(activeShift.start_time, null)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Opening Cash</p>
                  <p className="font-semibold">
                    KSh {activeShift.opening_cash.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Closing Cash (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    placeholder="Enter closing cash amount"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <Button onClick={endShift} variant="destructive" className="w-full sm:w-auto">
                  <Square className="mr-2 h-4 w-4" />
                  End Shift
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">No active shift. Start a new shift to begin.</p>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Opening Cash (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    placeholder="Enter opening cash amount"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <Button onClick={startShift} className="w-full sm:w-auto">
                  <Play className="mr-2 h-4 w-4" />
                  Start Shift
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift History */}
      <Card>
        <CardHeader>
          <CardTitle>Shift History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="hidden sm:table-cell">Start Time</TableHead>
                  <TableHead className="hidden sm:table-cell">End Time</TableHead>
                  <TableHead className="hidden md:table-cell">Duration</TableHead>
                  <TableHead>Opening</TableHead>
                  <TableHead>Closing</TableHead>
                  <TableHead className="hidden lg:table-cell">Sales</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading shifts...
                    </TableCell>
                  </TableRow>
                ) : shifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No shifts recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">
                        {shift.profiles?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {new Date(shift.start_time).toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {shift.end_time ? new Date(shift.end_time).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {calculateShiftDuration(shift.start_time, shift.end_time)}
                      </TableCell>
                      <TableCell className="text-sm">
                        KSh {shift.opening_cash.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {shift.closing_cash ? 
                          `KSh ${shift.closing_cash.toLocaleString('en-KE', { minimumFractionDigits: 0 })}` : 
                          '-'
                        }
                      </TableCell>
                      <TableCell className="hidden lg:table-cell font-medium">
                        KSh {shift.total_sales.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={shift.status === 'active' ? 'default' : 'secondary'}>
                          {shift.status}
                        </Badge>
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
