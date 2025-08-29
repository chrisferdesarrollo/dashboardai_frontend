import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Globe,
  Save,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  n8nConfigurationService, 
  N8nConfiguration, 
  N8nConfigurationRequest,
  TestConnectionResponse 
} from '@/services/n8nConfigurationService';

interface N8nConfigurationProps {
  onConfigurationSaved?: (config: N8nConfiguration) => void;
}

const N8nConfigurationComponent: React.FC<N8nConfigurationProps> = ({
  onConfigurationSaved
}) => {
  const [activeConfig, setActiveConfig] = useState<N8nConfiguration | null>(null);
  const [allConfigs, setAllConfigs] = useState<N8nConfiguration[]>([]);
  const [formData, setFormData] = useState<N8nConfigurationRequest>({
    n8nUrl: '',
    apiKey: ''
  });
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    setIsLoading(true);
    try {
      const [activeResponse, allResponse] = await Promise.all([
        n8nConfigurationService.getActiveConfiguration(),
        n8nConfigurationService.getAllConfigurations()
      ]);

      if (activeResponse.status === 'success' && activeResponse.data) {
        setActiveConfig(activeResponse.data);
        setFormData({
          n8nUrl: activeResponse.data.n8nUrl,
          apiKey: ''
        });
      }

      if (allResponse.status === 'success' && allResponse.data) {
        setAllConfigs(allResponse.data);
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
      setError('Error al cargar las configuraciones de N8n');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof N8nConfigurationRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
    setSuccess(null);
    setTestResult(null);
  };

  const validateForm = (): boolean => {
    if (!formData.n8nUrl.trim()) {
      setError('La URL de N8n es requerida');
      return false;
    }

    const validation = n8nConfigurationService.validateN8nUrl(formData.n8nUrl);
    if (!validation.isValid) {
      setError(validation.message || 'URL de N8n inválida');
      return false;
    }

    return true;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await n8nConfigurationService.testConnection({
        n8nUrl: formData.n8nUrl,
        apiKey: formData.apiKey || undefined
      });

      setTestResult(result);

      if (result.status === 'success') {
        setSuccess('¡Conexión exitosa con N8n!');
      } else {
        setError(`Error en la conexión: ${result.message}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setError('Error al probar la conexión con N8n');
      setTestResult({
        status: 'error',
        message: 'Error de red o servidor',
        server: formData.n8nUrl,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await n8nConfigurationService.saveConfiguration(formData);

      if (response.status === 'success' && response.data) {
        setSuccess('Configuración de N8n guardada exitosamente');
        setActiveConfig(response.data);
        loadConfigurations(); // Reload all configurations
        
        if (onConfigurationSaved) {
          onConfigurationSaved(response.data);
        }
      } else {
        setError(response.message || 'Error al guardar la configuración');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError('Error al guardar la configuración de N8n');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfiguration = async (configId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta configuración?')) {
      return;
    }

    try {
      const response = await n8nConfigurationService.deleteConfiguration(configId);
      
      if (response.status === 'success') {
        setSuccess('Configuración eliminada exitosamente');
        loadConfigurations();
        
        // If we deleted the active config, clear the form
        if (activeConfig?.id === configId) {
          setActiveConfig(null);
          setFormData({ n8nUrl: '', apiKey: '' });
        }
      } else {
        setError(response.message || 'Error al eliminar la configuración');
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      setError('Error al eliminar la configuración');
    }
  };

  const handleActivateConfiguration = async (configId: number) => {
    try {
      const response = await n8nConfigurationService.activateConfiguration(configId);
      
      if (response.status === 'success' && response.data) {
        setSuccess('Configuración activada exitosamente');
        setActiveConfig(response.data);
        setFormData({
          n8nUrl: response.data.n8nUrl,
          apiKey: ''
        });
        loadConfigurations();
      } else {
        setError(response.message || 'Error al activar la configuración');
      }
    } catch (error) {
      console.error('Error activating configuration:', error);
      setError('Error al activar la configuración');
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Exitoso</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Fallido</Badge>;
      default:
        return <Badge variant="secondary">Sin probar</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando configuraciones...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Configuración de N8n
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="n8nUrl">URL de N8n *</Label>
            <Input
              id="n8nUrl"
              type="url"
              placeholder="https://tu-n8n.ejemplo.com"
              value={formData.n8nUrl}
              onChange={(e) => handleInputChange('n8nUrl', e.target.value)}
              disabled={isSaving || isTesting}
            />
            <p className="text-sm text-muted-foreground">
              La URL completa de tu instancia de N8n (incluye http:// o https://)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key (Opcional)</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                placeholder="Tu API Key de N8n"
                value={formData.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                disabled={isSaving || isTesting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Solo necesaria si tu N8n requiere autenticación
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleTestConnection}
              disabled={isTesting || isSaving || !formData.n8nUrl.trim()}
              variant="outline"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Probar Conexión
            </Button>

            <Button
              onClick={handleSaveConfiguration}
              disabled={isSaving || isTesting || !formData.n8nUrl.trim()}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar Configuración
            </Button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className="mt-4 p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4" />
                <span className="font-medium">Resultado de la prueba:</span>
                {testResult.status === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Servidor:</strong> {testResult.server}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Mensaje:</strong> {testResult.message}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Timestamp:</strong> {new Date(testResult.timestamp).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Configuration */}
      {activeConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
              Configuración Activa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">URL de N8n</Label>
                <p className="text-sm text-muted-foreground">{activeConfig.n8nUrl}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Webhook Base</Label>
                <p className="text-sm text-muted-foreground">{activeConfig.webhookBase}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">API Base</Label>
                <p className="text-sm text-muted-foreground">{activeConfig.apiBase}</p>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-sm font-medium">Último Test</Label>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(activeConfig.lastTestStatus)}
                    {activeConfig.lastTestDate && (
                      <span className="text-sm text-muted-foreground">
                        {new Date(activeConfig.lastTestDate).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Configurations */}
      {allConfigs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Todas las Configuraciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allConfigs.map((config, index) => (
                <div key={config.id}>
                  {index > 0 && <Separator />}
                  <div className="flex items-center justify-between p-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{config.n8nUrl}</p>
                        {config.isActive && (
                          <Badge variant="default">Activa</Badge>
                        )}
                        {getStatusBadge(config.lastTestStatus)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Creada: {new Date(config.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!config.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivateConfiguration(config.id)}
                        >
                          Activar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteConfiguration(config.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default N8nConfigurationComponent;
