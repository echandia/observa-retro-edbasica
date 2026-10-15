# Observa-Retro · Pedagogía en Educación Básica (Práctica Pedagógica IV)
### Plataforma de Acompañamiento Formativo, Diagnóstico y Retroalimentación Pedagógica
**Facultad de Educación, Universidad Católica de la Santísima Concepción (UCSC) / CIAE BASAL**

---

## 1. Visión General del Proyecto

Esta plataforma adapta el modelo de observación, retroalimentación y acompañamiento formativo docente (derivado de *Observación-Retro Media* y *FID Tríada*) específicamente a la carrera de **Pedagogía en Educación Básica (PEB)**, con foco en **Práctica Pedagógica IV (PPIV)**.

### Características Principales:
1. **Matriz de Competencias PEB**: Modelada formalmente a partir del documento oficial `MATRIZ TRIBUCACION COMPETENCIAS PEB.xlsx`, abarcando:
   - **Competencias Genéricas**: CG1 (Diagnóstico ético/social y bien común), CG2 (Comunicación profesional), CG3 (Inglés funcional docente).
   - **Competencias Específicas**: CE1 (Enfoques inclusivos y DUA), CE2 (Planificación y evaluación curricular), CE3 (Reflexión crítica e investigación de aula), CE4 (Interdisciplinariedad en básica), CE5 (Situaciones de enseñanza por mención: MMYCN, MLYHCS, MINGL).
   - **Nivel de Dominio en Práctica IV**: Calibrado al **Nivel de Dominio 2 (ND2)** en articulación con los 3 Resultados de Aprendizaje (**RA1, RA2, RA3**).
2. **Banco de Calibración con Portafolios 2025**:
   - Más de 37 portafolios docentes reales del año 2025 (`PRACTICA IV/PORTAFOLIO`) analizados y estructurados sistemáticamente de las secciones de los profesores Lester Aliaga, María Angélica Uribe y Tamara Luna.
   - Banco de desempeños de referencia para los 11 criterios de la *Rúbrica Analítica de Portafolio Docente*.
3. **Flujo Operativo 2026 (Planificación + Grabación de Clase)**:
   - Carga y estructuración de la **Planificación de Aula** (`Formato de planificacion.docx`) con evaluación contra la *Rúbrica Analítica de Planificación Docente*.
   - Carga y streaming sincronizado de la **Grabación de Aula** (audio o video) con transcripción asistida por IA (Gemini 2.5 Flash / Groq Whisper / Modo Demo local sin costo).
   - **Motor de Contrastación Automática**: Compara lo planificado (OA, momentos Inicio/Desarrollo/Cierre, preguntas formativas y recursos) con lo ocurrido en el aula real.
   - **Chatbot Tutor Reflexivo en 5 Fases**: Diálogo socrático para guiar la reflexión del practicante.
   - **Generador Automático de Portafolio**: Compila el borrador del **Capítulo 8 (Reflexión Docente)** listo para exportar.
   - **Panel de Supervisión Formador/Tutor**: Seguimiento de estudiantes por sección y mención disciplinar.

---

## 2. Estructura del Proyecto

```text
Proyecto Retro-Ed.Básica/
├── MATRIZ TRIBUCACION COMPETENCIAS PEB.xlsx   # Matriz oficial curricular
├── Plantilla Solicitud Matriculación ppIV.xlsx # Nómina institucional de estudiantes
├── PRACTICA IV/                               # Programa, portafolios 2025 y rúbricas
│   ├── DOCUMENTOS PRACTICA/                   # Fichas, itinerario formativo, pautas
│   ├── NECESIDADES/                           # PPIV.xlsx con datos de practicantes
│   └── PORTAFOLIO/                            # Portafolios 2025 por docente y mención
├── data/
│   ├── matriz_peb.json                        # Matriz formalizada CG1-CG3, CE1-CE5, RA1-RA3
│   ├── rubricas_ppiv.json                     # Rúbricas analíticas de portafolio y planificación
│   └── calibrated_portfolios_2025.json        # Dataset estructurado de portafolios 2025
├── scripts/
│   ├── extract_matriz_peb.py                  # Extractor de la matriz desde Excel
│   ├── extract_portfolios_dataset.py          # Extractor y calibrador de portafolios 2025
│   ├── extract_rubrics.py                     # Extractor de rúbricas analíticas
│   ├── extract_roster.py                      # Extractor de nómina de estudiantes
│   ├── extract_docx.py                        # Extractor de texto y planes estructurados
│   └── test_platform_peb.js                   # Suite de pruebas automatizadas (10/10)
├── server/
│   ├── index.js                               # Servidor REST API Node.js nativo (puerto 3001)
│   ├── db.js                                  # Base de datos SQLite (node:sqlite)
│   ├── auth.js                                # Autenticación segura y sesiones
│   ├── audioService.js                        # Streaming HTTP 206 para grabaciones
│   ├── transcriptionService.js                # Transcripción (Gemini, Whisper, Demo)
│   ├── docxParser.js                          # Puente Node.js para documentos Word
│   ├── courseImporter.js                      # Sincronización de estudiantes a SQLite
│   └── pedagogyEnginePEB.js                   # Motor Pedagógico y Analítico de Básica
├── public/                                    # Frontend SPA
│   ├── index.html                             # Interfaz de usuario interactiva
│   ├── css/style.css                          # Estilos visuales accesibles y responsivos
│   └── js/
│       ├── api.js                             # Cliente HTTP
│       ├── audioPlayer.js                     # Reproductor sincronizado
│       └── app.js                             # Lógica de estados y pestañas
└── package.json                               # Configuración Node.js (>=22.5.0)
```

---

## 3. Guía de Ejecución Rápida

### Requisitos:
- **Node.js**: Versión $\ge 22.5.0$ (recomendado Node 22 o 24 LTS, que incluye soporte nativo para `node:sqlite`).
- **Python**: Versión 3.x (incluida en macOS/Linux de forma estándar).

### Paso 1: Iniciar el Servidor
En la raíz del proyecto, ejecuta:
```bash
npm start
```
El servidor se iniciará en:
👉 `http://localhost:3001`

### Paso 2: Ejecutar las Pruebas Automatizadas
```bash
npm test
```
Ejecutará la suite de 10 pruebas integrales validando la base de datos, transcripción, contrastación y generador de portafolios.

---

## 4. Cuentas de Acceso Inicial

La plataforma viene precargada con usuarios de prueba y sincronización automática con la nómina de estudiantes:

| Rol | Correo | Contraseña de Acceso | Mención / Función |
|---|---|---|---|
| **Estudiante Practicante** | `practicante.basica@ucsc.cl` | `basica2026` o `practica2026` | Matemática y Ciencias Naturales (MMYCN) |
| **Docente Tutor** | `laliaga@ucsc.cl` | `tutor2026` | Prof. Lester Aliaga (MMYCN) |
| **Docente Tutor** | `muribe@ucsc.cl` | `tutor2026` | Prof. María Angélica Uribe (MMYCN) |
| **Docente Tutor** | `tluna@ucsc.cl` | `tutor2026` | Prof. Tamara Luna Ulloa (MLYHCS) |
| **Administrador** | `admin@ucsc.cl` | `admin2026` | Gestión Integral Formación Básica |

*Nota*: Cualquier estudiante importado desde la nómina oficial puede ingresar con su correo institucional y su RUT o la clave `basica2026`.

---

## 5. Configuración del Motor de Inteligencia Artificial

Desde el botón **⚙️ Configuración** en el encabezado de la plataforma:
- **Modo Demostración (Por defecto)**: No requiere API key. Utiliza una clase real de Matemática de 5° básico (fracciones y números mixtos) con preguntas diagnósticas, andamiajes DUA de inclusión y momentos de inicio, desarrollo y cierre.
- **Google AI Studio (Gemini 2.5 Flash)**: Pega tu clave gratuita de Google AI Studio para transcribir audios y videos de hasta 90 minutos con diarización automática.
- **Groq / OpenAI Whisper**: Soporte directo para modelos Whisper de transcripción rápida.
