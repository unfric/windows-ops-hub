import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
import AppLayout from "@/components/AppLayout";
import ThemeSync from "@/components/ThemeSync";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const OperationalDashboard = lazy(() => import("@/pages/OperationalDashboard"));
const OrdersDashboard = lazy(() => import("@/pages/OrdersDashboard"));
const OrderDetailPage = lazy(() => import("@/pages/OrderDetailPage"));
const ProductionDashboard = lazy(() => import("@/pages/ProductionDashboard"));
const DispatchPage = lazy(() => import("@/pages/DispatchPage"));
const InstallationPage = lazy(() => import("@/pages/InstallationPage"));
const ReworkPage = lazy(() => import("@/pages/ReworkPage"));
const SalesPage = lazy(() => import("@/pages/SalesPage"));
const FinancePage = lazy(() => import("@/pages/FinancePage"));
const SurveyPage = lazy(() => import("@/pages/SurveyPage"));
const DesignPage = lazy(() => import("@/pages/DesignPage"));
const StorePage = lazy(() => import("@/pages/StorePage"));
const ProcurementPage = lazy(() => import("@/pages/ProcurementPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const GeneralSettingsPage = lazy(() => import("@/pages/settings/GeneralSettingsPage"));
const MastersSettingsPage = lazy(() => import("@/pages/settings/MastersSettingsPage"));
const UserManagementPage = lazy(() => import("@/pages/UserManagementPage"));
const SetPasswordPage = lazy(() => import("@/pages/SetPasswordPage"));

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading, event } = useAuth();
  
  // Check if we are in a password set flow (from invite or recovery)
  const isPasswordFlow = 
    event === "PASSWORD_RECOVERY" || 
    window.location.hash.includes("type=recovery") || 
    window.location.hash.includes("type=invite");

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );

  // BLOC SECURITY: Forced password setup for invites/recovery
  if (isPasswordFlow) {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>}>
        <SetPasswordPage />
      </Suspense>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <AppLayout>
      <ThemeSync />
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>}>
        <Routes>
          {/* Operations Hub is the main dashboard */}
          <Route path="/" element={<OperationalDashboard />} />

          <Route path="/orders" element={<OrdersDashboard />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />

          <Route path="/sales" element={<SalesPage />} />
          <Route path="/survey" element={<SurveyPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/design" element={<DesignPage />} />
          <Route path="/procurement" element={<ProcurementPage />} />

          <Route path="/production" element={<ProductionDashboard />} />
          {/* Quality handled inside Production */}

          <Route path="/dispatch" element={<DispatchPage />} />
          <Route path="/installation" element={<InstallationPage />} />
          <Route path="/rework" element={<ReworkPage />} />
          <Route path="/store" element={<StorePage />} />

          <Route path="/settings" element={<SettingsPage />}>
            <Route index element={<GeneralSettingsPage />} />
            <Route path="masters" element={<MastersSettingsPage />} />
            <Route path="users" element={<UserManagementPage />} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;