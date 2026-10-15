#!/bin/bash
# ==============================================================================
# Script todo-en-uno: Inicia el Servidor Local y Genera el Enlace Público
# para el profesor Antonio Meneses (UCSC / CIAE BASAL)
# ==============================================================================

cd "$(dirname "$0")"

echo ""
echo "=================================================================="
echo "🚀 1. Verificando servidor local en http://127.0.0.1:3001..."
echo "=================================================================="

# Iniciar caffeinate en segundo plano para evitar que la Mac entre en reposo
caffeinate -dimsu &
CAFF_PID=$!

# Verificar si el servidor ya está respondiendo
SERVER_STARTED_BY_ME=0
if ! curl -s http://127.0.0.1:3001 > /dev/null 2>&1; then
  echo "📡 El servidor no estaba activo. Iniciándolo ahora en segundo plano..."
  node --experimental-sqlite server/index.js &
  SERVER_PID=$!
  SERVER_STARTED_BY_ME=1
  
  # Esperar hasta que el servidor responda (máximo 10 segundos)
  READY=0
  for i in {1..10}; do
    sleep 1
    if curl -s http://127.0.0.1:3001 > /dev/null 2>&1; then
      READY=1
      break
    fi
  done

  if [ $READY -eq 1 ]; then
    echo "✅ Servidor local iniciado y verificado exitosamente en puerto 3001."
  else
    echo "⚠️ El servidor tardó en iniciar. Continuando..."
  fi
else
  echo "✅ Servidor local ya se encuentra activo y respondiendo en puerto 3001."
fi

# Obtener la IP pública (necesaria para la pantalla de verificación de Localtunnel)
PUBLIC_IP=$(curl -s https://loca.lt/mytunnelpassword 2>/dev/null || curl -s https://api.ipify.org 2>/dev/null || echo "Desconocida")

echo ""
echo "=================================================================="
echo "🌐 2. Generando enlace público HTTPS..."
echo "=================================================================="
echo "📌 NOTA IMPORTANTE PARA COMPARTIR CON EL PROFESOR ANTONIO MENESES:"
echo "   - Si al abrir el enlace la página pide 'Tunnel Password', ingresa:"
echo "     👉 Contraseña de Túnel: $PUBLIC_IP"
echo "   - Luego hacer clic en 'Click to Submit' para entrar a la plataforma."
echo ""
echo "🔐 Credenciales de Antonio Meneses:"
echo "   - Correo: antonio.meneses@ucsc.cl"
echo "   - Clave:  tutor2026"
echo "=================================================================="
echo ""

cleanup() {
  echo ""
  echo "🛑 Cerrando túnel..."
  if [ -n "$CAFF_PID" ]; then kill $CAFF_PID 2>/dev/null; fi
  if [ $SERVER_STARTED_BY_ME -eq 1 ] && [ -n "$SERVER_PID" ]; then
    echo "🛑 Deteniendo servidor local..."
    kill $SERVER_PID 2>/dev/null
  fi
  exit 0
}

trap cleanup INT TERM

# Ejecutar Localtunnel conectando explícitamente a 127.0.0.1
npx localtunnel --port 3001 --local-host 127.0.0.1
