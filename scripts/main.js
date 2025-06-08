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
const sceneEnvironment = document.getElementById('scene-environment');

// API Configuration
const API_BASE_URL = 'https://modsi-api-ffhhfgecfdehhscv.spaincentral-01.azurewebsites.net/api/Room/Get/';
const API_CODE = 'z4tKbNFdaaXzHZ4ayn9pRQokNWYgRkbVkCjOxTxP-8ChAzFuMigGCw==';

let currentRoom = 'LD5RU';
let isCollapsed = false;

// --- START: Room Connection and UI Management (Unchanged) ---
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
        window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}${window.location.hash}`);
    } else if (room) {
        room = room.toUpperCase();
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
        setTimeout(() => { if (roomStatus) roomStatus.style.display = 'none'; }, 3000);
    }
}

function toggleRoomSelector() {
    isCollapsed = !isCollapsed;
    updateRoomSelectorCollapsedState();
}

function hideRoomSelector() { if (roomSelector) roomSelector.classList.add('hidden'); }
function showRoomSelector() { if (roomSelector) roomSelector.classList.remove('hidden'); }

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
}

function retryConnection() {
    showError(false);
    initializeApp(true);
}

if (minimizeBtn) minimizeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleRoomSelector(); });
if (roomSelector) roomSelector.addEventListener('click', (e) => { if (isCollapsed && e.target === roomSelector) toggleRoomSelector(); });
if (connectBtn) {
    connectBtn.addEventListener('click', () => {
        const newRoom = roomInput.value.trim().toUpperCase();
        if (newRoom) connectToRoom(newRoom); else showRoomStatus('Por favor, insira um código de sala.', 'error');
    });
}
if (roomInput) roomInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') if(connectBtn) connectBtn.click(); });

async function connectToRoom(newRoomCode) {
    if (!newRoomCode) { showRoomStatus('Código da sala não pode ser vazio.', 'error'); return; }
    currentRoom = newRoomCode;
    syncRoomUI(currentRoom);
    isCollapsed = false;
    updateRoomSelectorCollapsedState();

    const url = new URL(window.location);
    url.searchParams.set('room', currentRoom);
    url.searchParams.delete('code');
    window.history.pushState({}, '', url.toString());

    showRoomStatus(`Conectando à sala ${currentRoom}...`, 'loading');
    if(connectBtn) connectBtn.disabled = true;
    await initializeApp(true);
    if (errorOverlay && !errorOverlay.classList.contains('visible')) {
        showRoomStatus(`Conectado à sala ${currentRoom} com sucesso!`, 'success');
    } else {
        showRoomStatus(`Falha ao carregar sala ${currentRoom}.`, 'error');
    }
    if(connectBtn) connectBtn.disabled = false;
}

function handleFullscreenChange() {
    const sceneEl = document.querySelector('a-scene');
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (isFullscreen || (sceneEl && sceneEl.is('vr-mode'))) hideRoomSelector(); else showRoomSelector();
}

document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
const sceneEl = document.querySelector('a-scene');
if (sceneEl) {
    sceneEl.addEventListener('enter-vr', () => { hideRoomSelector(); if (sceneEnvironment) sceneEnvironment.setAttribute('visible', true); });
    sceneEl.addEventListener('exit-vr', () => showRoomSelector());
}
// --- END: Room Connection and UI Management ---


// --- START: HYBRID CHART LOGIC ---

// Configuration
const POSITION_CONFIG = { startX: -10, baseY: 1.5, baseZ: 0, spacingX: 12, pieOffsetY: 3, bubbleOffsetY: 1, cylinderOffsetY: 0 };
const TIME_TYPES = {
    'years': { label: 'Anos', next: 'months' },
    'months': { label: 'Meses', next: 'days' },
    'days': { label: 'Dias', next: 'byChange' },
    'byChange': { label: 'Por Alteracao', next: 'years' }
};
const JSON_TIME_MAPPING = {
    'Year': 'years', 'Month': 'months', 'Day': 'days', 'change': 'byChange',
    'year': 'years', 'month': 'months', 'day': 'days', 'years': 'years', 'months': 'months', 'days': 'days'
};

const CONSTANT_BUBBLE_RADIUS = 0.5;
const BUBBLE_CHART_VISUAL_HEIGHT_MAX = 8;
const BUBBLE_CHART_CONTAINER_SCALE = "0.9 0.9 0.9";
const CONSTANT_CYLINDER_RADIUS = 0.80;
const CYLINDER_CHART_CONTAINER_SCALE = "1 1 1";
const CYLINDER_VISUAL_HEIGHT_MAX = 10;

// Global state
let chartsData = [];
let chartStates = {};
let kpiMetadataCache = {};
let allKpiHistory = [];

// --- Utility Functions ---
function safeParseFloat(valueStr) {
    if (valueStr == null || String(valueStr).trim() === "") return 0;
    const value = parseFloat(valueStr);
    return isNaN(value) ? 0 : value;
}

function getUnitForKPI(kpiId) {
    if (kpiMetadataCache[kpiId] && kpiMetadataCache[kpiId].unit) return kpiMetadataCache[kpiId].unit;
    const entry = allKpiHistory.find(item => (item.KPIId ?? item.KpiId) == kpiId && item.Unit);
    const unit = entry ? entry.Unit : '';
    if (!kpiMetadataCache[kpiId]) kpiMetadataCache[kpiId] = {};
    kpiMetadataCache[kpiId].unit = unit;
    return unit;
}

function parseGraphname(graphname) {
    const parts = graphname.split(/\s+vs\s+/i);
    return parts.length === 2
        ? { kpi1Name: parts[0].trim(), kpi2Name: parts[1].trim() }
        : { kpi1Name: graphname.trim(), kpi2Name: null };
}

function hasValidData(kpiHistorySource, targetKPIId, valueType) {
    return kpiHistorySource
        .filter(item => (item.KPIId ?? item.KpiId) == targetKPIId)
        .some(item => {
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

// --- Data Processing for TIME-SERIES Charts (Original Logic) ---
function processKPIData(kpihistory, targetKPIId, timeAggregationMode, valueType = 'NewValue_1') {
    const kpiData = kpihistory.filter(item => (item.KPIId ?? item.KpiId) == targetKPIId);
    const finalData = [];

    if (timeAggregationMode === 'byChange') {
        const sortedKpiData = kpiData.sort((a, b) => new Date(a.ChangedAt) - new Date(b.ChangedAt));
        sortedKpiData.forEach(item => {
            const value = safeParseFloat(valueType === 'NewValue_2' ? item.NewValue_2 : item.NewValue_1);
            if(value !== 0) { // Only show changes
                const date = new Date(item.ChangedAt);
                const timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                finalData.push({ key: timeKey, height: value });
            }
        });
        return finalData;
    }

    const dataByTimeKey = {};
    kpiData.forEach(item => {
        const date = new Date(item.ChangedAt);
        let timeKey;
        if (timeAggregationMode === 'years') timeKey = date.getFullYear().toString();
        else if (timeAggregationMode === 'months') timeKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        else if (timeAggregationMode === 'days') timeKey = date.toISOString().split('T')[0];
        else timeKey = date.getFullYear().toString();
        if (!dataByTimeKey[timeKey]) dataByTimeKey[timeKey] = [];
        dataByTimeKey[timeKey].push({ ...item, parsedDate: date });
    });

    Object.keys(dataByTimeKey).sort().forEach(timeKey => {
        const mostRecent = dataByTimeKey[timeKey].sort((a, b) => b.parsedDate - a.parsedDate)[0];
        const value = safeParseFloat(valueType === 'NewValue_2' ? mostRecent.NewValue_2 : mostRecent.NewValue_1);
        finalData.push({ key: timeKey, height: value });
    });
    return finalData;
}

function processPieData(kpihistory, targetKPIId, timeAggregationMode, valueType) {
    return processKPIData(kpihistory, targetKPIId, timeAggregationMode, valueType).map(item => ({ key: item.key, size: item.height }));
}

// --- Data Processing for CORRELATION Charts (New Logic) ---
function getLatestValueForKPI(kpiId, productValueType, targetDateStr, timeAggregationMode, kpiHistorySource) {
    const historyForKPI = kpiHistorySource.filter(item => (item.KPIId ?? item.KpiId) === kpiId);
    if (historyForKPI.length === 0) return 0;

    let relevantEntries;
    if (timeAggregationMode === 'byChange') {
        relevantEntries = historyForKPI.filter(e => new Date(e.ChangedAt) <= new Date(targetDateStr));
    } else {
        const periodStartDate = new Date(targetDateStr);
        let periodEndDate = new Date(periodStartDate);
        if(timeAggregationMode === 'years') periodEndDate.setFullYear(periodStartDate.getFullYear() + 1);
        else if(timeAggregationMode === 'months') periodEndDate.setMonth(periodStartDate.getMonth() + 1);
        else if(timeAggregationMode === 'days') periodEndDate.setDate(periodStartDate.getDate() + 1);

        relevantEntries = historyForKPI.filter(e => new Date(e.ChangedAt) < periodEndDate);
    }
    
    const sorted = relevantEntries.sort((a, b) => new Date(b.ChangedAt) - new Date(a.ChangedAt));
    return sorted.length > 0 ? safeParseFloat(sorted[0][productValueType]) : 0;
}

function getCorrelationChartDataForState(originalIndex) {
    const chartConfigContainer = chartsData[originalIndex];
    const state = chartStates[originalIndex];
    if (!chartConfigContainer || !state) return [];

    const { kpiReferences, availableTimePointsByMode, kpihistory, chart } = chartConfigContainer;
    const { timeAggregationMode, currentTimePointIndex, valueType } = state;
    const timePoints = availableTimePointsByMode[timeAggregationMode];

    if (!timePoints || timePoints.length === 0 || currentTimePointIndex < 0 || currentTimePointIndex >= timePoints.length) {
        return kpiReferences.map(ref => ({ key: `${ref.name} (${ref.unit})`, height: 0, radius: chart.chartType === 'babia-cyls' ? CONSTANT_CYLINDER_RADIUS : undefined }));
    }

    const currentTargetTimeStr = timePoints[currentTimePointIndex];
    return kpiReferences.map(refKPI => {
        const value = getLatestValueForKPI(refKPI.id, valueType, currentTargetTimeStr, timeAggregationMode, kpihistory);
        const dataPoint = { key: `${refKPI.name} (${refKPI.unit})` };
        if (chart.chartType === 'babia-pie') dataPoint.size = Math.max(0, value);
        else dataPoint.height = value;
        if (chart.chartType === 'babia-cyls') dataPoint.radius = CONSTANT_CYLINDER_RADIUS;
        return dataPoint;
    });
}

// --- Chart Rendering and State Controls ---
function toggleChartValue(originalIndex) {
    if (!chartStates[originalIndex]) return;
    chartStates[originalIndex].valueType = chartStates[originalIndex].valueType === 'NewValue_1' ? 'NewValue_2' : 'NewValue_1';
    renderSingleChart(originalIndex);
}

function toggleChartTimeType(originalIndex) {
    if (!chartStates[originalIndex]) return;
    const state = chartStates[originalIndex];
    state.timeAggregationMode = TIME_TYPES[state.timeAggregationMode].next;

    if (chartsData[originalIndex].isCorrelationChart) {
        const timePointsForNewMode = chartsData[originalIndex].availableTimePointsByMode[state.timeAggregationMode] || [];
        state.currentTimePointIndex = Math.max(0, timePointsForNewMode.length - 1);
    }
    renderSingleChart(originalIndex);
}

function navigateTime(originalIndex, direction) {
    const state = chartStates[originalIndex];
    const chartConfig = chartsData[originalIndex];
    const timePoints = chartConfig.availableTimePointsByMode[state.timeAggregationMode];
    if (!timePoints || timePoints.length === 0) return;

    let newIndex = state.currentTimePointIndex;
    if (direction === 'prev') newIndex = Math.max(0, state.currentTimePointIndex - 1);
    else if (direction === 'next') newIndex = Math.min(timePoints.length - 1, state.currentTimePointIndex + 1);

    if (newIndex !== state.currentTimePointIndex) {
        state.currentTimePointIndex = newIndex;
        renderSingleChart(originalIndex);
    }
}

function renderSingleChart(originalIndex) {
    const chartConfig = chartsData[originalIndex];
    const state = chartStates[originalIndex];
    if (!chartConfig || !state || !root) return;

    let visibleIndex = 0;
    for (let i = 0; i < originalIndex; i++) {
        const prevChartConfig = chartsData[i];
        if (prevChartConfig && prevChartConfig.kpiReferences.some(ref => hasValidData(allKpiHistory, ref.id, 'NewValue_1') || hasValidData(allKpiHistory, ref.id, 'NewValue_2'))) {
            visibleIndex++;
        }
    }

    const existingChart = root.querySelector(`[data-chart-index="${originalIndex}"]`);
    const existingButtons = root.querySelector(`[data-buttons-index="${originalIndex}"]`);
    if (existingChart) existingChart.parentElement.removeChild(existingChart);
    if (existingButtons) existingButtons.parentElement.removeChild(existingButtons);

    // Use a timeout to ensure the DOM is clean before re-adding, preventing A-Frame component race conditions
    setTimeout(() => {
        const chartEl = createChart(chartConfig, originalIndex, visibleIndex);
        if (chartEl) root.appendChild(chartEl);
        const buttonsEl = createChartButtons(chartConfig, originalIndex, visibleIndex);
        if (buttonsEl) root.appendChild(buttonsEl);
    }, 50);
}

function createChartButtons(chartConfig, originalIndex, visibleIndex) {
    const state = chartStates[originalIndex];
    const chartType = chartConfig.chart.chartType;
    const posString = calculatePosition(visibleIndex, chartType);
    let [x, y, z] = posString.split(' ').map(parseFloat);

    // Adjust button container position based on chart type
    if (chartType === "babia-pie") { y = POSITION_CONFIG.baseY + POSITION_CONFIG.pieOffsetY; }
    else if (chartType === "babia-bubbles") { y = POSITION_CONFIG.baseY + POSITION_CONFIG.bubbleOffsetY; }
    else { y = POSITION_CONFIG.baseY; }

    const buttonsContainer = document.createElement('a-entity');
    buttonsContainer.setAttribute('position', `${x - 4} ${y + 3} ${z}`);
    buttonsContainer.setAttribute('data-buttons-index', originalIndex);
    let buttonVerticalOffset = 0;

    // Time Aggregation Button (Always shown)
    const timeAggButton = document.createElement('a-entity');
    timeAggButton.setAttribute('geometry', 'primitive: box; width: 2.8; height: 0.6; depth: 0.1');
    timeAggButton.setAttribute('material', 'color: #2196F3');
    timeAggButton.setAttribute('position', `0 ${buttonVerticalOffset} 0`);
    timeAggButton.innerHTML = `<a-text value="${TIME_TYPES[state.timeAggregationMode].label}" position="0 0 0.06" align="center" color="white" width="3.5"></a-text>`;
    timeAggButton.classList.add('clickable');
    timeAggButton.addEventListener('click', (e) => { e.stopPropagation(); toggleChartTimeType(originalIndex); });
    buttonsContainer.appendChild(timeAggButton);
    buttonVerticalOffset -= 0.8;

    // Product Toggle Button (Shown if data for both products exists for any of the chart's KPIs)
    const hasP1 = chartConfig.kpiReferences.some(ref => hasValidData(allKpiHistory, ref.id, 'NewValue_1'));
    const hasP2 = chartConfig.kpiReferences.some(ref => hasValidData(allKpiHistory, ref.id, 'NewValue_2'));
    if (chartType !== 'babia-bubbles' && hasP1 && hasP2) {
        const valueButton = document.createElement('a-entity');
        valueButton.setAttribute('geometry', 'primitive: box; width: 2.8; height: 0.6; depth: 0.1');
        valueButton.setAttribute('material', `color: ${state.valueType === 'NewValue_1' ? '#4CAF50' : '#FF9800'}`);
        valueButton.setAttribute('position', `0 ${buttonVerticalOffset} 0`);
        valueButton.innerHTML = `<a-text value="${state.valueType === 'NewValue_1' ? 'Produto 1' : 'Produto 2'}" position="0 0 0.06" align="center" color="white" width="3.5"></a-text>`;
        valueButton.classList.add('clickable');
        valueButton.addEventListener('click', (e) => { e.stopPropagation(); toggleChartValue(originalIndex); });
        buttonsContainer.appendChild(valueButton);
        buttonVerticalOffset -= 0.8;
    }

    // --- Time Navigation Buttons (ONLY for correlation charts) ---
    if (chartConfig.isCorrelationChart) {
        const timePoints = chartConfig.availableTimePointsByMode[state.timeAggregationMode];
        const atStart = !timePoints || timePoints.length === 0 || state.currentTimePointIndex <= 0;
        const atEnd = !timePoints || timePoints.length === 0 || state.currentTimePointIndex >= timePoints.length - 1;

        const prevButton = document.createElement('a-entity');
        prevButton.setAttribute('geometry', 'primitive: box; width: 1.3; height: 0.6; depth: 0.1');
        prevButton.setAttribute('material', `color: ${atStart ? '#9E9E9E' : '#607D8B'}`);
        prevButton.setAttribute('position', `-0.75 ${buttonVerticalOffset} 0`);
        prevButton.innerHTML = `<a-text value="<" position="0 0 0.06" align="center" color="white" width="3"></a-text>`;
        if (!atStart) {
            prevButton.classList.add('clickable');
            prevButton.addEventListener('click', (e) => { e.stopPropagation(); navigateTime(originalIndex, 'prev'); });
        }
        buttonsContainer.appendChild(prevButton);

        const nextButton = document.createElement('a-entity');
        nextButton.setAttribute('geometry', 'primitive: box; width: 1.3; height: 0.6; depth: 0.1');
        nextButton.setAttribute('material', `color: ${atEnd ? '#9E9E9E' : '#607D8B'}`);
        nextButton.setAttribute('position', `0.75 ${buttonVerticalOffset} 0`);
        nextButton.innerHTML = `<a-text value=">" position="0 0 0.06" align="center" color="white" width="3"></a-text>`;
        if (!atEnd) {
            nextButton.classList.add('clickable');
            nextButton.addEventListener('click', (e) => { e.stopPropagation(); navigateTime(originalIndex, 'next'); });
        }
        buttonsContainer.appendChild(nextButton);
    }
    return buttonsContainer;
}

function createChart(chartConfig, originalIndex, visibleIndex) {
    const { chart, kpihistory, isCorrelationChart } = chartConfig;
    const state = chartStates[originalIndex];
    if (!chart || !state) return null;

    const chartContainer = document.createElement('a-entity');
    chartContainer.setAttribute('position', calculatePosition(visibleIndex, chart.chartType));
    chartContainer.setAttribute('data-chart-index', originalIndex);

    const productName = state.valueType === 'NewValue_1' ? 'P1' : 'P2';
    const babiaCommonConfig = `legend: true; axis: true; tooltip: true; animation: false; showInfo: true; showInfoColor: #FFFFFF; titleColor: #FFFFFF; titleFont: #optimerBoldFont;`;
    let chartTitle, babiaSpecificConfig, chartDataForBabia;

    // --- LOGIC FORK: Decide which type of chart to build ---
    if (isCorrelationChart) {
        // --- NEW LOGIC: Correlation Chart ---
        const timePoints = chartConfig.availableTimePointsByMode[state.timeAggregationMode];
        const rawTimeLabel = (timePoints && timePoints.length > 0 && state.currentTimePointIndex < timePoints.length) ? timePoints[state.currentTimePointIndex] : 'N/A';
        const currentTimeDisplayLabel = state.timeAggregationMode === 'byChange' ? rawTimeLabel.substring(0, 16) : rawTimeLabel;
        chartTitle = `${chart.graphname} (${productName} - ${currentTimeDisplayLabel})`;
        chartDataForBabia = getCorrelationChartDataForState(originalIndex);
    } else {
        // --- ORIGINAL LOGIC: Time-Series Chart ---
        const timeLabel = TIME_TYPES[state.timeAggregationMode].label;
        chartTitle = `${chart.graphname} (${productName} - ${timeLabel})`;
        const kpiId = chartConfig.kpiReferences[0].id; // Only one KPI for time-series charts
        
        if (chart.chartType === 'babia-pie') {
            chartDataForBabia = processPieData(kpihistory, kpiId, state.timeAggregationMode, state.valueType);
        } else {
            chartDataForBabia = processKPIData(kpihistory, kpiId, state.timeAggregationMode, state.valueType);
        }
    }
    
    // Build Babia component string based on chart type
    if (chart.chartType === "babia-bars") {
        babiaSpecificConfig = `palette: commerce; title: ${chartTitle}; titlePosition: 2 11 0; heightMax: 10; x_axis: key; height: height; data: ${JSON.stringify(chartDataForBabia)}`;
        chartContainer.setAttribute('babia-bars', `${babiaCommonConfig} ${babiaSpecificConfig}`);
    } else if (chart.chartType === "babia-pie") {
        const pieEl = document.createElement('a-entity');
        babiaSpecificConfig = `palette: commerce; key: key; size: size; data: ${JSON.stringify(chartDataForBabia)}`;
        pieEl.setAttribute('babia-pie', `legend: true; tooltip: true; animation: false; showInfo: true; showInfoColor: #FFFFFF; ${babiaSpecificConfig}`);
        pieEl.setAttribute('rotation', '90 0 0'); pieEl.setAttribute('scale', '1.5 1.5 1.5');
        chartContainer.innerHTML = `<a-text value="${chartTitle}" position="0 5 0" align="center" color="#FFFFFF" width="8"></a-text>`;
        chartContainer.appendChild(pieEl);
    } else if (chart.chartType === "babia-cyls") {
        chartContainer.setAttribute('scale', CYLINDER_CHART_CONTAINER_SCALE);
        babiaSpecificConfig = `palette: ubuntu; title: ${chartTitle}; titlePosition: 2 ${CYLINDER_VISUAL_HEIGHT_MAX + 1} 0; heightMax: ${CYLINDER_VISUAL_HEIGHT_MAX}; radiusMax: ${CONSTANT_CYLINDER_RADIUS}; x_axis: key; height: height; radius: radius; data: ${JSON.stringify(chartDataForBabia)}`;
        chartContainer.setAttribute('babia-cyls', `${babiaCommonConfig} ${babiaSpecificConfig}`);
    } // Bubble charts would need a similar logic fork if they can be both time-series and correlation.

    return chartContainer;
}

// --- Main Application Flow ---
function clearCharts() {
    if (root) while (root.firstChild) root.removeChild(root.firstChild);
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
        // *** CRITICAL LOGIC: Determine if it's a correlation chart by checking for a second KPI axis ***
        const isCorrelationChart = !!chartInfo.yAxis;

        const { kpi1Name, kpi2Name } = parseGraphname(chartInfo.graphname);
        const kpiRefs = [];
        if (chartInfo.zAxis) kpiRefs.push({ id: parseInt(chartInfo.zAxis), name: kpi1Name, unit: getUnitForKPI(parseInt(chartInfo.zAxis)) });
        if (isCorrelationChart) kpiRefs.push({ id: parseInt(chartInfo.yAxis), name: kpi2Name, unit: getUnitForKPI(parseInt(chartInfo.yAxis)) });
        
        if (kpiRefs.length === 0) return; // Skip invalid chart configs

        const kpiIdsForChart = kpiRefs.map(ref => ref.id);
        const relevantKpiHistory = allKpiHistory.filter(entry => kpiIdsForChart.includes(entry.KPIId ?? entry.KpiId));

        const availableTimePointsByMode = { years: [], months: [], days: [], byChange: [] };
        const sets = { years: new Set(), months: new Set(), days: new Set(), byChange: new Set() };
        relevantKpiHistory.forEach(entry => {
            const date = new Date(entry.ChangedAt);
            sets.years.add(date.getFullYear().toString());
            sets.months.add(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
            sets.days.add(date.toISOString().split('T')[0]);
            sets.byChange.add(entry.ChangedAt);
        });
        for (const key in sets) {
            availableTimePointsByMode[key] = Array.from(sets[key]).sort((a,b) => new Date(a) - new Date(b));
        }

        newChartsData[originalIndex] = {
            kpihistory: relevantKpiHistory, chart: chartInfo, kpiReferences: kpiRefs,
            isCorrelationChart: isCorrelationChart, availableTimePointsByMode: availableTimePointsByMode
        };
        
        const initialTimeMode = JSON_TIME_MAPPING[chartInfo.xAxis || chartInfo.timeUnit] || 'years';
        const timePoints = availableTimePointsByMode[initialTimeMode] || [];
        newChartStates[originalIndex] = {
            valueType: 'NewValue_1', timeAggregationMode: initialTimeMode,
            currentTimePointIndex: Math.max(0, timePoints.length - 1),
        };
    });
    chartsData = newChartsData;
    chartStates = newChartStates;
}

function renderAllCharts() {
    if (!root) return;
    
    // Visually clear the scene before re-rendering everything
    while (root.firstChild) {
        root.removeChild(root.firstChild);
    }
    
    let visibleChartIndex = 0;
    chartsData.forEach((chartConfig, originalIndex) => {
        const chartHasData = chartConfig.kpiReferences.some(ref => hasValidData(allKpiHistory, ref.id, 'NewValue_1') || hasValidData(allKpiHistory, ref.id, 'NewValue_2'));
        if (chartHasData) {
            const el = createChart(chartConfig, originalIndex, visibleChartIndex);
            if (el) root.appendChild(el);
            const buttonsEl = createChartButtons(chartConfig, originalIndex, visibleChartIndex);
            if (buttonsEl) root.appendChild(buttonsEl);
            visibleChartIndex++;
        } else {
             console.warn(`Chart "${chartConfig.chart.graphname}" will not be rendered as it has no valid data.`);
        }
    });
}

async function fetchDataFromAPI(roomCode, retries = 3) {
    const apiUrl = buildAPIURL(roomCode);
    console.log(`Fetching data from: ${apiUrl}`);
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (!data || !Array.isArray(data) || !data[0]?.config?.kpihistory || !data[0]?.config?.charts) {
                throw new Error('Invalid API data structure');
            }
            return data;
        } catch (error) {
            console.error(`Attempt ${attempt} failed: ${error.message}`);
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

async function initializeApp(attemptLoadFromUrl = true) {
    const roomFromUrl = getRoomFromURL();
    let roomToLoad = attemptLoadFromUrl ? roomFromUrl : null;

    if (roomToLoad) {
        currentRoom = roomToLoad;
        syncRoomUI(currentRoom);
        showLoading(true, currentRoom);
        showError(false);
        clearCharts(); // Fully reset state before loading new room data

        try {
            const apiDataArray = await fetchDataFromAPI(currentRoom);
            const { kpihistory, charts } = apiDataArray[0].config;
            initializeAllChartDataAndStates(charts, kpihistory);
            renderAllCharts();
            isCollapsed = true;
            setTimeout(() => showLoading(false), 500);
        } catch (error) {
            console.error(`Initialization failed for room ${currentRoom}:`, error);
            isCollapsed = false;
            showLoading(false);
            showError(true, `Failed to load data for room ${currentRoom}: ${error.message}`);
        }
    } else {
        isCollapsed = false;
        syncRoomUI(null);
        showLoading(false);
        showError(false);
        clearCharts();
    }
    updateRoomSelectorCollapsedState();
    if (sceneEl && !sceneEl.is('vr-mode')) showRoomSelector();
}

window.addEventListener('load', () => {
    console.log("Page loaded, starting application...");
    document.getElementById('closeErrorAndEnterBtn')?.addEventListener('click', closeErrorAndEnterEnvironment);
    document.getElementById('retryConnectionBtn')?.addEventListener('click', retryConnection);
    initializeApp(true);
});

if (sceneEl) sceneEl.addEventListener('loaded', () => console.log('A-Frame scene loaded'));
