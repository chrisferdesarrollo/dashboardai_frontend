import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Settings, 
  Globe,
  Database,
  Zap
} from 'lucide-react';
import { testN8nConnection, getN8nWorkflows } from '@/services/n8nProxyService';

interface ConnectionTestResult {
  success: boolean;
  data?: Record<string, unknown> | unknown[];
  error?: string;
  timestamp?: string;
}

export const N8nConnectionTest: React.FC = () => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingWorkflows, setIsTestingWorkflows] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [workflowsResult, setWorkflowsResult] = useState<ConnectionTestResult | null>(null);

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);
    
    try {
      const result = await testN8nConnection();
      setConnectionResult({
        ...result,
        timestamp: new Date().toLocaleString()
      });
    } catch (error) {
      setConnectionResult({
        success: false,
        error: 'Error interno al probar la conexión',
        timestamp: new Date().toLocaleString()
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testWorkflows = async () => {
    setIsTestingWorkflows(true);
    setWorkflowsResult(null);
    
    try {
      const result = await getN8nWorkflows();
      setWorkflowsResult({
        ...result,
        timestamp: new Date().toLocaleString()
      });
    } catch (error) {
      setWorkflowsResult({
        success: false,
        error: 'Error interno al obtener workflows',
        timestamp: new Date().toLocaleString()
      });
    } finally {
      setIsTestingWorkflows(false);
    }
  };

  const renderTestResult = (result: ConnectionTestResult | null, testType: string) => {
    if (!result) return null;

    return (
      <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
        <div className="flex items-start gap-2">
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
          )}
          <div className="flex-1">
            <AlertDescription>
              <div className="font-medium mb-1">
                {result.success ? `✅ ${testType} exitoso` : `❌ ${testType} falló`}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {result.timestamp}
              </div>
              {result.error && (
                <div className="text-sm text-red-600 bg-red-100 p-2 rounded">
                  <strong>Error:</strong> {result.error}
                </div>
              )}
              {result.success && result.data && (
                <div className="text-sm text-green-600 bg-green-100 p-2 rounded">
                  <strong>Respuesta:</strong>
                  <pre className="mt-1 text-xs overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    );
  };

  return (
    <div className="space-y-6">
      {/* Información de configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración actual de n8n
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-blue-600" />
            <span className="font-medium">URL VPS:</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              https://topias.app
            </code>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-orange-600" />
            <span className="font-medium">Webhook Base:</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              https://topias.app:5678/webhook
            </code>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-green-600" />
            <span className="font-medium">API Base:</span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              https://topias.app/n8n/api/v1
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Test de conexión */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Test de Conexión a n8n VPS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={testConnection}
              disabled={isTestingConnection}
              className="flex items-center gap-2"
            >
              {isTestingConnection ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              {isTestingConnection ? 'Probando...' : 'Probar Conexión'}
            </Button>
            
            <Button 
              onClick={testWorkflows}
              disabled={isTestingWorkflows}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isTestingWorkflows ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {isTestingWorkflows ? 'Obteniendo...' : 'Obtener Workflows'}
            </Button>
          </div>

          {/* Resultados */}
          {renderTestResult(connectionResult, 'Test de conexión')}
          {renderTestResult(workflowsResult, 'Obtención de workflows')}
        </CardContent>
      </Card>

      {/* Información de ayuda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-700">
            💡 Información del Test
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Test de Conexión:</strong> Verifica que el dashboard pueda comunicarse con tu n8n en el VPS.
          </p>
          <p>
            <strong>Obtener Workflows:</strong> Prueba obtener la lista de workflows desde la API de n8n.
          </p>
          <p className="text-orange-600">
            <strong>Nota:</strong> Si las pruebas fallan, verifica que n8n esté ejecutándose en el VPS y que no haya restricciones de CORS.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default N8nConnectionTest;
