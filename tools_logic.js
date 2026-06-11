/* === LÓGICA DAS FERRAMENTAS (TOOLS) - VERSÃO REFINADA V5 (COM LIMPEZA) === */

(function(){
    window.ToolsApp = window.ToolsApp || {};
    const ToolsApp = window.ToolsApp;
    window.ToolsApp.toast = function(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast app-toast app-toast-${type}`;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-circle-info'}"></i><div><p class="font-bold">${message}</p></div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4200);
    };

    function isInstructorAdminUser(u = getUser()) {
        const email = (u.email || '').toLowerCase();
        const adminButtonVisible = !!document.querySelector('#admin-panel-btn:not(.hidden), #mobile-admin-btn:not(.hidden), #instructor-panel-btn:not(.hidden), #mobile-instructor-btn:not(.hidden)');
        return u.isAdmin === true || u.role === 'admin' || u.isManager === true || adminButtonVisible || email === 'coordenadormedeiros@gmail.com';
    }

    // =================================================================
    // 0. CHECKLIST DE PLANTÃO
    // =================================================================
    window.ToolsApp.renderChecklist = function(container) {
        const defaults = [
            'Uniforme e EPI conferidos',
            'Rádio/celular carregado',
            'Escala e posto confirmados',
            'Kit de primeiros socorros verificado',
            'Extintores/rotas observados',
            'Registro de passagem anotado'
        ];
        const saved = JSON.parse(localStorage.getItem('tool_checklist_v1')) || defaults.map(text => ({ text, done: false }));
        localStorage.setItem('tool_checklist_v1', JSON.stringify(saved));

        container.innerHTML += `
            <div class="tool-card tool-card-featured">
                <h3 class="tool-title"><i class="fas fa-clipboard-check text-emerald-500"></i> Checklist de Plantão</h3>
                <p class="tool-helper">Use antes de sair para o serviço ou ao assumir posto.</p>
                <div id="checklist-progress" class="tool-progress"><span></span></div>
                <ul id="checklist-list" class="space-y-2 mt-4"></ul>
                <div class="flex gap-2 mt-4">
                    <input id="checklist-new" class="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white text-sm" placeholder="Adicionar item...">
                    <button onclick="ToolsApp.addChecklistItem()" class="tool-icon-btn bg-emerald-600 hover:bg-emerald-500 text-white" title="Adicionar"><i class="fas fa-plus"></i></button>
                </div>
                <div class="mt-3 flex justify-between items-center">
                    <button onclick="ToolsApp.resetChecklist()" class="text-xs text-blue-500 hover:text-blue-700 font-bold"><i class="fas fa-rotate-left mr-1"></i> Reiniciar</button>
                    <button onclick="ToolsApp.clearChecklist()" class="text-xs text-red-500 hover:text-red-700 font-bold"><i class="fas fa-trash-alt mr-1"></i> Limpar</button>
                </div>
            </div>
        `;
        setTimeout(ToolsApp.updateChecklist, 100);
    };

    window.ToolsApp.getChecklist = function() {
        return JSON.parse(localStorage.getItem('tool_checklist_v1')) || [];
    };

    window.ToolsApp.saveChecklist = function(items) {
        localStorage.setItem('tool_checklist_v1', JSON.stringify(items));
        ToolsApp.updateChecklist();
    };

    window.ToolsApp.updateChecklist = function() {
        const list = document.getElementById('checklist-list');
        const bar = document.querySelector('#checklist-progress span');
        if (!list) return;
        const items = ToolsApp.getChecklist();
        const done = items.filter(item => item.done).length;
        const percent = items.length ? Math.round((done / items.length) * 100) : 0;
        if (bar) bar.style.width = `${percent}%`;
        list.innerHTML = items.length ? items.map((item, index) => `
            <li class="checklist-row ${item.done ? 'done' : ''}">
                <button onclick="ToolsApp.toggleChecklist(${index})" class="checklist-check" title="Marcar item">
                    <i class="fas ${item.done ? 'fa-check-circle' : 'fa-circle'}"></i>
                </button>
                <span>${item.text}</span>
                <button onclick="ToolsApp.removeChecklistItem(${index})" class="text-gray-300 hover:text-red-500"><i class="fas fa-times"></i></button>
            </li>
        `).join('') : '<li class="p-3 text-center text-gray-400 text-sm italic">Nenhum item no checklist.</li>';
    };

    window.ToolsApp.toggleChecklist = function(index) {
        const items = ToolsApp.getChecklist();
        if (!items[index]) return;
        items[index].done = !items[index].done;
        ToolsApp.saveChecklist(items);
    };

    window.ToolsApp.addChecklistItem = function() {
        const input = document.getElementById('checklist-new');
        const value = input?.value.trim();
        if (!value) return;
        const items = ToolsApp.getChecklist();
        items.push({ text: value, done: false });
        input.value = '';
        ToolsApp.saveChecklist(items);
    };

    window.ToolsApp.removeChecklistItem = function(index) {
        const items = ToolsApp.getChecklist();
        items.splice(index, 1);
        ToolsApp.saveChecklist(items);
    };

    window.ToolsApp.resetChecklist = function() {
        const items = ToolsApp.getChecklist().map(item => ({ ...item, done: false }));
        ToolsApp.saveChecklist(items);
        ToolsApp.toast('Checklist reiniciado');
    };

    window.ToolsApp.clearChecklist = function() {
        if(confirm('Apagar todos os itens do checklist?')) {
            localStorage.removeItem('tool_checklist_v1');
            ToolsApp.updateChecklist();
        }
    };

    // =================================================================
    // 1. PONTO ELETRÔNICO
    // =================================================================
    window.ToolsApp.renderPonto = function(container) {
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-clock"></i> Ponto Eletrônico</h3>
                
                <div class="mb-4 bg-gray-50 dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <label class="text-xs font-bold text-gray-500 block mb-1">Data/Hora Manual (Opcional)</label>
                    <input type="datetime-local" id="ponto-custom-time" class="w-full p-2 rounded border text-sm dark:bg-gray-700 dark:text-white mb-2">
                </div>

                <div class="grid grid-cols-2 gap-2 mb-4">
                    <button onclick="ToolsApp.addPonto('Entrada')" class="bg-green-600 text-white py-3 rounded font-bold text-xs hover:bg-green-500 shadow border-b-4 border-green-800 active:border-0 active:translate-y-1"><i class="fas fa-sign-in-alt"></i> ENTRADA</button>
                    <button onclick="ToolsApp.addPonto('Saída Almoço')" class="bg-yellow-600 text-white py-3 rounded font-bold text-xs hover:bg-yellow-500 shadow border-b-4 border-yellow-800 active:border-0 active:translate-y-1"><i class="fas fa-utensils"></i> SAI ALMOÇO</button>
                    <button onclick="ToolsApp.addPonto('Volta Almoço')" class="bg-yellow-500 text-white py-3 rounded font-bold text-xs hover:bg-yellow-400 shadow border-b-4 border-yellow-700 active:border-0 active:translate-y-1"><i class="fas fa-undo"></i> VOLTA ALMOÇO</button>
                    <button onclick="ToolsApp.addPonto('Saída')" class="bg-red-600 text-white py-3 rounded font-bold text-xs hover:bg-red-500 shadow border-b-4 border-red-800 active:border-0 active:translate-y-1"><i class="fas fa-sign-out-alt"></i> SAÍDA</button>
                </div>
                
                <div class="max-h-96 overflow-y-auto bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-0 custom-scrollbar">
                    <div id="ponto-list" class="flex flex-col divide-y divide-gray-100 dark:divide-gray-800"></div>
                </div>
                <div class="mt-3 text-right">
                    <button onclick="ToolsApp.clearPonto()" class="text-xs text-red-500 hover:text-red-700 font-bold transition-colors"><i class="fas fa-trash-alt mr-1"></i> Zerar Tudo</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
        setTimeout(ToolsApp.updatePontoList, 100);
    };

    window.ToolsApp.addPonto = function(type) {
        const customInput = document.getElementById('ponto-custom-time').value;
        let dateObj = customInput ? new Date(customInput) : new Date();
        
        const entry = { 
            id: Date.now(), 
            type: type, 
            iso: dateObj.toISOString(),
            timestamp: dateObj.getTime()
        };
        
        const points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        points.push(entry);
        points.sort((a, b) => b.timestamp - a.timestamp);
        
        localStorage.setItem('tool_ponto', JSON.stringify(points));
        document.getElementById('ponto-custom-time').value = '';
        ToolsApp.updatePontoList();
    };

    function calculateDailyHours(dayPoints) {
        const sorted = [...dayPoints].sort((a, b) => a.timestamp - b.timestamp);
        let totalMs = 0;
        let openEntry = null;

        sorted.forEach(p => {
            if (p.type === 'Entrada' || p.type === 'Volta Almoço') {
                openEntry = p.timestamp;
            } else if ((p.type === 'Saída' || p.type === 'Saída Almoço') && openEntry) {
                totalMs += (p.timestamp - openEntry);
                openEntry = null;
            }
        });

        if (totalMs === 0) return "--:--";

        const h = Math.floor(totalMs / 3600000);
        const m = Math.floor((totalMs % 3600000) / 60000);
        return `${h}h ${m < 10 ? '0'+m : m}m`;
    }

    window.ToolsApp.updatePontoList = function() {
        const points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        const container = document.getElementById('ponto-list');
        if(!container) return;
        
        if(points.length === 0) {
            container.innerHTML = '<div class="p-4 text-center text-gray-400 italic text-sm">Nenhum registro de ponto.</div>';
            return;
        }

        const grouped = {};
        points.forEach(p => {
            const dateKey = new Date(p.iso).toLocaleDateString('pt-BR');
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(p);
        });

        let html = '';
        Object.keys(grouped).forEach(dateStr => {
            const dayPoints = grouped[dateStr];
            const dailyTotal = calculateDailyHours(dayPoints);
            
            html += `
                <div class="bg-gray-50 dark:bg-gray-800/50">
                    <div class="p-2 px-3 bg-gray-100 dark:bg-gray-800 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                        <span class="font-bold text-sm text-gray-700 dark:text-gray-200"><i class="far fa-calendar-alt mr-1"></i> ${dateStr}</span>
                        <span class="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">Total: ${dailyTotal}</span>
                    </div>
                    <div class="divide-y divide-gray-100 dark:divide-gray-700">
            `;

            dayPoints.forEach(p => {
                const timeStr = new Date(p.iso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                let typeColor = 'text-gray-600';
                let icon = 'fa-circle';
                
                if(p.type === 'Entrada') { typeColor = 'text-green-600'; icon = 'fa-sign-in-alt'; }
                if(p.type === 'Saída') { typeColor = 'text-red-600'; icon = 'fa-sign-out-alt'; }
                if(p.type.includes('Almoço')) { typeColor = 'text-yellow-600'; icon = 'fa-utensils'; }

                html += `
                    <div class="flex justify-between items-center p-2 px-4 hover:bg-white dark:hover:bg-gray-700 transition-colors">
                        <div class="flex items-center gap-3">
                            <span class="font-mono text-sm font-bold text-gray-500 dark:text-gray-400">${timeStr}</span>
                            <span class="text-xs font-bold uppercase ${typeColor} flex items-center gap-1">
                                <i class="fas ${icon} text-[10px]"></i> ${p.type}
                            </span>
                        </div>
                        <button onclick="ToolsApp.removePonto(${p.id})" class="text-gray-300 hover:text-red-500 px-2"><i class="fas fa-times"></i></button>
                    </div>
                `;
            });

            html += `</div></div>`; 
        });

        container.innerHTML = html;
    };

    window.ToolsApp.removePonto = function(id) {
        let points = JSON.parse(localStorage.getItem('tool_ponto')) || [];
        points = points.filter(p => p.id !== id);
        localStorage.setItem('tool_ponto', JSON.stringify(points));
        ToolsApp.updatePontoList();
    };
    window.ToolsApp.clearPonto = function() {
        if(confirm('Apagar todo o histórico de pontos?')) { localStorage.removeItem('tool_ponto'); ToolsApp.updatePontoList(); }
    };


    // =================================================================
    // 2. ESCALA DE SERVIÇO
    // =================================================================
    window.ToolsApp.renderEscala = function(container) {
        const cfg = JSON.parse(localStorage.getItem('tool_escala_v3')) || { type: '12x36', start: '', folgaoDay: 'none' };
        window.currentEscalaView = new Date(); 

        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-calendar-alt"></i> Escala de Serviço</h3>
                
                <div class="flex flex-col gap-3 mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-[10px] uppercase font-bold text-gray-500">Escala</label>
                            <select id="escala-type" class="w-full p-2 rounded border bg-white dark:bg-gray-700 dark:text-white text-sm">
                                <option value="12x36" ${cfg.type === '12x36' ? 'selected' : ''}>12x36 (Dia Sim/Dia Não)</option>
                                <option value="24x48" ${cfg.type === '24x48' ? 'selected' : ''}>24x48 (1x3)</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-[10px] uppercase font-bold text-gray-500">1º Dia Trabalhado</label>
                            <input type="date" id="escala-start" value="${cfg.start}" class="w-full p-2 rounded border bg-white dark:bg-gray-700 dark:text-white text-sm">
                        </div>
                    </div>
                    <div>
                        <label class="text-[10px] uppercase font-bold text-gray-500">Folgão (A cada 15 dias)</label>
                        <select id="escala-folgao" class="w-full p-2 rounded border bg-white dark:bg-gray-700 dark:text-white text-sm">
                            <option value="none" ${cfg.folgaoDay === 'none' ? 'selected' : ''}>Não tenho folgão</option>
                            <option value="0" ${cfg.folgaoDay === '0' ? 'selected' : ''}>Domingo</option>
                            <option value="6" ${cfg.folgaoDay === '6' ? 'selected' : ''}>Sábado</option>
                        </select>
                        <p class="text-[10px] text-gray-400 mt-1">* Se o plantão cair neste dia, ele será pulado (Folga Extra).</p>
                    </div>
                    <button onclick="ToolsApp.saveEscalaConfig()" class="bg-blue-600 text-white py-2 rounded font-bold text-sm hover:bg-blue-500 shadow mt-1">SALVAR & GERAR</button>
                </div>
                
                <div class="flex justify-between items-center mb-2 px-2">
                    <button onclick="ToolsApp.changeEscalaMonth(-1)" class="text-gray-500 hover:text-blue-500"><i class="fas fa-chevron-left"></i></button>
                    <span id="escala-month-label" class="font-bold text-gray-700 dark:text-white uppercase text-sm">Mês</span>
                    <button onclick="ToolsApp.changeEscalaMonth(1)" class="text-gray-500 hover:text-blue-500"><i class="fas fa-chevron-right"></i></button>
                </div>

                <div class="bg-white dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700 shadow-inner">
                    <div id="escala-result" class="grid grid-cols-7 gap-1 text-center text-xs"></div>
                </div>
                <div class="mt-3 text-right">
                    <button onclick="ToolsApp.clearEscala()" class="text-xs text-red-500 hover:text-red-700 font-bold transition-colors"><i class="fas fa-trash-alt mr-1"></i> Limpar Escala</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
        if(cfg.start) setTimeout(ToolsApp.renderEscalaCalendar, 100);
    };

    window.ToolsApp.saveEscalaConfig = function() {
        const type = document.getElementById('escala-type').value;
        const startStr = document.getElementById('escala-start').value;
        const folgaoDay = document.getElementById('escala-folgao').value;

        if(!startStr) { alert('Selecione o primeiro dia trabalhado.'); return; }

        localStorage.setItem('tool_escala_v3', JSON.stringify({ type, start: startStr, folgaoDay }));
        ToolsApp.renderEscalaCalendar();
    };

    window.ToolsApp.changeEscalaMonth = function(delta) {
        if(!window.currentEscalaView) window.currentEscalaView = new Date();
        window.currentEscalaView.setMonth(window.currentEscalaView.getMonth() + delta);
        ToolsApp.renderEscalaCalendar();
    };

    window.ToolsApp.clearEscala = function() {
        if(confirm('Limpar configuração da escala?')) {
            localStorage.removeItem('tool_escala_v3');
            document.getElementById('escala-start').value = '';
            document.getElementById('escala-result').innerHTML = '<div class="col-span-7 text-gray-400 py-4">Escala limpa.</div>';
        }
    };

    window.ToolsApp.renderEscalaCalendar = function() {
        const cfg = JSON.parse(localStorage.getItem('tool_escala_v3'));
        if(!cfg || !cfg.start) return;

        const resultDiv = document.getElementById('escala-result');
        const monthLabel = document.getElementById('escala-month-label');
        
        const viewDate = window.currentEscalaView || new Date();
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        monthLabel.textContent = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        resultDiv.innerHTML = '';

        const weeks = ['D','S','T','Q','Q','S','S'];
        weeks.forEach(d => resultDiv.innerHTML += `<div class="font-bold p-1 text-gray-400 border-b border-gray-200 dark:border-gray-700 mb-1">${d}</div>`);

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for(let i=0; i<firstDayOfMonth; i++) resultDiv.innerHTML += `<div></div>`;

        const startDate = new Date(cfg.start + 'T12:00:00'); 
        const folgaoTargetDay = cfg.folgaoDay === 'none' ? -1 : parseInt(cfg.folgaoDay);
        const cycleStep = cfg.type === '12x36' ? 2 : 3;

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDayDate = new Date(year, month, day, 12, 0, 0);
            let cellClass = 'bg-gray-100 dark:bg-gray-800 text-gray-400';
            let content = day;
            let title = '';

            const diffTime = currentDayDate - startDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays % cycleStep === 0) {
                if (folgaoTargetDay !== -1 && currentDayDate.getDay() === folgaoTargetDay) {
                     cellClass = 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold border border-green-500';
                     title = 'Folgão';
                } else {
                    cellClass = 'bg-red-600 text-white font-bold shadow-md rounded-lg transform scale-90';
                    title = 'Plantão';
                }
            }

            const today = new Date();
            if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                cellClass += ' ring-2 ring-blue-500 ring-offset-1';
            }

            resultDiv.innerHTML += `<div class="p-1 flex items-center justify-center h-10 cursor-default ${cellClass}" title="${title}">${content}</div>`;
        }
    };


    // =================================================================
    // 3. HIDRATAÇÃO
    // =================================================================
    window.ToolsApp.renderWater = function(container) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('tool_water_v4')) || { date: today, count: 0, goal: 3000 };
        if(data.date !== today) { data.date = today; data.count = 0; }

        const percent = Math.min((data.count / data.goal) * 100, 100);

        let html = `
            <div class="tool-card text-center">
                <h3 class="tool-title"><i class="fas fa-tint text-blue-500"></i> Hidratação</h3>
                
                <div class="flex justify-center items-center gap-2 text-xs mb-4 text-gray-500">
                    Meta Diária: <input type="number" value="${data.goal}" onchange="ToolsApp.setWaterGoal(this.value)" class="w-16 border rounded text-center dark:bg-gray-700 p-1 font-bold"> ml
                </div>

                <!-- NOVA JARRA CSS -->
                <div class="relative mx-auto mb-6" style="width: 100px; height: 140px;">
                    <div class="water-jar">
                        <div id="water-level" class="water-level" style="height: ${percent}%"></div>
                        <div class="glass-reflection"></div>
                    </div>
                    <!-- Alça da Jarra -->
                    <div class="water-handle"></div>
                    
                    <div class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                         <span class="text-xl font-extrabold text-blue-900 dark:text-white drop-shadow-md bg-white/50 dark:bg-black/50 px-2 rounded backdrop-blur-sm" id="water-display">${data.count}</span>
                         <span class="text-xs ml-1 font-bold text-gray-600 dark:text-gray-300 mt-2">ml</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-3 gap-3 px-2 mb-3">
                    <button onclick="ToolsApp.addWater(250)" class="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 py-2 rounded-lg font-bold hover:bg-blue-200 transition-colors text-xs shadow-sm"><i class="fas fa-glass-whiskey"></i> +250</button>
                    <button onclick="ToolsApp.addWater(500)" class="bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-500 transition-colors text-xs shadow-md pulse-button"><i class="fas fa-bottle-water"></i> +500</button>
                    <button onclick="ToolsApp.addWater(-250)" class="bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-900 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors text-xs">-250</button>
                </div>
                <div class="mt-3 text-right">
                    <button onclick="ToolsApp.clearWater()" class="text-xs text-red-500 hover:text-red-700 font-bold transition-colors"><i class="fas fa-trash-alt mr-1"></i> Zerar Hoje</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
    };

    window.ToolsApp.addWater = function(val) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('tool_water_v4')) || { date: today, count: 0, goal: 3000 };
        data.count += parseInt(val);
        if(data.count < 0) data.count = 0;
        localStorage.setItem('tool_water_v4', JSON.stringify(data));
        ToolsApp.updateWaterUI(data);
    };

    window.ToolsApp.clearWater = function() {
        if(confirm('Zerar o contador de água de hoje?')) {
            let data = JSON.parse(localStorage.getItem('tool_water_v4')) || {};
            data.count = 0;
            localStorage.setItem('tool_water_v4', JSON.stringify(data));
            ToolsApp.updateWaterUI(data);
        }
    };

    window.ToolsApp.setWaterGoal = function(val) {
        const today = new Date().toLocaleDateString();
        let data = JSON.parse(localStorage.getItem('tool_water_v4')) || { date: today, count: 0, goal: 3000 };
        data.goal = parseInt(val);
        localStorage.setItem('tool_water_v4', JSON.stringify(data));
        ToolsApp.updateWaterUI(data);
    };

    window.ToolsApp.updateWaterUI = function(data) {
        document.getElementById('water-display').innerText = data.count;
        const percent = Math.min((data.count / data.goal) * 100, 100);
        document.getElementById('water-level').style.height = percent + '%';
    };

    // 4. IMC
    window.ToolsApp.renderHealth = function(container) {
        let html = `
            <div class="tool-card">
                <h3 class="tool-title"><i class="fas fa-heartbeat text-red-500"></i> Calculadora IMC</h3>
                <div class="flex gap-2 mb-3">
                    <div class="flex-1">
                        <label class="text-[10px] uppercase font-bold text-gray-500">Peso (KG)</label>
                        <input type="number" id="imc-weight" class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white text-center font-bold" placeholder="80">
                    </div>
                    <div class="flex-1">
                        <label class="text-[10px] uppercase font-bold text-gray-500">Altura (CM)</label>
                        <input type="number" id="imc-height" class="w-full p-2 border rounded dark:bg-gray-700 dark:text-white text-center font-bold" placeholder="175">
                    </div>
                </div>
                <button onclick="ToolsApp.calcIMC()" class="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white py-2 rounded font-bold shadow hover:opacity-90 transition-transform active:scale-95">CALCULAR</button>
                <div id="imc-result" class="mt-3 text-center h-8 font-bold text-sm text-gray-600 dark:text-gray-300"></div>
                <div class="mt-2 text-right">
                    <button onclick="ToolsApp.clearIMC()" class="text-xs text-red-500 hover:text-red-700 font-bold transition-colors"><i class="fas fa-trash-alt mr-1"></i> Limpar Campos</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
    };

    window.ToolsApp.calcIMC = function() {
        const w = parseFloat(document.getElementById('imc-weight').value);
        const h_cm = parseFloat(document.getElementById('imc-height').value);
        if(!w || !h_cm) { document.getElementById('imc-result').innerHTML = '<span class="text-red-500">Preencha os campos!</span>'; return; }
        const h_m = h_cm / 100;
        const imc = (w / (h_m * h_m)).toFixed(1);
        let msg = '', color = '';
        if(imc < 18.5) { msg = 'Abaixo do peso'; color = 'text-blue-500'; }
        else if(imc < 24.9) { msg = 'Peso ideal'; color = 'text-green-500'; }
        else if(imc < 29.9) { msg = 'Sobrepeso'; color = 'text-yellow-600'; }
        else { msg = 'Obesidade'; color = 'text-red-600'; }
        document.getElementById('imc-result').innerHTML = `<span class="${color}">IMC ${imc}: ${msg}</span>`;
    };

    window.ToolsApp.clearIMC = function() {
        document.getElementById('imc-weight').value = '';
        document.getElementById('imc-height').value = '';
        document.getElementById('imc-result').innerHTML = '';
    };

    // 5. Notas Rápidas
    window.ToolsApp.renderNotes = function(c) {
        const notes = JSON.parse(localStorage.getItem('tool_quicknotes'))||[];
        let html = `<div class="tool-card"><h3 class="tool-title"><i class="fas fa-sticky-note text-yellow-500"></i> Notas Rápidas</h3><div class="flex gap-2 mb-2"><input id="n-in" class="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white text-sm" placeholder="Lembrete..."><button onclick="ToolsApp.addN()" class="bg-yellow-500 hover:bg-yellow-600 px-3 rounded text-white shadow"><i class="fas fa-plus"></i></button></div><ul id="n-list" class="space-y-1 max-h-32 overflow-y-auto custom-scrollbar"></ul><div class="mt-2 text-right"><button onclick="ToolsApp.clearNotes()" class="text-xs text-red-500 hover:text-red-700 font-bold transition-colors"><i class="fas fa-trash-alt mr-1"></i> Apagar Tudo</button></div></div>`;
        c.innerHTML += html;
        setTimeout(ToolsApp.updN,100);
    };
    window.ToolsApp.addN=function(){const v=document.getElementById('n-in').value;if(v){const n=JSON.parse(localStorage.getItem('tool_quicknotes'))||[];n.unshift(v);localStorage.setItem('tool_quicknotes',JSON.stringify(n));document.getElementById('n-in').value='';ToolsApp.updN();}};
    window.ToolsApp.updN=function(){const n=JSON.parse(localStorage.getItem('tool_quicknotes'))||[];const l=document.getElementById('n-list');if(l)l.innerHTML=n.map((x,i)=>`<li class="bg-yellow-50 dark:bg-gray-700 border-l-4 border-yellow-400 p-2 text-xs flex justify-between items-center rounded shadow-sm"><span class="dark:text-gray-200">${x}</span><button onclick="ToolsApp.delN(${i})" class="text-red-400 hover:text-red-600"><i class="fas fa-times"></i></button></li>`).join('');};
    window.ToolsApp.delN=function(i){const n=JSON.parse(localStorage.getItem('tool_quicknotes'));n.splice(i,1);localStorage.setItem('tool_quicknotes',JSON.stringify(n));ToolsApp.updN();};
    window.ToolsApp.clearNotes = function() {
        if(confirm('Apagar todas as notas?')) {
            localStorage.removeItem('tool_quicknotes');
            ToolsApp.updN();
        }
    };

    // 6. Planejador
    window.ToolsApp.renderPlanner = function(c) {
       const t=localStorage.getItem('tool_planner')||'';
       c.innerHTML+=`<div class="tool-card"><h3 class="tool-title"><i class="fas fa-book text-indigo-500"></i> Planejador</h3><p class="tool-helper">Metas de estudo, pendências de plantão ou plano da semana.</p><textarea id="pl-t" class="w-full h-28 p-3 border rounded dark:bg-gray-700 dark:text-white text-sm resize-none" placeholder="Ex: revisar APH, separar EPI, confirmar escala...">${t}</textarea><div class="flex justify-between mt-2"><button onclick="ToolsApp.clearPlanner()" class="text-xs text-red-500 hover:text-red-700 font-bold transition-colors"><i class="fas fa-trash-alt mr-1"></i> Limpar Texto</button><button onclick="ToolsApp.savePlanner()" class="bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 rounded text-xs font-bold shadow"><i class="fas fa-save mr-1"></i> Salvar</button></div></div>`;
    };
    window.ToolsApp.savePlanner = function() {
        localStorage.setItem('tool_planner', document.getElementById('pl-t').value);
        ToolsApp.toast('Planejador salvo');
    };
    window.ToolsApp.clearPlanner = function() {
        if(confirm('Limpar o texto do planejador?')) {
            localStorage.removeItem('tool_planner');
            document.getElementById('pl-t').value = '';
        }
    };

    // =================================================================
    // 7. CENTRAL PROFISSIONAL - 20 FERRAMENTAS
    // =================================================================
    const toolStore = {
        get(key, fallback) {
            try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
            catch (e) { return fallback; }
        },
        set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
    };

    const getUser = () => (typeof window.__getCurrentUserData === 'function' ? window.__getCurrentUserData() : null) || {};
    const toolValue = id => (document.getElementById(id)?.value || '').trim();
    const setToolOutput = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };
    const copyToolOutput = async id => {
        const value = document.getElementById(id)?.value || document.getElementById(id)?.innerText || '';
        if (!value.trim()) return ToolsApp.toast('Nada para copiar', 'info');
        try {
            await navigator.clipboard.writeText(value);
            ToolsApp.toast('Texto copiado');
        } catch (e) {
            ToolsApp.toast('Selecione e copie manualmente', 'info');
        }
    };
    window.ToolsApp.copyToolOutput = copyToolOutput;
    window.ToolsApp.openIamAssistant = function() {
        const launcher = document.getElementById('iam-ai-launcher');
        const widget = document.getElementById('iam-ai-widget');
        const panel = document.getElementById('iam-ai-panel');
        if (widget) widget.classList.remove('hidden');
        if (panel && widget) {
            widget.classList.add('open');
            launcher?.setAttribute('aria-expanded', 'true');
            return;
        }
        launcher?.click();
    };

    function toolShell(id, icon, title, subtitle, body, extraClass = '') {
        return `
            <article class="tool-card pro-tool ${extraClass}" id="${id}">
                <div class="pro-tool-head">
                    <div class="pro-tool-icon"><i class="${icon}"></i></div>
                    <div>
                        <span class="pro-tool-kicker">Ferramenta profissional</span>
                        <h3 class="tool-title">${title}</h3>
                        <p class="tool-helper">${subtitle}</p>
                    </div>
                </div>
                <div class="pro-ai-strip">
                    <div class="pro-ai-mark">IAM</div>
                    <div>
                        <strong>Use o IAM para melhorar este resultado</strong>
                        <span>Peça para revisar texto, deixar mais formal, simular entrevista, criar plano ou adaptar para sua situação.</span>
                    </div>
                    <button type="button" onclick="ToolsApp.openIamAssistant()"><i class="fas fa-wand-magic-sparkles"></i> Abrir IAM</button>
                </div>
                <div class="pro-tool-body">
                    ${body}
                </div>
            </article>
        `;
    }

    function input(id, label, placeholder = '', type = 'text') {
        return `<label class="pro-field"><span>${label}</span><input id="${id}" type="${type}" placeholder="${placeholder}"></label>`;
    }

    function textarea(id, label, placeholder = '', rows = 4) {
        return `<label class="pro-field pro-field-full"><span>${label}</span><textarea id="${id}" rows="${rows}" placeholder="${placeholder}"></textarea></label>`;
    }

    function outputArea(id, rows = 7) {
        return `<textarea id="${id}" class="pro-output" rows="${rows}" readonly placeholder="O resultado aparecerá aqui."></textarea>`;
    }

    function actions(primary, copyId = null) {
        return `
            <div class="pro-actions">
                ${primary}
                ${copyId ? `<button class="tool-mini-btn ghost" onclick="ToolsApp.copyToolOutput('${copyId}')"><i class="fas fa-copy"></i> Copiar</button>` : ''}
            </div>
        `;
    }

    function listTool(key, listId, emptyText, renderItem) {
        const list = document.getElementById(listId);
        if (!list) return;
        const items = toolStore.get(key, []);
        list.innerHTML = items.length ? items.map(renderItem).join('') : `<div class="pro-empty">${emptyText}</div>`;
    }

    window.ToolsApp.renderProfessionalSuite = function(container) {
        container.classList.remove('md:grid-cols-2');
        container.classList.remove('xl:grid-cols-3');
        container.classList.add('tools-hub-grid');
        const tools = [
            ['occurrence', 'Relatório de Ocorrência', 'Registro formal pronto para copiar.', 'fas fa-file-shield', 'Operacional', 'renderOccurrenceReport'],
            ['hours', 'Horas Trabalhadas', 'Soma entrada, intervalo e saída.', 'fas fa-business-time', 'Calculadora', 'renderWorkHours'],
            ['shift', 'Plantão e Hora Extra', 'Estimativa rápida de extras.', 'fas fa-coins', 'Calculadora', 'renderShiftCalculator'],
            ['review', 'Revisão Inteligente', 'Plano curto de revisão.', 'fas fa-brain', 'Estudo', 'renderSmartReview'],
            ['protocols', 'Protocolos Rápidos', 'Consulta objetiva de condutas.', 'fas fa-book-medical', 'Estudo', 'renderProtocolLibrary'],
            ['documents', 'Central de Documentos', 'Controle de validade e pendências.', 'fas fa-folder-open', 'Organização', 'renderDocumentCenter'],
            ['pro-report', 'Relatório Profissional', 'Transforma notas em texto formal.', 'fas fa-file-signature', 'Operacional', 'renderProfessionalReport'],
            ['resume', 'Currículo Automático', 'Base de currículo editável.', 'fas fa-id-badge', 'Carreira', 'renderResumeBuilder'],
            ['letter', 'Carta de Apresentação', 'Mensagem pronta para vaga.', 'fas fa-envelope-open-text', 'Carreira', 'renderCoverLetter'],
            ['interview', 'Preparador de Entrevista', 'Perguntas para treinar.', 'fas fa-comments', 'Carreira', 'renderInterviewPrep'],
            ['bio', 'Bio Profissional', 'Bio para perfil e WhatsApp.', 'fas fa-user-tie', 'Carreira', 'renderProfessionalBio'],
            ['portfolio', 'Portfólio Profissional', 'Histórico de experiências.', 'fas fa-briefcase', 'Carreira', 'renderPortfolio'],
            ['certificates', 'Certificados e Validades', 'Acompanhe vencimentos.', 'fas fa-certificate', 'Organização', 'renderCertificateTracker'],
            ['posture', 'Mentor de Postura', 'Orientações práticas de conduta.', 'fas fa-person-rays', 'Carreira', 'renderPostureMentor'],
            ['card', 'Identidade Profissional', 'Cartão digital de apresentação.', 'fas fa-address-card', 'Identidade', 'renderDigitalProfessionalCard'],
            ['operation', 'Modo Operação', 'Missões rápidas de treino.', 'fas fa-tower-observation', 'Treino', 'renderOperationMode'],
            ['crisis', 'Simulador de Crise', 'Decisão sob pressão.', 'fas fa-triangle-exclamation', 'Treino', 'renderCrisisSimulator'],
            ['wallet', 'Carteira de Conquistas', 'Resumo de evolução.', 'fas fa-medal', 'Identidade', 'renderAchievementWallet'],
            ['announcements', 'Avisos Importantes', 'Recados, vagas e leitura.', 'fas fa-bullhorn', 'Comunicação', 'renderAdminAnnouncements'],
            ['suggestions', 'Caixa de Sugestões', 'Canal direto com alunos.', 'fas fa-inbox', 'Comunicação', 'renderSuggestionBox']
        ];
        window.professionalToolsCatalog = tools;
        container.innerHTML = `
            <div class="tools-section-banner">
                <div>
                    <span><i class="fas fa-sparkles"></i> 20 ferramentas</span>
                    <h3>Central Profissional do Aluno</h3>
                    <p>Escolha uma ferramenta abaixo. A tela abre uma por vez para ficar limpa, legível e fácil de usar.</p>
                </div>
            </div>
            <div class="tools-hub-layout">
                <aside class="tools-catalog-panel">
                    <div class="tools-catalog-header">
                        <strong>Ferramentas</strong>
                        <span>${tools.length} disponíveis</span>
                    </div>
                    <div class="tools-catalog-grid">
                        ${tools.map(([id, title, desc, icon, tag], index) => `
                            <button class="tools-catalog-card ${index === 0 ? 'active' : ''}" data-tool-id="${id}" onclick="ToolsApp.openProfessionalTool('${id}')">
                                <i class="${icon}"></i>
                                <span>${tag}</span>
                                <strong>${title}</strong>
                                <small>${desc}</small>
                            </button>
                        `).join('')}
                    </div>
                </aside>
                <section class="tools-detail-panel">
                    <div id="professional-tool-detail"></div>
                </section>
            </div>
        `;
        ToolsApp.openProfessionalTool('occurrence');
    };

    window.ToolsApp.openProfessionalTool = function(toolId) {
        const tool = (window.professionalToolsCatalog || []).find(item => item[0] === toolId);
        const detail = document.getElementById('professional-tool-detail');
        if (!tool || !detail || typeof ToolsApp[tool[5]] !== 'function') return;
        document.querySelectorAll('.tools-catalog-card').forEach(card => {
            card.classList.toggle('active', card.dataset.toolId === toolId);
        });
        detail.innerHTML = '';
        detail.classList.add('tool-detail-loading');
        ToolsApp[tool[5]](detail);
        detail.classList.remove('tool-detail-loading');
        setTimeout(() => {
            ToolsApp.refreshDocuments?.();
            ToolsApp.refreshCertificates?.();
            ToolsApp.refreshPortfolio?.();
            ToolsApp.refreshAnnouncements?.();
            ToolsApp.refreshSuggestions?.();
            if (window.matchMedia?.('(max-width: 900px)').matches) {
                document.querySelector('.tools-detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    window.ToolsApp.renderOccurrenceReport = function(c) {
        c.innerHTML += toolShell('tool-occurrence', 'fas fa-file-shield', 'Relatório de Ocorrência', 'Gere um texto limpo para copiar e enviar.', `
            <div class="pro-grid">
                ${input('occ-local', 'Local', 'Condomínio, evento, empresa...')}
                ${input('occ-date', 'Data e hora', '', 'datetime-local')}
                ${input('occ-type', 'Tipo', 'Mal súbito, princípio de incêndio...')}
                ${input('occ-victim', 'Envolvidos', 'Nome, setor ou sem vítima')}
                ${textarea('occ-desc', 'Descrição objetiva', 'Relate o que foi visto e feito.', 3)}
                ${textarea('occ-action', 'Providências', 'Isolamento, acionamento, orientação, atendimento...', 3)}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateOccurrenceReport()"><i class="fas fa-wand-magic-sparkles"></i> Gerar relatório</button>`, 'occ-output')}
            ${outputArea('occ-output')}
        `, 'tool-card-featured');
    };
    window.ToolsApp.generateOccurrenceReport = function() {
        const date = toolValue('occ-date') ? new Date(toolValue('occ-date')).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
        setToolOutput('occ-output', `RELATÓRIO DE OCORRÊNCIA\n\nData/Hora: ${date}\nLocal: ${toolValue('occ-local') || 'Não informado'}\nTipo de ocorrência: ${toolValue('occ-type') || 'Não informado'}\nEnvolvidos: ${toolValue('occ-victim') || 'Não informado'}\n\nDescrição:\n${toolValue('occ-desc') || 'Não informado'}\n\nProvidências adotadas:\n${toolValue('occ-action') || 'Não informado'}\n\nResponsável pelo registro: ${getUser().name || 'Aluno/Profissional'}\n`);
    };

    window.ToolsApp.renderWorkHours = function(c) {
        c.innerHTML += toolShell('tool-hours', 'fas fa-business-time', 'Calculadora de Horas Trabalhadas', 'Some entrada, intervalo e saída em poucos segundos.', `
            <div class="pro-grid">
                ${input('hours-in', 'Entrada', '', 'time')}
                ${input('hours-lunch-out', 'Saída intervalo', '', 'time')}
                ${input('hours-lunch-in', 'Volta intervalo', '', 'time')}
                ${input('hours-out', 'Saída', '', 'time')}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.calculateWorkHours()"><i class="fas fa-calculator"></i> Calcular</button>`, 'hours-output')}
            <div id="hours-output" class="pro-result">Informe os horários para calcular.</div>
        `);
    };
    function timeToMinutes(v) {
        if (!v) return null;
        const [h, m] = v.split(':').map(Number);
        return h * 60 + m;
    }
    function diffMinutes(start, end) {
        if (start === null || end === null) return 0;
        return end >= start ? end - start : (end + 1440) - start;
    }
    function minutesLabel(total) {
        const h = Math.floor(total / 60);
        const m = total % 60;
        return `${h}h ${String(m).padStart(2, '0')}m`;
    }
    window.ToolsApp.calculateWorkHours = function() {
        const total = diffMinutes(timeToMinutes(toolValue('hours-in')), timeToMinutes(toolValue('hours-lunch-out'))) + diffMinutes(timeToMinutes(toolValue('hours-lunch-in')), timeToMinutes(toolValue('hours-out')));
        document.getElementById('hours-output').innerHTML = total ? `<strong>${minutesLabel(total)}</strong><span> trabalhadas no dia</span>` : 'Preencha os horários principais.';
    };

    window.ToolsApp.renderShiftCalculator = function(c) {
        c.innerHTML += toolShell('tool-shift-extra', 'fas fa-coins', 'Calculadora de Plantão e Hora Extra', 'Estime horas extras e valor aproximado.', `
            <div class="pro-grid">
                ${input('extra-hours', 'Horas trabalhadas', '12', 'number')}
                ${input('extra-base', 'Jornada prevista', '8', 'number')}
                ${input('extra-rate', 'Valor da hora', '15', 'number')}
                ${input('extra-percent', 'Adicional (%)', '50', 'number')}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.calculateExtraHours()"><i class="fas fa-calculator"></i> Calcular extra</button>`, 'extra-output')}
            <div id="extra-output" class="pro-result">Resultado da hora extra.</div>
        `);
    };
    window.ToolsApp.calculateExtraHours = function() {
        const hours = parseFloat(toolValue('extra-hours')) || 0;
        const base = parseFloat(toolValue('extra-base')) || 0;
        const rate = parseFloat(toolValue('extra-rate')) || 0;
        const percent = parseFloat(toolValue('extra-percent')) || 0;
        const extra = Math.max(hours - base, 0);
        const total = extra * rate * (1 + percent / 100);
        document.getElementById('extra-output').innerHTML = `<strong>${extra.toFixed(1)}h extras</strong><span>Valor estimado: R$ ${total.toFixed(2).replace('.', ',')}</span>`;
    };

    window.ToolsApp.renderSmartReview = function(c) {
        const topics = ['APH e XABCDE', 'Combate a incêndio', 'Abandono de área', 'Produtos perigosos', 'Salvamento em altura', 'Legislação e postura'];
        c.innerHTML += toolShell('tool-review', 'fas fa-brain', 'Modo Revisão Inteligente', 'Monte um plano rápido de revisão.', `
            <div class="pro-grid">
                ${input('review-min', 'Minutos disponíveis', '20', 'number')}
                <label class="pro-field"><span>Foco</span><select id="review-focus">${topics.map(t => `<option>${t}</option>`).join('')}</select></label>
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateReviewPlan()"><i class="fas fa-bolt"></i> Criar revisão</button>`, 'review-output')}
            ${outputArea('review-output', 6)}
        `);
    };
    window.ToolsApp.generateReviewPlan = function() {
        const min = parseInt(toolValue('review-min')) || 20;
        const focus = toolValue('review-focus');
        setToolOutput('review-output', `REVISÃO INTELIGENTE - ${focus}\n\n${Math.ceil(min * 0.25)} min: releia os pontos-chave.\n${Math.ceil(min * 0.35)} min: responda perguntas do tema.\n${Math.ceil(min * 0.25)} min: explique em voz alta como se estivesse ensinando.\n${Math.max(3, Math.floor(min * 0.15))} min: anote 3 erros para revisar amanhã.`);
    };

    window.ToolsApp.renderProtocolLibrary = function(c) {
        const protocols = [
            ['APH - XABCDE', 'X: hemorragia grave. A: vias aéreas. B: respiração. C: circulação. D: neurológico. E: exposição e ambiente.'],
            ['Princípio de incêndio', 'Avaliar cena, acionar apoio, cortar energia se seguro, escolher extintor correto, manter rota de fuga.'],
            ['Abandono de área', 'Manter calma, orientar fluxo, priorizar rotas seguras, não usar elevador, conferir ponto de encontro.'],
            ['Espaço confinado', 'Não entrar sem permissão, monitoramento atmosférico, ventilação, equipe e plano de resgate.']
        ];
        c.innerHTML += toolShell('tool-protocols', 'fas fa-book-medical', 'Biblioteca de Protocolos Rápidos', 'Consulta curta para decisão rápida.', `
            <div class="pro-stack">${protocols.map(([title, text]) => `<details class="pro-details"><summary>${title}</summary><p>${text}</p></details>`).join('')}</div>
        `);
    };

    window.ToolsApp.renderDocumentCenter = function(c) {
        c.innerHTML += toolShell('tool-documents', 'fas fa-folder-open', 'Central de Documentos', 'Controle seus documentos importantes.', `
            <div class="pro-grid">
                ${input('doc-name', 'Documento', 'CNH, certificado, ASO...')}
                ${input('doc-date', 'Validade', '', 'date')}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.addDocumentItem()"><i class="fas fa-plus"></i> Adicionar</button>`)}
            <div id="doc-list" class="pro-list"></div>
        `);
    };
    window.ToolsApp.addDocumentItem = function() {
        const name = toolValue('doc-name');
        if (!name) return;
        const items = toolStore.get('tool_documents_v1', []);
        items.unshift({ id: Date.now(), name, date: toolValue('doc-date') });
        toolStore.set('tool_documents_v1', items);
        document.getElementById('doc-name').value = '';
        ToolsApp.refreshDocuments();
    };
    window.ToolsApp.removeDocumentItem = function(id) {
        toolStore.set('tool_documents_v1', toolStore.get('tool_documents_v1', []).filter(i => i.id !== id));
        ToolsApp.refreshDocuments();
    };
    window.ToolsApp.refreshDocuments = function() {
        listTool('tool_documents_v1', 'doc-list', 'Nenhum documento cadastrado.', i => `<div class="pro-list-row"><span><strong>${i.name}</strong><small>${i.date || 'Sem validade'}</small></span><button onclick="ToolsApp.removeDocumentItem(${i.id})"><i class="fas fa-times"></i></button></div>`);
    };

    window.ToolsApp.renderProfessionalReport = function(c) {
        c.innerHTML += toolShell('tool-pro-report', 'fas fa-file-signature', 'Gerador de Relatório Profissional', 'Transforme anotações em texto formal.', `
            <div class="pro-grid">${textarea('prorep-notes', 'Anotações', 'O que aconteceu, onde, quando e providências...', 5)}</div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateProfessionalReport()"><i class="fas fa-wand-magic-sparkles"></i> Profissionalizar</button>`, 'prorep-output')}
            ${outputArea('prorep-output', 7)}
        `);
    };
    window.ToolsApp.generateProfessionalReport = function() {
        setToolOutput('prorep-output', `RELATO PROFISSIONAL\n\nConforme registro realizado por ${getUser().name || 'responsável'}, informa-se que:\n\n${toolValue('prorep-notes') || 'Descreva a situação para gerar o relatório.'}\n\nAs providências foram conduzidas conforme orientação operacional, mantendo prioridade na segurança das pessoas, preservação do local e comunicação aos responsáveis.`);
    };

    window.ToolsApp.renderResumeBuilder = function(c) {
        c.innerHTML += toolShell('tool-resume', 'fas fa-id-badge', 'Currículo Profissional Automático', 'Base de currículo pronta para editar.', `
            <div class="pro-grid">
                ${input('cv-role', 'Objetivo', 'Bombeiro Civil / Brigadista')}
                ${input('cv-city', 'Cidade', 'Sua cidade')}
                ${textarea('cv-skills', 'Habilidades', 'APH, prevenção, atendimento ao público...', 3)}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateResume()"><i class="fas fa-file-lines"></i> Gerar currículo</button>`, 'cv-output')}
            ${outputArea('cv-output', 8)}
        `);
    };
    window.ToolsApp.generateResume = function() {
        const u = getUser();
        setToolOutput('cv-output', `${u.name || 'Nome do aluno'}\n${u.email || ''} ${u.phone ? '| ' + u.phone : ''}\n${toolValue('cv-city')}\n\nOBJETIVO\n${toolValue('cv-role') || 'Atuação profissional na área operacional.'}\n\nRESUMO\nProfissional em formação pela plataforma Bravo Charlie, com foco em disciplina, segurança, prevenção, atendimento e atuação responsável.\n\nHABILIDADES\n${toolValue('cv-skills') || 'Preencha suas principais habilidades.'}`);
    };

    window.ToolsApp.renderCoverLetter = function(c) {
        c.innerHTML += toolShell('tool-letter', 'fas fa-envelope-open-text', 'Gerador de Carta de Apresentação', 'Uma mensagem pronta para vaga ou indicação.', `
            <div class="pro-grid">${input('letter-company', 'Empresa/vaga', 'Nome da empresa')}${input('letter-role', 'Cargo', 'Bombeiro Civil')}</div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateCoverLetter()"><i class="fas fa-paper-plane"></i> Gerar carta</button>`, 'letter-output')}
            ${outputArea('letter-output', 7)}
        `);
    };
    window.ToolsApp.generateCoverLetter = function() {
        const u = getUser();
        setToolOutput('letter-output', `Olá, equipe ${toolValue('letter-company') || ''}.\n\nMeu nome é ${u.name || '...'} e tenho interesse na oportunidade de ${toolValue('letter-role') || 'atuação profissional'}. Estou em constante desenvolvimento, com foco em postura, responsabilidade, prevenção e atendimento seguro.\n\nColoco-me à disposição para entrevista e envio de documentos.\n\nAtenciosamente,\n${u.name || ''}`);
    };

    window.ToolsApp.renderInterviewPrep = function(c) {
        const questions = ['Fale sobre você.', 'Por que devemos contratar você?', 'Como age sob pressão?', 'Conte uma situação difícil que resolveu.', 'Qual sua disponibilidade?'];
        c.innerHTML += toolShell('tool-interview', 'fas fa-comments', 'Preparador de Entrevista', 'Perguntas para treinar antes da seleção.', `
            <div class="pro-stack">${questions.map(q => `<div class="pro-prompt"><strong>${q}</strong><span>Responda em até 60 segundos, com exemplo real e postura objetiva.</span></div>`).join('')}</div>
        `);
    };

    window.ToolsApp.renderProfessionalBio = function(c) {
        c.innerHTML += toolShell('tool-bio', 'fas fa-user-tie', 'Gerador de Bio Profissional', 'Bio para WhatsApp, Instagram ou perfil.', `
            <div class="pro-grid">${input('bio-role', 'Área', 'Bombeiro Civil')}${input('bio-tone', 'Tom', 'Profissional e direto')}</div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateBio()"><i class="fas fa-wand-magic-sparkles"></i> Gerar bio</button>`, 'bio-output')}
            ${outputArea('bio-output', 4)}
        `);
    };
    window.ToolsApp.generateBio = function() {
        setToolOutput('bio-output', `${getUser().name || 'Profissional'} | ${toolValue('bio-role') || 'Área operacional'}\nFoco em segurança, prevenção, disciplina e atendimento responsável.\nDisponível para oportunidades, eventos e atuação profissional.`);
    };

    window.ToolsApp.renderPortfolio = function(c) {
        c.innerHTML += toolShell('tool-portfolio', 'fas fa-briefcase', 'Portfólio Profissional', 'Monte histórico de cursos, eventos e experiências.', `
            <div class="pro-grid">${input('portfolio-title', 'Registro', 'Curso, evento, experiência...')}${input('portfolio-date', 'Data', '', 'date')}</div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.addPortfolioItem()"><i class="fas fa-plus"></i> Adicionar</button>`)}
            <div id="portfolio-list" class="pro-list"></div>
        `);
    };
    window.ToolsApp.addPortfolioItem = function() {
        const title = toolValue('portfolio-title');
        if (!title) return;
        const items = toolStore.get('tool_portfolio_v1', []);
        items.unshift({ id: Date.now(), title, date: toolValue('portfolio-date') });
        toolStore.set('tool_portfolio_v1', items);
        document.getElementById('portfolio-title').value = '';
        ToolsApp.refreshPortfolio();
    };
    window.ToolsApp.refreshPortfolio = function() {
        listTool('tool_portfolio_v1', 'portfolio-list', 'Nenhum item no portfólio.', i => `<div class="pro-list-row"><span><strong>${i.title}</strong><small>${i.date || 'Sem data'}</small></span><button onclick="ToolsApp.removePortfolioItem(${i.id})"><i class="fas fa-times"></i></button></div>`);
    };
    window.ToolsApp.removePortfolioItem = function(id) {
        toolStore.set('tool_portfolio_v1', toolStore.get('tool_portfolio_v1', []).filter(i => i.id !== id));
        ToolsApp.refreshPortfolio();
    };

    window.ToolsApp.renderCertificateTracker = function(c) {
        c.innerHTML += toolShell('tool-certificates', 'fas fa-certificate', 'Controle de Certificados e Validades', 'Evite perder reciclagens e vencimentos.', `
            <div class="pro-grid">${input('cert-name', 'Certificado', 'Bombeiro Civil')}${input('cert-date', 'Validade', '', 'date')}</div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.addCertificateItem()"><i class="fas fa-plus"></i> Adicionar</button>`)}
            <div id="cert-list" class="pro-list"></div>
        `);
    };
    window.ToolsApp.addCertificateItem = function() {
        const name = toolValue('cert-name');
        if (!name) return;
        const items = toolStore.get('tool_certificates_v1', []);
        items.unshift({ id: Date.now(), name, date: toolValue('cert-date') });
        toolStore.set('tool_certificates_v1', items);
        document.getElementById('cert-name').value = '';
        ToolsApp.refreshCertificates();
    };
    window.ToolsApp.refreshCertificates = function() {
        listTool('tool_certificates_v1', 'cert-list', 'Nenhum certificado cadastrado.', i => {
            const days = i.date ? Math.ceil((new Date(i.date) - new Date()) / 86400000) : null;
            const status = days === null ? 'Sem validade' : days < 0 ? 'Vencido' : `${days} dias restantes`;
            return `<div class="pro-list-row"><span><strong>${i.name}</strong><small>${status}</small></span><button onclick="ToolsApp.removeCertificateItem(${i.id})"><i class="fas fa-times"></i></button></div>`;
        });
    };
    window.ToolsApp.removeCertificateItem = function(id) {
        toolStore.set('tool_certificates_v1', toolStore.get('tool_certificates_v1', []).filter(i => i.id !== id));
        ToolsApp.refreshCertificates();
    };

    window.ToolsApp.renderPostureMentor = function(c) {
        const tips = ['Chegue antes do horário e observe o ambiente.', 'Fale pouco, registre bem e cumpra procedimento.', 'Postura limpa, uniforme alinhado e comunicação respeitosa.', 'Não prometa o que não depende de você.', 'Em conflito, baixe o tom e aumente a clareza.'];
        c.innerHTML += toolShell('tool-posture', 'fas fa-person-rays', 'Mentor de Postura Profissional', 'Conselhos rápidos para se destacar.', `
            <div id="posture-tip" class="pro-quote">${tips[0]}</div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.nextPostureTip()"><i class="fas fa-shuffle"></i> Nova orientação</button>`)}
        `);
        window.postureTips = tips;
    };
    window.ToolsApp.nextPostureTip = function() {
        const tips = window.postureTips || [];
        document.getElementById('posture-tip').innerText = tips[Math.floor(Math.random() * tips.length)] || '';
    };

    window.ToolsApp.renderDigitalProfessionalCard = function(c) {
        const u = getUser();
        c.innerHTML += toolShell('tool-pro-card', 'fas fa-address-card', 'Cartão de Identidade Profissional Digital', 'Perfil bonito para apresentar por QR/link.', `
            <div class="pro-id-card">
                <div class="pro-id-mark"><i class="fas fa-shield-alt"></i></div>
                <div><strong>${u.name || 'Aluno Bravo Charlie'}</strong><span>${u.courseType === 'SP' ? 'Segurança Patrimonial' : 'Bombeiro Civil / Brigadista'}</span></div>
                <small>Status: ${u.status === 'premium' ? 'Premium' : 'Aluno'} | Turma: ${u.company || 'Particular'}</small>
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.copyProfessionalCard()"><i class="fas fa-share-nodes"></i> Copiar apresentação</button>`)}
        `);
    };
    window.ToolsApp.copyProfessionalCard = function() {
        const u = getUser();
        navigator.clipboard?.writeText(`${u.name || 'Aluno'} - ${u.courseType === 'SP' ? 'Segurança Patrimonial' : 'Bombeiro Civil / Brigadista'}\nFormação Bravo Charlie\nContato: ${u.phone || u.email || ''}`);
        ToolsApp.toast('Apresentação copiada');
    };

    window.ToolsApp.renderOperationMode = function(c) {
        const ops = ['Operação Evento: controle de público, rotas e comunicação.', 'Operação Condomínio: prevenção, rondas e resposta rápida.', 'Operação Escola: abandono, calma e proteção de crianças.', 'Operação Indústria: riscos específicos, isolamento e apoio técnico.'];
        c.innerHTML += toolShell('tool-operation', 'fas fa-tower-observation', 'Modo Operação', 'Missões rápidas para treinar raciocínio.', `
            <div id="operation-output" class="pro-quote">${ops[0]}</div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.nextOperationMission()"><i class="fas fa-play"></i> Sortear missão</button>`)}
        `);
        window.operationMissions = ops;
    };
    window.ToolsApp.nextOperationMission = function() {
        const ops = window.operationMissions || [];
        document.getElementById('operation-output').innerText = ops[Math.floor(Math.random() * ops.length)] || '';
    };

    window.ToolsApp.renderCrisisSimulator = function(c) {
        c.innerHTML += toolShell('tool-crisis', 'fas fa-triangle-exclamation', 'Simulador de Crise Real', 'Escolha uma reação e veja o impacto.', `
            <p class="tool-helper">Cenário: princípio de incêndio em área com pessoas nervosas e fumaça baixa.</p>
            <div class="pro-choice-grid">
                <button onclick="ToolsApp.answerCrisis(1)">Entrar sozinho para resolver rápido</button>
                <button onclick="ToolsApp.answerCrisis(2)">Isolar, orientar saída e acionar apoio</button>
                <button onclick="ToolsApp.answerCrisis(3)">Esperar alguém assumir</button>
            </div>
            <div id="crisis-output" class="pro-result">Sua análise aparecerá aqui.</div>
        `);
    };
    window.ToolsApp.answerCrisis = function(option) {
        const messages = {
            1: 'Risco alto: agir sozinho pode criar nova vítima. Faltou controle de cena.',
            2: 'Melhor decisão: priorizou pessoas, isolamento, comunicação e apoio.',
            3: 'Risco operacional: demora aumenta dano e pânico. Assuma comunicação e acione suporte.'
        };
        document.getElementById('crisis-output').innerHTML = messages[option];
    };

    window.ToolsApp.renderAchievementWallet = function(c) {
        const completed = toolStore.get('gateBombeiroCompletedModules_v3', []);
        const certs = toolStore.get('tool_certificates_v1', []).length;
        const portfolio = toolStore.get('tool_portfolio_v1', []).length;
        c.innerHTML += toolShell('tool-wallet', 'fas fa-medal', 'Carteira de Conquistas', 'Seu painel de evolução e orgulho profissional.', `
            <div class="pro-badges">
                <span><i class="fas fa-check"></i> ${completed.length} módulos</span>
                <span><i class="fas fa-certificate"></i> ${certs} certificados</span>
                <span><i class="fas fa-briefcase"></i> ${portfolio} portfólio</span>
                <span><i class="fas fa-star"></i> Bravo Charlie</span>
            </div>
        `);
    };

    window.ToolsApp.renderAdminAnnouncements = function(c) {
        const u = getUser();
        const isAdmin = isInstructorAdminUser(u);
        c.innerHTML += toolShell('tool-announcements', 'fas fa-bullhorn', 'Canal de Avisos Importantes', 'Vagas, oportunidades e recados enviados pelo administrador.', `
            ${isAdmin ? `
                <div class="admin-tool-panel">
                    <div class="announcement-composer-head">
                        <i class="fas fa-paper-plane"></i>
                        <div>
                            <strong>Publicar comunicado para alunos</strong>
                            <span>Envie para todos, uma turma, um status, curso ou um aluno específico por e-mail.</span>
                        </div>
                    </div>
                    <div class="pro-grid">
                        ${input('ann-title', 'Título', 'Vaga, oportunidade ou recado')}
                        <label class="pro-field"><span>Enviar para</span><select id="ann-target"><option value="all">Todos os alunos</option><option value="company">Turma específica</option><option value="status">Status do aluno</option><option value="course">Curso</option><option value="email">Aluno individual por e-mail</option></select></label>
                        ${input('ann-target-value', 'Filtro do público', 'Ex: Turma A, premium, BC, aluno@email.com')}
                        ${input('ann-expire', 'Expira em', '', 'date')}
                        ${textarea('ann-message', 'Mensagem', 'Escreva o comunicado...', 4)}
                    </div>
                    ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.publishAnnouncement()"><i class="fas fa-paper-plane"></i> Publicar aviso</button><button class="tool-mini-btn ghost" onclick="ToolsApp.previewAnnouncementAudience()"><i class="fas fa-eye"></i> Ver regra de envio</button>`)}
                    <div id="ann-audience-preview" class="premium-result-card">Regra atual: todos os alunos verão este aviso.</div>
                </div>
            ` : `
                <div class="announcement-student-note">
                    <i class="fas fa-bell"></i>
                    <span>Aqui aparecem comunicados, vagas e oportunidades enviados pelo administrador.</span>
                </div>
            `}
            <div id="ann-list" class="pro-list"></div>
        `, 'tool-card-featured');
        ToolsApp.refreshAnnouncements();
    };
    function announcementMatches(a, u) {
        if (a.expire && new Date(a.expire + 'T23:59:59') < new Date()) return false;
        const value = (a.targetValue || '').toLowerCase();
        if (a.target === 'company') return (u.company || '').toLowerCase() === value;
        if (a.target === 'status') return (u.status || '').toLowerCase() === value;
        if (a.target === 'course') return (u.courseType || 'BC').toLowerCase() === value;
        if (a.target === 'email') return (u.email || '').toLowerCase() === value;
        return true;
    }
    async function getAnnouncements() {
        const db = window.__fbDB || window.fbDB;
        if (db) {
            try {
                const snap = await db.collection('announcements').orderBy('createdAt', 'desc').limit(30).get();
                const items = [];
                snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
                return items;
            } catch (e) {}
        }
        return toolStore.get('tool_announcements_v1', []);
    }
    window.ToolsApp.publishAnnouncement = async function() {
        const target = toolValue('ann-target') || 'all';
        const targetValue = toolValue('ann-target-value');
        if (target !== 'all' && !targetValue) return ToolsApp.toast('Informe o filtro do público', 'info');
        const item = {
            id: String(Date.now()),
            title: toolValue('ann-title'),
            message: toolValue('ann-message'),
            target,
            targetValue,
            expire: toolValue('ann-expire'),
            readBy: {},
            createdAtLocal: new Date().toISOString()
        };
        if (!item.title || !item.message) return ToolsApp.toast('Preencha título e mensagem', 'info');
        const db = window.__fbDB || window.fbDB;
        if (db && window.firebase) {
            try {
                await db.collection('announcements').add({ ...item, createdAt: firebase.firestore.FieldValue.serverTimestamp(), createdBy: getUser().uid || null });
            } catch (e) {
                const local = toolStore.get('tool_announcements_v1', []);
                local.unshift(item);
                toolStore.set('tool_announcements_v1', local);
            }
        } else {
            const local = toolStore.get('tool_announcements_v1', []);
            local.unshift(item);
            toolStore.set('tool_announcements_v1', local);
        }
        document.getElementById('ann-title').value = '';
        document.getElementById('ann-message').value = '';
        ToolsApp.toast('Aviso publicado');
        ToolsApp.refreshAnnouncements();
    };
    window.ToolsApp.previewAnnouncementAudience = function() {
        const target = toolValue('ann-target') || 'all';
        const value = toolValue('ann-target-value');
        const map = {
            all: 'Todos os alunos verão este aviso.',
            company: `Somente alunos da turma "${value || 'informe a turma'}".`,
            status: `Somente alunos com status "${value || 'trial/premium/expirado'}".`,
            course: `Somente alunos do curso "${value || 'BC ou SP'}".`,
            email: `Somente o aluno com e-mail "${value || 'aluno@email.com'}".`
        };
        const box = document.getElementById('ann-audience-preview');
        if (box) box.innerHTML = `<strong>Regra de envio:</strong> ${map[target] || map.all}`;
    };
    window.ToolsApp.refreshAnnouncements = async function() {
        const list = document.getElementById('ann-list');
        if (!list) return;
        const u = getUser();
        const isAdmin = isInstructorAdminUser(u);
        const read = toolStore.get('tool_announcement_reads_v1', {});
        const all = await getAnnouncements();
        const visible = all.filter(a => isAdmin || announcementMatches(a, u));
        list.innerHTML = visible.length ? visible.map(a => {
            const count = a.readBy ? Object.keys(a.readBy).length : 0;
            const wasRead = read[a.id] || (u.uid && a.readBy && a.readBy[u.uid]);
            return `<div class="announcement-item ${wasRead ? 'read' : ''}"><strong>${a.title}</strong><p>${a.message}</p><small>${a.target === 'all' ? 'Todos' : `${a.target}: ${a.targetValue || '-'}`} ${isAdmin ? `| ${count} leitura(s)` : ''}</small>${!isAdmin ? `<button onclick="ToolsApp.confirmAnnouncementRead('${a.id}')"><i class="fas fa-check"></i> Confirmar leitura</button>` : ''}</div>`;
        }).join('') : '<div class="pro-empty">Nenhum aviso disponível.</div>';
    };
    window.ToolsApp.confirmAnnouncementRead = async function(id) {
        const u = getUser();
        const read = toolStore.get('tool_announcement_reads_v1', {});
        read[id] = new Date().toISOString();
        toolStore.set('tool_announcement_reads_v1', read);
        const db = window.__fbDB || window.fbDB;
        if (db && u.uid) {
            try {
                const key = `readBy.${u.uid}`;
                await db.collection('announcements').doc(id).update({ [key]: new Date().toISOString() });
            } catch (e) {}
        }
        ToolsApp.toast('Leitura confirmada');
        ToolsApp.refreshAnnouncements();
    };

    window.ToolsApp.renderSuggestionBox = function(c) {
        c.innerHTML += toolShell('tool-suggestions', 'fas fa-inbox', 'Caixa de Sugestões dos Alunos', 'Canal direto para ideias, dúvidas e melhorias.', `
            <div class="pro-grid">${input('sug-title', 'Assunto', 'Ideia, dúvida ou pedido')}${textarea('sug-message', 'Mensagem', 'Escreva sua sugestão...', 4)}</div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.sendSuggestion()"><i class="fas fa-paper-plane"></i> Enviar sugestão</button>`)}
            <div id="suggestion-list" class="pro-list"></div>
        `);
    };
    window.ToolsApp.sendSuggestion = async function() {
        const u = getUser();
        const item = { id: String(Date.now()), title: toolValue('sug-title'), message: toolValue('sug-message'), userName: u.name || 'Aluno', email: u.email || '', createdAtLocal: new Date().toISOString() };
        if (!item.title || !item.message) return ToolsApp.toast('Preencha assunto e mensagem', 'info');
        const db = window.__fbDB || window.fbDB;
        if (db && window.firebase) {
            try { await db.collection('suggestions').add({ ...item, uid: u.uid || null, createdAt: firebase.firestore.FieldValue.serverTimestamp() }); }
            catch (e) {
                const local = toolStore.get('tool_suggestions_v1', []);
                local.unshift(item);
                toolStore.set('tool_suggestions_v1', local);
            }
        } else {
            const local = toolStore.get('tool_suggestions_v1', []);
            local.unshift(item);
            toolStore.set('tool_suggestions_v1', local);
        }
        document.getElementById('sug-title').value = '';
        document.getElementById('sug-message').value = '';
        ToolsApp.toast('Sugestão enviada');
        ToolsApp.refreshSuggestions();
    };
    window.ToolsApp.refreshSuggestions = async function() {
        const list = document.getElementById('suggestion-list');
        if (!list) return;
        const u = getUser();
        let items = toolStore.get('tool_suggestions_v1', []);
        const db = window.__fbDB || window.fbDB;
        if (db && u.isAdmin) {
            try {
                const snap = await db.collection('suggestions').orderBy('createdAt', 'desc').limit(20).get();
                items = [];
                snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
            } catch (e) {}
        }
        const visible = u.isAdmin ? items : items.filter(i => i.email === u.email);
        list.innerHTML = visible.length ? visible.map(i => `<div class="pro-list-row"><span><strong>${i.title}</strong><small>${u.isAdmin ? `${i.userName || 'Aluno'} - ${i.email || ''}` : 'Enviada'}</small><p>${i.message}</p></span></div>`).join('') : `<div class="pro-empty">${u.isAdmin ? 'Nenhuma sugestão recebida.' : 'Suas sugestões aparecerão aqui.'}</div>`;
    };

    /* === CENTRAL PROFISSIONAL PREMIUM V93 === */
    function premiumEscape(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function premiumDate(value) {
        if (!value) return 'Não informado';
        const date = new Date(`${value}T00:00:00`);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
    }

    function premiumNow() {
        return new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }

    function premiumMoney(value) {
        return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function premiumStatusByDate(dateValue) {
        if (!dateValue) return { label: 'Sem validade', tone: 'neutral', days: null };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const date = new Date(`${dateValue}T00:00:00`);
        const days = Math.ceil((date - today) / 86400000);
        if (days < 0) return { label: `Vencido há ${Math.abs(days)} dia(s)`, tone: 'danger', days };
        if (days <= 30) return { label: `Vence em ${days} dia(s)`, tone: 'warning', days };
        return { label: `${days} dia(s) restantes`, tone: 'success', days };
    }

    function premiumMetric(icon, label, value, tone = 'blue') {
        return `<div class="premium-metric ${tone}"><i class="${icon}"></i><span>${label}</span><strong>${value}</strong></div>`;
    }

    function premiumDownloadText(id, filename) {
        const el = document.getElementById(id);
        const text = el?.value || el?.innerText || '';
        if (!text.trim()) return ToolsApp.toast('Gere um conteúdo primeiro', 'info');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    window.ToolsApp.downloadToolOutput = premiumDownloadText;

    window.ToolsApp.renderProfessionalSuite = function(container) {
        container.classList.remove('md:grid-cols-2', 'xl:grid-cols-3');
        container.classList.add('tools-hub-grid');
        const tools = [
            ['occurrence', 'Relatório de Ocorrência', 'Gere um RO formal com histórico local.', 'fas fa-file-shield', 'Operacional', 'renderOccurrenceReport'],
            ['hours', 'Horas Trabalhadas', 'Calcule jornada, intervalo e virada de dia.', 'fas fa-business-time', 'Calculadora', 'renderWorkHours'],
            ['shift', 'Plantão e Hora Extra', 'Simule extras, adicional e valor final.', 'fas fa-coins', 'Calculadora', 'renderShiftCalculator'],
            ['review', 'Revisão Inteligente', 'Plano de estudo por tempo e dificuldade.', 'fas fa-brain', 'Estudo', 'renderSmartReview'],
            ['protocols', 'Protocolos Rápidos', 'Busca de condutas essenciais.', 'fas fa-book-medical', 'Estudo', 'renderProtocolLibrary'],
            ['documents', 'Central de Documentos', 'Controle validade e pendências.', 'fas fa-folder-open', 'Organização', 'renderDocumentCenter'],
            ['pro-report', 'Relatório Profissional', 'Transforme rascunho em relatório formal.', 'fas fa-file-signature', 'Operacional', 'renderProfessionalReport'],
            ['resume', 'Currículo Automático', 'Currículo profissional editável.', 'fas fa-id-badge', 'Carreira', 'renderResumeBuilder'],
            ['letter', 'Carta de Apresentação', 'Mensagem profissional para vagas.', 'fas fa-envelope-open-text', 'Carreira', 'renderCoverLetter'],
            ['interview', 'Preparador de Entrevista', 'Treino com respostas-modelo.', 'fas fa-comments', 'Carreira', 'renderInterviewPrep'],
            ['bio', 'Bio Profissional', 'Bio pronta para WhatsApp e redes.', 'fas fa-user-tie', 'Carreira', 'renderProfessionalBio'],
            ['portfolio', 'Portfólio Profissional', 'Organize experiências e evidências.', 'fas fa-briefcase', 'Carreira', 'renderPortfolio'],
            ['certificates', 'Certificados e Validades', 'Alertas de vencimento.', 'fas fa-certificate', 'Organização', 'renderCertificateTracker'],
            ['posture', 'Mentor de Postura', 'Orientação para situações reais.', 'fas fa-person-rays', 'Carreira', 'renderPostureMentor'],
            ['card', 'Identidade Profissional', 'Cartão digital com foto local.', 'fas fa-address-card', 'Identidade', 'renderDigitalProfessionalCard'],
            ['operation', 'Modo Operação', 'Checklist de missão e plantão.', 'fas fa-tower-observation', 'Treino', 'renderOperationMode'],
            ['crisis', 'Simulador de Crise', 'Decisão sob pressão com feedback.', 'fas fa-triangle-exclamation', 'Treino', 'renderCrisisSimulator'],
            ['wallet', 'Carteira de Conquistas', 'Resumo visual da evolução.', 'fas fa-medal', 'Identidade', 'renderAchievementWallet'],
            ['announcements', 'Avisos Importantes', 'Vagas, comunicados e leitura.', 'fas fa-bullhorn', 'Comunicação', 'renderAdminAnnouncements'],
            ['suggestions', 'Caixa de Sugestões', 'Canal direto com o administrador.', 'fas fa-inbox', 'Comunicação', 'renderSuggestionBox']
        ];
        window.professionalToolsCatalog = tools;
        const groups = [...new Set(tools.map(t => t[4]))];
        container.innerHTML = `
            <div class="tools-section-banner premium-tools-banner">
                <div>
                    <span><i class="fas fa-gem"></i> Central premium</span>
                    <h3>Ferramentas para estudar, trabalhar e evoluir</h3>
                    <p>Use como um painel profissional: gere documentos, controle validades, revise aulas, organize carreira e peça apoio ao IAM quando precisar.</p>
                </div>
                <div class="premium-tools-stats">
                    <strong>${tools.length}</strong>
                    <small>ferramentas ativas</small>
                </div>
            </div>
            <div class="tools-hub-layout premium-tools-layout">
                <aside class="tools-catalog-panel">
                    <div class="tools-catalog-header">
                        <strong>Central de Ferramentas</strong>
                        <span>${groups.length} áreas</span>
                    </div>
                    <div class="tools-catalog-grid">
                        ${tools.map(([id, title, desc, icon, tag], index) => `
                            <button class="tools-catalog-card premium-catalog-card ${index === 0 ? 'active' : ''}" data-tool-id="${id}" onclick="ToolsApp.openProfessionalTool('${id}')">
                                <i class="${icon}"></i>
                                <span>${tag}</span>
                                <strong>${title}</strong>
                                <small>${desc}</small>
                            </button>
                        `).join('')}
                    </div>
                </aside>
                <section class="tools-detail-panel premium-tool-stage">
                    <div id="professional-tool-detail"></div>
                </section>
            </div>
        `;
        ToolsApp.openProfessionalTool('occurrence');
    };

    window.ToolsApp.renderOccurrenceReport = function(c) {
        c.innerHTML += toolShell('tool-occurrence', 'fas fa-file-shield', 'Relatório de Ocorrência', 'Registro formal, copiável e com histórico salvo neste dispositivo.', `
            <div class="premium-tool-summary">
                ${premiumMetric('fas fa-clock', 'Registro', premiumNow(), 'blue')}
                ${premiumMetric('fas fa-user-shield', 'Responsável', premiumEscape(getUser().name || 'Aluno'), 'green')}
                ${premiumMetric('fas fa-file-lines', 'Formato', 'RO padrão', 'orange')}
            </div>
            <div class="pro-grid">
                ${input('occ-local', 'Local da ocorrência', 'Empresa, evento, posto ou endereço')}
                ${input('occ-date', 'Data e hora', '', 'datetime-local')}
                ${input('occ-type', 'Natureza', 'Mal súbito, princípio de incêndio, queda, apoio...')}
                ${input('occ-victim', 'Envolvidos', 'Nome, setor, testemunhas ou sem vítima')}
                ${textarea('occ-desc', 'Descrição objetiva', 'Descreva apenas fatos observados, sem opinião pessoal.', 4)}
                ${textarea('occ-action', 'Providências adotadas', 'Isolamento, acionamento, atendimento, orientação, encaminhamento...', 4)}
                ${textarea('occ-follow', 'Encaminhamento final', 'SAMU, responsável local, equipe interna, liberação do local...', 3)}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateOccurrenceReport()"><i class="fas fa-wand-magic-sparkles"></i> Gerar RO</button><button class="tool-mini-btn ghost" onclick="ToolsApp.saveOccurrenceReport()"><i class="fas fa-floppy-disk"></i> Salvar no histórico</button><button class="tool-mini-btn ghost" onclick="ToolsApp.downloadToolOutput('occ-output','relatorio-ocorrencia.txt')"><i class="fas fa-download"></i> Baixar</button>`, 'occ-output')}
            ${outputArea('occ-output', 10)}
            <div id="occ-history" class="pro-list"></div>
        `, 'tool-card-featured');
        ToolsApp.refreshOccurrenceHistory();
    };

    window.ToolsApp.generateOccurrenceReport = function() {
        const u = getUser();
        const date = toolValue('occ-date') ? new Date(toolValue('occ-date')).toLocaleString('pt-BR') : premiumNow();
        const text = `RELATÓRIO DE OCORRÊNCIA

Data/Hora: ${date}
Local: ${toolValue('occ-local') || 'Não informado'}
Natureza: ${toolValue('occ-type') || 'Não informado'}
Envolvidos: ${toolValue('occ-victim') || 'Não informado'}

1. DESCRIÇÃO DOS FATOS
${toolValue('occ-desc') || 'Não informado'}

2. PROVIDÊNCIAS ADOTADAS
${toolValue('occ-action') || 'Não informado'}

3. ENCAMINHAMENTO FINAL
${toolValue('occ-follow') || 'Não informado'}

Responsável pelo registro: ${u.name || 'Aluno/Profissional'}
Contato: ${u.phone || u.email || 'Não informado'}`;
        setToolOutput('occ-output', text);
    };

    window.ToolsApp.saveOccurrenceReport = function() {
        const text = document.getElementById('occ-output')?.value || '';
        if (!text.trim()) ToolsApp.generateOccurrenceReport();
        const items = toolStore.get('tool_occurrences_v93', []);
        items.unshift({ id: Date.now(), title: toolValue('occ-type') || 'Ocorrência', local: toolValue('occ-local') || 'Sem local', createdAt: new Date().toISOString(), text: document.getElementById('occ-output')?.value || '' });
        toolStore.set('tool_occurrences_v93', items.slice(0, 8));
        ToolsApp.toast('Relatório salvo no histórico');
        ToolsApp.refreshOccurrenceHistory();
    };

    window.ToolsApp.refreshOccurrenceHistory = function() {
        listTool('tool_occurrences_v93', 'occ-history', 'Nenhum relatório salvo neste dispositivo.', i => `
            <div class="pro-list-row premium-list-row">
                <span><strong>${premiumEscape(i.title)}</strong><small>${premiumEscape(i.local)} • ${new Date(i.createdAt).toLocaleString('pt-BR')}</small></span>
                <button onclick="ToolsApp.openOccurrenceHistory(${i.id})"><i class="fas fa-eye"></i></button>
            </div>`);
    };

    window.ToolsApp.openOccurrenceHistory = function(id) {
        const item = toolStore.get('tool_occurrences_v93', []).find(x => x.id === id);
        if (item) setToolOutput('occ-output', item.text || '');
    };

    window.ToolsApp.renderWorkHours = function(c) {
        c.innerHTML += toolShell('tool-hours', 'fas fa-business-time', 'Calculadora de Horas Trabalhadas', 'Calcula jornada comum ou plantão virando o dia, descontando intervalo.', `
            <div class="pro-grid">
                ${input('hours-in', 'Entrada', '', 'time')}
                ${input('hours-out', 'Saída', '', 'time')}
                ${input('hours-break', 'Intervalo total em minutos', '60', 'number')}
                ${input('hours-goal', 'Jornada prevista em horas', '8', 'number')}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.calculateWorkHours()"><i class="fas fa-calculator"></i> Calcular jornada</button>`)}
            <div id="hours-output" class="premium-result-card">Informe entrada e saída para calcular.</div>
        `);
    };

    window.ToolsApp.calculateWorkHours = function() {
        const start = timeToMinutes(toolValue('hours-in'));
        const end = timeToMinutes(toolValue('hours-out'));
        if (start === null || end === null) {
            document.getElementById('hours-output').innerHTML = 'Preencha entrada e saída.';
            return;
        }
        const total = Math.max(diffMinutes(start, end) - (parseInt(toolValue('hours-break')) || 0), 0);
        const goal = (parseFloat(toolValue('hours-goal')) || 8) * 60;
        const balance = total - goal;
        document.getElementById('hours-output').innerHTML = `
            <div class="premium-tool-summary">
                ${premiumMetric('fas fa-clock', 'Trabalhado', minutesLabel(total), 'blue')}
                ${premiumMetric('fas fa-bullseye', 'Previsto', minutesLabel(goal), 'green')}
                ${premiumMetric(balance >= 0 ? 'fas fa-arrow-trend-up' : 'fas fa-arrow-trend-down', balance >= 0 ? 'Extra' : 'Saldo negativo', minutesLabel(Math.abs(balance)), balance >= 0 ? 'orange' : 'red')}
            </div>`;
    };

    window.ToolsApp.renderShiftCalculator = function(c) {
        c.innerHTML += toolShell('tool-shift-extra', 'fas fa-coins', 'Calculadora de Plantão e Hora Extra', 'Calcula hora extra, adicional noturno e estimativa de pagamento.', `
            <div class="pro-grid">
                ${input('extra-hours', 'Horas trabalhadas', '12', 'number')}
                ${input('extra-base', 'Jornada prevista', '8', 'number')}
                ${input('extra-rate', 'Valor da hora normal', '15', 'number')}
                ${input('extra-percent', 'Adicional de hora extra (%)', '50', 'number')}
                ${input('extra-night', 'Horas noturnas', '0', 'number')}
                ${input('extra-night-percent', 'Adicional noturno (%)', '20', 'number')}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.calculateExtraHours()"><i class="fas fa-calculator"></i> Calcular pagamento</button>`)}
            <div id="extra-output" class="premium-result-card">Resultado da simulação.</div>
        `);
    };

    window.ToolsApp.calculateExtraHours = function() {
        const hours = parseFloat(toolValue('extra-hours')) || 0;
        const base = parseFloat(toolValue('extra-base')) || 0;
        const rate = parseFloat(toolValue('extra-rate')) || 0;
        const percent = parseFloat(toolValue('extra-percent')) || 0;
        const night = parseFloat(toolValue('extra-night')) || 0;
        const nightPercent = parseFloat(toolValue('extra-night-percent')) || 0;
        const extra = Math.max(hours - base, 0);
        const normalValue = Math.min(hours, base) * rate;
        const extraValue = extra * rate * (1 + percent / 100);
        const nightValue = night * rate * (nightPercent / 100);
        document.getElementById('extra-output').innerHTML = `
            <div class="premium-tool-summary">
                ${premiumMetric('fas fa-hourglass-half', 'Horas extras', `${extra.toFixed(1)}h`, 'orange')}
                ${premiumMetric('fas fa-moon', 'Adic. noturno', premiumMoney(nightValue), 'blue')}
                ${premiumMetric('fas fa-sack-dollar', 'Total estimado', premiumMoney(normalValue + extraValue + nightValue), 'green')}
            </div>
            <small class="premium-note">Estimativa simples. Confirme convenção, escala e regras da empresa antes de usar como valor oficial.</small>`;
    };

    window.ToolsApp.renderSmartReview = function(c) {
        c.innerHTML += toolShell('tool-review', 'fas fa-brain', 'Modo Revisão Inteligente', 'Cria uma sessão de revisão com foco, tempo, exercício e retorno ao IAM.', `
            <div class="pro-grid">
                ${input('review-topic', 'Tema da revisão', 'APH, incêndio, legislação, salvamento...')}
                ${input('review-min', 'Minutos disponíveis', '25', 'number')}
                <label class="pro-field"><span>Dificuldade percebida</span><select id="review-difficulty"><option>Alta</option><option>Média</option><option>Baixa</option></select></label>
                <label class="pro-field"><span>Objetivo</span><select id="review-goal"><option>Fixar conteúdo</option><option>Preparar simulado</option><option>Revisar erros</option><option>Voltar à rotina</option></select></label>
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateReviewPlan()"><i class="fas fa-bolt"></i> Criar plano</button>`, 'review-output')}
            ${outputArea('review-output', 8)}
        `);
    };

    window.ToolsApp.generateReviewPlan = function() {
        const min = Math.max(parseInt(toolValue('review-min')) || 25, 10);
        const topic = toolValue('review-topic') || 'Tema escolhido';
        const difficulty = toolValue('review-difficulty') || 'Média';
        const goal = toolValue('review-goal') || 'Fixar conteúdo';
        setToolOutput('review-output', `PLANO DE REVISÃO INTELIGENTE

Tema: ${topic}
Objetivo: ${goal}
Dificuldade: ${difficulty}
Tempo total: ${min} minutos

1. Aquecimento (${Math.ceil(min * 0.15)} min)
Leia os títulos, palavras-chave e anote o que você lembra sem consultar.

2. Revisão ativa (${Math.ceil(min * 0.35)} min)
Explique o conteúdo em voz alta como se estivesse ensinando outro aluno.

3. Fixação (${Math.ceil(min * 0.30)} min)
Responda exercícios do tema e marque os erros.

4. Fechamento (${Math.max(3, Math.floor(min * 0.20))} min)
Escreva 3 pontos que precisa reforçar e peça ao IAM um resumo direcionado.`);
    };

    window.ToolsApp.renderProtocolLibrary = function(c) {
        window.premiumProtocols = [
            ['APH - XABCDE', 'APH', 'Controlar hemorragia grave, avaliar vias aéreas, respiração, circulação, neurológico, exposição e segurança da cena.'],
            ['Princípio de incêndio', 'Incêndio', 'Avaliar risco, acionar apoio, manter rota de fuga, escolher extintor correto e não se expor sem necessidade.'],
            ['Abandono de área', 'Evacuação', 'Orientar calma, fluxo contínuo, rota segura, ponto de encontro e conferência de pessoas.'],
            ['Espaço confinado', 'NR33', 'Não entrar sem autorização, monitoramento atmosférico, ventilação, vigia, comunicação e plano de resgate.'],
            ['Trabalho em altura', 'NR35', 'Inspecionar ancoragem, talabarte, capacete jugular, isolamento inferior e plano de emergência.'],
            ['Comunicação operacional', 'Postura', 'Mensagem curta: local, ocorrência, riscos, vítimas, apoio necessário e responsável no local.'],
            ['Ameaça e tumulto', 'Segurança', 'Preservar distância, chamar apoio, retirar curiosos, manter tom firme e registrar informações essenciais.'],
            ['Mal súbito', 'APH', 'Avaliar responsividade, acionar emergência, monitorar sinais, manter conforto e registrar evolução até chegada do suporte.']
        ];
        c.innerHTML += toolShell('tool-protocols', 'fas fa-book-medical', 'Biblioteca de Protocolos Rápidos', 'Pesquise condutas em segundos. Ideal para revisar antes de plantão ou simulado.', `
            <div class="pro-grid">
                ${input('protocol-search', 'Buscar protocolo', 'Ex: APH, incêndio, evacuação, NR35')}
                <label class="pro-field"><span>Categoria</span><select id="protocol-category"><option value="">Todas</option><option>APH</option><option>Incêndio</option><option>Evacuação</option><option>NR33</option><option>NR35</option><option>Postura</option><option>Segurança</option></select></label>
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.filterProtocols()"><i class="fas fa-search"></i> Consultar</button>`)}
            <div id="protocol-list" class="premium-protocol-list"></div>
        `);
        ToolsApp.filterProtocols();
    };

    window.ToolsApp.filterProtocols = function() {
        const q = (toolValue('protocol-search') || '').toLowerCase();
        const cat = toolValue('protocol-category');
        const items = (window.premiumProtocols || []).filter(([title, category, text]) => (!cat || category === cat) && `${title} ${category} ${text}`.toLowerCase().includes(q));
        document.getElementById('protocol-list').innerHTML = items.length ? items.map(([title, category, text]) => `
            <article class="premium-protocol-card">
                <span>${premiumEscape(category)}</span>
                <strong>${premiumEscape(title)}</strong>
                <p>${premiumEscape(text)}</p>
            </article>`).join('') : '<div class="pro-empty">Nenhum protocolo encontrado.</div>';
    };

    window.ToolsApp.renderDocumentCenter = function(c) {
        c.innerHTML += toolShell('tool-documents', 'fas fa-folder-open', 'Central de Documentos', 'Controle documentos pessoais, vencimentos e pendências para estágio, trabalho ou curso.', `
            <div class="pro-grid">
                ${input('doc-name', 'Documento', 'CNH, ASO, certificado, comprovante...')}
                ${input('doc-date', 'Validade', '', 'date')}
                <label class="pro-field"><span>Status</span><select id="doc-status"><option>Em dia</option><option>Pendente</option><option>Enviar para empresa</option><option>Renovar</option></select></label>
                ${input('doc-note', 'Observação', 'Onde está salvo ou o que falta')}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.addDocumentItem()"><i class="fas fa-plus"></i> Adicionar documento</button>`)}
            <div id="doc-list" class="pro-list"></div>
        `);
        ToolsApp.refreshDocuments();
    };

    window.ToolsApp.addDocumentItem = function() {
        const name = toolValue('doc-name');
        if (!name) return ToolsApp.toast('Informe o documento', 'info');
        const items = toolStore.get('tool_documents_v93', []);
        items.unshift({ id: Date.now(), name, date: toolValue('doc-date'), status: toolValue('doc-status'), note: toolValue('doc-note') });
        toolStore.set('tool_documents_v93', items);
        ['doc-name', 'doc-date', 'doc-note'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        ToolsApp.refreshDocuments();
    };

    window.ToolsApp.removeDocumentItem = function(id) {
        toolStore.set('tool_documents_v93', toolStore.get('tool_documents_v93', []).filter(i => i.id !== id));
        ToolsApp.refreshDocuments();
    };

    window.ToolsApp.refreshDocuments = function() {
        listTool('tool_documents_v93', 'doc-list', 'Nenhum documento cadastrado.', i => {
            const st = premiumStatusByDate(i.date);
            return `<div class="pro-list-row premium-list-row">
                <span><strong>${premiumEscape(i.name)}</strong><small>${premiumEscape(i.status || 'Em dia')} • ${premiumDate(i.date)} • ${st.label}${i.note ? ` • ${premiumEscape(i.note)}` : ''}</small></span>
                <em class="premium-pill ${st.tone}">${st.tone === 'danger' ? 'Atenção' : st.tone === 'warning' ? 'Próximo' : 'Ok'}</em>
                <button onclick="ToolsApp.removeDocumentItem(${i.id})"><i class="fas fa-times"></i></button>
            </div>`;
        });
    };

    window.ToolsApp.renderProfessionalReport = function(c) {
        c.innerHTML += toolShell('tool-pro-report', 'fas fa-file-signature', 'Gerador de Relatório Profissional', 'Transforma anotações soltas em relatório claro, respeitoso e profissional.', `
            <div class="pro-grid">
                ${input('prorep-title', 'Título do relatório', 'Relatório de atividade / atendimento / vistoria')}
                ${input('prorep-place', 'Local', 'Onde ocorreu')}
                ${textarea('prorep-notes', 'Anotações brutas', 'Cole ou escreva as informações principais...', 6)}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateProfessionalReport()"><i class="fas fa-wand-magic-sparkles"></i> Organizar texto</button><button class="tool-mini-btn ghost" onclick="ToolsApp.downloadToolOutput('prorep-output','relatorio-profissional.txt')"><i class="fas fa-download"></i> Baixar</button>`, 'prorep-output')}
            ${outputArea('prorep-output', 10)}
        `);
    };

    window.ToolsApp.generateProfessionalReport = function() {
        setToolOutput('prorep-output', `${toolValue('prorep-title') || 'RELATÓRIO PROFISSIONAL'}

Data do registro: ${premiumNow()}
Local: ${toolValue('prorep-place') || 'Não informado'}
Responsável: ${getUser().name || 'Aluno/Profissional'}

Resumo:
${toolValue('prorep-notes') || 'Descreva as informações para gerar o relatório.'}

Encaminhamento:
As informações foram registradas de forma objetiva para controle, acompanhamento e comunicação aos responsáveis. Recomenda-se arquivar este registro junto aos demais documentos da ocorrência/atividade.`);
    };

    window.ToolsApp.renderResumeBuilder = function(c) {
        const u = getUser();
        c.innerHTML += toolShell('tool-resume', 'fas fa-id-badge', 'Currículo Profissional Automático', 'Monte uma base limpa para enviar por WhatsApp, e-mail ou adaptar em PDF.', `
            <div class="pro-grid">
                ${input('cv-role', 'Objetivo', 'Bombeiro Civil / Brigadista / Segurança')}
                ${input('cv-city', 'Cidade/UF', 'Brasília/DF')}
                ${textarea('cv-exp', 'Experiências ou vivências', 'Eventos, estágios, atendimento ao público, liderança, curso...', 4)}
                ${textarea('cv-skills', 'Habilidades principais', 'APH, prevenção, comunicação, disciplina, trabalho em equipe...', 4)}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateResume()"><i class="fas fa-file-lines"></i> Gerar currículo</button><button class="tool-mini-btn ghost" onclick="ToolsApp.downloadToolOutput('cv-output','curriculo-bravo-charlie.txt')"><i class="fas fa-download"></i> Baixar</button>`, 'cv-output')}
            ${outputArea('cv-output', 11)}
            <small class="premium-note">Dados usados: ${premiumEscape(u.name || 'nome não informado')} • ${premiumEscape(u.email || 'e-mail não informado')}</small>
        `);
    };

    window.ToolsApp.generateResume = function() {
        const u = getUser();
        setToolOutput('cv-output', `${u.name || 'Nome completo'}
${u.email || 'E-mail'}${u.phone ? ` | ${u.phone}` : ''}
${toolValue('cv-city') || 'Cidade/UF'}

OBJETIVO
${toolValue('cv-role') || 'Atuação profissional na área operacional.'}

RESUMO PROFISSIONAL
Profissional em formação pela plataforma Projeto Bravo Charlie, com foco em segurança, prevenção, disciplina operacional, atendimento responsável e postura profissional.

FORMAÇÃO
Curso de Formação - Projeto Bravo Charlie

EXPERIÊNCIAS / VIVÊNCIAS
${toolValue('cv-exp') || 'Inclua experiências, eventos, estágios, atividades voluntárias ou práticas.'}

HABILIDADES
${toolValue('cv-skills') || 'Inclua suas principais habilidades técnicas e comportamentais.'}`);
    };

    window.ToolsApp.renderCoverLetter = function(c) {
        c.innerHTML += toolShell('tool-letter', 'fas fa-envelope-open-text', 'Gerador de Carta de Apresentação', 'Crie uma mensagem elegante para vaga, indicação ou primeiro contato.', `
            <div class="pro-grid">
                ${input('letter-company', 'Empresa ou recrutador', 'Nome da empresa')}
                ${input('letter-role', 'Vaga desejada', 'Bombeiro Civil')}
                ${input('letter-strength', 'Seu principal diferencial', 'Disciplina, postura e vontade de crescer')}
                ${textarea('letter-availability', 'Disponibilidade', 'Escala, horários, região ou início imediato...', 3)}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateCoverLetter()"><i class="fas fa-paper-plane"></i> Gerar carta</button>`, 'letter-output')}
            ${outputArea('letter-output', 8)}
        `);
    };

    window.ToolsApp.generateCoverLetter = function() {
        const u = getUser();
        setToolOutput('letter-output', `Olá, ${toolValue('letter-company') || 'equipe de recrutamento'}.

Meu nome é ${u.name || '...'} e tenho interesse na oportunidade de ${toolValue('letter-role') || 'atuação profissional'}.

Venho me preparando pela formação Bravo Charlie e busco uma oportunidade para aplicar com responsabilidade meus conhecimentos, mantendo postura profissional, segurança e boa comunicação.

Meu principal diferencial é: ${toolValue('letter-strength') || 'comprometimento e vontade de crescer'}.

Disponibilidade: ${toolValue('letter-availability') || 'a combinar'}.

Fico à disposição para entrevista e envio dos documentos necessários.

Atenciosamente,
${u.name || ''}`);
    };

    window.ToolsApp.renderInterviewPrep = function(c) {
        c.innerHTML += toolShell('tool-interview', 'fas fa-comments', 'Preparador de Entrevista', 'Treine respostas com estrutura profissional e mais confiança.', `
            <div class="pro-grid">
                ${input('interview-role', 'Vaga alvo', 'Bombeiro Civil')}
                ${input('interview-company', 'Empresa', 'Nome da empresa')}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateInterviewPrep()"><i class="fas fa-comments"></i> Montar treino</button>`, 'interview-output')}
            ${outputArea('interview-output', 12)}
        `);
    };

    window.ToolsApp.generateInterviewPrep = function() {
        const role = toolValue('interview-role') || 'vaga';
        const company = toolValue('interview-company') || 'empresa';
        setToolOutput('interview-output', `TREINO DE ENTREVISTA - ${role}

1. Fale sobre você.
Modelo: "Sou uma pessoa comprometida, em formação pela Bravo Charlie, e busco aplicar meus conhecimentos com disciplina, segurança e boa comunicação."

2. Por que quer trabalhar na ${company}?
Modelo: "Porque vejo uma oportunidade de crescer em um ambiente onde posso contribuir com postura, prevenção e responsabilidade."

3. Como você age sob pressão?
Modelo: "Procuro respirar, entender a prioridade, comunicar com clareza e seguir procedimento."

4. Qual seu ponto forte?
Escolha um: pontualidade, disciplina, comunicação, calma, organização ou atenção aos detalhes.

5. Pergunta para fazer no final:
"Quais são as principais expectativas para quem assumir essa função nos primeiros 30 dias?"`);
    };

    window.ToolsApp.renderProfessionalBio = function(c) {
        c.innerHTML += toolShell('tool-bio', 'fas fa-user-tie', 'Gerador de Bio Profissional', 'Bio curta, média e forte para WhatsApp, Instagram ou currículo.', `
            <div class="pro-grid">
                ${input('bio-role', 'Área de atuação', 'Bombeiro Civil / Brigadista')}
                ${input('bio-tone', 'Estilo', 'Profissional, direto e confiante')}
                ${input('bio-city', 'Cidade', 'Brasília/DF')}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.generateBio()"><i class="fas fa-wand-magic-sparkles"></i> Gerar bio</button>`, 'bio-output')}
            ${outputArea('bio-output', 7)}
        `);
    };

    window.ToolsApp.generateBio = function() {
        const name = getUser().name || 'Profissional';
        const role = toolValue('bio-role') || 'Área operacional';
        const city = toolValue('bio-city') || '';
        setToolOutput('bio-output', `BIO CURTA
${name} | ${role}

BIO PROFISSIONAL
${name} - ${role}${city ? ` em ${city}` : ''}. Foco em prevenção, segurança, disciplina operacional e atendimento responsável.

BIO PARA WHATSAPP
Olá, sou ${name}. Atuo/estou em formação na área de ${role}, com foco em postura profissional, segurança e evolução contínua.`);
    };

    window.ToolsApp.renderPortfolio = function(c) {
        c.innerHTML += toolShell('tool-portfolio', 'fas fa-briefcase', 'Portfólio Profissional', 'Registre experiências, cursos, eventos e evidências de evolução.', `
            <div class="pro-grid">
                ${input('portfolio-title', 'Registro', 'Curso, evento, ocorrência, estágio, experiência...')}
                ${input('portfolio-date', 'Data', '', 'date')}
                <label class="pro-field"><span>Tipo</span><select id="portfolio-type"><option>Curso</option><option>Evento</option><option>Experiência</option><option>Certificado</option><option>Voluntariado</option></select></label>
                ${input('portfolio-note', 'Resultado ou evidência', 'O que aprendeu, onde atuou ou o que comprovou')}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.addPortfolioItem()"><i class="fas fa-plus"></i> Adicionar ao portfólio</button>`)}
            <div id="portfolio-list" class="pro-list"></div>
        `);
        ToolsApp.refreshPortfolio();
    };

    window.ToolsApp.addPortfolioItem = function() {
        const title = toolValue('portfolio-title');
        if (!title) return ToolsApp.toast('Informe o registro', 'info');
        const items = toolStore.get('tool_portfolio_v93', []);
        items.unshift({ id: Date.now(), title, date: toolValue('portfolio-date'), type: toolValue('portfolio-type'), note: toolValue('portfolio-note') });
        toolStore.set('tool_portfolio_v93', items);
        ['portfolio-title', 'portfolio-date', 'portfolio-note'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        ToolsApp.refreshPortfolio();
    };

    window.ToolsApp.refreshPortfolio = function() {
        listTool('tool_portfolio_v93', 'portfolio-list', 'Nenhum item no portfólio.', i => `<div class="pro-list-row premium-list-row"><span><strong>${premiumEscape(i.title)}</strong><small>${premiumEscape(i.type || 'Registro')} • ${premiumDate(i.date)}${i.note ? ` • ${premiumEscape(i.note)}` : ''}</small></span><button onclick="ToolsApp.removePortfolioItem(${i.id})"><i class="fas fa-times"></i></button></div>`);
    };

    window.ToolsApp.removePortfolioItem = function(id) {
        toolStore.set('tool_portfolio_v93', toolStore.get('tool_portfolio_v93', []).filter(i => i.id !== id));
        ToolsApp.refreshPortfolio();
    };

    window.ToolsApp.renderCertificateTracker = function(c) {
        c.innerHTML += toolShell('tool-certificates', 'fas fa-certificate', 'Controle de Certificados e Validades', 'Controle reciclagens, certificados e documentos que vencem.', `
            <div class="pro-grid">
                ${input('cert-name', 'Certificado', 'Bombeiro Civil, NR35, NR33, APH...')}
                ${input('cert-date', 'Validade', '', 'date')}
                ${input('cert-issuer', 'Emissor', 'Instituição ou empresa')}
                ${input('cert-note', 'Observação', 'Número, link ou local onde está salvo')}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.addCertificateItem()"><i class="fas fa-plus"></i> Adicionar certificado</button>`)}
            <div id="cert-list" class="pro-list"></div>
        `);
        ToolsApp.refreshCertificates();
    };

    window.ToolsApp.addCertificateItem = function() {
        const name = toolValue('cert-name');
        if (!name) return ToolsApp.toast('Informe o certificado', 'info');
        const items = toolStore.get('tool_certificates_v93', []);
        items.unshift({ id: Date.now(), name, date: toolValue('cert-date'), issuer: toolValue('cert-issuer'), note: toolValue('cert-note') });
        toolStore.set('tool_certificates_v93', items);
        ['cert-name', 'cert-date', 'cert-issuer', 'cert-note'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        ToolsApp.refreshCertificates();
    };

    window.ToolsApp.refreshCertificates = function() {
        listTool('tool_certificates_v93', 'cert-list', 'Nenhum certificado cadastrado.', i => {
            const st = premiumStatusByDate(i.date);
            return `<div class="pro-list-row premium-list-row">
                <span><strong>${premiumEscape(i.name)}</strong><small>${premiumEscape(i.issuer || 'Sem emissor')} • ${premiumDate(i.date)} • ${premiumEscape(st.label)}${i.note ? ` • ${premiumEscape(i.note)}` : ''}</small></span>
                <em class="premium-pill ${st.tone}">${st.tone === 'danger' ? 'Vencido' : st.tone === 'warning' ? 'Atenção' : 'Em dia'}</em>
                <button onclick="ToolsApp.removeCertificateItem(${i.id})"><i class="fas fa-times"></i></button>
            </div>`;
        });
    };

    window.ToolsApp.removeCertificateItem = function(id) {
        toolStore.set('tool_certificates_v93', toolStore.get('tool_certificates_v93', []).filter(i => i.id !== id));
        ToolsApp.refreshCertificates();
    };

    window.ToolsApp.renderPostureMentor = function(c) {
        const scenarios = [
            ['Primeiro plantão', 'Chegue antes, observe a rotina, pergunte o necessário e registre tudo. O profissional novo se destaca por humildade, atenção e pontualidade.'],
            ['Conflito com aluno/cliente', 'Baixe o tom, aumente a clareza, mantenha distância segura e chame apoio se houver risco. Não discuta para vencer, comunique para resolver.'],
            ['Erro cometido', 'Assuma com honestidade, corrija rápido, registre se necessário e peça orientação. Postura profissional aparece principalmente quando algo sai errado.'],
            ['Entrevista', 'Fale com objetividade: formação, disponibilidade, postura e vontade de crescer. Evite inventar experiência que ainda não possui.'],
            ['Rede social', 'Publique evolução, estudo e conquistas. Evite exposição indevida de ocorrências, pacientes, locais sensíveis ou informações internas.']
        ];
        window.premiumPostureScenarios = scenarios;
        c.innerHTML += toolShell('tool-posture', 'fas fa-person-rays', 'Mentor de Postura Profissional', 'Escolha uma situação e receba orientação prática.', `
            <div class="pro-grid">
                <label class="pro-field"><span>Situação</span><select id="posture-scenario">${scenarios.map(([title]) => `<option>${premiumEscape(title)}</option>`).join('')}</select></label>
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.nextPostureTip()"><i class="fas fa-compass"></i> Orientar postura</button>`)}
            <div id="posture-tip" class="pro-quote premium-quote">Escolha uma situação para receber uma orientação.</div>
        `);
    };

    window.ToolsApp.nextPostureTip = function() {
        const selected = toolValue('posture-scenario');
        const item = (window.premiumPostureScenarios || []).find(([title]) => title === selected) || (window.premiumPostureScenarios || [])[0];
        document.getElementById('posture-tip').innerHTML = `<strong>${premiumEscape(item?.[0] || 'Postura')}</strong><span>${premiumEscape(item?.[1] || '')}</span>`;
    };

    window.ToolsApp.renderDigitalProfessionalCard = function(c) {
        const u = getUser();
        const photo = localStorage.getItem('user_profile_pic');
        const initial = premiumEscape(u.name || 'Aluno').slice(0, 1).toUpperCase();
        c.innerHTML += toolShell('tool-pro-card', 'fas fa-address-card', 'Cartão de Identidade Profissional Digital', 'Um cartão de apresentação rápido, com foto local quando existir.', `
            <div class="premium-id-card">
                <div class="premium-id-photo">${photo ? `<img src="${photo}" alt="Foto do perfil">` : `<span>${initial}</span>`}</div>
                <div>
                    <small>Projeto Bravo Charlie</small>
                    <strong>${premiumEscape(u.name || 'Aluno Bravo Charlie')}</strong>
                    <p>${u.courseType === 'SP' ? 'Segurança Patrimonial' : 'Bombeiro Civil / Brigadista'}</p>
                    <em>${premiumEscape(u.email || 'E-mail não informado')} ${u.phone ? `• ${premiumEscape(u.phone)}` : ''}</em>
                </div>
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.copyProfessionalCard()"><i class="fas fa-share-nodes"></i> Copiar apresentação</button>`)}
            <small class="premium-note">A foto é a mesma do Perfil e fica salva apenas neste dispositivo.</small>
        `);
    };

    window.ToolsApp.renderOperationMode = function(c) {
        const saved = toolStore.get('tool_operation_tasks_v93', [
            { id: 1, text: 'Conferir uniforme, postura e identificação', done: false },
            { id: 2, text: 'Checar rádio, telefone e contatos de emergência', done: false },
            { id: 3, text: 'Mapear rotas, extintores, saídas e riscos do local', done: false },
            { id: 4, text: 'Registrar início do plantão e observações importantes', done: false }
        ]);
        toolStore.set('tool_operation_tasks_v93', saved);
        c.innerHTML += toolShell('tool-operation', 'fas fa-tower-observation', 'Modo Operação', 'Checklist prático para assumir plantão, evento ou missão.', `
            <div class="pro-grid">
                ${input('operation-name', 'Nome da operação', 'Plantão, evento, estágio ou serviço')}
                ${input('operation-risk', 'Risco principal', 'Público, incêndio, altura, APH, conflito...')}
                ${input('operation-task', 'Nova tarefa', 'Adicionar tarefa operacional')}
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.addOperationTask()"><i class="fas fa-plus"></i> Adicionar tarefa</button><button class="tool-mini-btn ghost" onclick="ToolsApp.resetOperationTasks()"><i class="fas fa-rotate-left"></i> Reiniciar checklist</button>`)}
            <div id="operation-list" class="premium-check-list"></div>
        `);
        ToolsApp.refreshOperationTasks();
    };

    window.ToolsApp.addOperationTask = function() {
        const text = toolValue('operation-task');
        if (!text) return ToolsApp.toast('Escreva uma tarefa', 'info');
        const items = toolStore.get('tool_operation_tasks_v93', []);
        items.push({ id: Date.now(), text, done: false });
        toolStore.set('tool_operation_tasks_v93', items);
        document.getElementById('operation-task').value = '';
        ToolsApp.refreshOperationTasks();
    };

    window.ToolsApp.toggleOperationTask = function(id) {
        const items = toolStore.get('tool_operation_tasks_v93', []).map(i => i.id === id ? { ...i, done: !i.done } : i);
        toolStore.set('tool_operation_tasks_v93', items);
        ToolsApp.refreshOperationTasks();
    };

    window.ToolsApp.resetOperationTasks = function() {
        toolStore.set('tool_operation_tasks_v93', []);
        ToolsApp.openProfessionalTool('operation');
    };

    window.ToolsApp.refreshOperationTasks = function() {
        const list = document.getElementById('operation-list');
        if (!list) return;
        const items = toolStore.get('tool_operation_tasks_v93', []);
        const done = items.filter(i => i.done).length;
        list.innerHTML = `
            <div class="premium-progress-line"><span style="width:${items.length ? (done / items.length) * 100 : 0}%"></span></div>
            ${items.length ? items.map(i => `<button class="${i.done ? 'done' : ''}" onclick="ToolsApp.toggleOperationTask(${i.id})"><i class="fas ${i.done ? 'fa-check-circle' : 'fa-circle'}"></i><span>${premiumEscape(i.text)}</span></button>`).join('') : '<div class="pro-empty">Adicione tarefas para montar sua operação.</div>'}`;
    };

    window.ToolsApp.renderCrisisSimulator = function(c) {
        window.premiumCrisisScenarios = {
            fire: {
                title: 'Princípio de incêndio em local com público',
                options: [
                    ['Entrar sozinho para resolver rápido', 'danger', 'Risco alto. Agir sozinho pode criar nova vítima e quebrar a cadeia de segurança.'],
                    ['Isolar, orientar saída, acionar apoio e avaliar extintor com rota de fuga', 'success', 'Melhor decisão. Priorizou pessoas, comunicação, apoio e segurança operacional.'],
                    ['Esperar alguém assumir sem comunicar', 'warning', 'Decisão fraca. A demora aumenta o risco e a desorganização.']
                ]
            },
            faint: {
                title: 'Pessoa desmaia em ambiente com curiosos ao redor',
                options: [
                    ['Afastar curiosos, avaliar responsividade e acionar suporte', 'success', 'Conduta adequada. Protege cena, vítima e organiza o atendimento.'],
                    ['Dar água imediatamente', 'danger', 'Inadequado. Pessoa inconsciente ou confusa pode aspirar. Primeiro avalie segurança e responsividade.'],
                    ['Levantar a vítima rápido', 'warning', 'Pode piorar queda ou lesão. Controle o ambiente e avalie antes de movimentar.']
                ]
            },
            conflict: {
                title: 'Visitante agressivo tenta entrar em área restrita',
                options: [
                    ['Discutir no mesmo tom', 'danger', 'Escala o conflito. Profissionalismo exige distância, clareza e apoio.'],
                    ['Manter distância, comunicar regra, chamar apoio e registrar', 'success', 'Melhor resposta. Une segurança, postura e rastreabilidade.'],
                    ['Ignorar para evitar problema', 'warning', 'Pode gerar falha de segurança. O correto é comunicar e acionar apoio.']
                ]
            }
        };
        c.innerHTML += toolShell('tool-crisis', 'fas fa-triangle-exclamation', 'Simulador de Crise Real', 'Treine decisão sob pressão com feedback imediato.', `
            <div class="pro-grid">
                <label class="pro-field"><span>Cenário</span><select id="crisis-scenario"><option value="fire">Incêndio com público</option><option value="faint">Mal súbito</option><option value="conflict">Controle de acesso</option></select></label>
            </div>
            ${actions(`<button class="tool-mini-btn" onclick="ToolsApp.loadCrisisScenario()"><i class="fas fa-play"></i> Carregar cenário</button>`)}
            <div id="crisis-stage" class="premium-crisis-stage"></div>
            <div id="crisis-output" class="premium-result-card">Escolha um cenário para começar.</div>
        `);
        ToolsApp.loadCrisisScenario();
    };

    window.ToolsApp.loadCrisisScenario = function() {
        const scenario = window.premiumCrisisScenarios?.[toolValue('crisis-scenario') || 'fire'];
        document.getElementById('crisis-stage').innerHTML = `
            <strong>${premiumEscape(scenario.title)}</strong>
            <div class="pro-choice-grid">${scenario.options.map((o, index) => `<button onclick="ToolsApp.answerCrisis(${index})">${premiumEscape(o[0])}</button>`).join('')}</div>`;
        document.getElementById('crisis-output').innerHTML = 'Escolha uma ação para receber o feedback.';
    };

    window.ToolsApp.answerCrisis = function(option) {
        const scenario = window.premiumCrisisScenarios?.[toolValue('crisis-scenario') || 'fire'];
        const selected = scenario.options[option];
        document.getElementById('crisis-output').innerHTML = `<div class="premium-feedback ${selected[1]}"><strong>${selected[1] === 'success' ? 'Boa decisão' : selected[1] === 'warning' ? 'Atenção' : 'Risco alto'}</strong><span>${premiumEscape(selected[2])}</span></div>`;
    };

    window.ToolsApp.renderAchievementWallet = function(c) {
        const completed = toolStore.get('gateBombeiroCompletedModules_v3', []);
        const certs = toolStore.get('tool_certificates_v93', []).length || toolStore.get('tool_certificates_v1', []).length;
        const portfolio = toolStore.get('tool_portfolio_v93', []).length || toolStore.get('tool_portfolio_v1', []).length;
        const docs = toolStore.get('tool_documents_v93', []).length;
        c.innerHTML += toolShell('tool-wallet', 'fas fa-medal', 'Carteira de Conquistas', 'Transforme sua evolução em prova visual de compromisso.', `
            <div class="premium-tool-summary">
                ${premiumMetric('fas fa-check-double', 'Módulos', completed.length, 'green')}
                ${premiumMetric('fas fa-certificate', 'Certificados', certs, 'orange')}
                ${premiumMetric('fas fa-briefcase', 'Portfólio', portfolio, 'blue')}
                ${premiumMetric('fas fa-folder-open', 'Documentos', docs, 'purple')}
            </div>
            <div class="premium-achievement-road">
                <span class="${completed.length >= 5 ? 'done' : ''}">Começou com consistência</span>
                <span class="${completed.length >= 20 ? 'done' : ''}">Entrou no ritmo operacional</span>
                <span class="${completed.length >= 40 ? 'done' : ''}">Pronto para reta final</span>
                <span class="${completed.length >= 56 ? 'done' : ''}">Formação concluída</span>
            </div>
        `);
    };

})();

