import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import NewProduct from "./pages/NewProduct";
import Sales from "./pages/Sales";
import Customers from "./pages/Customers";
import Vendors from "./pages/Vendors";
import PurchaseOrders from "./pages/PurchaseOrders";
import NewPurchaseOrder from "./pages/NewPurchaseOrder";
import Reports from "./pages/Reports";
import Returns from "./pages/Returns";
import Shifts from "./pages/Shifts";
import Loyalty from "./pages/Loyalty";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <OfflineIndicator />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
                    <Navbar />
                    <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/products/new" element={<NewProduct />} />
                        <Route path="/sales" element={<Sales />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/vendors" element={<Vendors />} />
                        <Route path="/purchase-orders" element={<PurchaseOrders />} />
                        <Route path="/purchase-orders/new" element={<NewPurchaseOrder />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/returns" element={<Returns />} />
                        <Route path="/shifts" element={<Shifts />} />
                        <Route path="/loyalty" element={<Loyalty />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
