import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const EmailVerification: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Token de verificación no válido');
        return;
      }

      try {
        const response = await authService.verifyEmail(token);
        setStatus('success');
        setMessage(response.message || 'Email verificado correctamente');
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate('/auth', { 
            state: { 
              message: 'Email verificado. Ya puedes iniciar sesión',
              type: 'success'
            }
          });
        }, 3000);
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Error al verificar email');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-blue-600 dark:text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-600 dark:text-red-400" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'loading':
        return 'Verificando email...';
      case 'success':
        return '¡Email verificado!';
      case 'error':
        return 'Error de verificación';
    }
  };

  const getDescription = () => {
    switch (status) {
      case 'loading':
        return 'Por favor espera mientras verificamos tu email';
      case 'success':
        return 'Tu email ha sido verificado correctamente. Serás redirigido al login en unos segundos.';
      case 'error':
        return 'Hubo un problema al verificar tu email. Por favor intenta nuevamente.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center w-24 h-24 mb-6">
            {getIcon()}
          </div>
          
          <CardTitle className="text-2xl font-bold">
            {getTitle()}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-6">
          <p className="text-gray-600 dark:text-gray-400">
            {getDescription()}
          </p>

          {message && (
            <Alert variant={status === 'success' ? 'default' : 'destructive'}>
              {status === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {status === 'success' ? 'Verificación exitosa' : 'Error de verificación'}
              </AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Volver al registro
              </Button>
              
              <Button
                onClick={() => navigate('/auth')}
                variant="outline"
                className="w-full"
              >
                Ir al login
              </Button>
            </div>
          )}

          {status === 'success' && (
            <div>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Ir al login ahora
              </Button>
            </div>
          )}

          {status === 'loading' && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Esto puede tomar unos segundos...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
