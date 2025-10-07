import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Vendor {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  payment_terms: string | null;
}

export default function Vendors() {
  const { role } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    payment_terms: '',
  });

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    const { data } = await supabase.from('vendors').select('*').order('name');
    setVendors(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        const { error } = await supabase
          .from('vendors')
          .update(formData)
          .eq('id', editingVendor.id);
        if (error) throw error;
        toast.success('Vendor updated successfully');
      } else {
        const { error } = await supabase.from('vendors').insert([formData]);
        if (error) throw error;
        toast.success('Vendor added successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      loadVendors();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      payment_terms: '',
    });
    setEditingVendor(null);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      payment_terms: vendor.payment_terms || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will delete all related purchase orders.')) return;
    const { error } = await supabase.from('vendors').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Vendor deleted');
      loadVendors();
    }
  };

  const isAdmin = role === 'admin';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vendors</h1>
          <p className="text-muted-foreground">Manage supplier information</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingVendor ? 'Edit' : 'Add'} Vendor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+254 700 000000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="payment_terms">Payment Terms</Label>
                  <Input
                    id="payment_terms"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    placeholder="e.g., Net 30, COD"
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingVendor ? 'Update' : 'Add'} Vendor
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {vendors.map((vendor) => (
          <Card key={vendor.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <span>{vendor.name}</span>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(vendor)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(vendor.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {vendor.contact_person && (
                <div>
                  <span className="font-semibold">Contact:</span> {vendor.contact_person}
                </div>
              )}
              {vendor.phone && (
                <div>
                  <span className="font-semibold">Phone:</span> {vendor.phone}
                </div>
              )}
              {vendor.email && (
                <div>
                  <span className="font-semibold">Email:</span> {vendor.email}
                </div>
              )}
              {vendor.address && (
                <div>
                  <span className="font-semibold">Address:</span> {vendor.address}
                </div>
              )}
              {vendor.payment_terms && (
                <div>
                  <span className="font-semibold">Terms:</span> {vendor.payment_terms}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
