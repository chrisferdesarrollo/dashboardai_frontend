import { NavLink } from 'react-router-dom';
import { 
  Bot, 
  Home, 
  Settings, 
  Activity, 
  Users,
  Database,
  BarChart3,
  Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Agentes', href: '/agents', icon: Bot },
  { name: 'Ejecuciones', href: '/executions', icon: Activity },
  { name: 'Workflows', href: '/workflows', icon: Zap },
  { name: 'Analíticas', href: '/analytics', icon: BarChart3 },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="flex h-screen w-64 flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">Agent Pilot</span>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <item.icon
              className="mr-3 h-5 w-5 flex-shrink-0"
              aria-hidden="true"
            />
            {item.name}
          </NavLink>
        ))}
      </nav>

      {/* Estado de conexión */}
      <div className="border-t border-border p-4">
        <div className="flex items-center space-x-2 text-sm">
          <div className="h-2 w-2 bg-success rounded-full"></div>
          <span className="text-muted-foreground">n8n Conectado</span>
        </div>
      </div>
    </div>
  );
}