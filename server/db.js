import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scryptSync, randomBytes } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = process.env.DATABASE_PATH || join(__dirname, '..', 'observa_retro_peb.db');

const db = new DatabaseSync(dbPath);

// Modo WAL, claves foráneas y timeout para evitar 'database is locked' en Dropbox
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA busy_timeout = 10000;');

// Esquema de tablas para Práctica Pedagógica IV (Educación Básica)
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'estudiante', 'tutor', 'admin'
  rut TEXT,
  mencion TEXT DEFAULT 'MMYCN', -- 'MMYCN' (Mat/CsNat), 'MLYHCS' (Leng/Soc), 'MINGL' (Inglés)
  institucion TEXT DEFAULT 'UCSC',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cursos (
  id TEXT PRIMARY KEY,
  codigo TEXT,
  nombre TEXT NOT NULL,
  profesor_responsable TEXT,
  seccion TEXT,
  mencion TEXT,
  semestre TEXT DEFAULT '2026-1'
);

CREATE TABLE IF NOT EXISTS matriculas (
  id TEXT PRIMARY KEY,
  curso_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS intervenciones (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  fecha TEXT NOT NULL,
  curso TEXT,
  colegio TEXT,
  nivel_escolar TEXT DEFAULT 'Básica', -- ej: 3° Básico a 6° Básico
  mencion TEXT DEFAULT 'MMYCN',
  titulo_clase TEXT,
  tema TEXT,
  estado TEXT DEFAULT 'borrador', -- 'borrador', 'con_plan', 'con_grabacion', 'analizada', 'finalizada'
  es_ejemplo_referencia INTEGER DEFAULT 0, -- 1 si es ejemplo de referencia 2025 exclusivo para tutores/admin
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

try {
  db.exec('ALTER TABLE intervenciones ADD COLUMN es_ejemplo_referencia INTEGER DEFAULT 0;');
} catch (e) {}

db.exec(`
CREATE TABLE IF NOT EXISTS planificaciones (
  id TEXT PRIMARY KEY,
  intervencion_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  filename TEXT,
  filepath TEXT,
  oa_curricular TEXT,
  oa_previo TEXT,
  oa_futuro TEXT,
  obj_clase TEXT,
  obj_transversal TEXT,
  inicio_plan TEXT,
  desarrollo_plan TEXT,
  cierre_plan TEXT,
  recursos TEXT,
  evaluacion_plan TEXT,
  raw_text TEXT,
  eval_plan_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (intervencion_id) REFERENCES intervenciones(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grabaciones (
  id TEXT PRIMARY KEY,
  intervencion_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  mimetype TEXT DEFAULT 'audio/mp3',
  transcription_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TEXT NOT NULL,
  FOREIGN KEY (intervencion_id) REFERENCES intervenciones(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transcripciones (
  id TEXT PRIMARY KEY,
  grabacion_id TEXT UNIQUE NOT NULL,
  intervencion_id TEXT NOT NULL,
  raw_text TEXT,
  lineas_json TEXT,    -- [{ t: "00:00:15", s: "Practicante", x: "Buenos días..." }]
  episodios_json TEXT, -- [{ ini: 1, fin: 15, fase: "Inicio", titulo: "Activación y propósito" }]
  created_at TEXT NOT NULL,
  FOREIGN KEY (grabacion_id) REFERENCES grabaciones(id) ON DELETE CASCADE,
  FOREIGN KEY (intervencion_id) REFERENCES intervenciones(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contrastaciones (
  id TEXT PRIMARY KEY,
  intervencion_id TEXT UNIQUE NOT NULL,
  resumen_contraste TEXT,
  inicio_cumplimiento TEXT,
  desarrollo_cumplimiento TEXT,
  cierre_cumplimiento TEXT,
  desvios_didacticos TEXT,
  hallazgos_clave TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (intervencion_id) REFERENCES intervenciones(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS evidencias (
  id TEXT PRIMARY KEY,
  intervencion_id TEXT NOT NULL,
  comp_id TEXT NOT NULL,      -- CG1, CG2, CG3, CE1, CE2, CE3, CE4, CE5
  indicador_id TEXT NOT NULL, -- ej: CE1.1, CE2.2, etc.
  tipo TEXT NOT NULL,         -- 'apoya', 'discrepa', 'oportunidad'
  ini_linea INTEGER,
  fin_linea INTEGER,
  timestamp_ini TEXT,
  timestamp_fin TEXT,
  observado TEXT NOT NULL,
  interpretacion TEXT NOT NULL,
  fuente TEXT DEFAULT 'grabacion', -- 'grabacion', 'planificacion', 'contraste'
  created_at TEXT NOT NULL,
  FOREIGN KEY (intervencion_id) REFERENCES intervenciones(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS valoraciones_competencias (
  id TEXT PRIMARY KEY,
  intervencion_id TEXT NOT NULL,
  comp_id TEXT NOT NULL,
  categoria TEXT NOT NULL,    -- '2' (Logrado ND2), '1' (Incipiente), '0' (No determinable)
  fuerza TEXT NOT NULL,       -- 'alta', 'media', 'no_determinable'
  justificacion TEXT,
  limites TEXT,
  pregunta TEXT,
  meta TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (intervencion_id) REFERENCES intervenciones(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS turnos_reflexion (
  id TEXT PRIMARY KEY,
  intervencion_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  sender TEXT NOT NULL, -- 'user', 'chatbot'
  fase INTEGER NOT NULL, -- 1 a 5
  message TEXT NOT NULL,
  context_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (intervencion_id) REFERENCES intervenciones(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS borrador_portafolio (
  id TEXT PRIMARY KEY,
  intervencion_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  capitulo_reflexion TEXT,
  sintesis_evidencias TEXT,
  conclusiones TEXT,
  plan_mejora TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (intervencion_id) REFERENCES intervenciones(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS configuraciones (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
`);

// Sembrado inicial de administradores y tutores docentes
function seedInitialData() {
  const adminCheck = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@ucsc.cl');
  if (!adminCheck) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync('admin2026', salt, 64).toString('hex');
    const now = new Date().toISOString();
    
    // Admin general
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, role, institucion, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('user-admin-1', 'admin@ucsc.cl', hash, salt, 'Administrador Formación Básica', 'admin', 'UCSC / CIAE BASAL', now);

    // Docentes tutores de Práctica IV de las secciones observadas
    const tutores = [
      { id: 'tutor-lester', email: 'laliaga@ucsc.cl', name: 'Prof. Lester Aliaga', role: 'tutor', mencion: 'MMYCN' },
      { id: 'tutor-maria-uribe', email: 'muribe@ucsc.cl', name: 'Prof. María Angélica Uribe', role: 'tutor', mencion: 'MMYCN' },
      { id: 'tutor-tamara-luna', email: 'tluna@ucsc.cl', name: 'Prof. Tamara Luna Ulloa', role: 'tutor', mencion: 'MLYHCS' },
      { id: 'tutor-antonio-meneses', email: 'antonio.meneses@ucsc.cl', name: 'Prof. Antonio Meneses', role: 'tutor', mencion: 'MMYCN' },
      { id: 'tutor-coordinacion', email: 'coordinacion.peb@ucsc.cl', name: 'Coordinación Prácticas Básica', role: 'tutor', mencion: 'GENERAL' }
    ];

    const tutorStmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, role, mencion, institucion, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of tutores) {
      tutorStmt.run(t.id, t.email, hash, salt, t.name, t.role, t.mencion, 'UCSC', now);
    }

    // Estudiante de prueba con mención Matemática y Ciencias Naturales
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, role, rut, mencion, institucion, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'estudiante-demo',
      'practicante.basica@ucsc.cl',
      hash,
      salt,
      'Constanza Silva (Practicante PPIV)',
      'estudiante',
      '20123456-7',
      'MMYCN',
      'UCSC',
      now
    );

    // Configuración por defecto: proveedor demo activo
    db.prepare(`
      INSERT OR IGNORE INTO configuraciones (clave, valor)
      VALUES ('transcription_provider', 'demo')
    `).run();
  }
}

seedInitialData();

/**
 * Asegura la existencia de un usuario tutor o formador específico en la base de datos
 */
export function ensureUser({ email, name, role = 'tutor', password = 'tutor2026', mencion = 'MMYCN', institucion = 'UCSC' }) {
  const existing = db.prepare('SELECT id, email, role, name FROM users WHERE email = ?').get(email);
  if (!existing) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    const now = new Date().toISOString();
    const id = 'user-' + email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '-');
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, role, mencion, institucion, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, email, hash, salt, name, role, mencion, institucion, now);
    return { created: true, id, email, role, name };
  }
  return { created: false, id: existing.id, email: existing.email, role: existing.role, name: existing.name };
}

// Garantizar que Prof. Antonio Meneses esté registrado y activo
ensureUser({
  email: 'antonio.meneses@ucsc.cl',
  name: 'Prof. Antonio Meneses',
  role: 'tutor',
  password: 'tutor2026',
  mencion: 'MMYCN'
});

// Garantizar cuenta de Administrador General para Dr. Eugenio Chandía Muñoz
ensureUser({
  email: 'echandia@ucsc.cl',
  name: 'Dr. Eugenio Chandía Muñoz (Administrador)',
  role: 'admin',
  password: 'admin2026',
  mencion: 'GENERAL',
  institucion: 'UCSC / CIAE BASAL'
});

export default db;
