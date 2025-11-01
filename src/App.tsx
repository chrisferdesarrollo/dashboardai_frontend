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
import { useAgentNotifications } from "@/hooks/useAgentNotifications";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import AgentTemplates from "./pages/AgentTemplates";
import Conversations from "./pages/Conversations";
import DataExtraction from "./pages/DataExtraction";
import KnowledgeBase from "./pages/KnowledgeBase";
import UserProfile from "./pages/UserProfile";
import Notifications from "./pages/Notifications";
import AuthPage from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { refreshUser, isAuthenticated } = useAuthStore();
  
  // Activar las notificaciones de agentes
  useAgentNotifications();

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
              path="/agent-templates"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AgentTemplates />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/data-extraction"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <DataExtraction />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/conversations"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Conversations />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/knowledge-base"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <KnowledgeBase />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Notifications />
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
              path="/profile"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <UserProfile />
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

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
      <Sonner />
    </QueryClientProvider>
  );
};

export default App;
