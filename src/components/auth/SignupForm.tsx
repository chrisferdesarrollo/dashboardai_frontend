import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle, WifiOff, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { EmailVerificationPending } from './EmailVerificationPending';

const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(20, 'El usuario no puede tener más de 20 caracteres'),
  email: z
    .string()
    .email('Debe ser un email válido')
    .max(50, 'El email no puede tener más de 50 caracteres'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(40, 'La contraseña no puede tener más de 40 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  onSwitchToLogin?: () => void;
}

export const SignupForm = ({ onSwitchToLogin }: SignupFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailVerificationPending, setEmailVerificationPending] = useState<string | null>(null);
  
  const { signup, isLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
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

  const onSubmit = async (data: SignupFormData) => {
    try {
      setError(null);
      setSuccess(null);
      
      const response = await signup({
        username: data.username,
        email: data.email,
        password: data.password,
        role: ['user'], // Por defecto asignar rol de usuario
      });
      
      // Verificar si requiere verificación de email
      if (response.requiresEmailVerification) {
        setEmailVerificationPending(data.email);
      } else {
        setSuccess(response.message || 'Usuario registrado correctamente');
        reset();
        
        // Cambiar al formulario de login después de 2 segundos
        if (onSwitchToLogin) {
          setTimeout(() => {
            onSwitchToLogin();
          }, 2000);
        }
      }
    } catch (err) {
      let errorMessage = 'Error desconocido al registrar usuario';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  // Si está pendiente la verificación de email, mostrar componente especial
  if (emailVerificationPending) {
    return (
      <EmailVerificationPending
        email={emailVerificationPending}
        onBackToLogin={() => {
          setEmailVerificationPending(null);
          if (onSwitchToLogin) {
            onSwitchToLogin();
          }
        }}
      />
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Crear Cuenta</CardTitle>
        <CardDescription className="text-center">
          Completa los datos para crear tu cuenta
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant={getErrorVariant(error)} className="relative pr-12">
              {getErrorIcon(error)}
              <AlertTitle>Error de registro</AlertTitle>
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
          
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800 relative pr-12">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>¡Registro exitoso!</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-transparent hover:opacity-70 flex items-center justify-center"
                onClick={() => setSuccess(null)}
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
              placeholder="Nombre de usuario (3-20 caracteres)"
              {...register('username')}
              disabled={isLoading}
              onFocus={() => setError(null)}
              onChange={(e) => {
                setError(null);
                const { onChange } = register('username');
                onChange(e);
              }}
            />
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              {...register('email')}
              disabled={isLoading}
              onFocus={() => setError(null)}
              onChange={(e) => {
                setError(null);
                const { onChange } = register('email');
                onChange(e);
              }}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña (mínimo 6 caracteres)"
                {...register('password')}
                disabled={isLoading}
                onFocus={() => setError(null)}
                onChange={(e) => {
                  setError(null);
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
                disabled={isLoading}
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirma tu contraseña"
                {...register('confirmPassword')}
                disabled={isLoading}
                onFocus={() => setError(null)}
                onChange={(e) => {
                  setError(null);
                  const { onChange } = register('confirmPassword');
                  onChange(e);
                }}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !!success}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando cuenta...
              </>
            ) : success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Cuenta creada
              </>
            ) : (
              'Crear Cuenta'
            )}
          </Button>
          
          {onSwitchToLogin && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={onSwitchToLogin}
                disabled={isLoading}
              >
                Inicia sesión aquí
              </Button>
            </div>
          )}
        </CardFooter>
      </form>
    </Card>
  );
};
