// scripts/ar-handling.js
const ARHandler = (function() {
    let isInARMode = false;
    const arChartsRootBasePosition = { x: 0, y: 0.2, z: -2.5 }; // Position for charts in AR
    let arChartsRootCurrentScale = 0.1; // Default scale for charts in AR
    const originalChartsRootTransform = {
        position: null,
        scale: null,
        visible: true // Assume charts-root is initially visible
    };

    // These will be populated by _getDOMElements
    let sceneEl, root, sceneEnvironment, arControlsContainer, arGridScaleInput, arGridScaleValueDisplay;
    
    // References to functions from main.js
    let extHideRoomSelector, extShowRoomSelector;

    function _getDOMElementsAndVerify() {
        sceneEl = document.querySelector('a-scene');
        root = document.getElementById('charts-root');
        sceneEnvironment = document.getElementById('scene-environment'); // VR environment
        arControlsContainer = document.getElementById('ar-controls-container');
        arGridScaleInput = document.getElementById('arGridScaleRange');
        arGridScaleValueDisplay = document.getElementById('arGridScaleValue');

        if (!sceneEl) { console.error("ARHandler: a-scene not found."); return false; }
        if (!root) { console.error("ARHandler: charts-root not found."); return false; }
        if (!sceneEnvironment) { console.error("ARHandler: scene-environment not found."); return false; }
        if (!arControlsContainer) { console.error("ARHandler: ar-controls-container not found."); return false; }
        if (!arGridScaleInput) { console.error("ARHandler: arGridScaleRange not found."); return false; }
        if (!arGridScaleValueDisplay) { console.error("ARHandler: arGridScaleValue not found."); return false; }
        return true;
    }

    function onEnterAR() {
        if (!root || !sceneEnvironment || !arControlsContainer) return; // Guard
        console.log("ARHandler: Entering AR Mode");
        isInARMode = true;
        if (extHideRoomSelector) extHideRoomSelector();

        sceneEnvironment.setAttribute('visible', false);
        
        // Store original transform of charts-root
        if (originalChartsRootTransform.position === null) {
            originalChartsRootTransform.position = root.getAttribute('position') ? AFRAME.utils.coordinates.clone(root.getAttribute('position')) : { x: 0, y: 0, z: 0 };
        }
        if (originalChartsRootTransform.scale === null) {
            originalChartsRootTransform.scale = root.getAttribute('scale') ? AFRAME.utils.coordinates.clone(root.getAttribute('scale')) : { x: 1, y: 1, z: 1 };
        }
        originalChartsRootTransform.visible = root.getAttribute('visible'); // Store current visibility

        // Apply AR position and scale to charts-root
        root.setAttribute('position', arChartsRootBasePosition);
        root.setAttribute('scale', `${arChartsRootCurrentScale} ${arChartsRootCurrentScale} ${arChartsRootCurrentScale}`);
        root.setAttribute('visible', true); // Ensure charts are visible in AR

        arControlsContainer.style.display = 'block';
        arGridScaleInput.value = arChartsRootCurrentScale;
        arGridScaleValueDisplay.textContent = arChartsRootCurrentScale.toFixed(2);
    }

    function onExitAR() {
        if (!root || !sceneEnvironment || !arControlsContainer) return; // Guard
        console.log("ARHandler: Exiting AR Mode");
        isInARMode = false;
        
        // Only show room selector if not in VR mode (sceneEl should be available here)
        if (sceneEl && !sceneEl.is('vr-mode') && extShowRoomSelector) {
             extShowRoomSelector();
        }

        sceneEnvironment.setAttribute('visible', true);

        // Restore original charts-root transform
        if (originalChartsRootTransform.position !== null) {
            root.setAttribute('position', originalChartsRootTransform.position);
        }
        if (originalChartsRootTransform.scale !== null) {
            root.setAttribute('scale', originalChartsRootTransform.scale);
        }
        // Restore original visibility
        if (originalChartsRootTransform.visible !== undefined) {
            root.setAttribute('visible', originalChartsRootTransform.visible);
        }

        originalChartsRootTransform.position = null;
        originalChartsRootTransform.scale = null;
        // originalChartsRootTransform.visible will be reset next time AR is entered

        arControlsContainer.style.display = 'none';
    }

    function onGridScaleChange() {
        if (!arGridScaleInput || !arGridScaleValueDisplay) return;
        arChartsRootCurrentScale = parseFloat(arGridScaleInput.value);
        arGridScaleValueDisplay.textContent = arChartsRootCurrentScale.toFixed(2);
        if (isInARMode && root) {
            root.setAttribute('scale', `${arChartsRootCurrentScale} ${arChartsRootCurrentScale} ${arChartsRootCurrentScale}`);
        }
    }
    
    function initializeARControlsState() {
        if (!arGridScaleInput || !arGridScaleValueDisplay || !arControlsContainer) return;
        // Set initial scale from HTML default or a defined constant
        arChartsRootCurrentScale = parseFloat(arGridScaleInput.value) || 0.1; 
        arGridScaleInput.value = arChartsRootCurrentScale;
        arGridScaleValueDisplay.textContent = arChartsRootCurrentScale.toFixed(2);
        arControlsContainer.style.display = 'none'; // Ensure hidden initially
    }

    return {
        init: function(hideRoomSelectorFunc, showRoomSelectorFunc) {
            // Defer initialization until DOM is fully loaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this._deferredInit(hideRoomSelectorFunc, showRoomSelectorFunc);
                });
            } else {
                this._deferredInit(hideRoomSelectorFunc, showRoomSelectorFunc);
            }
        },
        _deferredInit: function(hideRoomSelectorFunc, showRoomSelectorFunc) {
            if (!_getDOMElementsAndVerify()) {
                console.error("ARHandler: Initialization failed due to missing elements.");
                return;
            }

            extHideRoomSelector = hideRoomSelectorFunc;
            extShowRoomSelector = showRoomSelectorFunc;

            sceneEl.addEventListener('enter-ar', onEnterAR);
            sceneEl.addEventListener('exit-ar', onExitAR);

            if (arGridScaleInput) {
                arGridScaleInput.addEventListener('input', onGridScaleChange);
            }
            
            initializeARControlsState(); // Initialize AR control values and visibility

            console.log("ARHandler initialized.");
        },
        isARModeActive: function() {
            return isInARMode;
        },
        resetARStateForAppReinit: function() {
            // Called by main.js's initializeApp to ensure AR UI is hidden
            // if the whole app data reloads.
            if (arControlsContainer) {
                 arControlsContainer.style.display = 'none';
            }
            isInARMode = false; // Crucial for state consistency
        }
    };
})();
