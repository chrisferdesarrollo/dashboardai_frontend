# Dashboard AI - Integración de Autenticación

Este documento describe la integración de autenticación entre el backend (Spring Boot + JWT) y el frontend (React + TypeScript).

## Características Implementadas

### Backend (Ya existente)
- ✅ Sistema de autenticación con JWT
- ✅ Endpoints de login y registro (`/api/auth/signin`, `/api/auth/signup`)
- ✅ Sistema de roles (USER, MODERATOR, ADMIN)
- ✅ Endpoints protegidos para testing (`/api/test/user`, `/api/test/mod`, `/api/test/admin`)

### Frontend (Nuevo)
- ✅ Servicio de autenticación con Axios
- ✅ Store de autenticación con Zustand + persist
- ✅ Formularios de login y registro con React Hook Form + Zod
- ✅ Rutas protegidas
- ✅ Header actualizado con información del usuario
- ✅ Manejo automático de tokens JWT
- ✅ Interceptors para requests automáticas

## Estructura de Archivos Agregados

```
src/
├── components/
│   └── auth/
│       ├── LoginForm.tsx        # Formulario de login
│       ├── SignupForm.tsx       # Formulario de registro
│       └── ProtectedRoute.tsx   # HOC para rutas protegidas
├── hooks/
│   └── useAuth.ts              # Hook personalizado de autenticación
├── pages/
│   └── Auth.tsx                # Página de autenticación
├── services/
│   └── authService.ts          # Servicio de API de autenticación
├── store/
│   └── authStore.ts            # Store de estado de autenticación
└── types/
    └── auth.ts                 # Tipos TypeScript para autenticación
```

## Configuración

### 1. Variables de Entorno
El frontend está configurado para usar:
- **Desarrollo**: `http://localhost:3000` (con proxy a backend en puerto 8080)
- **Backend**: `http://localhost:8080/api`

### 2. Puertos
- **Frontend**: Puerto 3000
- **Backend**: Puerto 8080

## Uso

### 1. Iniciar el Backend
```bash
cd dashboardAI_backend
mvn spring-boot:run
```

### 2. Iniciar el Frontend
```bash
cd dashboardai_frontend
npm run dev
```

### 3. Acceder a la Aplicación
1. Abrir `http://localhost:3000`
2. Se mostrará la página de login automáticamente
3. Crear una cuenta nueva o usar credenciales existentes

## Funcionalidades

### Autenticación
- **Login**: Formulario con validación de usuario/contraseña
- **Registro**: Formulario completo con validación de datos
- **Logout**: Botón en el header que limpia la sesión
- **Persistencia**: Los tokens se guardan en localStorage

### Seguridad
- **Tokens JWT**: Automáticamente incluidos en todas las requests
- **Interceptors**: Manejo automático de errores 401 (redirige a login)
- **Rutas Protegidas**: Verificación de autenticación en todas las rutas principales

### UX/UI
- **Loading States**: Indicadores de carga en formularios
- **Error Handling**: Mensajes de error claros
- **Success Messages**: Confirmaciones de acciones exitosas
- **Responsive**: Formularios adaptados para móvil y desktop

## Endpoints Utilizados

### Autenticación
- `POST /api/auth/signin` - Login
- `POST /api/auth/signup` - Registro

### Testing (para verificar autenticación)
- `GET /api/test/user` - Endpoint protegido para usuarios autenticados
- `GET /api/test/mod` - Endpoint para moderadores
- `GET /api/test/admin` - Endpoint para administradores

## Tipos de Usuario por Defecto

Al registrarse, los usuarios reciben automáticamente el rol `user`. Los roles disponibles son:
- **ROLE_USER**: Usuario básico
- **ROLE_MODERATOR**: Moderador
- **ROLE_ADMIN**: Administrador

## Notas Técnicas

### Store de Estado
Se utiliza Zustand con persistencia para manejar el estado de autenticación. Los datos persisten entre sesiones del navegador.

### Validación de Formularios
- **React Hook Form**: Para manejo eficiente de formularios
- **Zod**: Para validación de esquemas TypeScript
- **Validaciones incluidas**: Email, longitud de passwords, confirmación de contraseña

### Interceptors HTTP
- **Request**: Agrega automáticamente el token JWT a las cabeceras
- **Response**: Maneja errores 401 redirigiendo al login

## Personalización

### Cambiar Puertos
Editar `vite.config.ts` para cambiar el puerto del frontend o la URL del backend.

### Agregar Validaciones
Editar los esquemas Zod en `LoginForm.tsx` y `SignupForm.tsx`.

### Personalizar UI
Los componentes usan la librería shadcn/ui, fácilmente personalizable via CSS.

## Próximos Pasos Sugeridos

1. **Recuperación de Contraseña**: Implementar endpoint y formulario
2. **Perfil de Usuario**: Página para editar información personal
3. **Administración de Usuarios**: Panel admin para gestionar usuarios
4. **Refresh Tokens**: Implementar renovación automática de tokens
5. **2FA**: Autenticación de dos factores
