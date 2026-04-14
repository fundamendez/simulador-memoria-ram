/** =========================
 *  CONSTANTES Y ESTADO GLOBAL
    ========================= */
const START_ADDR = 0x1010; // Dirección de memoria base.
const NUM_CELLS = 64;      // Cantidad de bloques de RAM visibles.
let memory = [];           // Array que representa nuestra memoria.
let isHexMode = true;      // Estado del switch de visualización.
let ultimoAgregadoIdx = -1; // Guarda el índice del último vector/string creado.

/** ==============
 *  INICIALIZACIÓN
   =============== */
function initMemory() {
    memory = [];
    ultimoAgregadoIdx = -1;
    for (let i = 0; i < NUM_CELLS; i++) {
        memory.push({
            address: START_ADDR + i, // Incrementa de 1 en 1 (1 Celda = 1 Byte).
            value: Math.floor(Math.random() * 255), 
            type: 'normal',   
            dataType: 'int',  
            targetIndex: -1   
        });
    }
    renderGrid();
}

/** ====================
 *  FUNCIONES AUXILIARES
    ==================== */
// Formatea un número decimal a formato Hexadecimal (Ej: 255 -> 0xFF).
function formatHex(num) {
    if(isNaN(num)) return num; 
    return '0x' + parseInt(num).toString(16).toUpperCase();
}

// Imprime mensajes en la "consola" del simulador.
function log(msg) {
    document.getElementById('logPanel').innerText = "> " + msg;
}

/** ========================
 *  RENDERIZADO DE LA GRILLA
    ======================== */
function renderGrid() {
    const grid = document.getElementById('ramGrid');
    grid.innerHTML = '';
    
    memory.forEach((cell, index) => {
        const div = document.createElement('div');
        div.className = `cell ${cell.type}`;
        
        let displayValue = cell.value;
        
        // Lógica de visualización según el tipo de dato.
        if (cell.type === 'pointer') {
            displayValue = formatHex(cell.value); 
        } else if (cell.dataType === 'char') {
            if (cell.value === '\\0') {
                displayValue = `<span class="string-null">\\0</span>`;
            } else {
                displayValue = `'${cell.value}'`;
            }
        } else {
            displayValue = isHexMode ? formatHex(cell.value) : cell.value;
        }

        // Construcción del HTML interno de la celda.
        div.innerHTML = `
            <div class="address">${formatHex(cell.address)}</div>
            <div class="value">${displayValue}</div>
        `;

        // Asignación de eventos.
        div.onclick = () => editarCelda(index);
        
        // Efecto hover para las flechas de los punteros.
        if (cell.type === 'pointer' && cell.targetIndex !== -1) {
            div.onmouseenter = () => mostrarFlecha(index, cell.targetIndex);
            div.onmouseleave = ocultarFlecha;
        }

        grid.appendChild(div);
    });
}

/** =======================
 *  INTERACCIÓN DEL USUARIO
    ======================= */
function editarCelda(index) {
    let cell = memory[index];
    let promptMsg = `Nuevo valor para la dirección ${formatHex(cell.address)}:\n(Puedes ingresar un número o un caracter)`;
    let newVal = prompt(promptMsg, cell.value);
    
    if (newVal !== null && newVal.trim() !== '') {
        // Resetea el estilo solo si era un puntero suelto o un target.
        if (cell.type === 'pointer' || cell.type === 'target') {
            cell.type = 'normal';
            cell.targetIndex = -1;
        }
        
        // Inferencia básica de tipo: si es número lo guarda como int, sino como char.
        if (!isNaN(newVal)) {
            cell.value = parseInt(newVal);
            cell.dataType = 'int';
        } else {
            cell.value = newVal;
            cell.dataType = 'char';
        }
        renderGrid();
        log(`Celda ${formatHex(cell.address)} modificada manualmente.`);
    }
}

/** =================================
 *  LóGICA DE DIBUJOS Y FLECHAS (SVG)
    ================================= */
function mostrarFlecha(fromIdx, toIdx) {
    const gridCells = document.querySelectorAll('#ramGrid .cell');
    const fromRect = gridCells[fromIdx].getBoundingClientRect();
    const toRect = gridCells[toIdx].getBoundingClientRect();

    // Calcula los centros exactos de los bloques para trazar la línea.
    const startX = fromRect.left + (fromRect.width / 2) + window.scrollX;
    const startY = fromRect.top + (fromRect.height / 2) + window.scrollY;
    const endX = toRect.left + (toRect.width / 2) + window.scrollX;
    const endY = toRect.top + (toRect.height / 2) + window.scrollY;

    const arrow = document.getElementById('pointerArrow');
    arrow.setAttribute('x1', startX);
    arrow.setAttribute('y1', startY);
    arrow.setAttribute('x2', endX);
    arrow.setAttribute('y2', endY);
    arrow.setAttribute('opacity', '1');
}

function ocultarFlecha() {
    document.getElementById('pointerArrow').setAttribute('opacity', '0');
}

/** ======================================
 *  CONTROLADORES DE MEMORIA Y ESTRUCTURAS
    ====================================== */
function limpiarMemoria() {
    initMemory();
    log("Memoria limpiada y reiniciada.");
    ocultarFlecha();
}

function limpiarEstilos() {
    memory.forEach(cell => {
        cell.type = 'normal';
        cell.dataType = 'int';
        cell.targetIndex = -1;
    });
    ultimoAgregadoIdx = -1;
}

function obtenerCeldasLibresContiguas(size, ignorarIndices = []) {
    let intentos = 0;
    while (intentos < 200) {
        let startIdx = Math.floor(Math.random() * (NUM_CELLS - size + 1));
        let libre = true;
        
        for (let i = 0; i < size; i++) {
            if (memory[startIdx + i].type !== 'normal' || ignorarIndices.includes(startIdx + i)) {
                libre = false;
                break;
            }
        }
        if (libre) return startIdx;
        intentos++;
    }
    return -1; // No encontró espacio.
}

function crearPuntero() {
    limpiarEstilos();
    let targetIdx = obtenerCeldasLibresContiguas(4); // Target (int) ocupa 4 celdas.
    if (targetIdx === -1) return log("Error: No hay memoria suficiente");

    let indicesOcupados = [targetIdx, targetIdx+1, targetIdx+2, targetIdx+3];
    let pointerIdx = obtenerCeldasLibresContiguas(4, indicesOcupados); // Puntero ocupa 4 celdas.
    if (pointerIdx === -1) return log("Error: No hay memoria suficiente");

    // Llenar datos del entero destino.
    for(let i=0; i<4; i++) {
        memory[targetIdx + i].type = 'target';
        memory[targetIdx + i].dataType = 'int';
        memory[targetIdx + i].value = (i === 0) ? Math.floor(Math.random() * 100) : 0; 
    }

    // Llenar datos del puntero.
    for(let i=0; i<4; i++) {
        memory[pointerIdx + i].type = 'pointer';
        memory[pointerIdx + i].dataType = 'int';
        memory[pointerIdx + i].targetIndex = (i === 0) ? targetIdx : -1;
        memory[pointerIdx + i].value = (i === 0) ? memory[targetIdx].address : 0;
    }
    
    renderGrid();
    log(`Puntero (4 bytes) en ${formatHex(memory[pointerIdx].address)} apunta a int en ${formatHex(memory[targetIdx].address)}`);
}

function crearVector() {
    limpiarEstilos();
    let bytesPerInt = 4;
    let totalBytes = bytesPerInt * 4; // Un int[4] ocupa 16 celdas.
    
    let startIdx = obtenerCeldasLibresContiguas(totalBytes);
    if (startIdx === -1) return log("Error: No hay bloques de 16 bytes libres.");
    
    ultimoAgregadoIdx = startIdx; 
    
    for (let i = 0; i < 4; i++) { // Por cada int.
        for(let j = 0; j < bytesPerInt; j++) { // Por cada byte del int.
            let idx = startIdx + (i * bytesPerInt) + j;
            memory[idx].type = 'vector';
            memory[idx].dataType = 'int';
            memory[idx].value = (j === 0) ? 0 : 0; 
        }
    }
    
    renderGrid();
    log(`Vector int[4] (${totalBytes} bytes) creado desde ${formatHex(memory[startIdx].address)}`);
}

function crearString() {
    limpiarEstilos();
    let startIdx = obtenerCeldasLibresContiguas(5); // char[4] ocupa 4 celdas (1 byte c/u).
    if (startIdx === -1) return log("Error: No hay memoria suficiente");
    
    ultimoAgregadoIdx = startIdx; 
    const palabra = ['H', 'O', 'L', 'A', '\\0'];
    
    for (let i = 0; i < 5; i++) {
        memory[startIdx + i].type = 'string';
        memory[startIdx + i].dataType = 'char';
        memory[startIdx + i].value = palabra[i];
    }
    
    renderGrid();
    log(`String char[5] (5 bytes) creado. Observa el \\0 en ${formatHex(memory[startIdx + 5].address)}`);
}

function crearPunteroAVector() {
    if (ultimoAgregadoIdx === -1) return log("Error: Primero debes crear un Vector o un String.");

    let structType = memory[ultimoAgregadoIdx].type;
    let currentBytes = 0;
    for (let i = ultimoAgregadoIdx; i < NUM_CELLS; i++) {
        if (memory[i].type === structType) currentBytes++;
        else break;
    }

    let indicesOcupados = [];
    for(let i=0; i<currentBytes; i++) indicesOcupados.push(ultimoAgregadoIdx + i);
    
    let pointerIdx = obtenerCeldasLibresContiguas(4, indicesOcupados); // Puntero de 4 bytes.
    if(pointerIdx === -1) return log("Error: No hay memoria suficiente");

    for(let i=0; i<4; i++) {
        memory[pointerIdx + i].type = 'pointer';
        memory[pointerIdx + i].targetIndex = (i === 0) ? ultimoAgregadoIdx : -1;
        memory[pointerIdx + i].value = (i === 0) ? memory[ultimoAgregadoIdx].address : 0;
    }
    
    renderGrid();
    log(`Puntero base (4 bytes) creado en ${formatHex(memory[pointerIdx].address)}.`);
}

function redimensionarEstructura() {
    if (ultimoAgregadoIdx === -1) return log("Error: Primero debes crear un Vector o un String.");

    let firstCell = memory[ultimoAgregadoIdx];
    let isString = firstCell.type === 'string';
    let isVector = firstCell.type === 'vector';
    if (!isString && !isVector) return;

    let bytesPerElement = isVector ? 4 : 1; // Ajuste crucial para realloc.
    let currentBytes = 0;
    
    for (let i = ultimoAgregadoIdx; i < NUM_CELLS; i++) {
        if (memory[i].type === firstCell.type) currentBytes++;
        else break;
    }

    let currentLen = currentBytes / bytesPerElement;

    let newSizeStr = prompt(`Tienes ${currentLen} elementos.\nIngresa la nueva cantidad deseada:`, currentLen);
    if (newSizeStr === null) return;
    
    let newSize = parseInt(newSizeStr);
    if (isNaN(newSize) || newSize <= 0) return log("Error: Debes ingresar un número válido.");

    let newBytes = newSize * bytesPerElement;

    if (ultimoAgregadoIdx + newBytes > NUM_CELLS) {
        log("💥 Error: Segmentation Fault. Te pasaste de la RAM.");
        return;
    }

    if (newSize < currentLen) {
        for (let i = ultimoAgregadoIdx + newBytes; i < ultimoAgregadoIdx + currentBytes; i++) {
            memory[i].type = 'normal';
            memory[i].dataType = 'int';
            memory[i].value = Math.floor(Math.random() * 255);
        }
        if (isString) memory[ultimoAgregadoIdx + newBytes - 1].value = '\\0';
        log(`Memoria reducida a ${newSize} elementos (${newBytes} bytes).`);
    } 
    else if (newSize > currentLen) {
        let canGrow = true;
        for(let i = ultimoAgregadoIdx + currentBytes; i < ultimoAgregadoIdx + newBytes; i++) {
            if (memory[i].type !== 'normal') {
                canGrow = false; break;
            }
        }

        if (!canGrow) return log("💥 Error: No hay bloques de bytes contiguos libres (Colisión).");

        if (isString) memory[ultimoAgregadoIdx + currentBytes - 1].value = '?'; 

        for (let i = ultimoAgregadoIdx + currentBytes; i < ultimoAgregadoIdx + newBytes; i++) {
            memory[i].type = firstCell.type;
            memory[i].dataType = firstCell.dataType;
            memory[i].value = isString ? '?' : 0; 
        }

        if (isString) memory[ultimoAgregadoIdx + newBytes - 1].value = '\\0';
        log(`Estructura ampliada a ${newSize} elementos (${newBytes} bytes).`);
    } else {
        log("El tamaño es el mismo.");
    }
    
    renderGrid();
}

/** ===============================
 *  LISTENERS Y EVENTOS DE ARRANQUE
    =============================== */
document.getElementById('hexToggle').addEventListener('change', (e) => {
    isHexMode = e.target.checked;
    renderGrid();
});

// Inicializa la simulación al cargar.
initMemory();
