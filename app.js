(function () {
  'use strict';
  if (window.MoodleChatboxLoaded) return;
  window.MoodleChatboxLoaded = true;

  console.log('🚀 Moodle Chatbot - Initialisation...');

  // Ne pas afficher sur les pages de login
  const isLoginPath = /^\/login\/(index|forgot_password|change_password|signup)\.php$/i.test(location.pathname);
  if (isLoginPath) return;

  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM chargé, vérification de la page...');
    
    // Double sécurité : détection via balises/body
    const b = document.body;
    if (b && (b.classList.contains('pagelayout-login') || /^page-login-/.test(b.id))) {
      return; // on n'installe pas le chat sur le layout de login
    }

    // Configuration du proxy Django
    const PROXY_CONFIG = {
      baseUrl: 'https://lgc-ai.kiwinokoto.com/', // Même domaine par défaut
      endpoint: '/proxy/deepseek/',
      timeout: 30000
    };

    // Identity helpers
    function extractCourseIdFromUrl() {
      const m = location.search.match(/[?&]id=(\d+)/);
      return m ? m[1] : null;
    }

    function getUserFromHeaderLink() {
      const a = document.querySelector('a[href*="/user/profile.php?id="]');
      if (!a) return null;
      const m = a.href.match(/id=(\d+)/);
      return m ? m[1] : null;
    }

    function getFullnameFromMenu() {
      const el = document.querySelector('.usermenu .usertext, [data-region="user-menu"] .usertext');
      return el ? el.textContent.trim() : null;
    }

    function getMoodleIdentity() {
      const b = document.body || {};
      let userid = (b.dataset && (b.dataset.userid || b.dataset.userId)) || 
                   (b.getAttribute && (b.getAttribute('data-userid') || b.getAttribute('data-user-id'))) || null;
      let courseid = (b.dataset && (b.dataset.courseid || b.dataset.courseId)) || 
                     (b.getAttribute && (b.getAttribute('data-courseid') || b.getAttribute('data-course-id'))) || null;
      
      if (!userid) userid = getUserFromHeaderLink();
      if (!courseid) courseid = extractCourseIdFromUrl();
      
      const fullnameMenu = getFullnameFromMenu();
      let anonId = localStorage.getItem('lgc_anonid');
      if (!anonId) {
        anonId = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('lgc_anonid', anonId);
      }
      
      return { userid, courseid, fullnameMenu, anonId };
    }

    async function getFullnameFromProfile(userid) {
      if (!userid) return null;
      const key = 'lgc_fullname_' + userid;
      const cached = sessionStorage.getItem(key);
      if (cached) return cached;
      
      try {
        const res = await fetch(`/user/profile.php?id=${userid}`, { credentials: 'same-origin' });
        if (!res.ok) return null;
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const h1 = doc.querySelector('.page-header-headings h1, #page-header .page-title, header .page-title, h1');
        const name = h1 ? h1.textContent.trim() : null;
        if (name) sessionStorage.setItem(key, name);
        return name || null;
      } catch (e) {
        console.warn('Erreur lors de la récupération du profil:', e);
        return null;
      }
    }

    // Helpers pour les noms et salutations
    function smartNameCase(n) {
      return n
        .toLocaleLowerCase('fr-FR')
        .replace(/(^|[-''])([a-zà-ÿ])/g, (m, p1, p2) => p1 + p2.toLocaleUpperCase('fr-FR'));
    }

    function firstNameFrom(name) {
      if (!name) return null;
      let s = name.trim();
      if (!s) return null;
      if (s.includes(',')) s = s.split(',')[1].trim(); // forme "NOM, Prénom"
      const m = s.match(/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ''\-]*/);
      return m ? smartNameCase(m[0]) : null;
    }

    function applyGreeting(first) {
      const target = document.querySelector('#moodleMessagesContainer .moodle-message.bot .moodle-message-content');
      if (!target) return;
      const time = target.querySelector('.moodle-message-time')?.outerHTML || '';
      const hello = first
        ? `Bonjour ${first}, comment puis-je vous aider aujourd'hui ?`
        : `Bonjour, comment puis-je vous aider aujourd'hui ?`;
      target.innerHTML = `${hello}${time}`;
    }

    const ident = getMoodleIdentity();

    // Injection des styles CSS
    function injectStyles() {
      if (document.getElementById('moodle-chatbox-styles')) return;
      
      const s = document.createElement('style');
      s.id = 'moodle-chatbox-styles';
      s.textContent = `
        :root {
          --chatbox-primary-color: #667eea;
          --chatbox-primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --chatbox-secondary-color: #f8fafc;
          --chatbox-text-primary: #1a202c;
          --chatbox-text-secondary: #718096;
          --chatbox-border-color: #e2e8f0;
          --chatbox-shadow-soft: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -1px rgba(0,0,0,.06);
          --chatbox-shadow-strong: 0 20px 25px -5px rgba(0,0,0,.1), 0 10px 10px -5px rgba(0,0,0,.04);
          --chatbox-animation-speed: .3s;
        }

        .moodle-chat-bubble {
          position: fixed;
          top: 50%;
          right: 20px;
          width: 60px;
          height: 60px;
          background: var(--chatbox-primary-gradient);
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--chatbox-shadow-strong);
          transition: all var(--chatbox-animation-speed) ease;
          z-index: 99;
          animation: moodleChatboxBounceIn .6s ease-out;
          transform: translateY(-50%);
        }

        .moodle-chat-bubble:hover {
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 25px 30px -5px rgba(0,0,0,.15), 0 15px 15px -5px rgba(0,0,0,.08);
        }

        .moodle-chat-notification {
          position: fixed;
          top: 50%;
          right: 95px;
          background: #fff;
          padding: 12px 16px;
          border-radius: 20px;
          box-shadow: var(--chatbox-shadow-soft);
          font-size: .9rem;
          color: var(--chatbox-text-primary);
          font-weight: 500;
          opacity: 0;
          transform: translateY(-50%) translateX(10px) scale(.9);
          transition: all var(--chatbox-animation-speed) ease;
          z-index: 999;
          max-width: 200px;
          animation: moodleChatboxNotificationPulse 3s ease-in-out infinite;
          font-family: system-ui, Segoe UI, Roboto, Arial, sans-serif;
        }

        .moodle-chat-notification.visible {
          opacity: 1;
          transform: translateY(-50%) translateX(0) scale(1);
        }

        .moodle-chat-notification::after {
          content: '';
          position: absolute;
          top: 50%;
          right: -8px;
          border-top: 8px solid transparent;
          border-bottom: 8px solid transparent;
          border-left: 8px solid #fff;
          transform: translateY(-50%);
        }

        .moodle-chatbox-container {
          position: fixed;
          top: 50%;
          right: 100px;
          width: 350px;
          height: 450px;
          background: #fff;
          border-radius: 20px;
          box-shadow: var(--chatbox-shadow-strong);
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(-50%) translateX(20px) scale(.9);
          transition: all var(--chatbox-animation-speed) ease;
          z-index: 998;
          pointer-events: none;
          font-family: system-ui, Segoe UI, Roboto, Arial, sans-serif;
        }

        .moodle-chatbox-container.open {
          opacity: 1;
          transform: translateY(-50%) translateX(0) scale(1);
          pointer-events: all;
        }

        .moodle-chatbox-header {
          background: var(--chatbox-primary-gradient);
          padding: 16px 20px;
          color: #fff;
          border-radius: 20px 20px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .moodle-chatbox-title {
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 2px;
        }

        .moodle-chatbox-status {
          font-size: .8rem;
          opacity: .9;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .moodle-status-indicator {
          width: 6px;
          height: 6px;
          background: #48bb78;
          border-radius: 50%;
          animation: moodleChatboxPulse 2s infinite;
        }

        .moodle-close-button {
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          transition: background-color var(--chatbox-animation-speed) ease;
        }

        .moodle-close-button:hover {
          background-color: rgba(255,255,255,0.2);
        }

        .moodle-chatbox-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          background: var(--chatbox-secondary-color);
        }

        .moodle-message {
          display: flex;
          margin-bottom: 12px;
          animation: moodleChatboxMessageSlide .4s ease-out;
        }

        .moodle-message.user {
          justify-content: flex-end;
        }

        .moodle-message-content {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: .9rem;
          line-height: 1.4;
          box-shadow: var(--chatbox-shadow-soft);
        }

        .moodle-message.bot .moodle-message-content {
          background: #fff;
          color: var(--chatbox-text-primary);
          border-bottom-left-radius: 4px;
        }

        .moodle-message.user .moodle-message-content {
          background: var(--chatbox-primary-gradient);
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .moodle-message-time {
          font-size: .7rem;
          opacity: .6;
          margin-top: 4px;
          text-align: right;
        }

        .moodle-message.bot .moodle-message-time {
          text-align: left;
        }

        .moodle-chatbox-input {
          padding: 16px;
          background: #fff;
          border-top: 1px solid var(--chatbox-border-color);
          border-radius: 0 0 20px 20px;
        }

        .moodle-input-container {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .moodle-message-input {
          flex: 1;
          padding: 10px 14px;
          border: 2px solid var(--chatbox-border-color);
          border-radius: 20px;
          font-size: .9rem;
          min-height: 36px;
          max-height: 100px;
          transition: all var(--chatbox-animation-speed) ease;
          overflow: hidden;
          resize: none !important;
        }

        .moodle-send-button {
          padding: 8px 16px;
          background: var(--chatbox-primary-gradient);
          color: #fff;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: .85rem;
          font-weight: 600;
          box-shadow: var(--chatbox-shadow-soft);
          min-width: 70px;
          height: 36px;
          transition: transform var(--chatbox-animation-speed) ease, opacity var(--chatbox-animation-speed) ease;
        }

        .moodle-send-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .moodle-send-button:active {
          transform: translateY(0);
        }

        .moodle-send-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .moodle-typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          color: var(--chatbox-text-secondary);
          font-style: italic;
          font-size: 0.85rem;
        }

        .moodle-typing-dots {
          display: flex;
          gap: 3px;
        }

        .moodle-typing-dot {
          width: 5px;
          height: 5px;
          background: var(--chatbox-primary-color);
          border-radius: 50%;
          animation: moodleChatboxTypingBounce 1.4s ease-in-out infinite;
        }

        .moodle-typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .moodle-typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes moodleChatboxBounceIn {
          0% { transform: translateY(-50%) scale(0) rotate(180deg); opacity: 0; }
          50% { transform: translateY(-50%) scale(1.2) rotate(90deg); opacity: .8; }
          100% { transform: translateY(-50%) scale(1) rotate(0); opacity: 1; }
        }

        @keyframes moodleChatboxMessageSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes moodleChatboxPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes moodleChatboxTypingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }

        @keyframes moodleChatboxNotificationPulse {
          0%, 100% { transform: translateY(-50%) translateX(0) scale(1); }
          50% { transform: translateY(-50%) translateX(-2px) scale(1.02); }
        }
      `;
      document.head.appendChild(s);
    }

    // Création des éléments DOM
    function createChatboxElements() {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="moodle-chat-notification" id="moodleChatNotification">👋 Besoin d'aide ? Je suis là !</div>
        <div class="moodle-chat-bubble" id="moodleChatBubble">
          <svg class="moodle-chat-bubble-icon" viewBox="0 0 24 24" style="fill:none">
            <circle cx="12" cy="12" r="10" fill="#6BBDBF"/>
            <circle cx="8" cy="8" r="0.3" fill="#5AACAE" opacity="0.6"/>
            <circle cx="16" cy="7" r="0.2" fill="#5AACAE" opacity="0.4"/>
            <circle cx="6" cy="14" r="0.25" fill="#5AACAE" opacity="0.5"/>
            <circle cx="18" cy="16" r="0.2" fill="#5AACAE" opacity="0.4"/>
            <circle cx="10" cy="18" r="0.2" fill="#5AACAE" opacity="0.3"/>
            <circle cx="15" cy="5" r="0.15" fill="#5AACAE" opacity="0.4"/>
            <line x1="12" y1="6.5" x2="12" y2="4.5" stroke="#1B4A4F" stroke-width="0.8" stroke-linecap="round"/>
            <circle cx="12" cy="4.5" r="0.8" fill="none" stroke="#1B4A4F" stroke-width="0.6"/>
            <circle cx="12" cy="4.5" r="0.3" fill="#F5F5F5"/>
            <ellipse cx="12" cy="9.5" rx="5" ry="4" fill="#F5F5F5" stroke="#1B4A4F" stroke-width="1"/>
            <ellipse cx="12" cy="9.8" rx="3.5" ry="2.8" fill="#1B4A4F"/>
            <ellipse cx="10.3" cy="9.2" rx="0.7" ry="0.9" fill="#F5F5F5"/>
            <ellipse cx="13.7" cy="9.2" rx="0.7" ry="0.9" fill="#F5F5F5"/>
            <path d="M 10 10.8 Q 12 12.2 14 10.8" stroke="#F5F5F5" stroke-width="0.6" fill="none" stroke-linecap="round"/>
            <ellipse cx="6.5" cy="9.5" rx="1" ry="1.5" fill="#6BBDBF" stroke="#1B4A4F" stroke-width="0.8"/>
            <ellipse cx="17.5" cy="9.5" rx="1" ry="1.5" fill="#6BBDBF" stroke="#1B4A4F" stroke-width="0.8"/>
            <ellipse cx="12" cy="16" rx="4" ry="3.5" fill="#F5F5F5" stroke="#1B4A4F" stroke-width="0.8"/>
            <ellipse cx="8.5" cy="15" rx="1.2" ry="2" fill="#F5F5F5" stroke="#1B4A4F" stroke-width="0.6"/>
            <ellipse cx="15.5" cy="15" rx="1.2" ry="2" fill="#F5F5F5" stroke="#1B4A4F" stroke-width="0.6"/>
            <rect x="10.5" y="15.5" width="3" height="1.5" rx="0.3" fill="#6BBDBF" stroke="#1B4A4F" stroke-width="0.4"/>
            <rect x="11.2" y="13" width="1.6" height="0.8" rx="0.2" fill="#6BBDBF" stroke="#1B4A4F" stroke-width="0.4"/>
          </svg>
        </div>
        <div class="moodle-chatbox-container" id="moodleChatboxContainer">
          <div class="moodle-chatbox-header">
            <div class="moodle-chatbox-header-content">
              <div class="moodle-chatbox-title">ChatBox LGC</div>
              <div class="moodle-chatbox-status"><div class="moodle-status-indicator"></div> En ligne</div>
            </div>
            <button class="moodle-close-button" id="moodleCloseButton" aria-label="Fermer">✕</button>
          </div>
          <div class="moodle-chatbox-messages" id="moodleMessagesContainer">
            <div class="moodle-message bot">
              <div class="moodle-message-content">
                Bonjour, comment puis-je vous aider aujourd'hui ?
                <div class="moodle-message-time" id="moodleInitialTime"></div>
              </div>
            </div>
          </div>
          <div class="moodle-chatbox-input">
            <div class="moodle-input-container">
              <textarea class="moodle-message-input" id="moodleMessageInput" placeholder="Tapez votre message..." rows="1"></textarea>
              <button class="moodle-send-button" id="moodleSendButton">Envoyer</button>
            </div>
          </div>
        </div>`;
      return container;
    }

    // Classe principale du chatbot
    class MoodleFloatingChatbox {
      constructor(identity) {
        this.identity = identity;
        this.chatBubble = document.getElementById('moodleChatBubble');
        this.chatboxContainer = document.getElementById('moodleChatboxContainer');
        this.closeButton = document.getElementById('moodleCloseButton');
        this.messagesContainer = document.getElementById('moodleMessagesContainer');
        this.messageInput = document.getElementById('moodleMessageInput');
        this.sendButton = document.getElementById('moodleSendButton');
        this.chatNotification = document.getElementById('moodleChatNotification');
        this.isOpen = false;
        this.isTyping = false;
        this.notificationShown = false;

        // Configuration du proxy
        this.proxyUrl = PROXY_CONFIG.baseUrl + PROXY_CONFIG.endpoint;
        this.timeout = PROXY_CONFIG.timeout;
        this.conversationHistory = [];

        this.init();
        this.setupListeners();
        this.setInitialTime();
        this.showNotificationAfterDelay();

        console.log('🚀 Chatbot initialisé avec succès');
      }

      init() {
        this.messageInput.addEventListener('input', this.autoResize.bind(this));
        const ctx = this.extractPageContext();
        this.systemMessage = {
          role: 'system',
          content: `Tu es un tuteur bienveillant intégré à Moodle. Adapte ton explication, propose des exercices, analyse les erreurs, et poursuis jusqu'à maîtrise.\n\nCONTEXTE DE LA PAGE :\n${ctx}\n`
        };
        this.conversationHistory.push(this.systemMessage);
      }

      extractPageContext() {
        try {
          const MAX = 100000;
          const primary = document.querySelector('[data-region="mainpage"]');
          const backups = ['#region-main', '#region-main-box', '.region-main', 'main', '[role="main"]', '.course-content', '#page-content', '.page-content'];
          let el = primary;
          if (!el) {
            for (const s of backups) {
              el = document.querySelector(s);
              if (el) break;
            }
          }
          if (!el) return 'Contenu principal introuvable.';
          
          const c = el.cloneNode(true);
          c.querySelectorAll('script,style,noscript,iframe,.moodle-chatbox-container,.moodle-chat-bubble,.moodle-chat-notification,[data-region="drawer"],.drawer,.navbar,.nav,nav,.footer,footer,.sidebar,.aside,.advertisement,.ads').forEach(n => n.remove());
          
          let t = (c.textContent || c.innerText || '').replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
          if (t.length > MAX) t = t.slice(0, MAX) + '... [contenu tronqué]';
          return t || 'Aucun contenu textuel détecté.';
        } catch (e) {
          console.error('Erreur extraction contexte:', e);
          return 'Erreur lors de l\'extraction du contexte.';
        }
      }

      setupListeners() {
        this.chatBubble.addEventListener('click', () => this.toggleChat());
        this.closeButton.addEventListener('click', () => this.closeChat());
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
          }
        });
        this.chatNotification.addEventListener('click', () => this.hideNotification());
      }

      showNotificationAfterDelay() {
        setTimeout(() => {
          if (!this.isOpen && !this.notificationShown) {
            this.showNotification();
          }
        }, 3000);
      }

      showNotification() {
        this.chatNotification.classList.add('visible');
        this.notificationShown = true;
        setTimeout(() => this.hideNotification(), 10000);
      }

      hideNotification() {
        this.chatNotification.classList.remove('visible');
      }

      toggleChat() {
        this.isOpen ? this.closeChat() : this.openChat();
      }

      openChat() {
        this.isOpen = true;
        this.chatboxContainer.classList.add('open');
        this.chatBubble.classList.add('open');
        this.hideNotification();
        setTimeout(() => this.messageInput.focus(), 300);
      }

      closeChat() {
        this.isOpen = false;
        this.chatboxContainer.classList.remove('open');
        this.chatBubble.classList.remove('open');
      }

      autoResize() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 100) + 'px';
      }

      setInitialTime() {
        const el = document.getElementById('moodleInitialTime');
        if (el) el.textContent = this.getTime();
      }

      getTime() {
        return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      }

      sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;
        
        this.addMessage(message, 'user');
        this.conversationHistory.push({ role: 'user', content: message });
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.messageInput.focus();
        this.sendToProxy();
      }

      async sendToProxy() {
        this.simulateTyping();
        try {
          const messages = [this.systemMessage, ...this.conversationHistory.slice(1).slice(-9)];
          const requestData = {
            model: 'deepseek-chat',
            messages: messages,
            max_tokens: 4000,
            temperature: 0.1,
            stream: false
          };

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);

          const response = await fetch(this.proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': this.getCSRFToken(),
            },
            body: JSON.stringify(requestData),
            signal: controller.signal,
            credentials: 'same-origin'
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Erreur ${response.status}: ${errorData.message || errorData.error || 'Erreur inconnue'}`);
          }

          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer une réponse.';
          
          this.conversationHistory.push({ role: 'assistant', content: content });
          this.stopTyping();
          this.addMessage(content, 'bot');

        } catch (error) {
          console.error('Erreur proxy:', error);
          this.stopTyping();
          
          let errorMessage = "Désolé, je rencontre des difficultés techniques. ";
          const errorStr = String(error);
          
          if (error.name === 'AbortError') {
            errorMessage += "La requête a pris trop de temps.";
          } else if (errorStr.includes('NetworkError') || errorStr.includes('fetch')) {
            errorMessage += "Problème de connexion au serveur.";
          } else if (errorStr.includes('401')) {
            errorMessage += "Problème d'authentification.";
          } else if (errorStr.includes('429')) {
            errorMessage += "Trop de requêtes. Veuillez patienter.";
          } else if (errorStr.includes('500')) {
            errorMessage += "Erreur du serveur.";
          } else {
            errorMessage += "Veuillez réessayer dans quelques instants.";
          }
          
          this.addMessage(errorMessage, 'bot');
        }
      }

      getCSRFToken() {
        const cookieValue = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrftoken='))
          ?.split('=')[1];
        
        if (cookieValue) return cookieValue;
        
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) return metaTag.getAttribute('content');
        
        const hiddenInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (hiddenInput) return hiddenInput.value;
        
        return null;
      }

      addMessage(content, sender) {
        const wrap = document.createElement('div');
        wrap.className = `moodle-message ${sender}`;
        const inner = document.createElement('div');
        inner.className = 'moodle-message-content';
        inner.innerHTML = `${content}<div class="moodle-message-time">${this.getTime()}</div>`;
        wrap.appendChild(inner);
        this.messagesContainer.appendChild(wrap);
        this.scrollToBottom();
      }

      simulateTyping() {
        if (this.isTyping) return;
        this.isTyping = true;
        this.sendButton.disabled = true;
        
        const t = document.createElement('div');
        t.className = 'moodle-typing-indicator';
        t.id = 'moodleTypingIndicator';
        t.innerHTML = `Assistant en train d'écrire...<div class="moodle-typing-dots"><div class="moodle-typing-dot"></div><div class="moodle-typing-dot"></div><div class="moodle-typing-dot"></div></div>`;
        this.messagesContainer.appendChild(t);
        this.scrollToBottom();
      }

      stopTyping() {
        const t = document.getElementById('moodleTypingIndicator');
        if (t) t.remove();
        this.isTyping = false;
        this.sendButton.disabled = false;
      }

      setProxyUrl(url) {
        this.proxyUrl = url;
      }

      setTimeout(timeout) {
        this.timeout = timeout;
      }

      setSystemMessage(m) {
        this.systemMessage.content = m;
        this.conversationHistory[0] = this.systemMessage;
      }

      updatePageContext() {
        const ctx = this.extractPageContext();
        this.systemMessage.content = `Tu es un tuteur bienveillant intégré à Moodle.\n\nCONTEXTE DE LA PAGE :\n${ctx}`;
        this.conversationHistory[0] = this.systemMessage;
      }

      clearConversation() {
        this.conversationHistory = [this.systemMessage];
        this.messagesContainer.innerHTML = `<div class="moodle-message bot"><div class="moodle-message-content">Bonjour, comment puis-je vous aider aujourd'hui ?<div class="moodle-message-time">${this.getTime()}</div></div></div>`;
      }

      scrollToBottom() {
        setTimeout(() => {
          this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 80);
      }
    }

    function initializeChatbox() {
      console.log('🚀 Initialisation du chatbox...');
      injectStyles();
      const els = createChatboxElements();
      document.body.appendChild(els);
      window.moodleChatboxInstance = new MoodleFloatingChatbox(ident);

      // Application de la salutation personnalisée
      const firstNow = firstNameFrom(ident.fullnameMenu);
      applyGreeting(firstNow);

      getFullnameFromProfile(ident.userid || getUserFromHeaderLink()).then(n => {
        const first = firstNameFrom(n);
        if (first) applyGreeting(first);
      });
    }

    // API publique
    window.MoodleChatbox = {
      toggleChat() {
        window.moodleChatboxInstance?.toggleChat();
      },
      openChat() {
        window.moodleChatboxInstance?.openChat();
      },
      closeChat() {
        window.moodleChatboxInstance?.closeChat();
      },
      addMessage(c, s = 'bot') {
        window.moodleChatboxInstance?.addMessage(c, s);
      },
      setApiKey(k) {
        console.warn('setApiKey() est obsolète - utilisez le proxy Django');
      },
      setProxyUrl(url) {
        window.moodleChatboxInstance?.setProxyUrl(url);
      },
      setTimeout(timeout) {
        window.moodleChatboxInstance?.setTimeout(timeout);
      },
      setSystemMessage(m) {
        window.moodleChatboxInstance?.setSystemMessage(m);
      },
      clearConversation() {
        window.moodleChatboxInstance?.clearConversation();
      },
      getConversationHistory() {
        return window.moodleChatboxInstance ? window.moodleChatboxInstance.conversationHistory.filter(m => m.role !== 'system') : [];
      },
      updatePageContext() {
        window.moodleChatboxInstance?.updatePageContext();
      },
      getPageContext() {
        return window.moodleChatboxInstance?.extractPageContext() || '';
      }
    };

    initializeChatbox();
  });
})();