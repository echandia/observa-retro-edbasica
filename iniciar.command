#!/bin/bash
# Script de inicio con doble clic para Observa-Retro Educación Básica
cd "$(dirname "$0")"
echo "========================================================"
echo "🚀 Iniciando Observa-Retro · Educación Básica (PPIV UCSC)"
echo "📡 Abriendo servidor en http://localhost:3001"
echo "========================================================"
(sleep 2 && open http://localhost:3001) &

# Modo resiliente: Si el servidor se detiene, reinicia automáticamente
while true; do
  node --experimental-sqlite server/index.js
  echo "⚠️ El servidor se detuvo. Reiniciando en 2 segundos... (Presiona Ctrl+C para salir)"
  sleep 2
done
