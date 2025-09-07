#!/bin/bash
# Script para cambiar entre configuraciones de N8N

echo "🔧 Configurador de N8N - DashboardAI"
echo "======================================"
echo ""
echo "Selecciona el entorno de N8N:"
echo "1) Local (localhost:5678)"
echo "2) Production (VPS Hostinger)"
echo ""

read -p "Opción (1 o 2): " option

case $option in
    1)
        echo "🏠 Configurando para N8N LOCAL..."
        cp .env.local .env
        echo "✅ Configuración LOCAL activada"
        echo "📍 N8N apunta a: http://localhost:5678"
        ;;
    2)
        echo "🌐 Configurando para N8N PRODUCTION..."
        cp .env.vps .env
        echo "✅ Configuración PRODUCTION activada"
        echo "📍 N8N apunta a: https://n8n-n8n.hrxtio.easypanel.host"
        ;;
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac

echo ""
echo "🔄 Reinicia el servidor de desarrollo:"
echo "npm run dev"
