/**
 * Aplicación principal Observa-Retro Educación Básica (Práctica Pedagógica IV)
 */

const App = {
  user: null,
  intervenciones: [],
  currentIntervencion: null,
  currentDetail: null,
  matriz: null,
  rubricas: null,
  player: null,

  async init() {
    this.setupEventListeners();
    await this.checkAuth();
  },

  async checkAuth() {
    try {
      const data = await API.getMe();
      this.user = data.user;
      this.updateUserUI();
      await this.loadInitialData();
    } catch (e) {
      this.showLoginModal();
    }
  },

  updateUserUI() {
    const userBadge = document.getElementById('user-badge');
    const roleBadge = document.getElementById('role-badge');
    const mencionBadge = document.getElementById('mencion-badge');
    const tutorTab = document.getElementById('tab-btn-tutor');

    if (this.user) {
      userBadge.textContent = this.user.name;
      roleBadge.textContent = this.user.role.toUpperCase();
      mencionBadge.textContent = this.user.mencion || 'MMYCN';

      if (this.user.role === 'admin' || this.user.role === 'tutor') {
        tutorTab.style.display = 'inline-block';
      } else {
        tutorTab.style.display = 'none';
      }
    }
  },

  async loadInitialData() {
    try {
      this.matriz = await API.getMatriz();
      this.rubricas = await API.getRubricas();
      await this.loadIntervenciones();
      this.renderMatrizReference();
    } catch (e) {
      console.error('Error al cargar datos iniciales:', e);
    }
  },

  async loadIntervenciones() {
    try {
      this.intervenciones = await API.getIntervenciones();
      const select = document.getElementById('intervencion-select');
      select.innerHTML = '';

      if (this.intervenciones.length === 0) {
        select.innerHTML = '<option value="">No hay clases registradas aún</option>';
        return;
      }

      this.intervenciones.forEach(it => {
        const opt = document.createElement('option');
        opt.value = it.id;
        const nombreExt = it.practicante_nombre ? ` (${it.practicante_nombre})` : '';
        const badgeRef = it.es_ejemplo_referencia ? '⭐ [CASO REFERENCIA 2025] ' : '';
        opt.textContent = `${badgeRef}${it.titulo_clase || 'Clase sin título'} - ${it.fecha} [${it.mencion}]${nombreExt}`;
        select.appendChild(opt);
      });

      // Seleccionar la primera por defecto
      if (!this.currentIntervencion && this.intervenciones.length > 0) {
        await this.selectIntervencion(this.intervenciones[0].id);
      }
    } catch (e) {
      console.error('Error cargando intervenciones:', e);
    }
  },

  async selectIntervencion(id) {
    if (!id) return;
    try {
      this.currentDetail = await API.getIntervencion(id);
      this.currentIntervencion = this.currentDetail.intervencion;
      document.getElementById('intervencion-select').value = id;
      this.renderDetail();
    } catch (e) {
      alert('Error al cargar detalle de la clase: ' + e.message);
    }
  },

  renderDetail() {
    const d = this.currentDetail;
    if (!d) return;

    // 1. Render Planificación
    const planBox = document.getElementById('plan-status-box');
    if (d.plan) {
      planBox.innerHTML = `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 8px;">
          <h4 style="color: #166534; margin-bottom: 8px;">✅ Planificación Cargada (${d.plan.filename})</h4>
          <p><strong>OA a trabajar:</strong> ${d.plan.oa_curricular || 'No especificado'}</p>
          <p><strong>Objetivo de Clase:</strong> ${d.plan.obj_clase || 'No especificado'}</p>
          <p style="margin-top: 8px;"><strong>Momento Inicio:</strong> ${d.plan.inicio_plan ? d.plan.inicio_plan.slice(0, 160) + '...' : 'Sin detalle'}</p>
          <p><strong>Momento Desarrollo:</strong> ${d.plan.desarrollo_plan ? d.plan.desarrollo_plan.slice(0, 160) + '...' : 'Sin detalle'}</p>
          <p><strong>Momento Cierre:</strong> ${d.plan.cierre_plan ? d.plan.cierre_plan.slice(0, 160) + '...' : 'Sin detalle'}</p>
        </div>
      `;
    } else {
      planBox.innerHTML = `
        <p style="color: var(--text-muted);">No has subido la planificación de esta clase aún. Sube el archivo .docx oficial para activar la contrastación automática.</p>
      `;
    }

    // 2. Render Grabación y Transcripción
    const transBox = document.getElementById('transcript-list');
    const epNav = document.getElementById('episodios-nav');
    if (d.transcripcion && d.transcripcion.lineas && d.transcripcion.lineas.length > 0) {
      transBox.innerHTML = d.transcripcion.lineas.map((l, idx) => `
        <div class="transcript-row" onclick="App.seekAudio('${l.t}')">
          <span class="t-time">${l.t}</span>
          <span class="t-speaker">${l.s}:</span>
          <span class="t-text">${l.x}</span>
        </div>
      `).join('');

      if (d.transcripcion.episodios) {
        epNav.innerHTML = d.transcripcion.episodios.map(ep => `
          <button class="btn btn-sm btn-secondary" onclick="App.seekAudio('${ep.timestamp_ini}')">
            📍 ${ep.fase}: ${ep.titulo.slice(0, 32)}... (${ep.timestamp_ini})
          </button>
        `).join('');
      }

      // Conectar reproductor de audio
      if (!this.player) {
        this.player = new ClassroomPlayer('audio-element', 'audio-scrubber', 'audio-time');
      }
      this.player.loadSource(`/api/intervenciones/${d.intervencion.id}/grabacion/stream`);
    } else {
      transBox.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">
        Aún no hay transcripción. Sube el audio/video de la clase o haz clic en <strong>"Generar Transcripción / Modo Demo"</strong>.
      </div>`;
      epNav.innerHTML = '';
    }

    // 3. Render Cuadro Comparativo (Contraste Plan vs. Aula)
    const contrasteTbody = document.getElementById('contraste-tbody');
    if (d.contraste && d.contraste.hallazgos && d.contraste.hallazgos.length > 0) {
      contrasteTbody.innerHTML = d.contraste.hallazgos.map(h => `
        <tr>
          <td><strong>${h.dimension}</strong><br/><small style="color:#64748b">${h.indicador || ''}</small></td>
          <td>${h.planificado}</td>
          <td>${h.observado_en_aula}</td>
          <td>
            <span class="badge ${h.estado === 'Cumplido' ? 'badge-nd2' : 'badge-role'}">
              ${h.estado}
            </span>
          </td>
        </tr>
      `).join('');
    } else {
      contrasteTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 20px;">
        Haz clic en <strong>"Ejecutar Análisis Integral"</strong> para contrastar la planificación con el aula grabada.
      </td></tr>`;
    }

    // 4. Render Matriz de Competencias PEB (Nivel ND2)
    const compGrid = document.getElementById('competencias-grid');
    if (d.valoraciones && d.valoraciones.length > 0) {
      compGrid.innerHTML = d.valoraciones.map(v => {
        const isND2 = v.categoria === '2';
        return `
          <div class="card comp-card ${isND2 ? 'achieved' : ''}">
            <div class="card-title">
              <span>${v.comp_id}: ${this.getCompNombre(v.comp_id)}</span>
              <span class="comp-badge ${isND2 ? 'comp-nd2' : 'comp-incipiente'}">
                ${isND2 ? 'ND2 LOGRADO' : 'INCIPIENTE'}
              </span>
            </div>
            <p style="font-size: 0.85rem; color: #334155; margin-bottom: 8px;"><strong>Justificación:</strong> ${v.justificacion}</p>
            ${v.limites ? `<p style="font-size: 0.82rem; color: #64748b; margin-bottom: 8px;"><em>Límites observados:</em> ${v.limites}</p>` : ''}
            <div style="background: #f8fafc; border-left: 3px solid #3b82f6; padding: 8px 12px; margin-top: 10px; border-radius: 4px;">
              <p style="font-size: 0.83rem; color: #1e3a8a;"><strong>Pregunta Reflexiva:</strong> ${v.pregunta}</p>
              ${v.meta ? `<p style="font-size: 0.83rem; color: #0f766e; margin-top: 4px;"><strong>Meta para la próxima clase:</strong> ${v.meta}</p>` : ''}
            </div>
          </div>
        `;
      }).join('');
    } else {
      compGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 24px; text-align: center; color: #64748b;">
        Las valoraciones de competencias se generarán al ejecutar el análisis integral de la clase.
      </div>`;
    }

    // 5. Render Chatbot Tutor Reflexivo
    this.renderChatMessages();

    // 6. Render Borrador de Portafolio
    const portPreview = document.getElementById('portafolio-preview');
    if (d.borrador_portafolio && d.borrador_portafolio.capitulo_reflexion) {
      portPreview.textContent = d.borrador_portafolio.capitulo_reflexion;
    } else {
      portPreview.textContent = "El borrador del Capítulo 8 (Reflexión Docente) se generará automáticamente a partir del diálogo con el chatbot tutor reflexivo.";
    }

    // 7. Panel Docente (si es tutor)
    if (this.user && (this.user.role === 'admin' || this.user.role === 'tutor')) {
      this.renderTutorDashboard();
    }
  },

  renderChatMessages() {
    const chatContainer = document.getElementById('chat-messages');
    const turnos = this.currentDetail?.turnos_reflexion || [];

    if (turnos.length === 0) {
      chatContainer.innerHTML = `
        <div class="chat-bubble bot">
          ¡Hola! Soy tu <strong>Tutor Reflexivo de Práctica IV (Educación Básica)</strong>. Estoy aquí para acompañarte a reflexionar sobre lo ocurrido en tu clase grabada y contrastarlo con tu planificación, guiándote paso a paso para construir el <strong>Capítulo 8 de tu Portafolio Docente</strong>.<br/><br/>
          Para comenzar: <em>¿Qué episodio de tu clase grabada consideras que fue el momento más desafiante o significativo en el aprendizaje de los niños?</em>
        </div>
      `;
      return;
    }

    chatContainer.innerHTML = turnos.map(t => `
      <div class="chat-bubble ${t.sender === 'user' ? 'user' : 'bot'}">
        ${t.message.replace(/\n/g, '<br/>')}
      </div>
    `).join('');

    chatContainer.scrollTop = chatContainer.scrollHeight;
  },

  renderMatrizReference() {
    const listContainer = document.getElementById('matriz-reference-list');
    if (!this.matriz || !this.matriz.competencias) return;

    listContainer.innerHTML = this.matriz.competencias.map(c => `
      <div style="border-bottom: 1px solid #e2e8f0; padding: 10px 0;">
        <span class="badge ${c.tipo === 'Generica' ? 'badge-mencion' : 'badge-nd2'}">${c.id}</span>
        <strong> ${c.nombre}</strong> (Nivel esperado en PPIV: ND2)
        <p style="font-size: 0.82rem; color: #475569; margin-top: 4px;">${c.definicion}</p>
        <p style="font-size: 0.8rem; color: #0284c7; margin-top: 2px;"><em>Criterio ND2:</em> ${c.niveles?.ND2 || ''}</p>
      </div>
    `).join('');
  },

  renderTutorDashboard() {
    const tbody = document.getElementById('tutor-table-body');
    if (!tbody) return;

    tbody.innerHTML = this.intervenciones.map(it => `
      <tr>
        <td><strong>${it.practicante_nombre || 'Estudiante'}</strong><br/><small style="color:#64748b">${it.practicante_email || ''}</small></td>
        <td>${it.titulo_clase || 'Sin título'}<br/><small>${it.nivel_escolar} · ${it.mencion}</small></td>
        <td>${it.fecha}</td>
        <td><span class="badge ${it.estado === 'analizada' ? 'badge-nd2' : 'badge-role'}">${it.estado}</span></td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="App.selectIntervencion('${it.id}')">Revisar Clase</button>
        </td>
      </tr>
    `).join('');
  },

  getCompNombre(id) {
    if (!this.matriz?.competencias) return id;
    const found = this.matriz.competencias.find(c => c.id === id);
    return found ? found.nombre : id;
  },

  seekAudio(timestamp) {
    if (this.player && timestamp) {
      this.player.seekToTimestamp(timestamp);
    }
  },

  setupEventListeners() {
    // Tabs navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.classList.add('active');
      });
    });

    // Select intervencion
    document.getElementById('intervencion-select').addEventListener('change', (e) => {
      this.selectIntervencion(e.target.value);
    });

    // Botón nueva intervención
    document.getElementById('btn-nueva-intervencion').addEventListener('click', () => {
      this.showNuevaIntervencionModal();
    });

    // Subir Planificación (.docx)
    document.getElementById('plan-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || !this.currentIntervencion) return;
      const statusBox = document.getElementById('plan-status-box');
      if (statusBox) statusBox.innerHTML = '<p style="color: var(--primary);">⏳ Subiendo y estructurando planificación...</p>';
      try {
        await API.uploadPlan(this.currentIntervencion.id, file, file.name);
        alert('Planificación subida y analizada correctamente');
        await this.selectIntervencion(this.currentIntervencion.id);
      } catch (err) {
        alert('Error al subir planificación: ' + err.message);
        await this.selectIntervencion(this.currentIntervencion.id);
      }
    });

    // Subir Grabación (Audio / Video)
    document.getElementById('grabacion-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || !this.currentIntervencion) return;
      const transBox = document.getElementById('transcript-list');
      if (transBox) transBox.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--primary);">⏳ Subiendo grabación de aula (' + (file.size / (1024 * 1024)).toFixed(1) + ' MB)... Por favor espera.</div>';
      try {
        await API.uploadGrabacion(this.currentIntervencion.id, file, file.name);
        alert('Grabación subida correctamente');
        await this.selectIntervencion(this.currentIntervencion.id);
      } catch (err) {
        alert('Error al subir grabación: ' + err.message);
        await this.selectIntervencion(this.currentIntervencion.id);
      }
    });

    // Subir Transcripción en archivo (.docx, .txt, .vtt, .srt)
    document.getElementById('transcripcion-file-input')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || !this.currentIntervencion) return;
      const transBox = document.getElementById('transcript-list');
      if (transBox) transBox.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--primary);">⏳ Extrayendo y segmentando turnos de habla...</div>';
      try {
        await API.uploadTranscripcion(this.currentIntervencion.id, file, file.name);
        alert('Transcripción procesada y cargada exitosamente');
        await this.selectIntervencion(this.currentIntervencion.id);
      } catch (err) {
        alert('Error al subir transcripción: ' + err.message);
        await this.selectIntervencion(this.currentIntervencion.id);
      }
    });

    // Abrir modal para pegar texto de transcripción
    document.getElementById('btn-pegar-transcripcion')?.addEventListener('click', () => {
      if (!this.currentIntervencion) {
        alert('Por favor selecciona primero una clase');
        return;
      }
      document.getElementById('modal-pegar-transcripcion')?.classList.add('open');
    });

    // Enviar texto pegado de transcripción
    document.getElementById('form-pegar-transcripcion')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const txt = document.getElementById('text-transcripcion-pegada').value.trim();
      if (!txt || !this.currentIntervencion) return;
      try {
        await API.uploadTranscripcionTexto(this.currentIntervencion.id, txt);
        document.getElementById('modal-pegar-transcripcion').classList.remove('open');
        document.getElementById('text-transcripcion-pegada').value = '';
        alert('Transcripción procesada y guardada correctamente');
        await this.selectIntervencion(this.currentIntervencion.id);
      } catch (err) {
        alert('Error al guardar transcripción: ' + err.message);
      }
    });

    // Transcribir
    document.getElementById('btn-transcribir').addEventListener('click', async () => {
      if (!this.currentIntervencion) return;
      const btn = document.getElementById('btn-transcribir');
      btn.textContent = 'Transcribiendo...';
      btn.disabled = true;
      try {
        await API.transcribir(this.currentIntervencion.id);
        await this.selectIntervencion(this.currentIntervencion.id);
      } catch (err) {
        alert('Error al transcribir: ' + err.message);
      } finally {
        btn.textContent = '🎙️ Transcribir Grabación';
        btn.disabled = false;
      }
    });

    // Analizar
    document.getElementById('btn-analizar-todo').addEventListener('click', async () => {
      if (!this.currentIntervencion) return;
      const btn = document.getElementById('btn-analizar-todo');
      btn.textContent = 'Analizando contrastación...';
      btn.disabled = true;
      try {
        await API.analizar(this.currentIntervencion.id);
        await this.selectIntervencion(this.currentIntervencion.id);
        alert('Análisis integral de contrastación y competencias completado.');
      } catch (err) {
        alert('Error al analizar clase: ' + err.message);
      } finally {
        btn.textContent = '⚡ Ejecutar Análisis Integral';
        btn.disabled = false;
      }
    });

    // Chatbot send
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const text = input.value.trim();
      if (!text || !this.currentIntervencion) return;

      input.value = '';
      input.disabled = true;

      try {
        const res = await API.enviarMensajeReflexion(this.currentIntervencion.id, text);
        this.currentDetail.turnos_reflexion = res.turnos;
        this.renderChatMessages();

        // Si se llegó a la fase final, autocompilar portafolio
        if (res.botReply?.fase >= 5) {
          await API.compilarPortafolio(this.currentIntervencion.id);
          await this.selectIntervencion(this.currentIntervencion.id);
        }
      } catch (err) {
        alert('Error en diálogo: ' + err.message);
      } finally {
        input.disabled = false;
        input.focus();
      }
    });

    // Botón compilar portafolio manual
    document.getElementById('btn-compilar-portafolio').addEventListener('click', async () => {
      if (!this.currentIntervencion) return;
      try {
        const res = await API.compilarPortafolio(this.currentIntervencion.id);
        document.getElementById('portafolio-preview').textContent = res.borrador.contenido_markdown;
        alert('Capítulo 8 generado exitosamente.');
      } catch (err) {
        alert('Error al compilar portafolio: ' + err.message);
      }
    });

    // Copiar portafolio
    document.getElementById('btn-copiar-portafolio').addEventListener('click', () => {
      const text = document.getElementById('portafolio-preview').textContent;
      navigator.clipboard.writeText(text);
      alert('Texto del Capítulo 8 copiado al portapapeles.');
    });

    // Config modal
    document.getElementById('btn-config').addEventListener('click', async () => {
      const cfg = await API.getConfig();
      document.getElementById('cfg-provider').value = cfg.provider || 'demo';
      document.getElementById('cfg-key').value = cfg.apiKey || '';
      document.getElementById('modal-config').classList.add('open');
    });

    document.getElementById('form-config').addEventListener('submit', async (e) => {
      e.preventDefault();
      const p = document.getElementById('cfg-provider').value;
      const k = document.getElementById('cfg-key').value;
      await API.saveConfig(p, k);
      document.getElementById('modal-config').classList.remove('open');
      alert('Configuración guardada.');
    });

    // Sincronizar nómina
    document.getElementById('btn-sync-roster')?.addEventListener('click', async () => {
      try {
        const res = await API.sincronizarEstudiantes();
        alert(`Nómina sincronizada: ${res.importados} estudiantes actualizados.`);
        await this.loadIntervenciones();
      } catch (e) {
        alert('Error sincronizando nómina: ' + e.message);
      }
    });

    // Cerrar modales
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
      });
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', async () => {
      await API.logout();
      API.setToken('');
      window.location.reload();
    });
  },

  showLoginModal() {
    document.getElementById('modal-login').classList.add('open');
    document.getElementById('login-form').onsubmit = async (e) => {
      e.preventDefault();
      const em = document.getElementById('login-email').value;
      const pass = document.getElementById('login-pass').value;
      try {
        const data = await API.login(em, pass);
        API.setToken(data.token);
        this.user = data.user;
        document.getElementById('modal-login').classList.remove('open');
        this.updateUserUI();
        await this.loadInitialData();
      } catch (err) {
        alert('Error de inicio de sesión: ' + err.message);
      }
    };
  },

  async showNuevaIntervencionModal() {
    const modal = document.getElementById('modal-nueva-intervencion');
    modal.classList.add('open');

    const groupEst = document.getElementById('group-new-estudiante');
    const selectEst = document.getElementById('new-estudiante');

    if (this.user && (this.user.role === 'admin' || this.user.role === 'tutor')) {
      groupEst.style.display = 'block';
      if (selectEst && selectEst.options.length <= 1) {
        try {
          const estudiantes = await API.getEstudiantes();
          selectEst.innerHTML = '<option value="">-- Asignar a mi propio perfil (Tutor/Admin) --</option>';
          estudiantes.forEach(est => {
            const opt = document.createElement('option');
            opt.value = est.id;
            opt.textContent = `${est.name} (${est.email}) - [${est.mencion}]`;
            selectEst.appendChild(opt);
          });
        } catch (e) {
          console.error('Error cargando estudiantes para selector:', e);
        }
      }
    } else if (groupEst) {
      groupEst.style.display = 'none';
    }

    document.getElementById('form-nueva-intervencion').onsubmit = async (e) => {
      e.preventDefault();
      const titulo = document.getElementById('new-titulo').value;
      const nivel = document.getElementById('new-nivel').value;
      const mencion = document.getElementById('new-mencion').value;
      const colegio = document.getElementById('new-colegio').value;
      const fecha = document.getElementById('new-fecha').value;
      const estudianteId = selectEst?.value || null;

      try {
        const created = await API.createIntervencion({
          titulo_clase: titulo,
          nivel_escolar: nivel,
          mencion: mencion,
          colegio: colegio,
          fecha: fecha,
          estudiante_id: estudianteId
        });
        document.getElementById('modal-nueva-intervencion').classList.remove('open');
        await this.loadIntervenciones();
        await this.selectIntervencion(created.id);
        alert('Clase creada exitosamente. Ahora puedes subir la planificación, grabación o transcripción para analizar.');
      } catch (err) {
        alert('Error al crear clase: ' + err.message);
      }
    };
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());
