// scripts/ar-handler.js

class ARHandler {
    constructor(sceneEl, chartsRootEl, arPlacementInstructionsEl, arScaleSliderEl, arScaleSliderContainerEl) {
        this.sceneEl = sceneEl;
        this.chartsRootEl = chartsRootEl; // The <a-entity id="charts-root">
        this.arPlacementInstructionsEl = arPlacementInstructionsEl;
        this.arScaleSliderEl = arScaleSliderEl;
        this.arScaleSliderContainerEl = arScaleSliderContainerEl;

        this.arReticleEl = document.getElementById('ar-reticle'); // Visual indicator for placement
        this.arOriginEl = document.getElementById('ar-origin');   // Anchor for charts in AR

        this.isArActive = false;
        this.isPlaced = false;

        // Store original properties of chartsRootEl to restore on AR exit
        this.originalChartsRootParent = this.chartsRootEl.parentNode;
        this.originalChartsRootPosition = this.chartsRootEl.getAttribute('position') || { x: 0, y: 0, z: 0 };
        this.originalChartsRootRotation = this.chartsRootEl.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
        this.originalChartsRootScale = this.chartsRootEl.getAttribute('scale') || { x: 1, y: 1, z: 1 };
        this.originalChartsRootVisibility = this.chartsRootEl.getAttribute('visible');

        this._bindMethods();
        this._setupAREventListeners();
    }

    _bindMethods() {
        this.onEnterAR = this.onEnterAR.bind(this);
        this.onExitAR = this.onExitAR.bind(this);
        this.onSelect = this.onSelect.bind(this); // Tap to place
        this.onScaleChange = this.onScaleChange.bind(this);
    }

    _setupAREventListeners() {
        this.sceneEl.addEventListener('enter-ar', this.onEnterAR);
        this.sceneEl.addEventListener('exit-ar', this.onExitAR);

        if (this.arScaleSliderEl) {
            this.arScaleSliderEl.addEventListener('input', this.onScaleChange);
        }
    }

    _reparentChartsToAROrigin() {
        if (this.chartsRootEl.parentNode !== this.arOriginEl) {
            this.arOriginEl.appendChild(this.chartsRootEl);
        }
        // Reset local transform of chartsRootEl as it's now relative to arOriginEl
        this.chartsRootEl.setAttribute('position', '0 0 0');
        this.chartsRootEl.setAttribute('rotation', '0 0 0');
        // Initial scale will be set by onScaleChange or a default
    }

    onEnterAR() {
        this.isArActive = true;
        this.isPlaced = false;
        console.log("AR Mode Entered");

        // Hide VR-specific elements
        const sky = document.getElementById('sky');
        const environment = document.getElementById('environment');
        const vrCamera = document.getElementById('vrCamera');
        if (sky) sky.setAttribute('visible', 'false');
        if (environment) environment.setAttribute('visible', 'false');
        if (vrCamera) vrCamera.setAttribute('visible', 'false');


        this._reparentChartsToAROrigin();
        this.arOriginEl.setAttribute('visible', 'false'); // Origin (and charts) hidden until placed
        this.chartsRootEl.setAttribute('visible', 'false'); // Charts also hidden

        if (this.arPlacementInstructionsEl) this.arPlacementInstructionsEl.classList.remove('hidden');
        if (this.arScaleSliderContainerEl) this.arScaleSliderContainerEl.classList.add('hidden'); // Hide slider until placed

        if (this.arReticleEl) {
            this.arReticleEl.setAttribute('ar-hit-test', 'enabled', true);
            this.arReticleEl.setAttribute('visible', true); // Show reticle
        }

        this.sceneEl.addEventListener('click', this.onSelect); // Listen for taps on the scene

        // Set initial AR scale
        this.onScaleChange(); // Uses slider's current value or default if no slider
    }

    onExitAR() {
        this.isArActive = false;
        this.isPlaced = false;
        console.log("AR Mode Exited");

        // Restore VR-specific elements
        const sky = document.getElementById('sky');
        const environment = document.getElementById('environment');
        const vrCamera = document.getElementById('vrCamera');

        if (sky) sky.setAttribute('visible', 'true');
        if (environment) environment.setAttribute('visible', 'true');
        if (vrCamera) vrCamera.setAttribute('visible', 'true');


        if (this.arPlacementInstructionsEl) this.arPlacementInstructionsEl.classList.add('hidden');
        if (this.arScaleSliderContainerEl) this.arScaleSliderContainerEl.classList.add('hidden');

        if (this.arReticleEl) {
            this.arReticleEl.setAttribute('ar-hit-test', 'enabled', false);
            this.arReticleEl.setAttribute('visible', false);
        }
        this.sceneEl.removeEventListener('click', this.onSelect);

        // Restore chartsRootEl to its original parent and transform
        if (this.originalChartsRootParent && this.chartsRootEl.parentNode === this.arOriginEl) {
            this.originalChartsRootParent.appendChild(this.chartsRootEl);
        }
        this.chartsRootEl.setAttribute('position', this.originalChartsRootPosition);
        this.chartsRootEl.setAttribute('rotation', this.originalChartsRootRotation);
        this.chartsRootEl.setAttribute('scale', this.originalChartsRootScale);
        this.chartsRootEl.setAttribute('visible', this.originalChartsRootVisibility === null ? true : this.originalChartsRootVisibility);


        if (this.arOriginEl) this.arOriginEl.setAttribute('visible', 'false'); // Hide AR origin
    }

    onSelect(event) {
        if (!this.isArActive || this.isPlaced || !this.sceneEl.is('ar-mode')) return;

        // If the reticle is visible and ar-hit-test is active, it means it found a surface
        if (this.arReticleEl && this.arReticleEl.getAttribute('visible')) {
            // Get the world transform of the reticle
            const reticleMatrix = this.arReticleEl.object3D.matrixWorld;

            // Apply this transform to our arOriginEl
            this.arOriginEl.object3D.position.setFromMatrixPosition(reticleMatrix);
            this.arOriginEl.object3D.quaternion.setFromMatrixQuaternion(reticleMatrix);
            
            this.arOriginEl.setAttribute('visible', 'true');   // Show the origin
            this.chartsRootEl.setAttribute('visible', 'true'); // Show the charts

            this.isPlaced = true;

            // Hide reticle and placement instructions
            this.arReticleEl.setAttribute('visible', 'false');
            this.arReticleEl.setAttribute('ar-hit-test', 'enabled', false); // Stop further hit-testing for reticle
            if (this.arPlacementInstructionsEl) this.arPlacementInstructionsEl.classList.add('hidden');
            
            // Show scale slider
            if (this.arScaleSliderContainerEl) this.arScaleSliderContainerEl.classList.remove('hidden');

            console.log("Charts placed in AR at world position:", this.arOriginEl.object3D.position);
            console.log("Charts root local position within arOrigin:", this.chartsRootEl.object3D.position);
        }
    }

    onScaleChange() {
        let scaleValue = 0.1; // Default scale
        if (this.arScaleSliderEl) {
            scaleValue = parseFloat(this.arScaleSliderEl.value);
        }
        this.setARScale(scaleValue);
    }

    setARScale(scaleValue) {
        // We scale the arOriginEl. chartsRootEl is a child and its local scale can be 1,1,1
        // or a specific scale if needed, but arOriginEl scale affects everything within.
        // For simplicity, let's scale chartsRootEl directly as it's easier to manage visually.
        if (this.chartsRootEl) {
             // The chartsRootEl is parented to arOriginEl, so its scale is relative to arOriginEl.
             // arOriginEl itself is not scaled, it's just a transform anchor.
            this.chartsRootEl.setAttribute('scale', `${scaleValue} ${scaleValue} ${scaleValue}`);
            console.log("AR Charts scale set to:", scaleValue);
        }
    }
}