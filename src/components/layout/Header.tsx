import { User, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import { useMobile } from '@/hooks/use-mobile';
import { useSidebarContext } from '@/hooks/useSidebarContext';
import { useState, useEffect } from 'react';

export function Header() {
  const { user, logout } = useAuthStore();
  const { toggleMobileSidebar } = useSidebarContext();
  const navigate = useNavigate();
  const isMobile = useMobile();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Construir URL del avatar desde el backend
  useEffect(() => {
    const buildAvatarUrl = async () => {
      if (user?.avatar) {
        console.log('🔍 Avatar raw value:', user.avatar);
        
        // Verificar si ya es una URL completa
        if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
          console.log('✅ Avatar es URL completa:', user.avatar);
          setAvatarUrl(user.avatar);
        } else if (user.avatar.startsWith('/')) {
          // Si comienza con /, es una ruta relativa del backend
          const backendUrl = import.meta.env.DEV 
            ? 'http://localhost:8080' 
            : window.location.origin;
          const fullUrl = `${backendUrl}${user.avatar}`;
          console.log('🔨 Avatar URL construida (con /):', fullUrl);
          setAvatarUrl(fullUrl);
        } else {
          // Si no tiene /, asumimos que es solo el nombre del archivo
          const backendUrl = import.meta.env.DEV 
            ? 'http://localhost:8080' 
            : window.location.origin;
          const fullUrl = `${backendUrl}/uploads/avatars/${user.avatar}`;
          console.log('🔨 Avatar URL construida (sin /):', fullUrl);
          setAvatarUrl(fullUrl);
        }
      } else {
        console.log('❌ No hay avatar en user');
        setAvatarUrl(undefined);
      }
    };

    buildAvatarUrl();
  }, [user?.avatar]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between pl-0 pr-6">
        <div className="flex items-center space-x-3">
          {/* Botón toggle para móviles */}
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleMobileSidebar}
              className="md:hidden ml-3"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex items-center justify-center w-16 md:w-16 shrink-0">
            <img 
              src="/iconoTopias.png" 
              alt="TopIA's Logo" 
              className="h-16 w-16 object-contain logo-animated"
            />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="brand-logo">
              TOPIA<span className="brand-logo-apostrophe">'</span>S
            </h1>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
              BETA
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notificaciones */}
          <NotificationBell />

          {/* Toggle de tema */}
          <ThemeToggle />

          {/* Usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl} alt={user?.username} />
                  <AvatarFallback className="bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800 font-semibold">
                    {user ? getUserInitials(user.username) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              {user && (
                <>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}