document.characterSet = 'UTF-8';

const canvas = document.getElementById('balsaCanvas');
const ctx = canvas.getContext('2d');

const SCALE = 20;

const OFFSET_LEFT = 50;
const OFFSET_TOP = 30;

let lastApiData = null; 
let renderedItems = []; 

const API_BASE_URL = 'http://172.20.0.2:8080';

async function loadBalsaData() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/api/optimize`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json;charset=UTF-8'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Falha ao buscar dados: Status ${response.status}`);
        }

        lastApiData = data;
        
        // Renderiza a balsa com os dados recebidos da API.
        renderBalsa(lastApiData);

    } catch (error) {
        console.error('Erro na requisição:', error);
        alert(error.message);
        displayError(`Erro ao carregar dados da balsa.\n${error.message}`);
    }
}

/**
 * Renderiza a balsa e todos os itens posicionados no canvas.
 * @param {object} data 
 */
function renderBalsa(data) {
    if (!data || !data.ferry_info) {
        displayError("Dados recebidos da API são inválidos ou incompletos.");
        return;
    }

    const ferry = data.ferry_info;

    // Calcula o tamanho do canvas baseado nas dimensões reais da balsa
    const canvasWidth = Math.ceil(ferry.width * SCALE) + OFFSET_LEFT + 20;
    const canvasHeight = Math.ceil(ferry.length * SCALE) + OFFSET_TOP + 20;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    renderedItems = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenha a grade e as métricas com as dimensões reais da balsa
    drawGrid(ferry.width * SCALE, ferry.length * SCALE, ferry);

    // Desenha a área da balsa com as dimensões reais
    ctx.fillStyle = 'rgba(240, 240, 240, 0.5)';
    ctx.fillRect(OFFSET_LEFT, OFFSET_TOP, ferry.width * SCALE, ferry.length * SCALE);

    updateStatsPanel(data);

    if (!data.placed_items || data.placed_items.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = 'bold 16px Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Balsa vazia - Nenhum item carregado', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Salva o estado atual do contexto
    ctx.save();
    
    // Define a área de recorte para a balsa
    ctx.beginPath();
    ctx.rect(OFFSET_LEFT, OFFSET_TOP, ferry.width * SCALE, ferry.length * SCALE);
    ctx.clip();

    data.placed_items.forEach(item => {
        const widthOnCanvas = item.width * SCALE;
        const lengthOnCanvas = item.length * SCALE;
        const x = OFFSET_LEFT + item.position_x * SCALE;
        const y = OFFSET_TOP + item.position_z * SCALE;

        renderedItems.push({ 
            id: item.id, 
            x, 
            y, 
            width: widthOnCanvas, 
            length: lengthOnCanvas,
            deleteButtonX: x + widthOnCanvas - 25,
            deleteButtonY: y + 25
        });
        
        drawItem(x, y, widthOnCanvas, lengthOnCanvas, item);
    });

    // Restaura o estado do contexto
    ctx.restore();
}

/**
 * Exibe uma mensagem de erro centralizada no canvas.
 * @param {string} message - A mensagem de erro a ser exibida.
 */
function displayError(message) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#D32F2F'; // Cor vermelha para erros
    ctx.font = 'bold 16px Roboto';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const lines = message.split('\n');
    const lineHeight = 20;
    const startY = canvas.height / 2 - (lineHeight * (lines.length - 1)) / 2;

    lines.forEach((line, index) => {
        ctx.fillText(line, canvas.width / 2, startY + (index * lineHeight));
    });
}


/**
 * 
 * @param {object} data 
 */
function updateStatsPanel(data) {
    const ferry = data.ferry_info;
    const items = data.placed_items || [];
    
    const statsPanel = document.getElementById('statsPanel');
    statsPanel.innerHTML = `
        <h3><i class="fas fa-box"></i> Informações da Carga</h3>
        <p><i class="fas fa-weight-hanging"></i> Peso Total: ${data.total_weight || 0}t</p>
        <p><i class="fas fa-cube"></i> Volume Ocupado: ${(data.total_volume_occupied || 0).toFixed(2)}m³</p>
        <p><i class="fas fa-boxes"></i> Itens Carregados: ${items.length}</p>
        <h3><i class="fas fa-ship"></i> Informações da Balsa</h3>
        <p><i class="fas fa-arrows-alt-h"></i> Largura: ${ferry.width}m</p>
        <p><i class="fas fa-arrows-alt-v"></i> Altura: ${ferry.height}m</p>
        <p><i class="fas fa-ruler"></i> Comprimento: ${ferry.length}m</p>
        <p><i class="fas fa-weight"></i> Peso Máximo: ${ferry.max_weight}t</p>
        <p><i class="fas fa-percentage"></i> Espaço Utilizável: ${(ferry.usable_space_percentage * 100).toFixed(1)}%</p>
    `;
}


/**
 * Desenha uma grade de fundo no canvas.
 * @param {number} width - Largura do canvas.
 * @param {number} height - Altura do canvas.
 */
function drawGrid(width, height, ferry) {
    // Grade principal (metros)
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    // Desenha as linhas verticais (largura)
    for (let x = 0; x <= width; x += SCALE) {
        ctx.beginPath();
        ctx.moveTo(OFFSET_LEFT + x, OFFSET_TOP);
        ctx.lineTo(OFFSET_LEFT + x, OFFSET_TOP + height);
        ctx.stroke();
    }

    // Desenha as linhas horizontais (comprimento)
    for (let y = 0; y <= height; y += SCALE) {
        ctx.beginPath();
        ctx.moveTo(OFFSET_LEFT, OFFSET_TOP + y);
        ctx.lineTo(OFFSET_LEFT + width, OFFSET_TOP + y);
        ctx.stroke();
    }

    // Grade secundária (0.5 metros)
    ctx.strokeStyle = '#f0f0f0';
    for (let x = 0; x <= width; x += SCALE / 2) {
        ctx.beginPath();
        ctx.moveTo(OFFSET_LEFT + x, OFFSET_TOP);
        ctx.lineTo(OFFSET_LEFT + x, OFFSET_TOP + height);
        ctx.stroke();
    }
    for (let y = 0; y <= height; y += SCALE / 2) {
        ctx.beginPath();
        ctx.moveTo(OFFSET_LEFT, OFFSET_TOP + y);
        ctx.lineTo(OFFSET_LEFT + width, OFFSET_TOP + y);
        ctx.stroke();
    }

    // Configuração dos rótulos
    ctx.fillStyle = '#666';
    ctx.font = '10px Roboto';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Calcula o espaçamento dos rótulos baseado no tamanho real da balsa
    const labelSpacing = Math.max(40, Math.min(width, height) / 5);

    // Rótulos horizontais (largura)
    for (let x = 0; x <= width; x += labelSpacing) {
        const meters = (x / SCALE).toFixed(1);
        if (parseFloat(meters) <= ferry.width) {
            ctx.fillText(`${meters}m`, OFFSET_LEFT + x, OFFSET_TOP - 10);
        }
    }

    // Rótulos verticais (comprimento)
    for (let y = 0; y <= height; y += labelSpacing) {
        const meters = (y / SCALE).toFixed(1);
        if (parseFloat(meters) <= ferry.length) {
            ctx.fillText(`${meters}m`, OFFSET_LEFT - 20, OFFSET_TOP + y);
        }
    }

    // Adiciona rótulos finais com as dimensões totais
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Roboto';
    
    // Rótulo da largura total
    ctx.fillText(`Largura: ${ferry.width.toFixed(1)}m`, OFFSET_LEFT + width/2, OFFSET_TOP - 25);
    
    // Rótulo do comprimento total
    ctx.save();
    ctx.translate(OFFSET_LEFT - 35, OFFSET_TOP + height/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(`Comprimento: ${ferry.length.toFixed(1)}m`, 0, 0);
    ctx.restore();
}

/**
 * Desenha um único item no canvas, incluindo o ícone de lixeira se estiver sob o mouse.
 * @param {number} x - Posição X no canvas.
 * @param {number} y - Posição Y no canvas.
 * @param {number} width - Largura do item no canvas.
 * @param {number} length - Comprimento do item no canvas.
 * @param {object} item - O objeto do item.
 */
function drawItem(x, y, width, length, item) {
    // Sombra
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // Gradiente
    const baseColor = item.color || '#3498db';
    const gradient = ctx.createLinearGradient(x, y, x, y + length);
    gradient.addColorStop(0, lightenColor(baseColor, 15));
    gradient.addColorStop(1, darkenColor(baseColor, 15));

    // Corpo do item
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, length);

    // Borda
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = darkenColor(baseColor, 30);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, length);

    // Texto
    const minFontSize = 10;
    const maxFontSize = 16;
    const calculatedFontSize = Math.max(minFontSize, Math.min(maxFontSize, Math.floor(Math.min(width, length) / 4)));

    ctx.fillStyle = getContrastColor(baseColor);
    ctx.font = `bold ${calculatedFontSize}px Roboto`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Informações do item
    const texts = [`#${item.id}`, `${item.weight.toFixed(1)}t`];
    const centerX = x + width / 2;
    const centerY = y + length / 2;
    const lineHeight = calculatedFontSize * 1.2;
    const startY = centerY - (lineHeight * (texts.length - 1)) / 2;

    texts.forEach((text, index) => {
        ctx.fillText(text, centerX, startY + (index * lineHeight));
    });

    // Botão de deletar
    drawTrashIcon(x + width - 25, y + 25);
}

/**
 * Desenha um ícone de lixeira no centro do item.
 * @param {number} x - Coordenada X do centro do item.
 * @param {number} y - Coordenada Y do centro do item.
 */
function drawTrashIcon(x, y) {
    const iconSize = 20;
    
    // Círculo de fundo
    ctx.beginPath();
    ctx.arc(x, y, iconSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    
    // Borda do círculo
    ctx.strokeStyle = '#D32F2F';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ícone de lixeira
    ctx.fillStyle = '#D32F2F';
    ctx.font = `bold ${iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×', x, y);
}

/**
 * Deleta um item via API e atualiza a visualização.
 * @param {number} itemId - O ID do item a ser deletado.
 */
async function deleteItem(itemId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Falha ao deletar item: Status ${response.status}`);
        }

        // Recarrega os dados após deletar
        await loadBalsaData();
        
    } catch (error) {
        console.error('Erro ao deletar item:', error);
        alert(`Erro ao deletar o container: ${error.message}`);
    }
}

// Funções auxiliares para manipulação de cores
function darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function getContrastColor(hexcolor) {
    if (!hexcolor || !hexcolor.startsWith('#')) return '#FFFFFF';
    const r = parseInt(hexcolor.substr(1, 2), 16);
    const g = parseInt(hexcolor.substr(3, 2), 16);
    const b = parseInt(hexcolor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
}

/**
 * Manipula o envio do formulário para adicionar um novo container.
 * @param {Event} event - O evento de submit do formulário.
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const formData = {
        type: "Container",
        width: parseFloat(document.getElementById('width').value),
        height: parseFloat(document.getElementById('height').value),
        length: parseFloat(document.getElementById('length').value),
        weight: parseFloat(document.getElementById('weight').value)
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Erro ao adicionar item: ${response.status}`);
        }
        
        alert('Container adicionado com sucesso!');
        await loadBalsaData();

    } catch (error) {
        console.error('Erro ao adicionar container:', error);
        alert(error.message);
    }
}

// Adiciona efeito de hover nos itens
let hoveredItemId = null;

// Adiciona tooltip para os itens
function showTooltip(event, item) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerHTML = `
        <strong>Container #${item.id}</strong><br>
        Dimensões: ${item.width}m × ${item.length}m<br>
        Peso: ${item.weight}t
    `;
    
    document.body.appendChild(tooltip);
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
    tooltip.style.opacity = '1';
    
    return tooltip;
}

// Remove tooltip
function removeTooltip(tooltip) {
    if (tooltip) {
        tooltip.style.opacity = '0';
        setTimeout(() => tooltip.remove(), 300);
    }
}

// Atualiza o evento de mousemove para incluir tooltip
let currentTooltip = null;

canvas.addEventListener('mousemove', (event) => {
    if (!lastApiData) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let currentlyHovered = null;
    let hoveredItem = null;
    
    for (const item of renderedItems) {
        if (mouseX >= item.x && mouseX <= item.x + item.width && 
            mouseY >= item.y && mouseY <= item.y + item.length) {
            currentlyHovered = item.id;
            hoveredItem = lastApiData.placed_items.find(i => i.id === item.id);
            break;
        }
    }
    
    if (currentlyHovered !== hoveredItemId) {
        hoveredItemId = currentlyHovered;
        canvas.style.cursor = currentlyHovered ? 'pointer' : 'default';
        renderBalsa(lastApiData);
        
        // Atualiza tooltip
        removeTooltip(currentTooltip);
        if (hoveredItem) {
            currentTooltip = showTooltip(event, hoveredItem);
        }
    } else if (currentTooltip && hoveredItem) {
        // Atualiza posição do tooltip
        currentTooltip.style.left = `${event.clientX + 10}px`;
        currentTooltip.style.top = `${event.clientY + 10}px`;
    }
});

// Remove tooltip quando o mouse sai do canvas
canvas.addEventListener('mouseout', () => {
    removeTooltip(currentTooltip);
    currentTooltip = null;
});

// Adiciona animação de loading
function showLoading() {
    const statsPanel = document.getElementById('statsPanel');
    statsPanel.innerHTML = `
        <div class="loading-indicator">
            <i class="fas fa-spinner fa-spin"></i> Carregando estatísticas...
        </div>
    `;
}

// Adiciona o evento de clique no canvas
canvas.addEventListener('click', (event) => {
    if (!lastApiData) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    // Verifica se o clique foi em algum botão de deletar
    for (const item of renderedItems) {
        const dx = mouseX - item.deleteButtonX;
        const dy = mouseY - item.deleteButtonY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= 15) { // Raio do botão de deletar
            if (confirm(`Deseja realmente deletar o container #${item.id}?`)) {
                deleteItem(item.id);
            }
            break;
        }
    }
});

document.getElementById('loadData').addEventListener('click', loadBalsaData);
document.getElementById('containerForm').addEventListener('submit', handleFormSubmit);
window.addEventListener('DOMContentLoaded', loadBalsaData);

canvas.removeEventListener('mousemove', null);
canvas.removeEventListener('mouseout', null);

async function calculateNextPosition(ferry, items) {
    if (!items || items.length === 0) {
        return { x: 0, y: 0, z: 0, hasSpace: true };
    }

    // Ordena os itens por posição X e Z
    const sortedItems = [...items].sort((a, b) => {
        if (a.position_z !== b.position_z) {
            return a.position_z - b.position_z;
        }
        return a.position_x - b.position_x;
    });

    // Encontra o último item
    const lastItem = sortedItems[sortedItems.length - 1];
    
    // Calcula a próxima posição
    let nextX = lastItem.position_x + lastItem.width;
    let nextZ = lastItem.position_z;

    // Se não couber na linha atual, move para a próxima linha
    if (nextX + lastItem.width > ferry.width) {
        nextX = 0;
        nextZ = lastItem.position_z + lastItem.length;
    }

    // Verifica se ainda há espaço na balsa
    const hasSpace = nextZ + lastItem.length <= ferry.length;

    return {
        x: nextX,
        y: 0, // Altura sempre começa em 0
        z: nextZ,
        hasSpace: hasSpace
    };
}

async function addItem() {
    const type = document.getElementById('type').value;
    const width = parseFloat(document.getElementById('width').value);
    const height = parseFloat(document.getElementById('height').value);
    const length = parseFloat(document.getElementById('length').value);
    const weight = parseFloat(document.getElementById('weight').value);

    if (!type || isNaN(width) || isNaN(height) || isNaN(length) || isNaN(weight)) {
        alert('Por favor, preencha todos os campos corretamente.');
        return;
    }

    try {
        showLoading();

        // Primeiro, obtém os dados atuais da balsa para calcular a posição
        const currentData = await fetch(`${API_BASE_URL}/api/ferry`).then(res => res.json());
        
        // Calcula a próxima posição disponível
        const position = await calculateNextPosition(currentData.ferry_info, currentData.placed_items);

        // Verifica se há espaço disponível
        if (!position.hasSpace) {
            alert('Não há mais espaço disponível na balsa para adicionar novos containers.');
            hideLoading();
            return;
        }

        // Adiciona o item com a posição sugerida
        const itemData = {
            type: type,
            width: width,
            height: height,
            length: length,
            weight: weight,
            position_x: position.x,
            position_y: position.y,
            position_z: position.z
        };

        const response = await fetch(`${API_BASE_URL}/api/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
        });

        if (!response.ok) {
            throw new Error(`Falha ao adicionar item: Status ${response.status}`);
        }

        // Após adicionar o item, chama a otimização
        await optimizeItems();

        // Limpa o formulário
        document.getElementById('addItemForm').reset();
        
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        alert(`Erro ao adicionar o container: ${error.message}`);
    } finally {
        hideLoading();
    }
}

async function optimizeItems() {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}/api/optimize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Falha na otimização: Status ${response.status}`);
        }

        const data = await response.json();
        
        // Atualiza a visualização com as novas posições
        renderBalsa(data);
        
    } catch (error) {
        console.error('Erro na otimização:', error);
        alert(`Erro ao otimizar a disposição dos containers: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// Atualiza o evento de submit do formulário
document.getElementById('addItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await addItem();
});
