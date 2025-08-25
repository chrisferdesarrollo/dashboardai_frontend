// Función para decodificar el token JWT y obtener el userId
export const getUserIdFromToken = (): number | null => {
  try {
    // Probar ambos nombres de token para compatibilidad
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (!token) {
      console.log('No access token found');
      return null;
    }

    // Decodificar el token JWT (solo el payload, sin verificar la firma)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    console.log('Token payload:', payload);
    
    // El userId está en el campo 'id' que agregamos al token
    const userId = payload.id;
    
    if (userId) {
      return typeof userId === 'string' ? parseInt(userId, 10) : userId;
    }
    
    return null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Función para verificar si el usuario está autenticado
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    // Verificar si el token ha expirado
    if (payload.exp && payload.exp < currentTime) {
      console.log('Token has expired');
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

// Función para obtener información completa del usuario desde el token
export const getUserFromToken = (): { id: number; email?: string; username?: string } | null => {
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    console.log('Getting user from token. Token exists:', !!token);
    
    if (!token) {
      console.warn('No access token found in localStorage');
      return null;
    }

    // Verificar formato del token
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('Invalid JWT token format');
      return null;
    }

    const payload = JSON.parse(atob(tokenParts[1]));
    console.log('JWT payload:', payload);
    
    // Verificar que tenemos el id del usuario
    if (!payload.id) {
      console.error('No user ID found in token payload');
      return null;
    }
    
    const userInfo = {
      id: typeof payload.id === 'string' ? parseInt(payload.id, 10) : payload.id,
      email: payload.email,
      username: payload.sub // El username está en el subject
    };
    
    console.log('User info extracted:', userInfo);
    return userInfo;
    
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
};
