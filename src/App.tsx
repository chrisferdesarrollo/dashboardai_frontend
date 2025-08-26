import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { EmailVerification } from "@/components/auth/EmailVerification";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuthStore } from "@/store/authStore";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import Settings from "./pages/Settings";
import AuthPage from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { refreshUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Verificar autenticación al cargar la app
    const token = localStorage.getItem('token');
    if (token && !isAuthenticated) {
      refreshUser();
    }
  }, [refreshUser, isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="dashboard-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* Ruta de autenticación */}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Ruta de verificación de email */}
            <Route path="/verify-email" element={<EmailVerification />} />
            
            {/* Rutas protegidas */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/agents"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Agents />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/executions"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <div className="p-8 text-center text-muted-foreground">
                      Ejecuciones - Próximamente
                    </div>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workflows"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <div className="p-8 text-center text-muted-foreground">
                      Workflows - Próximamente
                    </div>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <div className="p-8 text-center text-muted-foreground">
                      Analíticas - Próximamente
                    </div>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Redirigir rutas desconocidas */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
