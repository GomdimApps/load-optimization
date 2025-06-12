document.characterSet = 'UTF-8';

/**
 * @namespace FerryOptimizerApp
 * 
 */
const FerryOptimizerApp = {
    /**
     * Configurações e constantes da aplicação.
     */
    config: {
        API_BASE_URL: 'http://172.20.0.2:8080',
        SCALE: 20,
        CANVAS_OFFSET: {
            LEFT: 50,
            TOP: 30,
            RIGHT: 20,
            BOTTOM: 20
        },
    },

    /**
     * Gerencia o estado da aplicação.
     */
    state: {
        apiData: null,
        renderedItems: [],
        hoveredItemId: null,
    },

    /**
     * Cache de elementos da UI.
     */
    ui: {
        canvas: null,
        ctx: null,
        form: null,
        statsPanel: null,
        loadButton: null,
    },

    /**
     * Módulo para interações com a API.
     */
    api: {
        /**
         * Busca os dados otimizados da balsa.
         */
        fetchData: async () => {
            const response = await fetch(`${FerryOptimizerApp.config.API_BASE_URL}/api/optimize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json;charset=UTF-8' }
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `Falha ao buscar dados: Status ${response.status}`);
            }
            return data;
        },

        /**
         * Adiciona um novo item (container).
         */
        addItem: async (itemData) => {
            const response = await fetch(`${FerryOptimizerApp.config.API_BASE_URL}/api/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `Erro ao adicionar item: ${response.status}`);
            }
            return data;
        },

        /**
         * Deleta um item específico.
         */
        deleteItem: async (itemId) => {
            const response = await fetch(`${FerryOptimizerApp.config.API_BASE_URL}/api/items/${itemId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`Falha ao deletar item: Status ${response.status}`);
            }
        },
    },

    /**
     * Funções de desenho no canvas.
     */
    drawing: {
        /**
         * Renderiza a balsa e todos os seus componentes no canvas.
         */
        render() {
            const { apiData } = FerryOptimizerApp.state;
            if (!apiData || !apiData.ferry_info) {
                this.displayError("Dados recebidos da API são inválidos ou incompletos.");
                return;
            }

            this.setupCanvas(apiData.ferry_info);
            this.drawGrid(apiData.ferry_info);
            this.drawFerryArea(apiData.ferry_info);
            this.drawItems(apiData.placed_items || [], apiData.ferry_info);
            FerryOptimizerApp.ui.updateStatsPanel();
        },
        
        /**
         * Configura as dimensões do canvas com base nos dados da balsa.
         */
        setupCanvas(ferry) {
            const { SCALE, CANVAS_OFFSET } = FerryOptimizerApp.config;
            const canvas = FerryOptimizerApp.ui.canvas;
            
            canvas.width = Math.ceil(ferry.width * SCALE) + CANVAS_OFFSET.LEFT + CANVAS_OFFSET.RIGHT;
            canvas.height = Math.ceil(ferry.length * SCALE) + CANVAS_OFFSET.TOP + CANVAS_OFFSET.BOTTOM;
            
            FerryOptimizerApp.ui.ctx.clearRect(0, 0, canvas.width, canvas.height);
        },

        /**
         * Desenha a área da balsa.
         */
        drawFerryArea(ferry) {
            const { SCALE, CANVAS_OFFSET } = FerryOptimizerApp.config;
            const ctx = FerryOptimizerApp.ui.ctx;
            ctx.fillStyle = 'rgba(240, 240, 240, 0.5)';
            ctx.fillRect(CANVAS_OFFSET.LEFT, CANVAS_OFFSET.TOP, ferry.width * SCALE, ferry.length * SCALE);
        },
        
        /**
         * Desenha a grade e as métricas no canvas.
         */
        drawGrid(ferry) {
            const { SCALE, CANVAS_OFFSET } = FerryOptimizerApp.config;
            const ctx = FerryOptimizerApp.ui.ctx;
            const gridWidth = ferry.width * SCALE;
            const gridHeight = ferry.length * SCALE;

            const drawLines = (step, color) => {
                ctx.strokeStyle = color;
                for (let x = 0; x <= gridWidth; x += step) {
                    ctx.beginPath();
                    ctx.moveTo(CANVAS_OFFSET.LEFT + x, CANVAS_OFFSET.TOP);
                    ctx.lineTo(CANVAS_OFFSET.LEFT + x, CANVAS_OFFSET.TOP + gridHeight);
                    ctx.stroke();
                }
                for (let y = 0; y <= gridHeight; y += step) {
                    ctx.beginPath();
                    ctx.moveTo(CANVAS_OFFSET.LEFT, CANVAS_OFFSET.TOP + y);
                    ctx.lineTo(CANVAS_OFFSET.LEFT + gridWidth, CANVAS_OFFSET.TOP + y);
                    ctx.stroke();
                }
            };
            
            ctx.lineWidth = 0.5;
            drawLines(SCALE, '#e0e0e0');
            drawLines(SCALE / 2, '#f0f0f0');
            
            this.drawGridLabels(ferry, gridWidth, gridHeight);
        },

        /**
         * Desenha os rótulos de dimensão na grade.
         */
        drawGridLabels(ferry, gridWidth, gridHeight) {
            const { SCALE, CANVAS_OFFSET } = FerryOptimizerApp.config;
            const ctx = FerryOptimizerApp.ui.ctx;
            const labelSpacing = Math.max(40, Math.min(gridWidth, gridHeight) / 5);

            ctx.fillStyle = '#666';
            ctx.font = '10px Roboto';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            for (let x = 0; x <= gridWidth; x += labelSpacing) {
                const meters = (x / SCALE).toFixed(1);
                if (parseFloat(meters) <= ferry.width) {
                    ctx.fillText(`${meters}m`, CANVAS_OFFSET.LEFT + x, CANVAS_OFFSET.TOP - 15);
                }
            }

            for (let y = 0; y <= gridHeight; y += labelSpacing) {
                const meters = (y / SCALE).toFixed(1);
                if (parseFloat(meters) <= ferry.length) {
                    ctx.fillText(`${meters}m`, CANVAS_OFFSET.LEFT - 25, CANVAS_OFFSET.TOP + y);
                }
            }
            
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px Roboto';
            ctx.fillText(`Largura: ${ferry.width.toFixed(1)}m`, CANVAS_OFFSET.LEFT + gridWidth / 2, CANVAS_OFFSET.TOP - 25);
            ctx.save();
            ctx.translate(CANVAS_OFFSET.LEFT - 40, CANVAS_OFFSET.TOP + gridHeight / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`Comprimento: ${ferry.length.toFixed(1)}m`, 0, 0);
            ctx.restore();
        },

        /**
         * Desenha todos os itens na balsa.
         */
        drawItems(items, ferry) {
            const { SCALE, CANVAS_OFFSET } = FerryOptimizerApp.config;
            const ctx = FerryOptimizerApp.ui.ctx;

            FerryOptimizerApp.state.renderedItems = [];

            if (items.length === 0) {
                ctx.fillStyle = '#666';
                ctx.font = 'bold 16px Roboto';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Balsa vazia', ctx.canvas.width / 2, ctx.canvas.height / 2);
                return;
            }
            
            ctx.save();
            ctx.beginPath();
            ctx.rect(CANVAS_OFFSET.LEFT, CANVAS_OFFSET.TOP, ferry.width * SCALE, ferry.length * SCALE);
            ctx.clip();

            items.forEach(item => {
                const widthOnCanvas = item.width * SCALE;
                const lengthOnCanvas = item.length * SCALE;
                const x = CANVAS_OFFSET.LEFT + item.position_x * SCALE;
                const y = CANVAS_OFFSET.TOP + item.position_z * SCALE;

                FerryOptimizerApp.state.renderedItems.push({ 
                    id: item.id, x, y, width: widthOnCanvas, length: lengthOnCanvas,
                    deleteButton: { x: x + widthOnCanvas - 15, y: y + 15, radius: 10 }
                });
                
                this.drawSingleItem(x, y, widthOnCanvas, lengthOnCanvas, item);
            });
            ctx.restore();
        },
        
        /**
         * Desenha um único item no canvas.
         */
        drawSingleItem(x, y, width, length, item) {
            const ctx = FerryOptimizerApp.ui.ctx;
            const baseColor = item.color || '#3498db';

            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            const gradient = ctx.createLinearGradient(x, y, x, y + length);
            gradient.addColorStop(0, this.lightenColor(baseColor, 15));
            gradient.addColorStop(1, this.darkenColor(baseColor, 15));
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, width, length);
            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = this.darkenColor(baseColor, 30);
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, length);
            
            this.drawItemText(x, y, width, length, item, baseColor);
            this.drawTrashIcon(x + width - 15, y + 15);
        },

        /**
         * Desenha o texto informativo dentro do item.
         */
        drawItemText(x, y, width, length, item, baseColor) {
            const ctx = FerryOptimizerApp.ui.ctx;
            const fontSize = Math.max(10, Math.min(16, Math.floor(Math.min(width, length) / 4)));
            ctx.fillStyle = this.getContrastColor(baseColor);
            ctx.font = `bold ${fontSize}px Roboto`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const texts = [`#${item.id}`, `${item.weight.toFixed(1)}t`];
            const centerX = x + width / 2;
            const centerY = y + length / 2;
            const lineHeight = fontSize * 1.2;
            const startY = centerY - (lineHeight * (texts.length - 1)) / 2;

            texts.forEach((text, index) => {
                ctx.fillText(text, centerX, startY + (index * lineHeight));
            });
        },

        /**
         * Desenha um ícone de lixeira.
         */
        drawTrashIcon(x, y) {
            const ctx = FerryOptimizerApp.ui.ctx;
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fill();
            ctx.strokeStyle = '#D32F2F';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#D32F2F';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('×', x, y + 1);
        },

        /**
         * Exibe uma mensagem de erro no canvas.
         */
        displayError(message) {
            const ctx = FerryOptimizerApp.ui.ctx;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#D32F2F';
            ctx.font = 'bold 16px Roboto';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            message.split('\n').forEach((line, index) => {
                ctx.fillText(line, ctx.canvas.width / 2, ctx.canvas.height / 2 + (index * 20));
            });
        },
        
        // Funções auxiliares para manipulação de cores.
        darkenColor: (c, p) => { const n=parseInt(c.replace("#",""),16),a=Math.round(2.55*p),R=Math.max(0,(n>>16)-a),G=Math.max(0,(n>>8&0x00FF)-a),B=Math.max(0,(n&0x0000FF)-a);return "#"+(0x1000000+R*0x10000+G*0x100+B).toString(16).slice(1) },
        lightenColor: (c, p) => { const n=parseInt(c.replace("#",""),16),a=Math.round(2.55*p),R=Math.min(255,(n>>16)+a),G=Math.min(255,(n>>8&0x00FF)+a),B=Math.min(255,(n&0x0000FF)+a);return "#"+(0x1000000+R*0x10000+G*0x100+B).toString(16).slice(1) },
        getContrastColor: (c) => { if (!c||!c.startsWith("#")) return "#FFF"; const r=parseInt(c.substr(1,2),16),g=parseInt(c.substr(3,2),16),b=parseInt(c.substr(5,2),16); return ((r*299+g*587+b*114)/1000 >= 128) ? "#000" : "#FFF" },
    },

    /**
     * Lógica para a tooltip de informações do item.
     */
    tooltip: {
        /**
         * Mostra a tooltip com informações do item.
         */
        show(event, item) {
            this.removeAll();
            const tooltipEl = document.createElement('div');
            tooltipEl.className = 'tooltip';
            tooltipEl.innerHTML = `
                <strong>Container #${item.id}</strong>
                Dimensões: ${item.width}m × ${item.length}m<br>
                Peso: ${item.weight}t`;
            
            document.body.appendChild(tooltipEl);
            
            tooltipEl.style.left = `${event.clientX + 15}px`;
            tooltipEl.style.top = `${event.clientY + 15}px`;
            
            setTimeout(() => tooltipEl.style.opacity = '1', 10);
        },

        /**
         * Atualiza a posição da tooltip ativa na tela.
         */
        updatePosition(event) {
            const tooltipEl = document.querySelector('.tooltip');
            if (!tooltipEl) return;
            tooltipEl.style.left = `${event.clientX + 15}px`;
            tooltipEl.style.top = `${event.clientY + 15}px`;
        },

        /**
         * Remove todas as tooltips da DOM.
         */
        removeAll() {
            const tooltips = document.querySelectorAll('.tooltip');
            tooltips.forEach(tooltip => {
                tooltip.style.opacity = '0';
                setTimeout(() => tooltip.remove(), 300);
            });
        }
    },

    /**
     * Manipuladores de eventos (handlers).
     */
    handlers: {
        /**
         * Carrega e renderiza os dados da balsa.
         */
        async loadAndRenderData() {
            FerryOptimizerApp.tooltip.removeAll();
            FerryOptimizerApp.ui.showLoading();
            try {
                const data = await FerryOptimizerApp.api.fetchData();
                FerryOptimizerApp.state.apiData = data;
                FerryOptimizerApp.drawing.render();
            } catch (error) {
                console.error('Erro na requisição:', error);
                FerryOptimizerApp.drawing.displayError(`Erro ao carregar dados.\n${error.message}`);
            }
        },
        
        /**
         * Manipula o envio do formulário para adicionar um novo container.
         */
        async handleFormSubmit(event) {
            event.preventDefault();
            const form = event.target;
            const formData = {
                type: "Container",
                width: parseFloat(form.width.value),
                height: parseFloat(form.height.value),
                length: parseFloat(form.length.value),
                weight: parseFloat(form.weight.value)
            };

            try {
                await FerryOptimizerApp.api.addItem(formData);
                alert('Container adicionado com sucesso!');
                form.reset();
                this.loadAndRenderData();
            } catch (error) {
                console.error('Erro ao adicionar container:', error);
                alert(error.message);
            }
        },

        /**
         * Manipula o clique no canvas para deletar itens.
         */
        handleCanvasClick(event) {
            const { renderedItems } = FerryOptimizerApp.state;
            const mousePos = FerryOptimizerApp.utils.getMousePos(event);

            const itemToDelete = renderedItems.find(item => {
                const dx = mousePos.x - item.deleteButton.x;
                const dy = mousePos.y - item.deleteButton.y;
                return Math.sqrt(dx * dx + dy * dy) <= item.deleteButton.radius;
            });
            
            if (itemToDelete) {
                if (confirm(`Deseja realmente deletar o container #${itemToDelete.id}?`)) {
                    FerryOptimizerApp.api.deleteItem(itemToDelete.id)
                        .then(() => this.loadAndRenderData())
                        .catch(error => {
                            console.error('Erro ao deletar item:', error);
                            alert(`Erro ao deletar: ${error.message}`);
                        });
                }
            }
        },

        /**
         * Manipula o movimento do mouse sobre o canvas.
         */
        handleCanvasMouseMove(event) {
            const { apiData, renderedItems } = FerryOptimizerApp.state;
            if (!apiData) return;

            const mousePos = FerryOptimizerApp.utils.getMousePos(event);
            const { canvas } = FerryOptimizerApp.ui;
            
            const hoveredItem = renderedItems.find(item => 
                mousePos.x >= item.x && mousePos.x <= item.x + item.width && 
                mousePos.y >= item.y && mousePos.y <= item.y + item.length
            );

            const currentlyHoveredId = hoveredItem ? hoveredItem.id : null;
            
            if (currentlyHoveredId !== FerryOptimizerApp.state.hoveredItemId) {
                FerryOptimizerApp.state.hoveredItemId = currentlyHoveredId;
                canvas.style.cursor = currentlyHoveredId ? 'pointer' : 'default';
                
                FerryOptimizerApp.tooltip.removeAll();
                
                if (hoveredItem) {
                    const fullItemData = apiData.placed_items.find(i => i.id === hoveredItem.id);
                    if (fullItemData) {
                        FerryOptimizerApp.tooltip.show(event, fullItemData);
                    }
                }
            } 
            else if (currentlyHoveredId) {
                FerryOptimizerApp.tooltip.updatePosition(event);
            }
        },

        /**
         * Manipula a saída do mouse do canvas.
         */
        handleCanvasMouseOut() {
            FerryOptimizerApp.tooltip.removeAll();
            FerryOptimizerApp.state.hoveredItemId = null;
            FerryOptimizerApp.ui.canvas.style.cursor = 'default';
        }
    },
    
    /**
     * Métodos e utilitários da UI.
     */
    ui: {
        ...this.ui,

        /**
         * Cacheia os elementos DOM para acesso rápido.
         */
        cacheElements() {
            this.canvas = document.getElementById('balsaCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.form = document.getElementById('containerForm');
            this.statsPanel = document.getElementById('statsPanel');
            this.loadButton = document.getElementById('loadData');
        },

        /**
         * Mostra um indicador de carregamento no painel de estatísticas.
         */
        showLoading() {
            this.statsPanel.innerHTML = `
                <div class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i> Carregando...
                </div>`;
        },

        /**
         * Atualiza o painel de estatísticas com os dados da balsa.
         */
        updateStatsPanel() {
            const data = FerryOptimizerApp.state.apiData;
            if (!data) return;

            const { ferry_info: ferry, placed_items: items = [], total_weight, total_volume_occupied } = data;

            this.statsPanel.innerHTML = `
                <h3><i class="fas fa-box"></i> Informações da Carga</h3>
                <p><i class="fas fa-weight-hanging"></i> Peso Total: ${total_weight || 0}t</p>
                <p><i class="fas fa-cube"></i> Volume Ocupado: ${(total_volume_occupied || 0).toFixed(2)}m³</p>
                <p><i class="fas fa-boxes"></i> Itens Carregados: ${items.length}</p>
                <h3><i class="fas fa-ship"></i> Informações da Balsa</h3>
                <p><i class="fas fa-arrows-alt-h"></i> Largura: ${ferry.width}m</p>
                <p><i class="fas fa-ruler"></i> Comprimento: ${ferry.length}m</p>
                <p><i class="fas fa-weight"></i> Peso Máximo: ${ferry.max_weight}t</p>
                <p><i class="fas fa-percentage"></i> Espaço Utilizável: ${(ferry.usable_space_percentage * 100).toFixed(1)}%</p>
            `;
        }
    },
    
    /**
     * Funções utilitárias.
     */
    utils: {
        /**
         * Obtém as coordenadas do mouse relativas ao canvas.
         */
        getMousePos(event) {
            const rect = FerryOptimizerApp.ui.canvas.getBoundingClientRect();
            const scaleX = FerryOptimizerApp.ui.canvas.width / rect.width;
            const scaleY = FerryOptimizerApp.ui.canvas.height / rect.height;
            return {
                x: (event.clientX - rect.left) * scaleX,
                y: (event.clientY - rect.top) * scaleY
            };
        }
    },

    /**
     * Inicializa a aplicação.
     */
    init() {
        this.ui.cacheElements();
        
        this.ui.loadButton.addEventListener('click', this.handlers.loadAndRenderData.bind(this.handlers));
        this.ui.form.addEventListener('submit', this.handlers.handleFormSubmit.bind(this.handlers));
        this.ui.canvas.addEventListener('click', this.handlers.handleCanvasClick.bind(this.handlers));
        this.ui.canvas.addEventListener('mousemove', this.handlers.handleCanvasMouseMove.bind(this.handlers));
        this.ui.canvas.addEventListener('mouseout', this.handlers.handleCanvasMouseOut.bind(this.handlers));
        
        this.handlers.loadAndRenderData();
    }
};

// Inicia a aplicação quando o DOM estiver pronto.
window.addEventListener('DOMContentLoaded', () => FerryOptimizerApp.init());
