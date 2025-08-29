import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarProvider } from '@/contexts/SidebarContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background relative">
        {/* Header arriba de todo */}
        <Header />
        
        {/* Sidebar superpuesto */}
        <Sidebar />
        
        {/* Contenido principal que ocupa todo el ancho menos el sidebar contraído */}
        <main className="pt-24 p-6 ml-16">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}