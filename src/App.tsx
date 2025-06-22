import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./layouts/dashboard-layout";
import { DataProvider } from "./contexts/DataContext";

// Client routes
import CustomerDetailsPage from "./pages/clients";
import NewClientPage from "./pages/clients/new";
import ClientDetailsPage from "./pages/clients/[id]";
import EditClientPage from "./pages/clients/[id]/edit";

// Receipt routes
import ReceiptsPage from "./pages/receipts";
import NewReceiptPage from "./pages/receipts/new";
import ReceiptDetailsPage from "./pages/receipts/[id]";
import EditReceiptPage from "./pages/receipts/[id]/edit";
import ClientSelectionPage from "./pages/receipts/select-client";

// Import our implemented pages
import AdminReceiptsPage from "./pages/admin-receipts";
import NewAdminReceiptPage from "./pages/admin-receipts/new";
import EditAdminReceiptPage from "./pages/admin-receipts/[id]/edit";
import AdminReceiptDetailPage from "./pages/admin-receipts/[id]/index";
import AdminBillsPage from "./pages/admin-bills";
import ClientBillsPage from "./pages/client-bills";

const queryClient = new QueryClient();

// Auth wrapper for protected routes
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const location = useLocation();
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DataProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <DashboardLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />

              {/* Client Routes */}
              <Route path="clients" element={<CustomerDetailsPage />} />
              <Route path="clients/new" element={<NewClientPage />} />
              <Route path="clients/:id" element={<ClientDetailsPage />} />
              <Route path="clients/:id/edit" element={<EditClientPage />} />

              {/* Receipt Routes */}
              <Route path="receipts" element={<ReceiptsPage />} />
              <Route
                path="receipts/select-client"
                element={<ClientSelectionPage />}
              />
              <Route path="receipts/new" element={<NewReceiptPage />} />
              <Route path="receipts/:id" element={<ReceiptDetailsPage />} />
              <Route path="receipts/:id/edit" element={<EditReceiptPage />} />

              {/* Add the implemented routes */}
              <Route path="admin-receipts" element={<AdminReceiptsPage />} />
              <Route
                path="admin-receipts/new"
                element={<NewAdminReceiptPage />}
              />
              <Route
                path="admin-receipts/:id"
                element={<AdminReceiptDetailPage />}
              />
              <Route
                path="admin-receipts/edit/:id"
                element={<EditAdminReceiptPage />}
              />
              <Route path="admin-bills" element={<AdminBillsPage />} />
              <Route path="client-bills" element={<ClientBillsPage />} />

              {/* Other Routes */}
              <Route
                path="reports"
                element={<div className="p-6">Reports Page Coming Soon</div>}
              />
              <Route
                path="settings"
                element={<div className="p-6">Settings Page Coming Soon</div>}
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </DataProvider>
  </QueryClientProvider>
);

export default App;
