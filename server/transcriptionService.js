import db from './db.js';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { extname } from 'node:path';

export function getTranscriptionConfig() {
  const providerRow = db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get('transcription_provider');
  const keyRow = db.prepare('SELECT valor FROM configuraciones WHERE clave = ?').get('transcription_api_key');
  
  return {
    provider: (providerRow && providerRow.valor) || process.env.TRANSCRIPTION_PROVIDER || 'demo',
    apiKey: (keyRow && keyRow.valor) || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || ''
  };
}

export function saveTranscriptionConfig(provider, apiKey) {
  const insert = db.prepare(`
    INSERT INTO configuraciones (clave, valor) VALUES (?, ?)
    ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
  `);
  if (provider) insert.run('transcription_provider', provider);
  if (apiKey !== undefined) insert.run('transcription_api_key', apiKey.trim());
}

let isTranscriptionActive = false;
let activeTranscriptionName = '';

/**
 * Transcribe una grabación de aula (audio o video) utilizando Gemini, Whisper o modo Demo.
 */
export async function transcribirAudio(mediaFilePath, mimeType) {
  if (isTranscriptionActive) {
    return {
      error_code: 'TRANSCRIPTION_BUSY',
      message: `Ya hay una transcripción de aula en proceso (${activeTranscriptionName || 'grabación'}). Espera unos instantes a que finalice.`,
      lineas: [],
      texto: ''
    };
  }

  isTranscriptionActive = true;
  activeTranscriptionName = mediaFilePath ? mediaFilePath.split(/[\\/]/).pop() : 'grabación';

  try {
    return await ejecutarTranscripcion(mediaFilePath, mimeType);
  } finally {
    isTranscriptionActive = false;
    activeTranscriptionName = '';
  }
}

async function ejecutarTranscripcion(mediaFilePath, mimeType) {
  const config = getTranscriptionConfig();

  if (config.provider === 'demo' || !config.apiKey) {
    return transcribirModoDemoBasica(mediaFilePath);
  }

  if (!existsSync(mediaFilePath)) {
    throw new Error('El archivo de grabación no existe en el servidor');
  }

  const stat = statSync(mediaFilePath);
  const sizeMB = stat.size / (1024 * 1024);

  // Gemini (Google AI Studio)
  if (config.provider === 'gemini') {
    return await transcribirConGemini(mediaFilePath, mimeType, config.apiKey, sizeMB);
  }

  // Groq o OpenAI (Whisper)
  if (config.provider.includes('groq') || config.provider.includes('openai')) {
    return await transcribirConWhisper(mediaFilePath, config.provider, config.apiKey);
  }

  return transcribirModoDemoBasica(mediaFilePath);
}

function parseTranscriptionLines(rawText) {
  const lineas = [];
  const regex = /\[(\d{2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.+)/g;
  let match;

  while ((match = regex.exec(rawText)) !== null) {
    lineas.push({
      t: match[1],
      s: match[2].trim(),
      x: match[3].trim()
    });
  }

  // Si no coincidió con formato [MM:SS] Hablante: Texto
  if (lineas.length === 0) {
    const rawParagraphs = rawText.split('\n').filter(p => p.trim());
    rawParagraphs.forEach((p, idx) => {
      const minutes = Math.floor((idx * 20) / 60);
      const seconds = (idx * 20) % 60;
      const t = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      lineas.push({
        t,
        s: idx % 2 === 0 ? 'Practicante' : 'Estudiante',
        x: p.trim()
      });
    });
  }

  return lineas;
}

function transcribirModoDemoBasica(mediaFilePath) {
  const rawText = `[00:00:10] Practicante: ¡Buenos días niños y niñas! Tomen asiento, por favor.
[00:00:25] Practicante: Hoy en nuestra clase de Matemática continuaremos trabajando con las fracciones impropias y los números mixtos.
[00:00:42] Practicante: Como objetivo de hoy, representaremos fracciones mayores que un entero utilizando material concreto y dibujos en la recta numérica.
[00:01:05] Practicante: Para comenzar, ¿quién recuerda qué significaba el numerador y qué significaba el denominador?
[00:01:18] E1 (Tomás): El denominador nos dice en cuántas partes iguales se dividió el chocolate o el entero.
[00:01:30] Practicante: ¡Muy bien, Tomás! ¿Y el numerador? A ver, Sofía.
[00:01:42] E2 (Sofía): Las partes que tomamos o que pintamos.
[00:01:50] Practicante: Excelente. Ahora miren la pizarra: tengo 7 cuartos (7/4). Si una pizza tiene 4 pedazos, ¿me alcanza con una pizza para comer 7 pedazos?
[00:02:10] Varios estudiantes: ¡Nooo, falta pizza!
[00:02:18] Practicante: ¿Cuántas pizzas enteras necesitamos como mínimo?
[00:02:26] E3 (Martín): Dos pizzas, profesor. Una entera de 4 pedazos y de la otra comemos 3 pedazos.
[00:02:40] Practicante: Muy bien pensado, Martín. ¿Cómo escribiríamos eso como número mixto?
[00:02:50] E4 (Catalina): Un entero y tres cuartos (1 3/4).
[00:03:05] Practicante: Perfecto. Ahora en sus mesas tienen las barras fraccionarias que recortamos ayer. Lucas, veo que estás con dudas, ¿qué parte se te está haciendo difícil?
[00:03:22] E5 (Lucas): Es que no sé por qué 7 cuartos es más grande que 1 si el 4 es el que divide.
[00:03:38] Practicante: Ven acá, Lucas, usemos las fichas de colores. Pon 4 fichas de 1/4... ¿qué forman juntas?
[00:03:50] E5 (Lucas): Forman un entero completo.
[00:03:55] Practicante: Exacto. ¿Y cuántas fichas nos quedan para llegar a 7?
[00:04:02] E5 (Lucas): Nos quedan 3 fichas más... ¡ah, entonces es un entero y tres pedacitos más!
[00:04:14] Practicante: ¡Brillante, Lucas! Todos escuchen lo que acaba de descubrir Lucas con el material concreto.
[00:04:30] Practicante: Ahora en parejas van a resolver el desafío de la guía: representar 9/4 y 5/2 en sus cuadernos usando la recta numérica. Tienen 12 minutos.
[00:05:00] Practicante: (Monitoreando mesas) Recuerden dividir cada entero en la misma cantidad de partes iguales que indica el denominador.
[00:05:30] Practicante: Niños y niñas, tiempo cumplido. Para cerrar nuestra clase: ¿qué aprendimos hoy sobre cómo transformar una fracción impropia a número mixto?
[00:05:45] E1 (Tomás): Que dividimos el numerador por el denominador, y el cociente es el número entero y lo que sobra es el numerador.
[00:06:00] Practicante: Excelente síntesis. Guarden sus materiales con cuidado y nos vemos la próxima sesión.`;

  return {
    provider: 'demo',
    lineas: parseTranscriptionLines(rawText),
    texto: rawText
  };
}

async function transcribirConGemini(mediaFilePath, mimeType, apiKey, sizeMB) {
  // Transcripción mediante llamada directa a Gemini API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const systemInstruction = `Eres un asistente experto en análisis y transcripción de clases de Educación Básica.
Tu tarea es transcribir el audio de aula con alta precisión pedagógica:
1. Identifica al Practicante/Docente y a los Estudiantes (ej: "Practicante:", "E1 (Nombre o Alumno):").
2. Incluye marcas de tiempo al inicio de cada turno en formato [MM:SS].
3. Preserva las preguntas formuladas, las explicaciones y las intervenciones espontáneas de los niños.
4. Devuelve solo las líneas de transcripción sin texto introductorio ni markdown adicional.`;

  const fileData = readFileSync(mediaFilePath);
  const base64Data = fileData.toString('base64');
  const actualMime = mimeType || (extname(mediaFilePath).toLowerCase() === '.mp4' ? 'video/mp4' : 'audio/mp3');

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemInstruction },
          {
            inlineData: {
              mimeType: actualMime,
              data: base64Data
            }
          },
          { text: "Transcribe toda la clase registrando cada turno de habla con su marca de tiempo [MM:SS] y hablante." }
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en API de Gemini (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const lineas = parseTranscriptionLines(rawText);

  return {
    provider: 'gemini',
    lineas,
    texto: rawText
  };
}

async function transcribirConWhisper(mediaFilePath, provider, apiKey) {
  const isGroq = provider.includes('groq');
  const url = isGroq ? 'https://api.groq.com/openai/v1/audio/transcriptions' : 'https://api.openai.com/v1/audio/transcriptions';
  const model = isGroq ? 'whisper-large-v3' : 'whisper-1';

  const formData = new FormData();
  const fileBuffer = readFileSync(mediaFilePath);
  const blob = new Blob([fileBuffer]);
  formData.append('file', blob, mediaFilePath.split(/[\\/]/).pop());
  formData.append('model', model);
  formData.append('language', 'es');
  formData.append('response_format', 'text');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en Whisper (${response.status}): ${errorText}`);
  }

  const rawText = await response.text();
  const lineas = parseTranscriptionLines(rawText);

  return {
    provider: isGroq ? 'groq' : 'openai',
    lineas,
    texto: rawText
  };
}
