#!/bin/bash
# ==============================================================================
# Asistente para Subir la Plataforma a GitHub
# Observa-Retro · Pedagogía en Educación Básica (UCSC / CIAE BASAL)
# ==============================================================================

cd "$(dirname "$0")"

echo ""
echo "=================================================================="
echo "🐙 ASISTENTE PARA SUBIR LA PLATAFORMA A GITHUB"
echo "=================================================================="
echo ""
echo "Paso 1: Ve a https://github.com/new en tu navegador y crea un nuevo repositorio."
echo "        (Puedes nombrarlo: observa-retro-edbasica)"
echo "        IMPORTANTE: Déjalo vacío (NO marques 'Add a README file')."
echo ""
echo "Paso 2: Copia la URL del repositorio creado en GitHub."
echo "        (Suele verse así: https://github.com/tu-usuario/observa-retro-edbasica.git)"
echo ""
echo "=================================================================="
read -p "👉 Pega aquí la URL de tu repositorio GitHub: " REPO_URL
echo "=================================================================="
echo ""

if [ -z "$REPO_URL" ]; then
  echo "❌ No ingresaste ninguna URL. Operación cancelada."
  exit 1
fi

echo "📦 1. Verificando estado del repositorio local..."
git branch -M main

# Configurar o actualizar el remoto origin
if git remote | grep -q "origin"; then
  git remote set-url origin "$REPO_URL"
  echo "🔄 Actualizado remoto origin a: $REPO_URL"
else
  git remote add origin "$REPO_URL"
  echo "➕ Añadido remoto origin: $REPO_URL"
fi

echo ""
echo "🚀 2. Subiendo archivos a GitHub..."
echo "------------------------------------------------------------------"
if git push -u origin main; then
  echo ""
  echo "=================================================================="
  echo "🎉 ¡SUBIDA COMPLETADA CON ÉXITO EN GITHUB!"
  echo "=================================================================="
  echo ""
  echo "Ahora puedes desplegar gratis en la nube en 1 minuto:"
  echo "1. Ve a https://dashboard.render.com"
  echo "2. Haz clic en 'New +' -> 'Web Service'"
  echo "3. Selecciona tu repositorio '$REPO_URL'"
  echo "4. Haz clic en 'Deploy' y tu plataforma estará online 24/7."
  echo "=================================================================="
else
  echo ""
  echo "⚠️ Hubo un detalle al hacer push."
  echo "Si GitHub te solicita autenticación, asegúrate de ingresar tu usuario y tu Personal Access Token (o iniciar sesión en GitHub)."
fi

echo ""
read -p "Presiona Enter para cerrar esta ventana..."
