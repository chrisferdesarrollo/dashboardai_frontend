# 🔧 Configuración de N8N - DashboardAI

Este sistema permite cambiar fácilmente entre diferentes entornos de N8N con un solo parámetro.

## 🚀 Cambio Rápido de Entorno

### Método 1: Script Automático (Recomendado)
```powershell
# En PowerShell
.\switch-n8n.ps1

# En Bash/Git Bash
./switch-n8n.sh
```

### Método 2: Cambio Manual
Edita el archivo `.env` y cambia:
```env
# Para desarrollo local
VITE_N8N_ENVIRONMENT=local

# Para VPS/Production
VITE_N8N_ENVIRONMENT=production
```

## 📁 Archivos de Configuración

- **`.env`** - Configuración activa
- **`.env.local`** - Plantilla para desarrollo local
- **`.env.vps`** - Plantilla para VPS/Production
- **`.env.example`** - Documentación y ejemplo

## 🌍 Entornos Disponibles

### 🏠 Local (`VITE_N8N_ENVIRONMENT=local`)
- **Webhook**: `http://localhost:5678/webhook`
- **API**: `http://localhost:5678/api/v1`
- **Uso**: Desarrollo local con N8N en Docker/instalación local

### 🌐 Production (`VITE_N8N_ENVIRONMENT=production`)
- **Webhook**: `https://n8n-n8n.hrxtio.easypanel.host/webhook`
- **API**: `https://n8n-n8n.hrxtio.easypanel.host/api/v1`
- **Uso**: VPS de Hostinger en producción

## ⚡ Flujo de Trabajo Típico

1. **Desarrollo local**:
   ```bash
   .\switch-n8n.ps1
   # Seleccionar opción 1 (Local)
   npm run dev
   ```

2. **Testing en VPS**:
   ```bash
   .\switch-n8n.ps1
   # Seleccionar opción 2 (Production)
   npm run dev
   ```

## 🔑 Variables de Entorno

```env
# Control de entorno principal
VITE_N8N_ENVIRONMENT=local|production

# Configuración local
VITE_N8N_LOCAL_API_URL=http://localhost:5678/api/v1
VITE_N8N_LOCAL_WEBHOOK_URL=http://localhost:5678/webhook
VITE_N8N_LOCAL_API_TOKEN=tu_token_local

# Configuración production
VITE_N8N_PROD_API_URL=https://tu-servidor.com/api/v1
VITE_N8N_PROD_WEBHOOK_URL=https://tu-servidor.com/webhook
VITE_N8N_PROD_API_TOKEN=tu_token_production
```

## 🛠️ Personalización

Para agregar un nuevo entorno, edita `configService.ts` y agrega las variables correspondientes en los archivos `.env`.

## 📝 Notas

- Los cambios en `.env` requieren reiniciar el servidor de desarrollo
- Las variables `VITE_*` son cargadas en tiempo de build por Vite
- El sistema mantiene compatibilidad con configuraciones legacy
