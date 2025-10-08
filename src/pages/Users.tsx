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

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
  role_id: string | null;
}

export default function Users() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    // Fetch all profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('email');

    if (!profilesData) {
      setUsers([]);
      return;
    }

    // Fetch all user roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('id, user_id, role');

    const rolesMap = new Map(rolesData?.map(r => [r.user_id, { role: r.role, role_id: r.id }]));

    const usersWithRoles = profilesData.map(profile => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: rolesMap.get(profile.id)?.role || null,
      role_id: rolesMap.get(profile.id)?.role_id || null,
    }));

    setUsers(usersWithRoles);
  };

  const assignRole = async (userId: string, newRole: 'admin' | 'cashier', roleId: string | null) => {
    if (role !== 'admin') {
      toast.error('Only admins can change roles');
      return;
    }

    try {
      if (roleId) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('id', roleId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      toast.success('Role updated successfully');
      loadUsers();
    } catch (error: any) {
      toast.error(error.message);
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
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.role ? (
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No Role</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin && (
                      <Select
                        value={user.role || 'no-role'}
                        onValueChange={(newRole) => {
                          if (newRole !== 'no-role') {
                            assignRole(user.id, newRole as 'admin' | 'cashier', user.role_id);
                          }
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Assign role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="cashier">Cashier</SelectItem>
                          {!user.role && <SelectItem value="no-role">No Role</SelectItem>}
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
