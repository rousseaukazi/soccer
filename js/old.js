// Performance-optimized version of the 3D scene

// Scene setup variables
let scene, camera, renderer, controls;
let model, ball, duck;
let mixer, duckMixer;
let clock;
let animationActions = [], duckAnimationActions = [];
let activeAction, activeDuckAction;
let animationNames = [], duckAnimationNames = [];
let selectedObject = null;
let outlineMesh = null;
let coordsDisplay = null;
let controlsPanel = null;
let initialModelPosition = new THREE.Vector3(0, 0, -3.90);
let initialBallPosition = new THREE.Vector3(-0.80, 0, -1.5);
let initialDuckPosition = new THREE.Vector3(-2.90, 0, 3.70);
let moveSpeed = 0.1;

// Add ball animation variables
let ballAnimating = false;
let ballAnimationStartTime = 0;
let ballAnimationDuration = 1000; // 1 second
let ballStartPosition = new THREE.Vector3(-0.8, 0, -1.5);
let ballEndPosition = new THREE.Vector3(-0.8, 0, 2.6);
let ballAnimationHeight = 1.5; // Maximum height during the arc

// Cached materials for better performance
let outlineMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFF0000,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthTest: false
});

// Action sequence variables
let actionSequenceRunning = false;
let actionSequenceStartTime = 0;
let pigEndPosition = new THREE.Vector3();
let duckEndPosition = new THREE.Vector3();

// Animation loop variables
let animateOcean;
let animateClouds;

// Global variables for selection and movement
let selectionMode = false;
let movementMode = false;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Global variables for tracking animation states
let pigKickComplete = false;
let duckSaveComplete = false;
let actionSequenceEnding = false;

// Variables to track animation states
let pigAnimationEndTime = 0;
let duckAnimationEndTime = 0;
let pigPositionInterval = null;
let duckPositionInterval = null;

// Fixed ball position
const ballFixedPosition = new THREE.Vector3(-0.80, 0.00, -1.60);

// Action sequence timeline (in milliseconds)
const actionSequenceTimeline = [
    { time: 0, action: 'pigKick', executed: false },
    { time: 0, action: 'duckSave', executed: false }
    // Removed ballMove event
];

// Initial positions for models
const initialPositions = {
    pig: new THREE.Vector3(0, 0, -3.90),  // Updated pig position
    duck: new THREE.Vector3(0, 0, 2.5),
    ball: new THREE.Vector3(-0.80, 0.00, -1.60)
};

// Variables to track animation states
let pigKickDuration = 0;
let ballAnimationStarted = false;

// Add these missing variable declarations at the top of your file
let showDuck = false; // Set to false by default
let showBall = true;
let showPig = true;
let controlsInfo;

// Initialize the scene
function init() {
    // Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create the camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);
    
    // Create the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Create the ground
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x7CFC00 }); // Lawn green
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create a simple ball instead of loading texture
    createSimpleBall();
    
    // Load the models
    loadPigModel();
    loadDuckModel();
    
    // Create UI controls
    createControls();
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    
    // Start the animation loop
    clock = new THREE.Clock();
    update();
    
    console.log("Scene initialized");
}

// Create a simple ball without texture
function createSimpleBall() {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        // Use a simple pattern instead of texture
        roughness: 0.2,
        metalness: 0.1
    });
    ball = new THREE.Mesh(geometry, material);
    
    // Set initial position
    ball.position.copy(initialPositions.ball);
    ball.castShadow = true;
    
    scene.add(ball);
    console.log(`Ball created at position: (${ball.position.x.toFixed(2)}, ${ball.position.y.toFixed(2)}, ${ball.position.z.toFixed(2)})`);
}

// Load the pig model
function loadPigModel() {
    // Make sure GLTFLoader is available
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('THREE.GLTFLoader is not loaded! Creating placeholder for pig.');
        createPlaceholderPig();
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    // Check if models directory exists and adjust path if needed
    loader.load('./models/pig.glb', function(gltf) {
        model = gltf.scene;
        scene.add(model);
        
        // Set initial position
        model.position.copy(initialPositions.pig);
        
        // Set up animations
        mixer = new THREE.AnimationMixer(model);
        const animations = gltf.animations;
        animationActions = [];
        animationNames = [];
        
        // Create animation actions
        for (let i = 0; i < animations.length; i++) {
            const clip = animations[i];
            const action = mixer.clipAction(clip);
            animationActions.push(action);
            animationNames.push(clip.name);
        }
        
        // Play the first animation by default (standing)
        if (animationActions.length > 0) {
            activeAction = animationActions[0];
            activeAction.play();
        }
        
        console.log(`Pig model loaded with ${animationActions.length} animations: ${animationNames.join(', ')}`);
    }, 
    // Add progress callback
    function(xhr) {
        console.log(`Pig model loading: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
    },
    // Add error callback
    function(error) {
        console.error('Error loading pig model:', error);
        createPlaceholderPig();
    });
}

// Create placeholder for pig if model fails to load
function createPlaceholderPig() {
    const geometry = new THREE.BoxGeometry(1, 1, 1.8);
    const material = new THREE.MeshStandardMaterial({ color: 0xFFC0CB }); // Pink
    model = new THREE.Mesh(geometry, material);
    model.position.copy(initialPositions.pig);
    scene.add(model);
    console.log("Created placeholder for pig model");
}

// Load the duck model with similar error handling
function loadDuckModel() {
    // Make sure GLTFLoader is available
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('THREE.GLTFLoader is not loaded! Creating placeholder for duck.');
        createPlaceholderDuck();
        return;
    }
    
    const loader = new THREE.GLTFLoader();
    loader.load('./models/duck.glb', function(gltf) {
        duck = gltf.scene;
        scene.add(duck);
        
        // Set initial position
        duck.position.copy(initialPositions.duck);
        
        // Set visibility based on showDuck flag
        duck.visible = showDuck;
        
        // Set up animations
        duckMixer = new THREE.AnimationMixer(duck);
        const animations = gltf.animations;
        duckAnimationActions = [];
        duckAnimationNames = [];
        
        // Create animation actions
        for (let i = 0; i < animations.length; i++) {
            const clip = animations[i];
            const action = duckMixer.clipAction(clip);
            duckAnimationActions.push(action);
            duckAnimationNames.push(clip.name);
        }
        
        // Play the first animation by default (standing)
        if (duckAnimationActions.length > 0) {
            activeDuckAction = duckAnimationActions[0];
            activeDuckAction.play();
        }
        
        console.log(`Duck model loaded with ${duckAnimationActions.length} animations: ${duckAnimationNames.join(', ')}`);
    },
    // Add progress callback
    function(xhr) {
        console.log(`Duck model loading: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`);
    },
    // Add error callback
    function(error) {
        console.error('Error loading duck model:', error);
        createPlaceholderDuck();
    });
}

// Create placeholder for duck if model fails to load
function createPlaceholderDuck() {
    const geometry = new THREE.BoxGeometry(0.8, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xFFFF00 }); // Yellow
    duck = new THREE.Mesh(geometry, material);
    duck.position.copy(initialPositions.duck);
    duck.visible = showDuck;
    scene.add(duck);
    console.log("Created placeholder for duck model");
}

// Update function
function update() {
    const deltaTime = clock.getDelta();
    
    // Update mixers
    if (mixer) mixer.update(deltaTime);
    if (duckMixer) duckMixer.update(deltaTime);
    
    // Update ball animation if active
    if (ballAnimating) {
        updateBallAnimation();
    }
    
    // Update action sequence if running
    if (actionSequenceRunning) {
        updateActionSequence();
    }
    
    // Update outline position if there's a selected object
    if (selectedObject && outlineMesh) {
        updateOutlinePosition();
    }
    
    // Render the scene
    renderer.render(scene, camera);
    
    // Request the next frame
    requestAnimationFrame(update);
}

// Initialize the application
window.onload = function() {
    // Make sure THREE is loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js is not loaded!');
        return;
    }
    
    // Make sure GLTFLoader is loaded
    if (typeof THREE.GLTFLoader === 'undefined') {
        console.error('THREE.GLTFLoader is not loaded!');
        return;
    }
    
    // Initialize the scene
    init();
};

// Create a grass field
function createGrassField() {
    // Create field base (green platform)
    const fieldGeometry = new THREE.PlaneGeometry(20, 20, 32, 32); // More segments for smoother appearance
    const fieldMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2E8B57, // Darker green (Sea Green)
        roughness: 0.6, // Less rough for smoother appearance
        metalness: 0.1
    });
    const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
    field.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    field.position.y = -0.01; // Slightly below y=0 to avoid z-fighting
    scene.add(field);
}

// Optimize a model for better performance
function optimizeModel(model) {
    model.traverse(function(node) {
        if (node.isMesh) {
            // Disable frustum culling for small objects
            node.frustumCulled = false;
            
            // Optimize geometry
            if (node.geometry) {
                node.geometry.setDrawRange(0, Infinity);
                
                // Merge small geometries if possible
                if (node.geometry.attributes && node.geometry.attributes.position) {
                    node.geometry.attributes.position.needsUpdate = false;
                    node.geometry.attributes.normal.needsUpdate = false;
                    if (node.geometry.attributes.uv) {
                        node.geometry.attributes.uv.needsUpdate = false;
                    }
                }
            }
            
            // Optimize materials
            if (node.material) {
                node.material.precision = 'lowp'; // Use low precision
                node.material.fog = false; // Disable fog calculations
            }
        }
    });
}

// Update the animation loop to include ocean and clouds
let animate = function() {
    requestAnimationFrame(animate);
    
    // Update controls with damping
    controls.update();
    
    // Update mixers only if they exist and have active animations
    const delta = clock.getDelta();
    if (mixer && activeAction && activeAction.isRunning()) {
        mixer.update(delta);
    }
    if (duckMixer && activeDuckAction && activeDuckAction.isRunning()) {
        duckMixer.update(delta);
    }
    
    // Update action sequence if running
    if (actionSequenceRunning) {
        updateActionSequence();
    }
    
    // Update ball kick animation if active
    if (ballAnimating) {
        updateBallAnimation();
    }
    
    // Update outline position only if needed
    if (selectedObject && outlineMesh) {
        updateOutlinePosition();
    }
    
    // Render scene
    renderer.render(scene, camera);
}

// Efficient window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Create a collapsible controls panel with visibility toggles
function createControlsPanel() {
    const panel = document.createElement('div');
    panel.id = 'controls-panel';
    panel.style.position = 'absolute';
    panel.style.top = '10px';
    panel.style.left = '10px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    panel.style.color = 'white';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';
    panel.style.fontFamily = 'Arial, sans-serif';
    panel.style.zIndex = '1000';
    panel.style.maxWidth = '300px';
    panel.style.transition = 'height 0.3s ease-in-out';
    panel.style.overflow = 'hidden';
    
    // Create header with collapse button
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '5px';
    header.style.cursor = 'pointer';
    
    const title = document.createElement('h3');
    title.textContent = 'Controls';
    title.style.margin = '0';
    title.style.fontSize = '14px';
    
    const toggleButton = document.createElement('span');
    toggleButton.innerHTML = '&#9650;'; // Up arrow (collapse)
    toggleButton.style.fontSize = '12px';
    toggleButton.style.fontWeight = 'bold';
    
    header.appendChild(title);
    header.appendChild(toggleButton);
    
    // Create content container
    const content = document.createElement('div');
    content.id = 'controls-content';
    
    // Add header and content to panel
    panel.appendChild(header);
    panel.appendChild(content);
    
    // Create visibility controls section
    const visibilitySection = document.createElement('div');
    visibilitySection.style.marginBottom = '10px';
    visibilitySection.style.padding = '5px';
    visibilitySection.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
    
    const visibilityTitle = document.createElement('h4');
    visibilityTitle.textContent = 'Object Visibility';
    visibilityTitle.style.margin = '0 0 5px 0';
    visibilityTitle.style.fontSize = '13px';
    
    visibilitySection.appendChild(visibilityTitle);
    
    // Create checkboxes for each model
    const models = [
        { name: 'Pig', variable: 'model', defaultVisible: true },
        { name: 'Duck', variable: 'duck', defaultVisible: showDuck },
        { name: 'Ball', variable: 'ball', defaultVisible: showBall }
    ];
    
    models.forEach(modelInfo => {
        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.display = 'flex';
        checkboxContainer.style.alignItems = 'center';
        checkboxContainer.style.marginBottom = '3px';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `${modelInfo.variable}-visibility`;
        checkbox.checked = modelInfo.defaultVisible; // Set default visibility
        checkbox.style.marginRight = '5px';
        
        const label = document.createElement('label');
        label.htmlFor = `${modelInfo.variable}-visibility`;
        label.textContent = `Show ${modelInfo.name}`;
        label.style.fontSize = '12px';
        
        // Add event listener to toggle visibility
        checkbox.addEventListener('change', function() {
            toggleModelVisibility(modelInfo.variable, this.checked);
        });
        
        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        visibilitySection.appendChild(checkboxContainer);
    });
    
    // Add visibility section to content
    content.appendChild(visibilitySection);
    
    // Add panel to document
    document.body.appendChild(panel);
    
    // Set up toggle functionality
    let isExpanded = true;
    
    header.addEventListener('click', function() {
        isExpanded = !isExpanded;
        
        if (isExpanded) {
            // Expand
            content.style.display = 'block';
            toggleButton.innerHTML = '&#9650;'; // Up arrow
            updateControlsInfo();
        } else {
            // Collapse
            content.style.display = 'none';
            toggleButton.innerHTML = '&#9660;'; // Down arrow
        }
    });
    
    controlsPanel = panel;
    return panel;
}

// Function to toggle model visibility
function toggleModelVisibility(modelVar, isVisible) {
    // Get the model object based on the variable name
    let modelObject = null;
    
    switch(modelVar) {
        case 'model':
            modelObject = model;
            break;
        case 'duck':
            modelObject = duck;
            break;
        case 'ball':
            modelObject = ball;
            break;
    }
    
    if (!modelObject) return;
    
    console.log(`Setting ${modelVar} visibility to: ${isVisible}`);
    
    if (isVisible) {
        // Make visible
        scene.add(modelObject);
    } else {
        // Make invisible by removing from scene
        scene.remove(modelObject);
        
        // If this was the selected object, deselect it
        if (selectedObject === modelObject) {
            deselectCurrentObject();
        }
    }
}

// Update the controls info to include the visibility section
function updateControlsInfo() {
    const content = document.getElementById('controls-content');
    if (!content) return;
    
    // Get the existing visibility section (we don't want to recreate it)
    const visibilitySection = content.querySelector('div');
    
    // Create or update the controls info section
    let controlsInfoSection = content.querySelector('#controls-info');
    
    if (!controlsInfoSection) {
        controlsInfoSection = document.createElement('div');
        controlsInfoSection.id = 'controls-info';
        content.appendChild(controlsInfoSection);
    }
    
    let infoText = '<h3>Controls</h3>';
    infoText += '<p>1-5: Play pig animations</p>';
    infoText += '<p>a-g: Play duck animations</p>';
    infoText += '<p>q: Select duck for movement</p>';
    infoText += '<p>w: Select pig for movement</p>';
    infoText += '<p>b: Select ball for movement</p>';
    infoText += '<p>0: Kick ball</p>';
    infoText += '<p>9: Start action sequence</p>';
    infoText += '<p>p: Toggle selection mode</p>';
    
    if (selectedObject) {
        let objectName = "Unknown";
        if (selectedObject === ball) objectName = "Ball";
        else if (selectedObject === duck) objectName = "Duck";
        else if (selectedObject === model) objectName = "Pig";
        
        infoText += '<p>Arrow keys: Move object in X/Z plane</p>';
        infoText += '<p>Page Up/Down: Move object in Y axis</p>';
        infoText += `<p>Selected: ${objectName}</p>`;
        infoText += `<p>Position: (${selectedObject.position.x.toFixed(2)}, ${selectedObject.position.y.toFixed(2)}, ${selectedObject.position.z.toFixed(2)})</p>`;
        infoText += `<p>Movement mode: ${movementMode ? 'ON' : 'OFF'}</p>`;
    }
    
    controlsInfoSection.innerHTML = infoText;
}

// Create coordinates display
function createCoordsDisplay() {
    coordsDisplay = document.createElement('div');
    coordsDisplay.id = 'coords-display';
    coordsDisplay.style.position = 'absolute';
    coordsDisplay.style.bottom = '10px';
    coordsDisplay.style.left = '10px';
    coordsDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    coordsDisplay.style.color = 'white';
    coordsDisplay.style.padding = '8px';
    coordsDisplay.style.borderRadius = '5px';
    coordsDisplay.style.fontFamily = 'Arial, sans-serif';
    coordsDisplay.style.fontSize = '14px';
    coordsDisplay.style.display = 'none';
    document.body.appendChild(coordsDisplay);
    return coordsDisplay;
}

// Update coordinates display
function updateCoordsDisplay() {
    if (!coordsDisplay) {
        coordsDisplay = createCoordsDisplay();
    }
    
    if (selectedObject) {
        coordsDisplay.style.display = 'block';
        coordsDisplay.innerHTML = `
            <strong>Position:</strong><br>
            X: ${selectedObject.position.x.toFixed(2)}<br>
            Y: ${selectedObject.position.y.toFixed(2)}<br>
            Z: ${selectedObject.position.z.toFixed(2)}
        `;
    } else {
        coordsDisplay.style.display = 'none';
    }
}

// Function to select a specific model
function selectModel(modelObject, modelName) {
    console.log(`Selecting model: ${modelName}`);
    
    // Update selection
    selectedObject = modelObject;
    
    // Create outline
    createCustomOutline(selectedObject);
    
    // Update coordinates display
    updateCoordsDisplay();
}

// Create a custom outline with carefully tuned dimensions for each model
function createCustomOutline(object) {
    // Remove any existing outline
    if (outlineMesh) {
        scene.remove(outlineMesh);
        outlineMesh = null;
    }
    
    if (!object) return;
    
    let width, height, depth;
    let offsetY = 0; // For vertical positioning adjustment
    
    // Use carefully tuned dimensions based on the model type
    if (object === model) {
        // Pig dimensions - adjusted for a snug fit
        width = 1.0;   // Narrower width
        height = 1.2;  // Taller height
        depth = 1.8;   // Appropriate depth
        offsetY = 0.5; // Raise the box to center it on the pig
    } else if (object === duck) {
        // Duck dimensions - adjusted for a snug fit
        width = 0.8;   // Narrower width
        height = 1.0;  // Taller height
        depth = 1.0;   // Appropriate depth
        offsetY = 0.4; // Raise the box to center it on the duck
    } else if (object === ball) {
        // Ball dimensions - adjusted for the 75% reduction (25% of original)
        width = 0.15;  // 25% of original size
        height = 0.15; // 25% of original size
        depth = 0.15;  // 25% of original size
        offsetY = 0;   // No adjustment needed
    } else {
        // Default dimensions
        width = 1.0;
        height = 1.0;
        depth = 1.0;
        offsetY = 0;
    }
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    outlineMesh = new THREE.Mesh(geometry, outlineMaterial);
    
    // Position the outline at the model's position with vertical adjustment
    outlineMesh.position.copy(object.position);
    outlineMesh.position.y += offsetY; // Apply vertical offset
    
    scene.add(outlineMesh);
}

// Function to deselect the current object
function deselectCurrentObject() {
    console.log("Deselecting current object");
    
    // Clear the selection
    selectedObject = null;
    
    // Remove the outline
    if (outlineMesh) {
        scene.remove(outlineMesh);
        outlineMesh = null;
    }
    
    // Hide the coordinates display
    updateCoordsDisplay();
}

// Function to reset camera to default position
function resetCamera() {
    // Reset camera to default position (zoomed out, side view)
    camera.position.set(8, 4, 0);
    camera.lookAt(0, 0, 0);
    
    // Reset controls target if using OrbitControls
    if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
    }
    
    console.log("Camera reset to default side view position");
}

// Function to reset the entire scene
function resetScene() {
    // Reset model positions
    if (model) {
        model.position.copy(initialPositions.pig);
        model.rotation.set(0, 0, 0);
    }
    
    if (ball) {
        ball.position.copy(initialPositions.ball);
        ball.rotation.set(0, 0, 0);
    }
    
    if (duck) {
        duck.position.copy(initialPositions.duck);
        // Reset duck rotation to face the pig (180 degrees around Y-axis)
        duck.rotation.set(0, Math.PI, 0);
    }
    
    // Reset animations
    if (mixer && animationActions.length > 0) {
        if (activeAction) {
            activeAction.stop();
        }
        
        // Use Stand/4 (index 3) as default animation
        let defaultAnimIndex = 3;
        
        // Fallback to first animation if index is out of bounds
        if (defaultAnimIndex >= animationActions.length) {
            defaultAnimIndex = 0;
        }
        
        activeAction = animationActions[defaultAnimIndex];
        activeAction.reset();
        activeAction.play();
    }
    
    if (duckMixer && duckAnimationActions.length > 0) {
        if (activeDuckAction) {
            activeDuckAction.stop();
        }
        
        // Find and play the "Stand" animation by default
        let defaultDuckAnimIndex = 0;
        for (let i = 0; i < duckAnimationNames.length; i++) {
            const name = duckAnimationNames[i].toLowerCase();
            if (name === 'stand' || name.includes('stand') || 
                name === 'idle' || name.includes('idle')) {
                defaultDuckAnimIndex = i;
                break;
            }
        }
        
        activeDuckAction = duckAnimationActions[defaultDuckAnimIndex];
        activeDuckAction.reset();
        activeDuckAction.play();
    }
    
    // Deselect any selected object
    deselectCurrentObject();
    
    // Reset camera
    resetCamera();
    
    console.log("Scene reset to initial state");
}

// Handle keyboard input for selection, movement, camera reset, and animations
function onKeyDown(event) {
    const key = event.key;
    
    switch(key) {
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
            // Play pig animation (with looping)
            const animIndex = parseInt(key) - 1;
            if (animIndex < animationActions.length) {
                playAnimation(animIndex); // Regular looping animation for manual triggers
                console.log(`Playing pig animation: ${animationNames[animIndex]}`);
            }
            break;
            
        case 'a':
        case 's':
        case 'd':
        case 'f':
        case 'g':
            // Play duck animation (with looping)
            const duckAnimIndex = 'asdfg'.indexOf(key);
            if (duckAnimIndex < duckAnimationActions.length) {
                playDuckAnimation(duckAnimIndex); // Regular looping animation for manual triggers
                console.log(`Playing duck animation: ${duckAnimationNames[duckAnimIndex]}`);
            }
            break;
            
        case 'q':
            // Select the duck
            if (duck) {
                // If something else is selected, deselect it
                if (selectedObject) {
                    removeOutline();
                }
                
                // Select the duck
                selectedObject = duck;
                
                // Find the actual mesh within the duck object
                let duckMesh = null;
                duck.traverse(function(child) {
                    if (child.isMesh && !duckMesh) {
                        duckMesh = child;
                    }
                });
                
                // Create outline for the duck mesh if found, otherwise for the duck object
                createOutline(duckMesh || duck);
                
                // Enable movement mode
                movementMode = true;
                
                console.log("Duck selected and movement mode enabled");
                updateControlsInfo();
            } else {
                console.log("Duck not found in the scene");
            }
            break;
            
        case 'w':
            // Select the pig
            if (model) {
                // If something else is selected, deselect it
                if (selectedObject) {
                    removeOutline();
                }
                
                // Select the pig
                selectedObject = model;
                
                // Find the actual mesh within the pig object
                let pigMesh = null;
                model.traverse(function(child) {
                    if (child.isMesh && !pigMesh) {
                        pigMesh = child;
                    }
                });
                
                // Create outline for the pig mesh if found, otherwise for the pig object
                createOutline(pigMesh || model);
                
                // Enable movement mode
                movementMode = true;
                
                console.log("Pig selected and movement mode enabled");
                updateControlsInfo();
            } else {
                console.log("Pig not found in the scene");
            }
            break;
            
        case '0':
            // Reset the scene
            resetScene();
            break;
            
        case '9':
            // Start the action sequence
            if (!actionSequenceRunning) {
                startActionSequence();
            }
            break;
            
        case 'p':
            // Toggle selection mode
            selectionMode = !selectionMode;
            console.log(`Selection mode: ${selectionMode ? 'ON' : 'OFF'}`);
            
            // Clear selection when turning off
            if (!selectionMode && selectedObject) {
                removeOutline();
                selectedObject = null;
                movementMode = false;
            }
            
            // Update UI
            updateControlsInfo();
            break;
            
        case 'b':
            // Select the ball
            if (ball) {
                // Deselect any previously selected object
                if (selectedObject) {
                    removeOutline();
                }
                
                // Select the ball
                selectedObject = ball;
                createOutline(selectedObject);
                
                // Enable movement mode
                movementMode = true;
                
                // Update UI
                const objectName = "Ball";
                const positionText = `Position: (${ball.position.x.toFixed(2)}, ${ball.position.y.toFixed(2)}, ${ball.position.z.toFixed(2)})`;
                const movementText = `Movement Mode: ${movementMode ? 'Enabled' : 'Disabled'}`;
                controlsInfo.innerHTML = `Selected: ${objectName}<br>${positionText}<br>${movementText}`;
                
                console.log(`Selected ball at position: (${ball.position.x.toFixed(2)}, ${ball.position.y.toFixed(2)}, ${ball.position.z.toFixed(2)})`);
            }
            break;
            
        // Movement controls
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'PageUp':
        case 'PageDown':
            // Move selected object if in movement mode
            if (selectedObject && movementMode) {
                moveSelectedObject(key);
            }
            break;
    }
}

// Function to play pig animation
function playAnimation(index) {
    if (!mixer || animationActions.length === 0) return;
    
    // Stop current animation
    if (activeAction) {
        activeAction.stop();
    }
    
    // Play new animation
    activeAction = animationActions[index];
    activeAction.reset();
    activeAction.play();
    
    // Update controls display
    updateControlsInfo();
}

// Function to play duck animation
function playDuckAnimation(index) {
    if (!duckMixer || index >= duckAnimationActions.length) return;
    
    // Stop current animation
    if (activeDuckAction) {
        activeDuckAction.stop();
    }
    
    // Play new animation
    activeDuckAction = duckAnimationActions[index];
    activeDuckAction.reset();
    
    // Reset timeScale to normal (1.0) for regular animations
    activeDuckAction.timeScale = 1.0;
    
    activeDuckAction.play();
    
    // Update controls display
    updateControlsInfo();
}

// Create outline for selected object
function createOutline(object) {
    // Remove existing outline if any
    removeOutline();
    
    // Check if the object exists and has geometry
    if (!object) {
        console.error("Cannot create outline: Object is undefined");
        return;
    }
    
    // For objects that might be groups or have children (like the ball)
    if (!object.geometry) {
        console.log("Object has no direct geometry, creating bounding box outline");
        
        // Create a bounding box for the object
        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        // Create a box geometry based on the bounding box
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        outlineMesh = new THREE.Mesh(geometry, outlineMaterial);
        
        // Position at the center of the bounding box
        const center = new THREE.Vector3();
        box.getCenter(center);
        outlineMesh.position.copy(center);
        
        scene.add(outlineMesh);
        return;
    }
    
    // For objects with direct geometry
    try {
        const geometry = object.geometry.clone();
        outlineMesh = new THREE.Mesh(geometry, outlineMaterial);
        outlineMesh.scale.multiplyScalar(1.05); // Slightly larger
        scene.add(outlineMesh);
        
        // Update position
        updateOutlinePosition();
    } catch (error) {
        console.error("Error creating outline:", error);
        
        // Fallback to a simple sphere outline
        const radius = object.scale.x > object.scale.y ? 
                      (object.scale.x > object.scale.z ? object.scale.x : object.scale.z) : 
                      (object.scale.y > object.scale.z ? object.scale.y : object.scale.z);
        
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        outlineMesh = new THREE.Mesh(geometry, outlineMaterial);
        scene.add(outlineMesh);
        
        // Update position
        updateOutlinePosition();
    }
}

// Update outline position to match selected object
function updateOutlinePosition() {
    if (!outlineMesh || !selectedObject) return;
    
    // For objects with a bounding box outline
    if (!selectedObject.geometry) {
        // Update the bounding box
        const box = new THREE.Box3().setFromObject(selectedObject);
        const center = new THREE.Vector3();
        box.getCenter(center);
        outlineMesh.position.copy(center);
        return;
    }
    
    // For objects with direct geometry
    outlineMesh.position.copy(selectedObject.position);
    outlineMesh.rotation.copy(selectedObject.rotation);
    outlineMesh.scale.set(
        selectedObject.scale.x * 1.05,
        selectedObject.scale.y * 1.05,
        selectedObject.scale.z * 1.05
    );
}

// Remove outline
function removeOutline() {
    if (outlineMesh) {
        scene.remove(outlineMesh);
        outlineMesh = null;
    }
}

// Move the selected object
function moveSelectedObject(key) {
    if (!selectedObject) return;
    
    const moveStep = 0.1; // Movement step size
    
    switch(key) {
        case 'ArrowUp':
            selectedObject.position.z -= moveStep;
            break;
        case 'ArrowDown':
            selectedObject.position.z += moveStep;
            break;
        case 'ArrowLeft':
            selectedObject.position.x -= moveStep;
            break;
        case 'ArrowRight':
            selectedObject.position.x += moveStep;
            break;
        case 'PageUp':
            selectedObject.position.y += moveStep;
            break;
        case 'PageDown':
            selectedObject.position.y -= moveStep;
            break;
    }
    
    // Update outline position
    if (outlineMesh) {
        updateOutlinePosition();
    }
    
    // Update coordinates display
    updateControlsInfo();
    
    console.log(`Object position: (${selectedObject.position.x.toFixed(2)}, ${selectedObject.position.y.toFixed(2)}, ${selectedObject.position.z.toFixed(2)})`);
}

// Play a pig animation without looping
function playAnimationOnce(index) {
    if (!mixer || !animationActions || index >= animationActions.length) return;
    
    // Stop any current animation
    if (activeAction) {
        activeAction.stop();
    }
    
    // Get the new action
    const action = animationActions[index];
    
    // Set it to play only once (no looping)
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true; // This makes it freeze on the last frame
    action.reset();
    
    // Play the animation
    action.play();
    
    // Update active action reference
    activeAction = action;
}

// Play a duck animation without looping and with speed control
function playDuckAnimationOnce(index, speedFactor = 1.0) {
    if (!duckMixer || !duckAnimationActions || index >= duckAnimationActions.length) return;
    
    // Stop any current animation
    if (activeDuckAction) {
        activeDuckAction.stop();
    }
    
    // Get the new action
    const action = duckAnimationActions[index];
    
    // Set it to play only once (no looping)
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true; // This makes it freeze on the last frame
    action.reset();
    
    // Set the playback speed (1.0 = normal, >1.0 = faster, <1.0 = slower)
    action.timeScale = speedFactor;
    
    // Play the animation
    action.play();
    
    // Update active action reference
    activeDuckAction = action;
}

// Start the action sequence
function startActionSequence() {
    // Reset all timeline events
    for (let i = 0; i < actionSequenceTimeline.length; i++) {
        actionSequenceTimeline[i].executed = false;
    }
    
    // Reset tracking variables
    ballAnimationStarted = false;
    
    // Start the sequence
    actionSequenceRunning = true;
    actionSequenceStartTime = Date.now();
    
    // Reset models to their initial positions
    if (model) model.position.copy(initialPositions.pig);
    if (duck) duck.position.copy(initialPositions.duck);
    if (ball) ball.position.copy(initialPositions.ball);
    
    console.log("Action sequence started with models at initial positions");
}

// Update the action sequence
function updateActionSequence() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - actionSequenceStartTime;
    
    // Check each event in the timeline
    for (let i = 0; i < actionSequenceTimeline.length; i++) {
        const event = actionSequenceTimeline[i];
        
        // If the event time has passed and it hasn't been executed yet
        if (elapsedTime >= event.time && !event.executed) {
            // Mark as executed
            event.executed = true;
            
            // Execute the event
            switch (event.action) {
                case 'pigKick':
                    // Play pig kick animation (animation index 1 - the kick animation)
                    if (animationActions.length > 1) {
                        // Get the kick animation
                        const kickAction = animationActions[1];
                        
                        // Get the duration of the kick animation
                        pigKickDuration = kickAction.getClip().duration * 1000; // Convert to milliseconds
                        
                        // Play kick animation without looping and freeze at the end
                        playAnimationOnce(1);
                        console.log(`Pig kick animation started (duration: ${pigKickDuration.toFixed(0)}ms, will freeze at end)`);
                    }
                    break;
                    
                case 'duckSave':
                    // Play duck save animation (goal_save)
                    if (duckAnimationActions.length > 0) {
                        // Find the goal_save animation index
                        let saveAnimIndex = duckAnimationNames.findIndex(name => 
                            name.toLowerCase().includes('goal') || name.toLowerCase().includes('save'));
                        
                        // If not found, use the first animation
                        if (saveAnimIndex === -1) saveAnimIndex = 0;
                        
                        // Play save animation without looping, freeze at the end, and speed up by 10%
                        playDuckAnimationOnce(saveAnimIndex, 1.1); // 1.1 = 10% faster
                        console.log(`Duck save animation started (${duckAnimationNames[saveAnimIndex]}) (10% faster, will freeze at end)`);
                    }
                    break;
            }
        }
    }
    
    // Check if we need to start the ball animation
    // Start the ball animation 1 second before the pig kick animation ends
    if (!ballAnimationStarted && pigKickDuration > 0) {
        const timeToStartBall = pigKickDuration - 1000; // 1 second before kick ends
        
        if (elapsedTime >= timeToStartBall) {
            // Start ball animation
            startBallAnimation();
            ballAnimationStarted = true;
            console.log(`Ball animation started (${elapsedTime.toFixed(0)}ms into sequence, ${timeToStartBall.toFixed(0)}ms after kick started)`);
        }
    }
    
    // Update ball animation if active
    if (ballAnimating) {
        updateBallAnimation();
    }
    
    // Check if all events have been executed and animations are complete
    let allExecuted = true;
    for (let i = 0; i < actionSequenceTimeline.length; i++) {
        if (!actionSequenceTimeline[i].executed) {
            allExecuted = false;
            break;
        }
    }
    
    // If all events have been executed and the ball animation is complete, end the sequence
    if (allExecuted && !ballAnimating && actionSequenceRunning) {
        setTimeout(function() {
            actionSequenceRunning = false;
            console.log("Action sequence completed (animations frozen at end frames)");
        }, 500);
    }
}

// Start the ball animation
function startBallAnimation() {
    if (ball) {
        ballAnimating = true;
        ballAnimationStartTime = Date.now();
        
        // Store the ball's current position as the starting position
        ballStartPosition = ball.position.clone();
        
        // Calculate the end position
        ballEndPosition = new THREE.Vector3(
            ballStartPosition.x,
            ballStartPosition.y,
            2.6 // Fixed Z position for the end
        );
        
        console.log(`Ball animation from (${ballStartPosition.x.toFixed(2)}, ${ballStartPosition.y.toFixed(2)}, ${ballStartPosition.z.toFixed(2)}) to (${ballEndPosition.x.toFixed(2)}, ${ballEndPosition.y.toFixed(2)}, ${ballEndPosition.z.toFixed(2)})`);
    }
}

// Update ball animation with an arc trajectory
function updateBallAnimation() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - ballAnimationStartTime;
    const duration = 1000; // 1 second animation
    
    if (elapsedTime < duration) {
        // Calculate progress (0 to 1)
        const progress = elapsedTime / duration;
        
        // Use easing for smoother motion
        const easedProgress = easeInOutQuad(progress);
        
        // Calculate horizontal position (x and z)
        const x = THREE.MathUtils.lerp(ballStartPosition.x, ballEndPosition.x, easedProgress);
        const z = THREE.MathUtils.lerp(ballStartPosition.z, ballEndPosition.z, easedProgress);
        
        // Calculate vertical position (y) with an arc
        // Sin curve creates a nice arc that peaks in the middle
        const arcHeight = 1.5; // Maximum height of the arc
        const y = ballStartPosition.y + Math.sin(easedProgress * Math.PI) * arcHeight;
        
        // Apply the new position
        ball.position.set(x, y, z);
        
        // Add slight rotation to the ball as it moves
        ball.rotation.x += 0.1;
        ball.rotation.z += 0.08;
    } else {
        // Animation complete
        ball.position.copy(ballEndPosition);
        ballAnimating = false;
        console.log(`Ball animation completed at (${ballEndPosition.x.toFixed(2)}, ${ballEndPosition.y.toFixed(2)}, ${ballEndPosition.z.toFixed(2)})`);
    }
}

// Easing function for smoother animation
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Add this function that was referenced but not defined
function createControls() {
    // Create orbit controls for camera
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2;
    
    // Create UI controls panel
    createControlsPanel();
    
    // Create coordinates display
    createCoordsDisplay();
    
    console.log("Controls created");
}

// Initialize the application
init(); 