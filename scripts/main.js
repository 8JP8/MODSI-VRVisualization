// scripts/main.js

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
const sceneEnvironment = document.getElementById('scene-environment'); // VR environment entity

// API Configuration
const API_BASE_URL = 'https://modsi-api-ffhhfgecfdehhscv.spaincentral-01.azurewebsites.net/api/Room/Get/';
const API_CODE = 'z4tKbNFdaaXzHZ4ayn9pRQokNWYgRkbVkCjOxTxP-8ChAzFuMigGCw==';

let currentRoom = 'LD5RU';
let isCollapsed = false;

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
    if (roomSelector) roomSelector.classList.remove('hidden');
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
    // Check AR mode before showing room selector
    const arModeActive = (typeof ARHandler !== 'undefined' && ARHandler.isARModeActive) ? ARHandler.isARModeActive() : false;
    if (!arModeActive) {
        showRoomSelector();
    }
    syncRoomUI(currentRoom);
    console.log("Error overlay closed. Context room: " + currentRoom);
}

function retryConnection() {
    showError(false);
    initializeApp(true);
}

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
            if(connectBtn) connectBtn.click();
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

    isCollapsed = false; // Expand selector when connecting to a new room
    updateRoomSelectorCollapsedState();

    const url = new URL(window.location);
    url.searchParams.set('room', currentRoom);
    url.searchParams.delete('code');
    window.history.pushState({}, '', url.toString());

    showRoomStatus(`Conectando à sala ${currentRoom}...`, 'loading');
    if(connectBtn) connectBtn.disabled = true;

    await initializeApp(true); // This will fetch data and render charts

    if (errorOverlay && !errorOverlay.classList.contains('visible')) { // Check if error overlay is NOT visible
        showRoomStatus(`Conectado à sala ${currentRoom} com sucesso!`, 'success');
        // isCollapsed = false; // Already set above
        // updateRoomSelectorCollapsedState();
    } else {
        showRoomStatus(`Falha ao carregar sala ${currentRoom}.`, 'error');
    }

    if(connectBtn) connectBtn.disabled = false;
}

function handleFullscreenChange() {
    const sceneEl = document.querySelector('a-scene');
    const isFullscreen = document.fullscreenElement ||
                        document.webkitFullscreenElement ||
                        document.mozFullScreenElement ||
                        document.msFullscreenElement;

    const arModeActive = (typeof ARHandler !== 'undefined' && ARHandler.isARModeActive) ? ARHandler.isARModeActive() : false;

    if (isFullscreen || (sceneEl && sceneEl.is('vr-mode')) || arModeActive) {
        hideRoomSelector();
    } else {
        showRoomSelector();
    }
}

document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

const sceneEl = document.querySelector('a-scene');

if (sceneEl) {
    sceneEl.addEventListener('enter-vr', () => {
        hideRoomSelector();
        if (sceneEnvironment) sceneEnvironment.setAttribute('visible', true); // Ensure VR env is visible
    });
    sceneEl.addEventListener('exit-vr', () => {
        // ARHandler's onExitAR will handle showing room selector if not in AR.
        // This primarily handles exit from VR to 2D.
        const arModeActive = (typeof ARHandler !== 'undefined' && ARHandler.isARModeActive) ? ARHandler.isARModeActive() : false;
        if (!arModeActive) {
            showRoomSelector();
        }
    });
    // AR enter/exit listeners are now managed by ARHandler.js
    // It will call hideRoomSelector/showRoomSelector as needed.
}


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
    if (!chartConfig || !state || !root) return;

    const existingChart = root.querySelector(`[data-chart-index="${chartIndex}"]`);
    const existingButtons = root.querySelector(`[data-buttons-index="${chartIndex}"]`);

    if (existingChart) {
        if (chartConfig.chart.chartType === "babia-pie" && existingChart.components && existingChart.components['babia-pie']) {
            existingChart.removeAttribute('babia-pie'); // Important for babia-pie re-rendering
        }
        // Delay removal and re-creation to ensure A-Frame processes attribute changes
        setTimeout(() => {
            if (existingChart.parentNode) existingChart.parentNode.removeChild(existingChart);
            if (existingButtons && existingButtons.parentNode) existingButtons.parentNode.removeChild(existingButtons);

            // Recalculate visibleIndex based on current chartsData and their validity
            let visibleChartIndex = 0;
            for(let i=0; i < chartIndex; i++){ // Iterate up to the current chart's original index
                if(chartsData[i] && chartStates[i] && (hasValidData(chartsData[i].kpihistory, parseInt(chartsData[i].chart.zAxis), 'NewValue_1') || hasValidData(chartsData[i].kpihistory, parseInt(chartsData[i].chart.zAxis), 'NewValue_2'))){
                    visibleChartIndex++;
                }
            }

            const chartEl = createChart(chartConfig, chartIndex, state.valueType, state.timeType, visibleChartIndex);
            if (chartEl) root.appendChild(chartEl);
            const buttonsEl = createChartButtons(chartIndex, state, visibleChartIndex);
            if (buttonsEl) root.appendChild(buttonsEl);
        }, 50); 
    } else { // If chart doesn't exist, create it (less common path if renderAllCharts is robust)
         if (existingButtons && existingButtons.parentNode) existingButtons.parentNode.removeChild(existingButtons);

         let visibleChartIndex = 0;
         for(let i=0; i < chartIndex; i++){
             if(chartsData[i] && chartStates[i] && (hasValidData(chartsData[i].kpihistory, parseInt(chartsData[i].chart.zAxis), 'NewValue_1') || hasValidData(chartsData[i].kpihistory, parseInt(chartsData[i].chart.zAxis), 'NewValue_2'))){
                 visibleChartIndex++;
             }
         }
         const chartEl = createChart(chartConfig, chartIndex, state.valueType, state.timeType, visibleChartIndex);
         if (chartEl) root.appendChild(chartEl);
         const buttonsEl = createChartButtons(chartIndex, state, visibleChartIndex);
         if (buttonsEl) root.appendChild(buttonsEl);
    }
}

function createChartButtons(originalIndex, state, visibleIndex) {
    const chartConfig = chartsData[originalIndex];
    if (!chartConfig || !chartConfig.chart) return null;

    const position = calculatePosition(visibleIndex, false); // Buttons are not pie charts for positioning
    const [x, y, z] = position.split(' ').map(parseFloat);
    const kpiId = parseInt(chartConfig.chart.zAxis);
    const hasValue1 = hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_1');
    const hasValue2 = hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_2');

    const buttonsContainer = document.createElement('a-entity');
    buttonsContainer.setAttribute('position', `${x + 6} ${parseFloat(y) + 8} ${z}`); // Adjust button panel position relative to chart
    buttonsContainer.setAttribute('data-buttons-index', originalIndex);
    let buttonVerticalOffset = 0;

    // Value toggle button (Produto 1 / Produto 2)
    if (hasValue1 && hasValue2) { // Only show if both products have data
        const valueButton = document.createElement('a-entity');
        valueButton.setAttribute('geometry', 'primitive: box; width: 2.5; height: 0.8; depth: 0.1');
        valueButton.setAttribute('material', `color: ${state.valueType === 'NewValue_1' ? '#4CAF50' : '#FF9800'}`);
        valueButton.setAttribute('position', `0 ${buttonVerticalOffset} 0`);
        
        const valueText = document.createElement('a-text');
        valueText.setAttribute('value', state.valueType === 'NewValue_1' ? 'Produto 1' : 'Produto 2');
        valueText.setAttribute('position', '0 0 0.06'); // Slightly in front of the button
        valueText.setAttribute('align', 'center');
        valueText.setAttribute('color', 'white');
        valueText.setAttribute('width', '4'); // Text width for wrapping/scaling
        valueButton.appendChild(valueText);

        valueButton.setAttribute('class', 'clickable'); // For cursor interaction
        valueButton.addEventListener('click', (event) => { 
            event.stopPropagation(); // Prevent scene-level clicks if any
            setTimeout(() => toggleChartValue(originalIndex), 100); // Timeout for A-Frame to process click
        });
        buttonsContainer.appendChild(valueButton);
        buttonVerticalOffset -= 1.2; // Space for next button
    }

    // Time type toggle button (Anos / Meses / Dias)
    const timeButton = document.createElement('a-entity');
    timeButton.setAttribute('geometry', 'primitive: box; width: 2.5; height: 0.8; depth: 0.1');
    timeButton.setAttribute('material', 'color: #2196F3'); // Blue color
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
        setTimeout(() => toggleChartTimeType(originalIndex), 100);
    });
    buttonsContainer.appendChild(timeButton);
    return buttonsContainer;
}

function createChart(chartConfigData, originalIndex, valueType, timeType = 'years', visibleIndex) {
    const { kpihistory, chart } = chartConfigData;
    if (!kpihistory || !chart) return null;

    const kpiId = parseInt(chart.zAxis);
    const chartContainer = document.createElement('a-entity');
    const isPieChart = chart.chartType === "pizza";

    chartContainer.setAttribute('position', calculatePosition(visibleIndex, isPieChart));
    chartContainer.setAttribute('data-chart-index', originalIndex); // For re-finding this chart

    const palette = valueType === 'NewValue_1' ? 'commerce' : 'ubuntu'; // Example palettes
    const productName = valueType === 'NewValue_1' ? 'Produto 1' : 'Produto 2';
    const timeLabel = TIME_TYPES[timeType] ? TIME_TYPES[timeType].label : 'Tempo';
    const chartTitle = `${chart.graphname || 'Gráfico'} (${productName} - ${timeLabel})`;

    if (chart.chartType === "babia-bars") {
        const chartData = processKPIData(kpihistory, kpiId, timeType, valueType);
        // BabiaXR bars component configuration
        const babiaConfig = `legend: true; axis: true; palette: ${palette}; tooltip: true; animation: false; title: ${chartTitle}; titleColor: #FFFFFF; titleFont: #optimerBoldFont; titlePosition: 2 12 0; heightMax: 800; x_axis: key; height: height; data: ${JSON.stringify(chartData)}; showInfo: true; showInfoColor: #FFFFFF`;
        chartContainer.setAttribute('babia-bars', babiaConfig);
    } else if (chart.chartType === "pizza") {
        let pieData = processPieData(kpihistory, kpiId, timeType, valueType);
        // If no data or all data is zero, provide a default slice to render something
        if (pieData.length === 0 || pieData.every(item => item.size === 0)) {
            pieData = [{ key: 'Sem Dados', size: 1 }];
        }
        
        // For pie charts, BabiaXR might not have a title attribute directly in babia-pie.
        // Create a separate title entity if needed.
        const titleEl = document.createElement('a-text');
        titleEl.setAttribute('value', chartTitle);
        titleEl.setAttribute('position', '1 6 0'); // Position title above the pie
        titleEl.setAttribute('align', 'center');
        titleEl.setAttribute('color', '#FFFFFF'); // White title
        titleEl.setAttribute('width', '8'); // Text width for wrapping
        chartContainer.appendChild(titleEl);

        const pieEl = document.createElement('a-entity'); // Pie chart itself
        const pieConfig = `legend: true; palette: ${palette}; animation: false; key: key; size: size; data: ${JSON.stringify(pieData)}; showInfo: true; showInfoColor: #FFFFFF`;
        pieEl.setAttribute('babia-pie', pieConfig);
        pieEl.setAttribute('rotation', '90 0 0'); // Rotate pie to be flat on XZ plane
        pieEl.setAttribute('scale', '1.8 1.8 1.8'); // Adjust scale if needed
        chartContainer.appendChild(pieEl);
    }
    return chartContainer;
}

function clearCharts() {
    if (!root) return;
    while (root.firstChild) {
        root.removeChild(root.firstChild);
    }
    chartsData = [];
    chartStates = {};
}

function getDefaultTimeType(chart) {
    // Determine default time type from chart configuration if available
    const timeUnit = chart.xAxis || chart.timeUnit || chart.xAxisUnit || chart.temporalUnit;
    return JSON_TIME_MAPPING[timeUnit] || 'years'; // Default to 'years' if not specified
}

function initializeChartStates() {
    chartStates = {}; // Reset states
    chartsData.forEach((chartConfig, index) => {
        if (!chartConfig.chart) return;
        const kpiId = parseInt(chartConfig.chart.zAxis);
        // Determine default valueType (NewValue_1 or NewValue_2)
        const hasValue1 = hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_1');
        const hasValue2 = hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_2');
        let defaultValueType = 'NewValue_1';
        if (!hasValue1 && hasValue2) { // If only NewValue_2 has data, use it
            defaultValueType = 'NewValue_2';
        }
        chartStates[index] = {
            valueType: defaultValueType,
            timeType: getDefaultTimeType(chartConfig.chart)
        };
    });
}

function renderAllCharts() {
    if (!root) return;
    // Clear existing charts before rendering all
    while (root.firstChild) {
        root.removeChild(root.firstChild);
    }

    let visibleChartIndex = 0; // To calculate position for only valid charts
    chartsData.forEach((chartConfig, originalIndex) => {
        if (!chartConfig.chart || !chartConfig.kpihistory) return;
        const kpiId = parseInt(chartConfig.chart.zAxis);
        
        // Check if this chart has any valid data for either product type
        if (hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_1') || hasValidData(chartConfig.kpihistory, kpiId, 'NewValue_2')) {
            const state = chartStates[originalIndex];
            if (!state) { // Should not happen if initializeChartStates was called
                console.warn(`State not found for chart index ${originalIndex}. Skipping.`);
                return;
            }
            const el = createChart(chartConfig, originalIndex, state.valueType, state.timeType, visibleChartIndex);
            if (el) root.appendChild(el);
            
            const buttonsEl = createChartButtons(originalIndex, state, visibleChartIndex);
            if (buttonsEl) root.appendChild(buttonsEl);
            
            visibleChartIndex++; // Increment only for charts that are actually rendered
        }
    });
}

async function fetchDataFromAPI(roomCode, retries = 3) {
    const apiUrl = buildAPIURL(roomCode);
    console.log(`Fetching data from: ${apiUrl}`);
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(apiUrl, {
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }
            const data = await response.json();
            if (!data) {
                throw new Error('Nenhum dado recebido da API');
            }
            // Validate data structure (basic check)
            if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0].config === 'object' &&
                Array.isArray(data[0].config.kpihistory) && Array.isArray(data[0].config.charts)) {
                return data;
            }
            throw new Error('Estrutura de dados da API inválida.');
        } catch (error) {
            console.error(`Tentativa ${attempt} falhou: ${error.message}`);
            if (attempt === retries) {
                throw error; // Re-throw last error
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        }
    }
}

async function initializeApp(attemptLoadFromUrl = true) {
    const roomFromUrl = getRoomFromURL();
    let roomToLoad = null;
    let localIsCollapsed = false; // For room selector state

    // Reset AR state if ARHandler is available
    if (typeof ARHandler !== 'undefined' && ARHandler.resetARStateForAppReinit) {
        ARHandler.resetARStateForAppReinit();
    }

    if (attemptLoadFromUrl && roomFromUrl) {
        roomToLoad = roomFromUrl;
    }

    if (roomToLoad) {
        currentRoom = roomToLoad;
        syncRoomUI(currentRoom);
        showLoading(true, currentRoom);
        showError(false); // Clear previous errors

        try {
            console.log(`Initializing application for room: ${currentRoom}...`);
            const apiDataArray = await fetchDataFromAPI(currentRoom);

            // Assuming data structure [ { "config": { "kpihistory": [], "charts": [] } } ]
            const config = apiDataArray[0].config;
            const kpihistoryFromConfig = config.kpihistory;
            const chartsFromConfig = config.charts;

            if (!kpihistoryFromConfig || !chartsFromConfig) {
                throw new Error('Missing kpihistory or charts in API response config.');
            }

            // Prepare chartsData by combining kpihistory with each chart config
            chartsData = []; // Clear previous charts data
            chartsFromConfig.forEach(chart => {
                chartsData.push({
                    kpihistory: kpihistoryFromConfig, // Share kpihistory among charts
                    chart: chart
                });
            });

            if (chartsData.length === 0) {
                console.warn('Nenhum gráfico encontrado nos dados para esta sala.');
                clearCharts(); // Ensure display is clean
            } else {
                initializeChartStates(); // Setup initial states for valueType and timeType
                renderAllCharts();       // Render all valid charts
            }

            localIsCollapsed = true; // Collapse room selector after successful load

            setTimeout(() => showLoading(false), 500); // Give a moment for rendering
            console.log(`Application initialized successfully for room: ${currentRoom}`);

        } catch (error) {
            console.error(`Falha ao inicializar para a sala ${currentRoom}:`, error);
            localIsCollapsed = false; // Keep room selector open on error
            showLoading(false);
            showError(true, `Falha ao carregar dados da sala ${currentRoom}: ${error.message}`);
        }
    } else {
        // No room to load from URL, setup for manual room entry
        localIsCollapsed = false; // Keep room selector open
        syncRoomUI(currentRoom); // Sync with default or last known room
        showLoading(false);
        showError(false);
        clearCharts(); // Clear any existing charts
        console.log("Nenhuma sala especificada na URL para carregamento automático. Seletor de sala ativo. Sala de contexto: " + currentRoom);
    }

    isCollapsed = localIsCollapsed;
    updateRoomSelectorCollapsedState();

    // Show room selector only if not in VR or AR mode.
    const arModeActive = (typeof ARHandler !== 'undefined' && ARHandler.isARModeActive) ? ARHandler.isARModeActive() : false;
    if (sceneEl && !sceneEl.is('vr-mode') && !arModeActive) {
        showRoomSelector();
    }
}

window.addEventListener('load', () => {
    console.log('Page loaded, starting application...');
    const closeBtn = document.getElementById('closeErrorAndEnterBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeErrorAndEnterEnvironment);
    }
    
    // Initialize AR Handler, passing necessary functions from main.js
    if (typeof ARHandler !== 'undefined' && ARHandler.init) {
        ARHandler.init(hideRoomSelector, showRoomSelector);
    } else {
        console.error("ARHandler is not defined. AR features might not work.");
    }

    initializeApp(true); // Initial application load sequence
});

if (sceneEl) {
    sceneEl.addEventListener('loaded', () => {
        console.log('A-Frame scene loaded');
        // Any specific logic after A-Frame scene itself is fully parsed and ready.
        // ARHandler's init also has a DOMContentLoaded and element check,
        // so this is more for A-Frame specific post-load tasks if any.
    });
}
