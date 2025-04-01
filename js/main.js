// Global variables
let scene, camera, renderer, controls;
let clock;
let ball, net;
let pig, pigMixer, pigAnimations;
let duck, duckMixer, duckAnimations;
let showBall = true;
let showPig = true;
let showDuck = true;
let showNet = true;
let controlsInfo;
let controlsVisible = false;

// Default positions
const pigPosition = new THREE.Vector3(0, 0, -3.90);
const ballPosition = new THREE.Vector3(-0.80, 0, -1.5);
const duckPosition = new THREE.Vector3(-2.90, 0, 4.30);
const netPosition = new THREE.Vector3(-0.8, 0, 3); // Keep net position the same

// Ball animation variables
let ballAnimating = false;
let ballAnimationStartTime = 0;
let ballAnimationDuration = 1200; // 1.2 seconds for a smoother arc
let ballStartPosition = new THREE.Vector3(-0.80, 0, -1.5);
let ballEndPosition = new THREE.Vector3(-0.8, 0, 2.6);
let ballAnimationCompleted = false;
let ballMaxHeight = 1.5; // Slightly lower maximum height for a smoother arc

// Add these global variables for action sequence
let actionSequenceRunning = false;
let actionSequenceStartTime = 0;
let pigAnimationStarted = false;
let duckReactionStarted = false;

// Add these global variables for animation control
let pigKickAction = null;
let duckReactAction = null;

// Action sequence timing with immediate pig reaction (in milliseconds)
const pigAnimTime = 0;      // Pig animation starts immediately
const ballKickTime = 800;   // Ball is kicked after 0.8 seconds
const duckReactTime = 1300; // Duck reacts after 1.3 seconds
const sequenceEndTime = 3000; // Sequence ends after 3 seconds

// Initialize the scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera with updated settings
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(-9.22, 1.39, -3.65);
    camera.lookAt(new THREE.Vector3(0, 1, 0));
    
    // Create renderer with improved settings
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance",
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x64B5F6); // Light blue
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding; // Improved color rendering
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better tone mapping
    renderer.toneMappingExposure = 1.2; // Brighter exposure
    renderer.setPixelRatio(window.devicePixelRatio); // Use device pixel ratio for sharper rendering
    document.body.appendChild(renderer.domElement);
    
    // Create controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 0); // Set the look target
    controls.update();
    
    // Create clock for animations
    clock = new THREE.Clock();
    
    // Create scene elements
    createCartoonySky(); // Add the cartoony sky with double clouds
    createCarpetFloor(); // Create carpet floor instead of grass
    createLights();
    
    // Load models
    loadPigModel();
    loadDuckModel();
    loadBallModel();
    loadNetModel();
    
    // Create control panel
    createControlsPanel();
    
    // Add event listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    
    // Start animation loop
    animate();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Get delta time
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    // Update controls
    controls.update();
    
    // Update animations
    if (pigMixer) pigMixer.update(delta);
    if (duckMixer) duckMixer.update(delta);
    
    // Update clouds to always face camera and float
    scene.children.forEach(child => {
        if (child.name && child.name.startsWith('cloud_')) {
            // Make cloud always face camera
            child.lookAt(camera.position);
            
            // Apply floating animation
            if (child.userData) {
                const floatY = Math.sin((elapsedTime + child.userData.startTime) * child.userData.speed) 
                    * child.userData.amplitude * child.userData.direction;
                child.position.y = child.userData.startY + floatY;
            }
        }
    });
    
    // Update ball animation if active
    if (ballAnimating) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - ballAnimationStartTime;
        const progress = Math.min(elapsedTime / ballAnimationDuration, 1.0);
        
        // Use a simple sine function for a smooth arc
        // sin(π * t) gives a smooth curve from 0 to 0 with a peak in the middle
        const heightProgress = Math.sin(Math.PI * progress);
        const height = ballMaxHeight * heightProgress;
        
        // Simple linear interpolation for horizontal movement
        const currentPosition = new THREE.Vector3();
        currentPosition.x = ballStartPosition.x; // Keep X the same
        currentPosition.z = ballStartPosition.z + (ballEndPosition.z - ballStartPosition.z) * progress;
        currentPosition.y = height;
        
        // Update ball position
        ball.position.copy(currentPosition);
        
        // Simpler rotation - just roll forward at a constant rate
        ball.rotation.x -= 0.08;
        
        // Check if animation is complete
        if (progress >= 1.0) {
            ballAnimating = false;
            ballAnimationCompleted = true;
            console.log("Ball animation completed");
        }
    }
    
    // Render the scene
    renderer.render(scene, camera);
}

// Load the pig model with updated position and default animation
function loadPigModel() {
    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Load the model
    loader.load(
        'models/pig.glb',
        function (gltf) {
            // Store the model
            pig = gltf.scene;
            
            // Enable shadows and improve materials
            pig.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Improve material quality
                    if (child.material) {
                        child.material.roughness = 0.7; // Less shiny
                        child.material.metalness = 0.1; // Less metallic
                        child.material.envMapIntensity = 1.5; // More environment reflection
                        
                        // Ensure proper color encoding
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            // Position the model using the default position
            pig.position.copy(pigPosition);
            
            // Set visibility based on toggle
            pig.visible = showPig;
            
            // Add to scene
            scene.add(pig);
            
            // Store animations
            pigAnimations = gltf.animations;
            
            // Create animation mixer
            pigMixer = new THREE.AnimationMixer(pig);
            
            // Find and play the "stand" animation by default
            if (pigAnimations.length > 0) {
                // Look for an animation named "stand" or similar
                let standAnimIndex = 0; // Default to first animation
                
                for (let i = 0; i < pigAnimations.length; i++) {
                    const animName = pigAnimations[i].name.toLowerCase();
                    if (animName.includes('stand') || animName.includes('idle')) {
                        standAnimIndex = i;
                        break;
                    }
                }
                
                // Play the stand animation
                const action = pigMixer.clipAction(pigAnimations[standAnimIndex]);
                action.play();
                
                // Update the active animation text
                updateActiveAnimationText(pigAnimations[standAnimIndex].name);
                
                // Update animations control panel
                updateAnimationsControlPanel();
                
                console.log(`Playing pig animation: ${pigAnimations[standAnimIndex].name}`);
            }
            
            console.log("Pig model loaded at position", pigPosition);
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened loading the pig model', error);
        }
    );
}

// Load the duck model with updated position, rotation, and default animation
function loadDuckModel() {
    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Load the model
    loader.load(
        'models/duck.glb',
        function (gltf) {
            // Store the model
            duck = gltf.scene;
            
            // Enable shadows and improve materials
            duck.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Improve material quality
                    if (child.material) {
                        child.material.roughness = 0.7; // Less shiny
                        child.material.metalness = 0.1; // Less metallic
                        child.material.envMapIntensity = 1.5; // More environment reflection
                        
                        // Ensure proper color encoding
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            // Position the model using the default position
            duck.position.copy(duckPosition);
            
            // Rotate 180 degrees on Y axis to face the other way
            duck.rotation.y = Math.PI; // 180 degrees in radians
            
            // Set visibility based on toggle
            duck.visible = showDuck;
            
            // Add to scene
            scene.add(duck);
            
            // Store animations
            duckAnimations = gltf.animations;
            
            // Create animation mixer
            duckMixer = new THREE.AnimationMixer(duck);
            
            // Find and play the "stand" animation by default
            if (duckAnimations.length > 0) {
                // Look for an animation named "stand" or similar
                let standAnimIndex = 0; // Default to first animation
                
                for (let i = 0; i < duckAnimations.length; i++) {
                    const animName = duckAnimations[i].name.toLowerCase();
                    if (animName.includes('stand') || animName.includes('idle')) {
                        standAnimIndex = i;
                        break;
                    }
                }
                
                // Play the stand animation
                const action = duckMixer.clipAction(duckAnimations[standAnimIndex]);
                action.play();
                
                // Update the active animation text
                updateActiveDuckAnimationText(duckAnimations[standAnimIndex].name);
                
                // Update animations control panel
                updateDuckAnimationsControlPanel();
                
                console.log(`Playing duck animation: ${duckAnimations[standAnimIndex].name}`);
            }
            
            console.log("Duck model loaded at position", duckPosition, "and rotated 180 degrees");
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened loading the duck model', error);
        }
    );
}

// Load the ball model
function loadBallModel() {
    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Load the model
    loader.load(
        'models/ball.glb',
        function (gltf) {
            // Store the model
            ball = gltf.scene;
            
            // Enable shadows and improve materials
            ball.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Improve material quality
                    if (child.material) {
                        child.material.roughness = 0.7; // Less shiny
                        child.material.metalness = 0.1; // Less metallic
                        child.material.envMapIntensity = 1.5; // More environment reflection
                        
                        // Ensure proper color encoding
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            // Position the model
            ball.position.copy(ballStartPosition);
            
            // Scale down by another 25% from current size (0.36 * 0.75 = 0.27)
            ball.scale.set(0.27, 0.27, 0.27);
            
            // Set visibility based on toggle
            ball.visible = showBall;
            
            // Add to scene
            scene.add(ball);
            
            console.log("Ball model loaded at reduced scale (0.27)");
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened loading the ball model', error);
            // Fallback to simple ball if model fails to load
            createSimpleBall();
        }
    );
}

// Load the net model
function loadNetModel() {
    // Create a loader
    const loader = new THREE.GLTFLoader();
    
    // Load the model
    loader.load(
        'models/net.glb',
        function (gltf) {
            // Store the model
            net = gltf.scene;
            
            // Enable shadows and improve materials
            net.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Improve material quality
                    if (child.material) {
                        child.material.roughness = 0.7; // Less shiny
                        child.material.metalness = 0.1; // Less metallic
                        child.material.envMapIntensity = 1.5; // More environment reflection
                        
                        // Ensure proper color encoding
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            // Position the model
            net.position.set(-.5, 0, 6); // Adjust position as needed
            
            // Rotate 180 degrees on Y axis to face the correct direction
            net.rotation.y = Math.PI; // 180 degrees in radians
            
            // Scale to 1.5x and then another 25% (1.5 * 1.25 = 1.875)
            net.scale.set(1.875, 1.875, 1.875);
            
            // Set visibility based on toggle
            net.visible = showNet;
            
            // Add to scene
            scene.add(net);
            
            console.log("Net model loaded at 1.875x scale");
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened loading the net model', error);
            // Fallback to simple net if model fails to load
            createSoccerNet();
        }
    );
}

// Update animations control panel
function updateAnimationsControlPanel() {
    // If there are no animations, return
    if (!pigAnimations || pigAnimations.length === 0) {
        return;
    }
    
    // Update the hotkeys table with animation information
    const tbody = document.querySelector('#hotkeys-table tbody');
    if (!tbody) return;
    
    // Add animation hotkeys
    for (let i = 0; i < pigAnimations.length; i++) {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
        
        const keyCell = document.createElement('td');
        keyCell.style.padding = '4px 8px';
        
        const keySpan = document.createElement('span');
        keySpan.textContent = (i + 1).toString();
        keySpan.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        keySpan.style.borderRadius = '3px';
        keySpan.style.padding = '2px 5px';
        keySpan.style.fontFamily = 'monospace';
        keySpan.style.fontSize = '11px';
        
        keyCell.appendChild(keySpan);
        
        const descCell = document.createElement('td');
        descCell.textContent = `Play pig animation: ${pigAnimations[i].name}`;
        descCell.style.padding = '4px 8px';
        
        row.appendChild(keyCell);
        row.appendChild(descCell);
        tbody.appendChild(row);
    }
    
    // Add active animation display
    const content = document.querySelector('#controls-content');
    if (!content) return;
    
    const animationInfo = document.createElement('div');
    animationInfo.style.marginTop = '12px';
    animationInfo.style.padding = '8px';
    animationInfo.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
    animationInfo.style.borderRadius = '4px';
    
    const pigAnimInfo = document.createElement('div');
    pigAnimInfo.textContent = 'Pig Animations Hotkeys: 1-' + pigAnimations.length;
    pigAnimInfo.style.marginBottom = '5px';
    
    const activePigAnim = document.createElement('div');
    activePigAnim.id = 'active-pig-animation';
    activePigAnim.textContent = 'Active: None';
    
    animationInfo.appendChild(pigAnimInfo);
    animationInfo.appendChild(activePigAnim);
    content.appendChild(animationInfo);
    
    console.log("Animations control panel updated");
}

// Update duck animations control panel
function updateDuckAnimationsControlPanel() {
    // If there are no animations, return
    if (!duckAnimations || duckAnimations.length === 0) {
        return;
    }
    
    // Update the hotkeys table with animation information
    const tbody = document.querySelector('#hotkeys-table tbody');
    if (!tbody) return;
    
    // Add animation hotkeys
    const keys = ['q', 'w', 'e', 'r', 't'];
    for (let i = 0; i < Math.min(duckAnimations.length, keys.length); i++) {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
        
        const keyCell = document.createElement('td');
        keyCell.style.padding = '4px 8px';
        
        const keySpan = document.createElement('span');
        keySpan.textContent = keys[i].toUpperCase();
        keySpan.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        keySpan.style.borderRadius = '3px';
        keySpan.style.padding = '2px 5px';
        keySpan.style.fontFamily = 'monospace';
        keySpan.style.fontSize = '11px';
        
        keyCell.appendChild(keySpan);
        
        const descCell = document.createElement('td');
        descCell.textContent = `Play duck animation: ${duckAnimations[i].name}`;
        descCell.style.padding = '4px 8px';
        
        row.appendChild(keyCell);
        row.appendChild(descCell);
        tbody.appendChild(row);
    }
    
    // Add active animation display
    const content = document.querySelector('#controls-content');
    if (!content) return;
    
    // Check if animation info already exists
    let animationInfo = document.querySelector('#animation-info');
    if (!animationInfo) {
        animationInfo = document.createElement('div');
        animationInfo.id = 'animation-info';
        animationInfo.style.marginTop = '12px';
        animationInfo.style.padding = '8px';
        animationInfo.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        animationInfo.style.borderRadius = '4px';
        content.appendChild(animationInfo);
    }
    
    const duckAnimInfo = document.createElement('div');
    duckAnimInfo.textContent = 'Duck Animations Hotkeys: Q-' + keys[Math.min(duckAnimations.length, keys.length) - 1].toUpperCase();
    duckAnimInfo.style.marginBottom = '5px';
    duckAnimInfo.style.marginTop = '10px';
    
    const activeDuckAnim = document.createElement('div');
    activeDuckAnim.id = 'active-duck-animation';
    activeDuckAnim.textContent = 'Active: None';
    
    animationInfo.appendChild(duckAnimInfo);
    animationInfo.appendChild(activeDuckAnim);
    
    console.log("Duck animations control panel updated");
}

// Function to update the active pig animation text
function updateActiveAnimationText(animationName) {
    const activeAnimElement = document.getElementById('active-pig-animation');
    if (activeAnimElement) {
        activeAnimElement.textContent = `Active: ${animationName}`;
    }
}

// Function to update the active duck animation text
function updateActiveDuckAnimationText(animationName) {
    const activeAnimElement = document.getElementById('active-duck-animation');
    if (activeAnimElement) {
        activeAnimElement.textContent = `Active: ${animationName}`;
    }
}

// Handle keyboard input
function onKeyDown(event) {
    // Check if key is 'b' for toggling ball visibility
    if (event.key.toLowerCase() === 'b') {
        showBall = !showBall;
        if (ball) ball.visible = showBall;
        console.log(`Ball visibility: ${showBall ? 'shown' : 'hidden'}`);
        
        // Update the toggle in the UI if the panel is visible
        updateToggleState('Ball', showBall);
    }
    
    // Check if key is 'p' for toggling pig visibility
    if (event.key.toLowerCase() === 'p') {
        showPig = !showPig;
        if (pig) pig.visible = showPig;
        console.log(`Pig visibility: ${showPig ? 'shown' : 'hidden'}`);
        
        // Update the toggle in the UI if the panel is visible
        updateToggleState('Pig', showPig);
    }
    
    // Check if key is 'd' for toggling duck visibility
    if (event.key.toLowerCase() === 'd') {
        showDuck = !showDuck;
        if (duck) duck.visible = showDuck;
        console.log(`Duck visibility: ${showDuck ? 'shown' : 'hidden'}`);
        
        // Update the toggle in the UI if the panel is visible
        updateToggleState('Duck', showDuck);
    }
    
    // Check if key is 'n' for toggling net visibility
    if (event.key.toLowerCase() === 'n') {
        showNet = !showNet;
        if (net) net.visible = showNet;
        console.log(`Net visibility: ${showNet ? 'shown' : 'hidden'}`);
        
        // Update the toggle in the UI if the panel is visible
        updateToggleState('Net', showNet);
    }
    
    // Check if key is 'm' for toggling the controls menu
    if (event.key.toLowerCase() === 'm') {
        toggleControlsPanel();
    }
    
    // Check if key is 'k' for kicking the ball
    if (event.key.toLowerCase() === 'k') {
        // Only allow kicking if ball is visible and not already animating
        if (ball && ball.visible && !ballAnimating) {
            kickBall();
        }
    }
    
    // Check if key is 's' for starting the action sequence
    if (event.key.toLowerCase() === 's') {
        startActionSequence();
    }
    
    // Check if key is '1' through '5' for pig animations
    if (event.key >= '1' && event.key <= '5' && pigAnimations && pigMixer) {
        const index = parseInt(event.key) - 1;
        if (index < pigAnimations.length) {
            // Stop any current animations
            pigMixer.stopAllAction();
            
            // Play the selected animation
            const action = pigMixer.clipAction(pigAnimations[index]);
            action.reset();
            action.play();
            
            // Update the active animation text
            updateActiveAnimationText(pigAnimations[index].name);
            
            console.log(`Playing pig animation: ${pigAnimations[index].name} (index ${index})`);
        }
    }
    
    // Check for duck animation keys (q-t)
    const duckAnimKeys = {'q': 0, 'w': 1, 'e': 2, 'r': 3, 't': 4};
    if (duckAnimKeys.hasOwnProperty(event.key.toLowerCase()) && duckAnimations && duckMixer) {
        const index = duckAnimKeys[event.key.toLowerCase()];
        if (index < duckAnimations.length) {
            // Stop any current animations
            duckMixer.stopAllAction();
            
            // Play the selected animation
            const action = duckMixer.clipAction(duckAnimations[index]);
            action.play();
            
            // Update the active animation text
            updateActiveDuckAnimationText(duckAnimations[index].name);
            
            console.log(`Playing duck animation: ${duckAnimations[index].name}`);
        }
    }
    
    // Check if key is 'r' for resetting the scene
    if (event.key.toLowerCase() === 'r') {
        resetScene();
    }
}

// Create a simple control panel
function createControlsPanel() {
    // Create container
    controlsInfo = document.createElement('div');
    controlsInfo.style.position = 'absolute';
    controlsInfo.style.top = '15px';
    controlsInfo.style.right = '15px';
    controlsInfo.style.backgroundColor = 'rgba(33, 33, 33, 0.85)';
    controlsInfo.style.color = '#e0e0e0';
    controlsInfo.style.padding = '12px';
    controlsInfo.style.borderRadius = '8px';
    controlsInfo.style.fontFamily = "'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
    controlsInfo.style.fontSize = '13px';
    controlsInfo.style.userSelect = 'none';
    controlsInfo.style.zIndex = '1000';
    controlsInfo.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    controlsInfo.style.backdropFilter = 'blur(5px)';
    controlsInfo.style.display = 'none'; // Hidden by default
    
    // Create header
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '12px';
    header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    header.style.paddingBottom = '8px';
    
    const title = document.createElement('div');
    title.textContent = 'Controls';
    title.style.fontWeight = '500';
    title.style.letterSpacing = '0.5px';
    title.style.fontSize = '14px';
    
    header.appendChild(title);
    
    // Create content container
    const content = document.createElement('div');
    content.id = 'controls-content';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '12px';
    
    // Create visibility toggles section
    const togglesSection = document.createElement('div');
    togglesSection.style.display = 'flex';
    togglesSection.style.flexWrap = 'wrap';
    togglesSection.style.gap = '8px';
    
    // Create toggle for ball
    const ballToggle = createToggle('Ball', showBall, function(checked) {
        showBall = checked;
        if (ball) ball.visible = checked;
    });
    
    // Create toggle for pig
    const pigToggle = createToggle('Pig', showPig, function(checked) {
        showPig = checked;
        if (pig) pig.visible = checked;
    });
    
    // Create toggle for duck
    const duckToggle = createToggle('Duck', showDuck, function(checked) {
        showDuck = checked;
        if (duck) duck.visible = checked;
    });
    
    // Create toggle for net
    const netToggle = createToggle('Net', showNet, function(checked) {
        showNet = checked;
        if (net) net.visible = checked;
    });
    
    togglesSection.appendChild(ballToggle);
    togglesSection.appendChild(pigToggle);
    togglesSection.appendChild(duckToggle);
    togglesSection.appendChild(netToggle);
    
    // Create hotkeys table
    const hotkeysTable = document.createElement('table');
    hotkeysTable.id = 'hotkeys-table';
    hotkeysTable.style.width = '100%';
    hotkeysTable.style.borderCollapse = 'collapse';
    hotkeysTable.style.marginTop = '8px';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    
    const keyHeader = document.createElement('th');
    keyHeader.textContent = 'Key';
    keyHeader.style.textAlign = 'left';
    keyHeader.style.padding = '4px 8px';
    keyHeader.style.fontWeight = '500';
    
    const descHeader = document.createElement('th');
    descHeader.textContent = 'Action';
    descHeader.style.textAlign = 'left';
    descHeader.style.padding = '4px 8px';
    descHeader.style.fontWeight = '500';
    
    headerRow.appendChild(keyHeader);
    headerRow.appendChild(descHeader);
    thead.appendChild(headerRow);
    hotkeysTable.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Define hotkeys
    const hotkeys = [
        { key: 'B', description: 'Toggle ball visibility' },
        { key: 'P', description: 'Toggle pig visibility' },
        { key: 'D', description: 'Toggle duck visibility' },
        { key: 'N', description: 'Toggle net visibility' },
        { key: 'K', description: 'Kick the ball' },
        { key: 'S', description: 'Start action sequence' },
        { key: 'M', description: 'Toggle controls panel' }
    ];
    
    hotkeys.forEach((hotkey, index) => {
        const row = document.createElement('tr');
        row.style.borderBottom = index < hotkeys.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none';
        
        const keyCell = document.createElement('td');
        keyCell.style.padding = '4px 8px';
        
        const keySpan = document.createElement('span');
        keySpan.textContent = hotkey.key;
        keySpan.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        keySpan.style.borderRadius = '3px';
        keySpan.style.padding = '2px 5px';
        keySpan.style.fontFamily = 'monospace';
        keySpan.style.fontSize = '11px';
        
        keyCell.appendChild(keySpan);
        
        const descCell = document.createElement('td');
        descCell.textContent = hotkey.description;
        descCell.style.padding = '4px 8px';
        
        row.appendChild(keyCell);
        row.appendChild(descCell);
        tbody.appendChild(row);
    });
    
    hotkeysTable.appendChild(tbody);
    
    // Add sections to content
    content.appendChild(togglesSection);
    
    const tableTitle = document.createElement('div');
    tableTitle.textContent = 'Hotkeys';
    tableTitle.style.fontWeight = '500';
    tableTitle.style.marginTop = '4px';
    tableTitle.style.fontSize = '13px';
    content.appendChild(tableTitle);
    
    content.appendChild(hotkeysTable);
    
    // Add header and content to container
    controlsInfo.appendChild(header);
    controlsInfo.appendChild(content);
    
    // Add to document
    document.body.appendChild(controlsInfo);
    
    console.log("Controls panel created (press 'M' to show)");
}

// Create a toggle switch
function createToggle(label, initialState, onChange) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    
    // Create the toggle switch
    const toggleContainer = document.createElement('div');
    toggleContainer.style.position = 'relative';
    toggleContainer.style.width = '36px';
    toggleContainer.style.height = '20px';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = initialState;
    checkbox.style.opacity = '0';
    checkbox.style.width = '0';
    checkbox.style.height = '0';
    
    const slider = document.createElement('div');
    slider.style.position = 'absolute';
    slider.style.cursor = 'pointer';
    slider.style.top = '0';
    slider.style.left = '0';
    slider.style.right = '0';
    slider.style.bottom = '0';
    slider.style.backgroundColor = initialState ? '#4CAF50' : '#ccc';
    slider.style.transition = '.4s';
    slider.style.borderRadius = '34px';
    
    const knob = document.createElement('div');
    knob.style.position = 'absolute';
    knob.style.content = '""';
    knob.style.height = '16px';
    knob.style.width = '16px';
    knob.style.left = initialState ? '18px' : '2px';
    knob.style.bottom = '2px';
    knob.style.backgroundColor = 'white';
    knob.style.transition = '.4s';
    knob.style.borderRadius = '50%';
    
    slider.appendChild(knob);
    toggleContainer.appendChild(checkbox);
    toggleContainer.appendChild(slider);
    
    // Create label
    const labelText = document.createElement('span');
    labelText.textContent = label;
    
    // Add elements to container
    container.appendChild(toggleContainer);
    container.appendChild(labelText);
    
    // Add event listener to slider for better click handling
    slider.addEventListener('click', function() {
        checkbox.checked = !checkbox.checked;
        slider.style.backgroundColor = checkbox.checked ? '#4CAF50' : '#ccc';
        knob.style.left = checkbox.checked ? '18px' : '2px';
        if (onChange) onChange(checkbox.checked);
    });
    
    return container;
}

// Toggle controls panel visibility
function toggleControlsPanel() {
    controlsVisible = !controlsVisible;
    controlsInfo.style.display = controlsVisible ? 'block' : 'none';
    console.log(`Controls panel ${controlsVisible ? 'shown' : 'hidden'}`);
}

// Create lights with improved settings
function createLights() {
    // Ambient light for overall scene brightness
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Main directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    
    // Improve shadow quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.bias = -0.0001;
    
    // Increase shadow area
    const shadowSize = 15;
    directionalLight.shadow.camera.left = -shadowSize;
    directionalLight.shadow.camera.right = shadowSize;
    directionalLight.shadow.camera.top = shadowSize;
    directionalLight.shadow.camera.bottom = -shadowSize;
    
    scene.add(directionalLight);
    
    // Add a fill light from the opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 8, -7);
    scene.add(fillLight);
    
    // Add a subtle rim light for depth
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);
    
    console.log("Enhanced lighting created");
}

// Create a light carpet floor instead of grass
function createCarpetFloor() {
    // Remove any existing floor
    scene.children.forEach(child => {
        if (child.name === 'floor') {
            scene.remove(child);
        }
    });
    
    // Create a texture for a light carpet
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    // Base color - light beige/cream
    context.fillStyle = '#F5F0E6';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add a subtle carpet pattern
    context.fillStyle = '#EAE5DB'; // Slightly darker for pattern
    
    // Create a grid pattern for carpet texture
    const gridSize = 16;
    for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
            // Alternate pattern
            if ((x / gridSize + y / gridSize) % 2 === 0) {
                context.fillRect(x, y, gridSize, gridSize);
            }
        }
    }
    
    // Add some random specks for texture
    context.fillStyle = '#F8F4EA'; // Lighter specks
    for (let i = 0; i < 5000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 1 + Math.random();
        context.fillRect(x, y, size, size);
    }
    
    // Create a few subtle circular patterns
    context.fillStyle = '#E8E3D9'; // Slightly darker for circular patterns
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = 10 + Math.random() * 30;
        
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
    }
    
    // Create a texture from the canvas
    const carpetTexture = new THREE.CanvasTexture(canvas);
    carpetTexture.wrapS = THREE.RepeatWrapping;
    carpetTexture.wrapT = THREE.RepeatWrapping;
    carpetTexture.repeat.set(8, 8); // Repeat the texture
    
    // Create a floor material with the carpet texture
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: carpetTexture,
        roughness: 0.8, // Carpet is not shiny
        metalness: 0.0, // Not metallic at all
        color: 0xffffff // White to let the texture show through
    });
    
    // Create a ground plane
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.name = 'floor';
    
    // Rotate and position the floor
    floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    floor.position.y = -0.01; // Slightly below zero to avoid z-fighting
    floor.receiveShadow = true;
    
    // Add to scene
    scene.add(floor);
    
    console.log("Created light carpet floor");
}

// Create a bright, cheerful cartoony sky with stylized clouds
function createCartoonySky() {
    // Remove any existing sky and clouds
    scene.children.forEach(child => {
        if (child.name === 'cartoonSky' || child.name.startsWith('cloud_')) {
            scene.remove(child);
        }
    });
    
    // Create a simple sky dome with a gradient
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    skyGeometry.scale(-1, 1, 1); // Flip inside out
    
    // Create a gradient material for the sky
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x64B5F6, // Light blue
        side: THREE.BackSide,
    });
    
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.name = 'cartoonSky';
    scene.add(sky);
    
    // Update the renderer background color to match
    renderer.setClearColor(0x64B5F6);
    
    // Now add cartoony clouds
    addStylizedCartoonClouds();
    
    console.log("Cheerful cartoony sky created with stylized cartoon clouds");
}

// Add stylized cartoon clouds - now with twice as many!
function addStylizedCartoonClouds() {
    // Create a cloud texture with a more cartoony style
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Clear canvas
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Function to draw a cartoony cloud
    function drawCartoonCloud(ctx, x, y, width, height) {
        // Draw the base of the cloud
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x, y + height * 0.6);
        
        // Bottom edge with slight curves
        ctx.bezierCurveTo(
            x + width * 0.1, y + height * 0.7,
            x + width * 0.9, y + height * 0.7,
            x + width, y + height * 0.6
        );
        
        // Right side
        ctx.bezierCurveTo(
            x + width * 1.05, y + height * 0.4,
            x + width * 0.95, y + height * 0.2,
            x + width * 0.9, y + height * 0.25
        );
        
        // Top bumps (cartoony cloud puffs)
        // First puff
        ctx.bezierCurveTo(
            x + width * 0.85, y,
            x + width * 0.65, y,
            x + width * 0.6, y + height * 0.25
        );
        
        // Second puff
        ctx.bezierCurveTo(
            x + width * 0.55, y - height * 0.1,
            x + width * 0.45, y - height * 0.1,
            x + width * 0.4, y + height * 0.2
        );
        
        // Third puff
        ctx.bezierCurveTo(
            x + width * 0.35, y - height * 0.05,
            x + width * 0.25, y - height * 0.05,
            x + width * 0.2, y + height * 0.25
        );
        
        // Left side
        ctx.bezierCurveTo(
            x + width * 0.1, y + height * 0.2,
            x - width * 0.05, y + height * 0.4,
            x, y + height * 0.6
        );
        
        ctx.closePath();
        ctx.fill();
        
        // Add some highlight for depth
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(x + width * 0.25, y + height * 0.3, width * 0.15, 0, Math.PI * 2);
        ctx.arc(x + width * 0.55, y + height * 0.2, width * 0.15, 0, Math.PI * 2);
        ctx.arc(x + width * 0.75, y + height * 0.3, width * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a subtle outline for a more cartoony look
        ctx.strokeStyle = 'rgba(220, 220, 255, 0.8)';
        ctx.lineWidth = width * 0.03;
        ctx.stroke();
    }
    
    // Draw the main cloud
    drawCartoonCloud(context, 50, 100, 400, 150);
    
    // Create a texture from the canvas
    const cloudTexture = new THREE.CanvasTexture(canvas);
    cloudTexture.premultiplyAlpha = true;
    
    // Create a material that uses the cloud texture
    const cloudMaterial = new THREE.MeshBasicMaterial({
        map: cloudTexture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    
    // Create cloud positions around the scene - DOUBLED!
    const cloudPositions = [
        // Original positions
        { x: 20, y: 15, z: -30, scale: 10, rotation: 0.1 },
        { x: -25, y: 18, z: -20, scale: 12, rotation: -0.2 },
        { x: 15, y: 12, z: 25, scale: 8, rotation: 0.15 },
        { x: -15, y: 20, z: 30, scale: 14, rotation: -0.1 },
        { x: 30, y: 25, z: 10, scale: 16, rotation: 0.05 },
        { x: -30, y: 15, z: -10, scale: 10, rotation: -0.15 },
        { x: 0, y: 30, z: -40, scale: 18, rotation: 0 },
        { x: -40, y: 20, z: 0, scale: 12, rotation: 0.2 },
        { x: 40, y: 18, z: 0, scale: 14, rotation: -0.05 },
        { x: 0, y: 25, z: 40, scale: 16, rotation: 0.1 },
        { x: 20, y: 35, z: 20, scale: 20, rotation: -0.1 },
        { x: -20, y: 30, z: -25, scale: 18, rotation: 0.05 },
        
        // Additional positions (doubled)
        { x: 10, y: 22, z: -35, scale: 11, rotation: -0.15 },
        { x: -35, y: 16, z: -15, scale: 13, rotation: 0.1 },
        { x: 25, y: 14, z: 15, scale: 9, rotation: -0.2 },
        { x: -5, y: 18, z: 35, scale: 15, rotation: 0.05 },
        { x: 35, y: 28, z: 5, scale: 17, rotation: -0.1 },
        { x: -20, y: 13, z: -5, scale: 11, rotation: 0.2 },
        { x: 5, y: 35, z: -30, scale: 19, rotation: -0.05 },
        { x: -30, y: 22, z: 10, scale: 13, rotation: -0.15 },
        { x: 30, y: 16, z: -10, scale: 15, rotation: 0.1 },
        { x: 10, y: 28, z: 30, scale: 17, rotation: -0.05 },
        { x: 15, y: 38, z: 15, scale: 21, rotation: 0.15 },
        { x: -15, y: 33, z: -20, scale: 19, rotation: -0.1 }
    ];
    
    // Create cloud billboards
    cloudPositions.forEach((pos, index) => {
        // Create a plane for the cloud
        const cloudGeometry = new THREE.PlaneGeometry(1, 0.5); // Aspect ratio matches our texture
        const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial.clone());
        
        // Position and scale the cloud
        cloud.position.set(pos.x, pos.y, pos.z);
        cloud.scale.set(pos.scale, pos.scale, 1);
        cloud.name = `cloud_${index}`;
        
        // Make the cloud always face the camera but with a slight rotation for variety
        cloud.lookAt(camera.position);
        cloud.rotation.z = pos.rotation;
        
        // Add to scene
        scene.add(cloud);
        
        // Add a simple animation to make the cloud float
        const speed = 0.0005 + Math.random() * 0.001; // Slower, gentler movement
        const direction = Math.random() > 0.5 ? 1 : -1;
        const amplitude = 0.3 + Math.random() * 0.7; // Smaller amplitude for subtle movement
        const startY = pos.y;
        
        // Store animation properties on the cloud object
        cloud.userData = {
            speed: speed,
            direction: direction,
            amplitude: amplitude,
            startY: startY,
            startTime: Math.random() * 1000 // Random start time for varied movement
        };
    });
    
    console.log("Added double the stylized cartoon clouds");
}

// Create a simple ball (fallback)
function createSimpleBall() {
    const ballGeometry = new THREE.SphereGeometry(0.15, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.1
    });
    
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.castShadow = true;
    ball.receiveShadow = true;
    ball.position.copy(ballStartPosition);
    ball.visible = showBall;
    
    scene.add(ball);
    
    console.log("Simple ball created as fallback");
}

// Create a soccer net
function createSoccerNet() {
    // Create the frame
    const frameGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    
    // Create the net group
    net = new THREE.Group();
    
    // Create the back of the net
    const backWidth = 2;
    const backHeight = 1.2;
    
    // Create the back frame
    const backFrame = new THREE.Group();
    
    // Bottom bar
    const bottomBar = new THREE.Mesh(
        new THREE.BoxGeometry(backWidth, 0.05, 0.05),
        frameMaterial
    );
    bottomBar.position.set(0, 0, 0);
    backFrame.add(bottomBar);
    
    // Top bar
    const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(backWidth, 0.05, 0.05),
        frameMaterial
    );
    topBar.position.set(0, backHeight, 0);
    backFrame.add(topBar);
    
    // Left bar
    const leftBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, backHeight, 0.05),
        frameMaterial
    );
    leftBar.position.set(-backWidth/2, backHeight/2, 0);
    backFrame.add(leftBar);
    
    // Right bar
    const rightBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, backHeight, 0.05),
        frameMaterial
    );
    rightBar.position.set(backWidth/2, backHeight/2, 0);
    backFrame.add(rightBar);
    
    // Add back frame to net
    net.add(backFrame);
    
    // Create the sides
    const sideDepth = 0.8;
    
    // Left side frame
    const leftSideFrame = new THREE.Group();
    
    // Bottom bar
    const leftBottomBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, sideDepth),
        frameMaterial
    );
    leftBottomBar.position.set(-backWidth/2, 0, sideDepth/2);
    leftSideFrame.add(leftBottomBar);
    
    // Top bar
    const leftTopBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, sideDepth),
        frameMaterial
    );
    leftTopBar.position.set(-backWidth/2, backHeight, sideDepth/2);
    leftSideFrame.add(leftTopBar);
    
    // Front bar
    const leftFrontBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, backHeight, 0.05),
        frameMaterial
    );
    leftFrontBar.position.set(-backWidth/2, backHeight/2, sideDepth);
    leftSideFrame.add(leftFrontBar);
    
    // Add left side frame to net
    net.add(leftSideFrame);
    
    // Right side frame
    const rightSideFrame = new THREE.Group();
    
    // Bottom bar
    const rightBottomBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, sideDepth),
        frameMaterial
    );
    rightBottomBar.position.set(backWidth/2, 0, sideDepth/2);
    rightSideFrame.add(rightBottomBar);
    
    // Top bar
    const rightTopBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, sideDepth),
        frameMaterial
    );
    rightTopBar.position.set(backWidth/2, backHeight, sideDepth/2);
    rightSideFrame.add(rightTopBar);
    
    // Front bar
    const rightFrontBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, backHeight, 0.05),
        frameMaterial
    );
    rightFrontBar.position.set(backWidth/2, backHeight/2, sideDepth);
    rightSideFrame.add(rightFrontBar);
    
    // Add right side frame to net
    net.add(rightSideFrame);
    
    // Create the top
    const topFrame = new THREE.Group();
    
    // Left bar
    const topLeftBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, sideDepth),
        frameMaterial
    );
    topLeftBar.position.set(-backWidth/2, backHeight, sideDepth/2);
    topFrame.add(topLeftBar);
    
    // Right bar
    const topRightBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, sideDepth),
        frameMaterial
    );
    topRightBar.position.set(backWidth/2, backHeight, sideDepth/2);
    topFrame.add(topRightBar);
    
    // Front bar
    const topFrontBar = new THREE.Mesh(
        new THREE.BoxGeometry(backWidth, 0.05, 0.05),
        frameMaterial
    );
    topFrontBar.position.set(0, backHeight, sideDepth);
    topFrame.add(topFrontBar);
    
    // Add top frame to net
    net.add(topFrame);
    
    // Create the front frame
    const frontFrame = new THREE.Group();
    
    // Bottom bar
    const frontBottomBar = new THREE.Mesh(
        new THREE.BoxGeometry(backWidth, 0.05, 0.05),
        frameMaterial
    );
    frontBottomBar.position.set(0, 0, sideDepth);
    frontFrame.add(frontBottomBar);
    
    // Left bar
    const frontLeftBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, backHeight, 0.05),
        frameMaterial
    );
    frontLeftBar.position.set(-backWidth/2, backHeight/2, sideDepth);
    frontFrame.add(frontLeftBar);
    
    // Right bar
    const frontRightBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, backHeight, 0.05),
        frameMaterial
    );
    frontRightBar.position.set(backWidth/2, backHeight/2, sideDepth);
    frontFrame.add(frontRightBar);
    
    // Top bar
    const frontTopBar = new THREE.Mesh(
        new THREE.BoxGeometry(backWidth, 0.05, 0.05),
        frameMaterial
    );
    frontTopBar.position.set(0, backHeight, sideDepth);
    frontFrame.add(frontTopBar);
    
    // Add front frame to net
    net.add(frontFrame);
    
    // Position the net
    net.position.set(-0.8, 0, 3);
    
    // Add net to scene
    scene.add(net);
    
    console.log("Soccer net created");
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize when the window loads
window.onload = init;

// Function to update toggle state in the UI
function updateToggleState(label, state) {
    // Find all toggle labels in the control panel
    const toggleLabels = document.querySelectorAll('#controls-content span');
    
    // Find the matching label
    for (let i = 0; i < toggleLabels.length; i++) {
        if (toggleLabels[i].textContent === label) {
            // Get the toggle container (parent's parent)
            const toggleContainer = toggleLabels[i].parentElement;
            
            // Find the checkbox and update it
            const checkbox = toggleContainer.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = state;
                
                // Also update the slider appearance
                const slider = toggleContainer.querySelector('div > div');
                if (slider) {
                    slider.style.backgroundColor = state ? '#4CAF50' : '#ccc';
                    
                    // Update the knob position
                    const knob = slider.querySelector('div');
                    if (knob) {
                        knob.style.left = state ? '18px' : '2px';
                    }
                }
            }
            
            break;
        }
    }
}

// Start the action sequence
function startActionSequence() {
    // Only start if not already running
    if (!actionSequenceRunning) {
        // Reset flags
        actionSequenceRunning = true;
        
        // Play the kick animation (same as pressing "2")
        if (pigMixer && pigAnimations) {
            // Use animation index 1 (the same as pressing "2")
            const kickAnimIndex = 1;
            
            // Stop any current animations
            pigMixer.stopAllAction();
            
            // Play the kick animation and store the action
            pigKickAction = pigMixer.clipAction(pigAnimations[kickAnimIndex]);
            
            // Set the animation to play once and hold the last frame
            pigKickAction.setLoop(THREE.LoopOnce);
            pigKickAction.clampWhenFinished = true;
            
            // Start the animation
            pigKickAction.reset();
            pigKickAction.play();
            
            console.log(`Pig kick animation started: ${pigAnimations[kickAnimIndex].name} (index ${kickAnimIndex})`);
        }
        
        // Wait a short time before kicking the ball
        setTimeout(() => {
            if (ball && ball.visible && !ballAnimating) {
                kickBall();
                
                // When the ball is kicked, also have the duck do the goal_save animation
                if (duckMixer && duckAnimations) {
                    // Find the goal_save animation
                    let saveAnimIndex = -1;
                    
                    // Search for an animation with "goal_save" or "save" in the name
                    for (let i = 0; i < duckAnimations.length; i++) {
                        const animName = duckAnimations[i].name.toLowerCase();
                        if (animName.includes('goal_save') || animName.includes('save')) {
                            saveAnimIndex = i;
                            break;
                        }
                    }
                    
                    // If no specific save animation found, try index 3 as a fallback
                    if (saveAnimIndex === -1) {
                        saveAnimIndex = 3;
                        console.warn("No 'goal_save' animation found. Using animation index 3 as fallback.");
                    }
                    
                    // Stop any current animations
                    duckMixer.stopAllAction();
                    
                    // Play the save animation and store the action
                    duckReactAction = duckMixer.clipAction(duckAnimations[saveAnimIndex]);
                    
                    // Set the animation to play once and hold the last frame
                    duckReactAction.setLoop(THREE.LoopOnce);
                    duckReactAction.clampWhenFinished = true;
                    
                    // Start the animation
                    duckReactAction.reset();
                    duckReactAction.play();
                    
                    console.log(`Duck goal_save animation started: ${duckAnimations[saveAnimIndex].name} (index ${saveAnimIndex})`);
                }
            }
        }, 800); // 800ms delay
        
        console.log("Action sequence started");
        
        // Log available animations to help identify the correct indices
        if (duckAnimations) {
            console.log("Available duck animations:");
            duckAnimations.forEach((anim, index) => {
                console.log(`${index}: ${anim.name}`);
            });
        }
    }
}

// Reset the scene to initial state
function resetScene() {
    // Stop any running sequence
    actionSequenceRunning = false;
    
    // Reset ball position
    if (ball) {
        ball.position.copy(ballStartPosition);
        ball.rotation.set(0, 0, 0);
    }
    
    // Reset animations
    if (pigMixer) {
        pigMixer.stopAllAction();
        
        // Find and play the "stand" animation
        if (pigAnimations && pigAnimations.length > 0) {
            let standAnimIndex = 0;
            
            for (let i = 0; i < pigAnimations.length; i++) {
                const animName = pigAnimations[i].name.toLowerCase();
                if (animName.includes('stand') || animName.includes('idle')) {
                    standAnimIndex = i;
                    break;
                }
            }
            
            const action = pigMixer.clipAction(pigAnimations[standAnimIndex]);
            action.play();
            
            updateActiveAnimationText(pigAnimations[standAnimIndex].name);
        }
    }
    
    if (duckMixer) {
        duckMixer.stopAllAction();
        
        // Find and play the "stand" animation
        if (duckAnimations && duckAnimations.length > 0) {
            let standAnimIndex = 0;
            
            for (let i = 0; i < duckAnimations.length; i++) {
                const animName = duckAnimations[i].name.toLowerCase();
                if (animName.includes('stand') || animName.includes('idle')) {
                    standAnimIndex = i;
                    break;
                }
            }
            
            const action = duckMixer.clipAction(duckAnimations[standAnimIndex]);
            action.play();
            
            updateActiveDuckAnimationText(duckAnimations[standAnimIndex].name);
        }
    }
    
    // Reset flags
    ballAnimating = false;
    ballAnimationCompleted = false;
    pigAnimationStarted = false;
    duckReactionStarted = false;
    
    console.log("Scene reset to initial state");
}

// Kick the ball with a smooth, simple arc
function kickBall() {
    // Only start if not already animating
    if (!ballAnimating && ball) {
        // Reset ball position to start
        ball.position.copy(ballStartPosition);
        ball.rotation.set(0, 0, 0);
        
        // Start animation
        ballAnimating = true;
        ballAnimationStartTime = Date.now();
        ballAnimationCompleted = false;
        
        console.log("Ball kicked with smooth arc");
    }
}
