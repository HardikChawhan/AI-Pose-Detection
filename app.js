// ==============================================
// MAIN APPLICATION - FITNESS POSE DETECTION
// ==============================================

// Global variables
let video, canvas, ctx;
let detector = null;
let animationFrameId = null;
let currentExercise = 'squat';
let stateMachine = null;
let voiceFeedback = null;
let isModelLoaded = false;

// Exercise state machines
let squatMachine = null;
let benchMachine = null;
let deadliftMachine = null;

// UI Elements
let repCountDisplay, currentStateDisplay, formQualityDisplay;
let feedbackContainer, debugPanel, loadingElement, statusOverlay;
let voiceToggle, difficultySelect, exerciseButtons;

// Frame throttling for performance
let frameCount = 0;
const PROCESS_EVERY_N_FRAMES = 2; // Process every 2nd frame for 15-30 FPS

// ==============================================
// 1. INITIALIZATION
// ==============================================

/**
 * Initialize the application on page load
 */
async function init() {
    console.log('🚀 Initializing AI Fitness Pose Detection...');
    
    // Get DOM elements
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    repCountDisplay = document.getElementById('rep-count');
    currentStateDisplay = document.getElementById('current-state');
    formQualityDisplay = document.getElementById('form-quality');
    feedbackContainer = document.getElementById('feedback-container');
    debugPanel = document.getElementById('debug-info');
    loadingElement = document.getElementById('loading');
    statusOverlay = document.getElementById('status-overlay');
    
    voiceToggle = document.getElementById('voice-toggle');
    difficultySelect = document.getElementById('difficulty-select');
    exerciseButtons = document.querySelectorAll('.exercise-btn');
    
    // Initialize voice feedback
    voiceFeedback = new VoiceFeedback();
    
    // Initialize state machines
    initializeStateMachines('beginner');
    
    // Setup event listeners
    setupEventListeners();
    
    try {
        // Setup camera
        await setupCamera();
        
        // Load pose detection model
        await loadPoseDetectionModel();
        
        // Start detection loop
        detectPose();
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showFeedback('error', 'Failed to initialize: ' + error.message);
    }
}

/**
 * Initialize state machines for all exercises
 * @param {string} difficulty - 'beginner' or 'advanced'
 */
function initializeStateMachines(difficulty) {
    squatMachine = new SquatStateMachine(difficulty);
    benchMachine = new BenchPressStateMachine(difficulty);
    deadliftMachine = new DeadliftStateMachine(difficulty);
    
    // Set current state machine based on selected exercise
    stateMachine = squatMachine;
}

/**
 * Setup event listeners for UI controls
 */
function setupEventListeners() {
    // Exercise selection buttons
    exerciseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            exerciseButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Switch exercise
            currentExercise = btn.dataset.exercise;
            switchExercise(currentExercise);
        });
    });
    
    // Voice toggle
    voiceToggle.addEventListener('change', (e) => {
        voiceFeedback.toggle();
    });
    
    // Difficulty change
    difficultySelect.addEventListener('change', (e) => {
        const difficulty = e.target.value;
        initializeStateMachines(difficulty);
        stateMachine.reset();
        updateRepCountDisplay();
        showFeedback('info', `Switched to ${difficulty} mode`);
    });
    
    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
        stateMachine.reset();
        updateRepCountDisplay();
        showFeedback('info', 'Rep count reset');
    });
}

/**
 * Switch between exercises
 * @param {string} exercise - 'squat', 'bench', or 'deadlift'
 */
function switchExercise(exercise) {
    switch(exercise) {
        case 'squat':
            stateMachine = squatMachine;
            break;
        case 'bench':
            stateMachine = benchMachine;
            break;
        case 'deadlift':
            stateMachine = deadliftMachine;
            break;
    }
    
    updateRepCountDisplay();
    showFeedback('info', `Switched to ${exercise.toUpperCase()}`);
}

// ==============================================
// 2. CAMERA SETUP
// ==============================================

/**
 * Setup camera using getUserMedia API
 */
async function setupCamera() {
    console.log('📷 Setting up camera...');
    
    // Check if running on file:// protocol
    if (window.location.protocol === 'file:') {
        throw new Error('Camera requires HTTP/HTTPS. Please run: npm start (or use a local server)');
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser. Please use Chrome, Firefox, or Edge.');
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: false
        });
        
        video.srcObject = stream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                
                // Set canvas size to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                console.log('✅ Camera ready:', video.videoWidth, 'x', video.videoHeight);
                resolve();
            };
        });
    } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            throw new Error('Camera access denied. Please allow camera permissions and refresh.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            throw new Error('No camera found. Please connect a camera and refresh.');
        } else {
            throw new Error('Camera error: ' + err.message);
        }
    }
}

// ==============================================
// 3. POSE DETECTION MODEL LOADING
// ==============================================

/**
 * Load TensorFlow.js MoveNet Lightning model
 */
async function loadPoseDetectionModel() {
    console.log('🧠 Loading MoveNet pose detection model...');
    
    try {
        // Set TensorFlow.js backend (WebGL for performance)
        await tf.setBackend('webgl');
        await tf.ready();
        
        console.log('TensorFlow.js backend:', tf.getBackend());
        
        // Create detector using MoveNet Lightning
        const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
            minPoseScore: 0.25
        };
        
        detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            detectorConfig
        );
        
        isModelLoaded = true;
        console.log('✅ MoveNet model loaded successfully');
        
        // Hide loading overlay
        statusOverlay.style.display = 'none';
        
        showFeedback('success', 'Model loaded! Start exercising!');
        
    } catch (error) {
        console.error('❌ Model loading error:', error);
        showFeedback('error', 'Failed to load pose detection model');
        throw error;
    }
}

// ==============================================
// 4. POSE DETECTION LOOP
// ==============================================

/**
 * Main pose detection loop (runs continuously)
 */
async function detectPose() {
    if (!isModelLoaded || !detector) {
        animationFrameId = requestAnimationFrame(detectPose);
        return;
    }
    
    frameCount++;
    
    // Process every N frames for performance
    if (frameCount % PROCESS_EVERY_N_FRAMES === 0) {
        try {
            // Detect poses in current video frame
            const poses = await detector.estimatePoses(video);
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (poses && poses.length > 0) {
                const pose = poses[0];
                
                // Draw skeleton
                drawSkeleton(pose.keypoints, ctx);
                
                // Process pose based on current exercise
                processPose(pose.keypoints);
            } else {
                showFeedback('warning', 'No person detected - move into frame');
            }
            
        } catch (error) {
            console.error('Detection error:', error);
        }
    }
    
    // Continue loop
    animationFrameId = requestAnimationFrame(detectPose);
}

// ==============================================
// 5. POSE PROCESSING BY EXERCISE TYPE
// ==============================================

/**
 * Process detected pose keypoints based on current exercise
 * @param {Array} keypoints - detected keypoints from pose model
 */
function processPose(keypoints) {
    switch(currentExercise) {
        case 'squat':
            processSquat(keypoints);
            break;
        case 'bench':
            processBenchPress(keypoints);
            break;
        case 'deadlift':
            processDeadlift(keypoints);
            break;
    }
}

/**
 * Process squat exercise
 * @param {Array} keypoints - pose keypoints
 */
function processSquat(keypoints) {
    // Extract relevant keypoints (side view)
    // Using left side landmarks: shoulder(5), hip(11), knee(13), ankle(15)
    const leftShoulder = getKeypoint(keypoints, 5);
    const leftHip = getKeypoint(keypoints, 11);
    const leftKnee = getKeypoint(keypoints, 13);
    const leftAnkle = getKeypoint(keypoints, 15);
    
    // Try right side as fallback
    const rightShoulder = getKeypoint(keypoints, 6);
    const rightHip = getKeypoint(keypoints, 12);
    const rightKnee = getKeypoint(keypoints, 14);
    const rightAnkle = getKeypoint(keypoints, 16);
    
    // Use whichever side is more visible
    const shoulder = leftShoulder || rightShoulder;
    const hip = leftHip || rightHip;
    const knee = leftKnee || rightKnee;
    const ankle = leftAnkle || rightAnkle;
    
    if (!hip || !knee || !ankle) {
        currentStateDisplay.textContent = 'Not Detected';
        return;
    }
    
    // Calculate angles
    const kneeAngle = calculateAngle(hip, knee, ankle);
    const hipAngle = calculateAngle(shoulder, hip, knee);
    const torsoLean = shoulder ? calculateVerticalAngle(shoulder, hip) : null;
    
    // Calculate distances for form checking
    const legLength = calculateDistance(hip, ankle);
    const kneeToeDistance = ankle ? calculateHorizontalDistance(knee, ankle) : null;
    
    // Update state machine
    stateMachine.update(
        { knee: kneeAngle, hip: hipAngle, torsoLean: torsoLean },
        { kneeToe: kneeToeDistance, legLength: legLength }
    );
    
    // Update UI
    updateUI(stateMachine);
    
    // Debug display
    displayDebugInfo({
        'Knee Angle': kneeAngle ? kneeAngle.toFixed(1) + '°' : 'N/A',
        'Hip Angle': hipAngle ? hipAngle.toFixed(1) + '°' : 'N/A',
        'Torso Lean': torsoLean ? torsoLean.toFixed(1) + '°' : 'N/A'
    });
}

/**
 * Process bench press exercise
 * @param {Array} keypoints - pose keypoints
 */
function processBenchPress(keypoints) {
    // Extract arm keypoints
    // Left arm: shoulder(5), elbow(7), wrist(9)
    const leftShoulder = getKeypoint(keypoints, 5);
    const leftElbow = getKeypoint(keypoints, 7);
    const leftWrist = getKeypoint(keypoints, 9);
    
    // Right arm: shoulder(6), elbow(8), wrist(10)
    const rightShoulder = getKeypoint(keypoints, 6);
    const rightElbow = getKeypoint(keypoints, 8);
    const rightWrist = getKeypoint(keypoints, 10);
    
    // Use whichever arm is more visible (or average both)
    let elbowAngle = null;
    let shoulderAngle = null;
    
    if (leftShoulder && leftElbow && leftWrist) {
        elbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
        shoulderAngle = calculateAngle(leftElbow, leftShoulder, leftElbow);
    }
    
    if (rightShoulder && rightElbow && rightWrist) {
        const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
        elbowAngle = elbowAngle ? (elbowAngle + rightElbowAngle) / 2 : rightElbowAngle;
    }
    
    if (!elbowAngle) {
        currentStateDisplay.textContent = 'Arms Not Detected';
        return;
    }
    
    // Update state machine
    stateMachine.update(
        { elbow: elbowAngle, shoulder: shoulderAngle },
        { wrist: leftWrist || rightWrist, elbow: leftElbow || rightElbow, shoulder: leftShoulder || rightShoulder }
    );
    
    // Update UI
    updateUI(stateMachine);
    
    // Debug display
    displayDebugInfo({
        'Elbow Angle': elbowAngle ? elbowAngle.toFixed(1) + '°' : 'N/A',
        'Shoulder Angle': shoulderAngle ? shoulderAngle.toFixed(1) + '°' : 'N/A'
    });
}

/**
 * Process deadlift exercise
 * @param {Array} keypoints - pose keypoints
 */
function processDeadlift(keypoints) {
    // Extract keypoints for deadlift (side view)
    const shoulder = getKeypoint(keypoints, 5) || getKeypoint(keypoints, 6);
    const hip = getKeypoint(keypoints, 11) || getKeypoint(keypoints, 12);
    const knee = getKeypoint(keypoints, 13) || getKeypoint(keypoints, 14);
    const ankle = getKeypoint(keypoints, 15) || getKeypoint(keypoints, 16);
    
    if (!hip || !knee || !ankle) {
        currentStateDisplay.textContent = 'Not Detected';
        return;
    }
    
    // Calculate angles
    const hipAngle = calculateAngle(shoulder, hip, knee);
    const kneeAngle = calculateAngle(hip, knee, ankle);
    const backAngle = shoulder ? calculateVerticalAngle(shoulder, hip) : null;
    
    // Update state machine
    stateMachine.update({
        hip: hipAngle,
        knee: kneeAngle,
        back: backAngle
    });
    
    // Update UI
    updateUI(stateMachine);
    
    // Debug display
    displayDebugInfo({
        'Hip Angle': hipAngle ? hipAngle.toFixed(1) + '°' : 'N/A',
        'Knee Angle': kneeAngle ? kneeAngle.toFixed(1) + '°' : 'N/A',
        'Back Angle': backAngle ? backAngle.toFixed(1) + '°' : 'N/A'
    });
}

// ==============================================
// 6. UI UPDATE FUNCTIONS
// ==============================================

/**
 * Update UI with current state machine data
 * @param {Object} machine - current state machine
 */
function updateUI(machine) {
    // Update rep count
    updateRepCountDisplay();
    
    // Update current state
    currentStateDisplay.textContent = machine.state.charAt(0).toUpperCase() + machine.state.slice(1);
    
    // Update form quality based on feedback
    const hasErrors = machine.feedbackMessages.some(msg => msg.type === 'error');
    const hasWarnings = machine.feedbackMessages.some(msg => msg.type === 'warning');
    
    if (hasErrors) {
        formQualityDisplay.textContent = 'Poor';
        formQualityDisplay.style.color = '#ff4444';
    } else if (hasWarnings) {
        formQualityDisplay.textContent = 'Good';
        formQualityDisplay.style.color = '#ffaa00';
    } else {
        formQualityDisplay.textContent = 'Perfect';
        formQualityDisplay.style.color = '#00ff00';
    }
    
    // Display feedback messages
    if (machine.feedbackMessages.length > 0) {
        machine.feedbackMessages.forEach(msg => {
            showFeedback(msg.type, msg.text);
            
            // Voice feedback for important messages
            if (msg.type === 'success' || msg.type === 'error') {
                voiceFeedback.speak(msg.text);
            }
        });
    }
}

/**
 * Update rep count display
 */
function updateRepCountDisplay() {
    repCountDisplay.textContent = stateMachine.repCount;
}

/**
 * Show feedback message in UI
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {string} text - message text
 */
function showFeedback(type, text) {
    // Clear previous messages (keep last 3)
    while (feedbackContainer.children.length > 3) {
        feedbackContainer.removeChild(feedbackContainer.firstChild);
    }
    
    // Create new message element
    const messageEl = document.createElement('p');
    messageEl.className = `feedback-message ${type}`;
    messageEl.textContent = text;
    
    // Add to container
    feedbackContainer.appendChild(messageEl);
    
    // Fade out after 5 seconds
    setTimeout(() => {
        messageEl.style.opacity = '0';
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 500);
    }, 5000);
}

/**
 * Display debug information (angles)
 * @param {Object} info - key-value pairs to display
 */
function displayDebugInfo(info) {
    if (!debugPanel) return;
    
    let html = '';
    for (const [key, value] of Object.entries(info)) {
        html += `<div><strong>${key}:</strong> ${value}</div>`;
    }
    debugPanel.innerHTML = html;
}

// ==============================================
// 7. APPLICATION STARTUP
// ==============================================

// Start application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
});

console.log('✅ App.js loaded successfully');
