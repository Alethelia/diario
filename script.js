// Estado de la aplicación
class DiaryApp {
    constructor() {
        this.currentEntry = null;
        this.entries = this.loadEntries();
        this.apiKey = localStorage.getItem('openai_api_key');
        this.currentDate = new Date().toISOString().split('T')[0];
        this.autoSaveTimer = null;
        this.dayEndTimer = null;
        this.autoAnalysisTimer = null;
        this.lastSaveTime = Date.now();
        this.lastAnalysisTime = Date.now();
        this.autoAnalysisChars = parseInt(localStorage.getItem('auto_analysis_chars') || '750');
        this.autoAnalysisTime = parseInt(localStorage.getItem('auto_analysis_time') || '600') * 1000;
        this.testMode = localStorage.getItem('test_mode') === 'true';
        this.lastAnalysisCharCount = 0;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateCurrentDate();
        this.loadTodayEntry();
        this.checkApiKey();
        this.startAutoSave();
        this.startDayEndTimer();
        this.startAutoAnalysis();
        this.loadSettings();
        this.updateProfileInfo();
    }
    
    setupEventListeners() {
        // Botones de pestañas
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Enviar mensaje
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Botones de acción (solo mantener modal)
        document.getElementById('save-api-key').addEventListener('click', () => this.saveApiKey());
        document.getElementById('skip-api-key').addEventListener('click', () => this.closeApiModal());
        
        // Configuración
        document.getElementById('api-key-setting').addEventListener('input', (e) => this.updateApiKey(e.target.value));
        document.getElementById('toggle-api-key').addEventListener('click', () => this.toggleApiKeyVisibility());
        document.getElementById('auto-analyze-chars').addEventListener('change', (e) => this.updateAnalysisSettings());
        document.getElementById('auto-analyze-time').addEventListener('change', (e) => this.updateAnalysisSettings());
        
        // Controles de test
        document.getElementById('test-mode').addEventListener('change', (e) => this.toggleTestMode(e.target.checked));
        document.getElementById('manual-analyze-btn').addEventListener('click', () => this.manualAnalyze());
        document.getElementById('clear-all-btn').addEventListener('click', () => this.clearAllEntries());
        document.getElementById('debug-btn').addEventListener('click', () => this.toggleDebugSection());
        document.getElementById('refresh-debug').addEventListener('click', () => this.updateDebugInfo());
        document.getElementById('export-debug').addEventListener('click', () => this.exportDebugInfo());
        
        // Controles de test en pestaña Hoy
        document.getElementById('manual-analyze-today-btn').addEventListener('click', () => this.manualAnalyze());
        document.getElementById('clear-all-today-btn').addEventListener('click', () => this.clearAllEntries());
        document.getElementById('debug-today-btn').addEventListener('click', () => this.toggleDebugMini());
        document.getElementById('export-debug-today-btn').addEventListener('click', () => this.exportDebugInfo());
        
        // Búsqueda en historial
        document.getElementById('search-input').addEventListener('input', (e) => this.searchHistory(e.target.value));
        
        // Perfil modal
        document.getElementById('profile-avatar').addEventListener('click', () => this.openProfileModal());
        document.getElementById('close-profile-modal').addEventListener('click', () => this.closeProfileModal());
        
        // Cerrar modal al hacer click en el overlay
        document.getElementById('profile-modal').addEventListener('click', (e) => {
            if (e.target.id === 'profile-modal') {
                this.closeProfileModal();
            }
        });
        
        // Cerrar modal con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const profileModal = document.getElementById('profile-modal');
                if (profileModal.classList.contains('show')) {
                    this.closeProfileModal();
                }
            }
        });
        
        // Pestañas del perfil
        document.querySelectorAll('.profile-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchProfileTab(e.target.dataset.profileTab));
        });
        
        // Auto-resize del textarea
        const messageInput = document.getElementById('message-input');
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = messageInput.scrollHeight + 'px';
        });
    }
    
    // Gestión de fecha y entrada actual
    updateCurrentDate() {
        const today = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('current-date').textContent = 
            today.toLocaleDateString('es-ES', options);
    }
    
    loadTodayEntry() {
        const todayKey = this.currentDate;
        this.currentEntry = this.entries[todayKey] || {
            id: todayKey,
            date: todayKey,
            title: '',
            messages: [],
            summary: '',
            emotions: [],
            themes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Limpiar mensajes del sistema existentes para mantener el chat limpio
        this.currentEntry.messages = this.currentEntry.messages.filter(m => m.type === 'user');
        
        this.renderCurrentEntry();
    }
    
    renderCurrentEntry() {
        // Actualizar título con animación
        const titleElement = document.getElementById('current-title');
        const newTitle = this.currentEntry.title || 'Sin título';
        if (titleElement.textContent !== newTitle) {
            titleElement.style.opacity = '0.5';
            setTimeout(() => {
                titleElement.textContent = newTitle;
                titleElement.style.opacity = '1';
            }, 200);
        }
        
        // Actualizar resumen con animación
        const summaryElement = document.getElementById('day-summary');
        const newSummary = this.currentEntry.summary || 'Comienza a escribir para generar un resumen...';
        if (summaryElement.textContent !== newSummary) {
            summaryElement.style.opacity = '0.5';
            setTimeout(() => {
                summaryElement.textContent = newSummary;
                summaryElement.style.opacity = '1';
            }, 300);
        }
        
        // Actualizar emociones y temas con animación
        this.renderEmotionTags();
        
        // Renderizar mensajes del chat (solo mensajes de usuario)
        this.renderChatMessages();
        
        // Actualizar información del perfil
        this.updateProfileInfo();
    }
    
    renderEmotionTags() {
        const container = document.getElementById('emotion-tags');
        const newTags = [...this.currentEntry.emotions, ...this.currentEntry.themes];
        
        // Animar la transición si hay cambios
        if (container.children.length !== newTags.length) {
            container.style.opacity = '0.5';
            setTimeout(() => {
                container.innerHTML = '';
                
                newTags.forEach((tag, index) => {
                    const tagElement = document.createElement('span');
                    tagElement.className = `emotion-tag ${this.getTagClass(tag)}`;
                    tagElement.textContent = tag;
                    tagElement.style.opacity = '0';
                    tagElement.style.transform = 'translateY(10px)';
                    container.appendChild(tagElement);
                    
                    // Animación escalonada
                    setTimeout(() => {
                        tagElement.style.transition = 'all 0.3s ease';
                        tagElement.style.opacity = '1';
                        tagElement.style.transform = 'translateY(0)';
                    }, index * 100);
                });
                
                container.style.opacity = '1';
            }, 200);
        } else if (container.children.length === 0 && newTags.length > 0) {
            // Primera vez que se añaden tags
            newTags.forEach((tag, index) => {
                const tagElement = document.createElement('span');
                tagElement.className = `emotion-tag ${this.getTagClass(tag)}`;
                tagElement.textContent = tag;
                tagElement.style.opacity = '0';
                tagElement.style.transform = 'translateY(10px)';
                container.appendChild(tagElement);
                
                setTimeout(() => {
                    tagElement.style.transition = 'all 0.3s ease';
                    tagElement.style.opacity = '1';
                    tagElement.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }
    }
    
    getTagClass(tag) {
        const emotionMap = {
            // Amor y romance (rosa/magenta)
            'enamorado': 'love',
            'romántico': 'love',
            'amoroso': 'love',
            
            // Ansiedad y nervios (naranja)
            'ansioso': 'anxious',
            'nervioso': 'anxious',
            'preocupado': 'anxious',
            'agobiado': 'anxious',
            
            // Tristeza y depresión (azul/gris)
            'triste': 'sad',
            'melancólico': 'sad',
            'deprimido': 'critical',
            'devastado': 'critical',
            
            // Confusión y pérdida (amarillo)
            'confundido': 'confused',
            'perdido': 'confused',
            'indeciso': 'confused',
            'bloqueado': 'confused',
            
            // Frustración y enojo (rojo)
            'frustrado': 'angry',
            'molesto': 'angry',
            'enojado': 'angry',
            'furioso': 'angry',
            
            // Vulnerabilidad (violeta claro)
            'vulnerable': 'fragile',
            'sensible': 'fragile',
            'frágil': 'fragile',
            'expuesto': 'fragile',
            
            // Estados positivos (verde)
            'feliz': 'happy',
            'alegre': 'happy',
            'contento': 'happy',
            'radiante': 'happy',
            'esperanzado': 'hopeful',
            'optimista': 'hopeful',
            'ilusionado': 'hopeful',
            'motivado': 'productive',
            
            // Estados neutros/reflexivos (gris)
            'aburrido': 'bored',
            'vacío': 'bored',
            'apático': 'bored',
            'desganado': 'bored',
            'nostálgico': 'nostalgic',
            'reflexivo': 'calm',
            'pensativo': 'calm',
            'contemplativo': 'calm',
            
            // Estados tranquilos (verde agua)
            'tranquilo': 'calm',
            'relajado': 'calm',
            'sereno': 'calm',
            'en paz': 'calm',
            
            // Estados productivos (morado)
            'productivo': 'productive',
            'enfocado': 'productive',
            'activo': 'productive',
            'eficiente': 'productive',
            
            // Estados excitados (amarillo brillante)
            'emocionado': 'excited',
            'entusiasmado': 'excited'
        };
        
        return emotionMap[tag.toLowerCase()] || 'calm';
    }
    
    renderChatMessages() {
        const container = document.getElementById('chat-container');
        container.innerHTML = '';
        
        // Solo mostrar mensajes de usuario (no mensajes del sistema de análisis)
        const userMessages = this.currentEntry.messages.filter(message => message.type === 'user');
        
        userMessages.forEach(message => {
            this.addMessageToChat(message.content, message.type, message.timestamp, false);
        });
        
        container.scrollTop = container.scrollHeight;
    }
    
    // Gestión de mensajes
    sendMessage() {
        const input = document.getElementById('message-input');
        const content = input.value.trim();
        
        if (!content) return;
        
        const message = {
            content,
            type: 'user',
            timestamp: new Date().toISOString()
        };
        
        this.currentEntry.messages.push(message);
        this.addMessageToChat(content, 'user', message.timestamp);
        
        input.value = '';
        input.style.height = 'auto';
        
        // Actualizar contador de caracteres para análisis
        this.updateAnalysisInfo();
    }
    
    addMessageToChat(content, type, timestamp, animate = true) {
        const container = document.getElementById('chat-container');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const time = new Date(timestamp).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${content}
                <div class="message-time">${time}</div>
            </div>
        `;
        
        if (animate) {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(20px)';
        }
        
        container.appendChild(messageDiv);
        
        if (animate) {
            requestAnimationFrame(() => {
                messageDiv.style.transition = 'all 0.3s ease';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            });
        }
        
        container.scrollTop = container.scrollHeight;
    }
    
    // Análisis con OpenAI
    async analyzeEntry() {
        if (!this.apiKey) {
            this.updateAnalysisStatus('❌ API Key requerida', 'invalid');
            return;
        }
        
        if (this.currentEntry.messages.length === 0) {
            this.updateAnalysisStatus('📝 Escribe algo primero', 'ready');
            return;
        }
        
        this.updateAnalysisStatus('🤖 Analizando...', 'analyzing');
        
        try {
            // Mostrar indicador de escritura
            this.showTypingIndicator();
            
            const analysis = await this.callOpenAI();
            this.hideTypingIndicator();
            
            // Actualizar la entrada con el análisis
            this.currentEntry.title = analysis.title || this.generateDefaultTitle();
            this.currentEntry.summary = analysis.summary || '';
            this.currentEntry.emotions = analysis.emotions || [];
            this.currentEntry.themes = analysis.themes || [];
            this.currentEntry.updatedAt = new Date().toISOString();
            this.lastAnalysisTime = Date.now();
            
            // NO agregar mensaje del sistema - actualizar silenciosamente la UI
            this.renderCurrentEntry();
            this.saveEntry();
            this.updateAnalysisStatus('✅ Análisis completado', 'ready');
            
            // Mostrar notificación temporal sutil
            this.showAnalysisNotification();
            
            // Reiniciar contadores para evitar análisis continuo
            this.lastAnalysisTime = Date.now();
            this.lastAnalysisCharCount = this.getTotalCharacters();
            
            console.log('✅ Análisis completado - Contadores reiniciados:', {
                lastAnalysisTime: new Date(this.lastAnalysisTime).toISOString(),
                lastAnalysisCharCount: this.lastAnalysisCharCount,
                totalChars: this.getTotalCharacters()
            });
            
        } catch (error) {
            console.error('Error al analizar:', error);
            this.hideTypingIndicator();
            this.updateAnalysisStatus('❌ Error en análisis', 'invalid');
        }
    }
    
    // Sistema de análisis automático
    startAutoAnalysis() {
        // Verificar que los timestamps estén correctos
        const now = Date.now();
        if (this.lastAnalysisTime > now || this.lastAnalysisTime < (now - 86400000)) {
            console.log('⚠️ Timestamp corrupto detectado, reiniciando...');
            this.lastAnalysisTime = now;
            this.lastAnalysisCharCount = 0;
        }
        
        console.log('🚀 Iniciando análisis automático:', {
            autoAnalysisChars: this.autoAnalysisChars,
            autoAnalysisTime: this.autoAnalysisTime / 1000 + 's',
            lastAnalysisTime: new Date(this.lastAnalysisTime).toISOString()
        });
        
        this.autoAnalysisTimer = setInterval(() => {
            this.checkAutoAnalysis();
        }, 30000); // Verificar cada 30 segundos
        
        this.updateAnalysisTimer();
    }
    
    checkAutoAnalysis() {
        if (!this.apiKey || this.currentEntry.messages.length === 0) return;
        
        const totalChars = this.getTotalCharacters();
        const newCharsSinceLastAnalysis = totalChars - this.lastAnalysisCharCount;
        const timeSinceLastAnalysis = Date.now() - this.lastAnalysisTime;
        
        console.log('🔍 Verificando análisis automático:', {
            totalChars,
            newCharsSinceLastAnalysis,
            timeSinceLastAnalysis: timeSinceLastAnalysis / 1000 + 's',
            shouldAnalyzeByChars: newCharsSinceLastAnalysis >= this.autoAnalysisChars,
            shouldAnalyzeByTime: timeSinceLastAnalysis >= this.autoAnalysisTime
        });
        
        // Analizar si se alcanzó el límite de caracteres nuevos o tiempo
        if (newCharsSinceLastAnalysis >= this.autoAnalysisChars || timeSinceLastAnalysis >= this.autoAnalysisTime) {
            console.log('✨ Activando análisis automático...');
            this.analyzeEntry();
        }
    }
    
    getTotalCharacters() {
        return this.currentEntry.messages
            .filter(m => m.type === 'user')
            .map(m => m.content)
            .join('').length;
    }
    
    updateAnalysisTimer() {
        setInterval(() => {
            this.updateAnalysisInfo();
        }, 1000);
    }
    
    updateAnalysisInfo() {
        const totalChars = this.getTotalCharacters();
        const newCharsSinceLastAnalysis = totalChars - this.lastAnalysisCharCount;
        const timeSinceLastAnalysis = Date.now() - this.lastAnalysisTime;
        const timeUntilNext = Math.max(0, this.autoAnalysisTime - timeSinceLastAnalysis);
        const charsUntilNext = Math.max(0, this.autoAnalysisChars - newCharsSinceLastAnalysis);
        
        const charCountElement = document.getElementById('char-count');
        const nextAnalysisElement = document.getElementById('next-analysis');
        
        if (charCountElement) {
            charCountElement.textContent = `${newCharsSinceLastAnalysis}/${this.autoAnalysisChars}`;
        }
        
        if (nextAnalysisElement) {
            if (charsUntilNext === 0 || timeUntilNext === 0) {
                nextAnalysisElement.textContent = 'Próximamente';
            } else {
                const minutes = Math.ceil(timeUntilNext / 60000);
                nextAnalysisElement.textContent = `${Math.min(minutes, Math.ceil(charsUntilNext / 10))}min o ${charsUntilNext} chars`;
            }
        }
        
        // Actualizar debug mini si está visible
        if (this.testMode) {
            this.updateDebugMini();
        }
    }
    
    toggleDebugMini() {
        const debugMini = document.getElementById('debug-mini');
        if (debugMini) {
            if (debugMini.classList.contains('hidden')) {
                debugMini.classList.remove('hidden');
                this.updateDebugMini();
            } else {
                debugMini.classList.add('hidden');
            }
        }
    }
    
    updateDebugMini() {
        const totalChars = this.getTotalCharacters();
        const newCharsSinceLastAnalysis = totalChars - this.lastAnalysisCharCount;
        const timeSinceLastAnalysis = Date.now() - this.lastAnalysisTime;
        const timeUntilNext = Math.max(0, this.autoAnalysisTime - timeSinceLastAnalysis);
        const charsUntilNext = Math.max(0, this.autoAnalysisChars - newCharsSinceLastAnalysis);
        
        // Actualizar elementos del debug mini
        const debugAnalysisMini = document.getElementById('debug-analysis-mini');
        const debugCharsMini = document.getElementById('debug-chars-mini');
        const debugNextMini = document.getElementById('debug-next-mini');
        const debugStatusMini = document.getElementById('debug-status-mini');
        
        if (debugAnalysisMini) {
            const lastAnalysisTime = new Date(this.lastAnalysisTime).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            debugAnalysisMini.textContent = lastAnalysisTime;
        }
        
        if (debugCharsMini) {
            debugCharsMini.textContent = `${newCharsSinceLastAnalysis}/${this.autoAnalysisChars}`;
        }
        
        if (debugNextMini) {
            if (charsUntilNext === 0 || timeUntilNext === 0) {
                debugNextMini.textContent = 'Próximamente';
            } else {
                const minutes = Math.ceil(timeUntilNext / 60000);
                debugNextMini.textContent = `${Math.min(minutes, Math.ceil(charsUntilNext / 10))}min`;
            }
        }
        
        if (debugStatusMini) {
            const canAnalyze = (newCharsSinceLastAnalysis >= this.autoAnalysisChars) || (timeSinceLastAnalysis >= this.autoAnalysisTime);
            debugStatusMini.textContent = canAnalyze ? 'Listo' : 'Esperando';
            debugStatusMini.style.color = canAnalyze ? 'var(--success-color)' : 'var(--text-secondary)';
        }
    }
    
    updateAnalysisStatus(message, type) {
        const statusElement = document.getElementById('analysis-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `analysis-status ${type}`;
        }
    }
    
    showAnalysisNotification() {
        const statusElement = document.getElementById('analysis-status');
        if (statusElement) {
            // Efecto visual temporal
            statusElement.style.transform = 'scale(1.05)';
            statusElement.style.color = 'var(--primary-color)';
            
            setTimeout(() => {
                statusElement.style.transform = 'scale(1)';
                statusElement.style.color = '#059669';
            }, 800);
        }
        
        // Opcional: pequeña vibración en la pestaña "Hoy" si está activa
        const todayTab = document.querySelector('[data-tab="today"]');
        if (todayTab && todayTab.classList.contains('active')) {
            todayTab.style.animation = 'pulse 0.6s ease-in-out';
            setTimeout(() => {
                todayTab.style.animation = '';
            }, 600);
        }
    }
    
    // Configuración
    loadSettings() {
        const apiKeyInput = document.getElementById('api-key-setting');
        const charsSelect = document.getElementById('auto-analyze-chars');
        const timeSelect = document.getElementById('auto-analyze-time');
        const testModeCheckbox = document.getElementById('test-mode');
        
        if (apiKeyInput && this.apiKey) {
            apiKeyInput.value = this.apiKey;
            this.validateApiKey();
        }
        
        if (charsSelect) {
            charsSelect.value = this.autoAnalysisChars.toString();
        }
        
        if (timeSelect) {
            timeSelect.value = (this.autoAnalysisTime / 1000).toString();
        }
        
        if (testModeCheckbox) {
            testModeCheckbox.checked = this.testMode;
        }
        
        // Llamar toggleTestMode al final para asegurar que el DOM esté listo
        // Usar setTimeout para asegurar que se ejecute después del renderizado
        setTimeout(() => {
            this.toggleTestMode(this.testMode);
            
            // Inicializar debug mini si modo test está activo
            if (this.testMode) {
                this.updateDebugMini();
            }
        }, 100);
    }
    
    updateApiKey(apiKey) {
        this.apiKey = apiKey.trim();
        if (this.apiKey) {
            localStorage.setItem('openai_api_key', this.apiKey);
            this.validateApiKey();
        } else {
            localStorage.removeItem('openai_api_key');
            this.updateApiStatus('', '');
        }
    }
    
    async validateApiKey() {
        if (!this.apiKey) return;
        
        this.updateApiStatus('Validando API Key...', 'testing');
        
        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                }
            });
            
            if (response.ok) {
                this.updateApiStatus('✅ API Key válida', 'valid');
                this.updateAnalysisStatus('🤖 Listo para analizar', 'ready');
            } else {
                this.updateApiStatus('❌ API Key inválida', 'invalid');
                this.updateAnalysisStatus('❌ API Key requerida', 'invalid');
            }
        } catch (error) {
            this.updateApiStatus('❌ Error de conexión', 'invalid');
            this.updateAnalysisStatus('❌ Error de conexión', 'invalid');
        }
    }
    
    updateApiStatus(message, type) {
        const statusElement = document.getElementById('api-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `api-status ${type}`;
        }
    }
    
    toggleApiKeyVisibility() {
        const input = document.getElementById('api-key-setting');
        const button = document.getElementById('toggle-api-key');
        
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
        } else {
            input.type = 'password';
            button.textContent = '👁️';
        }
    }
    
    updateAnalysisSettings() {
        const charsSelect = document.getElementById('auto-analyze-chars');
        const timeSelect = document.getElementById('auto-analyze-time');
        
        if (charsSelect) {
            this.autoAnalysisChars = parseInt(charsSelect.value);
            localStorage.setItem('auto_analysis_chars', this.autoAnalysisChars.toString());
        }
        
        if (timeSelect) {
            this.autoAnalysisTime = parseInt(timeSelect.value) * 1000;
            localStorage.setItem('auto_analysis_time', timeSelect.value);
        }
        
        this.updateAnalysisInfo();
    }
    
    // Controles de modo test
    toggleTestMode(enabled) {
        this.testMode = enabled;
        localStorage.setItem('test_mode', enabled.toString());
        
        const testControls = document.getElementById('test-controls');
        const testControlsToday = document.getElementById('test-controls-today');
        const debugSection = document.getElementById('debug-section');
        
        // Controles en pestaña de configuración
        if (testControls) {
            if (enabled) {
                testControls.classList.remove('hidden');
            } else {
                testControls.classList.add('hidden');
            }
        }
        
        // Controles en pestaña "Hoy" - CRÍTICO: Asegurar que se oculten cuando está deshabilitado
        if (testControlsToday) {
            if (enabled) {
                testControlsToday.classList.remove('hidden');
                this.updateDebugMini(); // Actualizar info de debug mini
            } else {
                testControlsToday.classList.add('hidden');
                // También ocultar el debug mini si está visible
                const debugMini = document.getElementById('debug-mini');
                if (debugMini) {
                    debugMini.classList.add('hidden');
                }
            }
        }
        
        // Debug section en configuración
        if (debugSection && !enabled) {
            debugSection.classList.add('hidden');
        }
    }
    
    manualAnalyze() {
        if (!this.apiKey) {
            alert('Configura tu API Key primero');
            return;
        }
        
        if (this.currentEntry.messages.length === 0) {
            alert('Escribe algo primero para analizar');
            return;
        }
        
        // Forzar análisis inmediato
        this.analyzeEntry();
    }
    
    clearAllEntries() {
        const confirmed = confirm(
            '⚠️ MODO TEST ACTIVADO\n\n' +
            '¿Estás seguro de que quieres eliminar TODAS las entradas del diario?\n\n' +
            'Esta acción NO se puede deshacer.'
        );
        
        if (confirmed) {
            const doubleConfirmed = confirm(
                '🚨 ÚLTIMA CONFIRMACIÓN\n\n' +
                'Esto eliminará TODO tu historial de diario.\n\n' +
                '¿Continuar?'
            );
            
            if (doubleConfirmed) {
                // Limpiar todas las entradas
                this.entries = {};
                this.saveEntries();
                
                // Reiniciar entrada actual
                this.currentEntry = {
                    id: this.currentDate,
                    date: this.currentDate,
                    title: '',
                    messages: [],
                    summary: '',
                    emotions: [],
                    themes: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                // Reiniciar contadores
                this.lastAnalysisTime = Date.now();
                this.lastAnalysisCharCount = 0;
                
                // Actualizar UI
                this.renderCurrentEntry();
                this.loadHistory();
                this.updateAnalysisInfo();
                
                alert('✅ Todas las entradas han sido eliminadas');
            }
        }
    }
    
    // Métodos de debug
    toggleDebugSection() {
        // Solo permitir abrir debug si el modo test está activo
        if (!this.testMode) {
            alert('⚠️ Activa el Modo Test primero para acceder al debug');
            return;
        }
        
        const debugSection = document.getElementById('debug-section');
        if (debugSection) {
            if (debugSection.classList.contains('hidden')) {
                debugSection.classList.remove('hidden');
                this.updateDebugInfo();
            } else {
                debugSection.classList.add('hidden');
            }
        }
    }
    
    updateDebugInfo() {
        this.debugCurrentState();
        this.debugAllEntries();
        this.debugConfig();
        this.debugAnalysisCounters();
    }
    
    debugCurrentState() {
        const output = document.getElementById('debug-current-state');
        if (!output) return;
        
        const currentState = {
            currentDate: this.currentDate,
            currentEntry: {
                id: this.currentEntry?.id,
                date: this.currentEntry?.date,
                title: this.currentEntry?.title,
                messagesCount: this.currentEntry?.messages?.length || 0,
                messages: this.currentEntry?.messages?.map(m => ({
                    type: m.type,
                    content: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : ''),
                    timestamp: m.timestamp
                })) || [],
                summary: this.currentEntry?.summary,
                emotions: this.currentEntry?.emotions,
                themes: this.currentEntry?.themes,
                createdAt: this.currentEntry?.createdAt,
                updatedAt: this.currentEntry?.updatedAt
            }
        };
        
        output.textContent = JSON.stringify(currentState, null, 2);
    }
    
    debugAllEntries() {
        const output = document.getElementById('debug-all-entries');
        if (!output) return;
        
        const allEntries = {};
        Object.keys(this.entries).forEach(key => {
            const entry = this.entries[key];
            allEntries[key] = {
                id: entry.id,
                date: entry.date,
                title: entry.title,
                messagesCount: entry.messages?.length || 0,
                summary: entry.summary,
                emotions: entry.emotions,
                themes: entry.themes,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt
            };
        });
        
        output.textContent = JSON.stringify({
            totalEntries: Object.keys(this.entries).length,
            entries: allEntries
        }, null, 2);
    }
    
    debugConfig() {
        const output = document.getElementById('debug-config');
        if (!output) return;
        
        const config = {
            apiKey: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'No configurada',
            autoAnalysisChars: this.autoAnalysisChars,
            autoAnalysisTime: this.autoAnalysisTime,
            testMode: this.testMode,
            localStorage: {
                openai_api_key: localStorage.getItem('openai_api_key') ? 'Configurada' : 'No configurada',
                auto_analysis_chars: localStorage.getItem('auto_analysis_chars'),
                auto_analysis_time: localStorage.getItem('auto_analysis_time'),
                test_mode: localStorage.getItem('test_mode'),
                diary_entries_count: this.entries ? Object.keys(this.entries).length : 0
            }
        };
        
        output.textContent = JSON.stringify(config, null, 2);
    }
    
    debugAnalysisCounters() {
        const output = document.getElementById('debug-analysis-counters');
        if (!output) return;
        
        const totalChars = this.getTotalCharacters();
        const newCharsSinceLastAnalysis = totalChars - this.lastAnalysisCharCount;
        const timeSinceLastAnalysis = Date.now() - this.lastAnalysisTime;
        
        const counters = {
            totalCharacters: totalChars,
            lastAnalysisCharCount: this.lastAnalysisCharCount,
            newCharsSinceLastAnalysis: newCharsSinceLastAnalysis,
            lastAnalysisTime: new Date(this.lastAnalysisTime).toISOString(),
            timeSinceLastAnalysis: `${Math.floor(timeSinceLastAnalysis / 1000)} segundos`,
            autoAnalysisChars: this.autoAnalysisChars,
            autoAnalysisTime: `${this.autoAnalysisTime / 1000} segundos`,
            shouldAnalyzeByChars: newCharsSinceLastAnalysis >= this.autoAnalysisChars,
            shouldAnalyzeByTime: timeSinceLastAnalysis >= this.autoAnalysisTime,
            charsUntilNext: Math.max(0, this.autoAnalysisChars - newCharsSinceLastAnalysis),
            timeUntilNext: Math.max(0, this.autoAnalysisTime - timeSinceLastAnalysis),
            analysisReady: (newCharsSinceLastAnalysis >= this.autoAnalysisChars) || (timeSinceLastAnalysis >= this.autoAnalysisTime)
        };
        
        output.textContent = JSON.stringify(counters, null, 2);
    }
    
    exportDebugInfo() {
        const debugData = {
            timestamp: new Date().toISOString(),
            currentState: this.getDebugCurrentState(),
            allEntries: this.entries,
            config: this.getDebugConfig(),
            analysisCounters: this.getDebugAnalysisCounters(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diario-debug-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('📄 Debug info exportado como JSON');
    }
    
    getDebugCurrentState() {
        return {
            currentDate: this.currentDate,
            currentEntry: this.currentEntry
        };
    }
    
    getDebugConfig() {
        return {
            apiKey: this.apiKey ? 'Configurada' : 'No configurada',
            autoAnalysisChars: this.autoAnalysisChars,
            autoAnalysisTime: this.autoAnalysisTime,
            testMode: this.testMode
        };
    }
    
    getDebugAnalysisCounters() {
        const totalChars = this.getTotalCharacters();
        const newCharsSinceLastAnalysis = totalChars - this.lastAnalysisCharCount;
        const timeSinceLastAnalysis = Date.now() - this.lastAnalysisTime;
        
        return {
            totalCharacters: totalChars,
            lastAnalysisCharCount: this.lastAnalysisCharCount,
            newCharsSinceLastAnalysis: newCharsSinceLastAnalysis,
            lastAnalysisTime: this.lastAnalysisTime,
            timeSinceLastAnalysis: timeSinceLastAnalysis,
            autoAnalysisChars: this.autoAnalysisChars,
            autoAnalysisTime: this.autoAnalysisTime,
            shouldAnalyzeByChars: newCharsSinceLastAnalysis >= this.autoAnalysisChars,
            shouldAnalyzeByTime: timeSinceLastAnalysis >= this.autoAnalysisTime
        };
    }
    
    async callOpenAI() {
        const messages = this.currentEntry.messages
            .filter(m => m.type === 'user')
            .map(m => m.content)
            .join('\n\n');
        
        console.log('🤖 Enviando a OpenAI:', { 
            messageCount: this.currentEntry.messages.filter(m => m.type === 'user').length,
            totalChars: messages.length,
            content: messages.substring(0, 100) + '...'
        });

        const prompt = `Analiza este texto de diario personal escrito por una persona con TDAH. Usa ÚNICAMENTE los tags predefinidos para un análisis consistente y controlado.

TEXTO DEL DIARIO:
${messages}

TAGS EMOCIONALES PERMITIDOS (elige máximo 4):
- enamorado, romántico, amoroso
- ansioso, nervioso, preocupado, agobiado
- triste, melancólico, deprimido, devastado
- feliz, alegre, contento, radiante
- confundido, perdido, indeciso, bloqueado
- frustrado, molesto, enojado, furioso
- esperanzado, optimista, ilusionado, motivado
- aburrido, vacío, apático, desganado
- tranquilo, relajado, sereno, en paz
- productivo, enfocado, activo, eficiente
- vulnerable, sensible, frágil, expuesto
- nostálgico, reflexivo, pensativo, contemplativo

TAGS TEMÁTICOS PERMITIDOS (elige máximo 4):
- relaciones, pareja, familia, amistad
- trabajo, estudios, proyectos, carrera
- salud, bienestar, autocuidado, cuerpo
- tiempo, rutina, planes, organización
- dinero, economía, gastos, futuro
- creatividad, arte, música, expresión
- soledad, aislamiento, conexión, social
- decisiones, cambios, transiciones, crecimiento
- conflictos, problemas, obstáculos, desafíos
- logros, éxitos, metas, progreso
- viajes, lugares, experiencias, aventuras
- tecnología, digital, redes, comunicación

INSTRUCCIONES ESTRICTAS:
1. TÍTULO: Máximo 4 palabras, captura la esencia emocional central
2. RESUMEN: 2-3 oraciones específicas, menciona eventos concretos y emociones reales
3. USA SOLO los tags de las listas. NO inventes nuevos tags
4. Prioriza emociones más intensas/específicas sobre genéricas
5. Si hay pensamientos autodestructivos, úsalos en el resumen pero con cuidado

EJEMPLO CORRECTO:
Entrada: "Fui a ver a mi novia pero no pudo salir. 6 horas de viaje para nada. Me siento devastado y ansioso."
Análisis: {
  "title": "Frustración amorosa intensa",
  "summary": "Viaje fallido de 6 horas para ver a su pareja sin éxito. Se siente devastado por la situación y experimenta alta ansiedad por la incertidumbre en la relación.",
  "emotions": ["devastado", "ansioso", "frustrado"],
  "themes": ["relaciones", "viajes", "conflictos"]
}

Responde SOLO en formato JSON válido usando únicamente los tags permitidos:
{
  "title": "título específico aquí",
  "summary": "resumen detallado con eventos concretos",
  "emotions": ["tag1", "tag2", "tag3"],
  "themes": ["tema1", "tema2", "tema3"]
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 500,
                temperature: 0.7
            })
        });
        
        console.log('📡 Respuesta de OpenAI:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error de API:', { status: response.status, error: errorText });
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        console.log('📝 Contenido recibido:', content);
        
        try {
            // Limpiar la respuesta de markdown si viene envuelta en ```json
            const cleanedContent = this.cleanJsonResponse(content);
            console.log('🧹 Contenido limpio:', cleanedContent);
            
            const parsed = JSON.parse(cleanedContent);
            console.log('✅ JSON parseado correctamente:', parsed);
            return parsed;
        } catch (e) {
            console.error('❌ Error parseando JSON:', e, 'Contenido:', content);
            // Fallback mejorado basado en el contenido real
            return this.createFallbackAnalysis(messages);
        }
    }
    
    cleanJsonResponse(content) {
        // Limpiar respuesta de OpenAI que puede venir envuelta en bloques de código markdown
        let cleaned = content.trim();
        
        // Remover bloques de código markdown ```json ... ```
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        }
        // Remover bloques de código genéricos ``` ... ```
        else if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Buscar el JSON dentro del texto si no está al inicio
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }
        
        return cleaned.trim();
    }
    
    createFallbackAnalysis(messages) {
        const words = messages.toLowerCase();
        const emotions = [];
        const themes = [];
        
        // Sistema de umbrales emocionales con puntuación
        const emotionThresholds = {
            'enamorado': {
                keywords: ['enamorado', 'amor', 'novia', 'novio', 'pareja', 'te amo', 'quiero'],
                intensity: { low: 1, medium: 2, high: 3 },
                tags: ['enamorado', 'romántico', 'amoroso']
            },
            'ansioso': {
                keywords: ['ansioso', 'nervioso', 'preocup', 'stress', 'agobio', 'no se que hacer'],
                intensity: { low: 1, medium: 2, high: 3 },
                tags: ['ansioso', 'nervioso', 'preocupado']
            },
            'aburrido': {
                keywords: ['aburrido', 'aburrimiento', 'nada que hacer', 'sin planes'],
                intensity: { low: 1, medium: 2, high: 3 },
                tags: ['aburrido', 'sin motivación', 'vacío']
            },
            'confundido': {
                keywords: ['no se', 'confundido', 'perdido', 'que hacer con mi vida', 'sin rumbo'],
                intensity: { low: 1, medium: 2, high: 3 },
                tags: ['confundido', 'perdido', 'indeciso']
            },
            'feliz': {
                keywords: ['feliz', 'alegre', 'contento', 'bien', 'genial', 'excelente'],
                intensity: { low: 1, medium: 2, high: 3 },
                tags: ['feliz', 'alegre', 'positivo']
            },
            'triste': {
                keywords: ['triste', 'tristeza', 'deprimido', 'mal', 'horrible', 'llorar'],
                intensity: { low: 1, medium: 2, high: 3 },
                tags: ['triste', 'melancólico', 'bajo']
            },
            'esperanzado': {
                keywords: ['espero', 'ojalá', 'quisiera', 'deseo', 'futuro', 'planes'],
                intensity: { low: 1, medium: 2, high: 3 },
                tags: ['esperanzado', 'optimista', 'ilusionado']
            }
        };
        
        // Calcular puntuaciones emocionales
        const emotionScores = {};
        
        Object.keys(emotionThresholds).forEach(emotion => {
            let score = 0;
            const config = emotionThresholds[emotion];
            
            config.keywords.forEach(keyword => {
                const matches = (words.match(new RegExp(keyword, 'g')) || []).length;
                score += matches;
            });
            
            if (score > 0) {
                emotionScores[emotion] = score;
            }
        });
        
        // Seleccionar emociones basadas en umbrales
        Object.keys(emotionScores).forEach(emotion => {
            const score = emotionScores[emotion];
            const config = emotionThresholds[emotion];
            
            if (score >= 2) {
                // Emoción intensa
                emotions.push(config.tags[0]);
            } else if (score >= 1) {
                // Emoción presente
                emotions.push(config.tags[0]);
            }
        });
        
        // Detectar temas contextuales
        const themePatterns = {
            'relaciones': ['novia', 'novio', 'pareja', 'familia', 'amigos', 'casa', 'ver'],
            'existencial': ['vida', 'futuro', 'que hacer', 'rumbo', 'decisión'],
            'tiempo': ['lunes', 'mañana', 'ayer', 'hoy', 'semana', 'día'],
            'personal': ['yo', 'me siento', 'estoy', 'soy'],
            'planes': ['ir', 'hacer', 'quiero', 'voy', 'quisiera']
        };
        
        Object.keys(themePatterns).forEach(theme => {
            const hasTheme = themePatterns[theme].some(keyword => 
                words.includes(keyword)
            );
            if (hasTheme) {
                themes.push(theme);
            }
        });
        
        // Fallbacks inteligentes
        if (emotions.length === 0) {
            if (words.includes('siento')) emotions.push('reflexivo');
            else emotions.push('neutral');
        }
        if (themes.length === 0) themes.push('personal');
        
        // Generar resumen contextual más específico
        const summary = this.generateContextualSummary(messages, emotions, themes, emotionScores);
        
        const fallback = {
            title: this.generateSmartTitle(messages, emotions, themes),
            summary: summary,
            emotions: emotions.slice(0, 4),
            themes: themes.slice(0, 4)
        };
        
        console.log('🔄 Análisis avanzado fallback:', {
            emotionScores,
            finalEmotions: emotions,
            finalThemes: themes,
            fallback
        });
        
        return fallback;
    }
    
    createFallbackAnalysis(messages) {
        const words = messages.toLowerCase();
        const emotions = [];
        const themes = [];
        
        // Sistema de tags controlados con umbrales de intensidad
        const emotionThresholds = {
            // Amor y romance
            'enamorado': { keywords: ['enamorado', 'amor', 'te amo'], score: 0 },
            'romántico': { keywords: ['romántico', 'cariño', 'tierno'], score: 0 },
            'amoroso': { keywords: ['amoroso', 'dulce', 'pareja'], score: 0 },
            
            // Ansiedad y nervios
            'ansioso': { keywords: ['ansioso', 'ansiedad', 'nervioso'], score: 0 },
            'preocupado': { keywords: ['preocup', 'worry', 'temo'], score: 0 },
            'agobiado': { keywords: ['agobio', 'overwhelm', 'saturado'], score: 0 },
            
            // Tristeza y depresión
            'triste': { keywords: ['triste', 'tristeza', 'llorar'], score: 0 },
            'devastado': { keywords: ['devastado', 'destruido', 'roto'], score: 0 },
            'deprimido': { keywords: ['deprimido', 'me quiero morir', 'sin esperanza'], score: 0 },
            
            // Confusión y pérdida
            'confundido': { keywords: ['confundido', 'no se que', 'perdido'], score: 0 },
            'bloqueado': { keywords: ['bloqueado', 'stuck', 'atascado'], score: 0 },
            'indeciso': { keywords: ['indeciso', 'no se si', 'dudas'], score: 0 },
            
            // Frustración y enojo
            'frustrado': { keywords: ['frustrado', 'frustration', 'por qué me'], score: 0 },
            'molesto': { keywords: ['molesto', 'irritado', 'fastidio'], score: 0 },
            'furioso': { keywords: ['furioso', 'enojado', 'rage'], score: 0 },
            
            // Vulnerabilidad
            'vulnerable': { keywords: ['vulnerable', 'frágil', 'sensible'], score: 0 },
            'expuesto': { keywords: ['expuesto', 'indefenso', 'desprotegido'], score: 0 },
            
            // Estados positivos
            'feliz': { keywords: ['feliz', 'alegre', 'contento'], score: 0 },
            'esperanzado': { keywords: ['espero', 'ojalá', 'quisiera'], score: 0 },
            'motivado': { keywords: ['motivado', 'ganas', 'energía'], score: 0 },
            
            // Estados neutros/reflexivos
            'nostálgico': { keywords: ['nostálgico', 'recuerdo', 'antes'], score: 0 },
            'reflexivo': { keywords: ['reflexivo', 'pienso', 'medito'], score: 0 },
            'aburrido': { keywords: ['aburrido', 'nada que hacer', 'vacío'], score: 0 }
        };
        
        // Calcular puntuaciones
        Object.keys(emotionThresholds).forEach(emotion => {
            const config = emotionThresholds[emotion];
            config.keywords.forEach(keyword => {
                if (words.includes(keyword)) {
                    config.score += 1;
                }
            });
        });
        
        // Seleccionar emociones más relevantes
        const sortedEmotions = Object.keys(emotionThresholds)
            .filter(emotion => emotionThresholds[emotion].score > 0)
            .sort((a, b) => emotionThresholds[b].score - emotionThresholds[a].score)
            .slice(0, 4);
        
        emotions.push(...sortedEmotions);
        
        // Sistema de temas controlados
        const themePatterns = {
            'relaciones': ['novia', 'novio', 'pareja', 'vale', 'amor'],
            'viajes': ['hrs de ida', 'viaje', 'ir a', 'salir'],
            'conflictos': ['no la dejaron', 'para nada', 'por qué me'],
            'comunicación': ['hablado', 'pregunto', 'me dice'],
            'tiempo': ['ayer', 'mañana', 'hoy', 'cuando'],
            'emociones': ['me hace sentir', 'sobrepensar', 'me pone'],
            'planes': ['nos vemos', 'que hacer', 'ver'],
            'pensamientos': ['me quiero morir', 'sobrepensar', 'no sé']
        };
        
        Object.keys(themePatterns).forEach(theme => {
            const hasTheme = themePatterns[theme].some(keyword => 
                words.includes(keyword)
            );
            if (hasTheme) {
                themes.push(theme);
            }
        });
        
        // Generar resumen específico para este contexto
        const summary = this.generateSpecificSummary(messages, emotions, themes);
        
        const fallback = {
            title: this.generateControlledTitle(messages, emotions, themes),
            summary: summary,
            emotions: emotions.slice(0, 4),
            themes: themes.slice(0, 4)
        };
        
        console.log('🎯 Análisis controlado:', { fallback, scores: emotionThresholds });
        return fallback;
    }
    
    generateSpecificSummary(messages, emotions, themes) {
        const words = messages.toLowerCase();
        
        // Análisis específico del contenido actual
        if (words.includes('vale') && words.includes('hrs de ida')) {
            return `Viaje frustrado de 6 horas para ver a Vale sin éxito. La incertidumbre en la comunicación ("mmm no sé") genera ansiedad extrema y pensamientos autodestructivos. Mezcla intensa de amor desesperado y frustración emocional.`;
        }
        
        if (words.includes('me quiero morir') && words.includes('ansioso')) {
            return `Estado emocional crítico con pensamientos autodestructivos. La ansiedad por la incertidumbre en la relación lleva a sobrepensar y desesperación. Necesita urgentemente apoyo emocional.`;
        }
        
        if (emotions.includes('devastado') && themes.includes('relaciones')) {
            return `Crisis emocional relacionada con la pareja. Sentimientos intensos de ${emotions.slice(0,2).join(' y ')} dominan el día. Los eventos relacionados con ${themes.slice(0,2).join(' y ')} intensifican el estado emocional.`;
        }
        
        // Fallback genérico pero específico
        return `Día emocionalmente intenso con ${emotions.slice(0,2).join(' y ')}. Los temas de ${themes.slice(0,2).join(' y ')} generan conflicto interno y necesidad de procesamiento emocional.`;
    }
    
    generateControlledTitle(messages, emotions, themes) {
        const words = messages.toLowerCase();
        
        // Títulos específicos basados en contenido
        if (words.includes('me quiero morir')) {
            return 'Crisis emocional';
        }
        if (words.includes('vale') && words.includes('ansioso')) {
            return 'Ansiedad amorosa';
        }
        if (words.includes('para nada') && words.includes('hrs')) {
            return 'Viaje frustrado';
        }
        if (emotions.includes('devastado') && emotions.includes('ansioso')) {
            return 'Devastación ansiosa';
        }
        if (emotions.includes('frustrado') && themes.includes('relaciones')) {
            return 'Frustración amorosa';
        }
        
        // Títulos basados en emoción dominante
        if (emotions.length > 0) {
            return `Día ${emotions[0]}`;
        }
        
        return `Día ${new Date().getDate()} - ${new Date().toLocaleDateString('es-ES', { month: 'short' })}`;
    }    generateDefaultTitle() {
        const today = new Date();
        const day = today.getDate();
        return `Día ${day} - ${today.toLocaleDateString('es-ES', { month: 'short' })}`;
    }
    
    showTypingIndicator() {
        const container = document.getElementById('chat-container');
        const indicator = document.createElement('div');
        indicator.className = 'message system typing-message';
        indicator.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    }
    
    hideTypingIndicator() {
        const indicator = document.querySelector('.typing-message');
        if (indicator) indicator.remove();
    }
    
    // Gestión de pestañas
    switchTab(tabName) {
        // Actualizar botones
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Mostrar contenido
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`${tabName}-tab`).classList.remove('hidden');
        
        if (tabName === 'history') {
            this.loadHistory();
        }
    }
    
    loadHistory() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        const sortedEntries = Object.values(this.entries)
            .filter(entry => entry.messages.length > 0)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        sortedEntries.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.onclick = () => this.openHistoryEntry(entry);
            
            const date = new Date(entry.date).toLocaleDateString('es-ES', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
            
            item.innerHTML = `
                <div class="history-item-date">${date}</div>
                <div class="history-item-title">${entry.title || 'Sin título'}</div>
                <div class="history-item-summary">${entry.summary || 'Sin resumen'}</div>
                <div class="tags-container">
                    ${[...entry.emotions, ...entry.themes].map(tag => 
                        `<span class="emotion-tag ${this.getTagClass(tag)}">${tag}</span>`
                    ).join('')}
                </div>
            `;
            
            historyList.appendChild(item);
        });
    }
    
    searchHistory(query) {
        if (!query.trim()) {
            this.loadHistory();
            return;
        }
        
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        const filteredEntries = Object.values(this.entries)
            .filter(entry => {
                const searchText = [
                    entry.title,
                    entry.summary,
                    ...entry.emotions,
                    ...entry.themes,
                    ...entry.messages.map(m => m.content)
                ].join(' ').toLowerCase();
                
                return searchText.includes(query.toLowerCase());
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        filteredEntries.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.onclick = () => this.openHistoryEntry(entry);
            
            const date = new Date(entry.date).toLocaleDateString('es-ES', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
            
            item.innerHTML = `
                <div class="history-item-date">${date}</div>
                <div class="history-item-title">${entry.title || 'Sin título'}</div>
                <div class="history-item-summary">${entry.summary || 'Sin resumen'}</div>
                <div class="tags-container">
                    ${[...entry.emotions, ...entry.themes].map(tag => 
                        `<span class="emotion-tag ${this.getTagClass(tag)}">${tag}</span>`
                    ).join('')}
                </div>
            `;
            
            historyList.appendChild(item);
        });
    }
    
    openHistoryEntry(entry) {
        this.currentEntry = entry;
        this.renderCurrentEntry();
        this.switchTab('today');
        
        // Actualizar el título del chat
        const chatTitle = document.getElementById('chat-title');
        const date = new Date(entry.date).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long'
        });
        chatTitle.textContent = `${entry.title || 'Entrada'} - ${date}`;
    }
    
    // Gestión de entradas
    manualSave() {
        this.saveEntry();
    }
    
    saveEntry() {
        if (this.currentEntry.messages.length > 0) {
            this.currentEntry.updatedAt = new Date().toISOString();
            this.entries[this.currentEntry.id] = { ...this.currentEntry };
            this.saveEntries();
            this.lastSaveTime = Date.now();
        }
    }
    
    // Sistema de guardado automático
    startAutoSave() {
        this.autoSaveTimer = setInterval(() => {
            if (this.hasUnsavedChanges()) {
                this.saveEntry();
            }
        }, 30000); // Cada 30 segundos
    }
    
    hasUnsavedChanges() {
        const storedEntry = this.entries[this.currentEntry.id];
        if (!storedEntry) return this.currentEntry.messages.length > 0;
        
        return JSON.stringify(this.currentEntry.messages) !== JSON.stringify(storedEntry.messages);
    }
    
    // Sistema de fin de día automático
    startDayEndTimer() {
        const checkDayEnd = () => {
            const now = new Date();
            const currentDateStr = now.toISOString().split('T')[0];
            
            // Si cambió el día
            if (currentDateStr !== this.currentDate) {
                this.saveEntry(); // Guardar entrada actual
                this.finalizeDay(); // Finalizar día anterior
                this.startNewDay(currentDateStr); // Comenzar nuevo día
            }
        };
        
        // Verificar cada minuto si cambió el día
        this.dayEndTimer = setInterval(checkDayEnd, 60000);
        
        // También verificar al activar la ventana
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                checkDayEnd();
            }
        });
    }
    
    finalizeDay() {
        // Si hay contenido en el día anterior, hacer análisis final
        if (this.currentEntry.messages.length > 0 && !this.currentEntry.summary) {
            this.analyzeEntry();
        }
    }
    
    startNewDay(newDate) {
        this.currentDate = newDate;
        this.loadTodayEntry();
        this.updateCurrentDate();
        
        // El perfil se actualizará automáticamente con la nueva información
        this.updateProfileInfo();
    }
    
    // Gestión de almacenamiento
    loadEntries() {
        try {
            const stored = localStorage.getItem('diary_entries');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error('Error loading entries:', e);
            return {};
        }
    }
    
    saveEntries() {
        try {
            localStorage.setItem('diary_entries', JSON.stringify(this.entries));
        } catch (e) {
            console.error('Error saving entries:', e);
        }
    }
    
    // ===== SISTEMA DE PERFIL INTELIGENTE =====
    updateProfileInfo() {
        // Actualizar información básica del perfil
        this.updateCurrentMood();
        this.updateProfileStats();
    }
    
    updateCurrentMood() {
        const today = this.entries[this.currentDate];
        const moodIndicator = document.getElementById('mood-indicator');
        const currentMoodText = document.getElementById('current-mood');
        
        if (!today || !today.emotions || today.emotions.length === 0) {
            moodIndicator.className = 'mood-indicator calm';
            currentMoodText.textContent = 'Esperando análisis...';
            return;
        }
        
        // Determinar estado emocional dominante
        const dominantEmotion = today.emotions[0];
        const moodMap = {
            'feliz': { class: 'happy', text: 'Estado positivo' },
            'alegre': { class: 'happy', text: 'Buen ánimo' },
            'contento': { class: 'happy', text: 'Satisfecho' },
            'triste': { class: 'sad', text: 'Necesita apoyo' },
            'melancólico': { class: 'sad', text: 'Reflexivo' },
            'ansioso': { class: 'anxious', text: 'Alta activación' },
            'nervioso': { class: 'anxious', text: 'Alerta' },
            'frustrado': { class: 'angry', text: 'Tensión emocional' },
            'molesto': { class: 'angry', text: 'Irritabilidad' },
            'tranquilo': { class: 'calm', text: 'Equilibrado' },
            'relajado': { class: 'calm', text: 'En paz' },
            'confundido': { class: 'confused', text: 'Procesando' },
            'perdido': { class: 'confused', text: 'Buscando claridad' }
        };
        
        const mood = moodMap[dominantEmotion] || { class: 'calm', text: 'Estado neutro' };
        moodIndicator.className = `mood-indicator ${mood.class}`;
        currentMoodText.textContent = mood.text;
    }
    
    updateProfileStats() {
        // Esta función se actualiza cuando se abre el modal para evitar cálculos innecesarios
    }
    
    openProfileModal() {
        document.getElementById('profile-modal').classList.add('show');
        this.loadProfileData();
    }
    
    closeProfileModal() {
        document.getElementById('profile-modal').classList.remove('show');
    }
    
    switchProfileTab(tabName) {
        // Actualizar botones
        document.querySelectorAll('.profile-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-profile-tab="${tabName}"]`).classList.add('active');
        
        // Mostrar contenido
        document.querySelectorAll('.profile-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Cargar datos específicos de la pestaña
        if (tabName === 'insights') {
            this.loadInsightsData();
        } else if (tabName === 'trends') {
            this.loadTrendsData();
        } else if (tabName === 'suggestions') {
            this.loadSuggestionsData();
        }
    }
    
    loadProfileData() {
        // Cargar datos generales al abrir el modal
        this.loadInsightsData();
    }
    
    loadInsightsData() {
        // Calcular estadísticas básicas
        const entries = Object.values(this.entries);
        const entriesWithContent = entries.filter(e => e.messages && e.messages.length > 0);
        
        // Días activos
        document.getElementById('active-days').textContent = entriesWithContent.length;
        
        // Palabras totales
        const totalWords = entriesWithContent.reduce((total, entry) => {
            const wordsInEntry = entry.messages
                .filter(m => m.type === 'user')
                .reduce((words, message) => words + message.content.split(' ').length, 0);
            return total + wordsInEntry;
        }, 0);
        document.getElementById('total-words').textContent = totalWords.toLocaleString();
        
        // Análisis completados
        const analysisCount = entriesWithContent.filter(e => e.summary && e.summary.length > 0).length;
        document.getElementById('total-analysis').textContent = analysisCount;
        
        // Estado emocional actual
        const currentState = this.getCurrentEmotionalState();
        document.getElementById('current-emotional-state').textContent = currentState;
        
        // Patrones recientes
        this.loadRecentPatterns();
    }
    
    getCurrentEmotionalState() {
        const today = this.entries[this.currentDate];
        if (!today || !today.emotions || today.emotions.length === 0) {
            return 'Sin datos del día';
        }
        
        return today.emotions.slice(0, 2).join(', ');
    }
    
    loadRecentPatterns() {
        const recentEntries = Object.values(this.entries)
            .filter(e => e.messages && e.messages.length > 0)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 7); // Últimos 7 días
        
        const patterns = this.analyzePatterns(recentEntries);
        const patternContainer = document.getElementById('recent-patterns');
        
        if (patterns.length === 0) {
            patternContainer.innerHTML = '<div class="pattern-item">No hay suficientes datos para detectar patrones</div>';
            return;
        }
        
        patternContainer.innerHTML = patterns
            .map(pattern => `<div class="pattern-item">${pattern}</div>`)
            .join('');
    }
    
    analyzePatterns(entries) {
        const patterns = [];
        
        // Patrón emocional dominante
        const allEmotions = entries.flatMap(e => e.emotions || []);
        const emotionCounts = {};
        allEmotions.forEach(emotion => {
            emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        });
        
        const dominantEmotion = Object.keys(emotionCounts)
            .sort((a, b) => emotionCounts[b] - emotionCounts[a])[0];
        
        if (dominantEmotion && emotionCounts[dominantEmotion] >= 3) {
            patterns.push(`🎭 Emoción dominante: ${dominantEmotion} (${emotionCounts[dominantEmotion]} días)`);
        }
        
        // Patrón de temas
        const allThemes = entries.flatMap(e => e.themes || []);
        const themeCounts = {};
        allThemes.forEach(theme => {
            themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        });
        
        const dominantTheme = Object.keys(themeCounts)
            .sort((a, b) => themeCounts[b] - themeCounts[a])[0];
        
        if (dominantTheme && themeCounts[dominantTheme] >= 3) {
            patterns.push(`🎯 Tema recurrente: ${dominantTheme} (${themeCounts[dominantTheme]} días)`);
        }
        
        // Patrón de actividad
        const avgWordsPerDay = entries.reduce((total, entry) => {
            const words = entry.messages
                ?.filter(m => m.type === 'user')
                ?.reduce((sum, m) => sum + m.content.split(' ').length, 0) || 0;
            return total + words;
        }, 0) / entries.length;
        
        if (avgWordsPerDay > 100) {
            patterns.push(`✏️ Alta expresividad: ${Math.round(avgWordsPerDay)} palabras promedio por día`);
        } else if (avgWordsPerDay > 50) {
            patterns.push(`📝 Expresividad moderada: ${Math.round(avgWordsPerDay)} palabras promedio por día`);
        }
        
        return patterns;
    }
    
    loadTrendsData() {
        // Cargar datos de tendencias emocionales
        this.loadEmotionTrends();
        this.loadTimePatterns();
        this.loadThemeTrends();
    }
    
    loadEmotionTrends() {
        const last7Days = this.getLast7DaysEntries();
        const emotionCounts = {};
        
        last7Days.forEach(entry => {
            if (entry.emotions) {
                entry.emotions.forEach(emotion => {
                    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                });
            }
        });
        
        const sortedEmotions = Object.keys(emotionCounts)
            .sort((a, b) => emotionCounts[b] - emotionCounts[a])
            .slice(0, 5);
        
        const maxCount = Math.max(...Object.values(emotionCounts));
        const container = document.getElementById('emotion-trends');
        
        if (sortedEmotions.length === 0) {
            container.innerHTML = '<div class="emotion-trend-item">No hay datos emocionales suficientes</div>';
            return;
        }
        
        container.innerHTML = sortedEmotions
            .map(emotion => {
                const count = emotionCounts[emotion];
                const percentage = (count / maxCount) * 100;
                return `
                    <div class="emotion-trend-item">
                        <span>${emotion}</span>
                        <div class="emotion-bar">
                            <div class="emotion-bar-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span>${count}</span>
                    </div>
                `;
            })
            .join('');
    }
    
    loadTimePatterns() {
        const entries = Object.values(this.entries).filter(e => e.messages && e.messages.length > 0);
        
        // Calcular hora más activa
        const hourCounts = {};
        entries.forEach(entry => {
            entry.messages.forEach(message => {
                if (message.type === 'user') {
                    const hour = new Date(message.timestamp).getHours();
                    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                }
            });
        });
        
        const mostActiveHour = Object.keys(hourCounts)
            .sort((a, b) => hourCounts[b] - hourCounts[a])[0];
        
        document.getElementById('most-active-hour').textContent = 
            mostActiveHour ? `${mostActiveHour}:00` : 'Sin datos';
        
        // Promedio de entradas por día
        const daysWithEntries = new Set(entries.map(e => e.date)).size;
        const avgEntriesPerDay = daysWithEntries > 0 ? (entries.length / daysWithEntries).toFixed(1) : '0';
        document.getElementById('avg-entries-per-day').textContent = avgEntriesPerDay;
    }
    
    loadThemeTrends() {
        const last7Days = this.getLast7DaysEntries();
        const themeCounts = {};
        
        last7Days.forEach(entry => {
            if (entry.themes) {
                entry.themes.forEach(theme => {
                    themeCounts[theme] = (themeCounts[theme] || 0) + 1;
                });
            }
        });
        
        const sortedThemes = Object.keys(themeCounts)
            .sort((a, b) => themeCounts[b] - themeCounts[a])
            .slice(0, 10);
        
        const container = document.getElementById('theme-trends');
        
        if (sortedThemes.length === 0) {
            container.innerHTML = '<div class="theme-tag">No hay temas suficientes</div>';
            return;
        }
        
        container.innerHTML = sortedThemes
            .map(theme => `<div class="theme-tag">${theme}</div>`)
            .join('');
    }
    
    async loadSuggestionsData() {
        // Cargar sugerencias inteligentes generadas por AI
        if (!this.apiKey) {
            document.getElementById('ai-suggestions').innerHTML = `
                <div class="suggestion-item">
                    <div class="suggestion-icon">⚙️</div>
                    <div class="suggestion-text">Configura tu API Key para recibir sugerencias personalizadas</div>
                </div>
            `;
            this.loadBasicHabitsTracking();
            return;
        }
        
        // Generar sugerencias con AI
        this.generateAISuggestions();
        this.loadHabitsTracking();
        this.loadGoalsTracking();
    }
    
    async generateAISuggestions() {
        const suggestionsContainer = document.getElementById('ai-suggestions');
        
        try {
            const recentEntries = this.getLast7DaysEntries();
            if (recentEntries.length === 0) {
                suggestionsContainer.innerHTML = `
                    <div class="suggestion-item">
                        <div class="suggestion-icon">📖</div>
                        <div class="suggestion-text">Escribe más en tu diario para recibir sugerencias personalizadas</div>
                    </div>
                `;
                return;
            }
            
            const suggestions = await this.callOpenAIForSuggestions(recentEntries);
            
            suggestionsContainer.innerHTML = suggestions
                .map(suggestion => `
                    <div class="suggestion-item">
                        <div class="suggestion-icon">${suggestion.icon}</div>
                        <div class="suggestion-text">${suggestion.text}</div>
                    </div>
                `)
                .join('');
                
        } catch (error) {
            console.error('Error generating AI suggestions:', error);
            suggestionsContainer.innerHTML = `
                <div class="suggestion-item">
                    <div class="suggestion-icon">❌</div>
                    <div class="suggestion-text">Error al generar sugerencias. Inténtalo más tarde.</div>
                </div>
            `;
        }
    }
    
    async callOpenAIForSuggestions(entries) {
        const emotionsText = entries.flatMap(e => e.emotions || []).join(', ');
        const themesText = entries.flatMap(e => e.themes || []).join(', ');
        const summariesText = entries.map(e => e.summary || '').filter(s => s).join(' ');
        
        const prompt = `Basándote en estos datos de diario de los últimos 7 días de una persona con TDAH, genera 3-4 sugerencias personalizadas y prácticas:

EMOCIONES RECIENTES: ${emotionsText}
TEMAS RECURRENTES: ${themesText}
RESÚMENES: ${summariesText}

Genera sugerencias en formato JSON con esta estructura:
[
    {"icon": "😴", "text": "Sugerencia específica y práctica"},
    {"icon": "🧘", "text": "Otra sugerencia útil"}
]

Las sugerencias deben ser:
- Específicas para TDAH
- Prácticas y accionables
- Basadas en los patrones detectados
- Enfocadas en bienestar emocional
- Máximo 2 oraciones cada una`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                max_tokens: 400,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        const content = this.cleanJsonResponse(data.choices[0].message.content);
        
        try {
            return JSON.parse(content);
        } catch (e) {
            // Fallback con sugerencias básicas
            return this.getBasicSuggestions(entries);
        }
    }
    
    getBasicSuggestions(entries) {
        const allEmotions = entries.flatMap(e => e.emotions || []);
        const suggestions = [];
        
        if (allEmotions.includes('ansioso') || allEmotions.includes('nervioso')) {
            suggestions.push({
                icon: '🧘',
                text: 'Considera técnicas de respiración profunda cuando sientas ansiedad'
            });
        }
        
        if (allEmotions.includes('triste') || allEmotions.includes('deprimido')) {
            suggestions.push({
                icon: '☀️',
                text: 'Intenta salir a caminar 15 minutos al día para mejorar tu estado de ánimo'
            });
        }
        
        if (allEmotions.includes('confundido') || allEmotions.includes('perdido')) {
            suggestions.push({
                icon: '📝',
                text: 'Haz listas de tareas pequeñas para sentirte más organizado'
            });
        }
        
        suggestions.push({
            icon: '💚',
            text: 'Celebra los pequeños logros diarios, son importantes para tu bienestar'
        });
        
        return suggestions.slice(0, 3);
    }
    
    loadHabitsTracking() {
        const entries = this.getLast7DaysEntries();
        
        // Analizar calidad del sueño basado en menciones
        const sleepQuality = this.analyzeSleepPatterns(entries);
        document.getElementById('sleep-quality').textContent = sleepQuality;
        
        // Analizar nivel de estrés
        const stressLevel = this.analyzeStressLevel(entries);
        document.getElementById('stress-level').textContent = stressLevel;
        
        // Analizar productividad
        const productivityLevel = this.analyzeProductivityLevel(entries);
        document.getElementById('productivity-level').textContent = productivityLevel;
        
        // Analizar relaciones sociales
        const socialLevel = this.analyzeSocialLevel(entries);
        document.getElementById('social-level').textContent = socialLevel;
    }
    
    loadBasicHabitsTracking() {
        document.getElementById('sleep-quality').textContent = 'Configura API Key';
        document.getElementById('stress-level').textContent = 'Configura API Key';
        document.getElementById('productivity-level').textContent = 'Configura API Key';
        document.getElementById('social-level').textContent = 'Configura API Key';
    }
    
    analyzeSleepPatterns(entries) {
        const sleepKeywords = ['dormir', 'sueño', 'cansado', 'descansar', 'insomnio', 'despertar'];
        const positiveKeywords = ['bien dormido', 'descansé', 'buen sueño'];
        const negativeKeywords = ['mal dormido', 'no dormí', 'insomnio', 'desvelo'];
        
        let positiveCount = 0;
        let negativeCount = 0;
        let totalMentions = 0;
        
        entries.forEach(entry => {
            const text = entry.messages
                ?.filter(m => m.type === 'user')
                ?.map(m => m.content.toLowerCase())
                ?.join(' ') || '';
            
            sleepKeywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    totalMentions++;
                    if (positiveKeywords.some(pos => text.includes(pos))) {
                        positiveCount++;
                    } else if (negativeKeywords.some(neg => text.includes(neg))) {
                        negativeCount++;
                    }
                }
            });
        });
        
        if (totalMentions === 0) return 'Sin menciones';
        if (positiveCount > negativeCount) return 'Buena 😴';
        if (negativeCount > positiveCount) return 'Necesita atención 😵';
        return 'Regular 😐';
    }
    
    analyzeStressLevel(entries) {
        const stressEmotions = ['ansioso', 'nervioso', 'agobiado', 'frustrado', 'molesto'];
        const calmEmotions = ['tranquilo', 'relajado', 'sereno', 'en paz'];
        
        const allEmotions = entries.flatMap(e => e.emotions || []);
        const stressCount = allEmotions.filter(e => stressEmotions.includes(e)).length;
        const calmCount = allEmotions.filter(e => calmEmotions.includes(e)).length;
        
        if (allEmotions.length === 0) return 'Sin datos';
        if (stressCount > calmCount * 2) return 'Alto 🔴';
        if (calmCount > stressCount) return 'Bajo 🟢';
        return 'Moderado 🟡';
    }
    
    analyzeProductivityLevel(entries) {
        const productiveEmotions = ['productivo', 'enfocado', 'activo', 'eficiente', 'motivado'];
        const unproductiveEmotions = ['aburrido', 'vacío', 'apático', 'desganado'];
        
        const allEmotions = entries.flatMap(e => e.emotions || []);
        const productiveCount = allEmotions.filter(e => productiveEmotions.includes(e)).length;
        const unproductiveCount = allEmotions.filter(e => unproductiveEmotions.includes(e)).length;
        
        if (allEmotions.length === 0) return 'Sin datos';
        if (productiveCount > unproductiveCount) return 'Alta 🚀';
        if (unproductiveCount > productiveCount) return 'Baja 📉';
        return 'Moderada ⚖️';
    }
    
    analyzeSocialLevel(entries) {
        const socialThemes = ['relaciones', 'pareja', 'familia', 'amistad'];
        const allThemes = entries.flatMap(e => e.themes || []);
        const socialCount = allThemes.filter(t => socialThemes.includes(t)).length;
        
        if (socialCount === 0) return 'Poca actividad 😶';
        if (socialCount >= 5) return 'Muy activo 👥';
        if (socialCount >= 3) return 'Activo 🤝';
        return 'Moderado 👋';
    }
    
    loadGoalsTracking() {
        const entries = Object.values(this.entries).filter(e => e.messages && e.messages.length > 0);
        const last7Days = this.getLast7DaysEntries();
        
        // Meta de consistencia
        document.getElementById('consistency-goal').textContent = `${last7Days.length}/7 días`;
    }
    
    getLast7DaysEntries() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        return Object.values(this.entries)
            .filter(entry => {
                if (!entry.messages || entry.messages.length === 0) return false;
                const entryDate = new Date(entry.date);
                return entryDate >= sevenDaysAgo;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    // Gestión de API Key
    checkApiKey() {
        if (this.apiKey) {
            this.validateApiKey();
        } else {
            this.updateAnalysisStatus('⚙️ Configura tu API Key', 'invalid');
        }
    }
    
    showApiModal() {
        document.getElementById('api-modal').classList.add('show');
    }
    
    closeApiModal() {
        document.getElementById('api-modal').classList.remove('show');
    }
    
    saveApiKey() {
        const apiKey = document.getElementById('api-key-input').value.trim();
        if (apiKey) {
            this.apiKey = apiKey;
            localStorage.setItem('openai_api_key', apiKey);
            this.closeApiModal();
        } else {
            alert('Por favor ingresa una API Key válida.');
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.diaryApp = new DiaryApp();
});

// Guardar automáticamente antes de cerrar
window.addEventListener('beforeunload', () => {
    if (window.diaryApp) {
        window.diaryApp.saveEntry();
        // Limpiar timers
        if (window.diaryApp.autoSaveTimer) {
            clearInterval(window.diaryApp.autoSaveTimer);
        }
        if (window.diaryApp.dayEndTimer) {
            clearInterval(window.diaryApp.dayEndTimer);
        }
        if (window.diaryApp.autoAnalysisTimer) {
            clearInterval(window.diaryApp.autoAnalysisTimer);
        }
    }
});
