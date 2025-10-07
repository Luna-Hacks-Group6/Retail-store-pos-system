import { Home, Package, ShoppingCart, Users, Settings, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/button';

export function AppSidebar() {
  const { userRole, signOut } = useAuth();

  const navItems = [
    { title: 'Dashboard', url: '/', icon: Home, roles: ['admin', 'cashier'] },
    { title: 'New Sale', url: '/sales', icon: ShoppingCart, roles: ['admin', 'cashier'] },
    { title: 'Products', url: '/products', icon: Package, roles: ['admin', 'cashier'] },
    { title: 'User Management', url: '/users', icon: Users, roles: ['admin'] },
    { title: 'Settings', url: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredItems = navItems.filter((item) =>
    item.roles.includes(userRole || '')
  );

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Wholesale POS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : ''
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
