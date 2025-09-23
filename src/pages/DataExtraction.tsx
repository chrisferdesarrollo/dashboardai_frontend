import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useConversationStore } from '@/store/conversationStore';
import { useAgentStore } from '@/store/agentStore';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Filter,
  Calendar,
  MessageSquare,
  Users,
  Bot,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface ExtractionFilter {
  dateRange: DateRange | undefined;
  platforms: string[];
  agents: string[];
  status: string[];
  includeMessages: boolean;
  includeContacts: boolean;
  includeAnalytics: boolean;
  searchQuery: string;
}

export default function DataExtraction() {
  const { 
    conversations, 
    loading, 
    fetchConversations,
    contentSearchResults,
    contentSearchLoading,
    contentSearchQuery,
    searchContent,
    clearContentSearch,
    exportContentSearchResults
  } = useConversationStore();
  const { agents, fetchAgents } = useAgentStore();
  
  const [filters, setFilters] = useState<ExtractionFilter>({
    dateRange: undefined,
    platforms: [],
    agents: [],
    status: [],
    includeMessages: true,
    includeContacts: true,
    includeAnalytics: false,
    searchQuery: '',
  });

  const [showContentSearch, setShowContentSearch] = useState(false);

  useEffect(() => {
    fetchConversations();
    fetchAgents();
  }, [fetchConversations, fetchAgents]);

  const platformOptions = [
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'telegram', label: 'Telegram' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Activa' },
    { value: 'resolved', label: 'Resuelta' },
    { value: 'pending', label: 'Pendiente' },
  ];

  const handlePlatformChange = (platform: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      platforms: checked 
        ? [...prev.platforms, platform]
        : prev.platforms.filter(p => p !== platform)
    }));
  };

  const handleAgentChange = (agentId: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      agents: checked 
        ? [...prev.agents, agentId]
        : prev.agents.filter(a => a !== agentId)
    }));
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      status: checked 
        ? [...prev.status, status]
        : prev.status.filter(s => s !== status)
    }));
  };

  const handleContentSearch = async () => {
    if (!filters.searchQuery.trim()) {
      clearContentSearch();
      setShowContentSearch(false);
      return;
    }

    const searchFilters = {
      platform: (filters.platforms.length === 1 ? filters.platforms[0] : 'all') as 'all' | 'whatsapp' | 'telegram',
      dateRange: {
        from: filters.dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: filters.dateRange?.to || new Date()
      }
    };

    await searchContent(filters.searchQuery, searchFilters);
    setShowContentSearch(true);
  };

  const handleClearSearch = () => {
    setFilters(prev => ({ ...prev, searchQuery: '' }));
    clearContentSearch();
    setShowContentSearch(false);
  };

  const clearFilters = () => {
    setFilters({
      dateRange: undefined,
      platforms: [],
      agents: [],
      status: [],
      includeMessages: true,
      includeContacts: true,
      includeAnalytics: false,
      searchQuery: '',
    });
    clearContentSearch();
    setShowContentSearch(false);
  };

  const getFilteredConversations = () => {
    return conversations.filter(conv => {
      // Filtro por fechas
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const convDate = new Date(conv.createdAt);
        if (filters.dateRange.from && convDate < filters.dateRange.from) return false;
        if (filters.dateRange.to && convDate > filters.dateRange.to) return false;
      }

      // Filtro por plataformas
      if (filters.platforms.length > 0 && !filters.platforms.includes(conv.platform)) {
        return false;
      }

      // Filtro por agentes
      if (filters.agents.length > 0 && !filters.agents.includes(conv.agentId)) {
        return false;
      }

      // Filtro por estado
      if (filters.status.length > 0 && !filters.status.includes(conv.status)) {
        return false;
      }

      return true;
    });
  };

  const filteredConversations = getFilteredConversations();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Extracción de Datos</h1>
          <p className="text-muted-foreground mt-2">
            Exporta y analiza los datos de tus conversaciones
          </p>
        </div>
        <Button 
          onClick={() => fetchConversations()} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Filtros */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
            <CardDescription>
              Configura los filtros para la extracción
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Rango de fechas */}
            <div className="space-y-2">
              <Label>Rango de fechas</Label>
              <DatePickerWithRange
                date={filters.dateRange}
                onDateChange={(dateRange) => setFilters(prev => ({ ...prev, dateRange }))}
              />
            </div>

            {/* Plataformas */}
            <div className="space-y-3">
              <Label>Plataformas</Label>
              {platformOptions.map(platform => (
                <div key={platform.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`platform-${platform.value}`}
                    checked={filters.platforms.includes(platform.value)}
                    onCheckedChange={(checked) => 
                      handlePlatformChange(platform.value, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`platform-${platform.value}`}
                    className="text-sm font-normal"
                  >
                    {platform.label}
                  </Label>
                </div>
              ))}
            </div>

            {/* Agentes */}
            <div className="space-y-3">
              <Label>Agentes</Label>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {agents.map(agent => (
                  <div key={agent.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`agent-${agent.id}`}
                      checked={filters.agents.includes(agent.id)}
                      onCheckedChange={(checked) => 
                        handleAgentChange(agent.id, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`agent-${agent.id}`}
                      className="text-sm font-normal"
                    >
                      {agent.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Estados */}
            <div className="space-y-3">
              <Label>Estados</Label>
              {statusOptions.map(status => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={filters.status.includes(status.value)}
                    onCheckedChange={(checked) => 
                      handleStatusChange(status.value, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`status-${status.value}`}
                    className="text-sm font-normal"
                  >
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>

            <Separator />

            {/* Opciones de inclusión */}
            <div className="space-y-3">
              <Label>Incluir en la exportación</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-messages"
                  checked={filters.includeMessages}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, includeMessages: checked as boolean }))
                  }
                />
                <Label htmlFor="include-messages" className="text-sm font-normal">
                  Datos de mensajes
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-contacts"
                  checked={filters.includeContacts}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, includeContacts: checked as boolean }))
                  }
                />
                <Label htmlFor="include-contacts" className="text-sm font-normal">
                  Información completa de contactos
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-analytics"
                  checked={filters.includeAnalytics}
                  onCheckedChange={(checked) => 
                    setFilters(prev => ({ ...prev, includeAnalytics: checked as boolean }))
                  }
                />
                <Label htmlFor="include-analytics" className="text-sm font-normal">
                  Métricas y analíticas
                </Label>
              </div>
            </div>

            <Separator />

            {/* Búsqueda de contenido */}
            <div className="space-y-3">
              <Label>Búsqueda de contenido en conversaciones</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Buscar texto en mensajes..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleContentSearch();
                    }
                  }}
                />
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleContentSearch}
                    disabled={contentSearchLoading || !filters.searchQuery.trim()}
                    className="flex items-center space-x-1"
                  >
                    {contentSearchLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Buscando...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        <span>Buscar</span>
                      </>
                    )}
                  </Button>
                  {showContentSearch && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleClearSearch}
                      className="flex items-center space-x-1"
                    >
                      <span>Limpiar</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="w-full"
            >
              Limpiar filtros
            </Button>
          </CardContent>
        </Card>

        {/* Estadísticas y exportación */}
        <div className="md:col-span-2 space-y-6">
          {/* Estadísticas */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Conversaciones</p>
                    <p className="text-2xl font-bold">{filteredConversations.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Contactos únicos</p>
                    <p className="text-2xl font-bold">
                      {new Set(filteredConversations.map(c => c.contact.id)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Agentes activos</p>
                    <p className="text-2xl font-bold">
                      {new Set(filteredConversations.map(c => c.agentId)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resultados de búsqueda de contenido */}
          {showContentSearch && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Resultados de búsqueda: "{contentSearchQuery}"
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {contentSearchResults.length} resultado{contentSearchResults.length !== 1 ? 's' : ''}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportContentSearchResults('csv')}
                      disabled={contentSearchResults.length === 0}
                      className="flex items-center gap-1"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportContentSearchResults('json')}
                      disabled={contentSearchResults.length === 0}
                      className="flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      JSON
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Mensajes que contienen el texto buscado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contentSearchLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                    <span>Buscando contenido...</span>
                  </div>
                ) : contentSearchResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron mensajes que contengan "{contentSearchQuery}"
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {contentSearchResults.slice(0, 50).map((result) => (
                      <div key={result.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <Badge variant={result.platform === 'whatsapp' ? 'default' : 'secondary'}>
                              {result.platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
                            </Badge>
                            <span>{result.phone}</span>
                            <span>{result.userName}</span>
                            <span>•</span>
                            <span>{result.agentName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{format(result.createdAt, 'dd/MM/yyyy')}</span>
                            <span>{format(result.createdAt, 'HH:mm')}</span>
                            <Badge variant={result.type === 'user' ? 'outline' : 'default'}>
                              {result.type === 'user' ? 'Usuario' : 'IA'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm">
                          <p className="line-clamp-3">{result.content}</p>
                        </div>
                      </div>
                    ))}
                    {contentSearchResults.length > 50 && (
                      <div className="text-center py-4 text-muted-foreground">
                        Mostrando los primeros 50 resultados de {contentSearchResults.length}. 
                        Exporta para ver todos los resultados.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}