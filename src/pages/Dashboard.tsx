import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bot, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  AlertTriangle,
  Play
} from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { Agent } from '@/types/agent';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const { agents, fetchAgents, loading } = useAgentStore();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Cálculos para las métricas
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const inactiveAgents = agents.filter(a => a.status === 'inactive').length;
  const errorAgents = agents.filter(a => a.status === 'error').length;
  const totalExecutions = agents.reduce((sum, agent) => sum + agent.totalExecutions, 0);

  // Agentes recientes (últimos 5)
  const recentAgents = agents
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const statusConfig = {
    active: { color: 'bg-success', icon: CheckCircle },
    inactive: { color: 'bg-muted', icon: Clock },
    error: { color: 'bg-destructive', icon: XCircle },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen general de tus agentes de IA y n8n
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agentes</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgents}</div>
            <p className="text-xs text-muted-foreground">
              {activeAgents} activos, {inactiveAgents} inactivos
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ejecuciones</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions}</div>
            <p className="text-xs text-muted-foreground">
              Total de ejecuciones
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeAgents}</div>
            <p className="text-xs text-muted-foreground">
              Agentes en funcionamiento
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Errores</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{errorAgents}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de agentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Estado de Agentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-4 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries({
                  active: { label: 'Activos', count: activeAgents },
                  inactive: { label: 'Inactivos', count: inactiveAgents },
                  error: { label: 'Con errores', count: errorAgents },
                }).map(([status, { label, count }]) => {
                  const config = statusConfig[status as keyof typeof statusConfig];
                  const percentage = totalAgents > 0 ? (count / totalAgents) * 100 : 0;
                  
                  return (
                    <div key={status} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <config.icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${config.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agentes recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Actividad Reciente</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/agents'}>
                Ver todos
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                      <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentAgents.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No hay agentes creados</p>
                <Button className="mt-4" onClick={() => window.location.href = '/agents'}>
                  <Play className="mr-2 h-4 w-4" />
                  Crear Agente
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAgents.map((agent: Agent) => {
                  const config = statusConfig[agent.status];
                  return (
                    <div key={agent.id} className="flex items-center space-x-3">
                      <div className={`h-2 w-2 rounded-full ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{agent.totalExecutions} ejecuciones</span>
                          {agent.lastExecution && (
                            <>
                              <span>•</span>
                              <span>
                                {formatDistanceToNow(agent.lastExecution, { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${config.color} text-white border-none`}
                      >
                        {agent.status === 'active' ? 'Activo' : 
                         agent.status === 'inactive' ? 'Inactivo' : 'Error'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}