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
    showRoomSelector();
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

    if (isFullscreen || (sceneEl && sceneEl.is('vr-mode'))) {
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
        showRoomSelector();
    });
}


// --- START: NEW/MODIFIED CODE INTEGRATION ---

// Chart and 3D Scene Configuration
const POSITION_CONFIG = { startX: -10, baseY: 1.5, baseZ: 0, spacingX: 12, pieOffsetY: 3, bubbleOffsetY: 1, cylinderOffsetY: 0 };
const TIME_TYPES = {
    'years': { label: 'Anos', next: 'months' },
    'months': { label: 'Meses', next: 'days' },
    'days': { label: 'Dias', next: 'byChange' },
    'byChange': { label: 'Por Alteracao', next: 'years' }
};
const JSON_TIME_MAPPING = {
    'Year': 'years', 'Month': 'months', 'Day': 'days',
    'year': 'years', 'month': 'months', 'day': 'days',
    'years': 'years', 'months': 'months', 'days': 'days',
    'change': 'byChange'
};

const CONSTANT_BUBBLE_RADIUS = 0.5;
const BUBBLE_CHART_VISUAL_HEIGHT_MAX = 8;
const BUBBLE_CHART_CONTAINER_SCALE = "0.9 0.9 0.9";

const CONSTANT_CYLINDER_RADIUS = 0.80;
const CYLINDER_CHART_CONTAINER_SCALE = "1 1 1";
const CYLINDER_VISUAL_HEIGHT_MAX = 10;

// Global state variables
let chartsData = [];
let chartStates = {};
let kpiMetadataCache = {};
let allKpiHistory = [];

function safeParseFloat(valueStr) {
    if (valueStr == null || String(valueStr).trim() === "") return 0;
    const value = parseFloat(valueStr);
    return isNaN(value) ? 0 : value;
}

function getUnitForKPI(kpiId, kpiHistorySource) {
    if (kpiMetadataCache[kpiId] && kpiMetadataCache[kpiId].unit) {
        return kpiMetadataCache[kpiId].unit;
    }
    const entry = kpiHistorySource.find(item => (item.KPIId !== undefined ? item.KPIId : item.KpiId) == kpiId && item.Unit);
    const unit = entry ? entry.Unit : '';
    if (!kpiMetadataCache[kpiId]) kpiMetadataCache[kpiId] = {};
    kpiMetadataCache[kpiId].unit = unit;
    return unit;
}

function parseGraphname(graphname) {
    const parts = graphname.split(/\s+vs\s+/i);
    if (parts.length === 2) {
        return { kpi1Name: parts[0].trim(), kpi2Name: parts[1].trim() };
    }
    return { kpi1Name: graphname.trim(), kpi2Name: null };
}

function hasValidData(kpiHistorySource, targetKPIId, valueType) {
    const kpiData = kpiHistorySource.filter(item => (item.KPIId !== undefined ? item.KPIId : item.KpiId) == targetKPIId);
    return kpiData.some(item => {
        const value = (valueType === 'NewValue_2' ? item.NewValue_2 : item.NewValue_1);
        return value != null && String(value).trim() !== "" && !isNaN(parseFloat(value));
    });
}

function calculatePosition(visibleChartIndex, chartType = "babia-bars") {
    const x = POSITION_CONFIG.startX + (visibleChartIndex * POSITION_CONFIG.spacingX);
    let y = POSITION_CONFIG.baseY;

    if (chartType === "babia-pie") y += POSITION_CONFIG.pieOffsetY;
    else if (chartType === "babia-bubbles") y += POSITION_CONFIG.bubbleOffsetY;
    else if (chartType === "babia-cyls") y += POSITION_CONFIG.cylinderOffsetY;

    return `${x} ${y} ${POSITION_CONFIG.baseZ}`;
}

function toggleChartValue(originalIndex) {
    if (!chartStates[originalIndex]) return;
    const chartConfig = chartsData[originalIndex];

    let chartIsByProduct = chartConfig.kpiReferences.some(ref => {
        const kpiEntry = allKpiHistory.find(item => (item.KPIId !== undefined ? item.KPIId : item.KpiId) === ref.id);
        return kpiEntry && kpiEntry.ByProduct === true;
    });

    if (chartIsByProduct || chartConfig.chart.chartType === "babia-bubbles") {
        chartStates[originalIndex].valueType = chartStates[originalIndex].valueType === 'NewValue_1' ? 'NewValue_2' : 'NewValue_1';
        renderSingleChart(originalIndex);
    } else {
        console.log(`Chart ${originalIndex} (${chartConfig.chart.graphname}) is not ByProduct. Value toggle ineffective.`);
    }
}

function toggleChartTimeType(originalIndex) {
    if (!chartStates[originalIndex] || !TIME_TYPES[chartStates[originalIndex].timeAggregationMode]) return;

    const currentState = chartStates[originalIndex];
    currentState.timeAggregationMode = TIME_TYPES[currentState.timeAggregationMode].next;

    const chartConfig = chartsData[originalIndex];
    const timePointsForNewMode = chartConfig.availableTimePointsByMode[currentState.timeAggregationMode] || [];
    currentState.currentTimePointIndex = Math.max(0, timePointsForNewMode.length - 1);

    renderSingleChart(originalIndex);
}

function navigateTime(originalIndex, direction) {
    const state = chartStates[originalIndex];
    const chartConfig = chartsData[originalIndex];
    if (!state || !chartConfig) return;

    const timePoints = chartConfig.availableTimePointsByMode[state.timeAggregationMode];
    if (!timePoints || timePoints.length === 0) return;

    let newIndex = state.currentTimePointIndex;
    if (direction === 'prev') {
        newIndex = Math.max(0, state.currentTimePointIndex - 1);
    } else if (direction === 'next') {
        newIndex = Math.min(timePoints.length - 1, state.currentTimePointIndex + 1);
    }

    if (newIndex !== state.currentTimePointIndex) {
        state.currentTimePointIndex = newIndex;
        renderSingleChart(originalIndex);
    }
}

function renderSingleChart(originalIndex) {
    const chartConfig = chartsData[originalIndex];
    const state = chartStates[originalIndex];
    if (!chartConfig || !state || !root) {
        console.warn("Render single: Missing config, state, or root for index", originalIndex);
        return;
    }

    let currentVisibleIndex = 0;
    for (let i = 0; i < originalIndex; i++) {
        const prevChartConfig = chartsData[i];
        if (prevChartConfig && prevChartConfig.chart && prevChartConfig.kpiReferences) {
            let hasAnyPrevData = false;
            for (const ref of prevChartConfig.kpiReferences) {
                if (hasValidData(allKpiHistory, ref.id, 'NewValue_1') || hasValidData(allKpiHistory, ref.id, 'NewValue_2')) {
                    hasAnyPrevData = true;
                    break;
                }
            }
            if (hasAnyPrevData) {
                currentVisibleIndex++;
            }
        }
    }

    const existingChartEntity = root.querySelector(`a-entity[data-chart-index="${originalIndex}"]`);
    const existingButtonsEntity = root.querySelector(`a-entity[data-buttons-index="${originalIndex}"]`);

    if (existingChartEntity) {
        const chartTypeAttr = chartConfig.chart.chartType;
        if (existingChartEntity.components[chartTypeAttr]) {
            try {
                existingChartEntity.removeAttribute(chartTypeAttr);
            } catch (e) { console.warn(`Error removing ${chartTypeAttr}:`, e); }
        }
        setTimeout(() => {
            if (existingChartEntity.parentNode) existingChartEntity.parentNode.removeChild(existingChartEntity);
            if (existingButtonsEntity && existingButtonsEntity.parentNode) existingButtonsEntity.parentNode.removeChild(existingButtonsEntity);

            const newChartEl = createChart(chartConfig, originalIndex, state.valueType, state.timeAggregationMode, currentVisibleIndex);
            if (newChartEl) root.appendChild(newChartEl);
            const newButtonsEl = createChartButtons(originalIndex, state, currentVisibleIndex);
            if (newButtonsEl) root.appendChild(newButtonsEl);
        }, 50);
    } else {
        if (existingButtonsEntity && existingButtonsEntity.parentNode) existingButtonsEntity.parentNode.removeChild(existingButtonsEntity);
        const newChartEl = createChart(chartConfig, originalIndex, state.valueType, state.timeAggregationMode, currentVisibleIndex);
        if (newChartEl) root.appendChild(newChartEl);
        const newButtonsEl = createChartButtons(originalIndex, state, currentVisibleIndex);
        if (newButtonsEl) root.appendChild(newButtonsEl);
    }
}

function createChartButtons(originalIndex, state, visibleIndex) {
    const chartConfig = chartsData[originalIndex];
    if (!chartConfig || !chartConfig.chart) return null;

    const chartType = chartConfig.chart.chartType;
    const posString = calculatePosition(visibleIndex, chartType);
    let [x, y, z] = posString.split(' ').map(parseFloat);

    if (chartType === "babia-pie") { y = POSITION_CONFIG.baseY + POSITION_CONFIG.pieOffsetY; }
    else if (chartType === "babia-bubbles") { y = POSITION_CONFIG.baseY + POSITION_CONFIG.bubbleOffsetY; }
    else { y = POSITION_CONFIG.baseY; }

    const buttonsContainer = document.createElement('a-entity');
    buttonsContainer.setAttribute('position', `${x - 4} ${y + 3} ${z}`);
    buttonsContainer.setAttribute('data-buttons-index', originalIndex);
    let buttonVerticalOffset = 0;

    const timeAggButton = document.createElement('a-entity');
    timeAggButton.setAttribute('geometry', 'primitive: box; width: 2.8; height: 0.6; depth: 0.1');
    timeAggButton.setAttribute('material', 'color: #2196F3');
    timeAggButton.setAttribute('position', `0 ${buttonVerticalOffset} 0`);
    const timeAggText = document.createElement('a-text');
    timeAggText.setAttribute('value', TIME_TYPES[state.timeAggregationMode] ? TIME_TYPES[state.timeAggregationMode].label : 'Agregação');
    timeAggText.setAttribute('position', '0 0 0.06'); timeAggText.setAttribute('align', 'center'); timeAggText.setAttribute('color', 'white'); timeAggText.setAttribute('width', '3.5');
    timeAggButton.appendChild(timeAggText);
    timeAggButton.setAttribute('class', 'clickable');
    timeAggButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleChartTimeType(originalIndex);
    });
    buttonsContainer.appendChild(timeAggButton);
    buttonVerticalOffset -= 0.8;

    let showProductToggleButton = false;
    let kpisMarkedByProductAndHaveData = false;
    if (chartConfig.kpiReferences.length > 0) {
        const isAnyKpiByProduct = chartConfig.kpiReferences.some(ref => {
            const kpiEntry = allKpiHistory.find(item => (item.KPIId !== undefined ? item.KPIId : item.KpiId) === ref.id);
            return kpiEntry && kpiEntry.ByProduct === true;
        });

        if (isAnyKpiByProduct) {
            for (const ref of chartConfig.kpiReferences) {
                const kpiEntryForRef = allKpiHistory.find(item => (item.KPIId !== undefined ? item.KPIId : item.KpiId) === ref.id);
                if (kpiEntryForRef && kpiEntryForRef.ByProduct === true) {
                    if (hasValidData(allKpiHistory, ref.id, 'NewValue_1') && hasValidData(allKpiHistory, ref.id, 'NewValue_2')) {
                        kpisMarkedByProductAndHaveData = true;
                        break;
                    }
                }
            }
        }
    }
    showProductToggleButton = kpisMarkedByProductAndHaveData;

    if (showProductToggleButton) {
        const valueButton = document.createElement('a-entity');
        valueButton.setAttribute('geometry', 'primitive: box; width: 2.8; height: 0.6; depth: 0.1');
        valueButton.setAttribute('material', `color: ${state.valueType === 'NewValue_1' ? '#4CAF50' : '#FF9800'}`);
        valueButton.setAttribute('position', `0 ${buttonVerticalOffset} 0`);
        const valueText = document.createElement('a-text');
        valueText.setAttribute('value', state.valueType === 'NewValue_1' ? 'Produto 1' : 'Produto 2');
        valueText.setAttribute('position', '0 0 0.06'); valueText.setAttribute('align', 'center'); valueText.setAttribute('color', 'white'); valueText.setAttribute('width', '3.5');
        valueButton.appendChild(valueText);
        valueButton.setAttribute('class', 'clickable');
        valueButton.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleChartValue(originalIndex);
        });
        buttonsContainer.appendChild(valueButton);
        buttonVerticalOffset -= 0.8;
    }

    const timePoints = chartConfig.availableTimePointsByMode[state.timeAggregationMode];
    const atStart = !timePoints || timePoints.length === 0 || state.currentTimePointIndex <= 0;
    const atEnd = !timePoints || timePoints.length === 0 || state.currentTimePointIndex >= timePoints.length - 1;

    const prevButton = document.createElement('a-entity');
    prevButton.setAttribute('geometry', 'primitive: box; width: 1.3; height: 0.6; depth: 0.1');
    prevButton.setAttribute('material', `color: ${atStart ? '#9E9E9E' : '#607D8B'}`);
    prevButton.setAttribute('position', `-0.75 ${buttonVerticalOffset} 0`);
    const prevText = document.createElement('a-text');
    prevText.setAttribute('value', '<');
    prevText.setAttribute('position', '0 0 0.06'); prevText.setAttribute('align', 'center'); prevText.setAttribute('color', 'white'); prevText.setAttribute('width', '3');
    prevButton.appendChild(prevText);
    if (!atStart) {
        prevButton.setAttribute('class', 'clickable');
        prevButton.addEventListener('click', (event) => {
            event.stopPropagation();
            navigateTime(originalIndex, 'prev');
        });
    }
    buttonsContainer.appendChild(prevButton);

    const nextButton = document.createElement('a-entity');
    nextButton.setAttribute('geometry', 'primitive: box; width: 1.3; height: 0.6; depth: 0.1');
    nextButton.setAttribute('material', `color: ${atEnd ? '#9E9E9E' : '#607D8B'}`);
    nextButton.setAttribute('position', `0.75 ${buttonVerticalOffset} 0`);
    const nextText = document.createElement('a-text');
    nextText.setAttribute('value', '>');
    nextText.setAttribute('position', '0 0 0.06'); nextText.setAttribute('align', 'center'); nextText.setAttribute('color', 'white'); nextText.setAttribute('width', '3');
    nextButton.appendChild(nextText);
    if (!atEnd) {
        nextButton.setAttribute('class', 'clickable');
        nextButton.addEventListener('click', (event) => {
            event.stopPropagation();
            navigateTime(originalIndex, 'next');
        });
    }
    buttonsContainer.appendChild(nextButton);

    return buttonsContainer;
}

function createChart(chartConfigData, originalIndex, valueType, timeAggregationMode, visibleIndex) {
    const { chart } = chartConfigData;
    if (!chart) return null;

    const chartContainer = document.createElement('a-entity');
    chartContainer.setAttribute('position', calculatePosition(visibleIndex, chart.chartType));
    chartContainer.setAttribute('data-chart-index', originalIndex);

    const chartDataForBabia = getChartDataForCurrentState(originalIndex);
    const state = chartStates[originalIndex];
    const timePoints = chartConfigData.availableTimePointsByMode[state.timeAggregationMode];
    
    let currentTimeDisplayLabel = state.timeAggregationMode;
    if (timePoints && timePoints.length > 0 && state.currentTimePointIndex < timePoints.length) {
        const rawTimeLabel = timePoints[state.currentTimePointIndex];
        currentTimeDisplayLabel = (state.timeAggregationMode === 'byChange') ? rawTimeLabel.substring(0, 16) : rawTimeLabel;
    }

    const mainTitle = chart.graphname || 'Gráfico';
    let subTitle = `(${state.valueType === 'NewValue_1' ? 'P1' : 'P2'} - ${currentTimeDisplayLabel})`;
    
    if (chart.chartType === 'babia-bubbles') {
         subTitle = `(${state.valueType === 'NewValue_1' ? 'P1' : 'P2'})`;
         if(timeAggregationMode !== 'byChange'){
            subTitle += ` - ${currentTimeDisplayLabel}`;
         }
    }

    const babiaCommonConfig = `legend: true; axis: true; tooltip: true; animation: false; showInfo: true; showInfoColor: #FFFFFF; titleColor: #FFFFFF; titleFont: #optimerBoldFont;`;
    let babiaSpecificConfig = "";
    let titleY = 5, titleX = 0;

    if (chart.chartType === "babia-bars") {
        titleY = 12;
        const title = `${mainTitle} ${subTitle}`;
        babiaSpecificConfig = `palette: commerce; title: ${title}; titlePosition: ${titleX} ${titleY} 0; heightMax: 10; x_axis: key; height: height; data: ${JSON.stringify(chartDataForBabia)}`;
        chartContainer.setAttribute('babia-bars', `${babiaCommonConfig} ${babiaSpecificConfig}`);
    } else if (chart.chartType === "babia-pie") {
        const title = `${mainTitle} ${subTitle}`;
        const titleEl = document.createElement('a-text');
        titleEl.setAttribute('value', title);
        titleEl.setAttribute('position', `0 ${POSITION_CONFIG.pieOffsetY + 2} 0`);
        titleEl.setAttribute('align', 'center'); titleEl.setAttribute('color', '#FFFFFF'); titleEl.setAttribute('width', '6');
        chartContainer.appendChild(titleEl);

        const pieEl = document.createElement('a-entity');
        babiaSpecificConfig = `palette: commerce; key: key; size: size; data: ${JSON.stringify(chartDataForBabia)}`;
        const pieCommon = `legend: true; tooltip: true; animation: false; showInfo: true; showInfoColor: #FFFFFF;`;
        pieEl.setAttribute('babia-pie', `${pieCommon} ${babiaSpecificConfig}`);
        pieEl.setAttribute('rotation', '90 0 0');
        pieEl.setAttribute('scale', '1.5 1.5 1.5');
        chartContainer.appendChild(pieEl);
    } else if (chart.chartType === "babia-bubbles") {
        chartContainer.setAttribute('scale', BUBBLE_CHART_CONTAINER_SCALE);
        const title = `${mainTitle} ${subTitle}`;
        
        const filteredBubbleData = chartDataForBabia.filter(d => d.height > 0);
        if (filteredBubbleData.length === 0) {
            filteredBubbleData.push({ key: 'Sem dados', key2: '', height: 0, radius: 0, originalHeight: 0 });
        }
        const scaleYFactor = parseFloat(BUBBLE_CHART_CONTAINER_SCALE.split(" ")[1] || 1);
        titleY = (BUBBLE_CHART_VISUAL_HEIGHT_MAX / scaleYFactor) + (2 / scaleYFactor);

        babiaSpecificConfig = `x_axis: key; z_axis: key2; height: height; radius: radius; palette: foxy; title: ${title}; titlePosition: ${titleX} ${titleY} 0; heightMax: ${BUBBLE_CHART_VISUAL_HEIGHT_MAX}; radiusMax: ${CONSTANT_BUBBLE_RADIUS}; data: ${JSON.stringify(filteredBubbleData)}`;
        chartContainer.setAttribute('babia-bubbles', `${babiaCommonConfig} ${babiaSpecificConfig}`);
    } else if (chart.chartType === "babia-cyls") {
        chartContainer.setAttribute('scale', CYLINDER_CHART_CONTAINER_SCALE);
        const title = `${mainTitle} ${subTitle}`;
        
        const scaleYFactorCyl = parseFloat(CYLINDER_CHART_CONTAINER_SCALE.split(" ")[1] || 1);
        titleY = (CYLINDER_VISUAL_HEIGHT_MAX / scaleYFactorCyl) + (2 / scaleYFactorCyl) ;

        babiaSpecificConfig = `palette: ubuntu; title: ${title}; titlePosition: ${titleX} ${titleY} 0; heightMax: ${CYLINDER_VISUAL_HEIGHT_MAX}; radiusMax: ${CONSTANT_CYLINDER_RADIUS}; x_axis: key; height: height; radius: radius; data: ${JSON.stringify(chartDataForBabia)}`;
        chartContainer.setAttribute('babia-cyls', `${babiaCommonConfig} ${babiaSpecificConfig}`);
    }
    return chartContainer;
}

function getLatestValueForKPI(kpiId, productValueType, targetDateStr, timeAggregationMode, kpiHistorySource) {
    const historyForKPI = kpiHistorySource.filter(item => (item.KPIId !== undefined ? item.KPIId : item.KpiId) === kpiId);
    if (historyForKPI.length === 0) return 0;

    let relevantEntries = [];
    
    if (timeAggregationMode === 'byChange') {
        const exactMatchEntry = historyForKPI.find(e => e.ChangedAt === targetDateStr);
        if (exactMatchEntry) {
            return safeParseFloat(exactMatchEntry[productValueType]);
        }
        relevantEntries = historyForKPI
            .filter(e => new Date(e.ChangedAt) <= new Date(targetDateStr))
            .sort((a, b) => new Date(b.ChangedAt) - new Date(a.ChangedAt));
    } else {
        relevantEntries = historyForKPI
            .filter(e => e.ChangedAt.substring(0, targetDateStr.length) === targetDateStr)
            .sort((a, b) => new Date(b.ChangedAt) - new Date(a.ChangedAt));
        
        if(relevantEntries.length === 0) {
            const periodStartDate = new Date(targetDateStr);
            relevantEntries = historyForKPI
                .filter(e => new Date(e.ChangedAt) < periodStartDate)
                .sort((a, b) => new Date(b.ChangedAt) - new Date(a.ChangedAt));
        }
    }
    return relevantEntries.length > 0 ? safeParseFloat(relevantEntries[0][productValueType]) : 0;
}

function getChartDataForCurrentState(originalIndex) {
    const chartConfigContainer = chartsData[originalIndex];
    const state = chartStates[originalIndex];
    if (!chartConfigContainer || !state) return [];

    const { kpiReferences, availableTimePointsByMode, kpihistory, chart } = chartConfigContainer;
    const { timeAggregationMode, currentTimePointIndex, valueType } = state;

    const timePoints = availableTimePointsByMode[timeAggregationMode];
    let currentTargetTimeStr = "";

    if (!timePoints || timePoints.length === 0 || currentTimePointIndex < 0 || currentTimePointIndex >= timePoints.length) {
        if (kpiReferences.length === 0) return [];
        return kpiReferences.map(ref => ({
            key: `${ref.name} (${ref.unit})`,
            height: 0,
            radius: chart.chartType === 'babia-cyls' ? CONSTANT_CYLINDER_RADIUS : undefined
        }));
    }
    
    currentTargetTimeStr = timePoints[currentTimePointIndex];
    const processedData = [];

    if (chart.chartType === 'babia-bubbles') {
        kpiReferences.forEach(refKPI => {
            const kpiId = refKPI.id;
            const historyForThisKPIInChart = kpihistory.filter(item => (item.KPIId !== undefined ? item.KPIId : item.KpiId) === kpiId);

            let entriesForCurrentTimePoint = [];
            if (timeAggregationMode === 'byChange') {
                entriesForCurrentTimePoint = historyForThisKPIInChart.filter(e => e.ChangedAt === currentTargetTimeStr);
            } else {
                entriesForCurrentTimePoint = historyForThisKPIInChart.filter(e => e.ChangedAt.startsWith(currentTargetTimeStr));
            }

            entriesForCurrentTimePoint.forEach(entry => {
                const val = safeParseFloat(entry[valueType]);
                let timeKeyForBubbleDisplay = currentTargetTimeStr;
                if (timeAggregationMode === 'byChange') {
                    timeKeyForBubbleDisplay = entry.ChangedAt.substring(0, 16);
                }

                processedData.push({
                    key: timeKeyForBubbleDisplay,
                    key2: `${refKPI.name} (${refKPI.unit})`,
                    height: val,
                    originalHeight: val,
                    radius: CONSTANT_BUBBLE_RADIUS
                });
            });
        });
    } else {
        kpiReferences.forEach(refKPI => {
            const kpiId = refKPI.id;
            const value = getLatestValueForKPI(kpiId, valueType, currentTargetTimeStr, timeAggregationMode, kpihistory);
            const dataPoint = { key: `${refKPI.name} (${refKPI.unit})` };
            if (chart.chartType === 'babia-pie') {
                dataPoint.size = Math.max(0, value);
            } else {
                dataPoint.height = value;
            }
            if (chart.chartType === 'babia-cyls') {
                dataPoint.radius = CONSTANT_CYLINDER_RADIUS;
            }
            processedData.push(dataPoint);
        });
    }
    return processedData;
}

function clearCharts() {
    if (!root) return;
    while (root.firstChild) {
        const child = root.firstChild;
        const chartIndexStr = child.dataset.chartIndex;
        if (chartIndexStr !== undefined) {
            const chartIndex = parseInt(chartIndexStr);
            if (chartsData && chartsData[chartIndex] && chartsData[chartIndex].chart && child.components[chartsData[chartIndex].chart.chartType]) {
                try {
                    child.removeAttribute(chartsData[chartIndex].chart.chartType);
                } catch (e) { console.warn("Error removing component during clear:", e); }
            }
        }
        root.removeChild(child);
    }
    chartsData = [];
    chartStates = {};
    kpiMetadataCache = {};
    allKpiHistory = [];
}

function initializeAllChartDataAndStates(rawChartsConfig, rawKpiHistory) {
    allKpiHistory = rawKpiHistory;
    kpiMetadataCache = {};

    const newChartsData = [];
    const newChartStates = {};

    rawChartsConfig.forEach((chartInfo, originalIndex) => {
        const kpiRefs = [];
        const { kpi1Name, kpi2Name } = parseGraphname(chartInfo.graphname);

        if (chartInfo.zAxis) {
            const kpiId1 = parseInt(chartInfo.zAxis);
            kpiRefs.push({
                id: kpiId1, name: kpi1Name || `KPI ${kpiId1}`,
                unit: getUnitForKPI(kpiId1, allKpiHistory), axisBinding: 'zAxis'
            });
        }
        if (chartInfo.yAxis && kpi2Name) {
            const kpiId2 = parseInt(chartInfo.yAxis);
            kpiRefs.push({
                id: kpiId2, name: kpi2Name || `KPI ${kpiId2}`,
                unit: getUnitForKPI(kpiId2, allKpiHistory), axisBinding: 'yAxis'
            });
        }
        
        const kpiIdsForChart = kpiRefs.map(ref => ref.id);
        const relevantKpiHistory = allKpiHistory.filter(entry => kpiIdsForChart.includes(entry.KPIId !== undefined ? entry.KPIId : entry.KpiId));

        const availableTimePointsByMode = { years: [], months: [], days: [], byChange: [] };
        const yearSet = new Set(), monthSet = new Set(), daySet = new Set(), changeSet = new Set();

        relevantKpiHistory.forEach(entry => {
            const date = new Date(entry.ChangedAt);
            yearSet.add(date.getFullYear().toString());
            monthSet.add(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
            daySet.add(date.toISOString().split('T')[0]);
            changeSet.add(entry.ChangedAt);
        });

        availableTimePointsByMode.years = Array.from(yearSet).sort((a, b) => new Date(a) - new Date(b));
        availableTimePointsByMode.months = Array.from(monthSet).sort((a, b) => new Date(a) - new Date(b));
        availableTimePointsByMode.days = Array.from(daySet).sort((a, b) => new Date(a) - new Date(b));
        availableTimePointsByMode.byChange = Array.from(changeSet).sort((a, b) => new Date(a) - new Date(b));

        newChartsData[originalIndex] = {
            kpihistory: relevantKpiHistory, chart: chartInfo,
            originalIndex: originalIndex, kpiReferences: kpiRefs,
            availableTimePointsByMode: availableTimePointsByMode
        };
        
        const initialTimeAggregationMode = JSON_TIME_MAPPING[chartInfo.xAxis || chartInfo.timeUnit] || 'years';
        const timePointsForInitialMode = availableTimePointsByMode[initialTimeAggregationMode] || [];

        newChartStates[originalIndex] = {
            valueType: 'NewValue_1', timeAggregationMode: initialTimeAggregationMode,
            currentTimePointIndex: Math.max(0, timePointsForInitialMode.length - 1),
            kpiIds: kpiIdsForChart
        };
    });
    chartsData = newChartsData;
    chartStates = newChartStates;
}


function renderAllCharts() {
    if (!root) {
        console.error("A-Frame scene root for charts not found!");
        return;
    }
    // Clear previous charts visually, but state is already initialized
    while (root.firstChild) {
        root.removeChild(root.firstChild);
    }
    
    let visibleChartIndex = 0;
    chartsData.forEach((chartConfig, originalIndex) => {
        if (!chartConfig.chart || !allKpiHistory || !chartConfig.kpiReferences) {
             console.warn(`Skipping chart index ${originalIndex} due to missing config.`);
             return;
        }

        let chartHasAnyData = chartConfig.kpiReferences.some(ref => 
            hasValidData(allKpiHistory, ref.id, 'NewValue_1') || hasValidData(allKpiHistory, ref.id, 'NewValue_2')
        );

        if (chartHasAnyData) {
            const state = chartStates[originalIndex];
            if (!state) {
                console.warn(`State not found for chart index ${originalIndex}. Skipping render.`);
                return;
            }

            let isByProductChart = chartConfig.kpiReferences.some(ref => {
                const kpiEntry = allKpiHistory.find(item => (item.KPIId !== undefined ? item.KPIId : item.KpiId) === ref.id);
                return kpiEntry && kpiEntry.ByProduct === true;
            });

            if (isByProductChart && chartConfig.kpiReferences.length > 0) {
                const primaryKpiId = chartConfig.kpiReferences[0].id;
                const currentProductHasData = hasValidData(allKpiHistory, primaryKpiId, state.valueType);
                if (!currentProductHasData) {
                    const otherValueType = state.valueType === 'NewValue_1' ? 'NewValue_2' : 'NewValue_1';
                    if (hasValidData(allKpiHistory, primaryKpiId, otherValueType)) {
                        state.valueType = otherValueType;
                    }
                }
            }
            
            const el = createChart(chartConfig, originalIndex, state.valueType, state.timeAggregationMode, visibleChartIndex);
            if (el) root.appendChild(el);
            
            const buttonsEl = createChartButtons(originalIndex, state, visibleChartIndex);
            if (buttonsEl) root.appendChild(buttonsEl);
            
            visibleChartIndex++;
        } else {
            console.warn(`Chart "${chartConfig.chart.graphname}" (Index ${originalIndex}) will not be rendered as it has no valid data.`);
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
            if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0].config === 'object' &&
                Array.isArray(data[0].config.kpihistory) && Array.isArray(data[0].config.charts)) {
                return data;
            }
            throw new Error('Estrutura de dados da API inválida.');
        } catch (error) {
            console.error(`Tentativa ${attempt} falhou: ${error.message}`);
            if (attempt === retries) {
                throw error;
            }
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
        clearCharts(); // Clear everything before loading new data

        try {
            console.log(`Initializing application for room: ${currentRoom}...`);
            const apiDataArray = await fetchDataFromAPI(currentRoom);

            const config = apiDataArray[0].config;
            const kpihistoryFromConfig = config.kpihistory;
            const chartsFromConfig = config.charts;

            if (!kpihistoryFromConfig || !chartsFromConfig) {
                throw new Error('Missing kpihistory or charts in API response config.');
            }

            if (chartsFromConfig.length === 0) {
                console.warn('Nenhum gráfico encontrado nos dados para esta sala.');
            } else {
                // *** NEW INITIALIZATION AND RENDERING FLOW ***
                initializeAllChartDataAndStates(chartsFromConfig, kpihistoryFromConfig);
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

    if (sceneEl && !sceneEl.is('vr-mode')) {
        showRoomSelector();
    }
}

// --- END: NEW/MODIFIED CODE INTEGRATION ---

window.addEventListener('load', () => {
    console.log('Page loaded, starting application...');
    const closeBtn = document.getElementById('closeErrorAndEnterBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeErrorAndEnterEnvironment);
    }
    const retryBtn = document.getElementById('retryConnectionBtn');
    if(retryBtn) {
        retryBtn.addEventListener('click', retryConnection);
    }

    initializeApp(true);
});

if (sceneEl) {
    sceneEl.addEventListener('loaded', () => {
        console.log('A-Frame scene loaded');
    });
}
