import { configService } from './configService';

export interface UpdateEmailRequest {
  newEmail: string;
  currentPassword: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateAvatarRequest {
  avatarUrl?: string;
  avatarFile?: File;
}

export interface UserProfileResponse {
  id: number;
  username: string;
  email: string;
  roles: string[];
  emailVerified: boolean;
  createdAt: string;
  avatar?: string;
}

class UserProfileService {
  private getApiClient() {
    const config = configService.getBackendConfig();
    return fetch; // Usaremos fetch nativo con configuración dinámica
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const config = await configService.getBackendConfig();
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Error ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // Si no se puede parsear el JSON, usar mensaje por defecto
        errorMessage = `Error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Obtener información completa del perfil del usuario
   */
  async getUserProfile(): Promise<UserProfileResponse> {
    console.log('🔍 [USER-PROFILE] Obteniendo perfil del usuario...');
    
    try {
      const response = await this.makeRequest('/user/profile');
      console.log('✅ [USER-PROFILE] Perfil obtenido:', response);
      return response;
    } catch (error) {
      console.error('❌ [USER-PROFILE] Error al obtener perfil:', error);
      throw error;
    }
  }

  /**
   * Actualizar email del usuario
   */
  async updateEmail(data: UpdateEmailRequest): Promise<{ message: string }> {
    console.log('🔄 [USER-PROFILE] Actualizando email...');
    
    try {
      const response = await this.makeRequest('/user/update-email', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      
      console.log('✅ [USER-PROFILE] Email actualizado:', response);
      return response;
    } catch (error) {
      console.error('❌ [USER-PROFILE] Error al actualizar email:', error);
      throw error;
    }
  }

  /**
   * Actualizar contraseña del usuario
   */
  async updatePassword(data: UpdatePasswordRequest): Promise<{ message: string }> {
    console.log('🔄 [USER-PROFILE] Actualizando contraseña...');
    
    try {
      const response = await this.makeRequest('/user/update-password', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      
      console.log('✅ [USER-PROFILE] Contraseña actualizada');
      return response;
    } catch (error) {
      console.error('❌ [USER-PROFILE] Error al actualizar contraseña:', error);
      throw error;
    }
  }

  /**
   * Actualizar avatar del usuario
   */
  async updateAvatar(data: UpdateAvatarRequest): Promise<{ message: string; avatarUrl: string }> {
    console.log('🔄 [USER-PROFILE] Actualizando avatar...');
    
    try {
      let response;
      
      if (data.avatarFile) {
        // Subir archivo de imagen
        const formData = new FormData();
        formData.append('avatar', data.avatarFile);
        
        const config = await configService.getBackendConfig();
        const token = localStorage.getItem('token');
        
        const uploadResponse = await fetch(`${config.apiUrl}/user/upload-avatar`, {
          method: 'POST',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json().catch(() => ({ message: 'Error al subir imagen' }));
          throw new Error(error.message);
        }

        response = await uploadResponse.json();
      } else if (data.avatarUrl) {
        // Usar URL de avatar predeterminado
        response = await this.makeRequest('/user/update-avatar', {
          method: 'PUT',
          body: JSON.stringify({ avatarUrl: data.avatarUrl }),
        });
      } else {
        throw new Error('Debe proporcionar un archivo o URL de avatar');
      }
      
      console.log('✅ [USER-PROFILE] Avatar actualizado:', response);
      return response;
    } catch (error) {
      console.error('❌ [USER-PROFILE] Error al actualizar avatar:', error);
      throw error;
    }
  }

  /**
   * Eliminar avatar del usuario (volver al avatar por defecto)
   */
  async removeAvatar(): Promise<{ message: string }> {
    console.log('🔄 [USER-PROFILE] Eliminando avatar...');
    
    try {
      const response = await this.makeRequest('/user/remove-avatar', {
        method: 'DELETE',
      });
      
      console.log('✅ [USER-PROFILE] Avatar eliminado');
      return response;
    } catch (error) {
      console.error('❌ [USER-PROFILE] Error al eliminar avatar:', error);
      throw error;
    }
  }
}

export const userProfileService = new UserProfileService();