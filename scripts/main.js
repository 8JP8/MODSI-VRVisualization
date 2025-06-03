const root = document.getElementById('charts-root');

// UI elements
const roomSelector = document.getElementById('roomSelector');
const roomInput = document.getElementById('roomInput');
const connectBtn = document.getElementById('connectBtn');
const roomStatus = document.getElementById('roomStatus');
const minimizeBtn = document.getElementById('minimizeBtn');
const currentRoomDisplayLoading = document.getElementById('currentRoomDisplayLoading');
const collapsedRoomInfo = document.getElementById('collapsedRoomInfo');
const loadingOverlay = document.getElementById('loadingOverlay');
const errorOverlay = document.getElementById('errorOverlay');
const errorMessage = document.getElementById('errorMessage');
const roomInfo = document.getElementById('roomInfo');

// AR UI Elements (referenced by ARHandler and main.js)
const arPlacementInstructions = document.getElementById('arPlacementInstructions');
const arScaleSlider = document.getElementById('arScaleSlider');
const arScaleSliderContainer = document.getElementById('arScaleSliderContainer');
// const arInstructions = document.getElementById('arInstructions'); // Old, removed from HTML
// const closeArInstructions = document.getElementById('closeArInstructions'); // Old, removed from HTML

// AR Elements (A-Frame scene elements)
const sceneEl = document.querySelector('a-scene');
// const skyEl = document.getElementById('sky'); // ARHandler will manage visibility
// const environmentEl = document.getElementById('environment'); // ARHandler will manage visibility
// const vrCameraEl = document.getElementById('vrCamera'); // ARHandler will manage visibility
// const arCameraEl = document.getElementById('arCamera'); // Not used with WebXR default camera
// const arMarkerEl = document.getElementById('arMarker'); // Not used with WebXR hit-test

// API Configuration
const API_BASE_URL = 'https://modsi-api-ffhhfgecfdehhscv.spaincentral-01.azurewebsites.net/api/Room/Get/';
const API_CODE = 'z4tKbNFdaaXzHZ4ayn9pRQokNWYgRkbVkCjOxTxP-8ChAzFuMigGCw==';

let currentRoom = 'LD5RU';
let isCollapsed = false;
// let isARMode = false; // This will be managed by arHandler.isArActive
// let arInstructionsShown = false; // Old logic, arPlacementInstructions handled by ARHandler

let arHandler = null; // Instance of ARHandler

// AR Mode Management is now primarily handled by ARHandler.js
// The functions enterARMode, exitARMode, showARInstructions, hideARInstructions, adjustChartsForAR
// are being replaced or made redundant by ARHandler's functionality.

// This function is kept as it calls renderAllCharts, useful for resetting view.
function adjustChartsForVR() {
    // Restore original VR/Desktop positions and scales by re-rendering
    renderAllCharts();
}

// Enhanced A-Frame event listeners for AR, now integrated with ARHandler
if (sceneEl) {
    sceneEl.addEventListener('enter-ar', () => {
        console.log('A-Frame enter-ar event triggered');
        if (arHandler) {
            arHandler.onEnterAR();
        }
        hideRoomSelector();
    });

    sceneEl.addEventListener('exit-ar', () => {
        console.log('A-Frame exit-ar event triggered');
        if (arHandler) {
            arHandler.onExitAR();
        }
        showRoomSelector();
        adjustChartsForVR(); // Re-render charts for VR/desktop layout
    });

    // AR.js specific events are removed as we're focusing on WebXR hit-test
    // sceneEl.addEventListener('arjs-video-loaded', ...);
    // sceneEl.addEventListener('arjs-nft-loaded', ...);
    // sceneEl.addEventListener('markerFound', ...);
    // sceneEl.addEventListener('markerLost', ...);
}

// Enhanced fullscreen and mode detection
function handleFullscreenChange() {
    const isFullscreen = document.fullscreenElement ||
                        document.webkitFullscreenElement ||
                        document.mozFullScreenElement ||
                        document.msFullscreenElement;

    const isVRModeActive = sceneEl && sceneEl.is('vr-mode');
    const isARActive = arHandler && arHandler.isArActive;

    // This function no longer needs to call enterARMode/exitARMode,
    // as ARHandler is tied to A-Frame's own enter-ar/exit-ar events.

    if (isFullscreen || isVRModeActive || isARActive) {
        hideRoomSelector();
    } else { // Not fullscreen, not VR, not AR
        showRoomSelector();
    }
}

// Room Management Functions
function updateRoomSelectorCollapsedState() {
    if (!roomSelector || !minimizeBtn || !collapsedRoomInfo) return;
    roomSelector.classList.toggle('collapsed', isCollapsed);
    minimizeBtn.textContent = isCollapsed ? '+' : '−';
    collapsedRoomInfo.textContent = 'Room: ' + (currentRoom || 'N/A');
}

function syncRoomUI(roomName) {
    const display = roomName || 'N/A';
    if (roomInput) roomInput.value = roomName ? roomName : '';
    if (currentRoomDisplayLoading) currentRoomDisplayLoading.textContent = display;
    if (collapsedRoomInfo) {
        collapsedRoomInfo.textContent = 'Room: ' + display;
    }
}

function getRoomFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    let room = urlParams.get('room');
    const codeParam = urlParams.get('code');

    if (codeParam) {
        console.log(`Parâmetro 'code' (${codeParam}) encontrado, usando como 'room'.`);
        room = codeParam.toUpperCase();
        urlParams.delete('code');
        urlParams.set('room', room);
        const newQueryString = urlParams.toString();
        const currentSearch = window.location.search.substring(1);
        if (currentSearch !== newQueryString) {
            window.history.replaceState({}, '', `${window.location.pathname}?${newQueryString}${window.location.hash}`);
            console.log('URL atualizada para usar parâmetro "room".');
        }
    } else if (room) {
        room = room.toUpperCase();
    }

    if (!room) {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        room = hashParams.get('room');
        if (room) {
            room = room.toUpperCase();
            console.log(`Parâmetro 'room' (${room}) encontrado no hash.`);
        }
    }

    return room || null;
}

function buildAPIURL(roomCode) {
    return `${API_BASE_URL}${roomCode}?code=${API_CODE}`;
}

function showRoomStatus(message, type) {
    if (!roomStatus) return;
    roomStatus.textContent = message;
    roomStatus.className = `room-status ${type}`;
    roomStatus.style.display = 'block';

    if (type !== 'loading') {
        setTimeout(() => {
            if (roomStatus) roomStatus.style.display = 'none';
        }, 3000);
    }
}

function toggleRoomSelector() {
    isCollapsed = !isCollapsed;
    updateRoomSelectorCollapsedState();
}

function hideRoomSelector() {
    if (roomSelector) roomSelector.classList.add('hidden');
}

function showRoomSelector() {
    // Show room selector only if not in AR mode (ARHandler controls its own UI)
    if (roomSelector && !(arHandler && arHandler.isArActive)) {
        roomSelector.classList.remove('hidden');
    }
}

function showLoading(show, roomNameForDisplay = null) {
    const displayRoom = roomNameForDisplay || currentRoom;
    if (currentRoomDisplayLoading) currentRoomDisplayLoading.textContent = displayRoom;
    if (show) {
        if(roomInfo) roomInfo.textContent = 'Por favor aguarde...';
        if(loadingOverlay) loadingOverlay.classList.remove('hidden');
    } else {
        if(loadingOverlay) loadingOverlay.classList.add('hidden');
    }
}

function showError(show, message = 'Erro ao carregar dados') {
    if (show) {
        if(errorMessage) errorMessage.textContent = message;
        if(errorOverlay) errorOverlay.classList.add('visible');
    } else {
        if(errorOverlay) errorOverlay.classList.remove('visible');
    }
}

function closeErrorAndEnterEnvironment() {
    showError(false);
    showLoading(false);
    clearCharts();
    showRoomSelector();
    syncRoomUI(currentRoom);
    console.log("Error overlay closed. Entering environment with room selector. Context room: " + currentRoom);
}

function retryConnection() {
    showError(false);
    initializeApp(true); // Re-fetch data for the currentRoom
}


// Event Listeners
if (minimizeBtn) {
    minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleRoomSelector();
    });
}

if (roomSelector) {
    roomSelector.addEventListener('click', (e) => {
        if (isCollapsed && e.target === roomSelector) {
            toggleRoomSelector();
        }
    });
}

if (connectBtn) {
    connectBtn.addEventListener('click', () => {
        const newRoom = roomInput.value.trim().toUpperCase();
        if (newRoom) {
            connectToRoom(newRoom);
        } else {
            showRoomStatus('Por favor, insira um código de sala.', 'error');
        }
    });
}

if (roomInput) {
    roomInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            connectBtn.click();
        }
    });
}


async function connectToRoom(newRoomCode) {
    if (!newRoomCode) {
         showRoomStatus('Código da sala não pode ser vazio.', 'error');
         return;
    }
    currentRoom = newRoomCode;
    syncRoomUI(currentRoom);

    isCollapsed = false; // Expand room selector when connecting to a new room
    updateRoomSelectorCollapsedState();

    const url = new URL(window.location);
    url.searchParams.set('room', currentRoom);
    url.searchParams.delete('code'); // Remove 'code' if it was used as an alias for 'room'
    window.history.pushState({}, '', url.toString());

    showRoomStatus(`Conectando à sala ${currentRoom}...`, 'loading');
    if (connectBtn) connectBtn.disabled = true;

    await initializeApp(true); // Reload data for the new room

    // Check error overlay status after initializeApp finishes
    if (errorOverlay && !errorOverlay.classList.contains('visible')) {
        showRoomStatus(`Conectado à sala ${currentRoom} com sucesso!`, 'success');
        isCollapsed = true; // Collapse after successful connection
        updateRoomSelectorCollapsedState();
    } else {
        showRoomStatus(`Falha ao carregar sala ${currentRoom}. Verifique o console para mais detalhes.`, 'error');
        // Do not collapse on error, user might want to try again or change room
    }

    if (connectBtn) connectBtn.disabled = false;
}

// Fullscreen and mode event listeners
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

if (sceneEl) {
    sceneEl.addEventListener('enter-vr', hideRoomSelector);
    sceneEl.addEventListener('exit-vr', () => {
        showRoomSelector();
        // Optionally, re-render charts if VR mode might affect layout differently
        // adjustChartsForVR(); // This calls renderAllCharts
    });
    sceneEl.addEventListener('loaded', () => {
        console.log('A-Frame scene loaded');
        // ARHandler is initialized on window.load, after scene might be loaded
    });
}

// Chart Configuration and Data Processing
const POSITION_CONFIG = { startX: -18, baseY: 1.5, baseZ: 12, spacingX: 12, pieOffsetY: 3 };
const TIME_TYPES = { 'years': { label: 'Anos', next: 'months' }, 'months': { label: 'Meses', next: 'days' }, 'days': { label: 'Dias', next: 'years' } };
const JSON_TIME_MAPPING = { 'Year': 'years', 'Month': 'months', 'Day': 'days', 'year': 'years', 'month': 'months', 'day': 'days', 'years': 'years', 'months': 'months', 'days': 'days' };
let chartsData = [];
let chartStates = {};

function processKPIData(kpihistory, targetKPIId, timeAxisType, valueType = 'NewValue_1') {
    const kpiData = kpihistory.filter(item => item.KPIId == targetKPIId);
    const dataByTimeKey = {};
    kpiData.forEach(item => {
        const date = new Date(item.ChangedAt);
        let timeKey;
        if (timeAxisType === 'years') timeKey = date.getFullYear().toString();
        else if (timeAxisType === 'months') timeKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        else if (timeAxisType === 'days') timeKey = date.toISOString().split('T')[0];
        else timeKey = date.getFullYear().toString(); // Default to years
        if (!dataByTimeKey[timeKey]) dataByTimeKey[timeKey] = [];
        dataByTimeKey[timeKey].push({ ...item, parsedDate: date });
    });
    const finalData = [];
    Object.keys(dataByTimeKey).sort().forEach(timeKey => {
        // Get the most recent entry for that timeKey
        const mostRecent = dataByTimeKey[timeKey].sort((a, b) => b.parsedDate - a.parsedDate)[0];
        const value = valueType === 'NewValue_2' ? mostRecent.NewValue_2 : mostRecent.NewValue_1;
        finalData.push({ key: timeKey, height: parseFloat(value) || 0 });
    });
    return finalData;
}

function processPieData(kpihistory, targetKPIId, timeAxisType, valueType = 'NewValue_1') {
    return processKPIData(kpihistory, targetKPIId, timeAxisType, valueType).map(item => ({ key: item.key, size: item.height }));
}

function hasValidData(kpihistory, targetKPIId, valueType) {
    return kpihistory.filter(item => item.KPIId == targetKPIId)
                     .some(item => (valueType === 'NewValue_2' ? item.NewValue_2 : item.NewValue_1) != null && parseFloat(valueType === 'NewValue_2' ? item.NewValue_2 : item.NewValue_1) !== 0);
}

function calculatePosition(chartIndex, isPieChart = false) {
    const x = POSITION_CONFIG.startX + (chartIndex * POSITION_CONFIG.spacingX);
    const y = POSITION_CONFIG.baseY + (isPieChart ? POSITION_CONFIG.pieOffsetY : 0);
    return `${x} ${y} ${POSITION_CONFIG.baseZ}`;
}

function toggleChartValue(chartIndex) {
    if (!chartStates[chartIndex]) return;
    chartStates[chartIndex].valueType = chartStates[chartIndex].valueType === 'NewValue_1' ? 'NewValue_2' : 'NewValue_1';
    renderSingleChart(chartIndex);
}

function toggleChartTimeType(chartIndex) {
    if (!chartStates[chartIndex] || !TIME_TYPES[chartStates[chartIndex].timeType]) return;
    chartStates[chartIndex].timeType = TIME_TYPES[chartStates[chartIndex].timeType].next;
    renderSingleChart(chartIndex);
}

function renderSingleChart(chartIndex) {
    const chartConfig = chartsData[chartIndex];
    const state = chartStates[chartIndex];
    if (!chartConfig || !state) return;

    const existingChart = root.querySelector(`[data-chart-index="${chartIndex}"]`);
    const existingButtons = root.querySelector(`[data-buttons-index="${chartIndex}"]`);

    if (existingChart) {
        // BabiaXR specific cleanup for pie charts if component is present
        if (chartConfig.chart.chartType === "pizza" && existingChart.components && existingChart.components['babia-pie']) {
            existingChart.removeAttribute('babia-pie'); // Trigger A-Frame's component removal
        }
        // Delay removal to allow A-Frame to process component detachment if needed
        setTimeout(() => {
            if (existingChart.parentNode) existingChart.parentNode.removeChild(existingChart);
            if (existingButtons && existingButtons.parentNode) existingButtons.parentNode.removeChild(existingButtons);

            // Recalculate visibleIndex based on current chartsData and their validity
            let visibleChartIndex = 0;
            for(let i=0; i < chartIndex; i++){
                if(chartsData[i] && (hasValidData(chartsData[i].kpihistory, parseInt(chartsData[i].chart.zAxis), 'NewValue_1') || hasValidData(chartsData[i].kpihistory, parseInt(chartsData[i].chart.zAxis), 'NewValue_2'))){
                    visibleChartIndex++;
                }
            }

            const chartEl = createChart(chartConfig, chartIndex, state.valueType, state.timeType, visibleChartIndex);
            root.appendChild(chartEl);
            const buttonsEl = createChartButtons(chartIndex, state, visibleChartIndex);
            root.appendChild(buttonsEl);
            
            // ARHandler will manage overall scale of `root` if in AR mode. No individual adjustments needed here.
        }, 50); // 50ms delay, adjust if needed
    } else {
         // If only buttons exist (should not happen if chart doesn't), remove them
         if (existingButtons && existingButtons.parentNode) existingButtons.parentNode.removeChild(existingButtons);

         let visibleChartIndex = 0;
         for(let i=0; i < chartIndex; i++){
             if(chartsData[i] && (hasValidData(chartsData[i].kpihistory, parseInt(chartsData[i].chart.zAxis), 'NewValue_1') || hasValidData(chartsData[i].kpihistory, parseInt(chartsData[i].chart.zAxis), 'NewValue_2'))){
                 visibleChartIndex++;
             }
         }
         const chartEl = createChart(chartConfig, chartIndex, state.valueType, state.timeType, visibleChartIndex);
         root.appendChild(chartEl);
         const buttonsEl = createChartButtons(chartIndex, state, visibleChartIndex);
         root.appendChild(buttonsEl);
         
         // ARHandler will manage overall scale of `root`.
    }
}


function createChartButtons(originalIndex, state, visibleIndex) {
    const chartConfig = chartsData[originalIndex];
    if (!chartConfig || !state) return document.createElement('a-entity'); // Return empty entity if no config

    const position = calculatePosition(visibleIndex, false); // Buttons are not pie charts for positioning
    const [x, y, z] = position.split(' ').map(parseFloat);
    const kpiId = parseInt(chartConfig.chart.zAxis);
    const hasValue1 = hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_1');
    const hasValue2 = hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_2');

    const buttonsContainer = document.createElement('a-entity');
    buttonsContainer.setAttribute('position', `${x + 6} ${parseFloat(y) + 8} ${z}`); // Adjust position relative to chart
    buttonsContainer.setAttribute('data-buttons-index', originalIndex);
    let buttonVerticalOffset = 0;

    // Value toggle button (Produto 1 / Produto 2)
    if (hasValue1 && hasValue2) { // Only show if both value types have data
        const valueButton = document.createElement('a-entity');
        valueButton.setAttribute('geometry', 'primitive: box; width: 2.5; height: 0.8; depth: 0.1');
        valueButton.setAttribute('material', `color: ${state.valueType === 'NewValue_1' ? '#4CAF50' : '#FF9800'}`);
        valueButton.setAttribute('position', `0 ${buttonVerticalOffset} 0`);
        const valueText = document.createElement('a-text');
        valueText.setAttribute('value', state.valueType === 'NewValue_1' ? 'Produto 1' : 'Produto 2');
        valueText.setAttribute('position', '0 0 0.06'); // Slightly in front of the button
        valueText.setAttribute('align', 'center'); 
        valueText.setAttribute('color', 'white'); 
        valueText.setAttribute('width', '4'); // Max width for text
        valueButton.appendChild(valueText);
        valueButton.setAttribute('class', 'clickable'); // Make it clickable
        valueButton.addEventListener('click', (event) => { 
            event.stopPropagation(); // Prevent scene-level clicks if any
            setTimeout(() => toggleChartValue(originalIndex), 0); // Use timeout to ensure A-Frame processes event correctly
        });
        buttonsContainer.appendChild(valueButton);
        buttonVerticalOffset -= 1.2; // Offset for next button
    }

    // Time type toggle button (Anos / Meses / Dias)
    const timeButton = document.createElement('a-entity');
    timeButton.setAttribute('geometry', 'primitive: box; width: 2.5; height: 0.8; depth: 0.1');
    timeButton.setAttribute('material', 'color: #2196F3');
    timeButton.setAttribute('position', `0 ${buttonVerticalOffset} 0`);
    const timeText = document.createElement('a-text');
    timeText.setAttribute('value', TIME_TYPES[state.timeType] ? TIME_TYPES[state.timeType].label : 'Tempo');
    timeText.setAttribute('position', '0 0 0.06');
    timeText.setAttribute('align', 'center');
    timeText.setAttribute('color', 'white');
    timeText.setAttribute('width', '4');
    timeButton.appendChild(timeText);
    timeButton.setAttribute('class', 'clickable');
    timeButton.addEventListener('click', (event) => {
        event.stopPropagation();
        setTimeout(() => toggleChartTimeType(originalIndex), 0);
    });
    buttonsContainer.appendChild(timeButton);
    return buttonsContainer;
}


function createChart(chartConfigData, originalIndex, valueType, timeType = 'years', visibleIndex) {
    const { kpihistory, chart } = chartConfigData;
    const kpiId = parseInt(chart.zAxis);
    const chartContainer = document.createElement('a-entity');
    const isPieChart = chart.chartType === "pizza";

    chartContainer.setAttribute('position', calculatePosition(visibleIndex, isPieChart));
    chartContainer.setAttribute('data-chart-index', originalIndex); // Original index for state tracking

    const palette = valueType === 'NewValue_1' ? 'commerce' : 'ubuntu'; // Example palettes
    const productName = valueType === 'NewValue_1' ? 'Produto 1' : 'Produto 2';
    const timeLabel = TIME_TYPES[timeType] ? TIME_TYPES[timeType].label : 'N/A';

    if (chart.chartType === "barras") {
        const chartData = processKPIData(kpihistory, kpiId, timeType, valueType);
        const babiaConfig = `legend: true; axis: true; palette: ${palette}; tooltip: true; animation: false; title: ${chart.graphname} (${productName} - ${timeLabel}); titleColor: #FFFFFF; titleFont: #optimerBoldFont; titlePosition: 2 12 0; heightMax: 800; x_axis: key; height: height; data: ${JSON.stringify(chartData)}; showInfo: true; showInfoColor: #FFFFFF`;
        chartContainer.setAttribute('babia-bars', babiaConfig);
    } else if (chart.chartType === "pizza") {
        let pieData = processPieData(kpihistory, kpiId, timeType, valueType);
        // Ensure pieData is not empty for babia-pie component
        if (pieData.length === 0 || pieData.every(item => item.size === 0)) {
            pieData = [{ key: 'Sem Dados', size: 1 }]; // Placeholder if no data
        }
        // Add title as a separate a-text for pie charts for better control
        const titleEl = document.createElement('a-text');
        titleEl.setAttribute('value', `${chart.graphname} (${productName} - ${timeLabel})`);
        titleEl.setAttribute('position', '1 6 0'); // Adjust position as needed above the pie
        titleEl.setAttribute('align', 'center'); 
        titleEl.setAttribute('color', '#FFFFFF'); 
        titleEl.setAttribute('width', '8'); // Max width for title
        chartContainer.appendChild(titleEl);

        const pieEl = document.createElement('a-entity'); // Separate entity for the pie itself
        const pieConfig = `legend: true; palette: ${palette}; animation: false; key: key; size: size; data: ${JSON.stringify(pieData)}; showInfo: true; showInfoColor: #FFFFFF`;
        pieEl.setAttribute('babia-pie', pieConfig);
        pieEl.setAttribute('rotation', '90 0 0'); // Rotate pie to be flat
        pieEl.setAttribute('scale', '1.8 1.8 1.8'); // Scale pie if needed
        chartContainer.appendChild(pieEl);
    }
    // Make chart container invisible if no valid data to display for current settings
    const hasData = (chart.chartType === "barras" && processKPIData(kpihistory, kpiId, timeType, valueType).length > 0) ||
                    (chart.chartType === "pizza" && processPieData(kpihistory, kpiId, timeType, valueType).some(d => d.size > 0));
    
    chartContainer.setAttribute('visible', hasData.toString());

    return chartContainer;
}


function clearCharts() {
    while (root.firstChild) {
        root.removeChild(root.firstChild);
    }
    chartsData = [];
    chartStates = {};
}

function getDefaultTimeType(chart) {
    // Prioritize more specific time unit keys if available
    const timeUnit = chart.xAxis || chart.timeUnit || chart.xAxisUnit || chart.temporalUnit;
    return JSON_TIME_MAPPING[timeUnit] || 'years'; // Default to 'years'
}

function initializeChartStates() {
    chartStates = {}; // Reset states
    chartsData.forEach((chartConfig, index) => {
        const kpiId = parseInt(chartConfig.chart.zAxis);
        const hasValue1 = hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_1');
        const hasValue2 = hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_2');
        
        let defaultValueType = 'NewValue_1';
        if (!hasValue1 && hasValue2) { // If Value1 has no data but Value2 does, default to Value2
            defaultValueType = 'NewValue_2';
        }
        // If neither has data, it will default to NewValue_1, and chart might be hidden by createChart logic

        chartStates[index] = {
            valueType: defaultValueType,
            timeType: getDefaultTimeType(chartConfig.chart)
        };
    });
}

function renderAllCharts() {
    // Clear previous charts from the root
    while (root.firstChild) {
        root.removeChild(root.firstChild);
    }

    let visibleChartIndex = 0; // Index for positioning visible charts
    chartsData.forEach((chartConfig, originalIndex) => {
        const { kpihistory, chart } = chartConfig;
        const kpiId = parseInt(chart.zAxis);

        // Check if there's any valid data for this KPI for either value type
        if (hasValidData(kpihistory, kpiId, 'NewValue_1') || hasValidData(kpihistory, kpiId, 'NewValue_2')) {
            const state = chartStates[originalIndex];
            if (!state) { // Should be initialized by initializeChartStates
                console.warn(`State not found for chart index ${originalIndex}. Skipping.`);
                return;
            }
            
            const el = createChart(chartConfig, originalIndex, state.valueType, state.timeType, visibleChartIndex);
            root.appendChild(el);
            
            const buttonsEl = createChartButtons(originalIndex, state, visibleChartIndex);
            root.appendChild(buttonsEl);
            
            visibleChartIndex++;
        } else {
            // console.log(`No valid data for chart ${chart.graphname} (KPI ${kpiId}). Skipping render.`);
        }
    });
    // ARHandler manages the scale/position of `root` in AR. No per-chart AR adjustments here.
}

async function fetchDataFromAPI(roomCode, retries = 3) {
    const apiUrl = buildAPIURL(roomCode);
    console.log(`Fetching data from: ${apiUrl}`);
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            if (!data) {
                throw new Error('Nenhum dado recebido da API');
            }
            // Validate data structure
            if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0].config === 'object' &&
                Array.isArray(data[0].config.kpihistory) && Array.isArray(data[0].config.charts)) {
                return data;
            }
            throw new Error('Estrutura de dados da API inválida.');
        } catch (error) {
            console.error(`Tentativa ${attempt} falhou: ${error.message}`);
            if (attempt === retries) throw error; // Rethrow last error
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
    }
}

async function initializeApp(attemptLoadFromUrl = true) {
    const roomFromUrl = getRoomFromURL();
    let roomToLoad = null;
    let localIsCollapsed = false; // For managing room selector state during init

    if (attemptLoadFromUrl && roomFromUrl) {
        roomToLoad = roomFromUrl;
    } else if (currentRoom && !roomFromUrl) { // If there's a currentRoom but no URL param, use currentRoom
        // This case might be if connectToRoom was called, or a default is set.
        // Only set roomToLoad if we intend to auto-load it.
        // For initial load, if no URL param, we don't auto-load LD5RU unless specified.
        // Let's adjust: if attemptLoadFromUrl is true, AND roomFromUrl is null, don't try to load currentRoom by default here.
        // The user should explicitly connect or it should come from URL.
    }


    if (roomToLoad) {
        currentRoom = roomToLoad; // Update global currentRoom
        syncRoomUI(currentRoom);
        showLoading(true, currentRoom);
        showError(false);

        try {
            console.log(`Initializing application for room: ${currentRoom}...`);
            const apiDataArray = await fetchDataFromAPI(currentRoom);

            // Assuming data structure is [ { "config": { "kpihistory": [], "charts": [] } } ]
            const config = apiDataArray[0].config;
            const kpihistoryFromConfig = config.kpihistory;
            const chartsFromConfig = config.charts;

            if (!kpihistoryFromConfig || !chartsFromConfig) {
                throw new Error('Missing kpihistory or charts in API response config.');
            }
            
            // Process and store chart data
            chartsData = []; // Clear previous data
            chartsFromConfig.forEach(chart => {
                chartsData.push({
                    kpihistory: kpihistoryFromConfig, // Share kpihistory among charts from same room
                    chart: chart
                });
            });

            if (chartsData.length === 0) {
                console.warn('Nenhum gráfico encontrado nos dados para esta sala.');
                clearCharts(); // Ensure scene is empty
            } else {
                initializeChartStates(); // Initialize states before rendering
                renderAllCharts();       // Render all charts based on new data
            }
            
            localIsCollapsed = true; // Collapse room selector after successful load

            setTimeout(() => showLoading(false), 500); // Give a bit of time for rendering
            console.log(`Application initialized successfully for room: ${currentRoom}`);

        } catch (error) {
            console.error(`Falha ao inicializar para a sala ${currentRoom}:`, error);
            localIsCollapsed = false; // Keep room selector open on error
            showLoading(false);
            // Construct a more user-friendly error message
            let displayError = `Falha ao carregar dados da sala ${currentRoom}.`;
            if (error.message.includes("HTTP error")) {
                displayError += " Problema de comunicação com o servidor.";
            } else if (error.message.includes("Estrutura de dados")) {
                displayError += " Formato de dados inesperado.";
            } else {
                displayError += " Por favor, tente novamente.";
            }
            showError(true, displayError);
            clearCharts(); // Clear any partially rendered charts
        }
    } else {
        // No room in URL, or explicit connection hasn't happened yet.
        // Show room selector, don't show loading/error unless triggered by connectToRoom
        localIsCollapsed = false; // Keep room selector open
        syncRoomUI(currentRoom); // Reflect currentRoom (e.g. default LD5RU or last connected)
        showLoading(false);
        showError(false);
        clearCharts(); // Ensure no old charts are shown
        console.log("Nenhuma sala especificada na URL para carregamento automático. Seletor de sala ativo. Sala de contexto: " + currentRoom);
    }

    isCollapsed = localIsCollapsed;
    updateRoomSelectorCollapsedState();
    showRoomSelector(); // Ensure room selector visibility is correctly set
}


// Initialize ARHandler on window load
window.addEventListener('load', () => {
    console.log('Page loaded, starting application...');

    // Initialize ARHandler
    if (sceneEl && root && arPlacementInstructions && arScaleSlider && arScaleSliderContainer) {
        arHandler = new ARHandler(
            sceneEl,
            root, // This is the <a-entity id="charts-root">
            arPlacementInstructions,
            arScaleSlider,
            arScaleSliderContainer
        );
        console.log('ARHandler initialized.');
    } else {
        console.error('Failed to initialize ARHandler: One or more required elements are missing.');
        if (!sceneEl) console.error("Missing: sceneEl");
        if (!root) console.error("Missing: charts-root (root var)");
        if (!arPlacementInstructions) console.error("Missing: arPlacementInstructions");
        if (!arScaleSlider) console.error("Missing: arScaleSlider");
        if (!arScaleSliderContainer) console.error("Missing: arScaleSliderContainer");
    }
    
    const closeBtn = document.getElementById('closeErrorAndEnterBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeErrorAndEnterEnvironment);
    }
    const retryBtn = document.getElementById('retryConnectionBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', retryConnection);
    }

    initializeApp(true); // Attempt to load room from URL or use default
});