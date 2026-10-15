/**
 * Motor Pedagógico y Analítico especializado para Pedagogía en Educación Básica (PEB)
 * Práctica Pedagógica IV · CIAE BASAL / UCSC
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carga de la matriz de competencias y rúbricas
let MATRIZ_DATA = null;
let RUBRICAS_DATA = null;

try {
  const matrizPath = join(__dirname, '..', 'data', 'matriz_peb.json');
  if (existsSync(matrizPath)) {
    MATRIZ_DATA = JSON.parse(readFileSync(matrizPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Advertencia: no se pudo cargar data/matriz_peb.json', e.message);
}

try {
  const rubricasPath = join(__dirname, '..', 'data', 'rubricas_ppiv.json');
  if (existsSync(rubricasPath)) {
    RUBRICAS_DATA = JSON.parse(readFileSync(rubricasPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Advertencia: no se pudo cargar data/rubricas_ppiv.json', e.message);
}

export const MATRIZ_PEB = MATRIZ_DATA?.competencias || [];
export const RESULTADOS_APRENDIZAJE = MATRIZ_DATA?.resultados_aprendizaje || [];
export const RUBRICA_PORTAFOLIO = RUBRICAS_DATA?.rubrica_portafolio_docente || [];
export const RUBRICA_PLANIFICACION = RUBRICAS_DATA?.rubrica_planificacion_docente || [];

/**
 * Segmenta la transcripción de la clase en momentos didácticos de Educación Básica:
 * Inicio, Desarrollo y Cierre.
 */
export function segmentarEpisodiosBasica(lineas) {
  if (!lineas || lineas.length === 0) return [];

  const n = lineas.length;
  const episodios = [];

  // Puntos de corte proporcionales para los momentos didácticos (Inicio, Desarrollo y Cierre)
  let finInicio, finDesarrollo;
  if (n <= 3) {
    finInicio = 1;
    finDesarrollo = Math.min(2, n - 1);
  } else if (n < 9) {
    finInicio = Math.max(1, Math.floor(n * 0.25));
    finDesarrollo = Math.max(finInicio + 1, Math.floor(n * 0.75));
    if (finDesarrollo >= n) finDesarrollo = n - 1;
  } else {
    finInicio = Math.min(Math.max(3, Math.floor(n * 0.20)), 12);
    finDesarrollo = Math.max(finInicio + 2, Math.floor(n * 0.85));
    if (finDesarrollo >= n) finDesarrollo = n - 1;
  }

  // Episodio 1: Inicio (Activación y Propósito)
  episodios.push({
    id: "ep-1",
    fase: "Inicio",
    ini: 1,
    fin: Math.min(finInicio, n),
    timestamp_ini: lineas[0]?.t || "00:00",
    timestamp_fin: lineas[Math.min(finInicio - 1, n - 1)]?.t || "05:00",
    titulo: "Apertura, activación de conocimientos previos y explicitación del OA",
    resumen: "Encuadre inicial de la sesión, establecimiento del clima de aula y motivación.",
    foco_evaluativo: "Claridad del propósito pedagógico (CG2) y conexión con saberes previos (CE1, CE2)."
  });

  // Episodio 2: Desarrollo (Modelamiento, Interacción y Construcción)
  if (finDesarrollo > finInicio) {
    episodios.push({
      id: "ep-2",
      fase: "Desarrollo",
      ini: finInicio + 1,
      fin: Math.min(finDesarrollo, n),
      timestamp_ini: lineas[finInicio]?.t || "05:00",
      timestamp_fin: lineas[Math.min(finDesarrollo - 1, n - 1)]?.t || "40:00",
      titulo: "Gestión de actividades, mediación cognitiva y trabajo con estudiantes",
      resumen: "Interacción guiada, formulación de preguntas, uso de recursos y atención a la diversidad.",
      foco_evaluativo: "Preguntas de razonamiento (CE2), gestión didáctica (CE5) y andamiajes DUA (CE1)."
    });
  }

  // Episodio 3: Cierre (Síntesis y Evaluación Formativa)
  if (n > finDesarrollo) {
    episodios.push({
      id: "ep-3",
      fase: "Cierre",
      ini: finDesarrollo + 1,
      fin: n,
      timestamp_ini: lineas[finDesarrollo]?.t || "40:00",
      timestamp_fin: lineas[n - 1]?.t || "45:00",
      titulo: "Síntesis conceptual, evaluación formativa y metacognición",
      resumen: "Consolidación de las ideas clave abordadas, comprobación de aprendizajes y proyección.",
      foco_evaluativo: "Institucionalización del aprendizaje (CE5.4) y verificación de logros (CE2.4)."
    });
  }

  return episodios;
}

/**
 * Motor de Contrastación: Compara la Planificación escrita con la Grabación real de aula.
 */
export function contrastarPlanificacionConAula(plan, lineas) {
  if (!plan || !lineas || lineas.length === 0) {
    return {
      resumen: "Se requiere tanto la planificación escrita como la transcripción para contrastar.",
      cumplimiento_general: "Parcial",
      hallazgos: []
    };
  }

  const textoAula = lineas.map(l => l.x.toLowerCase()).join(" ");
  const hallazgos = [];

  // 1. Contrastación de Objetivo de Aprendizaje
  const oaPlan = (plan.oa_trabajar || plan.objetivo_clase || "").toLowerCase();
  let oaEnAula = false;
  if (oaPlan) {
    const palabrasClave = oaPlan.split(" ").filter(w => w.length > 4).slice(0, 5);
    const coincidencias = palabrasClave.filter(w => textoAula.includes(w));
    oaEnAula = coincidencias.length >= 2;
  }

  hallazgos.push({
    dimension: "Objetivo de la Clase",
    planificado: plan.objetivo_clase || plan.oa_trabajar || "No explicitado en la planificación",
    observado_en_aula: oaEnAula 
      ? "El practicante comunica y focaliza el contenido central del OA en los turnos iniciales de la clase."
      : "Se aborda el área temática, pero no se evidencia una comunicación explícita de la meta de aprendizaje para los escolares.",
    estado: oaEnAula ? "Cumplido" : "Oportunidad de Mejora",
    indicador: "CE2.1 / CG2.1"
  });

  // 2. Contrastación del Momento Inicio
  const inicioPlan = (plan.inicio || "").toLowerCase();
  const tienePreguntasPrevias = textoAula.slice(0, 1500).includes("recuerda") || textoAula.slice(0, 1500).includes("qué vimos") || textoAula.slice(0, 1500).includes("¿cómo");
  hallazgos.push({
    dimension: "Momento Inicio (Activación)",
    planificado: plan.inicio ? plan.inicio.slice(0, 200) + "..." : "Activación de conocimientos",
    observado_en_aula: tienePreguntasPrevias
      ? "Se formulan preguntas diagnósticas para rescatar conocimientos previos de los niños."
      : "El practicante inicia directamente con la explicación del contenido sin una fase de activación diagnóstica.",
    estado: tienePreguntasPrevias ? "Cumplido" : "Ajuste Recomendado",
    indicador: "CE1.1 / CE2.1"
  });

  // 3. Contrastación del Desarrollo y Recursos
  const desarrolloPlan = (plan.desarrollo || "").toLowerCase();
  const usoMaterial = textoAula.includes("material") || textoAula.includes("ficha") || textoAula.includes("guía") || textoAula.includes("pizarra") || textoAula.includes("cuaderno");
  const interaccionPares = textoAula.includes("pareja") || textoAula.includes("grupo") || textoAula.includes("compañero") || textoAula.includes("conversen");
  
  hallazgos.push({
    dimension: "Momento Desarrollo (Interacción y Recursos)",
    planificado: plan.desarrollo ? plan.desarrollo.slice(0, 200) + "..." : "Actividad guiada e independiente",
    observado_en_aula: `${usoMaterial ? "Se incorporan soportes y materiales durante el modelaje. " : "Interacción predominantemente verbal/pizarra. "}${interaccionPares ? "Se promueve el trabajo colaborativo entre escolares." : "Predomina el trabajo individual guiado por el docente."}`,
    estado: (usoMaterial && interaccionPares) ? "Cumplido" : "Parcial",
    indicador: "CE1.2 / CE4.1 / CE5.1"
  });

  // 4. Contrastación del Cierre y Evaluación Formativa
  const cierrePlan = (plan.cierre || "").toLowerCase();
  const lineasCierre = lineas.slice(Math.max(0, lineas.length - 8));
  const textoCierre = lineasCierre.map(l => l.x.toLowerCase()).join(" ");
  const tieneSintesis = textoCierre.includes("qué aprendimos") || textoCierre.includes("para terminar") || textoCierre.includes("en conclusión") || textoCierre.includes("resumen");

  hallazgos.push({
    dimension: "Momento Cierre (Evaluación Formativa)",
    planificado: plan.cierre ? plan.cierre.slice(0, 200) + "..." : "Síntesis y metacognición",
    observado_en_aula: tieneSintesis
      ? "Se destina un espacio formal para la síntesis de los aprendizajes y verificación de comprensión."
      : "El cierre resulta apresurado o centrado en la instrucción de guardar materiales, omitiendo la síntesis conceptual.",
    estado: tieneSintesis ? "Cumplido" : "Oportunidad de Mejora",
    indicador: "CE2.4 / CE5.4"
  });

  return {
    resumen: `Se contrastaron los 3 momentos didácticos de la planificación con los ${lineas.length} turnos de habla de la grabación de aula.`,
    cumplimiento_general: hallazgos.filter(h => h.estado === "Cumplido").length >= 3 ? "Alto" : "Medio",
    hallazgos
  };
}

/**
 * Extrae evidencias concretas ancladas a las 8 competencias PEB a partir de la transcripción.
 */
export function extraerEvidenciasPEB(lineas, episodios, mencion = "MMYCN") {
  const evidencias = [];
  let evId = 1;

  for (let k = 0; k < lineas.length; k++) {
    const l = lineas[k];
    const idx = k + 1;
    const txt = (l.x || "").toLowerCase();
    const hablante = l.s || "";

    // 1. CE1: Inclusión, diversidad, andamiaje DUA o atención personalizada
    if (txt.includes("ven acá") || txt.includes("te ayudo") || txt.includes("veamos juntos") || txt.includes("qué parte te cuesta") || txt.includes("con calma") || txt.includes("fichas de colores")) {
      evidencias.push({
        id: "ev-" + (evId++),
        comp_id: "CE1",
        indicador_id: "CE1.2",
        tipo: "apoya",
        ini_linea: Math.max(1, idx - 1),
        fin_linea: Math.min(lineas.length, idx + 2),
        timestamp_ini: l.t,
        timestamp_fin: lineas[Math.min(lineas.length - 1, idx + 1)]?.t || l.t,
        observado: `El practicante detecta una dificultad y brinda andamiaje específico: "${l.x.slice(0, 110)}"`,
        interpretacion: "Ajusta la modalidad de presentación y apoyo frente a una barrera de aprendizaje individual (Principio DUA)."
      });
      if (evidencias.length >= 10) break;
    }

    // 2. CE2: Preguntas de razonamiento y monitoreo formativo
    if (txt.includes("¿por qué") || txt.includes("¿cómo sabes") || txt.includes("qué significa") || txt.includes("cómo lo descubriste") || txt.includes("explícale a tus compañeros")) {
      evidencias.push({
        id: "ev-" + (evId++),
        comp_id: "CE2",
        indicador_id: "CE2.2",
        tipo: "apoya",
        ini_linea: Math.max(1, idx - 1),
        fin_linea: Math.min(lineas.length, idx + 2),
        timestamp_ini: l.t,
        timestamp_fin: lineas[Math.min(lineas.length - 1, idx + 1)]?.t || l.t,
        observado: `Formulación de preguntas orientadas a indagar en la comprensión: "${l.x.slice(0, 110)}"`,
        interpretacion: "Monitorea la construcción conceptual demandando justificación y razonamiento antes de validar la respuesta."
      });
      if (evidencias.length >= 10) break;
    }

    // 3. CE5: Didáctica específica de la mención y tratamiento pedagógico del error
    if (txt.includes("material concreto") || txt.includes("recta numérica") || txt.includes("fracción") || txt.includes("hipótesis") || txt.includes("texto") || txt.includes("párrafo") || txt.includes("idea principal") || txt.includes("distinto")) {
      evidencias.push({
        id: "ev-" + (evId++),
        comp_id: "CE5",
        indicador_id: "CE5.3",
        tipo: "apoya",
        ini_linea: Math.max(1, idx - 1),
        fin_linea: Math.min(lineas.length, idx + 2),
        timestamp_ini: l.t,
        timestamp_fin: lineas[Math.min(lineas.length - 1, idx + 1)]?.t || l.t,
        observado: `Uso de representaciones didácticas disciplinarias: "${l.x.slice(0, 110)}"`,
        interpretacion: `Aplica herramientas y representaciones específicas propias de la mención (${mencion}) para mediar el aprendizaje.`
      });
      if (evidencias.length >= 10) break;
    }

    // 4. CE3: Oportunidad de profundización no aprovechada (contraevidencia)
    if (txt.includes("ya, correcto, sigamos") || txt.includes("anótenlo rápido") || txt.includes("sí, está bien, pasemos a la siguiente") || txt.includes("todos entendieron, ¿verdad?")) {
      evidencias.push({
        id: "ev-" + (evId++),
        comp_id: "CE3",
        indicador_id: "CE3.3",
        tipo: "discrepa",
        ini_linea: Math.max(1, idx - 1),
        fin_linea: Math.min(lineas.length, idx + 2),
        timestamp_ini: l.t,
        timestamp_fin: lineas[Math.min(lineas.length - 1, idx + 1)]?.t || l.t,
        observado: `Validación inmediata sin explorar el pensamiento del escolar: "${l.x.slice(0, 110)}"`,
        interpretacion: "Oportunidad de indagación no aprovechada: se asume comprensión grupal sin contrastar diferentes procedimientos entre pares."
      });
      if (evidencias.length >= 10) break;
    }

    // 5. CG2: Comunicación y modelamiento claro
    if (txt.includes("como objetivo de hoy") || txt.includes("escuchen con atención") || txt.includes("miren la pizarra") || txt.includes("vamos a representar")) {
      evidencias.push({
        id: "ev-" + (evId++),
        comp_id: "CG2",
        indicador_id: "CG2.1",
        tipo: "apoya",
        ini_linea: Math.max(1, idx - 1),
        fin_linea: Math.min(lineas.length, idx + 2),
        timestamp_ini: l.t,
        timestamp_fin: lineas[Math.min(lineas.length - 1, idx + 1)]?.t || l.t,
        observado: `Estructuración clara de la consigna pedagógica: "${l.x.slice(0, 110)}"`,
        interpretacion: "Comunica con registro formal y accesible el propósito y las expectativas de la tarea escolar."
      });
      if (evidencias.length >= 10) break;
    }
  }

  // Si no se encontraron suficientes por palabras clave, asegurar evidencias básicas
  if (evidencias.length < 3 && lineas.length > 2) {
    evidencias.push({
      id: "ev-" + (evId++),
      comp_id: "CE2",
      indicador_id: "CE2.1",
      tipo: "apoya",
      ini_linea: 1,
      fin_linea: Math.min(4, lineas.length),
      timestamp_ini: lineas[0]?.t || "00:00",
      timestamp_fin: lineas[Math.min(3, lineas.length - 1)]?.t || "01:00",
      observado: `Apertura e inicio de la sesión: "${lineas[0].x.slice(0, 100)}"`,
      interpretacion: "Enmarca la clase escolar según la secuencia didáctica establecida."
    });
    evidencias.push({
      id: "ev-" + (evId++),
      comp_id: "CG2",
      indicador_id: "CG2.2",
      tipo: "apoya",
      ini_linea: Math.floor(lineas.length / 2),
      fin_linea: Math.min(lineas.length, Math.floor(lineas.length / 2) + 2),
      timestamp_ini: lineas[Math.floor(lineas.length / 2)]?.t || "20:00",
      timestamp_fin: lineas[Math.min(lineas.length - 1, Math.floor(lineas.length / 2) + 1)]?.t || "21:00",
      observado: `Intercambio de mediación docente: "${lineas[Math.floor(lineas.length / 2)].x.slice(0, 100)}"`,
      interpretacion: "Interacción comunicativa en el desarrollo de la actividad pedagógica."
    });
  }

  return evidencias;
}

/**
 * Valora el nivel de logro de cada competencia de Educación Básica (Nivel ND2 para Práctica IV).
 */
export function valorarCompetenciasPEB(evidencias, mencion = "MMYCN") {
  const compList = MATRIZ_PEB.length > 0 ? MATRIZ_PEB : [
    { id: "CG1", nombre: "Diagnóstico social, ético y bien común", tipo: "Generica" },
    { id: "CG2", nombre: "Comunicación profesional efectiva", tipo: "Generica" },
    { id: "CG3", nombre: "Inglés funcional docente", tipo: "Generica" },
    { id: "CE1", nombre: "Enfoques inclusivos y diversidad en el aula", tipo: "Especifica" },
    { id: "CE2", nombre: "Planificación y evaluación pedagógica", tipo: "Especifica" },
    { id: "CE3", nombre: "Reflexión crítica y mejora profesional", tipo: "Especifica" },
    { id: "CE4", nombre: "Interdisciplinariedad y vínculo cultural en Básica", tipo: "Especifica" },
    { id: "CE5", nombre: `Situaciones de enseñanza según mención (${mencion})`, tipo: "Especifica" }
  ];

  return compList.map(c => {
    const propias = evidencias.filter(e => e.comp_id === c.id);
    const apoya = propias.filter(e => e.tipo === "apoya");
    const discrepa = propias.filter(e => e.tipo === "discrepa");

    let categoria = "0";
    let fuerza = "no_determinable";
    let justificacion = "";
    let limites = "";
    let pregunta = "";
    let meta = "";

    if (apoya.length >= 2) {
      categoria = "2"; // ND2 Logrado en PPIV
      fuerza = "alta";
      justificacion = `Se observan al menos ${apoya.length} episodios de aula donde se evidencian actuaciones consistentes con los criterios de ${c.nombre} en nivel ND2.`;
      limites = discrepa.length ? `Se identifica ${discrepa.length} episodio donde pudo profundizarse más en la justificación de los escolares.` : "Registro focalizado en una sesión de aula.";
      pregunta = `¿Qué diferencias observaste entre la respuesta que esperabas de los estudiantes y cómo argumentaron realmente en el aula?`;
      meta = `En la próxima clase, solicitar a dos estudiantes que contrasten sus estrategias antes de validar la respuesta correcta.`;
    } else if (apoya.length === 1) {
      categoria = "1"; // Incipiente
      fuerza = "media";
      justificacion = `Se identifica una actuación asociada a la competencia, aunque aún con mediación directiva del practicante.`;
      limites = "Un único episodio no permite afirmar consistencia en el desempeño habitual.";
      pregunta = `¿Qué decisión tomaste en ese momento de la clase y qué otras alternativas didácticas tenías a tu alcance?`;
      meta = `Generar al menos dos momentos intencionados de diálogo reflexivo entre pares durante el desarrollo de la clase.`;
    } else {
      categoria = "0";
      fuerza = "no_determinable";
      justificacion = `No se registraron episodios observables explícitos para esta competencia en el fragmento grabado.`;
      limites = "La ausencia de evidencia en esta sesión puntual no equivale a falta de dominio de la competencia.";
      pregunta = `¿En qué momento de la secuencia didáctica tenías previsto promover esta competencia?`;
      meta = `Planificar de forma explícita una actividad articulada con esta competencia en la siguiente clase.`;
    }

    return {
      id: c.id,
      nombre: c.nombre,
      tipo: c.tipo,
      categoria,
      fuerza,
      justificacion,
      limites,
      pregunta,
      meta
    };
  });
}

/**
 * Fases del diálogo socrático de tutoría reflexiva (Práctica IV - Educación Básica)
 */
export const FASES_REFLEXION_BASICA = [
  {
    fase: 1,
    nombre: "Focalización y Reconstrucción del Aula",
    pregunta_guia: "¿Qué episodio específico de la grabación consideras que fue el momento más desafiante o significativo en el aprendizaje de los niños?"
  },
  {
    fase: 2,
    nombre: "Triangulación con la Planificación",
    pregunta_guia: "Al contrastar lo que tenías planificado en tu diseño con lo que efectivamente ocurrió en la clase: ¿qué imprevistos surgieron y qué ajustes tuviste que realizar en tiempo real?"
  },
  {
    fase: 3,
    nombre: "Análisis del Pensamiento y Aprendizaje Infantil",
    pregunta_guia: "Observando las respuestas y producciones de los estudiantes: ¿qué evidencias concretas tienes de que comprendieron el concepto central y no solo siguieron un procedimiento mecánico?"
  },
  {
    fase: 4,
    nombre: "Examen de Decisiones y Creencias Docentes",
    pregunta_guia: "¿Desde qué referentes teóricos o principios pedagógicos (ej. DUA, didáctica específica de tu mención) fundamentas las decisiones que tomaste frente a las dudas de los niños?"
  },
  {
    fase: 5,
    nombre: "Plan de Acción y Compromisos para la Próxima Clase",
    pregunta_guia: "Pensando en tu próxima intervención pedagógica: ¿qué modificación concreta y verificable implementarás para potenciar la participación y el aprendizaje de todos los escolares?"
  }
];

/**
 * Procesa un turno del Chatbot Tutor Reflexivo
 */
export function procesarTurnoReflexionPEB(historialTurnos, mensajeUsuario, contexto) {
  const faseActual = Math.min(5, Math.max(1, historialTurnos.length ? Math.floor(historialTurnos.length / 2) + 1 : 1));
  const faseConfig = FASES_REFLEXION_BASICA[faseActual - 1] || FASES_REFLEXION_BASICA[4];

  // Si el usuario recién inicia el diálogo
  if (!mensajeUsuario || historialTurnos.length === 0) {
    return {
      fase: 1,
      sender: 'chatbot',
      message: `¡Hola! He analizado tu planificación y la grabación de tu clase de Educación Básica. Para acompañarte en la reflexión sobre tu práctica docente y preparar el Capítulo 8 de tu Portafolio de Práctica IV, iniciaremos revisando lo sucedido en el aula.\n\n${faseConfig.pregunta_guia}`
    };
  }

  // Respuestas socráticas adaptadas según la fase
  let respuestaBot = "";
  if (faseActual === 1) {
    respuestaBot = `Muy interesante ese momento que señalas. Justamente en la grabación se observa cómo los escolares reaccionaron a esa intervención. Ahora demos el siguiente paso: contrastemos esto con tu diseño didáctico.\n\n${FASES_REFLEXION_BASICA[1].pregunta_guia}`;
  } else if (faseActual === 2) {
    respuestaBot = `Es muy valioso reconocer los desvíos entre lo planificado y lo emergente; la gestión de aula en Educación Básica requiere flexibilidad continua. Ahora pongamos el foco en los estudiantes:\n\n${FASES_REFLEXION_BASICA[2].pregunta_guia}`;
  } else if (faseActual === 3) {
    respuestaBot = `Identificar evidencia genuina de razonamiento en lugar de mera repetición es una competencia clave (CE2/CE5). Conectemos esto con tu marco formativo:\n\n${FASES_REFLEXION_BASICA[3].pregunta_guia}`;
  } else if (faseActual === 4) {
    respuestaBot = `Excelente fundamentación. Esa vinculación entre teoría y práctica es el corazón de la evaluación docente (CE3). Para cerrar este ciclo reflexivo:\n\n${FASES_REFLEXION_BASICA[4].pregunta_guia}`;
  } else {
    respuestaBot = `¡Excelente trabajo de reflexión! Has transitado por las 5 dimensiones clave requeridas en la Rúbrica Analítica de Portafolio Docente. Con tus respuestas he generado automáticamente el borrador estructurado para el **Capítulo 8: Reflexión Docente** de tu Portafolio de Práctica IV, listo para revisar y exportar.`;
  }

  return {
    fase: Math.min(5, faseActual + 1),
    sender: 'chatbot',
    message: respuestaBot
  };
}

/**
 * Compila automáticamente el borrador del Capítulo 8 (Reflexión Docente) del Portafolio PPIV
 * a partir de la contrastación, evidencias y diálogo reflexivo.
 */
export function compilarBorradorReflexionPortafolio(intervencion, plan, contraste, evidencias, historialTurnos) {
  const respuestasEstudiante = historialTurnos.filter(t => t.sender === 'user').map(t => t.message);

  const capitulo8 = `## CAPÍTULO 8: REFLEXIÓN DOCENTE (PRÁCTICA PEDAGÓGICA IV)

### 8.1 Caracterización y Contexto de la Intervención Pedagógica
La presente reflexión docente se sustenta en la clase implementada en el nivel de ${intervencion?.nivel_escolar || "Educación Básica"}, en la temática "${intervencion?.titulo_clase || "Desarrollo Curricular"}", articulada con los Objetivos de Aprendizaje de la mención ${intervencion?.mencion || "MMYCN"}.

### 8.2 Contrastación Crítica: Planificación vs. Ejecución Real en el Aula
Al contrastar el diseño inicial con la interacción efectivamente desarrollada en el aula, se constata lo siguiente:
- **Propósito y Objetivos**: ${contraste?.hallazgos?.[0]?.observado_en_aula || "Se comunicó y encuadró el objetivo de la clase."}
- **Momento Inicio**: ${contraste?.hallazgos?.[1]?.observado_en_aula || "Se rescataron conocimientos previos de los niños."}
- **Momento Desarrollo**: ${contraste?.hallazgos?.[2]?.observado_en_aula || "Se implementaron actividades de mediación y uso de recursos."}
- **Momento Cierre**: ${contraste?.hallazgos?.[3]?.observado_en_aula || "Se realizó un cierre pedagógico con verificación formativa."}

${respuestasEstudiante[1] ? `*Reflexión del practicante sobre los desvíos y ajustes*: "${respuestasEstudiante[1]}"` : ""}

### 8.3 Análisis de Evidencias de Aprendizaje y Pensamiento de los Escolares
Durante el desarrollo de la sesión se identificaron evidencias clave de aprendizaje:
${evidencias.filter(e => e.tipo === 'apoya').slice(0, 3).map(e => `- [${e.timestamp_ini}] ${e.observado}. *Interpretación didáctica*: ${e.interpretacion}`).join("\n")}

${respuestasEstudiante[2] ? `*Análisis del razonamiento escolar*: "${respuestasEstudiante[2]}"` : ""}

### 8.4 Fundamentación Teórica y Decisiones Pedagógicas (Relación Teoría - Práctica)
Las decisiones didácticas adoptadas se fundamentan en referentes de la educación inclusiva y didáctica de la especialidad:
- Enfoque inclusivo (CE1): aplicación de principios del Diseño Universal para el Aprendizaje (DUA) mediante diversificación de soportes.
- Mediación formativa (CE2/CE5): utilización del error como trampolín para el razonamiento y la formulación de preguntas indagatorias.

${respuestasEstudiante[3] ? `*Fundamentación declarada*: "${respuestasEstudiante[3]}"` : ""}

### 8.5 Compromisos y Plan de Desarrollo Profesional para la Próxima Clase
A partir de la evidencia sistematizada y el diálogo reflexivo, se establecen los siguientes compromisos verificables:
1. ${respuestasEstudiante[4] || "Generar instancias sistemáticas de contrastación de procedimientos entre pares antes de validar respuestas."}
2. Consolidar el momento de cierre destinando al menos 8 minutos para un ticket de salida individual que evidencie el logro del OA.
3. Continuar diversificando los andamiajes para aquellos estudiantes que requieren apoyos específicos.
`;

  return {
    titulo: "Capítulo 8: Reflexión Docente (Portafolio PPIV)",
    contenido_markdown: capitulo8,
    criterios_cumplidos: [
      "Análisis crítico de decisiones didácticas",
      "Evidencias concretas del pensamiento de los estudiantes ancladas a marcas de tiempo",
      "Relación teoría-práctica con marcos pedagógicos y normativos",
      "Propuesta de mejora y plan de desarrollo profesional verificable"
    ]
  };
}
