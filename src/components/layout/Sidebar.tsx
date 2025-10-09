import { NavLink } from 'react-router-dom';
import { 
  Bot, 
  Home, 
  Activity, 
  Brain,
  BarChart3,
  Zap,
  ChevronDown,
  User,
  LogOut,
  Bell,
  MessageSquare,
  FileSpreadsheet
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect, useRef } from 'react';
import { useMobile } from '@/hooks/use-mobile';
import { useSidebarContext } from '@/hooks/useSidebarContext';

const navigation = [
  {
    name: 'Inicio',
    items: [
      { name: 'Dashboard', href: '/', icon: Home },
      { name: 'Agentes', href: '/agents', icon: Bot },
    ]
  },
  {
    name: 'Automatización',
    items: [
      { name: 'Conversaciones', href: '/conversations', icon: MessageSquare },
      { name: 'Extracción de Datos', href: '/data-extraction', icon: FileSpreadsheet },
    ]
  },
  {
    name: 'Datos',
    items: [
      { name: 'Base de Conocimientos', href: '/knowledge-base', icon: Brain },
      { name: 'Analíticas', href: '/analytics', icon: BarChart3 },
    ]
  },
  {
    name: 'Configuración',
    items: [
      { name: 'Mi Perfil', href: '/profile', icon: User },
    ]
  }
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { isMobileExpanded, setIsMobileExpanded } = useSidebarContext();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();

  // El sidebar se expande con hover solo en desktop, en móvil con estado separado
  const isExpanded = isMobile ? isMobileExpanded : isHovered;

  // Cerrar menú de usuario al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isUserMenuOpen]);

  // Manejar hover del sidebar (solo en desktop)
  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovered(false);
      // Cerrar menú de usuario al salir del hover
      setIsUserMenuOpen(false);
    }
  };

  // Cerrar sidebar móvil al hacer click en un enlace
  const handleLinkClick = () => {
    // En móvil no hay funcionalidad especial por ahora
  };

  return (
    <>
      <div 
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "fixed left-0 top-16 z-40 flex flex-col bg-background border-r border-border/60 transition-all duration-300 ease-in-out shadow-lg",
          "h-[calc(100vh-4rem)]", // Resta la altura del header (4rem = 64px)
          // Mostrar siempre en desktop con hover, en móvil simplemente colapsado por defecto
          isExpanded ? "w-64" : "w-16"
        )}
      >
      {/* Navegación */}
      <nav className={`flex-1 py-6 px-3 ${(!isMobile && isExpanded) ? 'sidebar-scroll' : 'scrollbar-hide'}`}>
        <div className="space-y-6">
          {navigation.map((section, sectionIndex) => (
            <div key={section.name}>
              {/* Separador delgado para secciones cuando está contraído */}
              {(isMobile || !isExpanded) && sectionIndex > 0 && (
                <div className="flex justify-center mb-3">
                  <div className="w-8 h-px bg-border/80"></div>
                </div>
              )}
              
              {/* Headers de sección solo en desktop expandido */}
              {!isMobile && isExpanded && (
                <h3 className="px-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2 whitespace-nowrap">
                  {section.name}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={handleLinkClick}
                    title={!isExpanded ? item.name : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center text-sm font-medium rounded-lg transition-all duration-200 relative',
                        isExpanded ? 'px-3 py-2' : 'px-3 py-3 justify-center',
                        isActive
                          ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      )
                    }
                  >
                    <item.icon
                      className={cn(
                        "flex-shrink-0 transition-all duration-200",
                        isExpanded ? "mr-3 h-4 w-4" : "h-5 w-5"
                      )}
                      aria-hidden="true"
                    />
                    {/* Solo mostrar texto si está expandido (no en móvil) */}
                    {isExpanded && (
                      <span className="whitespace-nowrap">
                        {item.name}
                      </span>
                    )}
                    
                    {/* Tooltip solo en desktop cuando está colapsado */}
                    {!isMobile && !isExpanded && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md border shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {item.name}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Área inferior */}
      <div className="border-t border-border/60">
        {/* Usuario */}
        <div className="p-3" ref={userMenuRef}>
          {isMobile ? (
            /* Avatar simple para móvil - sin funcionalidad */
            <div className="flex items-center justify-center p-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar || undefined} alt={user?.username} />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-medium">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : !isExpanded ? (
            /* Avatar simple para modo colapsado */
            <div className="relative group">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar || undefined} alt={user?.username} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-medium">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
              
              {/* Tooltip para usuario colapsado */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md border shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {user?.username || 'Usuario'}
              </div>
              
              {/* Menu desplegable para modo colapsado */}
              {isUserMenuOpen && (
                <div className="absolute bottom-full left-full ml-2 mb-3 w-56 bg-popover border border-border rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.avatar || undefined} alt={user?.username} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-medium">
                          {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{user?.username || 'Usuario'}</p>
                        <p className="text-xs text-muted-foreground">{user?.email || 'usuario@email.com'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <button className="w-full flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors">
                      <User className="mr-3 h-4 w-4" />
                      Perfil
                    </button>
                    <button className="w-full flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors">
                      <Bell className="mr-3 h-4 w-4" />
                      Notificaciones
                    </button>
                    <div className="border-t border-border my-1"></div>
                    <button 
                      onClick={logout}
                      className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Usuario expandido */
            <>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar || undefined} alt={user?.username} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-medium">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "text-left transition-opacity duration-300",
                    isExpanded ? "opacity-100" : "opacity-0"
                  )}>
                    <p className="text-sm font-medium text-foreground whitespace-nowrap">{user?.username || 'Usuario'}</p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{user?.email || 'usuario@email.com'}</p>
                  </div>
                </div>
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-all duration-200",
                    isUserMenuOpen && "transform rotate-180",
                    isExpanded ? "opacity-100" : "opacity-0"
                  )} 
                />
              </button>

              {/* Menu desplegable del usuario expandido */}
              {isUserMenuOpen && isExpanded && (
                <div className="mt-2 space-y-1">
                  <button className="w-full flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors">
                    <User className="mr-3 h-4 w-4" />
                    <span className="whitespace-nowrap">Perfil</span>
                  </button>
                  <button className="w-full flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg transition-colors">
                    <Bell className="mr-3 h-4 w-4" />
                    <span className="whitespace-nowrap">Notificaciones</span>
                  </button>
                  <div className="border-t border-border/60 my-1"></div>
                  <button 
                    onClick={logout}
                    className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="whitespace-nowrap">Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
      
      {/* Overlay para móviles cuando el sidebar está expandido */}
      {isMobile && isExpanded && (
        <div 
          className="fixed inset-0 top-16 bg-black/20 z-30"
          onClick={() => setIsMobileExpanded(false)}
        />
      )}
    </>
  );
}