import { useContext } from 'react';
import { SidebarContext } from '@/contexts/SidebarContext';

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
}
