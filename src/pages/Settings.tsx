import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function Settings() {
  const { role } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from('settings').select('*');
    const settingsMap: Record<string, string> = {};
    data?.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
    setSettings(settingsMap);
  };

  const handleSave = async () => {
    if (role !== 'admin') {
      toast.error('Only admins can update settings');
      return;
    }

    setLoading(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase
          .from('settings')
          .upsert({ key, value }, { onConflict: 'key' });
      }
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">Configure your POS system</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Business details for receipts and invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={settings.company_name || ''}
                onChange={(e) => updateSetting('company_name', e.target.value)}
                disabled={role !== 'admin'}
              />
            </div>
            <div>
              <Label htmlFor="company_address">Address</Label>
              <Textarea
                id="company_address"
                value={settings.company_address || ''}
                onChange={(e) => updateSetting('company_address', e.target.value)}
                rows={2}
                disabled={role !== 'admin'}
              />
            </div>
            <div>
              <Label htmlFor="company_phone">Phone</Label>
              <Input
                id="company_phone"
                value={settings.company_phone || ''}
                onChange={(e) => updateSetting('company_phone', e.target.value)}
                disabled={role !== 'admin'}
              />
            </div>
            <div>
              <Label htmlFor="tax_pin">KRA PIN</Label>
              <Input
                id="tax_pin"
                value={settings.tax_pin || ''}
                onChange={(e) => updateSetting('tax_pin', e.target.value)}
                placeholder="P000000000A"
                disabled={role !== 'admin'}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MPESA Configuration</CardTitle>
            <CardDescription>Payment gateway settings for STK Push</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mpesa_shortcode">Till Number / Shortcode *</Label>
              <Input
                id="mpesa_shortcode"
                value={settings.mpesa_shortcode || ''}
                onChange={(e) => updateSetting('mpesa_shortcode', e.target.value)}
                placeholder="Enter your M-Pesa Till Number (e.g., 174379)"
                disabled={role !== 'admin'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is your M-Pesa Till Number used for STK Push payments
              </p>
            </div>
            <div>
              <Label htmlFor="mpesa_paybill">Paybill Number (Optional)</Label>
              <Input
                id="mpesa_paybill"
                value={settings.mpesa_paybill || ''}
                onChange={(e) => updateSetting('mpesa_paybill', e.target.value)}
                placeholder="123456"
                disabled={role !== 'admin'}
              />
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> The Till Number above is used for automatic STK Push payments. Make sure it matches your Safaricom Daraja API configuration.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Receipt Settings</CardTitle>
            <CardDescription>Customize receipt footer message</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="receipt_footer">Receipt Footer</Label>
              <Textarea
                id="receipt_footer"
                value={settings.receipt_footer || ''}
                onChange={(e) => updateSetting('receipt_footer', e.target.value)}
                rows={3}
                placeholder="Thank you for your business!"
                disabled={role !== 'admin'}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {role === 'admin' && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      )}
    </div>
  );
}
