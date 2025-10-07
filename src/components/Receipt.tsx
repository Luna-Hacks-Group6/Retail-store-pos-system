import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ReceiptProps {
  saleId: string;
  onClose: () => void;
}

interface Sale {
  id: string;
  created_at: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  payment_method: string;
  cashier_id: string;
  sale_items: {
    quantity: number;
    unit_price: number;
    line_total: number;
    products: {
      name: string;
      sku: string;
    };
  }[];
  customers: {
    name: string;
    phone: string;
  } | null;
  profiles: {
    full_name: string;
  };
}

export function Receipt({ saleId, onClose }: ReceiptProps) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [saleId]);

  const loadData = async () => {
    // Load sale with items
    const { data: saleData } = await supabase
      .from('sales')
      .select('*, sale_items(*, products(name, sku)), customers(name, phone)')
      .eq('id', saleId)
      .single();

    if (saleData) {
      // Fetch cashier profile separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', saleData.cashier_id)
        .single();

      setSale({ ...saleData, profiles: profileData || { full_name: 'Unknown' } } as Sale);
    }

    // Load settings
    const { data: settingsData } = await supabase.from('settings').select('*');
    const settingsMap: Record<string, string> = {};
    settingsData?.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    setSettings(settingsMap);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!sale) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Receipt</span>
            <Button onClick={handlePrint} size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div id="receipt-content" className="space-y-4 text-sm">
          {/* Company Header */}
          <div className="text-center border-b pb-4">
            <h2 className="font-bold text-lg">{settings.company_name || 'Wholesale POS'}</h2>
            <p>{settings.company_address || 'Nairobi, Kenya'}</p>
            <p>{settings.company_phone || '+254 700 000000'}</p>
            <p>PIN: {settings.tax_pin || 'P000000000A'}</p>
          </div>

          {/* Sale Info */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span className="font-mono">{sale.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(sale.created_at).toLocaleString('en-KE')}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{sale.profiles.full_name}</span>
            </div>
            {sale.customers && (
              <>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{sale.customers.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span>{sale.customers.phone}</span>
                </div>
              </>
            )}
          </div>

          {/* Items */}
          <div className="border-t border-b py-2 space-y-2">
            {sale.sale_items.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span>{item.products.name}</span>
                  <span>KSh {item.line_total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pl-2">
                  <span>{item.quantity} x KSh {item.unit_price.toFixed(2)}</span>
                  <span>SKU: {item.products.sku}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>KSh {sale.subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT (16%):</span>
              <span>KSh {sale.tax_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>TOTAL:</span>
              <span>KSh {sale.total_amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Payment Method:</span>
              <span className="uppercase">{sale.payment_method}</span>
            </div>
          </div>

          {/* MPESA Info */}
          {settings.mpesa_paybill && (
            <div className="text-center text-xs bg-muted p-2 rounded">
              <p>Pay via MPESA</p>
              <p>Paybill: {settings.mpesa_paybill}</p>
              {settings.mpesa_till_number && <p>Till: {settings.mpesa_till_number}</p>}
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs border-t pt-4">
            <p>{settings.receipt_footer || 'Thank you for your business!'}</p>
            <p className="mt-2 text-muted-foreground">
              Powered by Wholesale POS System
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Print styles
const style = document.createElement('style');
style.textContent = `
  @media print {
    body * {
      visibility: hidden;
    }
    #receipt-content, #receipt-content * {
      visibility: visible;
    }
    #receipt-content {
      position: absolute;
      left: 0;
      top: 0;
      width: 80mm;
      font-size: 12px;
    }
  }
`;
document.head.appendChild(style);
