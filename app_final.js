/* === ARQUIVO app_final.js (VERSÃO FINAL V10.1 - CORREÇÃO TOTAL MODULES) === */

document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
// SISTEMA TÁTICO DE BUSCA EM TEMPO REAL (BLINDADO)
// ============================================================
const normalizeSearchText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

const userMatchesSearch = (user, searchTerm) => {
    const term = normalizeSearchText(searchTerm);
    const termDigits = onlyDigits(searchTerm);

    if (!term && !termDigits) return true;

    const fields = [
        user?.name,
        user?.email,
        user?.cpf,
        user?.phone,
        user?.company,
        user?.courseType,
        user?.status,
        user?.planType
    ];

    const textMatch = term && fields.some(field => normalizeSearchText(field).includes(term));
    const digitMatch = termDigits && [user?.cpf, user?.phone].some(field => onlyDigits(field).includes(termDigits));

    return Boolean(textMatch || digitMatch);
};

window.filterAdminTable = function() {
    const input = document.getElementById('admin-search-input');
    if (!input) return;
    const termo = normalizeSearchText(input.value);
    const termoDigits = onlyDigits(input.value);
    const linhas = document.querySelectorAll('#admin-table-body tr');
    linhas.forEach(linha => {
        const rowText = normalizeSearchText(linha.innerText);
        const rowDigits = onlyDigits(linha.innerText);
        const matchesEmpty = !termo && !termoDigits;
        const matchesText = termo && rowText.includes(termo);
        const matchesDigits = termoDigits && rowDigits.includes(termoDigits);
        linha.style.display = (matchesEmpty || matchesText || matchesDigits) ? '' : 'none';
    });
};

window.filterManagerTable = function() {
    const input = document.getElementById('manager-search-input');
    const select = document.getElementById('mgr-filter-turma');
    const selectedTurma = select ? select.value : 'TODOS';
    
    if (!window.managerCachedUsers) return;

    let filteredList = window.managerCachedUsers;

    // Filtra por Turma do Select
    if (selectedTurma !== 'TODOS') {
        filteredList = window.managerCachedUsers.filter(u => u.company === selectedTurma);
    }

    // Filtra por Texto do Input (Nome, Email ou CPF)
    if (input && input.value) {
        filteredList = filteredList.filter(u => userMatchesSearch(u, input.value));
    }

    // Chama o renderizador da sua tabela passando os dados filtrados
    if (typeof renderManagerTable === 'function') {
        renderManagerTable(filteredList);
    }
};

// Deixa o documento inteiro escutando a digitação (Evita perder o ouvinte)
document.body.addEventListener('input', (e) => {
    if (e.target.id === 'admin-search-input') {
        window.filterAdminTable();
    }
    if (e.target.id === 'manager-search-input') {
        window.filterManagerTable();
    }
});

    // --- VARIÁVEIS GLOBAIS DO APP ---
    const contentArea = document.getElementById('content-area');
   
    // Adicione isso junto com as variáveis globais no topo do app_final.js
    let managerUnsubscribe = null; // Variável para guardar o listener do Firestore
    // CORREÇÃO AQUI: Definindo a variável globalmente
    let totalModules = 0; 
    
    let completedModules = JSON.parse(localStorage.getItem('gateBombeiroCompletedModules_v3')) || [];
    let notifiedAchievements = JSON.parse(localStorage.getItem('gateBombeiroNotifiedAchievements_v3')) || [];
    let currentModuleId = null;
    let cachedQuestionBanks = {}; 
    let currentUserData = null; 
    window.__getCurrentUserData = () => currentUserData;

    // --- VARIÁVEIS PARA O SIMULADO ---
    let simuladoTimerInterval = null;
    let simuladoTimeLeft = 0;
    let activeSimuladoQuestions = [];
    let userAnswers = {};
    let currentSimuladoQuestionIndex = 0; 

    // --- VARIÁVEIS PARA MODO SOBREVIVÊNCIA ---
    let survivalLives = 3;
    let survivalScore = 0;
    let survivalQuestions = [];
    let currentSurvivalIndex = 0;

    // --- SELETORES DO DOM ---
    const toastContainer = document.getElementById('toast-container');
    const sidebar = document.getElementById('off-canvas-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const printWatermark = document.getElementById('print-watermark');
    const achievementModal = document.getElementById('achievement-modal');
    const achievementOverlay = document.getElementById('achievement-modal-overlay');
    const closeAchButton = document.getElementById('close-ach-modal');
    const breadcrumbContainer = document.getElementById('breadcrumb-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const adminBtn = document.getElementById('admin-panel-btn');
    const mobileAdminBtn = document.getElementById('mobile-admin-btn');
    const adminModal = document.getElementById('admin-modal');
    const adminOverlay = document.getElementById('admin-modal-overlay');
    const closeAdminBtn = document.getElementById('close-admin-modal');

    function showAppToast(title, message = '', type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast app-toast app-toast-${type}`;
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <div>
                <p class="font-bold">${title}</p>
                ${message ? `<p class="text-sm">${message}</p>` : ''}
            </div>
        `;
        if (toastContainer) toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }

    const OPTIONAL_PROGRESS_CATEGORIES = ['simulados', 'bonus'];

    function getVisibleModuleIds(userDataOverride = currentUserData, options = {}) {
        const ids = [];
        const includeOptional = options.includeOptional === true;
        const userType = userDataOverride ? (userDataOverride.courseType || 'BC') : 'BC';
        const isManager = userDataOverride ? (userDataOverride.isAdmin || userDataOverride.courseType === 'GESTOR') : false;

        for (const key in moduleCategories) {
            if (!includeOptional && OPTIONAL_PROGRESS_CATEGORIES.includes(key)) continue;
            const cat = moduleCategories[key];
            const prefix = cat.isSP ? 'sp_module' : 'module';
            for (let i = cat.range[0]; i <= cat.range[1]; i++) {
                const id = `${prefix}${i}`;
                const module = moduleContent[id];
                if (!module) continue;
                const isSpContent = id.startsWith('sp_');
                if (!isManager) {
                    if (userType === 'BC' && isSpContent) continue;
                    if (userType === 'SP' && !isSpContent) continue;
                }
                if (!ids.includes(id)) ids.push(id);
            }
        }
        return ids;
    }

    function getLearningStats() {
        const visibleIds = getVisibleModuleIds();
        const allVisibleIds = getVisibleModuleIds(currentUserData, { includeOptional: true });
        const doneCount = visibleIds.filter(id => completedModules.includes(id)).length;
        const total = visibleIds.length || totalModules || 1;
        const percent = Math.min(100, Math.round((doneCount / total) * 100));
        const lastModuleId = localStorage.getItem('gateBombeiroLastModule');
        const nextModuleId = visibleIds.find(id => !completedModules.includes(id)) || visibleIds[0] || 'module1';
        const lastModule = lastModuleId && moduleContent[lastModuleId] ? moduleContent[lastModuleId] : null;
        const nextModule = nextModuleId && moduleContent[nextModuleId] ? moduleContent[nextModuleId] : null;

        return {
            visibleIds,
            allVisibleIds,
            doneCount,
            total,
            percent,
            lastModuleId,
            nextModuleId,
            lastModule,
            nextModule,
            remaining: Math.max(total - doneCount, 0),
            achievementCount: notifiedAchievements.length
        };
    }

    // --- ACESSIBILIDADE ---
    const fab = document.getElementById('accessibility-fab');
    const menu = document.getElementById('accessibility-menu');
    let fontSizeScale = 1;

    fab?.addEventListener('click', () => menu.classList.toggle('show'));
    
    document.getElementById('acc-font-plus')?.addEventListener('click', () => {
        fontSizeScale += 0.1;
        document.documentElement.style.fontSize = (16 * fontSizeScale) + 'px';
    });
    document.getElementById('acc-font-minus')?.addEventListener('click', () => {
        if(fontSizeScale > 0.8) fontSizeScale -= 0.1;
        document.documentElement.style.fontSize = (16 * fontSizeScale) + 'px';
    });
    document.getElementById('acc-reset')?.addEventListener('click', () => {
        fontSizeScale = 1;
        document.documentElement.style.fontSize = '';
        document.body.classList.remove('dyslexic-font', 'high-spacing');
    });
    document.getElementById('acc-dyslexic')?.addEventListener('click', () => {
        document.body.classList.toggle('dyslexic-font');
    });
    document.getElementById('acc-spacing')?.addEventListener('click', () => {
        document.body.classList.toggle('high-spacing');
    });

    const moduleMediaAssets = {
        module1: {
            video: 'https://youtu.be/69Mf7EIcwX0',
            podcast: 'https://youtu.be/_RSS9OVq4oo',
            image: 'https://drive.google.com/file/d/1Ye9slmZwYnFCxD7LDdx3327zlEjJ66y5/view?usp=drive_link',
            pdf: 'https://drive.google.com/file/d/1ul41MQLCxaXl8orNZRPfDbtcM0Ere3lA/view?usp=drive_link'
        },
        module2: {
            video: 'https://youtu.be/eXHZXWFwthg',
            podcast: 'https://drive.google.com/file/d/1noh9MpMcl6AqkqE5YpshKUIucoVxy5DM/view?usp=drive_link',
            image: 'https://drive.google.com/file/d/1HisK_t_623lAmJDegx7Srqou08Jmjnou/view?usp=drive_link',
            pdf: 'https://drive.google.com/file/d/1RcAdLq8o2TPLKEVjHmFIHm94TKz2BOxn/view?usp=drive_link'
        },
        module3: {
            video: 'https://youtu.be/xPkPzw47FrM',
            podcast: 'https://drive.google.com/file/d/1NkOSBTtyjVNFrRUvW4wA4cwu5BNOZaz4/view?usp=drive_link',
            image: 'https://drive.google.com/file/d/1pHfPehN0Kt0X8m8aZWHEbyIFSzOk6o17/view?usp=drive_link',
            pdf: 'https://drive.google.com/file/d/1RflOdfARGlO8WuF3vOyF_C4QGhBPoNyw/view?usp=drive_link'
        },
        module4: {
            video: 'https://youtu.be/FqWq_ld2XCw',
            podcast: 'https://drive.google.com/file/d/1cnoEBd5OufF0amJc1_eE-BQH91zoCRqj/view?usp=drive_link',
            image: 'https://drive.google.com/file/d/14ozjs37wbfJsnFaJkmEU8zzLaLe10UN-/view?usp=drive_link',
            pdf: 'https://drive.google.com/file/d/1mmsd1a_AT6paPuLssv8a4OiTuMvg1S7z/view?usp=drive_link'
        },
        module5: {
            video: 'https://youtu.be/0EtdlXCklZ8',
            podcast: 'https://drive.google.com/file/d/1v9B1fgOPkWK8uWLZIM_PndV6oH7RyLiV/view?usp=drive_link',
            image: 'https://drive.google.com/file/d/1_G8ckymyPV_G2DL_qu5dkUnSdztvCWHw/view?usp=drive_link',
            pdf: 'https://drive.google.com/file/d/1xLPNu15F74dK6bXXCq4jmsNgXee-ZYVR/view?usp=drive_link'
        }
    };

    function getModuleMediaAssets(id) {
        return moduleMediaAssets[id] || null;
    }

    function assetUrl(path) {
        return encodeURI(path);
    }

    function getDriveFileId(url) {
        if (!url || typeof url !== 'string') return null;
        const fileMatch = url.match(/\/file\/d\/([^/]+)/);
        if (fileMatch) return fileMatch[1];
        const idMatch = url.match(/[?&]id=([^&]+)/);
        return idMatch ? idMatch[1] : null;
    }

    function isDriveFile(url) {
        return Boolean(getDriveFileId(url));
    }

    function drivePreviewUrl(url) {
        const id = getDriveFileId(url);
        return id ? `https://drive.google.com/file/d/${id}/preview` : assetUrl(url);
    }

    function driveOpenUrl(url) {
        const id = getDriveFileId(url);
        return id ? `https://drive.google.com/file/d/${id}/view` : assetUrl(url);
    }

    function driveThumbnailUrl(url) {
        const id = getDriveFileId(url);
        return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1600` : assetUrl(url);
    }

    function driveDirectUrl(url) {
        const id = getDriveFileId(url);
        return id ? `https://drive.usercontent.google.com/download?id=${id}&export=download&authuser=0` : assetUrl(url);
    }

    function driveLegacyDirectUrl(url) {
        const id = getDriveFileId(url);
        return id ? `https://drive.google.com/uc?export=download&id=${id}` : assetUrl(url);
    }

    function getYouTubeVideoId(url) {
        if (!url || typeof url !== 'string') return null;
        try {
            const parsed = new URL(url);
            if (parsed.hostname.includes('youtu.be')) {
                return parsed.pathname.replace('/', '').split('?')[0] || null;
            }
            if (parsed.hostname.includes('youtube.com')) {
                if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/')[2] || null;
                if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/')[2] || null;
                return parsed.searchParams.get('v');
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    function isYouTubeUrl(url) {
        return Boolean(getYouTubeVideoId(url));
    }

    function youtubeEmbedUrl(url) {
        const id = getYouTubeVideoId(url);
        if (!id) return assetUrl(url);
        const params = new URLSearchParams({
            rel: '0',
            modestbranding: '1',
            playsinline: '1'
        });
        if (window.location.origin && window.location.origin !== 'null') {
            params.set('origin', window.location.origin);
        }
        return `https://www.youtube.com/embed/${id}?${params.toString()}`;
    }

    function getVideoEmbedHtml(url) {
        if (isYouTubeUrl(url)) {
            return `
                <iframe class="lesson-youtube-frame lesson-drive-video" src="${youtubeEmbedUrl(url)}" title="Vídeo da aula" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
            `;
        }
        if (isDriveFile(url)) {
            return `
                <iframe class="lesson-drive-frame lesson-drive-video" src="${drivePreviewUrl(url)}" title="Vídeo da aula" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>
                <a href="${driveOpenUrl(url)}" target="_blank" rel="noopener" class="lesson-pdf-link lesson-drive-open-link">
                    <i class="fas fa-up-right-from-square"></i> Abrir vídeo no Drive
                </a>
            `;
        }
        return `<video controls preload="metadata" playsinline src="${assetUrl(url)}"></video>`;
    }

    function getPodcastEmbedHtml(url) {
        if (isYouTubeUrl(url)) {
            return `
                <iframe class="lesson-youtube-frame lesson-drive-video lesson-youtube-podcast" src="${youtubeEmbedUrl(url)}" title="Podcast da aula" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
            `;
        }
        if (isDriveFile(url)) {
            return `
                <iframe class="lesson-drive-frame lesson-drive-audio" src="${drivePreviewUrl(url)}" title="Podcast da aula" allow="autoplay"></iframe>
                <a href="${driveOpenUrl(url)}" target="_blank" rel="noopener" class="lesson-pdf-link lesson-drive-open-link">
                    <i class="fas fa-up-right-from-square"></i> Abrir podcast no Drive
                </a>
            `;
        }
        return `<audio controls preload="metadata" src="${assetUrl(url)}"></audio>`;
    }

    function getImageEmbedHtml(url) {
        if (isDriveFile(url)) {
            return `
                <div class="lesson-image-preview lesson-drive-image-preview">
                    <iframe src="${drivePreviewUrl(url)}" title="Infográfico do módulo" loading="lazy"></iframe>
                </div>
                <a href="${driveOpenUrl(url)}" target="_blank" rel="noopener" class="lesson-pdf-link lesson-drive-open-link">
                    <i class="fas fa-up-right-from-square"></i> Abrir infográfico
                </a>
            `;
        }
        return `
            <div class="lesson-image-preview">
                <img src="${driveThumbnailUrl(url)}" alt="Infográfico do módulo" loading="lazy">
            </div>
        `;
    }

    function getPdfEmbedHtml(url) {
        return `
            <div class="lesson-pdf-preview">
                <iframe src="${drivePreviewUrl(url)}" title="Slides do módulo" allow="autoplay"></iframe>
            </div>
            <a href="${driveOpenUrl(url)}" target="_blank" rel="noopener" class="lesson-pdf-link">
                <i class="fas fa-up-right-from-square"></i> Abrir slides em tela cheia
            </a>
        `;
    }

    function getModuleMediaHtml(id, title) {
        const media = getModuleMediaAssets(id);
        if (!media) return '';

        return `
            <section class="lesson-media-suite" aria-label="Materiais da aula">
                <div class="lesson-media-heading">
                    <span><i class="fas fa-layer-group"></i> Materiais premium da aula</span>
                    <h4>Revise a aula com vídeo, podcast e slides</h4>
                    <p>Conteúdo complementar organizado para reforçar ${title.replace(/^\d+\.\s*/, '')} depois da leitura e dos exercícios.</p>
                </div>
                <div class="lesson-media-grid">
                    <article class="lesson-media-card lesson-video-card">
                        <div class="lesson-media-card-title">
                            <i class="fas fa-circle-play"></i>
                            <div>
                                <strong>Vídeo da aula</strong>
                                <span>Explicação completa em formato visual</span>
                            </div>
                        </div>
                        ${getVideoEmbedHtml(media.video)}
                    </article>
                    <article class="lesson-media-card lesson-podcast-card">
                        <div class="lesson-media-card-title">
                            <i class="fas fa-podcast"></i>
                            <div>
                                <strong>Podcast da aula</strong>
                                <span>Resumo para ouvir no deslocamento</span>
                            </div>
                        </div>
                        ${getPodcastEmbedHtml(media.podcast)}
                    </article>
                    <article class="lesson-media-card lesson-image-card">
                        <div class="lesson-media-card-title">
                            <i class="fas fa-chart-simple"></i>
                            <div>
                                <strong>Infográfico</strong>
                                <span>Mapa visual dos pontos principais</span>
                            </div>
                        </div>
                        ${getImageEmbedHtml(media.image)}
                    </article>
                    <article class="lesson-media-card lesson-pdf-card">
                        <div class="lesson-media-card-title">
                            <i class="fas fa-file-powerpoint"></i>
                            <div>
                                <strong>Slides da apresentação</strong>
                                <span>Material para leitura e revisão</span>
                            </div>
                        </div>
                        ${getPdfEmbedHtml(media.pdf)}
                    </article>
                </div>
            </section>
        `;
    }

    // --- AUDIOBOOK (COM PAUSE, RESUME E STOP) ---
    window.speakContent = function() {
        if (!currentModuleId || !moduleContent[currentModuleId]) return;
        
        const speedSelect = document.getElementById('audio-speed');
        const rate = speedSelect ? parseFloat(speedSelect.value) : 1.0;
        const btnIcon = document.getElementById('audio-btn-icon');
        const btnText = document.getElementById('audio-btn-text');
        const mainBtn = document.getElementById('audio-main-btn');
        const synth = window.speechSynthesis;

        // Cenario 1: Está falando -> PAUSAR
        if (synth.speaking && !synth.paused) {
            synth.pause();
            if(btnIcon) { btnIcon.className = 'fas fa-play'; } // Ícone muda para Play
            if(btnText) btnText.textContent = 'Continuar';
            return;
        }

        // Cenario 2: Está pausado -> RETOMAR
        if (synth.paused) {
            synth.resume();
            if(btnIcon) { btnIcon.className = 'fas fa-pause'; } // Ícone muda para Pause
            if(btnText) btnText.textContent = 'Pausar';
            return;
        }

        // Cenario 3: Não está falando -> INICIAR (Ou reiniciar se houver lixo na memória)
        if(synth.speaking) synth.cancel(); 

        const div = document.createElement('div');
        div.innerHTML = moduleContent[currentModuleId].content;
        const cleanText = div.textContent || div.innerText || "";

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'pt-BR';
        utterance.rate = rate;

        utterance.onstart = () => {
            if(btnIcon) btnIcon.className = 'fas fa-pause';
            if(btnText) btnText.textContent = 'Pausar';
            if(mainBtn) mainBtn.classList.add('playing');
            
            // Cria o botão de STOP (Quadrado Vermelho) dinamicamente se não existir
            if (!document.getElementById('audio-stop-btn')) {
                const stopBtn = document.createElement('button');
                stopBtn.id = 'audio-stop-btn';
                stopBtn.className = 'audio-icon-btn bg-red-600 hover:bg-red-500 text-white ml-2';
                stopBtn.innerHTML = '<i class="fas fa-stop"></i>';
                stopBtn.title = "Parar e Resetar";
                stopBtn.onclick = (e) => {
                    e.stopPropagation(); // Evita clicar no container
                    synth.cancel();
                    stopBtn.remove();
                    // Reseta o botão principal
                    if(btnIcon) btnIcon.className = 'fas fa-headphones';
                    if(btnText) btnText.textContent = 'Ouvir Aula';
                    if(mainBtn) mainBtn.classList.remove('playing');
                };
                // Insere o botão de stop ao lado do select de velocidade
                const playerContainer = document.querySelector('.modern-audio-player');
                if(playerContainer) playerContainer.appendChild(stopBtn);
            }
        };

        utterance.onend = () => {
            if(btnIcon) btnIcon.className = 'fas fa-headphones';
            if(btnText) btnText.textContent = 'Ouvir Aula';
            if(mainBtn) mainBtn.classList.remove('playing');
            const stopBtn = document.getElementById('audio-stop-btn');
            if(stopBtn) stopBtn.remove();
        };

        synth.speak(utterance);
    };

    // --- INSTALL PWA ---
    let deferredPrompt;
    const installBtn = document.getElementById('install-app-btn');
    const installBtnMobile = document.getElementById('install-app-btn-mobile');
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIos) {
        if(installBtn) installBtn.classList.remove('hidden'); 
        if(installBtnMobile) installBtnMobile.classList.remove('hidden');
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if(installBtn) installBtn.classList.remove('hidden'); 
      if(installBtnMobile) installBtnMobile.classList.remove('hidden'); 
    });

    window.addEventListener('appinstalled', () => {
        if(installBtn) installBtn.classList.add('hidden');
        if(installBtnMobile) installBtnMobile.classList.add('hidden');
        deferredPrompt = null;
    });

    async function triggerInstall() {
        if (isIos) {
            const iosModal = document.getElementById('ios-install-modal');
            const iosOverlay = document.getElementById('ios-modal-overlay');
            if (iosModal && iosOverlay) {
                iosModal.classList.add('show');
                iosOverlay.classList.add('show');
                
                document.getElementById('close-ios-modal')?.addEventListener('click', () => {
                    iosModal.classList.remove('show');
                    iosOverlay.classList.remove('show');
                });
                iosOverlay.addEventListener('click', () => {
                    iosModal.classList.remove('show');
                    iosOverlay.classList.remove('show');
                });
            } else {
                alert("Para instalar no iPhone:\nToque em Compartilhar (quadrado com seta).\nToque em 'Adicionar à Tela de Início'.");
            }
        } else if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                if(installBtn) installBtn.classList.add('hidden');
                if(installBtnMobile) installBtnMobile.classList.add('hidden');
            }
            deferredPrompt = null;
        } else {
            alert("Para instalar:\nProcure o ícone de instalação na barra de endereço ou menu.");
        }
    }

    if(installBtn) installBtn.addEventListener('click', triggerInstall);
    if(installBtnMobile) installBtnMobile.addEventListener('click', triggerInstall);

    if (typeof moduleContent === 'undefined' || typeof moduleCategories === 'undefined') {
    console.warn("⚠️ Conteúdo do curso ainda não carregado. Mantendo apenas a capa.");
    document.getElementById('main-header')?.classList.add('hidden');
    document.querySelector('footer')?.classList.add('hidden');
    // NÃO dá return aqui, deixa o restante do init continuar
}

function init() {
    // ========================================
    // AGUARDA O FIREBASE CARREGAR
    // ========================================
    if (typeof firebase === 'undefined') {
        console.warn("⚠️ Firebase não carregado ainda. Aguardando...");
        setTimeout(init, 500); // Tenta novamente em 0.5 segundos
        return;
    }
    
    console.log("✅ Firebase carregado! Iniciando sistema...");
    document.body.classList.add('landing-active');
    
    // ---> ADICIONE ISSO AQUI:
    setTimeout(initScrollReveal, 100); // Inicia os observadores de animação
    
        setupProtection();
        setupTheme();
        
        const firebaseConfig = {
          apiKey: "AIzaSyDNet1QC72jr79u8JpnFMLBoPI26Re6o3g",
          authDomain: "projeto-bravo-charlie-app.firebaseapp.com",
          projectId: "projeto-bravo-charlie-app",
          storageBucket: "projeto-bravo-charlie-app.firebasestorage.app",
          messagingSenderId: "26745008470",
          appId: "1:26745008470:web:5f25965524c646b3e666f7",
          measurementId: "G-Y7VZFQ0D9F"
        };
        
        if (typeof FirebaseCourse !== 'undefined') {
           FirebaseCourse.init(firebaseConfig);

// garante alias global para não dar undefined
window.fbDB = window.__fbDB || null;
window.fbAuth = window.__fbAuth || null;

            // Aguarda o Firebase estar pronto
setTimeout(() => {
    if (window.fbDB) {
        console.log("✅ Firebase inicializado com sucesso!");
    } else {
        console.warn("⚠️ Firebase ainda não inicializou. Aguardando...");
        setTimeout(() => {
            if (window.fbDB) {
                console.log("✅ Firebase inicializado (2ª tentativa)!");
            }
        }, 3000);
    }
}, 2000);

            setupAuthEventListeners(); 
            
            // LÓGICA DE LOGOUT BLINDADA
            const handleLogout = async () => {
                window.clearLocalUserData(); // <--- A MÁGICA ACONTECE AQUI
                await FirebaseCourse.signOutUser();
                window.location.reload(); // Recarrega a página para garantir estado zero
            };

            document.getElementById('logout-button')?.addEventListener('click', handleLogout);
            document.getElementById('logout-expired-button')?.addEventListener('click', handleLogout);
            document.getElementById('logout-button-header')?.addEventListener('click', handleLogout);

            // === CORREÇÃO CRÍTICA: LÓGICA DE LOGIN VS CAPA ===
            
            // 1. Garante que o modal de login comece FECHADO para exibir a capa
            const loginModal = document.getElementById('name-prompt-modal');
            const loginOverlay = document.getElementById('name-modal-overlay');
            if(loginModal) loginModal.classList.remove('show');
            if(loginOverlay) loginOverlay.classList.remove('show');

            // 2. Verifica se o usuário JÁ estava logado antes (Sessão salva)
            const isLogged = localStorage.getItem('my_session_id');

            if (isLogged) {
                // Se já tem sessão, faz a verificação silenciosa no fundo
                // O usuário vê a Capa, mas o sistema já vai logando por trás
                FirebaseCourse.checkAuth((user, userData) => {
                    onLoginSuccess(user, userData);
                });
            } 
            // SE NÃO TIVER SESSÃO, NÃO FAZ NADA! 
            // O modal só abrirá quando o usuário clicar em "ACESSAR PLATAFORMA" na capa.
        }
        
        setupHeaderScroll();
        setupRippleEffects();
        setupIamWidget();
    }

    function onLoginSuccess(user, userData) {
        // Remove capa e libera scroll
        const landing = document.getElementById('landing-hero');
        if (landing) landing.classList.add('hidden'); 
        document.body.classList.remove('landing-active'); 

        if (userData && user) {
            currentUserData = { ...userData, uid: user.uid };
        } else {
            currentUserData = userData;
        }

        if (document.body.getAttribute('data-app-ready') === 'true') return;
        
        document.getElementById('name-prompt-modal')?.classList.remove('show');
        document.getElementById('name-modal-overlay')?.classList.remove('show');
        document.getElementById('expired-modal')?.classList.remove('show');
        
        const greetingEl = document.getElementById('welcome-greeting');
        if(greetingEl) greetingEl.textContent = `Olá, ${userData.name.split(' ')[0]}!`;
        
        const printWatermark = document.getElementById('print-watermark');
        if (printWatermark) {
            printWatermark.textContent = `Licenciado para ${userData.name} (CPF: ${userData.cpf || '...'}) - Proibida a Cópia`;
        }

        // Admin e Gestor Buttons
        const adminBtn = document.getElementById('admin-panel-btn');
        const mobileAdminBtn = document.getElementById('mobile-admin-btn');
        const managerFab = document.getElementById("manager-fab");
        const iamWidget = document.getElementById('iam-ai-widget');

        if (iamWidget) iamWidget.classList.remove('hidden');

        if (userData.isAdmin === true) {
            if(adminBtn) adminBtn.classList.remove('hidden');
            if(mobileAdminBtn) mobileAdminBtn.classList.remove('hidden');
        }
        if (userData.isManager === true || userData.isAdmin === true) {
            if (managerFab) managerFab.classList.remove("hidden");
        }

        checkTrialStatus(userData.acesso_ate);

        // --- PROGRESSO SINCRONIZADO (CORRIGIDO) ---
        // Se o usuário tem dados na nuvem, usa a nuvem (Prioridade Máxima)
        if (userData.completedModules && Array.isArray(userData.completedModules)) {
            completedModules = userData.completedModules;
            // Atualiza o localStorage para ficar igual à nuvem
            localStorage.setItem('gateBombeiroCompletedModules_v3', JSON.stringify(completedModules));
            console.log("Progresso sincronizado da nuvem:", completedModules.length);
        } 
        // Se a nuvem está vazia, mas temos dados locais E parece ser o mesmo usuário (sessão), envia.
        // Se for um login fresco sem sessão anterior, ignoramos o local para evitar contaminação.
        else if (completedModules.length > 0 && localStorage.getItem('my_session_id') === userData.current_session_id) {
            console.log("Sincronizando progresso local para a nuvem...");
            saveProgressToCloud();
        } 
        else {
            // Se não tem na nuvem e não é sessão contínua, assume zero.
            completedModules = [];
            localStorage.removeItem('gateBombeiroCompletedModules_v3');
        }

        // Conta apenas os módulos que este usuário realmente pode acessar.
        totalModules = getVisibleModuleIds(currentUserData).length;
        // --------------------------------------------------

        // Atualiza a interface com o número correto
        const totalEl = document.getElementById('total-modules');
        const courseCountEl = document.getElementById('course-modules-count');
        if(totalEl) totalEl.textContent = totalModules;
        if(courseCountEl) courseCountEl.textContent = totalModules;
        
        populateModuleLists();
        updateProgress();
        addEventListeners(); 
        handleInitialLoad();
        startOnboardingTour(false); 

        localStorage.removeItem("open_manager_after_login");
    // --- TRAVA DE SEGURANÇA (ADICIONE ISTO AQUI) ---
        // Isso impede que os botões sejam duplicados quando o banco atualiza
        document.body.setAttribute('data-app-ready', 'true');

    }
    
// --- FUNÇÕES ADMIN (ATUALIZADAS E LEGÍVEIS) ---
window.openAdminPanel = async function() {
    if (!currentUserData || !currentUserData.isAdmin) return;

    const adminModal = document.getElementById('admin-modal');
    const adminOverlay = document.getElementById('admin-modal-overlay');
    
    adminModal.classList.add('show');
    adminOverlay.classList.add('show');

    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center">Carregando usuários...</td></tr>';

    const db = window.__fbDB || window.fbDB;
    if (!db) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-red-500">Banco de dados não carregado.</td></tr>';
        return;
    }

    try {
        const snapshot = await db.collection('users').get();
        tbody.innerHTML = '';

        let users = [];
        snapshot.forEach(doc => {
            const u = doc.data();
            const uid = doc.id;
            users.push({ uid, data: u });
        });

        // Ordena alfabeticamente
        users.sort((a, b) => {
            const na = (a.data.name || '').toLocaleLowerCase('pt-BR');
            const nb = (b.data.name || '').toLocaleLowerCase('pt-BR');
            return na.localeCompare(nb, 'pt-BR');
        });

        let stats = { total: 0, premium: 0, trial: 0 };

        users.forEach(({ uid, data: u }) => {
            stats.total++;
            if (u.status === 'premium') stats.premium++;
            else stats.trial++;

            // --- LÓGICA DE STATUS ---
            let statusDisplay = u.status || 'trial';
            let statusColor = 'bg-gray-100 text-gray-800';
            const validade = u.acesso_ate ? new Date(u.acesso_ate) : null;
            const isExpired = validade && new Date() > validade;
            const validadeStr = validade ? validade.toLocaleDateString('pt-BR') : '-';

            if (u.status === 'premium') {
                if (isExpired) {
                    statusDisplay = 'EXPIRADO';
                    statusColor = 'bg-red-100 text-red-800';
                } else {
                    statusColor = 'bg-green-100 text-green-800';
                }
            } else {
                statusColor = 'bg-yellow-100 text-yellow-800';
            }

            const cpf = u.cpf || 'Sem CPF';
            const planoTipo = u.planType || (u.status === 'premium' ? 'Indefinido' : 'Trial');
            const deviceInfo = u.last_device || 'Desconhecido';
            const noteIconColor = u.adminNote ? 'text-yellow-500' : 'text-gray-400';

            // --- NOVO: LÓGICA DO CURSO (BC vs SP) ---
            const cursoCodigo = u.courseType || 'BC'; // Padrão BC se não existir
            const cursoLabel = cursoCodigo === 'SP' ? 'SEG. PATRIMONIAL' : 'BOMBEIRO CIVIL';
            const cursoBadgeColor = cursoCodigo === 'SP' 
                ? 'bg-blue-100 text-blue-800 border-blue-200' 
                : 'bg-red-100 text-red-800 border-red-200';

            const row = `
                <tr class="border-b hover:bg-gray-50 transition-colors">
                    <td class="p-3 font-bold text-gray-800">
                        ${u.name}
                        <div class="mt-1">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${cursoBadgeColor}">${cursoLabel}</span>
                        </div>
                    </td>
                    <td class="p-3 text-gray-600 text-sm">${u.email}<br><span class="text-xs text-gray-500">CPF: ${cpf}</span></td>
                    <td class="p-3 text-xs text-gray-500 max-w-[150px] truncate" title="${deviceInfo}">${deviceInfo}</td>
                    <td class="p-3">
                        <div class="flex flex-col items-start">
                            <span class="px-2 py-1 rounded text-xs font-bold uppercase ${statusColor}">${statusDisplay}</span>
                            <span class="text-xs text-gray-500 mt-1">${planoTipo}</span>
                        </div>
                    </td>
                    <td class="p-3 text-sm font-medium">${validadeStr}</td>
                    <td class="p-3 flex flex-wrap gap-2">
                        <button onclick="editUserData('${uid}', '${u.name}', '${cpf}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Editar Dados"><i class="fas fa-pen"></i></button>
                        
                        <!-- BOTÃO NOVO: ALTERAR CURSO -->
                        <button onclick="changeUserCourse('${uid}', '${cursoCodigo}')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1.5 rounded text-xs shadow" title="Alterar Curso (BC/SP)"><i class="fas fa-graduation-cap"></i></button>
                        
                        <button onclick="editUserNote('${uid}', '${(u.adminNote || '').replace(/'/g, "\\'")}')" class="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 px-2 py-1.5 rounded text-xs shadow" title="Nota Admin"><i class="fas fa-sticky-note ${noteIconColor}"></i></button>
                        <button onclick="manageUserAccess('${uid}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Gerenciar Plano"><i class="fas fa-calendar-alt"></i></button>
                        <button onclick="sendResetEmail('${u.email}')" class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Resetar Senha"><i class="fas fa-key"></i></button>
                        <button onclick="deleteUser('${uid}', '${u.name}', '${cpf}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded text-xs shadow" title="Excluir"><i class="fas fa-trash"></i></button>
                        <button onclick="toggleManagerRole('${uid}', ${u.isManager})" class="${u.isManager ? 'bg-purple-600' : 'bg-gray-400'} hover:bg-purple-500 text-white px-2 py-1.5 rounded text-xs shadow" title="Alternar Gestor"><i class="fas fa-briefcase"></i></button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        updateAdminStats(stats);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Erro ao carregar: ${err.message}</td></tr>`;
    }
};
    
function updateAdminStats(stats) {
    const totalEl = document.getElementById('admin-total-users');
    const premEl  = document.getElementById('admin-total-premium');
    const trialEl = document.getElementById('admin-total-trial');

    if (totalEl) totalEl.textContent = stats.total || 0;
    if (premEl)  premEl.textContent  = stats.premium || 0;
    if (trialEl) trialEl.textContent = stats.trial || 0;
}


  /* === SUBSTITUIR NO ARQUIVO app_final.js === */

window.manageUserAccess = async function(uid) {
    const op = prompt(
        "Selecione a Ação:\n" +
        "1 - MENSAL (30 dias - Vira Premium)\n" +
        "2 - SEMESTRAL (180 dias - Vira Premium)\n" +
        "3 - ANUAL (365 dias - Vira Premium)\n" +
        "4 - VITALÍCIO (10 anos - Vira Premium)\n" +
        "5 - REMOVER PREMIUM (Voltar para Trial Vencido)\n" +
        "6 - PERSONALIZADO (Dias - Vira Premium)\n" +
        "7 - ESTENDER TRIAL (Dias - Mantém TRIAL)" // <--- NOVA OPÇÃO AQUI
    );

    if (!op) return;

    let diasParaAdicionar = 0;
    let nomePlano = '';
    let novoStatus = 'premium'; // O padrão continua sendo premium para as opções 1 a 4

    if (op === '1') { diasParaAdicionar = 30; nomePlano = 'Mensal'; }
    else if (op === '2') { diasParaAdicionar = 180; nomePlano = 'Semestral'; }
    else if (op === '3') { diasParaAdicionar = 365; nomePlano = 'Anual'; }
    else if (op === '4') { diasParaAdicionar = 3650; nomePlano = 'Vitalício'; }
    
    else if (op === '5') {
        // Remover Premium (Lógica Existente)
        try {
            const ontem = new Date();
            ontem.setDate(ontem.getDate() - 1);
            await window.__fbDB.collection('users').doc(uid).update({
                status: 'trial',
                acesso_ate: ontem.toISOString(),
                planType: 'Cancelado'
            });
            alert("Acesso Premium removido. O aluno voltou para Trial expirado.");
            openAdminPanel();
            return;
        } catch (e) { alert(e.message); return; }
    }
    
    else if (op === '6') {
        const i = prompt("Digite a quantidade de dias para o PREMIUM:");
        if (!i) return;
        diasParaAdicionar = parseInt(i);
        nomePlano = 'Personalizado (Premium)';
        novoStatus = 'premium'; // Força Premium
    }
    
    // --- NOVA LÓGICA DO TRIAL ---
    else if (op === '7') {
        const i = prompt("Quantos dias de TRIAL você quer dar a mais?");
        if (!i) return;
        diasParaAdicionar = parseInt(i);
        nomePlano = 'Trial Estendido';
        novoStatus = 'trial'; // <--- AQUI ESTÁ O SEGREDO: Força Trial
    } 
    
    else {
        return;
    }

    // Calcula nova data a partir de AGORA
    const agora = new Date();
    const novaData = new Date(agora);
    novaData.setDate(novaData.getDate() + diasParaAdicionar);

    try {
        await window.__fbDB.collection('users').doc(uid).update({
            status: novoStatus, // Usa a variável que definimos corretamente acima
            acesso_ate: novaData.toISOString(),
            planType: nomePlano
        });
        
        // Feedback visual mais claro
        const tipoStatus = novoStatus === 'premium' ? 'PREMIUM ⭐' : 'TRIAL ⏳';
        alert(`Sucesso! Status definido como ${tipoStatus}.\nVálido até ${novaData.toLocaleDateString()}`);
        
        openAdminPanel();
    } catch (e) {
        alert("Erro ao atualizar: " + e.message);
    }
};
   
    // 4. Excluir Usuário (Do Banco de Dados)
    window.deleteUser = async function(uid, name, cpf) {
        const confirm1 = confirm(`TEM CERTEZA que deseja excluir os dados de ${name}?`);
        if (!confirm1) return;
        
        const confirm2 = confirm("ATENÇÃO: Esta ação apagará o progresso e o cadastro do banco de dados.\n(Nota: Para segurança, o login da conta deve ser removido manualmente no Console do Firebase, mas o acesso será revogado aqui). Continuar?");
        if (!confirm2) return;

        try {
            // Remove da coleção de usuários
            await window.__fbDB.collection('users').doc(uid).delete();
            
            // Remove da coleção de CPFs (para liberar o CPF)
            if (cpf && cpf !== 'undefined' && cpf !== 'Sem CPF') {
                await window.__fbDB.collection('cpfs').doc(cpf).delete();
            }

            alert("Usuário removido do banco de dados.");
            openAdminPanel(); // Atualiza a tabela
        } catch (e) {
            alert("Erro ao excluir: " + e.message);
        }
    };
    
    function checkTrialStatus(expiryDateString) {
        const expiryDate = new Date(expiryDateString);
        const today = new Date();
        const diffTime = expiryDate - today; 
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const trialToast = document.getElementById('trial-floating-notify');
        const daysLeftSpan = document.getElementById('trial-days-left');
        const trialBtn = document.getElementById('trial-subscribe-btn');
        const closeTrialBtn = document.getElementById('close-trial-notify');
        const trialTitle = document.getElementById('trial-title-text');

        if (trialToast && diffDays <= 30 && diffDays >= 0) {
            trialToast.classList.remove('hidden');
            if(daysLeftSpan) daysLeftSpan.textContent = diffDays;
            if(trialTitle) trialTitle.textContent = "Período de Experiência";
            trialBtn?.addEventListener('click', () => {
                document.getElementById('expired-modal').classList.add('show');
                document.getElementById('name-modal-overlay').classList.add('show');
            });
            closeTrialBtn?.addEventListener('click', () => { trialToast.classList.add('hidden'); });
        }
    }

// --- 1. ATUALIZAÇÃO DA FUNÇÃO DE EVENTOS DE AUTENTICAÇÃO ---
    // Substitua a função setupAuthEventListeners inteira por esta:
    
    // --- 1. ATUALIZAÇÃO DA FUNÇÃO DE EVENTOS DE AUTENTICAÇÃO ---
    // Substitua a função setupAuthEventListeners inteira por esta:
    
    function setupAuthEventListeners() {
        const nameField = document.getElementById('name-field-container');
        const cpfField = document.getElementById('cpf-field-container'); 
        const phoneField = document.getElementById('phone-field-container'); 
        const phoneInput = document.getElementById('phone-input'); 
        const companyField = document.getElementById('company-field-container'); 
        const companyInput = document.getElementById('company-input'); 
        
        // --- NOVO: Referência ao campo de curso ---
        const courseField = document.getElementById('course-field-container'); 
        const courseSelect = document.getElementById('course-input');
        // ------------------------------------------

        const nameInput = document.getElementById('name-input');
        const cpfInput = document.getElementById('cpf-input'); 
        const emailInput = document.getElementById('email-input');
        const passwordInput = document.getElementById('password-input');
        const feedback = document.getElementById('auth-feedback');
        const loginGroup = document.getElementById('login-button-group');
        const signupGroup = document.getElementById('signup-button-group');
        const authTitle = document.getElementById('auth-title');
        const authMsg = document.getElementById('auth-message');
        const btnShowLogin = document.getElementById('show-login-button');
        const btnShowSignup = document.getElementById('show-signup-button');
        const btnLogin = document.getElementById('login-button');
        const btnSignup = document.getElementById('signup-button');
        const btnOpenPayHeader = document.getElementById('header-subscribe-btn');
        const btnOpenPayMobile = document.getElementById('mobile-subscribe-btn');
        const btnOpenPayLogin = document.getElementById('open-payment-login-btn');
        const expiredModal = document.getElementById('expired-modal');
        const closePayModal = document.getElementById('close-payment-modal-btn');
        const loginModalOverlay = document.getElementById('name-modal-overlay');
        const loginModal = document.getElementById('name-prompt-modal');

        // === CORREÇÃO DE SEGURANÇA VISUAL (INICIALIZAÇÃO) ===
        // Garante que o campo de curso (e outros de cadastro) comecem OCULTOS se o login estiver visível
        if (loginGroup && !loginGroup.classList.contains('hidden')) {
            if (courseField) courseField.classList.add('hidden');
            if (nameField) nameField.classList.add('hidden');
            if (cpfField) cpfField.classList.add('hidden');
            if (phoneField) phoneField.classList.add('hidden');
            if (companyField) companyField.classList.add('hidden');
        }
        // =====================================================

        // ... (Lógica do Enter mantida) ...
        passwordInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                if (!loginGroup.classList.contains('hidden')) btnLogin.click();
                else btnSignup.click();
            }
        });

        // ... (Lógica do Modal de Pagamento mantida) ...
        function openPaymentModal() {
            expiredModal.classList.add('show');
            if (loginModalOverlay) loginModalOverlay.classList.add('show');
            if (loginModal && loginModal.classList.contains('show')) {
                loginModal.classList.remove('show');
                loginModal.dataset.wasOpen = 'true'; 
            }
        }
        btnOpenPayHeader?.addEventListener('click', openPaymentModal);
        btnOpenPayMobile?.addEventListener('click', openPaymentModal);
        btnOpenPayLogin?.addEventListener('click', openPaymentModal);
        closePayModal?.addEventListener('click', () => {
            expiredModal.classList.remove('show');
            if (loginModal && loginModal.dataset.wasOpen === 'true') {
                loginModal.classList.add('show');
                loginModal.dataset.wasOpen = 'false';
            } else {
                if (document.body.getAttribute('data-app-ready') === 'true') {
                     loginModalOverlay?.classList.remove('show');
                } else {
                    loginModal?.classList.add('show');
                }
            }
        });

        // --- ALTERAÇÃO AQUI: Lógica de Alternar Login/Cadastro ---
        btnShowSignup?.addEventListener('click', () => {
            loginGroup.classList.add('hidden');
            signupGroup.classList.remove('hidden');
            
            // Mostra campos extras
            nameField.classList.remove('hidden');
            cpfField.classList.remove('hidden'); 
            phoneField.classList.remove('hidden'); 
            companyField.classList.remove('hidden');
            if(courseField) courseField.classList.remove('hidden'); // MOSTRA o curso apenas aqui
            
            authTitle.textContent = "Criar Nova Conta";
            authMsg.textContent = "Cadastre-se para o Período de Experiência.";
            feedback.textContent = "";
        });

        btnShowLogin?.addEventListener('click', () => {
            loginGroup.classList.remove('hidden');
            signupGroup.classList.add('hidden');
            
            // Esconde campos extras
            nameField.classList.add('hidden');
            cpfField.classList.add('hidden'); 
            phoneField.classList.add('hidden'); 
            companyField.classList.add('hidden');
            if(courseField) courseField.classList.add('hidden'); // ESCONDE o curso
            
            authTitle.textContent = "Acesso ao Sistema";
            authMsg.textContent = "Acesso Restrito";
            feedback.textContent = "";
        });

        // Login Action
        btnLogin?.addEventListener('click', async () => {
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                feedback.textContent = "Preencha e-mail e senha.";
                feedback.className = "text-center text-sm mt-4 font-semibold text-red-500";
                return;
            }
            feedback.textContent = "Entrando...";
            feedback.className = "text-center text-sm mt-4 text-blue-400 font-semibold";
            try {
                localStorage.removeItem('my_session_id'); 
                await FirebaseCourse.signInWithEmail(email, password);
                feedback.textContent = "Verificando...";
            } catch (error) {
                feedback.className = "text-center text-sm mt-4 text-red-400 font-semibold";
                feedback.textContent = "Erro ao entrar. Verifique seus dados.";
            }
        });

        // Signup Action (Com captura do curso)
        btnSignup?.addEventListener('click', async () => {
            const phone = phoneInput.value; 
            const company = companyInput.value; 
            const courseType = courseSelect ? courseSelect.value : 'BC'; // Captura
            const name = nameInput.value;
            const email = emailInput.value;
            const password = passwordInput.value;
            const cpf = cpfInput.value;

            if (!name || !email || !password || !cpf || !phone) {
                feedback.textContent = "Todos os campos obrigatórios devem ser preenchidos.";
                feedback.className = "text-center text-sm mt-4 font-semibold text-red-500";
                return;
            }
            feedback.textContent = "Criando conta...";
            feedback.className = "text-center text-sm mt-4 text-blue-400 font-semibold";
            try {
                await FirebaseCourse.signUpWithEmail(name, email, password, cpf, company, phone, courseType);
                feedback.textContent = "Sucesso! Iniciando...";
            } catch (error) {
                feedback.className = "text-center text-sm mt-4 text-red-400 font-semibold";
                feedback.textContent = error.message || "Erro ao criar conta.";
            }
        });
    }

    function handleInitialLoad() {
        const lastModule = localStorage.getItem('gateBombeiroLastModule');
        if (lastModule) loadModuleContent(lastModule); else goToHomePage();
    }

    async function loadQuestionBank(moduleId) {
        if (cachedQuestionBanks[moduleId]) return cachedQuestionBanks[moduleId];
        if (typeof QUIZ_DATA === 'undefined') return null;
        const questions = QUIZ_DATA[moduleId];
        if (!questions || !Array.isArray(questions) || questions.length === 0) return null; 
        cachedQuestionBanks[moduleId] = questions;
        return questions;
    }

  // --- FUNÇÃO 5: BANCO DE QUESTÕES (VERSÃO DEBUG / BLINDADA) ---
    async function generateSimuladoQuestions(config) {
        console.log("Iniciando geração de simulado...");
        const finalExamQuestions = [];
        const globalSeenSignatures = new Set(); // Rastreia Texto + Opções para unicidade absoluta

        const map = {
            'rh': [1, 2, 3, 4, 5],
            'legislacao': [6, 7, 8, 9, 10],
            'salvamento': [11, 12, 13, 14, 15],
            'pci': [16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
            'aph_novo': [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]
        };

        for (const [catKey, qtyNeeded] of Object.entries(config.distribution)) {
            let pool = [];
            const targetModules = map[catKey] || [];

            // 1. Coleta TUDO
            targetModules.forEach(num => {
                const modId = `module${num}`;
                if (window.QUIZ_DATA && window.QUIZ_DATA[modId]) {
                    pool.push(...window.QUIZ_DATA[modId]);
                }
            });

            console.log(`Categoria ${catKey}: ${pool.length} questões encontradas no total.`);

            // 2. Embaralha MUITO BEM
            pool = shuffleArray(pool); // Mistura 1
            pool = shuffleArray(pool); // Mistura 2 (Garantia)

            // 3. Seleciona ÚNICAS
            let addedCount = 0;
            for (const q of pool) {
                if (addedCount >= qtyNeeded) break;

                // Assinatura única: Texto da pergunta + Texto da primeira opção (para diferenciar perguntas parecidas)
                const signature = (q.question + (q.options['a'] || '')).replace(/\s+/g, '').toLowerCase();

                if (!globalSeenSignatures.has(signature)) {
                    finalExamQuestions.push(q);
                    globalSeenSignatures.add(signature);
                    addedCount++;
                }
            }
            console.log(`Categoria ${catKey}: ${addedCount} questões únicas adicionadas.`);
        }
        
        // Embaralha o resultado final
        return shuffleArray(finalExamQuestions);
    }
      
    // --- CARREGAMENTO DE MÓDULOS (ROTEADOR PRINCIPAL) ---
    async function loadModuleContent(id) {
        if (id === 'module62') {
            localStorage.removeItem('gateBombeiroLastModule');
            loadModuleContent('module59');
            return;
        }
        if (!id || !moduleContent[id]) return;
        const d = moduleContent[id];
        const num = parseInt(id.replace('module', ''));
        let moduleCategory = null;
        for (const key in moduleCategories) {
            const cat = moduleCategories[key];
            if (num >= cat.range[0] && num <= cat.range[1]) { moduleCategory = cat; break; }
        }
        const isPremiumContent = moduleCategory && moduleCategory.isPremium;
        const userIsNotPremium = !currentUserData || currentUserData.status !== 'premium';

        // Verifica bloqueio premium
        if (isPremiumContent && userIsNotPremium) { renderPremiumLockScreen(moduleContent[id].title); return; }

        currentModuleId = id;
        localStorage.setItem('gateBombeiroLastModule', id);
        
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        if (simuladoTimerInterval) clearInterval(simuladoTimerInterval);

        contentArea.style.opacity = '0';
        loadingSpinner.classList.remove('hidden');
        contentArea.classList.add('hidden'); 

        setTimeout(async () => {
            loadingSpinner.classList.add('hidden');
            contentArea.classList.remove('hidden'); 

            // 1. MODO SIMULADO
            if (d.isSimulado) {
                contentArea.innerHTML = `
                    <h3 class="text-3xl mb-4 pb-4 border-b text-orange-600 dark:text-orange-500 flex items-center">
                        <i class="${d.iconClass} mr-3"></i> ${d.title}
                    </h3>
                    <div>${d.content}</div>
                    <div class="text-center mt-8">
                        <button id="start-simulado-btn" class="action-button pulse-button text-xl px-8 py-4">
                            <i class="fas fa-play mr-2"></i> INICIAR SIMULADO
                        </button>
                    </div>
                `;
                document.getElementById('start-simulado-btn').addEventListener('click', () => startSimuladoMode(d));
            } 
            
            // 2. FERRAMENTAS (Módulo 59)
            else if (id === 'module59') { 
                contentArea.innerHTML = `
                    <section class="tools-hero-panel">
                        <div class="tools-hero-content">
                            <div class="tools-main-mark">
                                <i class="fas fa-shield-halved"></i>
                                <span><i class="fas fa-bolt"></i></span>
                            </div>
                            <div>
                                <span><i class="fas fa-layer-group"></i> Hub profissional</span>
                                <h3>Central de Ferramentas</h3>
                                <p>20 ferramentas com apoio da IAM para rotina, carreira, documentos, oportunidades, avisos e treino prático pós-curso.</p>
                            </div>
                        </div>
                    </section>
                    <div id="tools-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6"></div>
                `;
                const grid = document.getElementById('tools-grid');
                if (typeof ToolsApp !== 'undefined') {
                    if (typeof ToolsApp.renderProfessionalSuite === 'function') {
                        ToolsApp.renderProfessionalSuite(grid);
                    } else {
                        ToolsApp.renderChecklist(grid);
                        ToolsApp.renderPonto(grid);
                        ToolsApp.renderEscala(grid);
                        ToolsApp.renderPlanner(grid);
                    }
                } else {
                    grid.innerHTML = '<p class="text-red-500">Erro: Script de Ferramentas não carregado.</p>';
                }
            }

            // 3. MODO SOBREVIVÊNCIA (Módulo 60)
            else if (d.isSurvival) {
                contentArea.innerHTML = d.content;
                const survivalScoreEl = document.getElementById('survival-last-score');
                const lastScore = localStorage.getItem('lastSurvivalScore');
                if(survivalScoreEl && lastScore) survivalScoreEl.innerText = `Seu recorde anterior: ${lastScore} pontos`;
                
                document.getElementById('start-survival-btn').addEventListener('click', initSurvivalGame);
            }

            // 4. RPG (Módulo 61)
            else if (d.isRPG) {
                contentArea.innerHTML = `
                    <section class="rpg-command-hero">
                        <span><i class="fas fa-headset"></i> Central de Operações</span>
                        <h3>Simulador de Ocorrências</h3>
                        <p>Escolha uma ocorrência, avalie riscos e tome decisões como responsável pela primeira resposta.</p>
                    </section>
                    <div class="rpg-card-grid">
                        <button id="rpg-opt-1" class="rpg-card-btn group">
                            <small>Ocorrência 01</small>
                            <h4><i class="fas fa-fire mr-2"></i> Incêndio em Galpão Industrial</h4>
                            <p>Risco de backdraft, porta quente e vítimas possíveis.</p>
                        </button>
                        <button id="rpg-opt-2" class="rpg-card-btn group">
                            <small>Em breve</small>
                            <h4><i class="fas fa-car-crash mr-2"></i> Acidente Veicular</h4>
                            <p>Vítima presa às ferragens, trauma grave e controle de cena.</p>
                        </button>
                        <button id="rpg-opt-3" class="rpg-card-btn group">
                            <small>Em breve</small>
                            <h4><i class="fas fa-dungeon mr-2"></i> Espaço Confinado</h4>
                            <p>Trabalhador inconsciente, atmosfera desconhecida e resgate técnico.</p>
                        </button>
                    </div>
                `;
                document.getElementById('rpg-opt-1').addEventListener('click', () => initRPGGame(d.rpgData)); 
                document.getElementById('rpg-opt-2').addEventListener('click', () => alert("Cenário de Acidente Veicular em desenvolvimento!"));
                document.getElementById('rpg-opt-3').addEventListener('click', () => alert("Cenário de Espaço Confinado em desenvolvimento!"));
            }

            // 5. CARTEIRINHA (Módulo 62)
            else if (d.isIDCard) {
                contentArea.innerHTML = d.content;
                renderDigitalID();
            }

            // 6. MODO AULA NORMAL (TEXTO + AUDIO ATUALIZADO)
            else {
                const moduleMediaHtml = getModuleMediaHtml(id, d.title);
                const hasLocalMedia = Boolean(getModuleMediaAssets(id));
                let audioHtml = `
                    <div class="modern-audio-player">
                        <button id="audio-main-btn" class="audio-main-btn" onclick="window.speakContent()">
                            <i id="audio-btn-icon" class="fas fa-headphones"></i> <span id="audio-btn-text">Ouvir Aula</span>
                        </button>
                        <div class="h-6 w-px bg-gray-600 mx-2"></div>
                        <select id="audio-speed" class="audio-speed-select" title="Velocidade de Reprodução">
                            <option value="0.8">0.8x</option>
                            <option value="1.0" selected>1.0x</option>
                            <option value="1.2">1.2x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2.0">2.0x</option>
                        </select>
                    </div>
                `;

                let html = `
                    <div class="study-module-header">
                        <span class="study-kicker"><i class="fas fa-book-open"></i> Modo estudo</span>
                        <h3><i class="${d.iconClass} ${getCategoryColor(id)} fa-fw"></i>${d.title}</h3>
                        <div class="study-header-actions">
                            <span><i class="fas fa-headphones"></i> Áudio disponível</span>
                            ${hasLocalMedia ? '<span><i class="fas fa-video"></i> Vídeo e slides</span>' : ''}
                            <span><i class="fas fa-pencil-alt"></i> Exercícios ao final</span>
                        </div>
                    </div>
                    <button type="button" class="study-iam-nudge" onclick="window.ToolsApp?.openIamAssistant?.()">
                        <strong>IAM</strong>
                        <span><i class="fas fa-wand-magic-sparkles"></i> Tire dúvidas ou peça um resumo desta aula</span>
                    </button>
                    ${audioHtml}
                    <div>${d.content}</div>
                `;

                const isSpecialModule = ['module53', 'module54', 'module55', 'module56', 'module57', 'module58', 'module59', 'module60', 'module61', 'module62'].includes(id);

                // --- INICIO BLOCO DRIVE LINK (ATUALIZADO) ---
        // Verifica se o link existe, não é vazio, e não é o placeholder "EM_BREVE"
        if (!hasLocalMedia && d.driveLink && d.driveLink !== "" && d.driveLink !== "EM_BREVE" && d.driveLink !== "SEU_LINK_DO_DRIVE_AQUI") {
            if (userIsNotPremium) {
                html += `<div class="mt-10 mb-8"><button onclick="document.getElementById('expired-modal').classList.add('show'); document.getElementById('name-modal-overlay').classList.add('show');" class="drive-button opacity-75 hover:opacity-100 relative overflow-hidden"><div class="absolute inset-0 bg-black/30 flex items-center justify-center z-10"><i class="fas fa-lock text-2xl mr-2"></i></div><span class="blur-[2px] flex items-center"><i class="fab fa-google-drive mr-3"></i> VER FOTOS E VÍDEOS (PREMIUM)</span></button><p class="text-xs text-center mt-2 text-gray-500"><i class="fas fa-lock text-yellow-500"></i> Recurso exclusivo para assinantes</p></div>`;
            } else {
                html += `<div class="mt-10 mb-8"><a href="${d.driveLink}" target="_blank" class="drive-button"><i class="fab fa-google-drive"></i> VER FOTOS E VÍDEOS DESTA MATÉRIA</a></div>`;
            }
        } else if (!hasLocalMedia) {
            // Se não tiver link ou for "EM_BREVE", mostra botão que avisa sem abrir aba
            html += `<div class="mt-10 mb-8"><button onclick="alert('🚧 Conteúdo em produção! As fotos e vídeos desta matéria estarão disponíveis em breve.')" class="drive-button opacity-70 cursor-wait"><i class="fab fa-google-drive"></i> VER FOTOS E VÍDEOS (EM BREVE)</button></div>`;
        }
        // --- FIM BLOCO DRIVE LINK ---

                const savedNote = localStorage.getItem('note-' + id) || '';

                let allQuestions = null;
                try { allQuestions = await loadQuestionBank(id); } catch(error) { console.error(error); }

                if (allQuestions && allQuestions.length > 0) {
                    const count = Math.min(allQuestions.length, 4); 
                    const shuffledQuestions = shuffleArray([...allQuestions]); 
                    const selectedQuestions = shuffledQuestions.slice(0, count);
                    
                    // Injeção da frase "Pratique aqui..." (Pedido 6)
                    let quizHtml = `
                        <div class="mt-12 text-center">
                            <span class="bg-gray-100 dark:bg-gray-800 text-gray-500 text-sm py-1 px-3 rounded-full border border-gray-300 dark:border-gray-700">
                                <i class="fas fa-pencil-alt mr-2"></i> Pratique aqui o que você aprendeu
                            </span>
                        </div>
                        <div class="quiz-section-separator mt-4"></div>
                        <h3 class="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Exercícios de Fixação</h3>
                    `;
                    
                    selectedQuestions.forEach((q, index) => {
                        const questionNumber = index + 1;
                        quizHtml += `<div class="quiz-block" data-question-id="${q.id}"><p class="font-semibold mt-4 mb-2 text-gray-700 dark:text-gray-200">${questionNumber}. ${q.question}</p><div class="quiz-options-group space-y-2 mb-4">`;
                        for (const key in q.options) {
                            quizHtml += `<div class="quiz-option" data-module="${id}" data-question-id="${q.id}" data-answer="${key}"><span class="option-key">${key.toUpperCase()})</span> ${q.options[key]}<span class="ripple"></span></div>`;
                        }
                        quizHtml += `</div><div id="feedback-${q.id}" class="feedback-area hidden"></div></div>`;
                    });
                    html += quizHtml;
                } else {
                    if (!d.id.startsWith('module9') && !isSpecialModule) {
                        html += `<div class="warning-box mt-8"><p><strong><i class="fas fa-exclamation-triangle mr-2"></i> Exercícios não encontrados.</strong></p></div>`;
                    }
                }

                html += moduleMediaHtml;
                html += `<div class="module-complete-panel"><div><strong>Terminou esta aula?</strong><span>Marque como concluída para atualizar seu progresso.</span></div><button class="action-button conclude-button" data-module="${id}">Concluir Módulo</button></div><div class="notes-panel"><h4><i class="fas fa-pencil-alt mr-2"></i>Anotações Pessoais</h4><p>Suas notas para este módulo. Elas são salvas automaticamente no seu navegador.</p><textarea id="notes-module-${id}" class="notes-textarea" placeholder="Digite suas anotações aqui...">${savedNote}</textarea></div>`;

                contentArea.innerHTML = html;
                setupQuizListeners();
                setupConcludeButtonListener();
                setupNotesListener(id);
            }

            contentArea.style.opacity = '1';
            contentArea.style.transition = 'opacity 0.3s ease';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            updateActiveModuleInList();
            updateNavigationButtons();
            updateBreadcrumbs(d.title);
            document.getElementById('module-nav').classList.remove('hidden');
            closeSidebar();
            document.getElementById('next-module')?.classList.remove('blinking-button');
        }, 300);
    }
    
    // === LÓGICA: MODO SOBREVIVÊNCIA ===
    async function initSurvivalGame() {
        survivalLives = 3;
        survivalScore = 0;
        currentSurvivalIndex = 0;
        survivalQuestions = [];

        // Coleta todas as questões disponíveis no app
        const allQs = [];
        for(let i=1; i<=52; i++) { // Módulos de conteúdo
            const modId = `module${i}`;
            if(QUIZ_DATA[modId]) allQs.push(...QUIZ_DATA[modId]);
        }
        survivalQuestions = shuffleArray(allQs);

        renderSurvivalScreen();
    }

    function renderSurvivalScreen() {
        if(survivalLives <= 0) {
            // Game Over
            localStorage.setItem('lastSurvivalScore', survivalScore);
            contentArea.innerHTML = `
                <div class="survival-result-panel animate-slide-in">
                    <div class="bonus-mode-icon danger"><i class="fas fa-heart-crack"></i></div>
                    <span>Fim da tentativa</span>
                    <h2>Modo Sobrevivência encerrado</h2>
                    <p>Sua pontuação final foi</p>
                    <strong>${survivalScore}</strong>
                    <button id="retry-survival" class="action-button pulse-button">Tentar Novamente</button>
                </div>
            `;
            document.getElementById('retry-survival').addEventListener('click', initSurvivalGame);
            return;
        }

        const q = survivalQuestions[currentSurvivalIndex];
        if(!q) {
            contentArea.innerHTML = `<h2 class="text-center text-2xl">Você zerou o banco de questões! Incrível!</h2>`;
            return;
        }

        let hearts = '';
        for(let i=0; i<survivalLives; i++) hearts += '<i class="fas fa-heart text-red-600 text-2xl mx-1 survival-life-heart"></i>';

        contentArea.innerHTML = `
            <div class="survival-arena">
            <div class="survival-status-bar">
                <div class="flex items-center">${hearts}</div>
                <div>Pontos: <strong>${survivalScore}</strong></div>
            </div>
            <div class="survival-question-card animate-fade-in">
                <span>Questão ${currentSurvivalIndex + 1}</span>
                <p>${q.question}</p>
                <div class="survival-options-grid">
                    ${Object.keys(q.options).map(key => `
                        <button class="survival-option" data-key="${key}">
                            <span>${key.toUpperCase()}</span> ${q.options[key]}
                        </button>
                    `).join('')}
                </div>
            </div>
            </div>
        `;

        document.querySelectorAll('.survival-option').forEach(btn => {
            btn.addEventListener('click', (e) => handleSurvivalAnswer(e, q));
        });
    }

    function handleSurvivalAnswer(e, q) {
        const selected = e.currentTarget.dataset.key;
        const isCorrect = selected === q.answer;
        const btns = document.querySelectorAll('.survival-option');
        
        btns.forEach(b => {
            b.disabled = true;
            if(b.dataset.key === q.answer) b.classList.add('bg-green-200', 'dark:bg-green-900', 'border-green-500');
            else if(b.dataset.key === selected && !isCorrect) b.classList.add('bg-red-200', 'dark:bg-red-900', 'border-red-500');
        });

        if(isCorrect) {
            survivalScore += 10;
            if(typeof confetti === 'function') confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
        } else {
            survivalLives--;
            navigator.vibrate?.(200);
        }

        setTimeout(() => {
            currentSurvivalIndex++;
            renderSurvivalScreen();
        }, 1500);
    }

    // === LÓGICA: RPG (SIMULADOR) ===
    async function initRPGGame(rpgData) {
        renderRPGScene(rpgData.start, rpgData);
    }

    function renderRPGScene(sceneId, rpgData) {
        const scene = rpgData.scenes[sceneId];
        if(!scene) return; 

        let html = `
            <div class="max-w-2xl mx-auto animate-fade-in">
                <div class="rpg-scene-panel">
                    ${scene.image ? `<img src="${scene.image}" class="w-full h-48 object-cover">` : ''}
                    <div class="rpg-scene-body">
                        <span><i class="fas fa-radio"></i> Decisão operacional</span>
                        <p>${scene.text}</p>
                        <div class="rpg-choice-stack">
        `;

        scene.options.forEach(opt => {
            html += `
                <button class="rpg-choice-btn w-full text-left p-4 bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all rounded shadow-sm mb-2" data-next="${opt.next}">
                    <i class="fas fa-chevron-right text-blue-500 mr-2"></i> ${opt.text}
                </button>
            `;
        });

        html += `</div></div></div></div>`;
        contentArea.innerHTML = html;

        if(scene.type === 'death') {
            contentArea.querySelector('.rpg-scene-panel')?.classList.add('danger');
        } else if(scene.type === 'win') {
            contentArea.querySelector('.rpg-scene-panel')?.classList.add('success');
            if(typeof confetti === 'function') confetti();
        }

        document.querySelectorAll('.rpg-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const next = btn.dataset.next;
                if(next === 'exit') loadModuleContent('module61'); 
                else renderRPGScene(next, rpgData);
            });
        });
    }

    // === LÓGICA: CARTEIRINHA DIGITAL ===
    function renderDigitalID() {
        if (!currentUserData) return;
        
        const container = document.getElementById('id-card-container');
        if (!container) return;

        const savedPhoto = localStorage.getItem('user_profile_pic');
        const defaultPhoto = "https://raw.githubusercontent.com/instrutormedeiros/ProjetoBravoCharlie/refs/heads/main/assets/img/LOGO_QUADRADA.png"; 
        const currentPhoto = savedPhoto || defaultPhoto;

        const validUntil = new Date(currentUserData.acesso_ate).toLocaleDateString('pt-BR');
        const statusColor = currentUserData.status === 'premium' ? 'text-yellow-400' : 'text-gray-400';
        
        container.innerHTML = `
            <div class="relative w-full max-w-md bg-gradient-card rounded-xl overflow-hidden shadow-2xl text-white font-sans transform transition hover:scale-[1.01] duration-300">
                <div class="card-shine"></div>
                <div class="bg-red-700 p-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="bg-white p-1 rounded-full">
                            <img src="https://raw.githubusercontent.com/instrutormedeiros/ProjetoBravoCharlie/refs/heads/main/assets/img/LOGO_QUADRADA.png" class="w-10 h-10 object-cover">
                        </div>
                        <div>
                            <h3 class="font-bold text-sm uppercase tracking-wider">Bombeiro Civil</h3>
                            <p class="text-[10px] text-red-200">Identificação de Aluno</p>
                        </div>
                    </div>
                    <i class="fas fa-wifi text-white/50 rotate-90"></i>
                </div>
                <div class="p-6 relative z-10">
                    <div class="flex justify-between items-start mb-6">
                        <div class="flex items-center gap-4">
                            <div class="relative group cursor-pointer" onclick="document.getElementById('profile-pic-input').click()" title="Clique para alterar a foto">
                                <div class="w-20 h-20 rounded-lg border-2 border-white/30 overflow-hidden bg-gray-800">
                                    <img id="id-card-photo" src="${currentPhoto}" class="w-full h-full object-cover">
                                </div>
                                <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <i class="fas fa-camera text-white"></i>
                                </div>
                                <input type="file" id="profile-pic-input" class="hidden" accept="image/*" onchange="window.updateProfilePic(this)">
                            </div>
                            <div>
                                <p class="text-xs text-gray-400 uppercase mb-1">Nome do Aluno</p>
                                <h2 class="text-lg font-bold text-white tracking-wide leading-tight max-w-[150px] break-words">${currentUserData.name}</h2>
                            </div>
                        </div>
                        <div class="bg-white p-1 rounded">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentUserData.email}" class="w-14 h-14">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase">CPF</p>
                            <p class="font-mono text-sm">${currentUserData.cpf || '000.000.000-00'}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase">Matrícula</p>
                            <p class="font-mono text-sm">BC-${Math.floor(Math.random()*10000)}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase">Válido Até</p>
                            <p class="font-bold text-green-400 text-sm">${validUntil}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-400 uppercase">Status</p>
                            <p class="font-bold text-sm uppercase flex items-center gap-1 ${statusColor}">
                                <i class="fas fa-star text-xs"></i> ${currentUserData.status || 'Trial'}
                            </p>
                        </div>
                    </div>
                </div>
                <div class="bg-black/30 p-3 text-center border-t border-white/10">
                    <p class="text-[9px] text-gray-500">Uso pessoal e intransferível. Toque na foto para alterar.</p>
                </div>
            </div>
            <div class="text-center mt-6">
                <button onclick="window.print()" class="text-sm text-blue-500 hover:underline"><i class="fas fa-print"></i> Imprimir Carteirinha</button>
            </div>
        `;
    }

    window.updateProfilePic = function(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('id-card-photo').src = e.target.result;
                localStorage.setItem('user_profile_pic', e.target.result);
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

   // === FUNÇÕES SIMULADO (NORMAL - SEM MODO FOCO) ===
    async function startSimuladoMode(moduleData) {
        // Pausar áudio se estiver tocando (Pedido 2 - parte A)
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        loadingSpinner.classList.remove('hidden');
        contentArea.classList.add('hidden');

        // Gera questões sem repetição
        activeSimuladoQuestions = await generateSimuladoQuestions(moduleData.simuladoConfig);
        userAnswers = {};
        simuladoTimeLeft = moduleData.simuladoConfig.timeLimit * 60; 
        currentSimuladoQuestionIndex = 0;

        // --- 4. TIMER STICKY (HTML ATUALIZADO) ---
        contentArea.innerHTML = `
            <div class="simulado-pro-page">
                
                <div id="simulado-timer-bar" class="simulado-floating-timer">
                    <i class="fas fa-clock text-orange-500"></i>
                    <span id="timer-display" class="timer-text mx-2">--:--</span>
                    <div class="h-4 w-px bg-gray-600 mx-2"></div>
                    <span class="text-xs text-gray-300">Questão <span id="q-current">1</span>/${activeSimuladoQuestions.length}</span>
                </div>
                
                <div class="simulado-pro-hero">
                     <span><i class="fas fa-clipboard-check"></i> Simulados por Matéria</span>
                     <h3>
                        ${moduleData.title}
                     </h3>
                     <p>Modo prova com tempo, navegação por questão e gabarito comentado ao final.</p>
                </div>

                <div id="question-display-area" class="simulado-question-container"></div>
                
                <div class="simulado-nav-row">
                    <button id="sim-prev-btn" class="action-button bg-gray-600" style="visibility: hidden;">
                        <i class="fas fa-arrow-left mr-2"></i> Anterior
                    </button>
                    <button id="sim-next-btn" class="action-button">
                        Próxima <i class="fas fa-arrow-right ml-2"></i>
                    </button>
                </div>
            </div>
        `;
        // --- FIM HTML SIMULADO ---
        
        contentArea.classList.remove('hidden');
        loadingSpinner.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        showSimuladoQuestion(currentSimuladoQuestionIndex);
        startTimer(moduleData.id);

        document.getElementById('sim-next-btn').addEventListener('click', () => navigateSimulado(1, moduleData.id));
        document.getElementById('sim-prev-btn').addEventListener('click', () => navigateSimulado(-1, moduleData.id));
    }
    
    // --- FUNÇÃO AUXILIAR: EXIBIR QUESTÃO (CORRIGIDA - USO DE INDEX) ---
    function showSimuladoQuestion(index) {
        const q = activeSimuladoQuestions[index];
        const container = document.getElementById('question-display-area');
        
        // CORREÇÃO: Usa o INDEX para recuperar a resposta, não o ID
        // Isso impede que a resposta da Q1 apareça na Q3 se elas tiverem o mesmo ID
        const savedAnswer = userAnswers[index] || null; 
        
        let html = `
            <div class="simulado-question-card animate-slide-in">
                <div class="simulado-question-title">
                    <div>${String(index + 1).padStart(2, '0')}</div>
                    <p>
                        ${q.question}
                    </p>
                </div>
                <div class="simulado-options-stack">
        `;
        
        for (const key in q.options) {
            const isSelected = savedAnswer === key ? 'selected' : '';
            // CORREÇÃO: Passamos o INDEX na função onclick
            html += `
                <div class="quiz-card-option ${isSelected}" onclick="selectSimuladoOption(${index}, '${key}', this)">
                    <div class="quiz-letter-box">${key.toUpperCase()}</div>
                    <div class="font-medium flex-1">${q.options[key]}</div>
                </div>
            `;
        }
        html += `</div></div>`;
        container.innerHTML = html;

        document.getElementById('q-current').innerText = index + 1;
        
        const prevBtn = document.getElementById('sim-prev-btn');
        const nextBtn = document.getElementById('sim-next-btn');
        
        prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        if (index === activeSimuladoQuestions.length - 1) {
            nextBtn.innerHTML = '<i class="fas fa-check-double mr-2"></i> ENTREGAR';
            nextBtn.className = "sim-nav-btn sim-submit-btn";
        } else {
            nextBtn.innerHTML = 'Próxima <i class="fas fa-arrow-right ml-2"></i>';
            nextBtn.className = "sim-nav-btn sim-next-btn";
        }
    }

    // Função auxiliar para selecionar a opção visualmente
    window.selectSimuladoOption = function(index, key, element) {
        // Remove seleção anterior
        const parent = element.parentElement;
        parent.querySelectorAll('.quiz-card-option').forEach(el => el.classList.remove('selected'));
        // Adiciona à atual
        element.classList.add('selected');
        // Salva resposta usando o ÍNDICE
        registerSimuladoAnswer(index, key);
    };

    window.registerSimuladoAnswer = function(index, answer) {
        userAnswers[index] = answer; // Salva na posição 0, 1, 2...
    };

    function navigateSimulado(direction, moduleId) {
        const newIndex = currentSimuladoQuestionIndex + direction;
        if (newIndex >= 0 && newIndex < activeSimuladoQuestions.length) {
            currentSimuladoQuestionIndex = newIndex;
            showSimuladoQuestion(newIndex);
            window.scrollTo({ top: 100, behavior: 'smooth' });
        } else if (newIndex >= activeSimuladoQuestions.length) {
            if(confirm("Tem certeza que deseja entregar o simulado?")) {
                finishSimulado(moduleId);
            }
        }
    }

    window.registerSimuladoAnswer = function(qId, answer) {
        userAnswers[qId] = answer;
    };

    function startTimer(moduleId) {
        const display = document.getElementById('timer-display');
        simuladoTimerInterval = setInterval(() => {
            simuladoTimeLeft--;
            const m = Math.floor(simuladoTimeLeft / 60);
            const s = simuladoTimeLeft % 60;
            display.textContent = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
            
            if (simuladoTimeLeft <= 0) {
                clearInterval(simuladoTimerInterval);
                alert("Tempo esgotado! O simulado será encerrado.");
                finishSimulado(moduleId);
            }
        }, 1000);
    }

   // === FINALIZAÇÃO DO SIMULADO ===
    function finishSimulado(moduleId) {
        clearInterval(simuladoTimerInterval);
        
        let correctCount = 0;
        const total = activeSimuladoQuestions.length;
        let feedbackHtml = '<div class="space-y-6 mt-8">';

        activeSimuladoQuestions.forEach((q, i) => {
            const selected = userAnswers[i]; // 'i' é o índice do loop (0, 1, 2...)
            const isCorrect = selected === q.answer;
            if(isCorrect) correctCount++;
            
            const boxClass = isCorrect ? 'feedback-correct' : 'feedback-wrong';
            const icon = isCorrect ? 'fa-check-circle' : 'fa-times-circle';
            const explanation = q.explanation || "Sem explicação disponível.";

            let optionsHtml = '';
            for (const key in q.options) {
                let rowClass = 'bg-gray-50 dark:bg-gray-800 text-gray-500'; 
                let iconStatus = '';

                if (key === q.answer) {
                    rowClass = 'answer-row correct-ref'; 
                    iconStatus = '<i class="fas fa-check text-green-500 float-right"></i>';
                } else if (key === selected && !isCorrect) {
                    rowClass = 'answer-row user-wrong'; 
                    iconStatus = '<i class="fas fa-times text-red-500 float-right"></i>';
                }

                optionsHtml += `
                    <div class="${rowClass}">
                        <strong class="mr-2 uppercase">${key})</strong> ${q.options[key]} ${iconStatus}
                    </div>
                `;
            }

            feedbackHtml += `
                <div class="feedback-box ${boxClass}">
                    <div class="feedback-header">
                        <span>${i+1}. ${q.question}</span>
                        <i class="fas ${icon} text-xl"></i>
                    </div>
                    <div class="feedback-body bg-white dark:bg-gray-900">
                        <div class="mb-3 text-xs font-bold text-gray-400 uppercase">SUA RESPOSTA: <span class="${isCorrect ? 'text-green-500' : 'text-red-500'}">${selected ? selected.toUpperCase() : 'NENHUMA'}</span></div>
                        ${optionsHtml}
                        <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p class="text-xs font-bold text-blue-500 mb-1"><i class="fas fa-info-circle"></i> EXPLICAÇÃO:</p>
                            <p class="explanation-text">${explanation}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        feedbackHtml += '</div>';

        const score = (correctCount / total) * 10;
        const percentage = (correctCount / total) * 100;

        const finalHtml = `
            <div class="text-center animate-slide-in">
                <h2 class="text-3xl font-serif font-bold mb-6 text-blue-900 dark:text-white">Resultado Final</h2>
                
                <div class="circle-chart" style="--percentage: ${percentage}" data-score="${score.toFixed(1)}"></div>
                
                <p class="text-gray-600 dark:text-gray-300 mb-2">Você acertou <strong>${correctCount}</strong> de <strong>${total}</strong> questões (${percentage.toFixed(0)}%).</p>
                
                <div class="w-full max-w-md mx-auto bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-8 overflow-hidden">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${percentage}%"></div>
                </div>

                <div class="flex justify-center mb-8">
                    <button onclick="location.reload()" class="action-button">
                        <i class="fas fa-undo mr-2"></i> Voltar ao Início
                    </button>
                </div>

                <div class="text-left">
                    <h3 class="text-xl font-bold text-blue-500 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2"><i class="fas fa-clipboard-check mr-2"></i> Gabarito Detalhado</h3>
                    ${feedbackHtml}
                </div>
            </div>
        `;
        
        contentArea.innerHTML = finalHtml;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (!completedModules.includes(moduleId)) {
            completedModules.push(moduleId);
            localStorage.setItem('gateBombeiroCompletedModules_v3', JSON.stringify(completedModules));
            
            // ADICIONADO: Salva no banco de dados
            saveProgressToCloud();
            
            updateProgress();
        }
    }

    function renderPremiumLockScreen(title) {
        contentArea.innerHTML = `<div class="text-center py-12 px-6"><div class="inline-block p-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-6"><i class="fas fa-lock text-5xl text-yellow-600 dark:text-yellow-500"></i></div><h2 class="text-3xl font-bold mb-4 text-gray-800 dark:text-white">Conteúdo Exclusivo</h2><p class="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-8">O módulo <strong>${title}</strong> faz parte do nosso pacote avançado. Assine agora para desbloquear Simulados, Bônus e muito mais.</p><button id="premium-lock-btn" class="action-button pulse-button text-lg px-8 py-4"><i class="fas fa-crown mr-2"></i> DESBLOQUEAR TUDO AGORA</button></div>`;
        document.getElementById('premium-lock-btn').addEventListener('click', () => { document.getElementById('expired-modal').classList.add('show'); document.getElementById('name-modal-overlay').classList.add('show'); });
        updateActiveModuleInList();
        updateNavigationButtons();
    }

    function handleQuizOptionClick(e) {
        const o = e.currentTarget;
        if (o.disabled) return;
        const moduleId = o.dataset.module;
        const questionId = o.dataset.questionId;
        const selectedAnswer = o.dataset.answer;
        const questionData = cachedQuestionBanks[moduleId]?.find(q => q.id === questionId);
        if (!questionData) return; 
        
        const correctAnswer = questionData.answer;
        const correctAnswerText = questionData.options[correctAnswer];
        const explanationText = questionData.explanation || 'Nenhuma explicação disponível.';
        
        const optionsGroup = o.closest('.quiz-options-group');
        const feedbackArea = document.getElementById(`feedback-${questionId}`);
        
        optionsGroup.querySelectorAll(`.quiz-option[data-question-id="${questionId}"]`).forEach(opt => {
            opt.disabled = true;
            if (opt.dataset.answer === correctAnswer) opt.classList.add('correct');
        });
        
        let feedbackContent = '';
        if (selectedAnswer === correctAnswer) {
            o.classList.add('correct');
            feedbackContent = `
                <div class="p-3 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 rounded">
                    <strong class="block text-green-700 dark:text-green-400 mb-1"><i class="fas fa-check-circle mr-2"></i> Correto!</strong> 
                    <div class="text-sm text-gray-600 dark:text-gray-300">${explanationText}</div>
                </div>
            `;
            try { triggerSuccessParticles(e, o); } catch (err) {}
        } else {
            o.classList.add('incorrect');
            feedbackContent = `
                <div class="p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded">
                    <div class="mb-2"><strong class="text-red-700 dark:text-red-400"><i class="fas fa-times-circle mr-2"></i> Incorreto.</strong></div>
                    <div class="mb-2 text-sm text-gray-700 dark:text-gray-200">
                        A resposta correta é: <span class="font-bold text-green-600 dark:text-green-400 block mt-1 p-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">${correctAnswer.toUpperCase()}) ${correctAnswerText}</span>
                    </div>
                    <div class="text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <strong>Explicação:</strong> ${explanationText}
                    </div>
                </div>
            `;
        }
        
        if (feedbackArea) {
            feedbackArea.innerHTML = `<div class="explanation mt-3 animate-slide-in">${feedbackContent}</div>`;
            feedbackArea.classList.remove('hidden');
        }
    }
    
    function updateBreadcrumbs(moduleTitle = 'Início') {
        const homeLink = `<a href="#" id="home-breadcrumb" class="text-blue-600 dark:text-blue-400 hover:text-orange-500 transition-colors"><i class="fas fa-home mr-1"></i> Início</a>`;
        if (!currentModuleId) {
            breadcrumbContainer.innerHTML = homeLink;
        } else {
            const category = Object.values(moduleCategories).find(cat => {
                const moduleNum = parseInt(currentModuleId.replace('module', ''));
                return moduleNum >= cat.range[0] && moduleNum <= cat.range[1];
            });
            if (category) {
                const categoryLink = `<span class="mx-2 text-gray-400">/</span> <span class="font-bold text-gray-700 dark:text-gray-300">${category.title}</span>`;
                const moduleSpan = `<span class="mx-2 text-gray-400">/</span> <span class="text-orange-500">${moduleTitle}</span>`;
                breadcrumbContainer.innerHTML = `${homeLink} ${categoryLink} ${moduleSpan}`;
            } else {
                breadcrumbContainer.innerHTML = `${homeLink} <span class="mx-2 text-gray-400">/</span> ${moduleTitle}`;
            }
        }
        document.getElementById('home-breadcrumb')?.addEventListener('click', (e) => { e.preventDefault(); goToHomePage(); });
    }
    
    function setupNotesListener(id) {
        const notesTextarea = document.getElementById(`notes-module-${id}`);
        if (notesTextarea) {
            notesTextarea.addEventListener('keyup', () => {
                localStorage.setItem('note-' + id, notesTextarea.value);
            });
        }
    }

    function goToHomePage() {
        localStorage.removeItem('gateBombeiroLastModule'); 
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        if (contentArea) contentArea.innerHTML = getWelcomeContent();
        document.getElementById('module-nav')?.classList.add('hidden');
        document.querySelectorAll('.module-list-item.active').forEach(i => i.classList.remove('active'));
        currentModuleId = null;
        closeSidebar();
        const btn = document.getElementById('start-course');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', () => { loadModuleContent('module1'); });
        }
        const continueBtn = document.getElementById('continue-course');
        continueBtn?.addEventListener('click', () => loadModuleContent(continueBtn.dataset.module || 'module1'));

        document.querySelectorAll('[data-open-module]').forEach(button => {
            button.addEventListener('click', () => loadModuleContent(button.dataset.openModule || 'module1'));
        });

        document.querySelector('[data-quick-action="modules"]')?.addEventListener('click', () => {
            if (window.innerWidth < 1024) openSidebar();
            else document.querySelector('.sidebar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        document.getElementById('student-open-payment')?.addEventListener('click', () => {
            document.getElementById('expired-modal')?.classList.add('show');
            document.getElementById('name-modal-overlay')?.classList.add('show');
        });

        document.getElementById('restart-tour-inline')?.addEventListener('click', () => startOnboardingTour(true));
        updateBreadcrumbs();
    }

    function getWelcomeContent() {
        const stats = getLearningStats();
        const userName = (currentUserData?.name || 'Aluno').split(' ')[0];
        const continueId = stats.lastModuleId && moduleContent[stats.lastModuleId] ? stats.lastModuleId : stats.nextModuleId;
        const continueTitle = stats.lastModule?.title || stats.nextModule?.title || 'Primeiro módulo';
        const nextTitle = stats.nextModule?.title || 'Curso concluído';
        const courseLabel = currentUserData?.courseType === 'SP' ? 'Segurança Patrimonial' : 'Bombeiro Civil e Brigadista';

        return `
            <section class="student-home">
                <div class="student-home-hero">
                    <div>
                        <span class="student-eyebrow"><i class="fas fa-shield-alt"></i> ${courseLabel}</span>
                        <h2>Olá, ${userName}. Vamos continuar sua evolução?</h2>
                        <p>Seu painel está pronto com o próximo passo, desempenho e atalhos para estudar sem perder tempo.</p>
                        <div class="student-hero-actions">
                            <button id="continue-course" data-module="${continueId}" class="action-button">
                                <i class="fas fa-play-circle mr-2"></i> Continuar de onde parei
                            </button>
                            <button id="start-course" class="secondary-action-button">
                                <i class="fas fa-list-ul mr-2"></i> Ver primeiro módulo
                            </button>
                        </div>
                    </div>
                    <div class="student-progress-ring" style="--progress:${stats.percent * 3.6}deg">
                        <span>${stats.percent}%</span>
                        <small>concluído</small>
                    </div>
                </div>

                <div class="student-dashboard-grid">
                    <article class="student-stat-card">
                        <i class="fas fa-check-circle text-green-500"></i>
                        <span>Módulos concluídos</span>
                        <strong>${stats.doneCount}/${stats.total}</strong>
                    </article>
                    <article class="student-stat-card">
                        <i class="fas fa-route text-orange-500"></i>
                        <span>Restantes</span>
                        <strong>${stats.remaining}</strong>
                    </article>
                    <article class="student-stat-card">
                        <i class="fas fa-medal text-yellow-500"></i>
                        <span>Conquistas</span>
                        <strong>${stats.achievementCount}</strong>
                    </article>
                </div>

                <div class="student-next-panel">
                    <div>
                        <span class="student-eyebrow"><i class="fas fa-book-reader"></i> Próximo foco</span>
                        <h3>${nextTitle}</h3>
                        <p>Recomendação: conclua o próximo módulo e faça os exercícios de fixação logo em seguida.</p>
                    </div>
                    <button class="secondary-action-button" data-open-module="${stats.nextModuleId}">
                        <i class="fas fa-arrow-right mr-2"></i> Abrir próximo
                    </button>
                </div>

                <div class="student-quick-actions">
                    <button data-quick-action="modules"><i class="fas fa-layer-group"></i><span>Módulos</span></button>
                    <button data-open-module="${stats.nextModuleId}"><i class="fas fa-pencil-alt"></i><span>Exercícios</span></button>
                    <button id="student-open-payment"><i class="fas fa-crown"></i><span>Planos</span></button>
                    <button id="restart-tour-inline"><i class="fas fa-circle-question"></i><span>Tutorial</span></button>
                </div>
            </section>
        `;
    }

    function setupProtection() {
        document.body.style.userSelect = 'none';
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => { if (e.ctrlKey || e.metaKey) { if (['c','a','x','v','s','p','u'].includes(e.key.toLowerCase())) e.preventDefault(); } if (e.key === 'F12') e.preventDefault(); });
        document.querySelectorAll('img').forEach(img => { img.draggable = false; img.addEventListener('dragstart', e => e.preventDefault()); });
    }

    function setupTheme() {
        const isDark = localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', isDark);
        updateThemeIcons();
    }
    function toggleTheme() {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        updateThemeIcons();
    }
    function updateThemeIcons() {
        const icon = document.documentElement.classList.contains('dark') ? 'fa-sun' : 'fa-moon';
        document.querySelectorAll('#dark-mode-toggle-desktop i, #bottom-nav-theme i').forEach(i => i.className = `fas ${icon} text-2xl`);
    }

    function shuffleArray(array) {
        let newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
    
    function getCategoryColor(moduleId) {
        if (!moduleId) return 'text-gray-500'; 
        const num = parseInt(moduleId.replace('module', ''));
        for (const key in moduleCategories) {
            const cat = moduleCategories[key];
            if (num >= cat.range[0] && num <= cat.range[1]) {
                switch (key) {
                    case 'rh': return 'text-orange-500'; 
                    case 'legislacao': return 'text-orange-500'; 
                    case 'salvamento': return 'text-blue-500'; 
                    case 'pci': return 'text-red-500'; 
                    case 'aph_novo': return 'text-green-500'; 
                    case 'nr33': return 'text-teal-500';       
                    case 'nr35': return 'text-indigo-500'; 
                    default: return 'text-gray-500';
                }
            }
        }
        return 'text-gray-500';
    }
    
    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('show');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
        }
    }
    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        document.body.classList.add('sidebar-open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('hidden');
            setTimeout(() => sidebarOverlay.classList.add('show'), 10);
        }
    }
    function populateModuleLists() {
        document.getElementById('desktop-module-container').innerHTML = getModuleListHTML();
        document.getElementById('mobile-module-container').innerHTML = getModuleListHTML();
    }

    // --- FUNÇÃO ATUALIZADA: LISTA DE MÓDULOS COM CONTADORES E SEGURANÇA ACL ---
    // --- FUNÇÃO ATUALIZADA: LISTA DE MÓDULOS COM SUPORTE A CATEGORIAS SP ---
    function getModuleListHTML() {
        let html = `
            <div class="module-sidebar-header">
                <div>
                    <h2><i class="fas fa-list-ul"></i> Conteúdo do Curso</h2>
                    <p>Escolha uma aula ou continue pelo seu progresso.</p>
                </div>
            </div>
            <div class="module-search-shell">
                <i class="fas fa-search"></i>
                <input type="text" class="module-search" placeholder="Buscar módulo...">
                <button type="button" class="module-search-clear" title="Limpar busca"><i class="fas fa-times"></i></button>
            </div>
            <div class="module-search-meta">
                <span class="module-search-count">Mostrando todos os módulos</span>
            </div>
            <div class="module-empty-state hidden">
                <i class="fas fa-magnifying-glass"></i>
                <strong>Nenhum módulo encontrado</strong>
                <span>Tente buscar por outro termo.</span>
            </div>
            <div class="module-accordion-container space-y-2">
        `;
        
        for (const k in moduleCategories) {
            const cat = moduleCategories[k];
            const isLocked = cat.isPremium && (!currentUserData || currentUserData.status !== 'premium');
            const lockIcon = isLocked ? '<i class="fas fa-lock text-xs ml-2 text-yellow-500"></i>' : '';
            
            // --- CÁLCULO DE CONTADORES ---
            let catTotal = 0;
            let catCompleted = 0;
            
            // Define quem é o usuário
            const userType = currentUserData ? (currentUserData.courseType || 'BC') : 'BC';
            const isManager = currentUserData ? (currentUserData.isAdmin || currentUserData.courseType === 'GESTOR') : false;

            // Determina o prefixo baseado na categoria (SEGREDO AQUI)
            // Se a categoria tem isSP: true, buscamos sp_moduleX. Senão, moduleX.
            const prefix = cat.isSP ? 'sp_module' : 'module';

            for(let i = cat.range[0]; i <= cat.range[1]; i++) {
                const mid = `${prefix}${i}`; // Monta o ID correto (ex: sp_module1 ou module1)

                if(moduleContent[mid]) {
                    // ACL: Verifica se deve contar este módulo
                    const isSpContent = mid.startsWith('sp_');
                    let showIt = true;

                    if (!isManager) {
                        if (userType === 'BC' && isSpContent) showIt = false; 
                        if (userType === 'SP' && !isSpContent) showIt = false; 
                    }

                    if (showIt) {
                        catTotal++;
                        if(completedModules.includes(mid)) catCompleted++;
                    }
                }
            }

            // Se a categoria estiver vazia para este aluno, não desenha o botão dela
            if (catTotal === 0 && !isManager) continue; 

            const catPercent = catTotal ? Math.round((catCompleted / catTotal) * 100) : 0;
            html += `
                <div class="module-category">
                    <button class="accordion-button">
                        <span><i class="${cat.icon} w-6 mr-2 text-gray-500"></i>${cat.title} ${lockIcon}</span>
                        <span class="module-count">${catCompleted}/${catTotal}</span>
                        <i class="fas fa-chevron-down"></i>
                        <span class="category-progress" style="width:${catPercent}%"></span>
                    </button>
                    <div class="accordion-panel">
            `;
            
            // --- GERAÇÃO DA LISTA DE MÓDULOS ---
            for (let i = cat.range[0]; i <= cat.range[1]; i++) {
                const mid = `${prefix}${i}`; // ID Correto
                const m = moduleContent[mid];

                if (m) {
                    // ACL: Verifica se deve exibir (Mesma lógica de cima)
                    const isSpContent = m.id.startsWith('sp_');
                    if (!isManager) {
                        if (userType === 'BC' && isSpContent) continue;
                        if (userType === 'SP' && !isSpContent) continue;
                    }

                    const isDone = Array.isArray(completedModules) && completedModules.includes(m.id);
                    const itemLock = isLocked ? '<i class="fas fa-lock text-xs text-gray-400 ml-2"></i>' : '';
                    const moduleNumber = String(i).padStart(2, '0');
                    const statusLabel = isDone ? 'Concluído' : (isLocked ? 'Premium' : 'Disponível');
                    html += `
                        <div class="module-list-item${isDone ? ' completed' : ''}${isLocked ? ' locked' : ''}" data-module="${m.id}" data-status="${statusLabel}">
                            <span class="module-number">${moduleNumber}</span>
                            <i class="${m.iconClass} module-icon"></i>
                            <span class="module-item-title">${m.title} ${itemLock}</span>
                            <span class="module-status-pill">${statusLabel}</span>
                            ${isDone ? '<i class="fas fa-check-circle completion-icon" aria-hidden="true"></i>' : ''}
                        </div>
                    `;
                }
            }
            html += `</div></div>`;
        }
        
        // Finaliza o HTML
        html += `</div>`;
        html += `<div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700"><h3 class="text-xl font-semibold mb-6 text-gray-800 dark:text-white flex items-center"><i class="fas fa-medal mr-2 text-yellow-500"></i> Conquistas por Área</h3><div id="achievements-grid" class="grid grid-cols-2 gap-4">`;
        
        for (const key in moduleCategories) {
            const cat = moduleCategories[key];
            let showAchievement = true;
            
            // Esconde conquista da área errada
            if (currentUserData && !currentUserData.isAdmin && currentUserData.courseType !== 'GESTOR') {
                const type = currentUserData.courseType || 'BC';
                if (type === 'BC' && cat.isSP) showAchievement = false;
                if (type === 'SP' && !cat.isSP) showAchievement = false;
            }

            if (showAchievement) {
                const prefix = cat.isSP ? 'sp_module' : 'module';
                let achTotal = 0;
                let achDone = 0;
                for (let i = cat.range[0]; i <= cat.range[1]; i++) {
                    const mid = `${prefix}${i}`;
                    if (!moduleContent[mid]) continue;
                    achTotal++;
                    if (completedModules.includes(mid)) achDone++;
                }
                const achPercent = achTotal ? Math.round((achDone / achTotal) * 100) : 0;
                html += `
                    <div id="ach-cat-${key}" class="achievement-card" title="Conclua a área para ganhar: ${cat.achievementTitle}">
                        <div class="achievement-icon"><i class="${cat.icon}"></i></div>
                        <p class="achievement-title">${cat.achievementTitle}</p>
                        <div class="achievement-progress"><span style="width:${achPercent}%"></span></div>
                        <small>${achDone}/${achTotal} módulos</small>
                    </div>
                `;
            }
        }
        html += `</div></div>`;
        return html;
    }

    function updateProgress() {
        const visibleIds = getVisibleModuleIds();
        if (visibleIds.length === 0) return;
        const visibleCompleted = visibleIds.filter(id => completedModules.includes(id));
        const visibleTotal = visibleIds.length;
        totalModules = visibleTotal;
        const p = Math.min(100, (visibleCompleted.length / visibleTotal) * 100);
        document.getElementById('progress-text').textContent = `${p.toFixed(0)}%`;
        document.getElementById('completed-modules-count').textContent = visibleCompleted.length;
        document.getElementById('total-modules').textContent = visibleTotal;
        document.getElementById('course-modules-count').textContent = visibleTotal;
        if (document.getElementById('progress-bar-minimal')) {
            document.getElementById('progress-bar-minimal').style.width = `${p}%`;
        }
        updateModuleListStyles();
        checkAchievements();
        // Atualiza contadores do sidebar
        populateModuleLists(); 
        
        if (visibleTotal > 0 && visibleCompleted.length === visibleTotal) showCongratulations();
    }

    function showCongratulations() {
        document.getElementById('congratulations-modal')?.classList.add('show');
        document.getElementById('modal-overlay')?.classList.add('show');
        if(typeof confetti === 'function') confetti({particleCount:150, spread:90, origin:{y:0.6},zIndex:200});
    }
    function showAchievementToast(title) {
        showAppToast('Módulo concluído', title, 'success');
    }
    function updateModuleListStyles() {
        document.querySelectorAll('.module-list-item').forEach(i => i.classList.toggle('completed', completedModules.includes(i.dataset.module)));
    }
    // --- FUNÇÃO CORRIGIDA: VERIFICAÇÃO DE CONQUISTAS (COM ACL) ---
    function checkAchievements() {
        let newNotification = false;
        
        // 1. Identifica quem é o aluno
        const userType = currentUserData ? (currentUserData.courseType || 'BC') : 'BC';
        const isManager = currentUserData ? (currentUserData.isAdmin || currentUserData.courseType === 'GESTOR') : false;

        for(const key in moduleCategories) {
            const cat = moduleCategories[key];
            
            // 2. ACL: Se a conquista não é do curso do aluno, PULA IMEDIATAMENTE
            // Isso impede que Bombeiro ganhe medalha de SP e vice-versa
            if (!isManager) {
                if (userType === 'BC' && cat.isSP) continue; 
                if (userType === 'SP' && !cat.isSP) continue;
            }

            let allComplete = true;
            
            // 3. Define o prefixo correto do ID (module ou sp_module)
            const prefix = cat.isSP ? 'sp_module' : 'module';

            // 4. Verifica módulo por módulo
            for(let i = cat.range[0]; i <= cat.range[1]; i++) {
                const mid = `${prefix}${i}`;
                
                // Se o módulo não existe no banco OU o aluno não fez -> Incompleto
                if (!moduleContent[mid] || !completedModules.includes(mid)) {
                    allComplete = false; 
                    break;
                }
            }

            // 5. Se completou tudo e ainda não foi notificado -> Solta os confetes
            if (allComplete && !notifiedAchievements.includes(key)) {
                showAchievementModal(cat.achievementTitle, cat.icon);
                notifiedAchievements.push(key);
                newNotification = true;
            }
            
            // 6. Atualiza o visual (cadeado/cor) no painel de módulos
            document.querySelectorAll(`#ach-cat-${key}`).forEach(el => el.classList.toggle('unlocked', allComplete));
        }
        
        // Salva estado das notificações para não repetir
        if (newNotification) localStorage.setItem('gateBombeiroNotifiedAchievements_v3', JSON.stringify(notifiedAchievements));
    }
    function showAchievementModal(title, iconClass) {
        const iconContainer = document.getElementById('ach-modal-icon-container');
        const titleEl = document.getElementById('ach-modal-title');
        if (!achievementModal || !achievementOverlay || !iconContainer || !titleEl) return;
        iconContainer.innerHTML = `<i class="${iconClass}"></i>`;
        titleEl.textContent = `Conquista: ${title}`;
        achievementModal.classList.add('show');
        achievementOverlay.classList.add('show');
        if(typeof confetti === 'function') confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, zIndex: 103 });
    }
    function hideAchievementModal() {
        achievementModal?.classList.remove('show');
        achievementOverlay?.classList.remove('show');
    }

    function toggleFocusMode() {
        const isEnteringFocusMode = !document.body.classList.contains('focus-mode');
        document.body.classList.toggle('focus-mode');
        if (!isEnteringFocusMode) closeSidebar();
    }

    function setupConcludeButtonListener() {
        if (!currentModuleId) return;
        const b = document.querySelector(`.conclude-button[data-module="${currentModuleId}"]`);
        if(b) {
            if (concludeButtonClickListener) b.removeEventListener('click', concludeButtonClickListener);
            if(completedModules.includes(currentModuleId)){
                b.disabled=true;
                b.innerHTML='<i class="fas fa-check-circle mr-2"></i> Concluído';
            } else {
                b.disabled = false;
                b.innerHTML = 'Concluir Módulo';
                concludeButtonClickListener = () => handleConcludeButtonClick(b);
                b.addEventListener('click', concludeButtonClickListener);
            }
        }
    }
    let concludeButtonClickListener = null;
    function handleConcludeButtonClick(b) {
        const id = b.dataset.module;
        if (id && !completedModules.includes(id)) {
            completedModules.push(id);
            localStorage.setItem('gateBombeiroCompletedModules_v3', JSON.stringify(completedModules));
            
            // ADICIONADO: Salva no banco de dados agora
            saveProgressToCloud();

            updateProgress();
            b.disabled = true;
            b.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Concluído';
            showAchievementToast(moduleContent[id].title);
            if(typeof confetti === 'function') confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, zIndex: 2000 });
            setTimeout(() => {
                const navContainer = document.getElementById('module-nav');
                const nextButton = document.getElementById('next-module');
                if (navContainer) {
                    navContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    if (nextButton && !nextButton.disabled) nextButton.classList.add('blinking-button');
                }
            }, 700);
        }
    }
    function updateActiveModuleInList() {
        document.querySelectorAll('.module-list-item').forEach(i => i.classList.toggle('active', i.dataset.module === currentModuleId));
    }
    // --- FUNÇÃO CORRIGIDA: ATUALIZAR ESTADO DOS BOTÕES (Navegação) ---
    function updateNavigationButtons() {
        const prevModule = document.getElementById('prev-module');
        const nextModule = document.getElementById('next-module');
        
        if (!prevModule || !nextModule) return;
        
        if (!currentModuleId) {
             prevModule.disabled = true;
             nextModule.disabled = true;
             return;
        }
        
        // Lógica Híbrida: Detecta se é SP ou BC para extrair o número corretamente
        let n = 0;
        if (currentModuleId.startsWith('sp_module')) {
            n = parseInt(currentModuleId.replace('sp_module', ''));
        } else {
            n = parseInt(currentModuleId.replace('module', ''));
        }

        // Bloqueia se for o primeiro (1) ou o último (totalModules)
        prevModule.disabled = (n <= 1);
        nextModule.disabled = (n >= totalModules); 
    }
    function setupQuizListeners() {
        document.querySelectorAll('.quiz-option').forEach(o => o.addEventListener('click', handleQuizOptionClick));
    }

    function triggerSuccessParticles(clickEvent, element) {
        if (typeof confetti === 'function') confetti({ particleCount: 28, spread: 70, origin: { x: clickEvent ? clickEvent.clientX/window.innerWidth : 0.5, y: clickEvent ? clickEvent.clientY/window.innerHeight : 0.5 } });
    }

    function setupHeaderScroll() {
        const header = document.getElementById('main-header');
        if (header) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) header.classList.add('scrolled');
                else header.classList.remove('scrolled');
            });
        }
    }

    function setupRippleEffects() {
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.action-button') || e.target.closest('.quiz-option');
            if (btn) {
                const oldRipple = btn.querySelector('.ripple');
                if (oldRipple) oldRipple.remove();
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                const rect = btn.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
                ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
                btn.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            }
        });
    }

    function addEventListeners() {
        // 1. Botões de Navegação (CORRIGIDO PARA SUPORTAR SP E BC)
        const nextButton = document.getElementById('next-module');
        const prevButton = document.getElementById('prev-module');

        prevButton?.addEventListener('click', () => {
            if (!currentModuleId) return;
            
            // Detecta prefixo correto (module ou sp_module)
            let prefix = 'module';
            let n = 0;

            if (currentModuleId.startsWith('sp_module')) {
                prefix = 'sp_module';
                n = parseInt(currentModuleId.replace('sp_module', ''));
            } else {
                n = parseInt(currentModuleId.replace('module', ''));
            }

            if(n > 1) {
                loadModuleContent(`${prefix}${n-1}`);
            }
            nextButton?.classList.remove('blinking-button');
        });

        nextButton?.addEventListener('click', () => {
            if (!currentModuleId) return;
            
            // Detecta prefixo correto
            let prefix = 'module';
            let n = 0;

            if (currentModuleId.startsWith('sp_module')) {
                prefix = 'sp_module';
                n = parseInt(currentModuleId.replace('sp_module', ''));
            } else {
                n = parseInt(currentModuleId.replace('module', ''));
            }

            // Usa totalModules (que já é filtrado por curso no login)
            if(n < totalModules) {
                loadModuleContent(`${prefix}${n+1}`);
            }
            nextButton?.classList.remove('blinking-button');
        });
const managerPanelBtn = document.getElementById("manager-panel-btn");
if (managerPanelBtn) {
    managerPanelBtn.addEventListener("click", () => {
        console.log("🔓 Botão de gestor clicado!");
        openManagerPanel();
    });
    // Lógica da busca Admin
document.getElementById('admin-search-input')?.addEventListener('input', function(e) {
    window.filterAdminTable();
});

// Lógica da busca Gestor
document.getElementById('manager-search-input')?.addEventListener('input', function(e) {
    window.filterManagerTable();
});

// Ligar o botão de biometria
document.getElementById('btn-biometric-login')?.addEventListener('click', () => {
    FirebaseCourse.loginWithBiometrics();
});
}

// --- NOVO: Botão Manual de Salvar Progresso (Rodapé) ---
document.getElementById('manual-sync-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('manual-sync-btn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Salvando...';
    btn.disabled = true;

    try {
        await window.saveProgressToCloud(); // Chama a função blindada que já criamos
        showAppToast('Progresso salvo', 'Sua evolução foi sincronizada na nuvem.', 'success');
    } catch (error) {
        showAppToast('Erro ao salvar', error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});
            // --- ADICIONE ISTO NO FINAL DA FUNÇÃO addEventListeners ---
        
        // Botão manual do Tour (Garante que funcione mesmo clicando várias vezes)
        const tourBtn = document.getElementById('restart-tour-btn');
        if (tourBtn) {
            // Removemos clone para limpar ouvintes antigos e adicionamos o novo
            const newTourBtn = tourBtn.cloneNode(true);
            tourBtn.parentNode.replaceChild(newTourBtn, tourBtn);
            
            newTourBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Iniciando tour manual..."); 
                startOnboardingTour(true);
            });
        }
        

        // 2. Busca
        document.body.addEventListener('input', e => {
            if(e.target.matches('.module-search')) {
                const s = normalizeSearchText(e.target.value);
                const root = e.target.closest('#desktop-module-container, #mobile-module-container');
                if (root) {
                    const accordionContainer = root.querySelector('.module-accordion-container');
                    const countEl = root.querySelector('.module-search-count');
                    const emptyEl = root.querySelector('.module-empty-state');
                    if (accordionContainer) {
                        let visibleCount = 0;
                        const allItems = accordionContainer.querySelectorAll('.module-list-item');
                        allItems.forEach(i => {
                            const text = normalizeSearchText(i.textContent);
                            const match = text.includes(s);
                            i.style.display = match ? 'flex' : 'none';
                            if (match) visibleCount++;
                            if(match && s.length > 0) {
                                const panel = i.closest('.accordion-panel');
                                const btn = panel.previousElementSibling;
                                if(!btn.classList.contains('active')) {
                                    btn.classList.add('active');
                                    panel.style.maxHeight = panel.scrollHeight + "px";
                                }
                            }
                        });
                        if (countEl) {
                            countEl.textContent = s.length > 0
                                ? `${visibleCount} resultado${visibleCount === 1 ? '' : 's'} encontrado${visibleCount === 1 ? '' : 's'}`
                                : 'Mostrando todos os módulos';
                        }
                        emptyEl?.classList.toggle('hidden', visibleCount > 0 || s.length === 0);
                        if(s.length === 0) {
                            accordionContainer.querySelectorAll('.accordion-button').forEach(btn => {
                                btn.classList.remove('active');
                                btn.nextElementSibling.style.maxHeight = null;
                            });
                        }
                    }
                }
            }
        });

        document.body.addEventListener('click', e => {
            const clearBtn = e.target.closest('.module-search-clear');
            if (!clearBtn) return;
            const root = clearBtn.closest('#desktop-module-container, #mobile-module-container');
            const input = root?.querySelector('.module-search');
            if (!input) return;
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
        });

        // 3. Admin Panel (Correção Mobile)
        adminBtn?.addEventListener('click', window.openAdminPanel);
        mobileAdminBtn?.addEventListener('click', window.openAdminPanel);

        closeAdminBtn?.addEventListener('click', () => {
            adminModal.classList.remove('show');
            adminOverlay.classList.remove('show');
        });
        adminOverlay?.addEventListener('click', () => {
            adminModal.classList.remove('show');
            adminOverlay.classList.remove('show');
        });

        // 4. Reset com Limpeza de Nuvem
        document.getElementById('reset-progress')?.addEventListener('click', () => { 
            document.getElementById('reset-modal')?.classList.add('show'); 
            document.getElementById('reset-modal-overlay')?.classList.add('show'); 
        });
        
        document.getElementById('cancel-reset-button')?.addEventListener('click', () => { 
            document.getElementById('reset-modal')?.classList.remove('show'); 
            document.getElementById('reset-modal-overlay')?.classList.remove('show'); 
        });
        
        document.getElementById('confirm-reset-button')?.addEventListener('click', async () => {
            const btn = document.getElementById('confirm-reset-button');
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Resetando...';
            btn.disabled = true;

            try {
                // 1. Limpa no Banco de Dados (Firestore) se estiver logado
                if (currentUserData && currentUserData.uid) {
                    const db = window.__fbDB || window.fbDB;
                    await db.collection('users').doc(currentUserData.uid).update({
                        completedModules: [] // Zera no banco
                    });
                }

                // 2. Limpa Local
                window.clearLocalUserData();

                alert('Progresso resetado com sucesso!');
                window.location.reload();
            } catch (error) {
                console.error(error);
                alert("Erro ao resetar na nuvem, mas o local foi limpo.");
                window.location.reload();
            }
        });
        
        // 5. Back to Top
        document.getElementById('back-to-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        window.addEventListener('scroll', () => {
            const btn = document.getElementById('back-to-top');
            if(btn) {
                if (window.scrollY > 300) { btn.style.display = 'flex'; setTimeout(() => { btn.style.opacity = '1'; btn.style.transform = 'translateY(0)'; }, 10); } 
                else { btn.style.opacity = '0'; btn.style.transform = 'translateY(20px)'; setTimeout(() => btn.style.display = 'none', 300); }
            }
        });

        // 6. Cliques
        document.body.addEventListener('click', e => {
            const moduleItem = e.target.closest('.module-list-item');
            if (moduleItem) {
                loadModuleContent(moduleItem.dataset.module);
                if (moduleItem.closest('#mobile-module-container')) closeSidebar();
                const nextButton = document.getElementById('next-module');
                if(nextButton) nextButton.classList.remove('blinking-button');
            }

            if (e.target.closest('.accordion-button')) {
                const b = e.target.closest('.accordion-button');
                const p = b.nextElementSibling;
                if (!p) return;
                const isActive = b.classList.contains('active');
                const allPanels = b.closest('.module-accordion-container, .sidebar, #mobile-module-container').querySelectorAll('.accordion-panel');
                allPanels.forEach(op => {
                    if (op !== p && op.previousElementSibling) {
                            op.style.maxHeight = null;
                            op.previousElementSibling.classList.remove('active');
                    }
                });
                if (!isActive) {
                    b.classList.add('active');
                    p.style.maxHeight = p.scrollHeight + "px";
                } else {
                    b.classList.remove('active');
                    p.style.maxHeight = null;
                }
            }
        });

        document.getElementById('mobile-menu-button')?.addEventListener('click', openSidebar);
        document.getElementById('close-sidebar-button')?.addEventListener('click', closeSidebar);
        sidebarOverlay?.addEventListener('click', closeSidebar);
        document.getElementById('home-button-desktop')?.addEventListener('click', goToHomePage);
        document.getElementById('bottom-nav-home')?.addEventListener('click', goToHomePage);
        document.getElementById('bottom-nav-modules')?.addEventListener('click', openSidebar);
        document.getElementById('bottom-nav-theme')?.addEventListener('click', toggleTheme);
        document.getElementById('dark-mode-toggle-desktop')?.addEventListener('click', toggleTheme);
        document.getElementById('focus-mode-toggle')?.addEventListener('click', toggleFocusMode);
        document.getElementById('bottom-nav-focus')?.addEventListener('click', toggleFocusMode);
        document.getElementById('focus-menu-modules')?.addEventListener('click', openSidebar);
        document.getElementById('focus-menu-exit')?.addEventListener('click', toggleFocusMode);
        document.getElementById('focus-nav-modules')?.addEventListener('click', openSidebar);
        document.getElementById('focus-nav-exit')?.addEventListener('click', toggleFocusMode);
        document.getElementById('close-congrats')?.addEventListener('click', () => { document.getElementById('congratulations-modal').classList.remove('show'); document.getElementById('modal-overlay').classList.remove('show'); });
        closeAchButton?.addEventListener('click', hideAchievementModal);
        achievementOverlay?.addEventListener('click', hideAchievementModal);
        setupIamWidget();
    }
// ... (restante do código anterior) ...

   // --- 6. IAM - INTELIGÊNCIA ARTIFICIAL MEDEIROS ---
    function setupIamWidget() {
        const widget = document.getElementById('iam-ai-widget');
        const launcher = document.getElementById('iam-ai-launcher');
        const closeBtn = document.getElementById('iam-ai-close');
        const frame = document.getElementById('iam-ai-frame');

        if (!widget || !launcher || launcher.dataset.bound === 'true') return;
        launcher.dataset.bound = 'true';

        const closeIam = () => {
            widget.classList.remove('open');
            document.body.classList.remove('iam-open');
            launcher.setAttribute('aria-expanded', 'false');
        };

        const openIam = () => {
            const today = new Date().toLocaleDateString();
            const key = `ai_usage_${today}`;
            let count = parseInt(window.localStorage?.getItem(key) || '0') + 1;

            const isPremium = currentUserData && currentUserData.status === 'premium';
            const limit = isPremium ? 50 : 5; 

            if (count > limit) {
                showAppToast('Limite diário da IAM atingido', `Seu plano permite ${limit} aberturas por dia.`, 'warning');
                document.getElementById('expired-modal')?.classList.add('show');
                document.getElementById('name-modal-overlay')?.classList.add('show');
                return;
            }

            window.localStorage?.setItem(key, count);
            widget.classList.add('open');
            document.body.classList.add('iam-open');
            launcher.setAttribute('aria-expanded', 'true');
            if (frame && !frame.src) frame.src = 'https://iam-intelig-ncia-artificial-medeiros-801400632400.us-west2.run.app/';
        };

        launcher.addEventListener('click', () => {
            if (widget.classList.contains('open')) closeIam();
            else openIam();
        });
        closeBtn?.addEventListener('click', closeIam);
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeIam();
        });
    }

   // --- 7. TOUR GUIADO (ONBOARDING - AJUSTE FINAL MOBILE/DESKTOP) ---
    function startOnboardingTour(isManual = false) {
        // Se for automático e já tiver visto, cancela
        if (!isManual && localStorage.getItem('bravo_tour_completed') === 'true') return;

        setTimeout(() => {
            if (!window.driver || !window.driver.js || !window.driver.js.driver) return;

            const driver = window.driver.js.driver;
            const isMobile = window.innerWidth < 768; // Detecta se é celular
            
            const installBtnDesktop = document.getElementById('install-app-btn');
            const installBtnMobile = document.getElementById('install-app-btn-mobile');
            
            const steps = [
                { 
                    element: '#accessibility-fab', 
                    popover: { 
                        title: '1. Acessibilidade', 
                        description: 'Ajuste o tamanho, a fonte e o espaçamento aqui.', 
                        side: "left", 
                        align: 'end' 
                    } 
                },
                { 
                    element: '#iam-ai-launcher', 
                    popover: { 
                        title: '2. IAM (IA)', 
                        description: 'Tire dúvidas com a Inteligência Artificial Medeiros.', 
                        // AJUSTE 1: No celular, o balão fica EM CIMA (top) para não cobrir o rodapé
                        // No desktop, fica à DIREITA (right)
                        side: isMobile ? "top" : "right", 
                        align: isMobile ? "center" : "end" 
                    } 
                }
            ];

            // Passo da Instalação (Condicional)
            if (installBtnDesktop && !installBtnDesktop.classList.contains('hidden')) {
                // VERSÃO DESKTOP
                steps.push({ 
                    element: '#install-app-btn', 
                    popover: { 
                        title: '3. Instale no Computador', 
                        description: 'Tenha acesso rápido instalando o App no seu Celular ou Computador.', 
                        side: "bottom",
                        align: 'center'
                    } 
                });
            } else if (installBtnMobile && !installBtnMobile.classList.contains('hidden')) {
                // AJUSTE 2: VERSÃO MOBILE (Texto corrigido)
                steps.push({ 
                    element: '#mobile-menu-button', 
                    popover: { 
                        title: '3. Instale o App', 
                        description: 'Abra o menu e clique em <strong>Instalar App</strong> para ter o Bravo Charlie no seu celular.', 
                        side: "bottom",
                        align: 'end'
                    } 
                });
            }

            const driverObj = driver({
                showProgress: true,
                animate: true,
                stagePadding: 5,
                popoverClass: 'driverjs-theme',
                steps: steps,
                onDestroyed: () => {
                    if (!isManual) localStorage.setItem('bravo_tour_completed', 'true');
                },
                nextBtnText: 'Próximo',
                prevBtnText: 'Voltar',
                doneBtnText: 'Concluir'
            });

            driverObj.drive();
        }, 1500);
    }
 // --- FUNÇÕES QUE FALTAVAM NO ADMIN (EDITAR, NOTA, RESET, EXCLUIR) ---

    // 1. Editar Dados (Nome)
    window.editUserData = async function(uid, oldName, oldCpf) {
        const newName = prompt("Editar Nome do Aluno:", oldName);
        if (newName === null || newName === oldName) return;
        
        try {
            await window.__fbDB.collection('users').doc(uid).update({ name: newName });
            alert("Nome atualizado com sucesso!");
            openAdminPanel(); // Atualiza a tabela
        } catch (e) {
            alert("Erro ao atualizar: " + e.message);
        }
    };

    // 2. Nota do Admin (Obs)
    window.editUserNote = async function(uid, currentNote) {
        // Remove escape chars se houver
        const cleanNote = currentNote === 'undefined' ? '' : currentNote;
        const note = prompt("Nota do Admin (Ex: 'Pagamento pendente', 'VIP'):", cleanNote);
        if (note === null) return;

        try {
            await window.__fbDB.collection('users').doc(uid).update({ adminNote: note });
            openAdminPanel(); // Atualiza a tabela
        } catch (e) {
            alert("Erro ao salvar nota: " + e.message);
        }
    };

    // 3. Resetar Senha (Envia E-mail)
    window.sendResetEmail = async function(email) {
        if (!confirm(`Deseja enviar um e-mail de redefinição de senha para ${email}?`)) return;
        
        try {
            await window.__fbAuth.sendPasswordResetEmail(email);
            alert(`E-mail de redefinição enviado para ${email}. Peça para o aluno verificar a caixa de entrada/spam.`);
        } catch (e) {
            alert("Erro ao enviar e-mail: " + e.message);
        }
    };
    // --- FUNÇÃO PIX ---
    window.copyPixKey = function(key) {
        navigator.clipboard.writeText(key).then(() => {
            showAppToast('Chave PIX copiada', key, 'success');
        }).catch(err => {
            prompt("Copie a chave manualmente:", key);
        });
    };

    // --- LÓGICA DA LANDING PAGE PROFISSIONAL ---

// Rola suavemente até a história
window.scrollToStory = function() {
    const section = document.getElementById('story-section');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
}

// Entra no sistema e verifica login (VERSÃO OTIMIZADA PARA MOBILE)
window.enterSystem = function() {
    const landing = document.getElementById('landing-hero');
    
    if (landing) {
        // 1. Prepara a animação (Hardware Acceleration)
        landing.style.willChange = 'transform, opacity';
        landing.style.transition = 'transform 0.8s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.8s ease';
        
        // 2. Força o navegador a reconhecer o estado atual antes de mudar
        requestAnimationFrame(() => {
            // Aplica o movimento
            landing.style.transform = 'translate3d(0, -100%, 0)'; // translate3d ativa a GPU do celular
            landing.style.opacity = '0';
        });
    }

    // 3. Aguarda a animação terminar para destravar o scroll e remover a capa
    setTimeout(() => {
        if (landing) landing.classList.add('hidden'); // Remove do DOM
        document.body.classList.remove('landing-active'); // Destrava a rolagem do corpo principal SÓ AGORA
        
        // Verifica autenticação
        if (!currentUserData) {
            console.log("Ativando verificação de autenticação...");
            if (typeof FirebaseCourse !== 'undefined') {
                FirebaseCourse.checkAuth((user, userData) => {
                    onLoginSuccess(user, userData);
                });
            }
        }
    }, 800); // Tempo sincronizado com a transição (0.8s)
}
// --- SISTEMA DE ANIMAÇÃO E NOTEBOOK (COM DICA MOBILE) ---
function initScrollReveal() {
    const laptop = document.getElementById('laptop-lid');
    const heroContainer = document.getElementById('landing-hero');
    const tapHint = document.getElementById('notebook-tap-hint');

    // Função Unificada: Abre o notebook e esconde a dica
    const openLaptop = () => {
        if (laptop && !laptop.classList.contains('open')) {
            // 1. Abre a tampa
            laptop.classList.add('open');
            
            // 2. Some com a dica visualmente
            if (tapHint) {
                tapHint.style.opacity = '0'; // Fica transparente
                // Remove do layout após o efeito visual (0.5s)
                setTimeout(() => {
                    tapHint.style.display = 'none'; 
                }, 500);
            }
        }
    };

    // --- A. GATILHO POR ROLAGEM (Desktop/Geral) ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Anima textos
                if (entry.target.classList.contains('reveal-on-scroll')) {
                    entry.target.classList.remove('opacity-0', 'translate-y-10', 'translate-x-10', '-translate-x-10', 'scale-95');
                    observer.unobserve(entry.target);
                }
                
                // Anima Notebook (Se o navegador detectar a rolagem)
                if (entry.target.id === 'laptop-lid') {
                    openLaptop(); 
                    observer.unobserve(entry.target);
                }
            }
        });
    }, {
        threshold: 0.1, // Sensibilidade alta (10%)
        root: heroContainer // Importante para detectar dentro da capa
    });

    // Registra elementos
    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
    if (laptop) observer.observe(laptop);

    // --- B. GATILHO POR TOQUE (Mobile/Interação) ---
    if (laptop) {
        // Se clicar no próprio notebook
        laptop.addEventListener('click', openLaptop);
        
        // Se clicar na área envolta (wrapper) - ajuda em telas pequenas
        const wrapper = document.querySelector('.laptop-wrapper');
        if(wrapper) {
            wrapper.addEventListener('click', openLaptop);
            wrapper.addEventListener('touchstart', openLaptop, {passive: true});
        }
    }
}
// Rolar para a próxima seção
window.scrollToNextSection = function() {
    const section = document.getElementById('features-section');
    if(section) section.scrollIntoView({ behavior: 'smooth' });
}
    // --- FUNÇÃO PARA INICIAR LOGIN COMO GESTOR ---
window.startManagerLogin = function() {
       enterSystem();
};
  // VARIÁVEL GLOBAL PARA ARMAZENAR DADOS DO GESTOR TEMPORARIAMENTE
let managerCachedUsers = [];

// ============================================================
// BLOCO CORRIGIDO: GESTÃO DE EQUIPE, FILTRO E PROGRESSO
// ============================================================

// --- FUNÇÃO SUBSTITUTA (Copie e cole sobre a antiga window.openManagerPanel) ---
window.openManagerPanel = function() {
    console.log("🔓 Abrindo Painel do Gestor (MODO TEMPO REAL)...");

    const db = window.__fbDB || window.fbDB; 
    
    // Verificação de segurança
    if (!db) { alert("⏳ Sistema carregando. Tente novamente."); return; }
    if (!currentUserData) { alert("❌ Erro: Usuário não identificado."); return; }

    const modal = document.getElementById("manager-modal");
    const overlay = document.getElementById("admin-modal-overlay");
    const tbody = document.getElementById("manager-table-body");
    const titleEl = document.getElementById("manager-company-name");
    const filterSelect = document.getElementById('mgr-filter-turma');

    if (!modal || !overlay) return;

    // Abre o modal
    modal.classList.add("show");
    overlay.classList.add("show");

    if (titleEl) titleEl.textContent = "Gestão de Equipe (Ao Vivo 🔴)";
    
    // Configura o botão de fechar para DESLIGAR a conexão (Economia de dados)
    const closeBtn = document.getElementById("close-manager-modal");
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.remove("show");
            
            // 🔥 AQUI ESTÁ O SEGREDO: Desliga o radar ao fechar a janela
            if (typeof managerUnsubscribe === 'function') {
                managerUnsubscribe();
                managerUnsubscribe = null;
                console.log("🔒 Conexão em tempo real encerrada.");
            }
            
            // Só fecha o overlay se o painel de admin geral não estiver aberto por baixo
            if (!document.getElementById("admin-modal")?.classList.contains("show")) {
                overlay.classList.remove("show");
            }
        };
    }

    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i> Conectando ao satélite...</td></tr>`;

    // --- CONEXÃO FIREBASE EM TEMPO REAL ---
    
    // 1. Se já existir uma conexão aberta, fecha a anterior para não duplicar
    if (managerUnsubscribe) managerUnsubscribe();

    try {
        // 2. Cria o Listener (.onSnapshot em vez de .get)
        managerUnsubscribe = db.collection("users").onSnapshot((snapshot) => {
            let users = [];
            let turmasEncontradas = new Set();

            snapshot.forEach(doc => {
                const u = doc.data();
                u.uid = doc.id;
                // Tratamento de dados para evitar erro se o campo não existir
                u.company = (u.company || "Particular").trim()
                if (!u.completedModules) u.completedModules = [];
                
                users.push(u);
                turmasEncontradas.add(u.company);
            });

            // Ordenação Alfabética
            users.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            
            // Salva no cache global para o filtro usar
            window.managerCachedUsers = users;

           // Preenche SEMPRE o filtro de turmas com o snapshot atual
if (filterSelect) {
    const valorAtual = filterSelect.value || 'TODOS';
    filterSelect.innerHTML = '<option value="TODOS">Todas as Turmas</option>';
    Array.from(turmasEncontradas).sort().forEach(turma => {
        filterSelect.innerHTML += `<option value="${turma}">${turma}</option>`;
    });
    // Se a turma selecionada ainda existir, mantém; senão volta para TODOS
    const exists = Array.from(filterSelect.options).some(opt => opt.value === valorAtual);
    filterSelect.value = exists ? valorAtual : 'TODOS';
}

            // Chama o renderizador da tabela
            window.filterManagerTable();
            console.log("📡 Dados atualizados em tempo real! (Ping)");

        }, (error) => {
            console.error("Erro no listener:", error);
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Erro de conexão: ${error.message}</td></tr>`;
        });

    } catch (err) {
        console.error("Erro ao iniciar listener:", err);
    }
};

// 2. Função de Filtro Inteligente
window.filterManagerTable = function() {
    const input = document.getElementById('manager-search-input');
    const select = document.getElementById('mgr-filter-turma');
    const selectedTurma = select ? select.value : 'TODOS';
    
    if (!window.managerCachedUsers) return;

    let filteredList = window.managerCachedUsers;

    if (selectedTurma !== 'TODOS') {
        filteredList = window.managerCachedUsers.filter(u => u.company === selectedTurma);
    }

    if (input && input.value) {
        filteredList = filteredList.filter(u => userMatchesSearch(u, input.value));
    }

    renderManagerTable(filteredList);
};

// 3. Função de Tabela com Progresso Corrigido
window.renderManagerTable = function(usersList) {
    const tbody = document.getElementById('manager-table-body');
    if (!tbody) return;

    let html = '';
    let stats = { total: 0, completed: 0, progress: 0, pending: 0 };

    if (!usersList || usersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500 italic">Nenhum aluno encontrado nesta turma.</td></tr>';
        updateManagerStats(stats);
        return;
    }

        usersList.forEach(u => {
        // Garante que completedModules venha sempre como array
        const completedArr = Array.isArray(u.completedModules)
            ? u.completedModules
            : (u.completedModules && typeof u.completedModules === 'object'
                ? Object.keys(u.completedModules)   // caso salvo como objeto {id:true}
                : []);

        const userVisibleModules = getVisibleModuleIds(u);
        const total = userVisibleModules.length || 1;
        const modulesDone = userVisibleModules.filter(id => completedArr.includes(id)).length;

        let percent = 0;
        if (total > 0) {
            percent = Math.round((modulesDone / total) * 100);
        }
        if (percent > 100) percent = 100;

        let progressColor = 'bg-gray-300';
        if (percent > 0) progressColor = 'bg-red-500';
        if (percent > 30) progressColor = 'bg-yellow-500';
        if (percent > 80) progressColor = 'bg-green-500';
        if (percent === 100) progressColor = 'bg-blue-600';

        stats.total++;
        if (percent >= 100) stats.completed++;
        else if (percent > 0) stats.progress++;
        else stats.pending++;

        const phone = u.phone || 'Não informado';
        const turma = u.company || 'Particular';
        
        let statusBadge = u.status === 'premium' 
            ? '<span class="px-2 py-1 bg-green-100 text-green-800 text-[10px] rounded font-bold uppercase">PREMIUM</span>' 
            : '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] rounded font-bold uppercase">TRIAL</span>';

        let validadeStr = u.acesso_ate ? new Date(u.acesso_ate).toLocaleDateString('pt-BR') : '-';

        html += `
            <tr class="hover:bg-gray-50 border-b border-gray-100 group transition-colors">
                <td class="px-4 py-3">
                    <div class="font-bold text-gray-800 text-sm">${u.name || 'Sem Nome'}</div>
                    <div class="text-xs text-gray-500">${u.email}</div>
                </td>
                <td class="px-4 py-3 text-xs text-gray-600">
                    <div class="flex items-center gap-2">
                        ${phone !== 'Não informado' ? '<i class="fab fa-whatsapp text-green-500"></i>' : ''} ${phone}
                        <button onclick="editUserPhone('${u.uid}', '${phone}')" class="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100"><i class="fas fa-pencil-alt"></i></button>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] rounded font-bold border border-blue-100 uppercase">${turma}</span>
                        <button onclick="editUserClass('${u.uid}', '${turma}')" class="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100"><i class="fas fa-pencil-alt"></i></button>
                    </div>
                </td>
                <td class="px-4 py-3" title="${modulesDone}/${total}">
                    <div class="flex items-center w-full max-w-[140px]">
                        <div class="flex-1 bg-gray-200 rounded-full h-2 mr-2 overflow-hidden">
                            <div class="${progressColor} h-2 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                        </div>
                        <span class="text-xs font-bold text-gray-700 w-8 text-right">${percent}%</span>
                    </div>
                </td>
                <td class="px-4 py-3">${statusBadge}</td>
                <td class="px-4 py-3 text-xs font-mono text-gray-600">${validadeStr}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updateManagerStats(stats);
};

function updateManagerStats(stats) {
    if(document.getElementById('mgr-total-users')) document.getElementById('mgr-total-users').innerText = stats.total;
    if(document.getElementById('mgr-completed')) document.getElementById('mgr-completed').innerText = stats.completed;
    if(document.getElementById('mgr-progress')) document.getElementById('mgr-progress').innerText = stats.progress;
    if(document.getElementById('mgr-pending')) document.getElementById('mgr-pending').innerText = stats.pending;
}
// FUNÇÃO DE EDITAR TURMA
window.editUserClass = async function(uid, oldClass) {
    const newClass = prompt("Digite o novo nome da Turma/Empresa:", oldClass);
    
    if (newClass && newClass !== oldClass) {
        try {
            await window.__fbDB.collection('users').doc(uid).update({ 
                company: newClass.toUpperCase() 
            });
            alert("Turma atualizada com sucesso!");
            openManagerPanel(); // Recarrega para atualizar dados e filtros
        } catch (e) {
            alert("Erro ao atualizar: " + e.message);
        }
    }
};
    // FUNÇÃO DE EDITAR TELEFONE (NOVO)
window.editUserPhone = async function(uid, oldPhone) {
    // Se for "Não informado", limpa o campo para digitar do zero
    const cleanPhone = oldPhone === 'Não informado' ? '' : oldPhone;
    
    const newPhone = prompt("Digite o novo WhatsApp/Telefone:", cleanPhone);
    
    // Verifica se digitou algo e se é diferente do anterior
    if (newPhone !== null && newPhone !== cleanPhone) {
        try {
            await window.__fbDB.collection('users').doc(uid).update({ 
                phone: newPhone 
            });
            alert("Telefone atualizado com sucesso!");
            // Recarrega o painel para mostrar a mudança
            if(typeof openManagerPanel === 'function') {
                openManagerPanel(); 
            } else {
                // Fallback caso esteja no painel admin geral
                openAdminPanel(); 
            }
        } catch (e) {
            alert("Erro ao atualizar: " + e.message);
        }
    }
};
    // Função para dar/tirar poder de Gestor
window.toggleManagerRole = async function(uid, currentStatus) {
    const novoStatus = !currentStatus; // Inverte (se era true vira false, e vice-versa)
    const acao = novoStatus ? "PROMOVER" : "REMOVER";
    
    if(confirm(`Deseja ${acao} este usuário como Gestor de Empresa?`)) {
        try {
            await window.__fbDB.collection('users').doc(uid).update({ 
                isManager: novoStatus 
            });
            alert(`Sucesso! Permissão de Gestor ${novoStatus ? 'CONCEDIDA' : 'REMOVIDA'}.`);
            openAdminPanel(); // Atualiza a lista
        } catch(e) {
            alert("Erro: " + e.message);
        }
    }
};
window.saveProgressToCloud = function(targetUid = null) {
    return new Promise((resolve, reject) => {
        try {
            if (!currentUserData || !currentUserData.uid) {
                console.warn("⚠️ Usuário não definido, não há o que salvar.");
                resolve();
                return;
            }

            // 1. Decide para qual UID salvar
            let finalTargetUid = targetUid || currentUserData.uid;

            // 2. Pega o progresso
            let modulesToSave = completedModules || [];
            if (!modulesToSave || modulesToSave.length === 0) {
                const localData = localStorage.getItem('gateBombeiroCompletedModules_v3');
                if (localData) {
                    modulesToSave = JSON.parse(localData);
                    completedModules = modulesToSave;
                }
            }
            modulesToSave = Array.from(new Set(modulesToSave));

            console.log("📤 Enviando para nuvem. UID:", finalTargetUid, "| Módulos:", modulesToSave.length);

            // 3. Envio ao Firestore
            const db = window.__fbDB || window.fbDB;
            if (!db) {
                console.error("❌ ERRO: Banco de dados ainda não está pronto em saveProgressToCloud.");
                alert("Sistema ainda está carregando. Tente novamente em alguns segundos.");
                resolve();
                return;
            }

            db.collection('users').doc(finalTargetUid).update({
                completedModules: modulesToSave,
                last_progress_update: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                console.log("✅ SUCESSO: Progresso salvo no banco de dados!");

                if (currentUserData) {
                    currentUserData.completedModules = modulesToSave;
                }

                resolve();
            }).catch(err => {
                console.error("❌ ERRO NO BANCO DE DADOS:", err);
                alert("Erro ao salvar: " + err.message);
                reject(err);
            });

        } catch (err) {
            console.error("❌ ERRO GERAL em saveProgressToCloud:", err);
            reject(err);
        }
    });
};
    
// --- FUNÇÃO PARA ALTERAR CURSO (ADMIN) ---
window.changeUserCourse = async function(uid, currentType) {
    const promptText = "Digite o código do curso para este aluno:\n\nBC = Bombeiro Civil\nSP = Segurança Patrimonial";
    let newType = prompt(promptText, currentType);
    
    if (newType === null) return; // Cancelou
    
    newType = newType.toUpperCase().trim();
    
    // Validação simples
    if (newType !== 'BC' && newType !== 'SP') {
        alert("❌ Código inválido! Use apenas 'BC' ou 'SP'.");
        return;
    }

    if (newType === currentType) {
        alert("O aluno já está neste curso.");
        return;
    }

    try {
        const db = window.__fbDB || window.fbDB;
        await db.collection('users').doc(uid).update({
            courseType: newType
        });
        
        alert(`✅ Sucesso!\nCurso alterado para: ${newType === 'SP' ? 'Segurança Patrimonial' : 'Bombeiro Civil'}.`);
        
        // Recarrega a tabela para mostrar a mudança
        openAdminPanel(); 
    } catch (e) {
        alert("Erro ao alterar curso: " + e.message);
        console.error(e);
    }
};

    // --- NOVA FUNÇÃO: LIMPEZA TOTAL DE DADOS (LOGOUT/RESET) ---
window.clearLocalUserData = function() {
    // 1. Limpa variáveis globais da memória RAM
    completedModules = [];
    notifiedAchievements = [];
    currentUserData = null;
    totalModules = 0;

    // 2. Limpa o LocalStorage (Disco)
    localStorage.removeItem('gateBombeiroCompletedModules_v3');
    localStorage.removeItem('gateBombeiroNotifiedAchievements_v3');
    localStorage.removeItem('gateBombeiroLastModule');
    localStorage.removeItem('my_session_id');
    localStorage.removeItem('user_profile_pic');
    
    // Limpa notas salvas
    Object.keys(localStorage).forEach(key => { 
        if (key.startsWith('note-')) localStorage.removeItem(key); 
    });

    // 3. Atualiza a interface visualmente para "Zero"
    const totalEl = document.getElementById('total-modules');
    const completedEl = document.getElementById('completed-modules-count');
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar-minimal');
    const welcome = document.getElementById('welcome-greeting');

    if (totalEl) totalEl.textContent = '0';
    if (completedEl) completedEl.textContent = '0';
    if (progressText) progressText.textContent = '0%';
    if (progressBar) progressBar.style.width = '0%';
    if (welcome) welcome.textContent = 'Bem-vindo,';
    const iamWidget = document.getElementById('iam-ai-widget');
    const iamLauncher = document.getElementById('iam-ai-launcher');
    if (iamWidget) {
        iamWidget.classList.add('hidden');
        iamWidget.classList.remove('open');
    }
    if (iamLauncher) iamLauncher.setAttribute('aria-expanded', 'false');

    // 4. Reseta checkbox visual da lista
    document.querySelectorAll('.module-list-item').forEach(item => {
        item.classList.remove('completed', 'active');
        const icon = item.querySelector('.completion-icon');
        if(icon) icon.remove();
    });

    console.log("🧹 Dados locais limpos com sucesso.");
};

    // ============================================================
    // LÓGICA DO MODAL DE CONTATO (CURSOS EXTRAS)
    // ============================================================
    window.openContactModal = function(courseName) {
        const modal = document.getElementById('course-contact-modal');
        const overlay = document.getElementById('course-contact-overlay');
        const titleEl = document.getElementById('contact-course-name');
        const whatsBtn = document.getElementById('btn-whatsapp-contact');
        const emailBtn = document.getElementById('btn-email-contact');

        if (!modal || !overlay) return;

        // 1. Atualiza o Nome do Curso
        if (titleEl) titleEl.textContent = courseName;

        // 2. Configura o Link do WhatsApp (SEU NÚMERO AQUI)
        const phone = "5561998300711"; 
        const msg = encodeURIComponent(`Olá! Tenho interesse no curso de *${courseName}*. Poderia me passar mais informações sobre turmas e valores?`);
        if (whatsBtn) whatsBtn.href = `https://wa.me/${phone}?text=${msg}`;

        // 3. Configura o Link de Email
        if (emailBtn) emailBtn.href = `mailto:contato@bravos.com.br?subject=Interesse em ${courseName}`;

        // 4. Abre o Modal
        overlay.classList.add('show');
        modal.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
        modal.classList.add('opacity-100', 'pointer-events-auto', 'scale-100');
    };

    // Fechar Modal
    function closeContactModal() {
        const modal = document.getElementById('course-contact-modal');
        const overlay = document.getElementById('course-contact-overlay');
        
        if (modal) {
            modal.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
            modal.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
        }
        if (overlay) overlay.classList.remove('show');
    }

    document.getElementById('close-contact-modal')?.addEventListener('click', closeContactModal);
    document.getElementById('course-contact-overlay')?.addEventListener('click', closeContactModal);


    // ============================================================
    // LÓGICA DO CARROSSEL DE CURSOS EXTRAS (ARRASTAR E SETAS)
    // ============================================================
    (function initExtraCoursesCarousel() {
        const slider = document.getElementById('extra-courses-scroll');
        const leftBtn = document.getElementById('scroll-left-btn');
        const rightBtn = document.getElementById('scroll-right-btn');

        if (!slider) return;

        // --- 1. Lógica das Setas ---
        if (rightBtn) {
            rightBtn.addEventListener('click', () => {
                slider.scrollBy({ left: 340, behavior: 'smooth' }); 
            });
        }
        if (leftBtn) {
            leftBtn.addEventListener('click', () => {
                slider.scrollBy({ left: -340, behavior: 'smooth' }); 
            });
        }

        // --- 2. Lógica de "Agarrar e Arrastar" (Mouse Drag) ---
        let isDown = false;
        let startX;
        let scrollLeft;

        slider.addEventListener('mousedown', (e) => {
            isDown = true;
            slider.classList.add('active'); 
            slider.classList.remove('snap-x'); 
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });

        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.classList.remove('active');
            slider.classList.add('snap-x'); 
        });

        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.classList.remove('active');
            slider.classList.add('snap-x'); 
        });

        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault(); 
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 2; 
            slider.scrollLeft = scrollLeft - walk;
        });
    })();
    
    setupIamWidget();
    init(); // <--- Inicia o app
}); // <--- Fecha o DOMContentLoaded
