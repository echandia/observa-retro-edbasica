/**
 * Genera un ejemplo completo de análisis con datos reales del año 2025:
 * Caso: Belén Pizarro Torres (6° Básico, Escuela Básica Arturo Prat, Tomé)
 * Mención: Matemática y Ciencias Naturales (MMYCN) - Tutora: Prof. María Angélica Uribe
 * Contenido: Geometría e Interdisciplinariedad (Ángulos entre paralelas y transversales)
 */

import db from '../server/db.js';
import { randomUUID, scryptSync, randomBytes } from 'node:crypto';
import {
  segmentarEpisodiosBasica,
  contrastarPlanificacionConAula,
  extraerEvidenciasPEB,
  valorarCompetenciasPEB,
  procesarTurnoReflexionPEB,
  compilarBorradorReflexionPortafolio
} from '../server/pedagogyEnginePEB.js';

async function seedExample2025() {
  console.log('🔄 Generando caso de análisis con datos del portafolio 2025...\n');

  const now = new Date().toISOString();
  const salt = randomBytes(16).toString('hex');
  const passwordHash = scryptSync('basica2026', salt, 64).toString('hex');

  // 1. Crear o actualizar usuaria practicante
  const email = 'bpizarro@ebasica.ucsc.cl';
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  const userId = existingUser ? existingUser.id : 'user-bpizarro-ebasica-ucsc-cl';

  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, role, rut, mencion, institucion, created_at)
    VALUES (?, ?, ?, ?, 'Belén Pizarro Torres', 'estudiante', '20456789-3', 'MMYCN', 'UCSC', ?)
    ON CONFLICT(email) DO UPDATE SET name = 'Belén Pizarro Torres'
  `).run(userId, email, passwordHash, salt, now);

  // 2. Limpieza y creación de la Intervención Pedagógica de 2025
  const intervId = 'interv-2025-pizarro-geometria';
  db.prepare(`DELETE FROM turnos_reflexion WHERE intervencion_id = ?`).run(intervId);
  db.prepare(`DELETE FROM borrador_portafolio WHERE intervencion_id = ?`).run(intervId);
  db.prepare(`DELETE FROM valoraciones_competencias WHERE intervencion_id = ?`).run(intervId);
  db.prepare(`DELETE FROM evidencias WHERE intervencion_id = ?`).run(intervId);
  db.prepare(`DELETE FROM contrastaciones WHERE intervencion_id = ?`).run(intervId);
  db.prepare(`DELETE FROM transcripciones WHERE intervencion_id = ?`).run(intervId);
  db.prepare(`DELETE FROM grabaciones WHERE intervencion_id = ?`).run(intervId);
  db.prepare(`DELETE FROM planificaciones WHERE intervencion_id = ?`).run(intervId);
  db.prepare(`DELETE FROM intervenciones WHERE id = ?`).run(intervId);

  db.prepare(`
    INSERT INTO intervenciones (
      id, user_id, fecha, curso, colegio, nivel_escolar, mencion,
      titulo_clase, tema, estado, es_ejemplo_referencia, created_at, updated_at
    ) VALUES (?, ?, '2025-10-22', '6° Básico A', 'Escuela Básica Arturo Prat (Tomé)', '6° Básico', 'MMYCN',
      'Geometría e Interdisciplinariedad: Rectas Paralelas y Ángulos Opuestos',
      'Ángulos entre paralelas cortadas por una transversal y relato matemático',
      'analizada', 1, ?, ?)
  `).run(intervId, userId, now, now);

  // 3. Planificación de la Clase (extraída fielmente del portafolio 2025)
  const planId = 'plan-2025-pizarro';
  const oaTrabajar = 'OA 17: Demostrar de manera concreta, pictórica y simbólica que la suma de los ángulos de un triángulo y cuadrilátero es constante, e identificar ángulos opuestos por el vértice y suplementarios entre paralelas.';
  const objClase = 'Identificar y contrastar las relaciones entre ángulos opuestos por el vértice y suplementarios formados por dos rectas paralelas cortadas por una transversal, mediante la medición con transportador y el análisis de un relato interdisciplinario.';
  
  const inicioPlan = `Los estudiantes reciben instrucciones donde al azar algunos serán escogidos para escribir en la pizarra palabras claves que recuerdan: ¿Por qué su compañero escribió "paralelas"? ¿Recuerdan qué vimos la clase anterior? ¿Qué era un ángulo? Luego los estudiantes reciben un breve texto que presenta una historia matemática ("El enigma de Lucía"), la cual leen en silencio para responder: ¿Cuál es la problemática del relato? ¿Qué observó Lucía?`;

  const desarrolloPlan = `Los estudiantes dibujan en su cuaderno dos rectas paralelas cortadas por una transversal. Nombran los puntos de intersección de A a H. Con el transportador miden todos los ángulos y anotan sus medidas. Comparan los ángulos entre sí y escriben sus conclusiones. Lectura en voz alta de conclusiones y retroalimentación docente. Presentación interactiva de las propiedades de los ángulos opuestos por el vértice y suplementarios. Retoman el texto de Lucía para justificar las relaciones descubiertas.`;

  const cierrePlan = `A modo de ticket de salida individual en su cuaderno, los estudiantes deben construir dos pares de ángulos opuestos por el vértice, un par de ángulos complementarios y un par de suplementarios, rotulando sus medidas exactas y explicando brevemente con sus palabras la regla geométrica observada.`;

  const rawTextPlan = `PROPUESTA PEDAGÓGICA: Geometría e Interdisciplinariedad con Lenguaje\nNIVEL: 6° Básico\nASIGNATURA: Matemática\n${oaTrabajar}\nOBJETIVO: ${objClase}\nINICIO: ${inicioPlan}\nDESARROLLO: ${desarrolloPlan}\nCIERRE: ${cierrePlan}\nRECURSOS: Pizarra, texto "El enigma de Lucía", transportador, regla, cuaderno.\nEVALUACIÓN: Ticket de salida formativo con pauta de cotejo.`;

  db.prepare(`DELETE FROM planificaciones WHERE intervencion_id = ?`).run(intervId);
  db.prepare(`
    INSERT INTO planificaciones (
      id, intervencion_id, user_id, filename, filepath, oa_curricular,
      obj_clase, inicio_plan, desarrollo_plan, cierre_plan, recursos,
      evaluacion_plan, raw_text, created_at
    ) VALUES (?, ?, ?, 'Secuencia_Didactica_Belen_Pizarro_2025.docx', 'PRACTICA IV/PORTAFOLIO/...', ?, ?, ?, ?, ?, 'Transportador, regla, texto Lucía, pizarra', 'Ticket de salida', ?, ?)
  `).run(planId, intervId, userId, oaTrabajar, objClase, inicioPlan, desarrolloPlan, cierrePlan, rawTextPlan, now);

  // 4. Grabación y Transcripción de Aula (Simulación fiel basada en la evidencia del portafolio)
  const grabId = 'grab-2025-pizarro';
  db.prepare(`DELETE FROM grabaciones WHERE intervencion_id = ?`).run(intervId);
  db.prepare(`
    INSERT INTO grabaciones (
      id, intervencion_id, user_id, filename, filepath, mimetype, duration, transcription_status, created_at
    ) VALUES (?, ?, ?, 'Clase_Geometria_Belen_Pizarro_2025.mp3', 'demo_pizarro', 'audio/mpeg', 2700, 'completed', ?)
  `).run(grabId, intervId, userId, now);

  const lineasTranscripcion = [
    { t: "00:00:15", s: "Practicante", x: "¡Buenos días 6° A! Tomen asiento rápidamente para comenzar nuestra clase de Geometría." },
    { t: "00:00:30", s: "Practicante", x: "Hoy nuestro objetivo será identificar y medir los ángulos que se forman cuando dos rectas paralelas son cortadas por una transversal, y resolveremos el enigma del relato que les traje." },
    { t: "00:01:00", s: "Practicante", x: "Ignacio, pasa a la pizarra, por favor. Escribe una palabra clave de lo que estuvimos repasando la clase anterior." },
    { t: "00:01:25", s: "E1 (Ignacio)", x: "Escribí 'paralelas', tía." },
    { t: "00:01:35", s: "Practicante", x: "¿Por qué Ignacio escribió 'paralelas'? ¿Qué significa que dos rectas sean paralelas en el plano? A ver, Lucía." },
    { t: "00:01:50", s: "E2 (Lucía)", x: "Que van en la misma dirección y nunca se van a tocar o cruzar, como las líneas del tren." },
    { t: "00:02:10", s: "Practicante", x: "¡Excelente conexión con la vida cotidiana! Ahora lean en silencio el texto 'El enigma de Lucía' que dejé en sus mesas. Tienen 3 minutos." },
    { t: "00:05:20", s: "Practicante", x: "Ahora todos abran su cuaderno. Tomen regla y lápiz: dibujen dos rectas paralelas y tracen una línea diagonal que las cruce a ambas. Esa línea transversal es la clave." },
    { t: "00:07:00", s: "Practicante", x: "Con el transportador, vamos a medir cada uno de los 8 ángulos que se formaron en los vértices." },
    { t: "00:08:45", s: "Practicante", x: "Felipe, veo que estás teniendo problemas para ubicar el centro del transportador. Ven acá, veamos juntos." },
    { t: "00:09:05", s: "E3 (Felipe)", x: "Es que no sé si medir con los números de arriba o los de abajo, se me corre el transportador." },
    { t: "00:09:20", s: "Practicante", x: "Tranquilo Felipe. Fíjate en este punto central del transportador: hazlo coincidir justo con el vértice del ángulo. ¿La línea base apunta hacia la derecha o izquierda? Usemos la escala interior. ¿Cuánto marca ahora?" },
    { t: "00:09:40", s: "E3 (Felipe)", x: "¡Marca 120 grados!" },
    { t: "00:09:50", s: "Practicante", x: "¡Exacto! Buen trabajo. Ahora mide el ángulo que está justo al frente, al otro lado del vértice." },
    { t: "00:11:15", s: "E3 (Felipe)", x: "¡Tía, también mide 120 grados! ¡Son iguales!" },
    { t: "00:11:30", s: "Practicante", x: "¡Maravilloso descubrimiento! Niños y niñas, escuchen lo que descubrió Felipe: los dos ángulos que están frente a frente miden exactamente lo mismo. ¿Cómo se llaman esos ángulos según el texto de Lucía?" },
    { t: "00:12:00", s: "E4 (Sofía)", x: "¡Ángulos opuestos por el vértice!" },
    { t: "00:12:15", s: "Practicante", x: "Muy bien, Sofía. Ahora observen el ángulo que está justo al lado sobre la misma recta: ¿cuánto debe sumar con los 120 grados para formar la línea recta completa?" },
    { t: "00:12:40", s: "E5 (Tomás)", x: "Debe sumar 180 grados, o sea que mide 60 grados. Son suplementarios." },
    { t: "00:13:10", s: "Practicante", x: "Excelente deducción matemática. Anoten en sus cuadernos esta conclusión clave." },
    { t: "00:14:00", s: "Practicante", x: "Para cerrar nuestra clase: cada uno va a responder el ticket de salida en su cuaderno. Dibujen dos rectas paralelas, marquen un ángulo de 75° y deduzcan los otros tres ángulos del mismo vértice justificando por qué son opuestos o suplementarios. Tienen 6 minutos antes del recreo." },
    { t: "00:19:30", s: "Practicante", x: "Tiempo cumplido. Dejen sus tickets en mi mesa. ¡Gran trabajo hoy descubriendo las propiedades de los ángulos!" }
  ];

  const episodios = segmentarEpisodiosBasica(lineasTranscripcion);

  db.prepare(`DELETE FROM transcripciones WHERE grabacion_id = ?`).run(grabId);
  db.prepare(`
    INSERT INTO transcripciones (
      id, grabacion_id, intervencion_id, raw_text, lineas_json, episodios_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'trans-2025-pizarro',
    grabId,
    intervId,
    lineasTranscripcion.map(l => `[${l.t}] ${l.s}: ${l.x}`).join('\n'),
    JSON.stringify(lineasTranscripcion),
    JSON.stringify(episodios),
    now
  );

  // 5. Motor de Contrastación (Planificación vs. Aula Real)
  const planSimulado = {
    oa_trabajar: oaTrabajar,
    objetivo_clase: objClase,
    inicio: inicioPlan,
    desarrollo: desarrolloPlan,
    cierre: cierrePlan
  };
  const contraste = contrastarPlanificacionConAula(planSimulado, lineasTranscripcion);

  db.prepare(`DELETE FROM contrastaciones WHERE intervencion_id = ?`).run(intervId);
  db.prepare(`
    INSERT INTO contrastaciones (
      id, intervencion_id, resumen_contraste, inicio_cumplimiento,
      desarrollo_cumplimiento, cierre_cumplimiento, desvios_didacticos,
      hallazgos_clave, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'cont-2025-pizarro',
    intervId,
    contraste.resumen,
    contraste.hallazgos[1]?.observado_en_aula || '',
    contraste.hallazgos[2]?.observado_en_aula || '',
    contraste.hallazgos[3]?.observado_en_aula || '',
    contraste.cumplimiento_general,
    JSON.stringify(contraste.hallazgos),
    now
  );

  // 6. Evidencias de Competencias
  const evidencias = extraerEvidenciasPEB(lineasTranscripcion, episodios, 'MMYCN');
  db.prepare(`DELETE FROM evidencias WHERE intervencion_id = ?`).run(intervId);
  const insertEv = db.prepare(`
    INSERT INTO evidencias (
      id, intervencion_id, comp_id, indicador_id, tipo, ini_linea,
      fin_linea, timestamp_ini, timestamp_fin, observado, interpretacion, fuente, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'grabacion', ?)
  `);

  for (const ev of evidencias) {
    insertEv.run(ev.id, intervId, ev.comp_id, ev.indicador_id, ev.tipo, ev.ini_linea, ev.fin_linea, ev.timestamp_ini, ev.timestamp_fin, ev.observado, ev.interpretacion, now);
  }

  // 7. Valoración de Competencias en ND2
  const valoraciones = valorarCompetenciasPEB(evidencias, 'MMYCN');
  db.prepare(`DELETE FROM valoraciones_competencias WHERE intervencion_id = ?`).run(intervId);
  const insertVal = db.prepare(`
    INSERT INTO valoraciones_competencias (
      id, intervencion_id, comp_id, categoria, fuerza, justificacion, limites, pregunta, meta, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const v of valoraciones) {
    insertVal.run('val-' + randomUUID(), intervId, v.id, v.categoria, v.fuerza, v.justificacion, v.limites, v.pregunta, v.meta, now);
  }

  // 8. Diálogo Socrático del Chatbot Tutor Reflexivo (Con citas reales de su portafolio 2025)
  db.prepare(`DELETE FROM turnos_reflexion WHERE intervencion_id = ?`).run(intervId);
  const insertTurno = db.prepare(`
    INSERT INTO turnos_reflexion (id, intervencion_id, user_id, sender, fase, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const turnosEjemplo = [
    {
      sender: 'chatbot',
      fase: 1,
      message: '¡Hola Belén! He contrastado tu planificación con la grabación de tu clase de Geometría en 6° Básico. Para construir el Capítulo 8 de tu Portafolio de Práctica IV, iniciaremos revisando lo sucedido en el aula.\n\n¿Qué episodio específico de la grabación consideras que fue el momento más desafiante o significativo en el aprendizaje de los niños?'
    },
    {
      sender: 'user',
      fase: 1,
      message: 'Considero que el momento más significativo fue cuando Felipe no lograba medir con el transportador porque se le corría el centro y no sabía qué escala usar. Al acercarme y modelar el apoyo con la escala interior, él mismo descubrió que el ángulo opuesto medía exactamente 120°, lo que permitió a todo el curso validar la propiedad por inducción y no por memorización.'
    },
    {
      sender: 'chatbot',
      fase: 2,
      message: 'Muy interesante ese momento con Felipe; en la grabación se aprecia cómo esa intervención individual andamió el aprendizaje colectivo. Ahora contrastemos con tu diseño:\n\nAl contrastar lo que tenías planificado en tu diseño con lo que efectivamente ocurrió en la clase: ¿qué imprevistos surgieron y qué ajustes tuviste que realizar en tiempo real?'
    },
    {
      sender: 'user',
      fase: 2,
      message: 'En la planificación había contemplado 5 minutos para que dibujaran y midieran, pero en la realidad me tomó casi 11 minutos porque varios estudiantes tenían debilidades motoras en el manejo del transportador. Tuve que ajustar el ritmo y modelar paso a paso en la pizarra antes de que continuaran solos.'
    },
    {
      sender: 'chatbot',
      fase: 3,
      message: 'Reconocer los desvíos temporales frente a la motricidad fina y manipulación instrumental es clave en Educación Básica. Ahora pongamos el foco en los estudiantes:\n\nObservando las respuestas y producciones de los estudiantes: ¿qué evidencias concretas tienes de que comprendieron el concepto central y no solo siguieron un procedimiento mecánico?'
    },
    {
      sender: 'user',
      fase: 3,
      message: 'La evidencia clara estuvo en el ticket de salida y en la respuesta de Tomás, quien dedujo que el ángulo adyacente debía medir 60° porque la línea recta forma un ángulo extendido de 180°, demostrando que comprendieron la noción de suplementariedad y no solo midieron con la herramienta.'
    },
    {
      sender: 'chatbot',
      fase: 4,
      message: 'Esa deducción conceptual evidencia un nivel de demanda cognitiva superior a la simple medición (CE2/CE5). Conectemos esto con tu marco formativo:\n\n¿Desde qué referentes teóricos o principios pedagógicos (ej. DUA, didáctica específica de tu mención) fundamentas las decisiones que tomaste frente a las dudas de los niños?'
    },
    {
      sender: 'user',
      fase: 4,
      message: 'Me fundamenté en la teoría sociocultural de Vygotsky, actuando como mediadora en su Zona de Desarrollo Próximo, y en el principio DUA de proporcionar múltiples formas de representación mediante el texto narrativo "El enigma de Lucía" para favorecer la interdisciplinariedad con Lenguaje.'
    },
    {
      sender: 'chatbot',
      fase: 5,
      message: 'Excelente fundamentación teórica situada. Para cerrar este ciclo reflexivo:\n\nPensando en tu próxima intervención pedagógica: ¿qué modificación concreta y verificable implementarás para potenciar la participación y el aprendizaje de todos los escolares?'
    },
    {
      sender: 'user',
      fase: 5,
      message: 'Para la siguiente clase organizaré a los estudiantes en parejas heterogéneas de trabajo práctico con roles asignados (trazador y verificador de medida) para optimizar los tiempos de manipulación geométrica, y destinaré un ticket de salida estructurado con rúbrica visible.'
    },
    {
      sender: 'chatbot',
      fase: 5,
      message: '¡Excelente trabajo de reflexión docente, Belén! Has transitado con éxito por las 5 dimensiones formativas de Práctica IV. He compilado automáticamente el borrador estructurado para el **Capítulo 8: Reflexión Docente** de tu Portafolio de Práctica IV, listo para exportar.'
    }
  ];

  for (const t of turnosEjemplo) {
    insertTurno.run('turn-' + randomUUID(), intervId, userId, t.sender, t.fase, t.message, now);
  }

  // 9. Compilar el Capítulo 8 de Portafolio
  const turnosParaCompilar = turnosEjemplo.filter(t => t.sender === 'user').map(t => ({ sender: 'user', message: t.message }));
  const borrador = compilarBorradorReflexionPortafolio(
    { nivel_escolar: '6° Básico', titulo_clase: 'Geometría e Interdisciplinariedad', mencion: 'MMYCN' },
    planSimulado,
    contraste,
    evidencias,
    turnosParaCompilar
  );

  db.prepare(`DELETE FROM borrador_portafolio WHERE intervencion_id = ?`).run(intervId);
  db.prepare(`
    INSERT INTO borrador_portafolio (
      id, intervencion_id, user_id, capitulo_reflexion, conclusiones, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'borr-2025-pizarro',
    intervId,
    userId,
    borrador.contenido_markdown,
    JSON.stringify(borrador.criterios_cumplidos),
    now
  );

  console.log('✅ Caso de análisis 2025 generado exitosamente:');
  console.log(`  - Practicante: Belén Pizarro Torres (${email})`);
  console.log(`  - Intervención ID: ${intervId}`);
  console.log(`  - Curso: 6° Básico A · Escuela Básica Arturo Prat (Tomé)`);
  console.log(`  - Mención: MMYCN (Matemática y Ciencias Naturales)`);
  console.log(`  - Planificación cargada: Sí (${oaTrabajar.slice(0, 60)}...)`);
  console.log(`  - Grabación y Transcripción: Sí (${lineasTranscripcion.length} turnos, 3 momentos didácticos)`);
  console.log(`  - Contrastación: Sí (${contraste.cumplimiento_general})`);
  console.log(`  - Evidencias extraídas: ${evidencias.length}`);
  console.log(`  - Competencias evaluadas: ${valoraciones.length} en nivel ND2`);
  console.log(`  - Diálogo Socrático Tutor: 11 turnos en 5 fases`);
  console.log(`  - Capítulo 8 de Portafolio compilado: Sí (${borrador.contenido_markdown.length} caracteres)\n`);
}

seedExample2025().catch(e => {
  console.error('Error al generar ejemplo:', e);
  process.exit(1);
});
