import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, AlertCircle, Wifi, WifiOff, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';

const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSwitchToSignup?: () => void;
}

export const LoginForm = ({ onSwitchToSignup }: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  
  const { login, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Función para determinar el tipo de error y mostrar el ícono apropiado
  const getErrorIcon = (errorMessage: string) => {
    if (errorMessage.includes('conexión') || errorMessage.includes('servidor')) {
      return <WifiOff className="h-4 w-4" />;
    }
    return <AlertCircle className="h-4 w-4" />;
  };

  // Función para determinar si el error es crítico o de conexión
  const getErrorVariant = (errorMessage: string) => {
    if (errorMessage.includes('conexión') || errorMessage.includes('servidor')) {
      return 'default' as const;
    }
    return 'destructive' as const;
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      console.log('🔵 LoginForm: Iniciando submit del formulario');
      console.log('🔵 LoginForm: Datos del formulario:', { username: data.username });
      
      // Limpiar errores previos y marcar como enviando
      setError(null);
      setIsSubmitting(true);
      
      await login({
        username: data.username,
        password: data.password,
      });
      
      console.log('✅ LoginForm: Login exitoso, navegando al dashboard');
      setIsSubmitting(false);
      navigate('/');
    } catch (err) {
      console.error('❌ LoginForm: Error capturado:', err);
      setIsSubmitting(false);
      
      let errorMessage = 'Error desconocido al iniciar sesión';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      console.error('❌ LoginForm: Mensaje de error a mostrar:', errorMessage);
      setError(errorMessage);
      
      // No auto-limpiar el error para que el usuario pueda leerlo
      // El error se limpiará solo cuando se intente enviar el formulario nuevamente
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
        <CardDescription className="text-center">
          Ingresa tus credenciales para acceder al dashboard
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant={getErrorVariant(error)} className="relative pr-12">
              {getErrorIcon(error)}
              <AlertTitle>Error de autenticación</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-transparent hover:opacity-70 flex items-center justify-center"
                onClick={() => setError(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              type="text"
              placeholder="Ingresa tu usuario"
              {...register('username')}
              disabled={isLoading || isSubmitting}
              onFocus={() => setError(null)}
              onChange={(e) => {
                setError(null);
                // Llamar al onChange original del register
                const { onChange } = register('username');
                onChange(e);
              }}
            />
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                {...register('password')}
                disabled={isLoading || isSubmitting}
                onFocus={() => setError(null)}
                onChange={(e) => {
                  setError(null);
                  // Llamar al onChange original del register
                  const { onChange } = register('password');
                  onChange(e);
                }}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900/70 dark:text-blue-300 dark:border-blue-800" 
            disabled={isLoading || isSubmitting}
          >
            {(isLoading || isSubmitting) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </Button>
          
          {onSwitchToSignup && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">¿No tienes cuenta? </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={onSwitchToSignup}
                disabled={isLoading}
              >
                Regístrate aquí
              </Button>
            </div>
          )}
        </CardFooter>
      </form>
    </Card>
  );
};
