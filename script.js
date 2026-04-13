/** =========================
 *  CONSTANTES Y ESTADO GLOBAL
    ========================= */
const START_ADDR = 0x1010; // Dirección de memoria base.
const NUM_CELLS = 16;      // Cantidad de bloques de RAM visibles.
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
            address: START_ADDR + (i * 4),
            value: Math.floor(Math.random() * 255), // Basura inicial simulada.
            type: 'normal',   // Tipos: Normal, pointer, target, vector, string.
            dataType: 'int',  // Tipos de dato: int, char.
            targetIndex: -1   // Usado por los punteros para saber a dónde apuntar.
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

function obtenerCeldaLibre(ignorarIndices = []) {
    let intentos = 0;
    let idx;
    do {
        idx = Math.floor(Math.random() * NUM_CELLS);
        intentos++;
        if(intentos > 50) return Math.floor(Math.random() * NUM_CELLS);
    } while (memory[idx].type !== 'normal' || ignorarIndices.includes(idx));
    return idx;
}

function crearPuntero() {
    limpiarEstilos();
    let targetIdx = obtenerCeldaLibre();
    let pointerIdx = obtenerCeldaLibre([targetIdx]);

    memory[pointerIdx].value = memory[targetIdx].address;
    memory[pointerIdx].type = 'pointer';
    memory[pointerIdx].targetIndex = targetIdx;
    memory[targetIdx].type = 'target';
    
    renderGrid();
    log(`Puntero en ${formatHex(memory[pointerIdx].address)} apunta a ${formatHex(memory[targetIdx].address)}`);
}

function crearVector() {
    limpiarEstilos();
    let startIdx = Math.floor(Math.random() * (NUM_CELLS - 3));
    ultimoAgregadoIdx = startIdx; 
    
    for (let i = 0; i < 4; i++) {
        memory[startIdx + i].type = 'vector';
        memory[startIdx + i].dataType = 'int';
        memory[startIdx + i].value = 0; 
    }
    
    renderGrid();
    log(`Vector int[4] creado desde ${formatHex(memory[startIdx].address)}`);
}

function crearString() {
    limpiarEstilos();
    let startIdx = Math.floor(Math.random() * (NUM_CELLS - 3));
    ultimoAgregadoIdx = startIdx; 
    
    const palabra = ['H', 'O', 'L', '\\0'];
    
    for (let i = 0; i < 4; i++) {
        memory[startIdx + i].type = 'string';
        memory[startIdx + i].dataType = 'char';
        memory[startIdx + i].value = palabra[i];
    }
    
    renderGrid();
    log(`String char[4] creado. Observa el \\0 en ${formatHex(memory[startIdx + 3].address)}`);
}

function crearPunteroAVector() {
    if (ultimoAgregadoIdx === -1) {
        log("Error: Primero debes crear un Vector o un String.");
        return;
    }

    // Calcula la longitud de la estructura para no pisarla con el puntero.
    let currentLen = 0;
    let structType = memory[ultimoAgregadoIdx].type;
    for (let i = ultimoAgregadoIdx; i < NUM_CELLS; i++) {
        if (memory[i].type === structType) currentLen++;
        else break;
    }

    let indicesOcupados = [];
    for(let i=0; i<currentLen; i++) indicesOcupados.push(ultimoAgregadoIdx + i);
    
    let pointerIdx = obtenerCeldaLibre(indicesOcupados);

    memory[pointerIdx].value = memory[ultimoAgregadoIdx].address; 
    memory[pointerIdx].type = 'pointer';
    memory[pointerIdx].targetIndex = ultimoAgregadoIdx;
    
    renderGrid();
    log(`Puntero base creado en ${formatHex(memory[pointerIdx].address)}. ¡Pasa el mouse por encima!`);
}

function redimensionarEstructura() {
    if (ultimoAgregadoIdx === -1) {
        log("Error: Primero debes crear un Vector o un String.");
        return;
    }

    let firstCell = memory[ultimoAgregadoIdx];
    let isString = firstCell.type === 'string';
    let isVector = firstCell.type === 'vector';

    if (!isString && !isVector) return;

    let currentLen = 0;
    for (let i = ultimoAgregadoIdx; i < NUM_CELLS; i++) {
        if (memory[i].type === firstCell.type) currentLen++;
        else break;
    }

    let newSizeStr = prompt(`El tamaño actual es ${currentLen}.\nIngresa el nuevo tamaño deseado:`, currentLen);
    if (newSizeStr === null) return;
    
    let newSize = parseInt(newSizeStr);
    if (isNaN(newSize) || newSize <= 0) {
        log("Error: Debes ingresar un número mayor a 0.");
        return;
    }

    if (ultimoAgregadoIdx + newSize > NUM_CELLS) {
        log("Error de Memoria: Segmentation Fault. Te saliste de los límites de la RAM.");
        return;
    }

    // Reducción de memoria (free parcial).
    if (newSize < currentLen) {
        for (let i = ultimoAgregadoIdx + newSize; i < ultimoAgregadoIdx + currentLen; i++) {
            memory[i].type = 'normal';
            memory[i].dataType = 'int';
            memory[i].value = Math.floor(Math.random() * 255); // Basura
        }
        if (isString) memory[ultimoAgregadoIdx + newSize - 1].value = '\\0';
        log(`Memoria liberada. Estructura reducida a ${newSize} bloques.`);
    } 

    // Ampliación de memoria (realloc).
    else if (newSize > currentLen) {
        let canGrow = true;
        for(let i = ultimoAgregadoIdx + currentLen; i < ultimoAgregadoIdx + newSize; i++) {
            if (memory[i].type !== 'normal') {
                canGrow = false;
                break;
            }
        }

        if (!canGrow) {
            log("Error de Memoria: No hay bloques contiguos libres (Colisión de datos).");
            return;
        }

        if (isString) memory[ultimoAgregadoIdx + currentLen - 1].value = '?'; 

        for (let i = ultimoAgregadoIdx + currentLen; i < ultimoAgregadoIdx + newSize; i++) {
            memory[i].type = firstCell.type;
            memory[i].dataType = firstCell.dataType;
            memory[i].value = isString ? '?' : 0; 
        }

        if (isString) memory[ultimoAgregadoIdx + newSize - 1].value = '\\0';
        log(`Estructura ampliada con éxito a ${newSize} bloques contiguos.`);
    } else {
        log("El tamaño ingresado es igual al actual.");
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
