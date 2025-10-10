import { useEffect, useState } from 'react';
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
  Play,
  MessageSquare
} from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { useConversationStore } from '@/store/conversationStore';
import { AgentCreationFlow } from '@/components/agents/AgentCreationFlow';
import { Agent } from '@/types/agent';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const { agents, fetchAgents, loading } = useAgentStore();
  const { conversations, fetchConversations, getConversationStats } = useConversationStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchConversations();
  }, [fetchAgents, fetchConversations]);

  // Cálculos para las métricas
  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const inactiveAgents = agents.filter(a => a.status === 'inactive').length;
  const errorAgents = agents.filter(a => a.status === 'error').length;
  
  // Estadísticas de conversaciones
  // Función para contar conversaciones de un agente específico
  const getAgentConversationsCount = (agent: Agent) => {
    return conversations.filter(conv => 
      conv.agentName === agent.name || 
      conv.agentId === agent.id ||
      conv.agentName.toLowerCase().includes(agent.name.toLowerCase())
    ).length;
  };

  const conversationStats = getConversationStats();
  const totalConversations = conversations.length;

  // Agentes recientes (últimos 5)
  const recentAgents = agents
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const statusConfig = {
    active: { color: 'bg-success', icon: CheckCircle },
    inactive: { color: 'bg-muted', icon: Clock },
    error: { color: 'bg-destructive', icon: XCircle },
  };

  // Función helper para obtener configuración de status de forma segura
  const getStatusConfig = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || {
      color: 'bg-muted',
      icon: Clock
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen general de tus agentes de IA y n8n
          </p>
        </div>
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
            <CardTitle className="text-sm font-medium">Conversaciones</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              {conversationStats.active} activas, {conversationStats.resolved} resueltas
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
                  const config = getStatusConfig(status);
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
                <Button 
                  className="mt-4 bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/70 dark:text-blue-300 dark:border-blue-800" 
                  onClick={() => setIsModalOpen(true)}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Crear Agente
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAgents.map((agent: Agent) => {
                  const config = getStatusConfig(agent.status);
                  return (
                    <div key={agent.id} className="flex items-center space-x-3">
                      <div className={`h-2 w-2 rounded-full ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>{getAgentConversationsCount(agent)} conversaciones</span>
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

      {/* Modal de creación de agente */}
      <AgentCreationFlow
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}