const root = document.getElementById('charts-root');

// --- START: UI and Application Shell (Original Logic) ---

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

let currentRoom = '';
let isCollapsed = false;

function updateRoomSelectorCollapsedState() {
    if (!roomSelector || !minimizeBtn || !collapsedRoomInfo) return;
    roomSelector.classList.toggle('collapsed', isCollapsed);
    minimizeBtn.textContent = isCollapsed ? '+' : '−';
    collapsedRoomInfo.textContent = 'Sala: ' + (currentRoom || 'N/A');
}

function syncRoomUI(roomName) {
    const display = roomName || 'N/A';
    if (roomInput) roomInput.value = roomName ? roomName : '';
    if (currentRoomDisplayLoading) currentRoomDisplayLoading.textContent = display;
    if (collapsedRoomInfo) {
        collapsedRoomInfo.textContent = 'Sala: ' + display;
    }
}

function getRoomFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    let room = urlParams.get('room');
    const codeParam = urlParams.get('code');

    if (codeParam) {
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

function toggleRoomSelector() { isCollapsed = !isCollapsed; updateRoomSelectorCollapsedState(); }
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

// --- END: UI and Application Shell ---


// --- START: Charting Engine ---

const POSITION_SCALING_FACTOR = 2.0;

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

let chartsData = []; 
let chartStates = {}; 
let kpiMetadataCache = {}; 
let allKpiHistory = []; 

function safeParseFloat(valueStr) {
    if (valueStr == null || String(valueStr).trim() === "") return 0;
    const value = parseFloat(valueStr);
    return isNaN(value) ? 0 : value;
}

function isCustomPositionValid(pos) {
    return pos &&
        typeof pos.x === 'number' &&
        typeof pos.y === 'number' &&
        typeof pos.z === 'number';
}

function getUnitForKPI(kpiId) {
    if (kpiMetadataCache[kpiId] && kpiMetadataCache[kpiId].unit) {
        return kpiMetadataCache[kpiId].unit;
    }
    const entry = allKpiHistory.find(item => (item.KPIId ?? item.KpiId) == kpiId && item.Unit);
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

function calculatePosition(visibleChartIndex, chartType = "babia-bars") { 
    const x = POSITION_CONFIG.startX + (visibleChartIndex * POSITION_CONFIG.spacingX);
    let y = POSITION_CONFIG.baseY;

    if (chartType === "babia-pie") y += POSITION_CONFIG.pieOffsetY;
    else if (chartType === "babia-bubbles") y += POSITION_CONFIG.bubbleOffsetY;
    else if (chartType === "babia-cyls") y += POSITION_CONFIG.cylinderOffsetY;
    
    return `${x} ${y} ${POSITION_CONFIG.baseZ}`;
}

function hasValidData(kpiHistorySource, targetKPIId, valueType) {
    const kpiData = kpiHistorySource.filter(item => (item.KPIId ?? item.KpiId) == targetKPIId);
    return kpiData.some(item => {
        const value = (valueType === 'NewValue_2' ? item.NewValue_2 : item.NewValue_1);
        return value != null && String(value).trim() !== "" && !isNaN(parseFloat(value)); 
    });
}

function getLatestValueForKPI(kpiId, productValueType, targetDateStr, timeAggregationMode, kpiHistorySource) {
    const historyForKPI = kpiHistorySource.filter(item => (item.KPIId ?? item.KpiId) === kpiId);
    if (historyForKPI.length === 0) return 0;

    let relevantEntries = [];
    
    if (timeAggregationMode === 'byChange') {
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

    const { kpiReferences, availableTimePointsByMode, kpihistory, chart, isCorrelationChart } = chartConfigContainer; 
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

    if (isCorrelationChart) {
        if (chart.chartType === 'babia-bubbles') {
            kpiReferences.forEach(refKPI => {
                const value = getLatestValueForKPI(refKPI.id, valueType, currentTargetTimeStr, timeAggregationMode, kpihistory);
                if (value > 0) {
                    processedData.push({
                        key: currentTargetTimeStr.substring(0, 16),
                        key2: `${refKPI.name} (${refKPI.unit})`,
                        height: value,
                        radius: CONSTANT_BUBBLE_RADIUS
                    });
                }
            });
        } else { // For bars, cylinders, pies
            kpiReferences.forEach(refKPI => {
                const kpiId = refKPI.id;
                const value = getLatestValueForKPI(kpiId, valueType, currentTargetTimeStr, timeAggregationMode, kpihistory);
                const dataPoint = { key: `${refKPI.name} (${refKPI.unit})` };
                if (chart.chartType === 'babia-pie') dataPoint.size = Math.max(0, value);
                else dataPoint.height = value;
                if (chart.chartType === 'babia-cyls') dataPoint.radius = CONSTANT_CYLINDER_RADIUS;
                processedData.push(dataPoint);
            });
        }
    } else {
        const kpiId = kpiReferences[0].id;
        if (chart.chartType === 'babia-bubbles') {
            const p1Data = getKPIDataByTime(kpihistory, kpiId, timeAggregationMode, 'NewValue_1');
            const p2Data = getKPIDataByTime(kpihistory, kpiId, timeAggregationMode, 'NewValue_2');
            p1Data.forEach(item => { if (item.height > 0) processedData.push({ key: item.key, key2: "produto 1", height: item.height, radius: CONSTANT_BUBBLE_RADIUS }) });
            p2Data.forEach(item => { if (item.height > 0) processedData.push({ key: item.key, key2: "produto 2", height: item.height, radius: CONSTANT_BUBBLE_RADIUS }) });
        } else {
            const rawData = getKPIDataByTime(kpihistory, kpiId, timeAggregationMode, valueType);
            rawData.forEach(item => {
                const dataPoint = { key: item.key };
                if (chart.chartType === 'babia-pie') dataPoint.size = Math.max(0, item.height);
                else dataPoint.height = item.height;
                if (chart.chartType === 'babia-cyls') dataPoint.radius = CONSTANT_CYLINDER_RADIUS;
                processedData.push(dataPoint);
            });
        }
    }
    return processedData;
}

function getKPIDataByTime(kpihistory, targetKPIId, timeAggregationMode, valueType) {
    const kpiData = kpihistory.filter(item => (item.KPIId ?? item.KpiId) == targetKPIId);
    const finalData = [];
    if (timeAggregationMode === 'byChange') {
        const sortedKpiData = kpiData.sort((a, b) => new Date(a.ChangedAt) - new Date(b.ChangedAt));
        sortedKpiData.forEach(item => {
            const value = safeParseFloat(item[valueType]);
            if (value > 0) {
                const date = new Date(item.ChangedAt);
                finalData.push({ key: date.toISOString().substring(0, 16), height: value });
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
        else timeKey = date.toISOString().split('T')[0];
        if (!dataByTimeKey[timeKey]) dataByTimeKey[timeKey] = [];
        dataByTimeKey[timeKey].push({ ...item, parsedDate: date });
    });
    Object.keys(dataByTimeKey).sort().forEach(timeKey => {
        const mostRecent = dataByTimeKey[timeKey].sort((a, b) => b.parsedDate - a.parsedDate)[0];
        const value = safeParseFloat(mostRecent[valueType]);
        finalData.push({ key: timeKey, height: value });
    });
    return finalData;
}

function navigateTime(originalIndex, direction) {
    const state = chartStates[originalIndex];
    const chartConfig = chartsData[originalIndex];
    if (!state || !chartConfig) return;

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

function createChartButtons(originalIndex, state, chartPositionStr) {
    const chartConfig = chartsData[originalIndex];
    if (!chartConfig || !chartConfig.chart) return null;

    const { chart, isCorrelationChart } = chartConfig;
    let [x, y, z] = chartPositionStr.split(' ').map(parseFloat);

    if (chart.chartType === "babia-pie") y = POSITION_CONFIG.baseY + POSITION_CONFIG.pieOffsetY;
    else if (chart.chartType === "babia-bubbles") y = POSITION_CONFIG.baseY + POSITION_CONFIG.bubbleOffsetY;
    else y = POSITION_CONFIG.baseY;

    const buttonsContainer = document.createElement('a-entity');
    buttonsContainer.setAttribute('position', `${x - 4} ${y + 3} ${z}`);
    buttonsContainer.setAttribute('data-buttons-index', originalIndex);
    let buttonVerticalOffset = 0;

    const timeAggButton = document.createElement('a-entity');
    timeAggButton.setAttribute('geometry', 'primitive: box; width: 2.8; height: 0.6; depth: 0.1');
    timeAggButton.setAttribute('material', 'color: #2196F3'); 
    timeAggButton.setAttribute('position', `0 ${buttonVerticalOffset} 0`);
    timeAggButton.innerHTML = `<a-text value="${TIME_TYPES[state.timeAggregationMode].label}" position="0 0 0.06" align="center" color="white" width="3.5"></a-text>`;
    timeAggButton.classList.add('clickable');
    timeAggButton.addEventListener('click', (event) => { event.stopPropagation(); toggleChartTimeType(originalIndex); });
    buttonsContainer.appendChild(timeAggButton);
    buttonVerticalOffset -= 0.8;
    
    const isAnyKpiByProduct = chartConfig.kpiReferences.some(ref => {
        const kpiEntry = allKpiHistory.find(item => (item.KPIId ?? item.KpiId) === ref.id);
        return kpiEntry && kpiEntry.ByProduct === true;
    });

    if (isAnyKpiByProduct) {
        const valueButton = document.createElement('a-entity');
        valueButton.setAttribute('geometry', 'primitive: box; width: 2.8; height: 0.6; depth: 0.1');
        valueButton.setAttribute('material', `color: ${state.valueType === 'NewValue_1' ? '#4CAF50' : '#FF9800'}`); 
        valueButton.setAttribute('position', `0 ${buttonVerticalOffset} 0`);
        valueButton.innerHTML = `<a-text value="${state.valueType === 'NewValue_1' ? 'Produto 1' : 'Produto 2'}" position="0 0 0.06" align="center" color="white" width="3.5"></a-text>`;
        valueButton.classList.add('clickable');
        valueButton.addEventListener('click', (event) => { event.stopPropagation(); toggleChartValue(originalIndex); });
        buttonsContainer.appendChild(valueButton);
        buttonVerticalOffset -= 0.8;
    }
    
    if (isCorrelationChart) {
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
            prevButton.addEventListener('click', (event) => { event.stopPropagation(); navigateTime(originalIndex, 'prev'); });
        }
        buttonsContainer.appendChild(prevButton);

        const nextButton = document.createElement('a-entity');
        nextButton.setAttribute('geometry', 'primitive: box; width: 1.3; height: 0.6; depth: 0.1');
        nextButton.setAttribute('material', `color: ${atEnd ? '#9E9E9E' : '#607D8B'}`); 
        nextButton.setAttribute('position', `0.75 ${buttonVerticalOffset} 0`); 
        nextButton.innerHTML = `<a-text value=">" position="0 0 0.06" align="center" color="white" width="3"></a-text>`;
        if (!atEnd) {
            nextButton.classList.add('clickable');
            nextButton.addEventListener('click', (event) => { event.stopPropagation(); navigateTime(originalIndex, 'next'); });
        }
        buttonsContainer.appendChild(nextButton);
    }
    return buttonsContainer;
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

function createChart(chartConfigData, originalIndex, positionStr, rotationStr, scaleStr) {
    const { chart, isCorrelationChart } = chartConfigData; 
    if (!chart) return null;

    const chartContainer = document.createElement('a-entity');
    chartContainer.setAttribute('position', positionStr);
    chartContainer.setAttribute('rotation', rotationStr);
    chartContainer.setAttribute('scale', scaleStr);
    chartContainer.setAttribute('data-chart-index', originalIndex); 

    const chartDataForBabia = getChartDataForCurrentState(originalIndex);
    const state = chartStates[originalIndex];
    const timePoints = chartConfigData.availableTimePointsByMode[state.timeAggregationMode];
    
    let chartTitle;
    if(isCorrelationChart){
        let currentTimeDisplayLabel = 'N/A';
        if (timePoints && timePoints.length > 0 && state.currentTimePointIndex < timePoints.length) {
            const rawTimeLabel = timePoints[state.currentTimePointIndex];
            currentTimeDisplayLabel = rawTimeLabel.substring(0, 16);
        }
        const productName = state.valueType === 'NewValue_1' ? 'P1' : 'P2';
        chartTitle = `${chart.graphname} (${productName} - ${currentTimeDisplayLabel})`;
    } else {
        const timeLabel = TIME_TYPES[state.timeAggregationMode].label;
        if(chart.chartType === 'babia-bubbles'){
            chartTitle = `${chart.graphname} (${timeLabel})`;
        } else {
            const productName = state.valueType === 'NewValue_1' ? 'P1' : 'P2';
            chartTitle = `${chart.graphname} (${productName} - ${timeLabel})`;
        }
    }

    const babiaCommonConfig = `legend: true; axis: true; tooltip: true; animation: false; showInfo: true; showInfoColor: #FFFFFF; titleColor: #FFFFFF; titleFont: #optimerBoldFont;`;
    let babiaSpecificConfig = "";

    if (chart.chartType === "babia-bars") {
        babiaSpecificConfig = `palette: commerce; title: ${chartTitle}; titlePosition: 0 12 0; heightMax: 10; x_axis: key; height: height; data: ${JSON.stringify(chartDataForBabia)}`;
        chartContainer.setAttribute('babia-bars', `${babiaCommonConfig} ${babiaSpecificConfig}`);
    } else if (chart.chartType === "babia-pie") {
        const titleEl = document.createElement('a-text');
        titleEl.setAttribute('value', chartTitle);
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
        const currentScale = chartContainer.getAttribute('scale');
        
        const filteredBubbleData = chartDataForBabia.filter(d => d.height > 0); 
        if (filteredBubbleData.length === 0) {
            filteredBubbleData.push({ key: 'Sem dados', key2: '', height: 0, radius: 0 });
        }
        const scaleYFactor = currentScale.y;
        const titleY = (BUBBLE_CHART_VISUAL_HEIGHT_MAX / scaleYFactor) + (2 / scaleYFactor); 
        babiaSpecificConfig = `x_axis: key; z_axis: key2; height: height; radius: radius; palette: foxy; title: ${chartTitle}; titlePosition: 0 ${titleY} 0; heightMax: ${BUBBLE_CHART_VISUAL_HEIGHT_MAX}; radiusMax: ${CONSTANT_BUBBLE_RADIUS}; data: ${JSON.stringify(filteredBubbleData)}`;
        chartContainer.setAttribute('babia-bubbles', `${babiaCommonConfig} ${babiaSpecificConfig}`);
    } else if (chart.chartType === "babia-cyls") {
        const currentScale = chartContainer.getAttribute('scale');
        
        const scaleYFactorCyl = currentScale.y;
        const titleY = (CYLINDER_VISUAL_HEIGHT_MAX / scaleYFactorCyl) + (2 / scaleYFactorCyl) ;
        babiaSpecificConfig = `palette: ubuntu; title: ${chartTitle}; titlePosition: 0 ${titleY} 0; heightMax: ${CYLINDER_VISUAL_HEIGHT_MAX}; radiusMax: ${CONSTANT_CYLINDER_RADIUS}; x_axis: key; height: height; radius: radius; data: ${JSON.stringify(chartDataForBabia)}`;
        chartContainer.setAttribute('babia-cyls', `${babiaCommonConfig} ${babiaSpecificConfig}`);
    }
    return chartContainer;
}

function toggleChartValue(originalIndex) {
    if (!chartStates[originalIndex]) return;
    chartStates[originalIndex].valueType = chartStates[originalIndex].valueType === 'NewValue_1' ? 'NewValue_2' : 'NewValue_1';
    renderSingleChart(originalIndex);
}

function renderSingleChart(originalIndex) {
    let visibleIndex = 0;
    for (let i = 0; i < originalIndex; i++) {
        const prevChartConfig = chartsData[i];
        if (prevChartConfig && prevChartConfig.kpiReferences.some(ref => hasValidData(allKpiHistory, ref.id, 'NewValue_1') || hasValidData(allKpiHistory, ref.id, 'NewValue_2'))) {
            visibleIndex++;
        }
    }
    
    const existingChartEntity = root.querySelector(`a-entity[data-chart-index="${originalIndex}"]`);
    const existingButtonsEntity = root.querySelector(`a-entity[data-buttons-index="${originalIndex}"]`);

    if(existingChartEntity) existingChartEntity.parentNode.removeChild(existingChartEntity);
    if(existingButtonsEntity) existingButtonsEntity.parentNode.removeChild(existingButtonsEntity);

    setTimeout(() => {
        const chartConfig = chartsData[originalIndex];
        const state = chartStates[originalIndex];
        if (!chartConfig || !state) return;

        const { chart } = chartConfig;
        let positionStr, rotationStr, scaleStr;

        if (isCustomPositionValid(chart.position)) {
            // --- CHANGE: Apply 2x scaling here as well ---
            const pos = chart.position;
            positionStr = `${pos.x * POSITION_SCALING_FACTOR} ${pos.y * POSITION_SCALING_FACTOR} ${pos.z * POSITION_SCALING_FACTOR}`;

            const rot = chart.position.rotation || {};
            rotationStr = `${rot.x ?? 0} ${rot.y ?? 0} ${rot.z ?? 0}`;
            const scale = chart.position.scale ?? 1;
            scaleStr = `${scale} ${scale} ${scale}`;
        } else {
            positionStr = calculatePosition(visibleIndex, chart.chartType);
            rotationStr = '0 0 0';
            scaleStr = '1 1 1';
        }

        const newChartEl = createChart(chartConfig, originalIndex, positionStr, rotationStr, scaleStr);
        if (newChartEl) root.appendChild(newChartEl);
        
        const newButtonsEl = createChartButtons(originalIndex, state, positionStr);
        if (newButtonsEl) root.appendChild(newButtonsEl);
    }, 50);
}

function clearCharts() {
    if (!root) return;
    while (root.firstChild) {
        root.removeChild(root.firstChild); 
    }
    chartsData = [];
    chartStates = {};
    kpiMetadataCache = {};
    allKpiHistory = [];
}

// --- Main Application Flow ---

function initializeAllChartDataAndStates(rawChartsConfig, rawKpiHistory) {
    allKpiHistory = rawKpiHistory; 
    kpiMetadataCache = {}; 
    const newChartsData = [];
    const newChartStates = {};

        rawChartsConfig.forEach((chartInfo, originalIndex) => { 
        const { kpi1Name, kpi2Name } = parseGraphname(chartInfo.graphname);
        const kpiRefs = [];

        if (chartInfo.zAxis) {
            kpiRefs.push({ 
                id: parseInt(chartInfo.zAxis), 
                name: kpi1Name || `KPI ${chartInfo.zAxis}`, 
                unit: getUnitForKPI(parseInt(chartInfo.zAxis)) 
            });
        }

        if (chartInfo.yAxis) {
            const yAxisKpiName = kpiRefs.length > 0 ? 
                                 (kpi2Name || `KPI ${chartInfo.yAxis}`) : 
                                 (kpi1Name || `KPI ${chartInfo.yAxis}`);
            
            kpiRefs.push({ 
                id: parseInt(chartInfo.yAxis), 
                name: yAxisKpiName, 
                unit: getUnitForKPI(parseInt(chartInfo.yAxis))
            });
        }
        
        if (kpiRefs.length === 0) {
            console.warn(`Skipping chart "${chartInfo.graphname}" because no valid zAxis or yAxis KPI was found.`);
            return; 
        }

        const isCorrelationChart = kpiRefs.length > 1;
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
            kpihistory: relevantKpiHistory, 
            chart: chartInfo, 
            kpiReferences: kpiRefs,
            isCorrelationChart: isCorrelationChart,
            availableTimePointsByMode: availableTimePointsByMode
        };
        
        const initialTimeMode = JSON_TIME_MAPPING[chartInfo.xAxis || chartInfo.timeUnit] || 'years';
        const timePoints = availableTimePointsByMode[initialTimeMode] || [];
        newChartStates[originalIndex] = {
            valueType: 'NewValue_1', 
            timeAggregationMode: initialTimeMode,
            currentTimePointIndex: Math.max(0, timePoints.length - 1),
        };
    });
    chartsData = newChartsData;
    chartStates = newChartStates;
}

function renderAllCharts() {
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild); 
    
    let visibleChartIndex = 0;
    chartsData.forEach((chartConfig, originalIndex) => {
        let chartHasAnyData = chartConfig.kpiReferences.some(ref => hasValidData(allKpiHistory, ref.id, 'NewValue_1') || hasValidData(allKpiHistory, ref.id, 'NewValue_2'));
        
        if (chartHasAnyData) {
            const state = chartStates[originalIndex];
            if (!state) return;

            const { chart } = chartConfig;
            let positionStr, rotationStr, scaleStr;

            if (isCustomPositionValid(chart.position)) {
                // --- CHANGE: Apply 2x scaling ---
                const pos = chart.position;
                positionStr = `${pos.x * POSITION_SCALING_FACTOR} ${pos.y * POSITION_SCALING_FACTOR} ${pos.z * POSITION_SCALING_FACTOR}`;
                
                const rot = chart.position.rotation || {};
                rotationStr = `${rot.x ?? 0} ${rot.y ?? 0} ${rot.z ?? 0}`;
                
                const scale = chart.position.scale ?? 1;
                scaleStr = `${scale} ${scale} ${scale}`;
            } else {
                positionStr = calculatePosition(visibleChartIndex, chart.chartType);
                rotationStr = '0 0 0';
                scaleStr = '1 1 1';
            }

            const el = createChart(chartConfig, originalIndex, positionStr, rotationStr, scaleStr);
            if (el) root.appendChild(el);
            
            const buttonsEl = createChartButtons(originalIndex, state, positionStr);
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
        clearCharts();

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