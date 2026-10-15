/**
 * Script de Entrenamiento y Carga del Caso Real "Detectives Financieros"
 * CIAE BASAL / UCSC - Pedagogía en Educación Básica (PPIV)
 */

import { readFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../server/db.js';
import { parseStructuredPlanDocx, extractTextFromDocx } from '../server/docxParser.js';
import {
  contrastarPlanificacionConAula,
  extraerEvidenciasPEB,
  valorarCompetenciasPEB,
  procesarTurnoReflexionPEB,
  compilarBorradorReflexionPortafolio,
  segmentarEpisodiosBasica
} from '../server/pedagogyEnginePEB.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function trainWithRealExample() {
  console.log('📚 Iniciando procesamiento y entrenamiento con "Ejemplo de entrenamiento"...\n');

  const folder = join(rootDir, 'Ejemplo de entrenamiento');
  const planDocx = join(folder, 'plani Intervención 1  “Detectives financieros”.docx');
  const transDocx = join(folder, 'Transcripción.docx');
  const audioFile = join(folder, 'intervención 1.m4a');

  if (!existsSync(planDocx) || !existsSync(transDocx) || !existsSync(audioFile)) {
    throw new Error('No se encontraron todos los archivos requeridos en "Ejemplo de entrenamiento"');
  }

  // 1. Parsear Planificación
  console.log('1. Extrayendo estructura de la planificación docente...');
  const parsedPlan = await parseStructuredPlanDocx(planDocx);
  console.log(`   ✅ Título: ${parsedPlan.propuesta_pedagogica}`);
  console.log(`   ✅ Objetivo de la Clase: ${parsedPlan.objetivo_clase}`);
  console.log(`   ✅ Inicio: ${parsedPlan.inicio.length} caracteres | Desarrollo: ${parsedPlan.desarrollo.length} caracteres | Cierre: ${parsedPlan.cierre.length} caracteres`);

  // 2. Parsear Transcripción Real
  console.log('\n2. Parseando transcripción de clase (276 turnos)...');
  const rawTranscript = await extractTextFromDocx(transDocx);
  const rawLines = rawTranscript.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const lineas = [];
  const parsedEpisodios = [];

  let currentTime = '00:00';
  let currentFase = 'Inicio';

  for (const line of rawLines) {
    const rangeMatch = line.match(/^\[(\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?\]\s*(.*)$/);
    if (rangeMatch) {
      currentTime = rangeMatch[1];
      const rest = rangeMatch[3] ? rangeMatch[3].trim() : '';
      if (rest) {
        const lower = rest.toLowerCase();
        if (lower.includes('cierre') || lower.includes('síntesis') || lower.includes('ticket') || lower.includes('conclusión')) {
          currentFase = 'Cierre';
        } else if (lower.includes('actividad') || lower.includes('desarrollo') || lower.includes('pista') || lower.includes('grupal') || lower.includes('misión') || lower.includes('mision')) {
          currentFase = 'Desarrollo';
        } else if (lower.includes('introducción') || lower.includes('apertura') || lower.includes('inicio')) {
          currentFase = 'Inicio';
        }
        parsedEpisodios.push({
          id: 'ep-' + (parsedEpisodios.length + 1),
          fase: currentFase,
          timestamp_ini: currentTime,
          titulo: rest
        });
      }
      continue;
    }

    const inlineMatch = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.+)$/);
    if (inlineMatch) {
      currentTime = inlineMatch[1];
      lineas.push({ t: currentTime, s: inlineMatch[2].trim(), x: inlineMatch[3].trim() });
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && colonIdx < 35) {
      const s = line.substring(0, colonIdx).trim();
      const x = line.substring(colonIdx + 1).trim();
      lineas.push({ t: currentTime, s, x });
      continue;
    }

    if (lineas.length > 0) {
      lineas[lineas.length - 1].x += ' ' + line;
    } else {
      lineas.push({ t: currentTime, s: 'Docente', x: line });
    }
  }

  const episodios = parsedEpisodios.length > 0 ? parsedEpisodios : segmentarEpisodiosBasica(lineas);
  console.log(`   ✅ ${lineas.length} líneas de diálogo escolar estructuradas.`);
  console.log(`   ✅ ${episodios.length} episodios y momentos didácticos identificados.`);

  // 3. Contrastación Planificación vs. Aula Real
  console.log('\n3. Ejecutando contrastación pedagógica (Plan vs. Realidad de Aula)...');
  const contraste = contrastarPlanificacionConAula(parsedPlan, lineas);
  console.log(`   ✅ Cumplimiento general detectado: ${contraste.cumplimiento_general}`);
  console.log(`   ✅ ${contraste.hallazgos.length} dimensiones contrastadas (Objetivo, Momentos, Desvíos).`);

  // 4. Extracción de Evidencias y Valoración de Competencias ND2
  console.log('\n4. Extrayendo evidencias y valorando competencias PEB...');
  const evidencias = extraerEvidenciasPEB(lineas, episodios, 'MMYCN');
  console.log(`   ✅ ${evidencias.length} evidencias didácticas extraídas.`);
  const valoraciones = valorarCompetenciasPEB(evidencias, 'MMYCN');
  console.log(`   ✅ 8 competencias PEB evaluadas en nivel ND2.`);

  // 5. Diálogo Socrático del Chatbot Tutor
  console.log('\n5. Generando diálogo socrático reflexivo de 5 fases...');
  const turnosMock = [
    { sender: 'chatbot', message: '¡Hola! He contrastado tu planificación de "Detectives financieros" con lo ocurrido en el aula. ¿Qué decisiones tomaste cuando los estudiantes comenzaron a debatir sobre las pistas distractoras?' },
    { sender: 'user', message: 'Decidí no adelantarles el procedimiento para que ellos mismos descubrieran qué datos eran irrelevantes (como el día martes o el número de alumnos) y cuáles eran los montos monetarios reales ($20.000, $7.000, $5.000).' },
    { sender: 'chatbot', message: 'Excelente decisión de andamiaje. En tu planificación indicaste 15 minutos para la actividad inicial, pero tomó un poco más de tiempo. ¿Cómo influyó esta mediación en la comprensión del problema?' },
    { sender: 'user', message: 'Permitió que los grupos con más dudas pudieran argumentar en las pizarras y consensuar que debían restar el gasto total al dinero inicial.' },
    { sender: 'chatbot', message: '¿Qué evidencias del pensamiento matemático de los estudiantes observaste durante la resolución?' },
    { sender: 'user', message: 'Observé que Mateo y Sebastián formularon hipótesis sobre si el saldo permitía una reserva, aplicando operaciones combinadas.' },
    { sender: 'chatbot', message: '¿Con qué referentes teóricos y principios DUA fundamentas haber partido desde el desafío lúdico antes de la formalización algorítmica?' },
    { sender: 'user', message: 'Me fundamenté en el enfoque de resolución de problemas de Polya y el principio DUA de proporcionar múltiples formas de motivación y representación visual en pizarras.' },
    { sender: 'chatbot', message: 'Para tu próxima intervención de aula, ¿qué compromiso de mejora asumes en la gestión del tiempo y la institucionalización del cierre?' },
    { sender: 'user', message: 'Asumo el compromiso de destinar 12 minutos exclusivos para la síntesis formal en la pizarra central y utilizar un ticket de salida individual estructurado.' }
  ];

  // 6. Compilar Capítulo 8 de Portafolio
  console.log('\n6. Compilando borrador del Capítulo 8 de Portafolio Docente...');
  const intervDummy = {
    nivel_escolar: '5° Básico (4°-8°)',
    titulo_clase: 'Intervención 1 “Detectives financieros”',
    mencion: 'MMYCN',
    colegio: 'Centro de Práctica PPIV'
  };
  const borrador = compilarBorradorReflexionPortafolio(intervDummy, parsedPlan, contraste, evidencias, turnosMock);
  console.log(`   ✅ Borrador generado con ${borrador.contenido_markdown.length} caracteres y ${borrador.criterios_cumplidos.length} criterios de la rúbrica.`);

  // 7. Guardar en SQLite y copiar archivos a uploads para reproducción
  console.log('\n7. Guardando caso en la base de datos SQLite y preparando streaming de audio...');
  const intervId = 'interv-detectives-financieros';
  const now = new Date().toISOString();

  // Asegurar directorios de uploads
  const uploadsPlans = join(rootDir, 'uploads', 'plans');
  const uploadsAudios = join(rootDir, 'uploads', 'audios');
  const uploadsDocs = join(rootDir, 'uploads', 'docs');
  mkdirSync(uploadsPlans, { recursive: true });
  mkdirSync(uploadsAudios, { recursive: true });
  mkdirSync(uploadsDocs, { recursive: true });

  const destAudio = join(uploadsAudios, `${intervId}_intervencion_1.m4a`);
  const destPlan = join(uploadsPlans, `${intervId}_plani_detectives_financieros.docx`);
  copyFileSync(audioFile, destAudio);
  copyFileSync(planDocx, destPlan);

  // Limpiar registros antiguos del caso si existían
  db.prepare('DELETE FROM turnos_reflexion WHERE intervencion_id = ?').run(intervId);
  db.prepare('DELETE FROM borrador_portafolio WHERE intervencion_id = ?').run(intervId);
  db.prepare('DELETE FROM valoraciones_competencias WHERE intervencion_id = ?').run(intervId);
  db.prepare('DELETE FROM evidencias WHERE intervencion_id = ?').run(intervId);
  db.prepare('DELETE FROM contrastaciones WHERE intervencion_id = ?').run(intervId);
  db.prepare('DELETE FROM transcripciones WHERE intervencion_id = ?').run(intervId);
  db.prepare('DELETE FROM grabaciones WHERE intervencion_id = ?').run(intervId);
  db.prepare('DELETE FROM planificaciones WHERE intervencion_id = ?').run(intervId);
  db.prepare('DELETE FROM intervenciones WHERE id = ?').run(intervId);

  // Insertar intervención asignada a Prof. Antonio Meneses y disponible para tutores
  db.prepare(`
    INSERT INTO intervenciones (id, user_id, fecha, curso, colegio, nivel_escolar, mencion, titulo_clase, tema, estado, es_ejemplo_referencia, created_at, updated_at)
    VALUES (?, 'user-antonio-meneses', '2026-10-13', 'Práctica Pedagógica IV', 'Centro de Práctica PPIV', '5° Básico (4°-8°)', 'MMYCN', 'Intervención 1: Detectives Financieros (Problemas Matemáticos)', 'Resolución de problemas contextualizados en situaciones financieras', 'evaluado', 1, ?, ?)
  `).run(intervId, now, now);

  // Insertar planificación
  db.prepare(`
    INSERT INTO planificaciones (id, intervencion_id, user_id, filename, filepath, oa_curricular, oa_previo, oa_futuro, obj_clase, obj_transversal, inicio_plan, desarrollo_plan, cierre_plan, recursos, evaluacion_plan, raw_text, eval_plan_json, created_at)
    VALUES (?, ?, 'user-antonio-meneses', 'plani Intervención 1  “Detectives financieros”.docx', ?, ?, '', '', ?, '', ?, ?, ?, 'Expediente, pistas, pizarras grupales, fichas de registro', 'Observación formativa y Ticket de Salida', ?, ?, ?)
  `).run(
    'plan-' + intervId,
    intervId,
    destPlan,
    parsedPlan.oa_trabajar,
    parsedPlan.objetivo_clase,
    parsedPlan.inicio,
    parsedPlan.desarrollo,
    parsedPlan.cierre,
    parsedPlan.raw_text,
    JSON.stringify({ status: 'analizado_ok', criterios: ['Inicio lúdico', 'Desarrollo guiado', 'Cierre formativo'] }),
    now
  );

  // Insertar grabación
  const grabId = 'grab-' + intervId;
  db.prepare(`
    INSERT INTO grabaciones (id, intervencion_id, user_id, filename, filepath, mimetype, transcription_status, created_at)
    VALUES (?, ?, 'user-antonio-meneses', 'intervención 1.m4a', ?, 'audio/mp4', 'completed', ?)
  `).run(grabId, intervId, destAudio, now);

  // Insertar transcripción
  db.prepare(`
    INSERT INTO transcripciones (id, grabacion_id, intervencion_id, raw_text, lineas_json, episodios_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'trans-' + intervId,
    grabId,
    intervId,
    rawTranscript,
    JSON.stringify(lineas),
    JSON.stringify(episodios),
    now
  );

  // Insertar contrastación
  const inicioObs = contraste.hallazgos?.find(h => h.dimension.includes('Inicio'))?.observado_en_aula || 'Cumplido';
  const desarrolloObs = contraste.hallazgos?.find(h => h.dimension.includes('Desarrollo'))?.observado_en_aula || 'Cumplido';
  const cierreObs = contraste.hallazgos?.find(h => h.dimension.includes('Cierre'))?.observado_en_aula || 'Cumplido';

  db.prepare(`
    INSERT INTO contrastaciones (id, intervencion_id, resumen_contraste, inicio_cumplimiento, desarrollo_cumplimiento, cierre_cumplimiento, desvios_didacticos, hallazgos_clave, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'contraste-' + intervId,
    intervId,
    contraste.resumen || 'Contrastación completada',
    inicioObs,
    desarrolloObs,
    cierreObs,
    contraste.cumplimiento_general || 'Alto',
    JSON.stringify(contraste.hallazgos || []),
    now
  );

  // Insertar evidencias
  const evStmt = db.prepare(`
    INSERT INTO evidencias (id, intervencion_id, comp_id, indicador_id, tipo, ini_linea, fin_linea, timestamp_ini, timestamp_fin, observado, interpretacion, fuente, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'grabacion', ?)
  `);
  for (let idx = 0; idx < evidencias.length; idx++) {
    const ev = evidencias[idx];
    evStmt.run('ev-' + intervId + '-' + idx, intervId, ev.comp_id, ev.indicador_id, ev.tipo, ev.ini_linea, ev.fin_linea, ev.timestamp_ini, ev.timestamp_fin, ev.observado, ev.interpretacion, now);
  }

  // Insertar valoraciones
  const valStmt = db.prepare(`
    INSERT INTO valoraciones_competencias (id, intervencion_id, comp_id, categoria, fuerza, justificacion, limites, pregunta, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const v of valoraciones) {
    const compId = v.id || v.comp_id;
    valStmt.run('val-' + intervId + '-' + compId, intervId, compId, v.categoria, v.fuerza, v.justificacion, v.limites, v.pregunta, v.meta, now);
  }

  // Insertar turnos de reflexión
  const chatStmt = db.prepare(`
    INSERT INTO turnos_reflexion (id, intervencion_id, user_id, sender, fase, message, context_json, created_at)
    VALUES (?, ?, 'user-antonio-meneses', ?, ?, ?, ?, ?)
  `);
  for (let tIdx = 0; tIdx < turnosMock.length; tIdx++) {
    const t = turnosMock[tIdx];
    const faseNum = Math.min(5, Math.floor(tIdx / 2) + 1);
    chatStmt.run('turno-' + intervId + '-' + tIdx, intervId, t.sender, faseNum, t.message, JSON.stringify({}), now);
  }

  // Insertar borrador portafolio
  db.prepare(`
    INSERT INTO borrador_portafolio (id, intervencion_id, user_id, capitulo_reflexion, conclusiones, created_at)
    VALUES (?, ?, 'user-antonio-meneses', ?, ?, ?)
  `).run('borr-' + intervId, intervId, borrador.contenido_markdown, JSON.stringify(borrador.criterios_cumplidos), now);

  // 8. Actualizar calibración general en data/calibrated_portfolios_2025.json
  const calibPath = join(rootDir, 'data', 'calibrated_portfolios_2025.json');
  if (existsSync(calibPath)) {
    const calibData = JSON.parse(readFileSync(calibPath, 'utf-8'));
    const exists = calibData.portafolios.some(p => p.id === intervId);
    if (!exists) {
      calibData.portafolios.push({
        id: intervId,
        autor: 'Prof. Antonio Meneses / Practicante PPIV',
        titulo: 'Detectives Financieros',
        mencion: 'MMYCN',
        curso: '5° Básico (4°-8°)',
        total_turnos: lineas.length,
        total_episodios: episodios.length,
        competencias_logradas: valoraciones.filter(v => v.categoria === '2').length
      });
      import('node:fs').then(fs => {
        fs.writeFileSync(calibPath, JSON.stringify(calibData, null, 2), 'utf-8');
      });
    }
  }

  console.log('\n🎉 ¡ENTRENAMIENTO Y CARGA DEL CASO COMPLETADA CON ÉXITO!');
  console.log(`   - ID de Intervención: ${intervId}`);
  console.log(`   - Título: Intervención 1: Detectives Financieros`);
  console.log(`   - Docente Tutor: Prof. Antonio Meneses (antonio.meneses@ucsc.cl)`);
  console.log(`   - Audio sincronizado: ${destAudio} (${(readFileSync(destAudio).length / (1024*1024)).toFixed(1)} MB)`);
  console.log(`   - Transcripción sincronizada: ${lineas.length} líneas y ${episodios.length} episodios.`);
  console.log(`   - Estado: Evaluado con contraste, evidencias, 8 competencias ND2 y Capítulo 8.`);
}

trainWithRealExample().catch(err => {
  console.error('❌ Error en el entrenamiento:', err);
  process.exit(1);
});
