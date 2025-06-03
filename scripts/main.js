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
const arInstructions = document.getElementById('arInstructions');
const closeArInstructions = document.getElementById('closeArInstructions');

// AR Elements
const sceneEl = document.querySelector('a-scene');
const skyEl = document.getElementById('sky');
const environmentEl = document.getElementById('environment');
const vrCameraEl = document.getElementById('vrCamera');
const arCameraEl = document.getElementById('arCamera');
const arMarkerEl = document.getElementById('arMarker');

// API Configuration
const API_BASE_URL = 'https://modsi-api-ffhhfgecfdehhscv.spaincentral-01.azurewebsites.net/api/Room/Get/';
const API_CODE = 'z4tKbNFdaaXzHZ4ayn9pRQokNWYgRkbVkCjOxTxP-8ChAzFuMigGCw==';

let currentRoom = 'LD5RU';
let isCollapsed = false;
let isARMode = false;
let arInstructionsShown = false;

// AR Mode Management
function enterARMode() {
    console.log('Entering AR mode...');
    isARMode = true;
    document.body.classList.add('ar-mode');
    
    // Hide VR environment elements
    if (skyEl) skyEl.setAttribute('visible', 'false');
    if (environmentEl) environmentEl.setAttribute('visible', 'false');
    
    // Switch cameras
    if (vrCameraEl) vrCameraEl.setAttribute('visible', 'false');
    if (arCameraEl) {
        arCameraEl.setAttribute('visible', 'true');
        arCameraEl.setAttribute('camera', 'active: true');
    }
    
    // Hide UI elements
    hideRoomSelector();
    
    // Adjust chart positions for AR
    adjustChartsForAR();
    
    // Show AR instructions if first time
    if (!arInstructionsShown) {
        showARInstructions();
        arInstructionsShown = true;
    }
    
    console.log('AR mode activated');
}

function exitARMode() {
    console.log('Exiting AR mode...');
    isARMode = false;
    document.body.classList.remove('ar-mode');
    
    // Show VR environment elements
    if (skyEl) skyEl.setAttribute('visible', 'true');
    if (environmentEl) environmentEl.setAttribute('visible', 'true');
    
    // Switch cameras back
    if (arCameraEl) {
        arCameraEl.setAttribute('visible', 'false');
        arCameraEl.setAttribute('camera', 'active: false');
    }
    if (vrCameraEl) vrCameraEl.setAttribute('visible', 'true');
    
    // Show UI elements
    showRoomSelector();
    
    // Restore chart positions for VR/Desktop
    adjustChartsForVR();
    
    console.log('AR mode deactivated');
}

function showARInstructions() {
    if (arInstructions) {
        arInstructions.classList.remove('hidden');
    }
}

function hideARInstructions() {
    if (arInstructions) {
        arInstructions.classList.add('hidden');
    }
}

function adjustChartsForAR() {
    // Adjust chart positions and scales for AR mode
    const charts = root.querySelectorAll('[data-chart-index]');
    const buttons = root.querySelectorAll('[data-buttons-index]');
    
    charts.forEach((chart, index) => {
        // Scale down charts for AR viewing
        chart.setAttribute('scale', '0.3 0.3 0.3');
        
        // Position charts in a more compact AR-friendly layout
        const arX = -2 + (index * 1.5);
        const arY = 0;
        const arZ = -2;
        chart.setAttribute('position', `${arX} ${arY} ${arZ}`);
        
        // Make charts face the camera more directly in AR
        chart.setAttribute('rotation', '0 0 0');
    });
    
    buttons.forEach((buttonGroup, index) => {
        // Scale down buttons for AR
        buttonGroup.setAttribute('scale', '0.5 0.5 0.5');
        
        // Position buttons relative to charts
        const arX = -2 + (index * 1.5);
        const arY = 1.2;
        const arZ = -2;
        buttonGroup.setAttribute('position', `${arX} ${arY} ${arZ}`);
    });
}

function adjustChartsForVR() {
    // Restore original VR/Desktop positions and scales
    renderAllCharts();
}

// Event Listeners for AR mode
if (closeArInstructions) {
    closeArInstructions.addEventListener('click', hideARInstructions);
}

// Enhanced A-Frame event listeners for AR
if (sceneEl) {
    sceneEl.addEventListener('enter-ar', () => {
        console.log('A-Frame enter-ar event triggered');
        setTimeout(enterARMode, 100); // Small delay to ensure proper initialization
    });
    
    sceneEl.addEventListener('exit-ar', () => {
        console.log('A-Frame exit-ar event triggered');
        exitARMode();
    });
    
    // Additional AR.js specific events
    sceneEl.addEventListener('arjs-video-loaded', () => {
        console.log('AR.js video loaded');
    });
    
    sceneEl.addEventListener('arjs-nft-loaded', () => {
        console.log('AR.js NFT loaded');
    });
    
    // Handle marker detection for AR.js
    sceneEl.addEventListener('markerFound', () => {
        console.log('AR marker found');
        if (isARMode) {
            // Make charts visible when marker is detected
            const charts = root.querySelectorAll('[data-chart-index]');
            charts.forEach(chart => {
                chart.setAttribute('visible', 'true');
            });
        }
    });
    
    sceneEl.addEventListener('markerLost', () => {
        console.log('AR marker lost');
        if (isARMode) {
            // Optionally hide charts when marker is lost
            const charts = root.querySelectorAll('[data-chart-index]');
            charts.forEach(chart => {
                chart.setAttribute('visible', 'false');
            });
        }
    });
}

// Enhanced fullscreen and mode detection
function handleFullscreenChange() {
    const isFullscreen = document.fullscreenElement ||
                        document.webkitFullscreenElement ||
                        document.mozFullScreenElement ||
                        document.msFullscreenElement;

    const isVRMode = sceneEl && sceneEl.is('vr-mode');
    const currentARMode = sceneEl && sceneEl.is('ar-mode');

    // Update AR mode state if needed
    if (currentARMode !== isARMode) {
        if (currentARMode) {
            enterARMode();
        } else if (isARMode) {
            exitARMode();
        }
    }

    if (isFullscreen || isVRMode || currentARMode) {
        hideRoomSelector();
    } else if (!isARMode) {
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
    roomStatus.textContent = message;
    roomStatus.className = `room-status ${type}`;
    roomStatus.style.display = 'block';

    if (type !== 'loading') {
        setTimeout(() => {
            roomStatus.style.display = 'none';
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
    if (roomSelector && !isARMode) roomSelector.classList.remove('hidden');
}

function showLoading(show, roomNameForDisplay = null) {
    const displayRoom = roomNameForDisplay || currentRoom;
    if (currentRoomDisplayLoading) currentRoomDisplayLoading.textContent = displayRoom;
    if (show) {
        if(roomInfo) roomInfo.textContent = 'Por favor aguarde...';
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function showError(show, message = 'Erro ao carregar dados') {
    if (show) {
        errorMessage.textContent = message;
        errorOverlay.classList.add('visible');
    } else {
        errorOverlay.classList.remove('visible');
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
    initializeApp(true);
}

// Event Listeners
minimizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleRoomSelector();
});

roomSelector.addEventListener('click', (e) => {
    if (isCollapsed && e.target === roomSelector) {
        toggleRoomSelector();
    }
});

connectBtn.addEventListener('click', () => {
    const newRoom = roomInput.value.trim().toUpperCase();
    if (newRoom) {
        connectToRoom(newRoom);
    } else {
        showRoomStatus('Por favor, insira um código de sala.', 'error');
    }
});

roomInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        connectBtn.click();
    }
});

async function connectToRoom(newRoomCode) {
    if (!newRoomCode) {
         showRoomStatus('Código da sala não pode ser vazio.', 'error');
         return;
    }
    currentRoom = newRoomCode;
    syncRoomUI(currentRoom);

    isCollapsed = false;
    updateRoomSelectorCollapsedState();

    const url = new URL(window.location);
    url.searchParams.set('room', currentRoom);
    url.searchParams.delete('code');
    window.history.pushState({}, '', url.toString());

    showRoomStatus(`Conectando à sala ${currentRoom}...`, 'loading');
    connectBtn.disabled = true;

    await initializeApp(true);

    if (!errorOverlay.classList.contains('visible')) {
        showRoomStatus(`Conectado à sala ${currentRoom} com sucesso!`, 'success');
        isCollapsed = false;
        updateRoomSelectorCollapsedState();
    } else {
        showRoomStatus(`Falha ao carregar sala ${currentRoom}.`, 'error');
    }

    connectBtn.disabled = false;
}

// Fullscreen and mode event listeners
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

if (sceneEl) {
    sceneEl.addEventListener('enter-vr', hideRoomSelector);
    sceneEl.addEventListener('exit-vr', showRoomSelector);
    sceneEl.addEventListener('loaded', () => {
        console.log('A-Frame scene loaded');
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
        else timeKey = date.getFullYear().toString();
        if (!dataByTimeKey[timeKey]) dataByTimeKey[timeKey] = [];
        dataByTimeKey[timeKey].push({ ...item, parsedDate: date });
    });
    const finalData = [];
    Object.keys(dataByTimeKey).sort().forEach(timeKey => {
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
    chartStates[chartIndex].valueType = chartStates[chartIndex].valueType === 'NewValue_1' ? 'NewValue_2' : 'NewValue_1';
    renderSingleChart(chartIndex);
}

function toggleChartTimeType(chartIndex) {
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
        if (chartConfig.chart.chartType === "pizza" && existingChart.components && existingChart.components['babia-pie']) {
            existingChart.removeAttribute('babia-pie');
        }
        setTimeout(() => {
            if (existingChart.parentNode) existingChart.parentNode.removeChild(existingChart);
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
            
            // Apply AR adjustments if in AR mode
            if (isARMode) {
                setTimeout(adjustChartsForAR, 100);
            }
        }, 50);
    } else {
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
         
         // Apply AR adjustments if in AR mode
         if (isARMode) {
             setTimeout(adjustChartsForAR, 100);
         }
    }
}

function createChartButtons(originalIndex, state, visibleIndex) {
    const chartConfig = chartsData[originalIndex];
    const position = calculatePosition(visibleIndex, false);
    const [x, y, z] = position.split(' ').map(parseFloat);
    const kpiId = parseInt(chartConfig.chart.zAxis);
    const hasValue1 = hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_1');
    const hasValue2 = hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_2');

    const buttonsContainer = document.createElement('a-entity');
    buttonsContainer.setAttribute('position', `${x + 6} ${parseFloat(y) + 8} ${z}`);
    buttonsContainer.setAttribute('data-buttons-index', originalIndex);
    let buttonVerticalOffset = 0;

    if (hasValue1 && hasValue2) {
        const valueButton = document.createElement('a-entity');
        valueButton.setAttribute('geometry', 'primitive: box; width: 2.5; height: 0.8; depth: 0.1');
        valueButton.setAttribute('material', `color: ${state.valueType === 'NewValue_1' ? '#4CAF50' : '#FF9800'}`);
        valueButton.setAttribute('position', `0 ${buttonVerticalOffset} 0`);
        const valueText = document.createElement('a-text');
        valueText.setAttribute('value', state.valueType === 'NewValue_1' ? 'Produto 1' : 'Produto 2');
        valueText.setAttribute('position', '0 0 0.06'); 
        valueText.setAttribute('align', 'center'); 
        valueText.setAttribute('color', 'white'); 
        valueText.setAttribute('width', '4');
        valueButton.appendChild(valueText);
        valueButton.setAttribute('class', 'clickable');
        valueButton.addEventListener('click', (event) => { 
            event.stopPropagation(); 
            setTimeout(() => toggleChartValue(originalIndex), 100); 
        });
        buttonsContainer.appendChild(valueButton);
        buttonVerticalOffset -= 1.2;
    }

    const timeButton = document.createElement('a-entity');
    timeButton.setAttribute('geometry', 'primitive: box; width: 2.5; height: 0.8; depth: 0.1');
    timeButton.setAttribute('material', 'color: #2196F3');
    timeButton.setAttribute('position', `0 ${buttonVerticalOffset} 0`);
    const timeText = document.createElement('a-text');
    timeText.setAttribute('value', TIME_TYPES[state.timeType].label);
    timeText.setAttribute('position', '0 0 0.06'); 
    timeText.setAttribute('align', 'center'); 
    timeText.setAttribute('color', 'white'); 
    timeText.setAttribute('width', '4');
    timeButton.appendChild(timeText);
    timeButton.setAttribute('class', 'clickable');
    timeButton.addEventListener('click', (event) => { 
        event.stopPropagation(); 
        setTimeout(() => toggleChartTimeType(originalIndex), 100); 
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
    chartContainer.setAttribute('data-chart-index', originalIndex);
    const palette = valueType === 'NewValue_1' ? 'commerce' : 'ubuntu';
    const productName = valueType === 'NewValue_1' ? 'Produto 1' : 'Produto 2';
    const timeLabel = TIME_TYPES[timeType].label;

    if (chart.chartType === "barras") {
        const chartData = processKPIData(kpihistory, kpiId, timeType, valueType);
        const babiaConfig = `legend: true; axis: true; palette: ${palette}; tooltip: true; animation: false; title: ${chart.graphname} (${productName} - ${timeLabel}); titleColor: #FFFFFF; titleFont: #optimerBoldFont; titlePosition: 2 12 0; heightMax: 800; x_axis: key; height: height; data: ${JSON.stringify(chartData)}; showInfo: true; showInfoColor: #FFFFFF`;
        chartContainer.setAttribute('babia-bars', babiaConfig);
    } else if (chart.chartType === "pizza") {
        let pieData = processPieData(kpihistory, kpiId, timeType, valueType);
        if (pieData.length === 0 || pieData.every(item => item.size === 0)) pieData = [{ key: 'Sem Dados', size: 1 }];
        const titleEl = document.createElement('a-text');
        titleEl.setAttribute('value', `${chart.graphname} (${productName} - ${timeLabel})`);
        titleEl.setAttribute('position', '1 6 0'); 
        titleEl.setAttribute('align', 'center'); 
        titleEl.setAttribute('color', '#FFFFFF'); 
        titleEl.setAttribute('width', '8');
        chartContainer.appendChild(titleEl);
        const pieEl = document.createElement('a-entity');
        const pieConfig = `legend: true; palette: ${palette}; animation: false; key: key; size: size; data: ${JSON.stringify(pieData)}; showInfo: true; showInfoColor: #FFFFFF`;
        pieEl.setAttribute('babia-pie', pieConfig);
        pieEl.setAttribute('rotation', '90 0 0');
        pieEl.setAttribute('scale', '1.8 1.8 1.8');
        chartContainer.appendChild(pieEl);
    }
    return chartContainer;
}

function clearCharts() {
    while (root.firstChild) root.removeChild(root.firstChild);
    chartsData = [];
    chartStates = {};
}

function getDefaultTimeType(chart) {
    const timeUnit = chart.xAxis || chart.timeUnit || chart.xAxisUnit || chart.temporalUnit;
    return JSON_TIME_MAPPING[timeUnit] || 'years';
}

function initializeChartStates() {
    chartStates = {};
    chartsData.forEach((chartConfig, index) => {
        const kpiId = parseInt(chartConfig.chart.zAxis);
        const hasValue1 = hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_1');
        const hasValue2 = hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_2');
        let defaultValueType = 'NewValue_1';
        if (!hasValue1 && hasValue2) defaultValueType = 'NewValue_2';
        chartStates[index] = { valueType: defaultValueType, timeType: getDefaultTimeType(chartConfig.chart) };
    });
}

function renderAllCharts() {
    while (root.firstChild) {
        root.removeChild(root.firstChild);
    }

    let visibleChartIndex = 0;
    chartsData.forEach((chartConfig, originalIndex) => {
        const { kpihistory, chart } = chartConfig;
        const kpiId = parseInt(chart.zAxis);
        if (hasValidData(kpihistory, kpiId, 'NewValue_1') || hasValidData(kpihistory, kpiId, 'NewValue_2')) {
            const state = chartStates[originalIndex];
            const el = createChart(chartConfig, originalIndex, state.valueType, state.timeType, visibleChartIndex);
            root.appendChild(el);
            const buttonsEl = createChartButtons(originalIndex, state, visibleChartIndex);
            root.appendChild(buttonsEl);
            visibleChartIndex++;
        }
    });

    // Apply AR adjustments if in AR mode
    if (isARMode) {
        setTimeout(adjustChartsForAR, 100);
    }
}

async function fetchDataFromAPI(roomCode, retries = 3) {
    const apiUrl = buildAPIURL(roomCode);
    console.log(`Fetching data from: ${apiUrl}`);
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' } });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            const data = await response.json();
            if (!data) throw new Error('Nenhum dado recebido da API');
            if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0].config === 'object' &&
                Array.isArray(data[0].config.kpihistory) && Array.isArray(data[0].config.charts)) {
                return data;
            }
            throw new Error('Estrutura de dados da API inválida.');
        } catch (error) {
            console.error(`Tentativa ${attempt} falhou: ${error.message}`);
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

async function initializeApp(attemptLoadFromUrl = true) {
    const roomFromUrl = getRoomFromURL();
    let roomToLoad = null;
    let localIsCollapsed = false;

    if (attemptLoadFromUrl && roomFromUrl) {
        roomToLoad = roomFromUrl;
    }

    if (roomToLoad) {
        currentRoom = roomToLoad;
        syncRoomUI(currentRoom);
        showLoading(true, currentRoom);
        showError(false);

        try {
            console.log(`Initializing application for room: ${currentRoom}...`);
            const apiDataArray = await fetchDataFromAPI(currentRoom);

            const config = apiDataArray[0].config;
            const kpihistoryFromConfig = config.kpihistory;
            const chartsFromConfig = config.charts;

            if (!kpihistoryFromConfig || !chartsFromConfig) {
                throw new Error('Missing kpihistory or charts in API response config.');
            }

            chartsData = [];
            chartsFromConfig.forEach(chart => {
                chartsData.push({
                    kpihistory: kpihistoryFromConfig,
                    chart: chart
                });
            });

            if (chartsData.length === 0) {
                console.warn('Nenhum gráfico encontrado nos dados para esta sala.');
                clearCharts();
            } else {
                initializeChartStates();
                renderAllCharts();
            }

            localIsCollapsed = true;

            setTimeout(() => showLoading(false), 500);
            console.log(`Application initialized successfully for room: ${currentRoom}`);

        } catch (error) {
            console.error(`Falha ao inicializar para a sala ${currentRoom}:`, error);
            localIsCollapsed = false;
            showLoading(false);
            showError(true, `Falha ao carregar dados da sala ${currentRoom}: ${error.message}`);
        }
    } else {
        localIsCollapsed = false;
        syncRoomUI(currentRoom);
        showLoading(false);
        showError(false);
        clearCharts();
        console.log("Nenhuma sala especificada na URL para carregamento automático. Seletor de sala ativo. Sala de contexto: " + currentRoom);
    }

    isCollapsed = localIsCollapsed;
    updateRoomSelectorCollapsedState();
    showRoomSelector();
}

window.addEventListener('load', () => {
    console.log('Page loaded, starting application...');
    const closeBtn = document.getElementById('closeErrorAndEnterBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeErrorAndEnterEnvironment);
    }
    initializeApp(true);
});

if (sceneEl) {
    sceneEl.addEventListener('loaded', () => {
        console.log('A-Frame scene loaded');
    });
}
