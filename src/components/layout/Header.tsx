import { User, LogOut, Bot, Menu } from 'lucide-react';
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

export function Header() {
  const { user, logout } = useAuthStore();
  const { toggleMobileSidebar } = useSidebarContext();
  const navigate = useNavigate();
  const isMobile = useMobile();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between pl-3 pr-6">
        <div className="flex items-center space-x-4">
          {/* Botón toggle para móviles */}
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleMobileSidebar}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <div className="flex items-center space-x-3 px-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              DashboardAI
            </h1>
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
                  <AvatarImage src={user?.avatar || undefined} alt={user?.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
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