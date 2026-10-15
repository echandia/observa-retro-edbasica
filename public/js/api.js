/**
 * Cliente de API para Observa-Retro Educación Básica
 */

const API = {
  token: localStorage.getItem('session_token') || '',

  setToken(t) {
    this.token = t;
    if (t) {
      localStorage.setItem('session_token', t);
    } else {
      localStorage.removeItem('session_token');
    }
  },

  async req(endpoint, options = {}) {
    const headers = { ...options.headers };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const isBinary = options.body instanceof ArrayBuffer ||
                     ArrayBuffer.isView(options.body) ||
                     (typeof Blob !== 'undefined' && options.body instanceof Blob) ||
                     (typeof FormData !== 'undefined' && options.body instanceof FormData);

    if (!isBinary && typeof options.body === 'object' && options.body !== null) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const res = await fetch(endpoint, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Error HTTP ${res.status}`);
    }
    return data;
  },

  // Auth
  login: (email, password) => API.req('/api/auth/login', { method: 'POST', body: { email, password } }),
  getMe: () => API.req('/api/auth/me'),
  logout: () => API.req('/api/auth/logout', { method: 'POST' }),

  // Matriz y Rúbricas
  getMatriz: () => API.req('/api/matriz'),
  getRubricas: () => API.req('/api/rubricas'),
  getPortafoliosCalibrados: () => API.req('/api/portafolios-calibrados'),

  // Config
  getConfig: () => API.req('/api/config'),
  saveConfig: (provider, apiKey) => API.req('/api/config', { method: 'POST', body: { provider, apiKey } }),

  // Intervenciones
  getIntervenciones: () => API.req('/api/intervenciones'),
  createIntervencion: (data) => API.req('/api/intervenciones', { method: 'POST', body: data }),
  getIntervencion: (id) => API.req(`/api/intervenciones/${id}`),

  // Carga de Planificación (.docx)
  uploadPlan: (id, fileOrBuffer, filename) => {
    return API.req(`/api/intervenciones/${id}/plan`, {
      method: 'POST',
      headers: {
        'x-filename': encodeURIComponent(filename),
        'Content-Type': 'application/octet-stream'
      },
      body: fileOrBuffer
    });
  },

  // Carga de Grabación (Audio / Video)
  uploadGrabacion: (id, fileOrBuffer, filename) => {
    return API.req(`/api/intervenciones/${id}/grabacion`, {
      method: 'POST',
      headers: {
        'x-filename': encodeURIComponent(filename),
        'Content-Type': 'application/octet-stream'
      },
      body: fileOrBuffer
    });
  },

  // Transcripción y Análisis
  transcribir: (id) => API.req(`/api/intervenciones/${id}/transcribir`, { method: 'POST' }),
  uploadTranscripcion: (id, fileOrBuffer, filename) => {
    return API.req(`/api/intervenciones/${id}/transcripcion`, {
      method: 'POST',
      headers: {
        'x-filename': encodeURIComponent(filename),
        'Content-Type': 'application/octet-stream'
      },
      body: fileOrBuffer
    });
  },
  uploadTranscripcionTexto: (id, raw_text) => {
    return API.req(`/api/intervenciones/${id}/transcripcion`, {
      method: 'POST',
      body: { raw_text }
    });
  },
  analizar: (id) => API.req(`/api/intervenciones/${id}/analizar`, { method: 'POST' }),

  // Chatbot Tutor Reflexivo
  enviarMensajeReflexion: (id, message) => API.req(`/api/intervenciones/${id}/reflexion/turno`, { method: 'POST', body: { message } }),

  // Compilar Portafolio
  compilarPortafolio: (id) => API.req(`/api/intervenciones/${id}/portafolio/compilar`, { method: 'POST' }),

  // Sincronizar y listar nómina
  getEstudiantes: () => API.req('/api/estudiantes'),
  sincronizarEstudiantes: () => API.req('/api/estudiantes/sincronizar', { method: 'POST' })
};

window.API = API;
