import { createServer } from 'node:http';
import { createReadStream, createWriteStream, statSync, existsSync, mkdirSync, copyFileSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import db from './db.js';
import { authenticateRequest, hashPassword, verifyPassword, createSession, deleteSession } from './auth.js';
import { streamMediaFile } from './audioService.js';
import { extractTextFromDocx, parseStructuredPlanDocx } from './docxParser.js';
import {
  MATRIZ_PEB,
  RESULTADOS_APRENDIZAJE,
  RUBRICA_PORTAFOLIO,
  RUBRICA_PLANIFICACION,
  segmentarEpisodiosBasica,
  contrastarPlanificacionConAula,
  extraerEvidenciasPEB,
  valorarCompetenciasPEB,
  procesarTurnoReflexionPEB,
  compilarBorradorReflexionPortafolio
} from './pedagogyEnginePEB.js';
import { getTranscriptionConfig, saveTranscriptionConfig, transcribirAudio } from './transcriptionService.js';
import { sincronizarEstudiantesDesdeExcel } from './courseImporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');
const uploadsAudioDir = process.env.UPLOADS_AUDIO_DIR || join(rootDir, 'uploads', 'audios');
const uploadsPlanDir = process.env.UPLOADS_PLAN_DIR || join(rootDir, 'uploads', 'planificaciones');
const uploadsDocsDir = process.env.UPLOADS_DOCS_DIR || join(rootDir, 'uploads', 'portafolios');

mkdirSync(uploadsAudioDir, { recursive: true });
mkdirSync(uploadsPlanDir, { recursive: true });
mkdirSync(uploadsDocsDir, { recursive: true });

const PORT = process.env.PORT || 3001;

const MIME_STATIC = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function resolveStoragePath(storedPath) {
  if (!storedPath) return null;
  if (existsSync(storedPath)) return storedPath;
  const relativeMatch = storedPath.match(/uploads\/(.+)$/);
  if (relativeMatch) {
    const candidate = join(rootDir, 'uploads', relativeMatch[1]);
    if (existsSync(candidate)) return candidate;
  }
  const candidate = join(rootDir, storedPath);
  if (existsSync(candidate)) return candidate;
  return storedPath;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-filename, x-intervention-id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf-8');
      if (body.length > 50 * 1024 * 1024) { // 50MB
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

// Prevenir que cualquier excepción o desconexión no capturada detenga el proceso Node.js
process.on('uncaughtException', (err) => {
  console.error('⚠️ [CRASH PREVENTED] Excepción no capturada en Node.js:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [CRASH PREVENTED] Promesa no manejada:', reason?.message || reason);
});

function parseBinaryUpload(req, targetFilePath) {
  return new Promise((resolve, reject) => {
    const ws = createWriteStream(targetFilePath);
    req.pipe(ws);
    ws.on('finish', () => resolve(targetFilePath));
    ws.on('error', (err) => {
      try { ws.destroy(); } catch (_) {}
      reject(err);
    });
    req.on('error', (err) => {
      try { ws.destroy(); } catch (_) {}
      reject(err);
    });
    req.on('aborted', () => {
      try { ws.destroy(); } catch (_) {}
      reject(new Error('Subida cancelada o conexión interrumpida'));
    });
  });
}

const server = createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const method = req.method;

  // Manejo de CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-filename, x-intervention-id',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    res.end();
    return;
  }

  // ============================================================
  // API: Autenticación
  // ============================================================
  if (pathname === '/api/auth/login' && method === 'POST') {
    try {
      const { email, password } = await parseBody(req);
      if (!email || !password) {
        return sendJson(res, 400, { error: 'Email y contraseña requeridos' });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
      if (!user) {
        return sendJson(res, 401, { error: 'Credenciales inválidas' });
      }

      const isValid = verifyPassword(password, user.password_hash, user.salt, user);
      if (!isValid) {
        return sendJson(res, 401, { error: 'Credenciales inválidas' });
      }

      const { token, expiresAt } = createSession(user.id);
      return sendJson(res, 200, {
        token,
        expiresAt,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          rut: user.rut,
          mencion: user.mencion,
          institucion: user.institucion
        }
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = authenticateRequest(req);
    if (!user) {
      return sendJson(res, 401, { error: 'No autenticado' });
    }
    return sendJson(res, 200, { user });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      deleteSession(authHeader.slice(7).trim());
    }
    return sendJson(res, 200, { ok: true });
  }

  // ============================================================
  // API: Matriz y Rúbricas
  // ============================================================
  if (pathname === '/api/matriz' && method === 'GET') {
    return sendJson(res, 200, {
      carrera: "Pedagogía en Educación Básica",
      asignatura: "Práctica Pedagógica IV",
      nivel_dominio: "ND2",
      competencias: MATRIZ_PEB,
      resultados_aprendizaje: RESULTADOS_APRENDIZAJE
    });
  }

  if (pathname === '/api/rubricas' && method === 'GET') {
    return sendJson(res, 200, {
      portafolio: RUBRICA_PORTAFOLIO,
      planificacion: RUBRICA_PLANIFICACION
    });
  }

  if (pathname === '/api/portafolios-calibrados' && method === 'GET') {
    try {
      const calibPath = join(rootDir, 'data', 'calibrated_portfolios_2025.json');
      if (existsSync(calibPath)) {
        const data = JSON.parse(readFileSync(calibPath, 'utf-8'));
        return sendJson(res, 200, data);
      }
      return sendJson(res, 200, { portafolios: [] });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  if (pathname === '/api/config' && method === 'GET') {
    return sendJson(res, 200, getTranscriptionConfig());
  }

  if (pathname === '/api/config' && method === 'POST') {
    const user = authenticateRequest(req);
    if (!user || (user.role !== 'admin' && user.role !== 'tutor')) {
      return sendJson(res, 403, { error: 'Permisos insuficientes' });
    }
    const { provider, apiKey } = await parseBody(req);
    saveTranscriptionConfig(provider, apiKey);
    return sendJson(res, 200, { ok: true, config: getTranscriptionConfig() });
  }

  // ============================================================
  // API: Intervenciones y Sesiones de Clase
  // ============================================================
  if (pathname === '/api/intervenciones' && method === 'GET') {
    const user = authenticateRequest(req);
    if (!user) return sendJson(res, 401, { error: 'No autenticado' });

    let rows;
    if (user.role === 'admin' || user.role === 'tutor') {
      rows = db.prepare(`
        SELECT i.*, u.name as practicante_nombre, u.email as practicante_email, u.rut as practicante_rut
        FROM intervenciones i
        JOIN users u ON i.user_id = u.id
        ORDER BY i.es_ejemplo_referencia DESC, i.created_at DESC
      `).all();
    } else {
      // Los estudiantes regulares NO ven el caso de referencia de ejemplo
      rows = db.prepare(`
        SELECT * FROM intervenciones
        WHERE user_id = ? AND (es_ejemplo_referencia IS NULL OR es_ejemplo_referencia = 0)
        ORDER BY created_at DESC
      `).all(user.id);
    }

    return sendJson(res, 200, rows);
  }

  if (pathname === '/api/intervenciones' && method === 'POST') {
    const user = authenticateRequest(req);
    if (!user) return sendJson(res, 401, { error: 'No autenticado' });

    const body = await parseBody(req);
    const id = 'interv-' + randomUUID();
    const now = new Date().toISOString();

    let targetUserId = user.id;
    let targetMencion = body.mencion || user.mencion || 'MMYCN';

    if ((user.role === 'admin' || user.role === 'tutor') && (body.user_id || body.estudiante_id)) {
      const studentId = body.user_id || body.estudiante_id;
      const student = db.prepare('SELECT id, mencion FROM users WHERE id = ?').get(studentId);
      if (student) {
        targetUserId = student.id;
        if (!body.mencion && student.mencion) {
          targetMencion = student.mencion;
        }
      }
    }

    const stmt = db.prepare(`
      INSERT INTO intervenciones (id, user_id, fecha, curso, colegio, nivel_escolar, mencion, titulo_clase, tema, estado, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'borrador', ?, ?)
    `);

    stmt.run(
      id,
      targetUserId,
      body.fecha || now.split('T')[0],
      body.curso || 'Práctica Pedagógica IV',
      body.colegio || 'Centro de Práctica',
      body.nivel_escolar || '5° Básico',
      targetMencion,
      body.titulo_clase || 'Clase de Intervención PPIV',
      body.tema || 'Contenido curricular',
      now,
      now
    );

    const created = db.prepare('SELECT * FROM intervenciones WHERE id = ?').get(id);
    return sendJson(res, 201, created);
  }

  // Obtener detalle completo de una intervención
  const intervDetailMatch = pathname.match(/^\/api\/intervenciones\/([a-zA-Z0-9_-]+)$/);
  if (intervDetailMatch && method === 'GET') {
    const user = authenticateRequest(req);
    if (!user) return sendJson(res, 401, { error: 'No autenticado' });
    const id = intervDetailMatch[1];

    const interv = db.prepare('SELECT * FROM intervenciones WHERE id = ?').get(id);
    if (!interv) return sendJson(res, 404, { error: 'Intervención no encontrada' });

    // Si la intervención es de referencia de ejemplo, solo es accesible para tutores o administradores
    if (interv.es_ejemplo_referencia === 1 && user.role !== 'admin' && user.role !== 'tutor') {
      return sendJson(res, 403, { error: 'Este ejemplo de análisis está reservado exclusivamente para tutores y administradores.' });
    }

    // Permisos: propio estudiante o tutor/admin
    if (user.role === 'estudiante' && interv.user_id !== user.id) {
      return sendJson(res, 403, { error: 'Acceso no autorizado' });
    }

    const plan = db.prepare('SELECT * FROM planificaciones WHERE intervencion_id = ?').get(id);
    const grabacion = db.prepare('SELECT * FROM grabaciones WHERE intervencion_id = ?').get(id);
    const transcripcion = grabacion ? db.prepare('SELECT * FROM transcripciones WHERE grabacion_id = ?').get(grabacion.id) : null;
    const contraste = db.prepare('SELECT * FROM contrastaciones WHERE intervencion_id = ?').get(id);
    const evidencias = db.prepare('SELECT * FROM evidencias WHERE intervencion_id = ?').all(id);
    const valoraciones = db.prepare('SELECT * FROM valoraciones_competencias WHERE intervencion_id = ?').all(id);
    const turnos = db.prepare('SELECT * FROM turnos_reflexion WHERE intervencion_id = ? ORDER BY created_at ASC').all(id);
    const borrador = db.prepare('SELECT * FROM borrador_portafolio WHERE intervencion_id = ?').get(id);

    return sendJson(res, 200, {
      intervencion: interv,
      plan: plan ? {
        ...plan,
        eval_plan: plan.eval_plan_json ? JSON.parse(plan.eval_plan_json) : null
      } : null,
      grabacion,
      transcripcion: transcripcion ? {
        id: transcripcion.id,
        lineas: transcripcion.lineas_json ? JSON.parse(transcripcion.lineas_json) : [],
        episodios: transcripcion.episodios_json ? JSON.parse(transcripcion.episodios_json) : []
      } : null,
      contraste: contraste ? {
        ...contraste,
        hallazgos: contraste.hallazgos_clave ? JSON.parse(contraste.hallazgos_clave) : []
      } : null,
      evidencias,
      valoraciones,
      turnos_reflexion: turnos,
      borrador_portafolio: borrador
    });
  }

  // ============================================================
  // API: Subida de Planificación de Clase (.docx o texto)
  // ============================================================
  const planUploadMatch = pathname.match(/^\/api\/intervenciones\/([a-zA-Z0-9_-]+)\/plan$/);
  if (planUploadMatch && method === 'POST') {
    const user = authenticateRequest(req);
    if (!user) return sendJson(res, 401, { error: 'No autenticado' });
    const id = planUploadMatch[1];

    const interv = db.prepare('SELECT * FROM intervenciones WHERE id = ?').get(id);
    if (!interv) return sendJson(res, 404, { error: 'Intervención no encontrada' });
    if (user.role === 'estudiante' && interv.user_id !== user.id) {
      return sendJson(res, 403, { error: 'Acceso no autorizado' });
    }

    const rawFilename = req.headers['x-filename'] || 'planificacion.docx';
    let filename = 'planificacion.docx';
    try { filename = decodeURIComponent(rawFilename); } catch (e) { filename = rawFilename; }
    const safeBasename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filePath = join(uploadsPlanDir, `${id}_${safeBasename}`);

    try {
      await parseBinaryUpload(req, filePath);

      let parsed = {};
      if (filename.toLowerCase().endsWith('.docx')) {
        parsed = await parseStructuredPlanDocx(filePath);
      } else {
        const text = readFileSync(filePath, 'utf-8');
        parsed = { raw_text: text, inicio: text.slice(0, 300), desarrollo: text.slice(300, 800), cierre: text.slice(800) };
      }

      const planId = 'plan-' + randomUUID();
      const now = new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO planificaciones (id, intervencion_id, user_id, filename, filepath, oa_curricular, oa_previo, oa_futuro, obj_clase, obj_transversal, inicio_plan, desarrollo_plan, cierre_plan, recursos, evaluacion_plan, raw_text, eval_plan_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(intervencion_id) DO UPDATE SET
          filename = excluded.filename,
          filepath = excluded.filepath,
          oa_curricular = excluded.oa_curricular,
          oa_previo = excluded.oa_previo,
          oa_futuro = excluded.oa_futuro,
          obj_clase = excluded.obj_clase,
          obj_transversal = excluded.obj_transversal,
          inicio_plan = excluded.inicio_plan,
          desarrollo_plan = excluded.desarrollo_plan,
          cierre_plan = excluded.cierre_plan,
          recursos = excluded.recursos,
          evaluacion_plan = excluded.evaluacion_plan,
          raw_text = excluded.raw_text
      `);

      stmt.run(
        planId,
        id,
        interv.user_id,
        filename,
        filePath,
        parsed.oa_trabajar || '',
        parsed.oa_previo || '',
        parsed.oa_futuro || '',
        parsed.objetivo_clase || '',
        parsed.objetivo_transversal || '',
        parsed.inicio || '',
        parsed.desarrollo || '',
        parsed.cierre || '',
        parsed.recursos || '',
        parsed.evaluacion || '',
        parsed.raw_text || '',
        JSON.stringify({ status: 'analizado_ok' }),
        now
      );

      db.prepare("UPDATE intervenciones SET estado = 'con_plan', updated_at = ? WHERE id = ?").run(now, id);

      return sendJson(res, 200, { ok: true, plan: parsed });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // ============================================================
  // API: Subida de Grabación de Aula (Audio o Video)
  // ============================================================
  const grabUploadMatch = pathname.match(/^\/api\/intervenciones\/([a-zA-Z0-9_-]+)\/grabacion$/);
  if (grabUploadMatch && method === 'POST') {
    const user = authenticateRequest(req);
    if (!user) return sendJson(res, 401, { error: 'No autenticado' });
    const id = grabUploadMatch[1];

    const interv = db.prepare('SELECT * FROM intervenciones WHERE id = ?').get(id);
    if (!interv) return sendJson(res, 404, { error: 'Intervención no encontrada' });
    if (user.role === 'estudiante' && interv.user_id !== user.id) {
      return sendJson(res, 403, { error: 'Acceso no autorizado' });
    }

    const rawFilename = req.headers['x-filename'] || 'grabacion_aula.mp3';
    let filename = 'grabacion_aula.mp3';
    try { filename = decodeURIComponent(rawFilename); } catch (e) { filename = rawFilename; }
    const safeBasename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filePath = join(uploadsAudioDir, `${id}_${safeBasename}`);

    try {
      await parseBinaryUpload(req, filePath);

      const grabId = 'grab-' + randomUUID();
      const now = new Date().toISOString();
      const ext = extname(filename).toLowerCase();
      const mime = ext === '.m4a' || ext === '.mp4' ? 'audio/mp4' : (ext === '.wav' ? 'audio/wav' : 'audio/mpeg');

      db.prepare(`
        INSERT INTO grabaciones (id, intervencion_id, user_id, filename, filepath, mimetype, transcription_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)
        ON CONFLICT(intervencion_id) DO UPDATE SET
          filename = excluded.filename,
          filepath = excluded.filepath,
          mimetype = excluded.mimetype
      `).run(grabId, id, interv.user_id, filename, filePath, mime, now);

      db.prepare("UPDATE intervenciones SET estado = 'con_grabacion', updated_at = ? WHERE id = ?").run(now, id);

      return sendJson(res, 200, { ok: true, filename, grabacion_id: grabId });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Streaming de la grabación de aula con HTTP 206
  const streamMatch = pathname.match(/^\/api\/intervenciones\/([a-zA-Z0-9_-]+)\/grabacion\/stream$/);
  if (streamMatch && method === 'GET') {
    const id = streamMatch[1];
    const grab = db.prepare('SELECT * FROM grabaciones WHERE intervencion_id = ?').get(id);
    const audioPath = resolveStoragePath(grab?.filepath);
    if (!grab || !audioPath || !existsSync(audioPath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Grabación no encontrada' }));
      return;
    }
    return streamMediaFile(audioPath, req, res);
  }

  // ============================================================
  // API: Transcripción de la Grabación
  // ============================================================
  const transcribeMatch = pathname.match(/^\/api\/intervenciones\/([a-zA-Z0-9_-]+)\/transcribir$/);
  if (transcribeMatch && method === 'POST') {
    const user = authenticateRequest(req);
    if (!user) return sendJson(res, 401, { error: 'No autenticado' });
    const id = transcribeMatch[1];

    const grab = db.prepare('SELECT * FROM grabaciones WHERE intervencion_id = ?').get(id);
    if (!grab) {
      // Si no hay archivo subido aún, permitir transcribir en modo demo
      const demoResult = await transcribirAudio(null, 'audio/mpeg');
      const grabId = 'grab-demo-' + randomUUID();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO grabaciones (id, intervencion_id, user_id, filename, filepath, mimetype, transcription_status, created_at)
        VALUES (?, ?, ?, 'demo_aula_basica.mp3', 'demo', 'audio/mpeg', 'completed', ?)
        ON CONFLICT(intervencion_id) DO UPDATE SET transcription_status = 'completed'
      `).run(grabId, id, user.id, now);

      const episodios = segmentarEpisodiosBasica(demoResult.lineas);
      const transId = 'trans-' + randomUUID();

      db.prepare(`
        INSERT INTO transcripciones (id, grabacion_id, intervencion_id, raw_text, lineas_json, episodios_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(grabacion_id) DO UPDATE SET
          raw_text = excluded.raw_text,
          lineas_json = excluded.lineas_json,
          episodios_json = excluded.episodios_json
      `).run(transId, grabId, id, demoResult.texto, JSON.stringify(demoResult.lineas), JSON.stringify(episodios), now);

      return sendJson(res, 200, { ok: true, lineas: demoResult.lineas, episodios });
    }

    try {
      const result = await transcribirAudio(grab.filepath, grab.mimetype);
      const episodios = segmentarEpisodiosBasica(result.lineas);
      const now = new Date().toISOString();
      const transId = 'trans-' + randomUUID();

      db.prepare(`
        INSERT INTO transcripciones (id, grabacion_id, intervencion_id, raw_text, lineas_json, episodios_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(grabacion_id) DO UPDATE SET
          raw_text = excluded.raw_text,
          lineas_json = excluded.lineas_json,
          episodios_json = excluded.episodios_json
      `).run(transId, grab.id, id, result.texto, JSON.stringify(result.lineas), JSON.stringify(episodios), now);

      return sendJson(res, 200, { ok: true, lineas: result.lineas, episodios });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // ============================================================
  // API: Subida Directa de Transcripción (.txt, .docx, .vtt, .srt o JSON)
  // ============================================================
  const uploadTransMatch = pathname.match(/^\/api\/intervenciones\/([a-zA-Z0-9_-]+)\/transcripcion$/);
  if (uploadTransMatch && method === 'POST') {
    const user = authenticateRequest(req);
    if (!user) return sendJson(res, 401, { error: 'No autenticado' });
    const id = uploadTransMatch[1];

    const interv = db.prepare('SELECT * FROM intervenciones WHERE id = ?').get(id);
    if (!interv) return sendJson(res, 404, { error: 'Intervención no encontrada' });
    if (user.role === 'estudiante' && interv.user_id !== user.id) {
      return sendJson(res, 403, { error: 'Acceso no autorizado' });
    }

    try {
      const rawFilename = req.headers['x-filename'] || 'transcripcion.txt';
      let filename = 'transcripcion.txt';
      try { filename = decodeURIComponent(rawFilename); } catch (e) { filename = rawFilename; }
      const safeBasename = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const isDocx = filename.toLowerCase().endsWith('.docx');
      let rawText = '';

      if (req.headers['content-type']?.includes('application/json')) {
        const body = await parseBody(req);
        rawText = body.raw_text || body.texto || '';
      } else {
        const tempPath = join(uploadsDocsDir, `${id}_${randomUUID()}_${safeBasename}`);
        await parseBinaryUpload(req, tempPath);
        if (isDocx) {
          rawText = await extractTextFromDocx(tempPath);
        } else {
          rawText = readFileSync(tempPath, 'utf-8');
        }
      }

      if (!rawText.trim()) {
        return sendJson(res, 400, { error: 'El archivo o texto de transcripción está vacío' });
      }

      // Parsear líneas con marcas de tiempo y hablantes de forma inteligente
      const rawLines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const lineas = [];
      const parsedEpisodios = [];

      let currentTime = '00:00';
      let currentFase = 'Inicio';

      for (const line of rawLines) {
        // Cabecera de episodio o tiempo [MM:SS - MM:SS] Título o [MM:SS] Título
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

        // Diálogo [MM:SS] Hablante: Texto
        const inlineMatch = line.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.+)$/);
        if (inlineMatch) {
          currentTime = inlineMatch[1];
          lineas.push({ t: currentTime, s: inlineMatch[2].trim(), x: inlineMatch[3].trim() });
          continue;
        }

        // Diálogo Hablante: Texto
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0 && colonIdx < 35) {
          const s = line.substring(0, colonIdx).trim();
          const x = line.substring(colonIdx + 1).trim();
          lineas.push({ t: currentTime, s, x });
          continue;
        }

        // Texto continuo
        if (lineas.length > 0) {
          lineas[lineas.length - 1].x += ' ' + line;
        } else {
          lineas.push({ t: currentTime, s: 'Docente', x: line });
        }
      }

      // Si no se extrajeron episodios explícitos del documento, segmentar automáticamente
      const episodios = parsedEpisodios.length > 0 ? parsedEpisodios : segmentarEpisodiosBasica(lineas);
      const now = new Date().toISOString();

      // Asegurar que existe registro de grabación
      let grab = db.prepare('SELECT id FROM grabaciones WHERE intervencion_id = ?').get(id);
      let grabId = grab ? grab.id : 'grab-trans-' + randomUUID();
      if (!grab) {
        db.prepare(`
          INSERT INTO grabaciones (id, intervencion_id, user_id, filename, filepath, mimetype, transcription_status, created_at)
          VALUES (?, ?, ?, ?, 'uploaded_text', 'text/plain', 'completed', ?)
        `).run(grabId, id, interv.user_id, filename, now);
      } else {
        db.prepare("UPDATE grabaciones SET transcription_status = 'completed' WHERE id = ?").run(grab.id);
      }

      // Guardar o actualizar transcripción
      const transId = 'trans-' + randomUUID();
      db.prepare(`
        INSERT INTO transcripciones (id, grabacion_id, intervencion_id, raw_text, lineas_json, episodios_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(grabacion_id) DO UPDATE SET
          raw_text = excluded.raw_text,
          lineas_json = excluded.lineas_json,
          episodios_json = excluded.episodios_json
      `).run(transId, grabId, id, rawText, JSON.stringify(lineas), JSON.stringify(episodios), now);

      db.prepare("UPDATE intervenciones SET estado = 'con_grabacion', updated_at = ? WHERE id = ?").run(now, id);

      return sendJson(res, 200, { ok: true, lineas, episodios });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // ============================================================
  // API: Análisis Pedagógico Integral (Contraste + Competencias)
  // ============================================================
  const analyzeMatch = pathname.match(/^\/api\/intervenciones\/([a-zA-Z0-9_-]+)\/analizar$/);
  if (analyzeMatch && method === 'POST') {
    const user = authenticateRequest(req);
    if (!user) return sendJson(res, 401, { error: 'No autenticado' });
    const id = analyzeMatch[1];

    const interv = db.prepare('SELECT * FROM intervenciones WHERE id = ?').get(id);
    const plan = db.prepare('SELECT * FROM planificaciones WHERE intervencion_id = ?').get(id);
    const grab = db.prepare('SELECT * FROM grabaciones WHERE intervencion_id = ?').get(id);
    const trans = grab ? db.prepare('SELECT * FROM transcripciones WHERE grabacion_id = ?').get(grab.id) : null;

    if (!trans) {
      return sendJson(res, 400, { error: 'Se requiere la transcripción de la grabación para analizar la clase.' });
    }

    const lineas = JSON.parse(trans.lineas_json || '[]');
    const episodios = JSON.parse(trans.episodios_json || '[]');
    const mencion = interv.mencion || 'MMYCN';

    // 1. Contrastar Planificación vs. Aula Real
    const contraste = contrastarPlanificacionConAula(plan, lineas);

    // 2. Extraer Evidencias de Competencias
    const evidencias = extraerEvidenciasPEB(lineas, episodios, mencion);

    // 3. Valorar Nivel de Competencias en ND2
    const valoraciones = valorarCompetenciasPEB(evidencias, mencion);

    const now = new Date().toISOString();

    // Guardar Contrastación
    db.prepare(`
      INSERT INTO contrastaciones (id, intervencion_id, resumen_contraste, inicio_cumplimiento, desarrollo_cumplimiento, cierre_cumplimiento, desvios_didacticos, hallazgos_clave, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(intervencion_id) DO UPDATE SET
        resumen_contraste = excluded.resumen_contraste,
        hallazgos_clave = excluded.hallazgos_clave
    `).run(
      'cont-' + randomUUID(),
      id,
      contraste.resumen,
      contraste.hallazgos[1]?.observado_en_aula || '',
      contraste.hallazgos[2]?.observado_en_aula || '',
      contraste.hallazgos[3]?.observado_en_aula || '',
      contraste.cumplimiento_general,
      JSON.stringify(contraste.hallazgos),
      now
    );

    // Guardar Evidencias
    db.prepare('DELETE FROM evidencias WHERE intervencion_id = ?').run(id);
    const insertEv = db.prepare(`
      INSERT INTO evidencias (id, intervencion_id, comp_id, indicador_id, tipo, ini_linea, fin_linea, timestamp_ini, timestamp_fin, observado, interpretacion, fuente, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'grabacion', ?)
    `);

    for (const ev of evidencias) {
      insertEv.run(ev.id, id, ev.comp_id, ev.indicador_id, ev.tipo, ev.ini_linea, ev.fin_linea, ev.timestamp_ini, ev.timestamp_fin, ev.observado, ev.interpretacion, now);
    }

    // Guardar Valoraciones de Competencias
    db.prepare('DELETE FROM valoraciones_competencias WHERE intervencion_id = ?').run(id);
    const insertVal = db.prepare(`
      INSERT INTO valoraciones_competencias (id, intervencion_id, comp_id, categoria, fuerza, justificacion, limites, pregunta, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const v of valoraciones) {
      insertVal.run('val-' + randomUUID(), id, v.id, v.categoria, v.fuerza, v.justificacion, v.limites, v.pregunta, v.meta, now);
    }

    db.prepare("UPDATE intervenciones SET estado = 'analizada', updated_at = ? WHERE id = ?").run(now, id);

    return sendJson(res, 200, {
      ok: true,
      contraste,
      evidencias,
      valoraciones
    });
  }

  // ============================================================
  // API: Chatbot Tutor Reflexivo en 5 Fases
  // ============================================================
  const chatMatch = pathname.match(/^\/api\/intervenciones\/([a-zA-Z0-9_-]+)\/reflexion\/turno$/);
  if (chatMatch && method === 'POST') {
    const user = authenticateRequest(req);
    if (!user) return sendJson(res, 401, { error: 'No autenticado' });
    const id = chatMatch[1];

    const { message } = await parseBody(req);
    const now = new Date().toISOString();

    const turnosPrevios = db.prepare('SELECT * FROM turnos_reflexion WHERE intervencion_id = ? ORDER BY created_at ASC').all(id);

    // Guardar mensaje de usuario si existe
    if (message && message.trim()) {
      const userTurnId = 'turn-' + randomUUID();
      const currentFase = turnosPrevios.length ? Math.floor(turnosPrevios.length / 2) + 1 : 1;
      db.prepare(`
        INSERT INTO turnos_reflexion (id, intervencion_id, user_id, sender, fase, message, created_at)
        VALUES (?, ?, ?, 'user', ?, ?, ?)
      `).run(userTurnId, id, user.id, currentFase, message.trim(), now);
      turnosPrevios.push({ sender: 'user', message: message.trim(), fase: currentFase });
    }

    // Procesar turno con el motor pedagógico
    const botReply = procesarTurnoReflexionPEB(turnosPrevios, message, {});
    const botTurnId = 'turn-' + randomUUID();

    db.prepare(`
      INSERT INTO turnos_reflexion (id, intervencion_id, user_id, sender, fase, message, created_at)
      VALUES (?, ?, ?, 'chatbot', ?, ?, ?)
    `).run(botTurnId, id, user.id, botReply.fase, botReply.message, new Date().toISOString());

    const todosLosTurnos = db.prepare('SELECT * FROM turnos_reflexion WHERE intervencion_id = ? ORDER BY created_at ASC').all(id);

    return sendJson(res, 200, {
      ok: true,
      botReply,
      turnos: todosLosTurnos
    });
  }

  // ============================================================
  // API: Compilar Borrador de Capítulo 8 (Portafolio Docente)
  // ============================================================
  const portafolioMatch = pathname.match(/^\/api\/intervenciones\/([a-zA-Z0-9_-]+)\/portafolio\/compilar$/);
  if (portafolioMatch && method === 'POST') {
    const user = authenticateRequest(req);
    if (!user) return sendJson(res, 401, { error: 'No autenticado' });
    const id = portafolioMatch[1];

    const interv = db.prepare('SELECT * FROM intervenciones WHERE id = ?').get(id);
    const plan = db.prepare('SELECT * FROM planificaciones WHERE intervencion_id = ?').get(id);
    const contraste = db.prepare('SELECT * FROM contrastaciones WHERE intervencion_id = ?').get(id);
    const evidencias = db.prepare('SELECT * FROM evidencias WHERE intervencion_id = ?').all(id);
    const turnos = db.prepare('SELECT * FROM turnos_reflexion WHERE intervencion_id = ? ORDER BY created_at ASC').all(id);

    const borrador = compilarBorradorReflexionPortafolio(
      interv,
      plan,
      contraste ? { ...contraste, hallazgos: JSON.parse(contraste.hallazgos_clave || '[]') } : {},
      evidencias,
      turnos
    );

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO borrador_portafolio (id, intervencion_id, user_id, capitulo_reflexion, conclusiones, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(intervencion_id) DO UPDATE SET
        capitulo_reflexion = excluded.capitulo_reflexion,
        conclusiones = excluded.conclusiones
    `).run('borr-' + randomUUID(), id, user.id, borrador.contenido_markdown, JSON.stringify(borrador.criterios_cumplidos), now);

    return sendJson(res, 200, { ok: true, borrador });
  }

  // ============================================================
  // API: Listado de Estudiantes Practicantes (Tutores y Admins)
  // ============================================================
  if (pathname === '/api/estudiantes' && method === 'GET') {
    const user = authenticateRequest(req);
    if (!user || (user.role !== 'admin' && user.role !== 'tutor')) {
      return sendJson(res, 403, { error: 'Permisos insuficientes' });
    }
    const estudiantes = db.prepare(`
      SELECT id, name, email, mencion, rut, institucion
      FROM users
      WHERE role = 'estudiante'
      ORDER BY name ASC
    `).all();
    return sendJson(res, 200, estudiantes);
  }

  // ============================================================
  // API: Sincronización de Estudiantes desde Excel
  // ============================================================
  if (pathname === '/api/estudiantes/sincronizar' && method === 'POST') {
    const user = authenticateRequest(req);
    if (!user || (user.role !== 'admin' && user.role !== 'tutor')) {
      return sendJson(res, 403, { error: 'Permisos insuficientes' });
    }
    try {
      const resSync = await sincronizarEstudiantesDesdeExcel();
      return sendJson(res, 200, { ok: true, ...resSync });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // ============================================================
  // Servir Frontend Estático (`public/`)
  // ============================================================
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = join(publicDir, safePath);

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath).toLowerCase();
    const mime = MIME_STATIC[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    createReadStream(filePath).pipe(res);
    return;
  }

  // SPA fallback para rutas cliente
  const indexPath = join(publicDir, 'index.html');
  if (existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    createReadStream(indexPath).pipe(res);
    return;
  }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  } catch (err) {
    console.error('⚠️ [ERROR CONTROLADO EN SERVIDOR]', err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Error interno en el servidor', detalle: err?.message || String(err) });
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Observa-Retro · Pedagogía en Educación Básica (PPIV)`);
  console.log(`📡 Servidor activo en http://localhost:${PORT} y http://127.0.0.1:${PORT}`);
  console.log(`📚 Matriz PEB: ${MATRIZ_PEB.length} competencias cargadas (Nivel ND2)`);
  console.log(`======================================================\n`);
});
