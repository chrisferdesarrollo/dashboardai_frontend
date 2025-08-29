import React, { createContext, useContext, ReactNode } from 'react';
import { useSidebar } from '@/hooks/useSidebar';

interface SidebarContextType {
  isMobileExpanded: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setIsMobileExpanded: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const sidebarState = useSidebar();

  return (
    <SidebarContext.Provider value={sidebarState}>
      {children}
    </SidebarContext.Provider>
  );
}

export { SidebarContext };
