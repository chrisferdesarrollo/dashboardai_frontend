import React, { useState } from 'react';
import { Mail, RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react';
import { authService } from '@/services/authService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EmailVerificationPendingProps {
  email: string;
  onBackToLogin: () => void;
}

export const EmailVerificationPending: React.FC<EmailVerificationPendingProps> = ({
  email,
  onBackToLogin
}) => {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResendEmail = async () => {
    setIsResending(true);
    setMessage(null);

    try {
      const response = await authService.resendVerificationEmail(email);
      setMessage({
        type: 'success',
        text: 'Email de verificación reenviado correctamente'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error al reenviar email'
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
          <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-2xl font-bold">Verifica tu email</CardTitle>
        <CardDescription>
          Te hemos enviado un email de verificación a:
          <br />
          <span className="text-blue-600 dark:text-blue-400 font-semibold">
            {email}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Pasos a seguir:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-300">
                <li>Revisa tu bandeja de entrada</li>
                <li>Busca el email de DashboardAI</li>
                <li>Haz clic en el enlace de verificación</li>
                <li>Regresa aquí para iniciar sesión</li>
              </ol>
            </div>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="relative pr-12">
            {message.type === 'error' ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertTitle>{message.type === 'error' ? 'Error' : 'Éxito'}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-transparent hover:opacity-70 flex items-center justify-center"
              onClick={() => setMessage(null)}
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleResendEmail}
            disabled={isResending}
            variant="outline"
            className="w-full"
          >
            {isResending ? (
              <>
                <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Reenviando...
              </>
            ) : (
              <>
                <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
                Reenviar email
              </>
            )}
          </Button>

          <Button
            onClick={onBackToLogin}
            variant="link"
            className="w-full"
          >
            Volver al login
          </Button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              ¿No encuentras el email? Revisa tu carpeta de spam o promociones.
              El enlace expira en 24 horas.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
