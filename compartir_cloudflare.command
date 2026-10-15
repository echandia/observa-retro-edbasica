#!/bin/bash
# ==============================================================================
# Script de Publicación Ultra-Estable con Cloudflare Tunnel y Anti-Suspensión
# Observa-Retro · Pedagogía en Educación Básica (UCSC / CIAE BASAL)
# ==============================================================================

cd "$(dirname "$0")"

echo ""
echo "=================================================================="
echo "☕ 1. Activando modo anti-suspensión (caffeinate)..."
echo "   (Tu MacBook no entrará en reposo mientras esta ventana esté abierta)"
echo "=================================================================="

# Iniciar caffeinate en segundo plano para evitar suspensión del sistema
caffeinate -dimsu &
CAFF_PID=$!

echo ""
echo "=================================================================="
echo "🚀 2. Verificando servidor local en http://127.0.0.1:3001..."
echo "=================================================================="

SERVER_STARTED_BY_ME=0
if ! curl -s http://127.0.0.1:3001 > /dev/null 2>&1; then
  echo "📡 Iniciando servidor local en segundo plano..."
  node --experimental-sqlite server/index.js &
  SERVER_PID=$!
  SERVER_STARTED_BY_ME=1
  sleep 2
else
  echo "✅ Servidor local ya está activo y respondiendo."
fi

echo ""
echo "=================================================================="
echo "🌐 3. Conectando con Cloudflare Edge (Sin contraseñas intermedias)..."
echo "=================================================================="

cleanup() {
  echo ""
  echo "🛑 Cerrando servicios y restaurando reposo de la Mac..."
  if [ -n "$CAFF_PID" ]; then kill $CAFF_PID 2>/dev/null; fi
  if [ $SERVER_STARTED_BY_ME -eq 1 ] && [ -n "$SERVER_PID" ]; then kill $SERVER_PID 2>/dev/null; fi
  exit 0
}
trap cleanup INT TERM

BIN_DIR="./bin"
CLOUDFLARED="$BIN_DIR/cloudflared"

if [ ! -f "$CLOUDFLARED" ]; then
  mkdir -p "$BIN_DIR"
  echo "📥 Descargando conector oficial Cloudflare Tunnel..."
  ARCH=$(uname -m)
  if [ "$ARCH" = "arm64" ]; then
    curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64 -o "$CLOUDFLARED"
  else
    curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64 -o "$CLOUDFLARED"
  fi
  chmod +x "$CLOUDFLARED"
fi

if [ -f "$CLOUDFLARED" ]; then
  echo "✅ Conector Cloudflare listo. Generando enlace seguro HTTPS..."
  echo ""
  echo "👉 Enlace que debes compartir con el Prof. Antonio Meneses:"
  echo "------------------------------------------------------------------"
  "$CLOUDFLARED" tunnel --url http://127.0.0.1:3001
else
  echo "⚠️ Usando túnel alternativo resiliente..."
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -R 80:127.0.0.1:3001 nokey@localhost.run
fi
