const canvas = document.getElementById("myCanvas");
const context = canvas.getContext('2d', { alpha: false });
const state = {
    selectedColor: 'black',
    selectedWidth: 5,
    isErasing: false,
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    isTouchDevice: 'ontouchstart' in window,
    currentTool: 'pen',
    startX: 0,
    startY: 0,
    history: [],
    historyIndex: -1,
    tempCanvas: document.createElement('canvas')
};

if (!context) {
    console.error('Canvas context not supported');
}

// Initialize temp canvas
state.tempCanvas.width = canvas.width;
state.tempCanvas.height = canvas.height;

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function resizeCanvas() {
    const tempCanvas = document.createElement('canvas');
    const tempContext = tempCanvas.getContext('2d');
    
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempContext.drawImage(canvas, 0, 0);

    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    state.tempCanvas.width = containerWidth;
    state.tempCanvas.height = containerHeight;

    context.drawImage(tempCanvas, 0, 0);
}

const debouncedResize = debounce(resizeCanvas, 250);
window.addEventListener('resize', debouncedResize);

resizeCanvas();

function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    return {
        x: x * scaleX,
        y: y * scaleY
    };
}

function saveToHistory() {
    // Remove any future states if we're not at the end
    if (state.historyIndex < state.history.length - 1) {
        state.history = state.history.slice(0, state.historyIndex + 1);
    }
    
    // Add current state to history
    state.history.push(canvas.toDataURL());
    state.historyIndex++;
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        const img = new Image();
        img.src = state.history[state.historyIndex];
        img.onload = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0);
        };
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        const img = new Image();
        img.src = state.history[state.history[state.historyIndex]];
        img.onload = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0);
        };
    }
}

function drawShape(e) {
    const coords = getCoordinates(e);
    const width = coords.x - state.startX;
    const height = coords.y - state.startY;
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(state.tempCanvas, 0, 0);
    
    context.beginPath();
    context.strokeStyle = state.isErasing ? "#ffffff" : state.selectedColor;
    context.lineWidth = state.selectedWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
    switch(state.currentTool) {
        case 'circle':
            const radius = Math.sqrt(width * width + height * height);
            context.arc(state.startX, state.startY, radius, 0, Math.PI * 2);
            break;
        case 'rectangle':
            context.rect(state.startX, state.startY, width, height);
            break;
        case 'line':
            context.moveTo(state.startX, state.startY);
            context.lineTo(coords.x, coords.y);
            break;
    }
    
    context.stroke();
}

function draw(e) {
    if (!state.isDrawing) return;
    
    if (['circle', 'rectangle', 'line'].includes(state.currentTool)) {
        drawShape(e);
    } else {
        const coords = getCoordinates(e);
        
        context.beginPath();
        context.moveTo(state.lastX, state.lastY);
        context.lineTo(coords.x, coords.y);
        context.strokeStyle = state.isErasing ? "#000000" : state.selectedColor;
        context.lineWidth = state.selectedWidth;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.stroke();

        state.lastX = coords.x;
        state.lastY = coords.y;
    }
}

function startDrawing(e) {
    state.isDrawing = true;
    const coords = getCoordinates(e);
    state.startX = coords.x;
    state.startY = coords.y;
    state.lastX = coords.x;
    state.lastY = coords.y;
    
    if (['circle', 'rectangle', 'line'].includes(state.currentTool)) {
        state.tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
    }
}

function stopDrawing() {
    if (state.isDrawing) {
        state.isDrawing = false;
        if (['circle', 'rectangle', 'line'].includes(state.currentTool)) {
            saveToHistory();
        }
    }
}

// Mouse event listeners
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", (e) => {
    if (!state.isDrawing) return;
    e.preventDefault();
    draw(e);
});
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);

// Touch event listeners
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startDrawing(e);
}, { passive: false });
canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!state.isDrawing) return;
    draw(e);
}, { passive: false });
canvas.addEventListener("touchend", stopDrawing);
canvas.addEventListener("touchcancel", stopDrawing);

// Color picker
const colorInputs = document.querySelectorAll(".color-btn");
colorInputs.forEach(input => {
    input.addEventListener("input", function() {
        state.selectedColor = this.value;
        state.isErasing = false;
        document.querySelector(".eraser").classList.remove("active");
    });
});

// Pen width
const penWidthInput = document.getElementById("penWidth");
penWidthInput.addEventListener("input", function () {
    state.selectedWidth = parseInt(this.value);
});

// Tool selection
const toolButtons = document.querySelectorAll('.tool-btn');
toolButtons.forEach(button => {
    button.addEventListener('click', function() {
        if (this.classList.contains('clear')) return;
        
        toolButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        const tool = this.classList[1];
        if (tool === 'eraser') {
            state.isErasing = true;
        } else {
            state.isErasing = false;
            state.currentTool = tool;
        }
    });
});

// Clear canvas
document.querySelector(".clear").addEventListener("click", function() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
});

// Undo/Redo
document.querySelector(".undo-btn").addEventListener("click", undo);
document.querySelector(".redo-btn").addEventListener("click", redo);

// Save drawing
document.querySelector(".save-btn").addEventListener("click", function() {
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL();
    link.click();
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'z':
                if (!e.shiftKey) undo();
                break;
            case 'y':
                redo();
                break;
            case 's':
                e.preventDefault();
                document.querySelector(".save-btn").click();
                break;
        }
    }
});
