// YouTube Downloader AI Script
class YouTubeDownloaderAI {
    constructor() {
        this.videoData = null;
        this.chatHistory = [];
        this.isAiChatOpen = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStoredData();
        this.initializeAI();
    }

    bindEvents() {
        // Main downloader events
        document.getElementById('downloadBtn').addEventListener('click', () => this.getVideoInfo());
        document.getElementById('youtubeUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.getVideoInfo();
        });

        // AI Assistant events
        document.getElementById('aiToggle').addEventListener('click', () => this.toggleAiChat());
        document.getElementById('closeChatBtn').addEventListener('click', () => this.toggleAiChat());
        document.getElementById('sendAiMessage').addEventListener('click', () => this.sendAiMessage());
        document.getElementById('aiMessageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendAiMessage();
        });

        // Auto-focus URL input
        window.addEventListener('load', () => {
            document.getElementById('youtubeUrl').focus();
        });
    }

    loadStoredData() {
        // Load stored Gemini API key
        const storedApiKey = this.getFromStorage('gemini_api_key');
        if (storedApiKey) {
            document.getElementById('geminiApiKey').value = storedApiKey;
        }

        // Load stored downloader API config
        const storedApiUrl = this.getFromStorage('downloader_api_url');
        const storedApiKey2 = this.getFromStorage('downloader_api_key');
        
        if (storedApiUrl) document.getElementById('apiUrl').value = storedApiUrl;
        if (storedApiKey2) document.getElementById('apiKey').value = storedApiKey2;
    }

    getFromStorage(key) {
        // Using sessionStorage fallback since localStorage is not available
        try {
            return sessionStorage.getItem(key) || '';
        } catch {
            return '';
        }
    }

    setToStorage(key, value) {
        try {
            sessionStorage.setItem(key, value);
        } catch {
            // Silent fail if storage not available
        }
    }

    // ===== YouTube Downloader Functions =====
    
    showLoading(show = true) {
        const loading = document.getElementById('loading');
        const btn = document.getElementById('downloadBtn');
        
        loading.style.display = show ? 'flex' : 'none';
        btn.disabled = show;
        btn.textContent = show ? 'Memproses...' : 'Dapatkan Info Video';
    }

    showMessage(message, type = 'error') {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        
        if (type === 'error') {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            successDiv.style.display = 'none';
            setTimeout(() => errorDiv.style.display = 'none', 5000);
        } else {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            errorDiv.style.display = 'none';
            setTimeout(() => successDiv.style.display = 'none', 3000);
        }
    }

    hideVideoInfo() {
        document.getElementById('videoInfo').style.display = 'none';
    }

    async getVideoInfo() {
        const url = document.getElementById('youtubeUrl').value.trim();
        const apiUrl = document.getElementById('apiUrl').value.trim();
        const apiKey = document.getElementById('apiKey').value.trim();

        if (!url) {
            this.showMessage('Mohon masukkan URL YouTube yang valid');
            return;
        }

        if (!apiUrl) {
            this.showMessage('Mohon masukkan URL API Anda');
            return;
        }

        if (!this.isValidYouTubeUrl(url)) {
            this.showMessage('URL YouTube tidak valid');
            return;
        }

        // Store API config
        this.setToStorage('downloader_api_url', apiUrl);
        this.setToStorage('downloader_api_key', apiKey);

        this.showLoading(true);
        this.hideVideoInfo();

        try {
            const requestData = {
                url: url,
                action: 'info'
            };

            const headers = {
                'Content-Type': 'application/json'
            };

            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            this.videoData = data;
            this.displayVideoInfo(data);
            
        } catch (error) {
            console.error('Error:', error);
            this.showMessage(`Error: ${error.message}`);
            
            // Ask AI for help with the error
            this.addAiSuggestion(`Terjadi error saat mengambil info video: ${error.message}. Apakah Anda perlu bantuan troubleshooting?`);
        } finally {
            this.showLoading(false);
        }
    }

    displayVideoInfo(data) {
        const videoInfo = document.getElementById('videoInfo');
        const thumbnail = document.getElementById('videoThumbnail');
        const title = document.getElementById('videoTitle');
        const duration = document.getElementById('videoDuration');
        const qualityOptions = document.getElementById('qualityOptions');

        thumbnail.src = data.thumbnail || data.thumb || '';
        title.textContent = data.title || 'Video Title';
        duration.textContent = `Durasi: ${data.duration || 'N/A'}`;

        qualityOptions.innerHTML = '';

        const formats = data.formats || data.links || [];
        
        if (formats.length > 0) {
            formats.forEach(format => {
                const btn = document.createElement('a');
                btn.className = 'quality-btn';
                btn.href = format.url || format.download_url;
                btn.target = '_blank';
                btn.download = '';
                btn.textContent = `${format.quality || format.resolution || 'Unknown'} ${format.ext || format.format || ''}`.trim();
                
                qualityOptions.appendChild(btn);
            });
        } else {
            const btn = document.createElement('a');
            btn.className = 'quality-btn';
            btn.href = data.download_url || data.url || '#';
            btn.target = '_blank';
            btn.download = '';
            btn.textContent = 'Download';
            qualityOptions.appendChild(btn);
        }

        videoInfo.style.display = 'block';
        this.showMessage('Info video berhasil didapatkan!', 'success');
        
        // Add AI suggestion
        this.addAiSuggestion(`Video "${data.title || 'Unknown'}" berhasil diproses! Pilih kualitas yang Anda inginkan untuk download.`);
    }

    isValidYouTubeUrl(url) {
        const patterns = [
            /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/,
            /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=/
        ];
        
        return patterns.some(pattern => pattern.test(url));
    }

    // ===== AI Assistant Functions =====
    
    initializeAI() {
        // Add initial AI message
        this.addAiMessage("Halo! Saya asisten AI Anda. Saya bisa membantu Anda dengan YouTube downloader ini. Silakan tanya apa saja!");
    }

    toggleAiChat() {
        const panel = document.getElementById('aiChatPanel');
        this.isAiChatOpen = !this.isAiChatOpen;
        panel.style.display = this.isAiChatOpen ? 'flex' : 'none';
        
        if (this.isAiChatOpen) {
            document.getElementById('aiMessageInput').focus();
        }
    }

    async sendAiMessage() {
        const input = document.getElementById('aiMessageInput');
        const message = input.value.trim();
        const apiKey = document.getElementById('geminiApiKey').value.trim();
        
        if (!message) return;

        if (!apiKey) {
            this.addAiMessage("Mohon masukkan Gemini API Key terlebih dahulu untuk menggunakan AI Assistant.");
            return;
        }

        // Store API key
        this.setToStorage('gemini_api_key', apiKey);

        // Add user message
        this.addUserMessage(message);
        input.value = '';

        // Show typing indicator
        this.showTypingIndicator(true);

        try {
            const response = await this.callGeminiAPI(message, apiKey);
            this.addAiMessage(response);
        } catch (error) {
            console.error('AI Error:', error);
            this.addAiMessage("Maaf, terjadi error saat berkomunikasi dengan AI. Pastikan API Key Anda valid.");
        } finally {
            this.showTypingIndicator(false);
        }
    }

    async callGeminiAPI(message, apiKey) {
        // Build context with chat history and current app state
        const context = this.buildAIContext();
        const fullMessage = `${context}\n\nUser: ${message}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: fullMessage
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.candidates[0]?.content?.parts[0]?.text || "Maaf, saya tidak bisa memberikan respons saat ini.";
    }

    buildAIContext() {
        let context = `Anda adalah asisten AI untuk aplikasi YouTube Downloader. Anda membantu user dengan:
1. Cara menggunakan YouTube downloader
2. Troubleshooting masalah download
3. Menjelaskan fitur-fitur aplikasi
4. Tips dan trik penggunaan

Status aplikasi saat ini:`;

        // Add current app state
        const youtubeUrl = document.getElementById('youtubeUrl').value;
        const apiUrl = document.getElementById('apiUrl').value;
        
        if (youtubeUrl) {
            context += `\n- URL YouTube: ${youtubeUrl}`;
        }
        
        if (apiUrl) {
            context += `\n- API URL: ${apiUrl}`;
        }
        
        if (this.videoData) {
            context += `\n- Video terdeteksi: ${this.videoData.title || 'Unknown'}`;
        }

        context += `\n\nJawab dalam bahasa Indonesia dengan ramah dan membantu. Berikan saran praktis dan mudah dipahami.`;

        return context;
    }

    addUserMessage(message) {
        const messagesContainer = document.getElementById('aiChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'user-message';
        messageDiv.innerHTML = `
            <div class="ai-avatar">AI</div>
            <div class="ai-message-content">${this.formatAiMessage(message)}</div>
        `;
        messagesContainer.appendChild(messageDiv);
        this.scrollChatToBottom();
        
        // Store in chat history
        this.chatHistory.push({ type: 'ai', message: message, timestamp: Date.now() });
    }

    addAiSuggestion(message) {
        if (!this.isAiChatOpen) {
            // Show notification on AI toggle button
            const toggle = document.getElementById('aiToggle');
            toggle.style.background = 'linear-gradient(45deg, #e17055, #d63031)';
            setTimeout(() => {
                toggle.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
            }, 3000);
        }
        
        this.addAiMessage(`💡 Saran: ${message}`);
    }

    formatAiMessage(message) {
        // Convert markdown-like formatting to HTML
        let formatted = this.escapeHtml(message);
        
        // Bold text
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italic text
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Simple lists
        formatted = formatted.replace(/^\- (.+)$/gm, '• $1');
        
        return formatted;
    }

    showTypingIndicator(show) {
        const messagesContainer = document.getElementById('aiChatMessages');
        const existingIndicator = messagesContainer.querySelector('.typing-indicator');
        
        if (show && !existingIndicator) {
            const indicator = document.createElement('div');
            indicator.className = 'typing-indicator ai-message';
            indicator.innerHTML = `
                <div class="ai-avatar">AI</div>
                <div class="ai-message-content">
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                    Sedang mengetik...
                </div>
            `;
            messagesContainer.appendChild(indicator);
            this.scrollChatToBottom();
        } else if (!show && existingIndicator) {
            existingIndicator.remove();
        }
    }

    scrollChatToBottom() {
        const messagesContainer = document.getElementById('aiChatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== AI Helper Functions for specific use cases =====
    
    getAIHelpForError(error) {
        const commonErrors = {
            'network': 'Periksa koneksi internet Anda dan pastikan URL API dapat diakses.',
            'cors': 'Error CORS - API mungkin perlu dikonfigurasi untuk mengizinkan akses dari browser.',
            '401': 'Error autentikasi - periksa API key Anda.',
            '404': 'URL API tidak ditemukan - periksa kembali URL yang Anda masukkan.',
            '500': 'Error server - coba lagi dalam beberapa saat.',
            'timeout': 'Koneksi timeout - coba dengan URL yang lebih pendek atau periksa koneksi.'
        };

        for (const [key, suggestion] of Object.entries(commonErrors)) {
            if (error.toLowerCase().includes(key)) {
                return suggestion;
            }
        }

        return 'Terjadi error yang tidak diketahui. Coba periksa konsol browser untuk detail lebih lanjut.';
    }

    // ===== Quick AI Responses =====
    
    getQuickHelp(topic) {
        const helpTopics = {
            'api': 'Untuk menggunakan downloader ini, Anda perlu:\n1. Masukkan URL API YouTube downloader Anda\n2. Tambahkan API Key jika diperlukan\n3. Paste URL YouTube\n4. Klik "Dapatkan Info Video"',
            'url': 'Format URL YouTube yang valid:\n• https://www.youtube.com/watch?v=VIDEO_ID\n• https://youtu.be/VIDEO_ID\n• https://youtube.com/embed/VIDEO_ID',
            'quality': 'Setelah video diproses, Anda akan melihat opsi kualitas yang tersedia. Pilih sesuai kebutuhan:\n• HD untuk kualitas terbaik\n• SD untuk file lebih kecil\n• Audio only untuk musik',
            'error': 'Jika terjadi error, coba:\n1. Periksa URL YouTube\n2. Pastikan API URL benar\n3. Cek koneksi internet\n4. Refresh halaman dan coba lagi'
        };

        return helpTopics[topic] || 'Maaf, saya tidak memiliki bantuan khusus untuk topik tersebut. Silakan tanyakan pertanyaan spesifik!';
    }
}

// Initialize the application
const app = new YouTubeDownloaderAI();

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeDownloaderAI;
}="user-avatar">U</div>
            <div class="user-message-content">${this.escapeHtml(message)}</div>
        `;
        messagesContainer.appendChild(messageDiv);
        this.scrollChatToBottom();
        
        // Store in chat history
        this.chatHistory.push({ type: 'user', message: message, timestamp: Date.now() });
    }

    addAiMessage(message) {
        const messagesContainer = document.getElementById('aiChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message';
        messageDiv.innerHTML = `
            <div class