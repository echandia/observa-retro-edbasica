import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptPath = join(__dirname, '..', 'scripts', 'extract_docx.py');

export function extractTextFromDocx(filePath) {
  return new Promise((resolve, reject) => {
    execFile('python3', [scriptPath, filePath], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Error al extraer docx: ${stderr || error.message}`));
      }
      resolve(stdout);
    });
  });
}

export function parseStructuredPlanDocx(filePath) {
  return new Promise((resolve, reject) => {
    execFile('python3', [scriptPath, filePath, '--json'], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Error al estructurar plan docx: ${stderr || error.message}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`JSON inválido devuelto por extract_docx: ${err.message}`));
      }
    });
  });
}
