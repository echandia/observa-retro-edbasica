#!/bin/bash
# ==============================================================================
# Script Alternativo de Publicación (Sin contraseña de túnel vía SSH seguro)
# ==============================================================================

cd "$(dirname "$0")"

echo "=================================================================="
echo "🚀 1. Verificando servidor local en http://127.0.0.1:3001..."
echo "=================================================================="

caffeinate -dimsu &
CAFF_PID=$!

if ! curl -s http://127.0.0.1:3001 > /dev/null 2>&1; then
  echo "📡 Iniciando servidor local en segundo plano..."
  node --experimental-sqlite server/index.js &
  SERVER_PID=$!
  sleep 2
fi

echo ""
echo "=================================================================="
echo "🌐 2. Generando enlace directo HTTPS (Sin contraseñas intermedias)..."
echo "=================================================================="
echo "Copia el enlace HTTPS que aparecerá abajo y envíalo a Antonio Meneses."
echo "Credenciales: antonio.meneses@ucsc.cl / tutor2026"
echo "=================================================================="
echo ""

cleanup() {
  echo "🛑 Cerrando..."
  if [ -n "$CAFF_PID" ]; then kill $CAFF_PID 2>/dev/null; fi
  if [ -n "$SERVER_PID" ]; then kill $SERVER_PID 2>/dev/null; fi
  exit 0
}
trap cleanup INT TERM

ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -R 80:127.0.0.1:3001 nokey@localhost.run
