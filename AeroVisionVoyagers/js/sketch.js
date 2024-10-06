// Canvas and context setup
const canvas = document.getElementById('planetCanvas');
const ctx = canvas.getContext('2d');
let painting = false;
let currentTool = 'freehand'; // Default tool is freehand
let fillMode = false; // Flag to indicate fill mode
let startX, startY;
let shapes = []; // To keep track of drawn shapes for filling

// Get the slider and color picker elements
const lineWidthSlider = document.getElementById('lineWidth');
const colorPicker = document.getElementById('colorPicker');

// Set initial canvas background to white
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Function to get mouse position relative to the canvas
function getMousePosition(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
}

// Function to start drawing
function startPosition(e) {
    const mousePos = getMousePosition(canvas, e);
    startX = mousePos.x;
    startY = mousePos.y;
    painting = true;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
}

// Function to finish drawing
function endPosition(e) {
    if (currentTool === 'circle') {
        drawCircle(e);
    } else if (currentTool === 'rectangle') {
        alert('Hello');
    }
    painting = false;
    ctx.beginPath();
}

// Freehand drawing
function draw(e) {
    if (!painting || currentTool !== 'freehand' && currentTool !== 'eraser') return;

    const { x, y } = getMousePosition(canvas, e);
    ctx.lineWidth = lineWidthSlider.value;
    ctx.lineCap = 'round';

    ctx.strokeStyle = currentTool === 'eraser' ? 'white' : colorPicker.value;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// Circle drawing
function drawCircle(e) {
    const { x: currentX, y: currentY } = getMousePosition(canvas, e);
    const radiusX = Math.abs(currentX - startX);
    const radiusY = Math.abs(currentY - startY);
    const centerX = startX;
    const centerY = startY;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.lineWidth = lineWidthSlider.value;
    ctx.strokeStyle = colorPicker.value;
    ctx.stroke();
    ctx.closePath();

    // Save the circle's parameters for filling
    shapes.push({ type: 'circle', centerX, centerY, radiusX, radiusY, strokeColor: colorPicker.value });
}

// Filling function
function fillColor(x, y) {
    const targetColor = ctx.getImageData(x, y, 1, 1).data;
    const fillColor = hexToRgb(colorPicker.value);

    if (colorsMatch(targetColor, fillColor)) return;

    const queue = [[x, y]];
    while (queue.length) {
        const [px, py] = queue.pop();
        const currentColor = ctx.getImageData(px, py, 1, 1).data;

        if (colorsMatch(currentColor, targetColor)) {
            ctx.fillStyle = colorPicker.value;
            ctx.fillRect(px, py, 1, 1);

            queue.push([px + 1, py]);
            queue.push([px - 1, py]);
            queue.push([px, py + 1]);
            queue.push([px, py - 1]);
        }
    }
}

// Color matching function
function colorsMatch(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

// Convert hex color to RGB
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

// Event listeners
canvas.addEventListener('mousedown', startPosition);
canvas.addEventListener('mouseup', endPosition);
canvas.addEventListener('mousemove', draw);

// Tool buttons
document.getElementById('freehandTool').addEventListener('click', () => {
    currentTool = 'freehand';
    fillMode = false; // Disable fill mode
});

document.getElementById('circleTool').addEventListener('click', () => {
    currentTool = 'circle';
    fillMode = false; // Disable fill mode
});

document.getElementById('eraserTool').addEventListener('click', () => {
    currentTool = 'eraser';
    fillMode = false; // Disable fill mode
});

document.getElementById('clearCanvas').addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

// Save sketch functionality
document.getElementById('saveSketch').addEventListener('click', () => {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'exoplanet-sketch.png';
    link.click();
});

// Fill color functionality
document.getElementById('redColor').addEventListener('click', () => {
    colorPicker.value = '#ff0000';
    fillMode = true; // Enable fill mode
});
document.getElementById('greenColor').addEventListener('click', () => {
    colorPicker.value = '#00ff00';
    fillMode = true; // Enable fill mode
});
document.getElementById('blueColor').addEventListener('click', () => {
    colorPicker.value = '#0000ff';
    fillMode = true; // Enable fill mode
});

// Canvas click to fill color
canvas.addEventListener('click', (e) => {
    if (fillMode) { // Only fill if fill mode is active
        const mousePos = getMousePosition(canvas, e);
        fillColor(mousePos.x, mousePos.y);
    }
});



