# Guía de Publicación y Acceso para Profesores Tutores
## Plataforma Observa-Retro · Pedagogía en Educación Básica (UCSC / CIAE BASAL)

Esta guía explica cómo publicar la plataforma en la web y cómo el **Prof. Antonio Meneses** puede acceder a ella y subir los archivos de sus estudiantes practicantes para analizarlos.

---

## 1. Datos de Acceso de Prof. Antonio Meneses

La cuenta del profesor ya está creada y activa en la base de datos con privilegios de **Formador / Tutor**:

| Campo | Valor |
| :--- | :--- |
| **Nombre** | Prof. Antonio Meneses |
| **Correo Institucional** | `antonio.meneses@ucsc.cl` |
| **Contraseña de Acceso** | `tutor2026` |
| **Rol en la Plataforma** | `tutor` |
| **Mención Asignada** | `MMYCN` (Matemática y Ciencias Naturales / General) |
| **Privilegios** | Puede crear clases para cualquier estudiante, subir planificaciones y transcripciones, ejecutar análisis y ver el Caso de Referencia 2025. |

---

## 2. Cómo Publicar la Plataforma en Internet

Tienes dos alternativas según la inmediatez que necesites:

### Opción A: Compartir un Enlace Público de Inmediato (En 30 segundos)

Si necesitas que el profesor Antonio Meneses ingrese **ahora mismo** desde su computador o teléfono sin tener que configurar servidores en la nube:

1. Mantén la aplicación corriendo en tu terminal:
   ```bash
   cd "/Users/eugeniochandia/Library/CloudStorage/Dropbox/2026/CIAE BASAL/Proyectos Pequeños/Proyecto Retro-Ed.Básica"
   npm start
   ```

2. En una **segunda pestaña** de tu terminal, ejecuta:
   ```bash
   npm run share
   ```
   *(o `npm run tunnel` para solicitar subdominio fijo)*.

3. La terminal te entregará una URL pública segura HTTPS, por ejemplo:
   ```text
   your url is: https://ucsc-retro-edbasica.loca.lt
   ```
4. **Listo**: Le envías ese enlace a `antonio.meneses@ucsc.cl` junto a sus credenciales.

> **Nota para Localtunnel**: Al abrir el enlace por primera vez, Localtunnel pide ingresar la "IP pública" del túnel para evitar spam. En tu terminal verás la IP o puedes consultarla en [ipv4.icanhazip.com](https://ipv4.icanhazip.com).

---

### Opción B: Despliegue Permanente Gratuito 24/7 en Render.com

Para que la página esté **siempre disponible en la nube** sin que dependa de tener tu laptop encendida:

1. **Subir el código a GitHub**:
   En tu terminal dentro de la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Plataforma Observa-Retro Educación Básica UCSC"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/observa-retro-edbasica.git
   git push -u origin main
   ```

2. **Crear el servicio en Render.com**:
   - Entra a [render.com](https://render.com) e inicia sesión con tu GitHub.
   - Haz clic en **"New +"** $\rightarrow$ **"Web Service"**.
   - Selecciona el repositorio `observa-retro-edbasica`.
   - Render detectará el archivo [`render.yaml`](file:///Users/eugeniochandia/Library/CloudStorage/Dropbox/2026/CIAE%20BASAL/Proyectos%20Pequen%CC%83os/Proyecto%20Retro-Ed.Ba%CC%81sica/render.yaml) automáticamente:
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment Variable**: `NODE_VERSION` = `22.12.0`
   - Haz clic en **"Deploy"**.
   - En 2 minutos obtendrás una URL fija oficial, por ejemplo:
     👉 `https://observa-retro-edbasica.onrender.com`

---

## 3. Guía Paso a Paso para el Profesor Antonio Meneses

### Paso 1: Iniciar Sesión
1. Entrar al enlace provisto (local, túnel o Render).
2. Ingresar con:
   - Correo: `antonio.meneses@ucsc.cl`
   - Contraseña: `tutor2026`
3. En la barra superior verá su nombre: **Prof. Antonio Meneses**, su rol **TUTOR** y la pestaña **Panel Formador / Tutor**.

---

### Paso 2: Registrar una Clase para un Estudiante
1. En la esquina superior derecha, hacer clic en el botón azul **"+ Nueva Clase"**.
2. En el formulario, verá el selector:
   - **Practicante Asignado (Estudiante)**: Desplegar la lista y seleccionar al estudiante de la nómina (los 121 estudiantes de las secciones de Básica están pre-cargados).
   - **Título de la Clase**: ej. *"Sumas con Canje y Material Multibase"*.
   - **Nivel Educativo**: ej. *3° Básico*, *4° Básico*, *5° Básico*, *6° Básico*.
   - **Mención Disciplinar**: MMYCN, MLYHCS o MINGL.
   - **Centro de Práctica (Colegio)**: ej. *Escuela Arturo Prat*.
   - **Fecha**: Fecha de la clase.
3. Hacer clic en **"Crear Clase"**. La clase quedará automáticamente seleccionada.

---

### Paso 3: Subir los Archivos del Estudiante

El profesor dispone de los módulos superiores para cargar los insumos:

#### 1. Planificación de Aula (Pestaña 1)
- Hacer clic en el recuadro de subida y seleccionar el archivo `.docx` oficial de planificación entregado por el estudiante.
- El sistema extraerá de inmediato el Objetivo de Aprendizaje (OA), el objetivo de la clase y las actividades planificadas para **Inicio**, **Desarrollo** y **Cierre**.

#### 2. Grabación y Transcripción (Pestaña 2)
El profesor puede elegir el método que le resulte más cómodo:
- **Subir Grabación**: Si tiene el archivo de audio (`.mp3`, `.m4a`, `.wav`) o video (`.mp4`), subirlo directamente para reproducirlo sincronizadamente.
- **Subir Archivo de Transcripción**: Si ya tiene la transcripción de la clase en Word o texto (`.docx`, `.txt`, `.vtt`, `.srt`), hacer clic en **"📄 Subir Transcripción (.docx, .txt, .vtt)"**.
- **Pegar Transcripción**: Hacer clic en **"📝 Pegar Texto de Transcripción"** para pegar el diálogo de la clase.

---

### Paso 4: Ejecutar Análisis y Retroalimentar

1. **Cuadro Comparativo (Pestaña 3)**:
   - Hacer clic en el botón **"⚡ Ejecutar Análisis Integral"**.
   - El sistema contrastará automáticamente lo que el estudiante planificó contra lo que realmente ocurrió en el aula durante el Inicio, Desarrollo y Cierre.
2. **Matriz de Competencias PEB (Pestaña 4)**:
   - Se evaluarán las **8 competencias de Básica** (CG1–CG3, CE1–CE5) en el **Nivel ND2**.
   - Cada competencia mostrará las evidencias exactas observadas en el aula y una pregunta socrática de retroalimentación para el practicante.
3. **Tutor Reflexivo (Pestaña 5)**:
   - El profesor o el estudiante pueden interactuar con el chatbot formativo en sus 5 fases para profundizar en las decisiones didácticas.
4. **Borrador de Portafolio (Pestaña 6)**:
   - Se genera el borrador estructurado del **Capítulo 8 (Reflexión Pedagógica)** listo para que el estudiante lo integre en su entrega final.
