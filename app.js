(function() {
    'use strict';
    
    // Empêcher le double chargement
    if (window.MoodleChatboxLoaded) return;
    window.MoodleChatboxLoaded = true;

    // Injection des styles CSS
    const injectStyles = () => {
        const styleId = 'moodle-chatbox-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Variables CSS pour la personnalisation */
            :root {
                --chatbox-primary-color: #667eea;
                --chatbox-primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                --chatbox-secondary-color: #f8fafc;
                --chatbox-text-primary: #1a202c;
                --chatbox-text-secondary: #718096;
                --chatbox-border-color: #e2e8f0;
                --chatbox-shadow-soft: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                --chatbox-shadow-strong: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                --chatbox-animation-speed: 0.3s;
            }

            /* Bulle de chat flottante */
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
                animation: moodleChatboxBounceIn 0.6s ease-out;
                transform: translateY(-50%);
            }

            .moodle-chat-bubble:hover {
                transform: translateY(-50%) scale(1.1);
                box-shadow: 0 25px 30px -5px rgba(0, 0, 0, 0.15), 0 15px 15px -5px rgba(0, 0, 0, 0.08);
            }

            .moodle-chat-bubble-icon {
                width: 28px;
                height: 28px;
                fill: white;
                transition: transform var(--chatbox-animation-speed) ease;
            }

            .moodle-chat-bubble.open .moodle-chat-bubble-icon {
                transform: rotate(180deg);
            }

            /* Message de notification */
            .moodle-chat-notification {
                position: fixed;
                top: 50%;
                right: 95px;
                background: white;
                padding: 12px 16px;
                border-radius: 20px;
                box-shadow: var(--chatbox-shadow-soft);
                font-size: 0.9rem;
                color: var(--chatbox-text-primary);
                font-weight: 500;
                opacity: 0;
                transform: translateY(-50%) translateX(10px) scale(0.9);
                transition: all var(--chatbox-animation-speed) ease;
                z-index: 999;
                max-width: 200px;
                animation: moodleChatboxNotificationPulse 3s ease-in-out infinite;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
                width: 0;
                height: 0;
                border-top: 8px solid transparent;
                border-bottom: 8px solid transparent;
                border-left: 8px solid white;
                transform: translateY(-50%);
            }

            /* Container principal de la chatbox */
            .moodle-chatbox-container {
                position: fixed;
                top: 50%;
                right: 100px;
                width: 350px;
                height: 450px;
                background: white;
                border-radius: 20px;
                box-shadow: var(--chatbox-shadow-strong);
                display: flex;
                flex-direction: column;
                opacity: 0;
                transform: translateY(-50%) translateX(20px) scale(0.9);
                transition: all var(--chatbox-animation-speed) ease;
                z-index: 998;
                pointer-events: none;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .moodle-chatbox-container.open {
                opacity: 1;
                transform: translateY(-50%) translateX(0) scale(1);
                pointer-events: all;
            }

            /* Header de la chatbox */
            .moodle-chatbox-header {
                background: var(--chatbox-primary-gradient);
                padding: 16px 20px;
                color: white;
                border-radius: 20px 20px 0 0;
                position: relative;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .moodle-chatbox-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
                border-radius: 20px 20px 0 0;
            }

            .moodle-chatbox-header-content {
                position: relative;
                z-index: 1;
            }

            .moodle-chatbox-title {
                font-size: 1.2rem;
                font-weight: 700;
                margin-bottom: 2px;
            }

            .moodle-chatbox-status {
                font-size: 0.8rem;
                opacity: 0.9;
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
                color: white;
                cursor: pointer;
                padding: 4px;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background-color var(--chatbox-animation-speed) ease;
                position: relative;
                z-index: 1;
            }

            .moodle-close-button:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }

            /* Zone des messages */
            .moodle-chatbox-messages {
                flex: 1;
                padding: 16px;
                overflow-y: auto;
                background: var(--chatbox-secondary-color);
                background-image: 
                    radial-gradient(circle at 20px 50px, #ffffff 2px, transparent 2px),
                    radial-gradient(circle at 40px 80px, #ffffff 1px, transparent 1px);
            }

            .moodle-message {
                display: flex;
                margin-bottom: 12px;
                animation: moodleChatboxMessageSlide 0.4s ease-out;
            }

            .moodle-message.user {
                justify-content: flex-end;
            }

            .moodle-message-content {
                max-width: 80%;
                padding: 10px 14px;
                border-radius: 16px;
                font-size: 0.9rem;
                line-height: 1.4;
                box-shadow: var(--chatbox-shadow-soft);
                position: relative;
            }

            .moodle-message.bot .moodle-message-content {
                background: white;
                color: var(--chatbox-text-primary);
                border-bottom-left-radius: 4px;
            }

            .moodle-message.user .moodle-message-content {
                background: var(--chatbox-primary-gradient);
                color: white;
                border-bottom-right-radius: 4px;
            }

            .moodle-message-time {
                font-size: 0.7rem;
                opacity: 0.6;
                margin-top: 4px;
                text-align: right;
            }

            .moodle-message.bot .moodle-message-time {
                text-align: left;
            }

            /* Zone de saisie */
            .moodle-chatbox-input {
                padding: 16px;
                background: white;
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
                font-size: 0.9rem;
                resize: none;
                min-height: 36px;
                max-height: 100px;
                transition: all var(--chatbox-animation-speed) ease;
                font-family: inherit;
                overflow: hidden;
            }

            .moodle-message-input::-webkit-resizer {
                display: none;
            }

            .moodle-message-input {
                resize: none !important;
            }

            .moodle-message-input:focus {
                outline: none;
                border-color: var(--chatbox-primary-color);
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            .moodle-send-button {
                padding: 8px 16px;
                background: var(--chatbox-primary-gradient);
                color: white;
                border: none;
                border-radius: 20px;
                cursor: pointer;
                font-size: 0.85rem;
                font-weight: 600;
                transition: all var(--chatbox-animation-speed) ease;
                box-shadow: var(--chatbox-shadow-soft);
                min-width: 70px;
                height: 36px;
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

            /* Animation de frappe */
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

            .moodle-typing-dot:nth-child(2) { animation-delay: 0.2s; }
            .moodle-typing-dot:nth-child(3) { animation-delay: 0.4s; }

            /* Animations */
            @keyframes moodleChatboxTypingBounce {
                0%, 60%, 100% { transform: translateY(0); }
                30% { transform: translateY(-8px); }
            }

            @keyframes moodleChatboxPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.1); }
            }

            @keyframes moodleChatboxBounceIn {
                0% { transform: translateY(-50%) scale(0) rotate(180deg); opacity: 0; }
                50% { transform: translateY(-50%) scale(1.2) rotate(90deg); opacity: 0.8; }
                100% { transform: translateY(-50%) scale(1) rotate(0deg); opacity: 1; }
            }

            @keyframes moodleChatboxNotificationPulse {
                0%, 100% { transform: translateY(-50%) translateX(0) scale(1); }
                50% { transform: translateY(-50%) translateX(-2px) scale(1.02); }
            }

            @keyframes moodleChatboxMessageSlide {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Styles responsifs */
            @media (max-width: 768px) {
                .moodle-chatbox-container {
                    width: calc(100vw - 40px);
                    height: calc(100vh - 120px);
                    top: 50%;
                    right: 20px;
                    border-radius: 20px;
                }

                .moodle-chat-notification {
                    max-width: 150px;
                    font-size: 0.8rem;
                    right: 90px;
                }
            }

            @media (max-width: 480px) {
                .moodle-chat-bubble {
                    top: 50%;
                    right: 15px;
                }

                .moodle-chat-notification {
                    right: 85px;
                }

                .moodle-chatbox-container {
                    top: 50%;
                    right: 15px;
                    width: calc(100vw - 30px);
                    height: calc(100vh - 120px);
                }
            }

            @media (min-width: 769px) {
                .moodle-chatbox-container {
                    max-width: 350px;
                    max-height: 450px;
                }
            }

            /* Scrollbar personnalisée */
            .moodle-chatbox-messages::-webkit-scrollbar {
                width: 4px;
            }

            .moodle-chatbox-messages::-webkit-scrollbar-track {
                background: transparent;
            }

            .moodle-chatbox-messages::-webkit-scrollbar-thumb {
                background: var(--chatbox-primary-color);
                border-radius: 2px;
                opacity: 0.3;
            }

            .moodle-chatbox-messages::-webkit-scrollbar-thumb:hover {
                opacity: 0.6;
            }
        `;
        document.head.appendChild(style);
    };

    // Création des éléments HTML
    const createChatboxElements = () => {
        // Container principal
        const container = document.createElement('div');
        container.innerHTML = `
            <!-- Notification de disponibilité -->
            <div class="moodle-chat-notification" id="moodleChatNotification">
                👋 Besoin d'aide ? Je suis là !
            </div>

            <!-- Bulle de chat flottante -->
            <div class="moodle-chat-bubble" id="moodleChatBubble">
                <svg class="moodle-chat-bubble-icon" viewBox="0 0 24 24" style="fill: none;">
                    <!-- Arrière-plan avec texture -->
                    <circle cx="12" cy="12" r="10" fill="#6BBDBF"/>
                    
                    <!-- Points de texture sur le fond -->
                    <circle cx="8" cy="8" r="0.3" fill="#5AACAE" opacity="0.6"/>
                    <circle cx="16" cy="7" r="0.2" fill="#5AACAE" opacity="0.4"/>
                    <circle cx="6" cy="14" r="0.25" fill="#5AACAE" opacity="0.5"/>
                    <circle cx="18" cy="16" r="0.2" fill="#5AACAE" opacity="0.4"/>
                    <circle cx="10" cy="18" r="0.2" fill="#5AACAE" opacity="0.3"/>
                    <circle cx="15" cy="5" r="0.15" fill="#5AACAE" opacity="0.4"/>
                    
                    <!-- Antenne -->
                    <line x1="12" y1="6.5" x2="12" y2="4.5" stroke="#1B4A4F" stroke-width="0.8" stroke-linecap="round"/>
                    <circle cx="12" cy="4.5" r="0.8" fill="none" stroke="#1B4A4F" stroke-width="0.6"/>
                    <circle cx="12" cy="4.5" r="0.3" fill="#F5F5F5"/>
                    
                    <!-- Casque/Écran du robot -->
                    <ellipse cx="12" cy="9.5" rx="5" ry="4" fill="#F5F5F5" stroke="#1B4A4F" stroke-width="1"/>
                    
                    <!-- Visage/Écran interne -->
                    <ellipse cx="12" cy="9.8" rx="3.5" ry="2.8" fill="#1B4A4F"/>
                    
                    <!-- Yeux -->
                    <ellipse cx="10.3" cy="9.2" rx="0.7" ry="0.9" fill="#F5F5F5"/>
                    <ellipse cx="13.7" cy="9.2" rx="0.7" ry="0.9" fill="#F5F5F5"/>
                    
                    <!-- Sourire -->
                    <path d="M 10 10.8 Q 12 12.2 14 10.8" stroke="#F5F5F5" stroke-width="0.6" fill="none" stroke-linecap="round"/>
                    
                    <!-- Capteurs/Oreilles -->
                    <ellipse cx="6.5" cy="9.5" rx="1" ry="1.5" fill="#6BBDBF" stroke="#1B4A4F" stroke-width="0.8"/>
                    <ellipse cx="17.5" cy="9.5" rx="1" ry="1.5" fill="#6BBDBF" stroke="#1B4A4F" stroke-width="0.8"/>
                    
                    <!-- Corps du robot -->
                    <ellipse cx="12" cy="16" rx="4" ry="3.5" fill="#F5F5F5" stroke="#1B4A4F" stroke-width="0.8"/>
                    
                    <!-- Bras -->
                    <ellipse cx="8.5" cy="15" rx="1.2" ry="2" fill="#F5F5F5" stroke="#1B4A4F" stroke-width="0.6"/>
                    <ellipse cx="15.5" cy="15" rx="1.2" ry="2" fill="#F5F5F5" stroke="#1B4A4F" stroke-width="0.6"/>
                    
                    <!-- Panneau de contrôle -->
                    <rect x="10.5" y="15.5" width="3" height="1.5" rx="0.3" fill="#6BBDBF" stroke="#1B4A4F" stroke-width="0.4"/>
                    
                    <!-- Détails du cou -->
                    <rect x="11.2" y="13" width="1.6" height="0.8" rx="0.2" fill="#6BBDBF" stroke="#1B4A4F" stroke-width="0.4"/>
                </svg>
            </div>

            <!-- Container principal de la chatbox -->
            <div class="moodle-chatbox-container" id="moodleChatboxContainer">
                <div class="moodle-chatbox-header">
                    <div class="moodle-chatbox-header-content">
                        <div class="moodle-chatbox-title">ChatBox LGC</div>
                        <div class="moodle-chatbox-status">
                            <div class="moodle-status-indicator"></div>
                            En ligne
                        </div>
                    </div>
                    <button class="moodle-close-button" id="moodleCloseButton">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                <div class="moodle-chatbox-messages" id="moodleMessagesContainer">
                    <div class="moodle-message bot">
                        <div class="moodle-message-content">
                            Bonjour, je suis l'assistant de la Grande Classe. Comment puis-je vous aider aujourd'hui ?
                            <div class="moodle-message-time" id="moodleInitialTime"></div>
                        </div>
                    </div>
                </div>

                <div class="moodle-chatbox-input">
                    <div class="moodle-input-container">
                        <textarea 
                            class="moodle-message-input" 
                            id="moodleMessageInput" 
                            placeholder="Tapez votre message..."
                            rows="1"
                        ></textarea>
                        <button class="moodle-send-button" id="moodleSendButton">
                            Envoyer
                        </button>
                    </div>
                </div>
            </div>
        `;

        return container;
    };

    // Classe principale de la chatbox
    class MoodleFloatingChatbox {
        constructor() {
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
            
            // Configuration API DeepSeek
            this.apiKey = '';
            this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
            this.conversationHistory = [];
            
            this.init();
            this.setupEventListeners();
            this.setInitialTime();
            this.showNotificationAfterDelay();
        }

        init() {
            // Auto-resize du textarea
            this.messageInput.addEventListener('input', this.autoResize.bind(this));
            
            // Extraire le contexte de la page
            const pageContext = this.extractPageContext();
            
            // Message système pour l'IA avec contexte de la page
            this.systemMessage = {
                role: 'system',
                content: `Tu es un assistant virtuel utile et amical intégré dans un site web Moodle. Réponds de manière concise et claire. Adapte ton ton au contexte et aide les utilisateurs de la meilleure façon possible.

CONTEXTE DE LA PAGE ACTUELLE:
${pageContext}

Utilise ces informations pour fournir des réponses pertinentes et contextuelles aux utilisateurs. Si un utilisateur pose une question en rapport avec le contenu de la page, tu peux t'y référer directement.`
            };
            
            this.conversationHistory.push(this.systemMessage);
            
            // Log du contexte pour debug (à supprimer en production)
            console.log('Contexte de la page extrait:', pageContext);
        }

        extractPageContext() {
            try {
                // Rechercher l'élément avec data-region="mainpage"
                const mainPageElement = document.querySelector('[data-region="mainpage"]');
                
                if (!mainPageElement) {
                    // Fallback: essayer d'autres sélecteurs Moodle courants
                    const alternativeSelectors = [
                        '#region-main-box',
                        '#region-main',
                        '.region-main',
                        'main',
                        '[role="main"]',
                        '.course-content',
                        '#page-content',
                        '.page-content'
                    ];
                    
                    for (const selector of alternativeSelectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            return this.cleanTextContent(element);
                        }
                    }
                    
                    return "Contenu de la page non accessible - élément principal non trouvé.";
                }
                
                return this.cleanTextContent(mainPageElement);
                
            } catch (error) {
                console.error('Erreur lors de l\'extraction du contexte:', error);
                return "Erreur lors de l'extraction du contexte de la page.";
            }
        }

        cleanTextContent(element) {
            if (!element) return '';
            
            // Cloner l'élément pour ne pas modifier l'original
            const clonedElement = element.cloneNode(true);
            
            // Supprimer les éléments indésirables
            const elementsToRemove = [
                'script', 'style', 'noscript', 'iframe', 
                '.moodle-chatbox-container', '.moodle-chat-bubble', '.moodle-chat-notification', // Notre chatbox
                '[data-region="drawer"]', '.drawer', // Tiroirs Moodle
                '.navbar', '.nav', 'nav', // Navigation
                '.footer', 'footer', // Pied de page
                '.sidebar', '.aside', // Barres latérales
                '.advertisement', '.ads', // Publicités
            ];
            
            elementsToRemove.forEach(selector => {
                const elements = clonedElement.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });
            
            // Extraire le texte et nettoyer
            let textContent = clonedElement.textContent || clonedElement.innerText || '';
            
            // Nettoyer le texte
            textContent = textContent
                .replace(/\s+/g, ' ') // Normaliser les espaces
                .replace(/\n\s*\n/g, '\n') // Supprimer les lignes vides multiples
                .trim();
            
            // Limiter la taille du contexte pour éviter des prompts trop longs
            const maxLength = 2000; // Limite de caractères
            if (textContent.length > maxLength) {
                textContent = textContent.substring(0, maxLength) + '... [contenu tronqué]';
            }
            
            return textContent || 'Aucun contenu textuel détecté sur cette page.';
        }

        setupEventListeners() {
            // Ouvrir/fermer avec la bulle
            this.chatBubble.addEventListener('click', () => {
                this.toggleChat();
            });

            // Fermer avec le bouton de fermeture
            this.closeButton.addEventListener('click', () => {
                this.closeChat();
            });

            // Envoyer avec le bouton
            this.sendButton.addEventListener('click', () => {
                this.sendMessage();
            });

            // Envoyer avec Entrée (Maj+Entrée pour nouvelle ligne)
            this.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Cacher la notification au clic
            this.chatNotification.addEventListener('click', () => {
                this.hideNotification();
            });
        }

        showNotificationAfterDelay() {
            // Afficher la notification après 3 secondes si le chat n'est pas ouvert
            setTimeout(() => {
                if (!this.isOpen && !this.notificationShown) {
                    this.showNotification();
                }
            }, 3000);
        }

        showNotification() {
            this.chatNotification.classList.add('visible');
            this.notificationShown = true;

            // Cacher automatiquement après 10 secondes
            setTimeout(() => {
                this.hideNotification();
            }, 10000);
        }

        hideNotification() {
            this.chatNotification.classList.remove('visible');
        }

        toggleChat() {
            if (this.isOpen) {
                this.closeChat();
            } else {
                this.openChat();
            }
        }

        openChat() {
            this.isOpen = true;
            this.chatboxContainer.classList.add('open');
            this.chatBubble.classList.add('open');
            this.hideNotification();
            
            // Focus sur l'input après l'animation
            setTimeout(() => {
                this.messageInput.focus();
            }, 300);
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
            const initialTimeElement = document.getElementById('moodleInitialTime');
            if (initialTimeElement) {
                initialTimeElement.textContent = this.getCurrentTime();
            }
        }

        getCurrentTime() {
            return new Date().toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }

        sendMessage() {
            const message = this.messageInput.value.trim();
            
            if (!message || this.isTyping) return;

            // Ajouter le message utilisateur
            this.addMessage(message, 'user');
            
            // Ajouter le message à l'historique de conversation
            this.conversationHistory.push({
                role: 'user',
                content: message
            });
            
            // Vider l'input et remettre la taille
            this.messageInput.value = '';
            this.messageInput.style.height = 'auto';
            this.messageInput.focus();

            // Envoyer la requête à DeepSeek API
            this.sendToDeepSeekAPI();
        }

        async sendToDeepSeekAPI() {
            this.simulateTyping();
            
            try {
                if (!this.apiKey) {
                    throw new Error('Clé API DeepSeek manquante');
                }

                const response = await fetch(this.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: this.conversationHistory.slice(-10), // Garder seulement les 10 derniers messages
                        max_tokens: 500,
                        temperature: 0.7,
                        stream: false
                    })
                });

                if (!response.ok) {
                    throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                const aiResponse = data.choices[0].message.content;
                
                // Ajouter la réponse à l'historique
                this.conversationHistory.push({
                    role: 'assistant',
                    content: aiResponse
                });
                
                // Afficher la réponse
                this.stopTyping();
                this.addMessage(aiResponse, 'bot');
                
            } catch (error) {
                console.error('Erreur lors de l\'appel à l\'API DeepSeek:', error);
                this.stopTyping();
                
                let errorMessage = "Désolé, je rencontre des difficultés techniques. ";
                
                if (error.message.includes('Clé API')) {
                    errorMessage += "La clé API n'est pas configurée. Veuillez contacter l'administrateur.";
                } else if (error.message.includes('401')) {
                    errorMessage += "Problème d'authentification avec l'API.";
                } else if (error.message.includes('429')) {
                    errorMessage += "Trop de requêtes. Veuillez patienter un moment.";
                } else if (error.message.includes('500')) {
                    errorMessage += "Problème côté serveur. Réessayez dans quelques instants.";
                } else {
                    errorMessage += "Veuillez réessayer dans quelques instants.";
                }
                
                this.addMessage(errorMessage, 'bot');
            }
        }

        addMessage(content, sender) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `moodle-message ${sender}`;
            
            const messageContent = document.createElement('div');
            messageContent.className = 'moodle-message-content';
            messageContent.innerHTML = `
                ${content}
                <div class="moodle-message-time">${this.getCurrentTime()}</div>
            `;
            
            messageDiv.appendChild(messageContent);
            this.messagesContainer.appendChild(messageDiv);
            
            // Scroll vers le bas
            this.scrollToBottom();
        }

        simulateTyping() {
            if (this.isTyping) return;
            
            this.isTyping = true;
            this.sendButton.disabled = true;
            
            const typingDiv = document.createElement('div');
            typingDiv.className = 'moodle-typing-indicator';
            typingDiv.id = 'moodleTypingIndicator';
            typingDiv.innerHTML = `
                Assistant en train d'écrire...
                <div class="moodle-typing-dots">
                    <div class="moodle-typing-dot"></div>
                    <div class="moodle-typing-dot"></div>
                    <div class="moodle-typing-dot"></div>
                </div>
            `;
            
            this.messagesContainer.appendChild(typingDiv);
            this.scrollToBottom();
        }

        stopTyping() {
            // Supprimer l'indicateur de frappe
            const typingIndicator = document.getElementById('moodleTypingIndicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            this.isTyping = false;
            this.sendButton.disabled = false;
        }

        // Fonction pour configurer la clé API
        setApiKey(apiKey) {
            this.apiKey = apiKey;
        }

        // Fonction pour personnaliser le message système
        setSystemMessage(message) {
            this.systemMessage.content = message;
            this.conversationHistory[0] = this.systemMessage;
        }

        // Fonction pour mettre à jour le contexte de la page
        updatePageContext() {
            const pageContext = this.extractPageContext();
            this.systemMessage.content = `Tu es un assistant virtuel utile et amical intégré dans un site web Moodle. Réponds de manière concise et claire. Adapte ton ton au contexte et aide les utilisateurs de la meilleure façon possible.

CONTEXTE DE LA PAGE ACTUELLE:
${pageContext}

Utilise ces informations pour fournir des réponses pertinentes et contextuelles aux utilisateurs. Si un utilisateur pose une question en rapport avec le contenu de la page, tu peux t'y référer directement.`;
            
            this.conversationHistory[0] = this.systemMessage;
            console.log('Contexte de la page mis à jour:', pageContext);
        }

        // Fonction pour vider l'historique de conversation
        clearConversation() {
            this.conversationHistory = [this.systemMessage];
            // Optionnel: vider aussi l'affichage
            this.messagesContainer.innerHTML = `
                <div class="moodle-message bot">
                    <div class="moodle-message-content">
                        Bonjour, je suis l'assistant de la Grande Classe. Comment puis-je vous aider aujourd'hui ?
                        <div class="moodle-message-time">${this.getCurrentTime()}</div>
                    </div>
                </div>
            `;
        }

        scrollToBottom() {
            setTimeout(() => {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }, 100);
        }
    }

    // Initialisation
    const initializeChatbox = () => {
        // Injecter les styles
        injectStyles();
        
        // Créer et ajouter les éléments
        const chatboxElements = createChatboxElements();
        document.body.appendChild(chatboxElements);
        
        // Initialiser la chatbox
        window.moodleChatboxInstance = new MoodleFloatingChatbox();
    };

    // API publique
    window.MoodleChatbox = {
        // Fonction pour ouvrir/fermer le chat
        toggleChat: function() {
            if (window.moodleChatboxInstance) {
                window.moodleChatboxInstance.toggleChat();
            }
        },

        // Fonction pour ouvrir le chat
        openChat: function() {
            if (window.moodleChatboxInstance) {
                window.moodleChatboxInstance.openChat();
            }
        },

        // Fonction pour fermer le chat
        closeChat: function() {
            if (window.moodleChatboxInstance) {
                window.moodleChatboxInstance.closeChat();
            }
        },
        
        // Fonction pour ajouter un message programmatiquement
        addMessage: function(content, sender = 'bot') {
            if (window.moodleChatboxInstance) {
                window.moodleChatboxInstance.addMessage(content, sender);
            }
        },
        
        // Configurer la clé API DeepSeek
        setApiKey: function(apiKey) {
            if (window.moodleChatboxInstance) {
                window.moodleChatboxInstance.setApiKey(apiKey);
            }
        },

        // Personnaliser le message système de l'IA
        setSystemMessage: function(message) {
            if (window.moodleChatboxInstance) {
                window.moodleChatboxInstance.setSystemMessage(message);
            }
        },

        // Vider l'historique de conversation
        clearConversation: function() {
            if (window.moodleChatboxInstance) {
                window.moodleChatboxInstance.clearConversation();
            }
        },

        // Obtenir l'historique de conversation
        getConversationHistory: function() {
            if (window.moodleChatboxInstance) {
                return window.moodleChatboxInstance.conversationHistory.filter(msg => msg.role !== 'system');
            }
            return [];
        },

        // Mettre à jour le contexte de la page manuellement
        updatePageContext: function() {
            if (window.moodleChatboxInstance) {
                window.moodleChatboxInstance.updatePageContext();
            }
        },

        // Obtenir le contexte actuel de la page
        getPageContext: function() {
            if (window.moodleChatboxInstance) {
                return window.moodleChatboxInstance.extractPageContext();
            }
            return '';
        },

        // Debug: afficher le contexte extrait dans la console
        debugPageContext: function() {
            if (window.moodleChatboxInstance) {
                const context = window.moodleChatboxInstance.extractPageContext();
                console.log('=== CONTEXTE DE LA PAGE ===');
                console.log(context);
                console.log('=== FIN DU CONTEXTE ===');
                return context;
            }
        }
    };

    // Attendre que le DOM soit chargé
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChatbox);
    } else {
        initializeChatbox();
    }

})();