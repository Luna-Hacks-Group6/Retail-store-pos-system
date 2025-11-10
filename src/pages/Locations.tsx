import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Plus, MapPin, Trash2, Edit } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Location {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_primary: boolean;
}

export default function Locations() {
  const { role } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    is_primary: false,
  });

  const isAdmin = role === 'admin';

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('*')
      .order('is_primary', { ascending: false })
      .order('name');
    setLocations(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      const { error } = await supabase
        .from('locations')
        .update(formData)
        .eq('id', editingId);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Location updated');
        resetForm();
        loadLocations();
      }
    } else {
      const { error } = await supabase
        .from('locations')
        .insert([formData]);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Location added');
        resetForm();
        loadLocations();
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '', address: '', phone: '', is_primary: false });
    setEditingId(null);
    setDialogOpen(false);
  };

  const handleEdit = (location: Location) => {
    setFormData({
      name: location.name,
      address: location.address || '',
      phone: location.phone || '',
      is_primary: location.is_primary,
    });
    setEditingId(location.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Location deleted');
      loadLocations();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Store Locations</h1>
          <p className="text-muted-foreground">Manage your store locations and warehouses</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Location' : 'Add New Location'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Location Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_primary"
                    checked={formData.is_primary}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
                  />
                  <Label htmlFor="is_primary">Primary Location</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingId ? 'Update' : 'Add'} Location
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <Card key={location.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {location.name}
              </CardTitle>
              {isAdmin && (
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(location)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(location.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {location.is_primary && (
                <div className="mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                    Primary Location
                  </span>
                </div>
              )}
              {location.address && (
                <p className="text-sm text-muted-foreground mb-1">{location.address}</p>
              )}
              {location.phone && (
                <p className="text-sm text-muted-foreground">{location.phone}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
