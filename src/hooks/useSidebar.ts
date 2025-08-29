import { useState, useEffect } from 'react';

// Hook personalizado para manejar el estado del sidebar móvil
export function useSidebar() {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Función para toggle del sidebar móvil
  const toggleMobileSidebar = () => {
    setIsMobileExpanded(prev => !prev);
  };

  // Función para cerrar el sidebar móvil
  const closeMobileSidebar = () => {
    setIsMobileExpanded(false);
  };

  // Efecto para cerrar el sidebar cuando cambia el tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setIsMobileExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobileExpanded,
    toggleMobileSidebar,
    closeMobileSidebar,
    setIsMobileExpanded
  };
}
