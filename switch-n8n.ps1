# Script PowerShell para cambiar entre configuraciones de N8N

Write-Host "🔧 Configurador de N8N - DashboardAI" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Selecciona el entorno de N8N:" -ForegroundColor Yellow
Write-Host "1) Local (localhost:5678)" -ForegroundColor Green
Write-Host "2) Production (VPS Hostinger)" -ForegroundColor Blue
Write-Host ""

$option = Read-Host "Opción (1 o 2)"

switch ($option) {
    "1" {
        Write-Host "🏠 Configurando para N8N LOCAL..." -ForegroundColor Green
        Copy-Item ".env.local" ".env" -Force
        Write-Host "✅ Configuración LOCAL activada" -ForegroundColor Green
        Write-Host "📍 N8N apunta a: http://localhost:5678" -ForegroundColor White
    }
    "2" {
        Write-Host "🌐 Configurando para N8N PRODUCTION..." -ForegroundColor Blue
        Copy-Item ".env.vps" ".env" -Force
        Write-Host "✅ Configuración PRODUCTION activada" -ForegroundColor Blue
        Write-Host "📍 N8N apunta a: https://n8n-n8n.hrxtio.easypanel.host" -ForegroundColor White
    }
    default {
        Write-Host "❌ Opción inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔄 Reinicia el servidor de desarrollo:" -ForegroundColor Yellow
Write-Host "npm run dev" -ForegroundColor White
