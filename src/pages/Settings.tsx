import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Webhook, Server, Key, Save, TestTube, Zap } from 'lucide-react';
import configService from '@/services/configService';
import N8nConnectionTest from '@/components/settings/N8nConnectionTest';

interface N8nConfig {
  webhookUrl: string;
  apiUrl: string;
  apiToken: string;
}

interface AppConfig {
  n8n: N8nConfig;
  backend: {
    apiUrl: string;
  };
}

export default function Settings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AppConfig>({
    n8n: {
      webhookUrl: '',
      apiUrl: '',
      apiToken: '',
    },
    backend: {
      apiUrl: '',
    },
  });
  
  const [loading, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const loadConfiguration = useCallback(async () => {
    try {
      // Cargar desde el backend
      const config = await configService.getConfig();
      setConfig(config);
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast({
        title: 'Error al cargar configuración',
        description: 'Se cargó la configuración por defecto.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      // Guardar en el backend
      await configService.saveConfig(config);

      toast({
        title: 'Configuración guardada',
        description: 'La configuración se ha guardado correctamente en el servidor.',
      });
    } catch (error) {
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar la configuración en el servidor.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const testN8nConnection = async () => {
    if (!config.n8n.apiUrl || !config.n8n.apiToken) {
      toast({
        title: 'Configuración incompleta',
        description: 'Asegúrate de completar la URL de la API y el token de n8n.',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setConnectionStatus('testing');
    
    try {
      const isConnected = await configService.testN8nConnection();
      
      if (isConnected) {
        setConnectionStatus('success');
        toast({
          title: 'Conexión exitosa',
          description: 'La conexión con n8n se ha establecido correctamente.',
        });
      } else {
        throw new Error('Respuesta no válida del servidor');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar con n8n. Verifica la URL y el token.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (section: keyof AppConfig, field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Badge variant="secondary">Probando...</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">No probado</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Configuración
        </h1>
        <p className="text-muted-foreground">
          Configura las conexiones y parámetros de la aplicación
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuración de n8n */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Configuración de n8n
            </CardTitle>
            <CardDescription>
              Configura la conexión con tu instancia de n8n para manejar workflows y webhooks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="webhookUrl">URL del Webhook</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://tu-n8n.com/webhook"
                value={config.n8n.webhookUrl}
                onChange={(e) => handleInputChange('n8n', 'webhookUrl', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL base para webhooks de n8n (sin el ID específico del workflow)
              </p>
            </div>

            <div>
              <Label htmlFor="n8nApiUrl">URL de la API</Label>
              <Input
                id="n8nApiUrl"
                type="url"
                placeholder="https://tu-n8n.com/api/v1"
                value={config.n8n.apiUrl}
                onChange={(e) => handleInputChange('n8n', 'apiUrl', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="n8nApiToken">Token de API</Label>
              <Input
                id="n8nApiToken"
                type="password"
                placeholder="n8n_api_token_here"
                value={config.n8n.apiToken}
                onChange={(e) => handleInputChange('n8n', 'apiToken', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Token de autenticación para acceder a la API de n8n
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Estado de conexión:</span>
                {getStatusBadge()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={testN8nConnection}
                disabled={testing}
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                {testing ? 'Probando...' : 'Probar conexión'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuración del Backend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Configuración del Backend
            </CardTitle>
            <CardDescription>
              Configura la conexión con el backend de DashboardAI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="backendApiUrl">URL de la API</Label>
              <Input
                id="backendApiUrl"
                type="url"
                placeholder="http://localhost:8080/api"
                value={config.backend.apiUrl}
                onChange={(e) => handleInputChange('backend', 'apiUrl', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL del backend de DashboardAI
              </p>
            </div>

            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                El backend utiliza autenticación JWT. Inicia sesión para obtener acceso automático.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Test de conexión n8n VPS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Test de Conexión n8n VPS
          </CardTitle>
          <CardDescription>
            Prueba la conexión con tu instancia de n8n en el VPS de Hostinger
          </CardDescription>
        </CardHeader>
        <CardContent>
          <N8nConnectionTest />
        </CardContent>
      </Card>

      {/* Información de ayuda */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Información de ayuda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Configuración de n8n:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>El webhook URL se usa para triggers de workflows</li>
                <li>La API URL permite gestionar workflows remotamente</li>
                <li>El token es necesario para autenticación</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Configuración del Backend:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>URL donde está ejecutándose el backend</li>
                <li>Por defecto es localhost:8080</li>
                <li>La autenticación se maneja automáticamente</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón de guardar */}
      <div className="flex justify-end">
        <Button
          onClick={saveConfiguration}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </div>
    </div>
  );
}
