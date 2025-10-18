import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, UserPlus, Trash2, Edit, KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  mfa_enabled?: boolean;
}

export default function Users() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '' });

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

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditForm({ full_name: user.full_name, email: user.email });
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success('User details updated successfully');
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      // Delete user role first
      await supabase.from('user_roles').delete().eq('user_id', deleteUserId);
      
      // Delete profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteUserId);

      if (error) throw error;

      toast.success('User deleted successfully');
      setDeleteUserId(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset email sent');
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
                <TableHead>2FA</TableHead>
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
                  <TableCell>
                    <Badge variant={user.mfa_enabled ? 'default' : 'outline'}>
                      {user.mfa_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {isAdmin && (
                        <>
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
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => sendPasswordReset(user.email)}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setDeleteUserId(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Security & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Two-Factor Authentication
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              All users are required to enable 2FA for enhanced security. Users can set up 2FA in their profile settings.
            </p>
          </div>
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

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
            <DialogDescription>
              Update user information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={saveUserEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account
              and remove their data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
