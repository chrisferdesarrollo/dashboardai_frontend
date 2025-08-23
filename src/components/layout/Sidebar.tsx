import { NavLink } from 'react-router-dom';
import { 
  Bot, 
  Home, 
  Settings, 
  Activity, 
  Users,
  Database,
  BarChart3,
  Zap,
  ChevronDown,
  User,
  LogOut,
  Bell,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect, useRef } from 'react';

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
      { name: 'Workflows', href: '/workflows', icon: Zap },
      { name: 'Ejecuciones', href: '/executions', icon: Activity },
    ]
  },
  {
    name: 'Datos',
    items: [
      { name: 'Base de Datos', href: '/database', icon: Database },
      { name: 'Analíticas', href: '/analytics', icon: BarChart3 },
    ]
  },
  {
    name: 'Configuración',
    items: [
      { name: 'Configuración', href: '/settings', icon: Settings },
      { name: 'Usuarios', href: '/users', icon: Users },
    ]
  }
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // El sidebar se expande solo con hover
  const isExpanded = isHovered;

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

  // Manejar hover del sidebar
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Cerrar menú de usuario al salir del hover
    setIsUserMenuOpen(false);
  };

  return (
    <div 
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "flex flex-col bg-background border-r border-border/60 transition-all duration-300 ease-in-out relative z-40",
        "h-[calc(100vh-4rem)]", // Resta la altura del header (4rem = 64px)
        isExpanded ? "w-64" : "w-16"
      )}
    >
      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <div className="space-y-6">
          {navigation.map((section) => (
            <div key={section.name}>
              <div className={cn(
                "transition-opacity duration-300",
                isExpanded ? "opacity-100" : "opacity-0"
              )}>
                {isExpanded && (
                  <h3 className="px-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-2 whitespace-nowrap">
                    {section.name}
                  </h3>
                )}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
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
                    <span className={cn(
                      "transition-opacity duration-300 whitespace-nowrap",
                      isExpanded ? "opacity-100" : "opacity-0"
                    )}>
                      {isExpanded && item.name}
                    </span>
                    
                    {/* Tooltip para modo colapsado */}
                    {!isExpanded && (
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
        {/* Estado de conexión */}
        <div className={cn(
          "transition-opacity duration-300",
          isExpanded ? "opacity-100" : "opacity-0"
        )}>
          {isExpanded && (
            <div className="px-6 py-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">Backend Conectado</span>
                </div>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Usuario */}
        <div className="p-3" ref={userMenuRef}>
          {!isExpanded ? (
            /* Avatar simple para modo colapsado */
            <div className="relative group">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
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
                      <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
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
                  <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
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
  );
}