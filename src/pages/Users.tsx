import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    email: string;
    full_name: string;
  };
}

export default function Users() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserRole[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('*')
      .order('role');

    if (!rolesData) {
      setUsers([]);
      return;
    }

    // Fetch profiles separately
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', rolesData.map(r => r.user_id));

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

    const usersWithProfiles = rolesData.map(role => ({
      ...role,
      profiles: profilesMap.get(role.user_id) || { email: '', full_name: '' }
    }));

    setUsers(usersWithProfiles as UserRole[]);
  };

  const updateRole = async (userId: string, newRole: 'admin' | 'cashier') => {
    if (role !== 'admin') {
      toast.error('Only admins can change roles');
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Role updated successfully');
      loadUsers();
    }
  };

  const isAdmin = role === 'admin';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.profiles.full_name}</TableCell>
                  <TableCell>{user.profiles.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <Select
                        value={user.role}
                        onValueChange={(newRole) => updateRole(user.user_id, newRole as 'admin' | 'cashier')}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="cashier">Cashier</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Admin</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Full access to all features</li>
              <li>Manage products, vendors, and purchase orders</li>
              <li>View all reports and analytics</li>
              <li>Manage users and system settings</li>
              <li>Process sales and refunds</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Cashier</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Process sales transactions</li>
              <li>View own sales history</li>
              <li>Lookup product information</li>
              <li>Manage customers</li>
              <li>Print receipts</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
