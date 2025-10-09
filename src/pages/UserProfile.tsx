import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { userProfileService } from '@/services/userProfileService';
import { 
  User, 
  Mail, 
  Lock, 
  Camera, 
  Calendar,
  Shield,
  Save,
  Eye,
  EyeOff,
  Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
];

export default function UserProfile() {
  const { user, refreshUser } = useAuthStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para los formularios
  const [email, setEmail] = useState(user?.email || '');
  const [emailCurrentPassword, setEmailCurrentPassword] = useState(''); // Contraseña para cambio de email
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados de carga
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  // Cargar perfil completo al montar el componente
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await userProfileService.getUserProfile();
        // Actualizar el estado local con los datos del perfil
        setEmail(profile.email);
      } catch (error) {
        console.error('Error al cargar perfil:', error);
      }
    };

    if (user) {
      loadUserProfile();
    }
  }, [user]);

  if (!user) return null;

  const handleEmailUpdate = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "El email no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    if (!emailCurrentPassword) {
      toast({
        title: "Error",
        description: "Ingresa tu contraseña actual para cambiar el email",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingEmail(true);
    try {
      await userProfileService.updateEmail({
        newEmail: email,
        currentPassword: emailCurrentPassword,
      });
      
      // Actualizar el usuario en el store
      await refreshUser();
      
      toast({
        title: "Email actualizado",
        description: "Tu email ha sido actualizado correctamente",
      });
    } catch (error) {
      let errorMessage = "No se pudo actualizar el email";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingEmail(false);
      setEmailCurrentPassword(''); // Limpiar contraseña
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Todos los campos de contraseña son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La nueva contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await userProfileService.updatePassword({
        currentPassword,
        newPassword,
      });
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada correctamente",
      });
    } catch (error) {
      let errorMessage = "No se pudo actualizar la contraseña";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAvatarSelect = (avatarUrl: string) => {
    setSelectedAvatar(avatarUrl);
    setCustomAvatar(null);
  };

  const handleCustomAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCustomAvatar(result);
        setSelectedAvatar(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpdate = async () => {
    const avatarToUpdate = customAvatar || selectedAvatar;
    
    if (!avatarToUpdate) {
      toast({
        title: "Error",
        description: "Selecciona un avatar primero",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingAvatar(true);
    try {
      if (customAvatar) {
        // Convertir base64 a File
        const response = await fetch(customAvatar);
        const blob = await response.blob();
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        
        await userProfileService.updateAvatar({ avatarFile: file });
      } else if (selectedAvatar) {
        await userProfileService.updateAvatar({ avatarUrl: selectedAvatar });
      }
      
      // Actualizar el usuario en el store
      await refreshUser();
      
      toast({
        title: "Avatar actualizado",
        description: "Tu avatar ha sido actualizado correctamente",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "No se pudo actualizar el avatar";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const getCurrentAvatar = () => {
    if (customAvatar) return customAvatar;
    if (selectedAvatar) return selectedAvatar;
    return null; // Usará el fallback del Avatar component
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Mi Perfil</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Información del Usuario */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={getCurrentAvatar() || undefined} />
                  <AvatarFallback className="text-lg">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{user.username}</h3>
                  <p className="text-muted-foreground text-sm">{user.email}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Miembro desde</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Roles</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.roles?.map((role, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Estado del Email</p>
                    <Badge 
                      variant={user.emailVerified ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {user.emailVerified ? "Verificado" : "Sin verificar"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formularios de Actualización */}
          <div className="md:col-span-2 space-y-6">
            {/* Actualizar Avatar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Avatar
                </CardTitle>
                <CardDescription>
                  Selecciona un avatar predeterminado o sube tu propia imagen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Avatares predeterminados</Label>
                  <div className="grid grid-cols-6 gap-3 mt-2">
                    {DEFAULT_AVATARS.map((avatar, index) => (
                      <button
                        key={index}
                        onClick={() => handleAvatarSelect(avatar)}
                        className={cn(
                          "relative rounded-full overflow-hidden border-2 transition-all hover:scale-105",
                          selectedAvatar === avatar
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={avatar} />
                          <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">O sube tu propia imagen</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Subir imagen
                    </Button>
                    {customAvatar && (
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={customAvatar} />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCustomAvatarUpload}
                    className="hidden"
                  />
                </div>

                <Button
                  onClick={handleAvatarUpdate}
                  disabled={!selectedAvatar && !customAvatar || isUpdatingAvatar}
                  className="w-full"
                >
                  {isUpdatingAvatar ? (
                    "Actualizando..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Actualizar Avatar
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Actualizar Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email
                </CardTitle>
                <CardDescription>
                  Actualiza tu dirección de correo electrónico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Nuevo Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu-email@ejemplo.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email-password">Contraseña Actual</Label>
                  <div className="relative">
                    <Input
                      id="email-password"
                      type={showEmailPassword ? "text" : "password"}
                      value={emailCurrentPassword}
                      onChange={(e) => setEmailCurrentPassword(e.target.value)}
                      placeholder="Tu contraseña actual para confirmar el cambio"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowEmailPassword(!showEmailPassword)}
                    >
                      {showEmailPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button
                  onClick={handleEmailUpdate}
                  disabled={email === user.email || !emailCurrentPassword || isUpdatingEmail}
                  className="w-full"
                >
                  {isUpdatingEmail ? (
                    "Actualizando..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Actualizar Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Actualizar Contraseña */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Contraseña
                </CardTitle>
                <CardDescription>
                  Cambia tu contraseña actual por una nueva
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Contraseña Actual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Tu contraseña actual"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-password">Nueva Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tu nueva contraseña"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirma tu nueva contraseña"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handlePasswordUpdate}
                  disabled={!currentPassword || !newPassword || !confirmPassword || isUpdatingPassword}
                  className="w-full"
                >
                  {isUpdatingPassword ? (
                    "Actualizando..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Actualizar Contraseña
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}