import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { scryptSync, randomBytes } from 'node:crypto';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptPath = join(__dirname, '..', 'scripts', 'extract_roster.py');
const cachedRosterPath = join(__dirname, '..', 'data', 'roster_students.json');

export function sincronizarEstudiantesDesdeExcel() {
  return new Promise((resolve, reject) => {
    function processStudentsList(students) {
      try {
        const salt = randomBytes(16).toString('hex');
        const defaultHash = scryptSync('basica2026', salt, 64).toString('hex');
        const now = new Date().toISOString();

        const insertStmt = db.prepare(`
          INSERT INTO users (id, email, password_hash, salt, name, role, rut, mencion, institucion, created_at)
          VALUES (?, ?, ?, ?, ?, 'estudiante', ?, ?, 'UCSC', ?)
          ON CONFLICT(email) DO UPDATE SET
            name = excluded.name,
            rut = COALESCE(excluded.rut, users.rut),
            mencion = COALESCE(excluded.mencion, users.mencion)
        `);

        let insertedCount = 0;
        db.exec('BEGIN TRANSACTION;');
        try {
          for (const s of students) {
            if (!s.email) continue;
            const id = 'user-' + s.email.replace(/[^a-zA-Z0-9]/g, '-');
            insertStmt.run(id, s.email, defaultHash, salt, s.name, s.rut || '', s.mencion || 'MMYCN', now);
            insertedCount++;
          }
          db.exec('COMMIT;');
        } catch (trxErr) {
          try { db.exec('ROLLBACK;'); } catch (_) {}
          throw trxErr;
        }

        resolve({ total: students.length, importados: insertedCount });
      } catch (err) {
        reject(new Error(`Error al procesar estudiantes en base de datos: ${err.message}`));
      }
    }

    execFile('python3', [scriptPath], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      let parsedStudents = null;
      if (!error && stdout) {
        try {
          let jsonStr = stdout.trim();
          const startIdx = jsonStr.indexOf('[');
          const endIdx = jsonStr.lastIndexOf(']');
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            jsonStr = jsonStr.substring(startIdx, endIdx + 1);
          }
          parsedStudents = JSON.parse(jsonStr);
        } catch (_) {
          parsedStudents = null;
        }
      }

      if (!parsedStudents || !Array.isArray(parsedStudents) || parsedStudents.length === 0) {
        if (existsSync(cachedRosterPath)) {
          try {
            parsedStudents = JSON.parse(readFileSync(cachedRosterPath, 'utf-8'));
          } catch (e) {
            return reject(new Error(`Error al leer archivo de estudiantes en caché: ${e.message}`));
          }
        } else {
          return reject(new Error(`Error al extraer nómina: ${stderr || error?.message || 'Salida inválida'}`));
        }
      }

      processStudentsList(parsedStudents);
    });
  });
}
