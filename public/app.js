document.characterSet = 'UTF-8';

const canvas = document.getElementById('balsaCanvas');
const ctx = canvas.getContext('2d');

const SCALE = 20;


let lastApiData = null; 
let renderedItems = []; 

const API_BASE_URL = 'http://172.20.0.2:8080';

async function loadBalsaData() {
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

    canvas.width = ferry.width * SCALE;
    canvas.height = ferry.length * SCALE;
    
    renderedItems = []; 
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(canvas.width, canvas.height);
    updateStatsPanel(data);

    if (!data.placed_items || data.placed_items.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = 'bold 16px Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Balsa vazia - Nenhum item carregado', canvas.width / 2, canvas.height / 2);
        return;
    }

    data.placed_items.forEach(item => {
        const widthOnCanvas = item.width * SCALE;
        const lengthOnCanvas = item.length * SCALE;
        const x = item.position_x * SCALE;
        const y = item.position_z * SCALE;

        // Salva as informações do item para detecção de clique
        renderedItems.push({ id: item.id, x, y, width: widthOnCanvas, length: lengthOnCanvas });
        
        // Desenha o item
        drawItem(x, y, widthOnCanvas, lengthOnCanvas, item);
    });
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
        <h3>Informações da Carga</h3>
        <p>Peso Total: ${data.total_weight || 0}t</p>
        <p>Volume Ocupado: ${(data.total_volume_occupied || 0).toFixed(2)}m³</p>
        <p>Itens Carregados: ${items.length}</p>
        <h3>Informações da Balsa</h3>
        <p>Largura: ${ferry.width}m</p>
        <p>Altura: ${ferry.height}m</p>
        <p>Comprimento: ${ferry.length}m</p>
        <p>Peso Máximo: ${ferry.max_weight}t</p>
        <p>Espaço Utilizável: ${(ferry.usable_space_percentage * 100).toFixed(1)}%</p>
    `;
}


/**
 * Desenha uma grade de fundo no canvas.
 * @param {number} width - Largura do canvas.
 * @param {number} height - Altura do canvas.
 */
function drawGrid(width, height) {
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.5;

    for (let x = 0; x < width; x += SCALE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    for (let y = 0; y < height; y += SCALE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
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
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    const baseColor = item.color || '#3498db';
    const gradient = ctx.createLinearGradient(x, y, x, y + length);
    gradient.addColorStop(0, lightenColor(baseColor, 10));
    gradient.addColorStop(1, darkenColor(baseColor, 20));

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, length);

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = darkenColor(baseColor, 30);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, length);

    const minFontSize = 8;
    const maxFontSize = 14;
    const calculatedFontSize = Math.max(minFontSize, Math.min(maxFontSize, Math.floor(Math.min(width, length) / 4)));

    ctx.fillStyle = getContrastColor(baseColor);
    ctx.font = `bold ${calculatedFontSize}px Roboto`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Desenha as informações do item
    const texts = [`#${item.id}`, `${item.weight.toFixed(1)}t`];
    const centerX = x + width / 2;
    const centerY = y + length / 2;
    const lineHeight = calculatedFontSize * 1.2;
    const startY = centerY - (lineHeight * (texts.length - 1)) / 2;

    texts.forEach((text, index) => {
        ctx.fillText(text, centerX, startY + (index * lineHeight));
    });

    // Desenha o botão de deletar na parte inferior
    drawTrashIcon(centerX, y + length - 15);
}

/**
 * Desenha um ícone de lixeira no centro do item.
 * @param {number} centerX - Coordenada X do centro do item.
 * @param {number} centerY - Coordenada Y do centro do item.
 */
function drawTrashIcon(centerX, centerY) {
    const iconSize = 20;
    const x = centerX - iconSize / 2;
    const y = centerY - iconSize / 2;

    // Fundo branco semitransparente para o ícone
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, iconSize / 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#D32F2F'; 
    ctx.lineWidth = 2;
    ctx.font = `bold ${iconSize}px sans-serif`;
    ctx.fillStyle = '#D32F2F';
    ctx.fillText('🗑️', centerX, centerY + 2); // Emoji de lixeira
}

/**
 * Deleta um item via API e atualiza a visualização.
 * @param {number} itemId - O ID do item a ser deletado.
 */
async function deleteItem(itemId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Falha ao deletar item: Status ${response.status}`);
        }

        alert(`Item #${itemId} deletado com sucesso.`);
        // Reseta o hover e recarrega os dados para atualizar a balsa.
        await loadBalsaData();

    } catch (error) {
        console.error('Erro ao deletar item:', error);
        alert(`Não foi possível deletar o item.\n(${error.message})`);
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

// --- EVENT LISTENERS PARA INTERATIVIDADE ---

// Movimento do mouse sobre o canvas
canvas.addEventListener('mousemove', (event) => {
    if (!lastApiData) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    let currentlyHovered = null;
    for (const item of renderedItems) {
        if (mouseX >= item.x && mouseX <= item.x + item.width && 
            mouseY >= item.y && mouseY <= item.y + item.length) {
            currentlyHovered = item.id;
            break;
        }
    }
    
    // Redesenha apenas se o item sob o cursor mudou.
    if (currentlyHovered !== hoveredItemId) {
        hoveredItemId = currentlyHovered;
        renderBalsa(lastApiData);
    }
});

// Clique no canvas
canvas.addEventListener('click', (event) => {
    if (!lastApiData) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;

    for (const item of renderedItems) {
        // Área do botão de deletar (últimos 30 pixels do item)
        const deleteButtonY = item.y + item.length - 30;
        
        if (mouseX >= item.x && 
            mouseX <= item.x + item.width && 
            mouseY >= deleteButtonY && 
            mouseY <= item.y + item.length) {
            deleteItem(item.id);
            break;
        }
    }
});

document.getElementById('loadData').addEventListener('click', loadBalsaData);
document.getElementById('containerForm').addEventListener('submit', handleFormSubmit);
window.addEventListener('DOMContentLoaded', loadBalsaData);

canvas.removeEventListener('mousemove', null);
canvas.removeEventListener('mouseout', null);
