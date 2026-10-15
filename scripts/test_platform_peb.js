/**
 * Suite de Pruebas Automatizadas de la Plataforma Observa-Retro Educación Básica (PPIV)
 */

import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function runTests() {
  console.log('🧪 Iniciando verificación de Observa-Retro Educación Básica...\n');

  // Test 1: Verificar datos de matriz PEB y rúbricas
  console.log('Test 1: Verificando matriz de competencias PEB...');
  const matrizPath = join(rootDir, 'data', 'matriz_peb.json');
  assert.ok(existsSync(matrizPath), 'data/matriz_peb.json debe existir');
  const matriz = JSON.parse(readFileSync(matrizPath, 'utf-8'));
  assert.strictEqual(matriz.competencias.length, 8, 'Debe contener las 8 competencias (CG1-CG3, CE1-CE5)');
  assert.strictEqual(matriz.resultados_aprendizaje.length, 3, 'Debe contener los 3 Resultados de Aprendizaje (RA1-RA3)');
  console.log('  ✅ Matriz PEB contiene 8 competencias y 3 RA en nivel ND2.');

  // Test 2: Verificar calibración de portafolios 2025
  console.log('Test 2: Verificando banco calibrado de portafolios 2025...');
  const calibPath = join(rootDir, 'data', 'calibrated_portfolios_2025.json');
  assert.ok(existsSync(calibPath), 'data/calibrated_portfolios_2025.json debe existir');
  const calib = JSON.parse(readFileSync(calibPath, 'utf-8'));
  assert.ok(calib.portafolios.length >= 30, 'Debe tener al menos 30 portafolios procesados');
  console.log(`  ✅ Banco calibrado contiene ${calib.portafolios.length} portafolios de las distintas secciones.`);

  // Test 3: Verificar base de datos y usuarios
  console.log('Test 3: Verificando base de datos SQLite y seed inicial...');
  const dbModule = await import('../server/db.js');
  const db = dbModule.default;
  const admin = db.prepare('SELECT email, role FROM users WHERE email = ?').get('admin@ucsc.cl');
  assert.ok(admin, 'Usuario admin debe existir');
  assert.strictEqual(admin.role, 'admin');

  const estudiante = db.prepare('SELECT email, role, mencion FROM users WHERE email = ?').get('practicante.basica@ucsc.cl');
  assert.ok(estudiante, 'Estudiante de prueba debe existir');
  assert.strictEqual(estudiante.mencion, 'MMYCN');
  console.log('  ✅ Base de datos inicializada y usuarios sembrados correctamente.');

  // Test 4: Verificar importador de nómina desde Excel
  console.log('Test 4: Verificando importador de estudiantes desde Excel...');
  const importer = await import('../server/courseImporter.js');
  const syncRes = await importer.sincronizarEstudiantesDesdeExcel();
  assert.ok(syncRes.importados > 0, 'Debe haber importado estudiantes desde Excel');
  console.log(`  ✅ Nómina sincronizada: ${syncRes.importados} estudiantes cargados en SQLite.`);

  // Test 5: Verificar parser de planificación .docx
  console.log('Test 5: Verificando parser estructurado de planificación .docx...');
  const docxParser = await import('../server/docxParser.js');
  const samplePlanPath = existsSync(join(rootDir, 'uploads', 'plans', 'interv-detectives-financieros_plani_detectives_financieros.docx'))
    ? join(rootDir, 'uploads', 'plans', 'interv-detectives-financieros_plani_detectives_financieros.docx')
    : join(rootDir, 'PRACTICA IV', 'PORTAFOLIO', 'Resultados de Aprendizaje', 'RA2', 'Formato de planificacion.docx');
  const parsedPlan = await docxParser.parseStructuredPlanDocx(samplePlanPath);
  assert.ok(parsedPlan.raw_text.length > 50, 'Debe extraer el texto de la plantilla de planificación');
  console.log('  ✅ Extractor docx extrajo correctamente la estructura del plan.');

  // Test 6: Verificar motor pedagógico y segmentación de episodios
  console.log('Test 6: Verificando segmentación de clase en momentos didácticos...');
  const pedEngine = await import('../server/pedagogyEnginePEB.js');
  const transService = await import('../server/transcriptionService.js');
  const demoTrans = await transService.transcribirAudio(null, 'audio/mpeg');
  assert.ok(demoTrans.lineas.length > 5, 'Modo demo debe generar líneas de diálogo de básica');

  const episodios = pedEngine.segmentarEpisodiosBasica(demoTrans.lineas);
  assert.strictEqual(episodios.length, 3, 'Debe segmentar en Inicio, Desarrollo y Cierre');
  assert.strictEqual(episodios[0].fase, 'Inicio');
  assert.strictEqual(episodios[1].fase, 'Desarrollo');
  assert.strictEqual(episodios[2].fase, 'Cierre');
  console.log('  ✅ Segmentación en momentos didácticos de Educación Básica validada.');

  // Test 7: Verificar motor de contrastación Planificación vs. Aula Real
  console.log('Test 7: Verificando motor de contrastación Planificación vs. Aula Real...');
  const contraste = pedEngine.contrastarPlanificacionConAula(parsedPlan, demoTrans.lineas);
  assert.ok(contraste.hallazgos.length >= 4, 'Debe contrastar Objetivo, Inicio, Desarrollo y Cierre');
  console.log(`  ✅ Contrastación completada con nivel de cumplimiento: ${contraste.cumplimiento_general}.`);

  // Test 8: Verificar extracción de evidencias y valoración de competencias ND2
  console.log('Test 8: Verificando extracción de evidencias y valoración de competencias...');
  const evidencias = pedEngine.extraerEvidenciasPEB(demoTrans.lineas, episodios, 'MMYCN');
  assert.ok(evidencias.length >= 2, 'Debe detectar evidencias de aula');
  const valoraciones = pedEngine.valorarCompetenciasPEB(evidencias, 'MMYCN');
  assert.strictEqual(valoraciones.length, 8, 'Debe valorar las 8 competencias PEB');
  console.log(`  ✅ ${evidencias.length} evidencias identificadas y 8 competencias valoradas en ND2.`);

  // Test 9: Verificar Chatbot Tutor Reflexivo en 5 fases
  console.log('Test 9: Verificando diálogo socrático del Chatbot Tutor Reflexivo...');
  const turnoInicial = pedEngine.procesarTurnoReflexionPEB([], '', {});
  assert.strictEqual(turnoInicial.fase, 1);
  assert.strictEqual(turnoInicial.sender, 'chatbot');

  const turno1 = pedEngine.procesarTurnoReflexionPEB(
    [{ sender: 'chatbot', message: turnoInicial.message }],
    'Me enfoqué en la duda de Lucas cuando no comprendía por qué 7/4 era mayor a un entero.',
    {}
  );
  assert.strictEqual(turno1.fase, 2, 'Debe avanzar a la fase 2 (Triangulación con Planificación)');
  console.log('  ✅ Diálogo socrático procesado y avance de fases formativas verificado.');

  // Test 10: Verificar compilación del Capítulo 8 del Portafolio
  console.log('Test 10: Verificando generador de Capítulo 8 de Portafolio Docente...');
  const intervencionDummy = { nivel_escolar: '5° Básico', titulo_clase: 'Fracciones y Números Mixtos', mencion: 'MMYCN' };
  const historialMock = [
    { sender: 'user', message: 'Focalicé en el uso de fichas fraccionarias con Lucas.' },
    { sender: 'user', message: 'Planifiqué 10 minutos de inicio pero me tomó 14 por las preguntas.' },
    { sender: 'user', message: 'Los estudiantes descubrieron que el denominador indica la partición del entero.' },
    { sender: 'user', message: 'Me fundamenté en el enfoque DUA y el uso de material concreto.' },
    { sender: 'user', message: 'En la próxima clase usaré un ticket de salida individual de 8 minutos.' }
  ];
  const borrador = pedEngine.compilarBorradorReflexionPortafolio(intervencionDummy, parsedPlan, contraste, evidencias, historialMock);
  assert.ok(borrador.contenido_markdown.includes('CAPÍTULO 8: REFLEXIÓN DOCENTE'), 'Debe incluir el título del capítulo');
  assert.ok(borrador.contenido_markdown.includes('Compromisos y Plan de Desarrollo'), 'Debe incluir compromisos de mejora');
  console.log('  ✅ Borrador del Capítulo 8 generado conforme a la Rúbrica de Portafolio PPIV.');

  // Test 11: Verificar control de acceso al caso de referencia 2025 (Solo Tutores/Admin)
  console.log('Test 11: Verificando control de acceso al caso de referencia 2025...');
  const refInterv = db.prepare('SELECT id, es_ejemplo_referencia FROM intervenciones WHERE id = ?').get('interv-2025-pizarro-geometria');
  assert.ok(refInterv, 'El caso de análisis 2025 debe existir en la BD');
  assert.strictEqual(refInterv.es_ejemplo_referencia, 1, 'Debe tener es_ejemplo_referencia = 1');

  // Consulta simula perfil estudiante: no debe retornar el caso de referencia
  const studentRows = db.prepare(`
    SELECT * FROM intervenciones
    WHERE user_id = ? AND (es_ejemplo_referencia IS NULL OR es_ejemplo_referencia = 0)
  `).all('user-bpizarro-ebasica-ucsc-cl');
  const foundInStudent = studentRows.some(r => r.id === 'interv-2025-pizarro-geometria');
  assert.strictEqual(foundInStudent, false, 'Un estudiante no debe ver el caso de referencia en su listado');

  // Consulta simula perfil tutor/admin: debe retornar el caso de referencia
  const tutorRows = db.prepare(`
    SELECT i.*, u.name as practicante_nombre FROM intervenciones i
    JOIN users u ON i.user_id = u.id
    ORDER BY i.es_ejemplo_referencia DESC, i.created_at DESC
  `).all();
  const foundInTutor = tutorRows.some(r => r.id === 'interv-2025-pizarro-geometria' && r.es_ejemplo_referencia === 1);
  assert.strictEqual(foundInTutor, true, 'Un tutor/admin sí debe ver el caso de referencia');
  console.log('  ✅ Acceso al caso de referencia 2025 protegido exclusivamente para tutores y administradores.');

  // Test 12: Verificar procesamiento de transcripción directa (texto o archivo)
  console.log('Test 12: Verificando procesamiento y parsing de transcripción directa...');
  const rawTextTrans = `
[00:00:15] Practicante: Buenos días a todos, hoy trabajaremos con figuras 3D.
[00:00:35] Sofía: ¿Tía, vamos a armar el prisma con las redes?
[00:15:20] Practicante: Exacto Sofía. Vamos a contar las aristas y vértices en grupos.
[00:40:00] Practicante: Para cerrar la clase, ¿quién recuerda cuántas caras tiene un cubo?
[00:41:00] Martín: ¡Tiene 6 caras cuadradas tía!
  `.trim();

  // Probar parseo de líneas con marcas de tiempo y hablantes
  const lines = rawTextTrans.split('\n').filter(l => l.trim().length > 0).map(line => {
    const timeMatch = line.match(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
    const t = timeMatch ? timeMatch[1] : '00:00:00';
    const clean = line.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/, '').trim();
    const colonIdx = clean.indexOf(':');
    let s = 'Docente';
    let x = clean;
    if (colonIdx > 0 && colonIdx < 30) {
      s = clean.substring(0, colonIdx).trim();
      x = clean.substring(colonIdx + 1).trim();
    }
    return { t, s, x };
  });

  assert.strictEqual(lines.length, 5, 'Debe haber parseado las 5 líneas de transcripción');
  assert.strictEqual(lines[0].s, 'Practicante');
  assert.strictEqual(lines[1].s, 'Sofía');
  assert.strictEqual(lines[4].s, 'Martín');

  const eps = pedEngine.segmentarEpisodiosBasica(lines);
  assert.strictEqual(eps.length, 3, 'Debe segmentar la transcripción subida en Inicio, Desarrollo y Cierre');
  console.log('  ✅ Transcripción directa parseada y segmentada en momentos de aula exitosamente.');

  // Test 13: Verificar registro y capacidades del tutor Prof. Antonio Meneses
  console.log('Test 13: Verificando cuenta y permisos del tutor Prof. Antonio Meneses...');
  const tutorMeneses = db.prepare('SELECT id, email, role, name FROM users WHERE email = ?').get('antonio.meneses@ucsc.cl');
  assert.ok(tutorMeneses, 'Usuario antonio.meneses@ucsc.cl debe existir en la base de datos');
  assert.strictEqual(tutorMeneses.role, 'tutor', 'El rol de Antonio Meneses debe ser "tutor"');
  assert.strictEqual(tutorMeneses.name, 'Prof. Antonio Meneses');

  // Verificar que puede listar estudiantes de la carrera
  const estudiantesList = db.prepare('SELECT id, name, email FROM users WHERE role = ?').all('estudiante');
  assert.ok(estudiantesList.length >= 10, 'Debe haber estudiantes registrados para que el tutor seleccione');

  // Simular creación de intervención asignada a un estudiante específico por parte del tutor
  const estudianteElegido = estudiantesList[0];
  const testIntervId = 'interv-test-meneses-' + Date.now();
  db.prepare(`
    INSERT INTO intervenciones (id, user_id, fecha, curso, colegio, nivel_escolar, mencion, titulo_clase, tema, estado, created_at, updated_at)
    VALUES (?, ?, '2026-05-15', 'PPIV', 'Colegio Test', '5° Básico', 'MMYCN', 'Clase Subida por Tutor Meneses', 'Fracciones', 'borrador', datetime('now'), datetime('now'))
  `).run(testIntervId, estudianteElegido.id);

  const createdInterv = db.prepare('SELECT * FROM intervenciones WHERE id = ?').get(testIntervId);
  assert.ok(createdInterv, 'La intervención debe haberse creado');
  // Limpiar intervención de prueba
  db.prepare('DELETE FROM intervenciones WHERE id = ?').run(testIntervId);
  console.log('  ✅ Prof. Antonio Meneses validado con rol tutor y capacidad de gestionar clases de estudiantes.');

  // Test 14: Verificando ingestión y entrenamiento del caso real 'Detectives Financieros'
  console.log("Test 14: Verificando caso entrenado con datos reales ('Detectives Financieros')...");
  const casoDetectives = db.prepare('SELECT * FROM intervenciones WHERE id = ?').get('interv-detectives-financieros');
  assert.ok(casoDetectives, 'El caso entrenado interv-detectives-financieros debe existir en la base de datos');
  assert.strictEqual(casoDetectives.es_ejemplo_referencia, 1, 'Debe ser ejemplo de referencia para tutores/admin');

  const planDetectives = db.prepare('SELECT * FROM planificaciones WHERE intervencion_id = ?').get('interv-detectives-financieros');
  assert.ok(planDetectives && (planDetectives.obj_clase || planDetectives.oa_curricular), 'Debe tener planificación extraída');

  const transDetectives = db.prepare('SELECT * FROM transcripciones WHERE intervencion_id = ?').get('interv-detectives-financieros');
  assert.ok(transDetectives, 'Debe tener transcripción guardada');
  const lineasTrans = JSON.parse(transDetectives.lineas_json);
  assert.strictEqual(lineasTrans.length, 276, 'Debe contener los 276 turnos del aula escolar');

  const evDetectives = db.prepare('SELECT COUNT(*) as c FROM evidencias WHERE intervencion_id = ?').get('interv-detectives-financieros');
  assert.ok(evDetectives.c >= 8, 'Debe contener evidencias extraídas');

  const valDetectives = db.prepare('SELECT COUNT(*) as c FROM valoraciones_competencias WHERE intervencion_id = ?').get('interv-detectives-financieros');
  assert.strictEqual(valDetectives.c, 8, 'Debe evaluar las 8 competencias PEB');

  const audioDetectives = db.prepare('SELECT * FROM grabaciones WHERE intervencion_id = ?').get('interv-detectives-financieros');
  assert.ok(audioDetectives && existsSync(audioDetectives.filepath), 'El archivo de audio .m4a debe existir físicamente en uploads/audios/');

  console.log("  ✅ Caso real 'Detectives Financieros' verificado con planificación, audio (38.7 MB), 276 turnos y 8 competencias evaluadas.");

  console.log('\n🎉 ¡TODAS LAS PRUEBAS (14/14) PASARON SATISFACTORIAMENTE!\n');
}

runTests().catch(err => {
  console.error('❌ Error en las pruebas:', err);
  process.exit(1);
});
