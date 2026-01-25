// ==============================================
// UTILITY FUNCTIONS FOR FITNESS POSE DETECTION
// ==============================================

// ==============================================
// 1. ANGLE CALCULATION FUNCTIONS
// ==============================================

/**
 * Calculate angle between three points (A, B, C) where B is the vertex
 * Returns angle in degrees at point B
 * @param {Object} pointA - {x, y} coordinates
 * @param {Object} pointB - {x, y} coordinates (vertex)
 * @param {Object} pointC - {x, y} coordinates
 * @returns {number} - angle in degrees (0-180)
 */
function calculateAngle(pointA, pointB, pointC) {
    if (!pointA || !pointB || !pointC) return null;
    
    // Calculate vectors BA and BC
    const radians1 = Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
    const radians2 = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x);
    
    // Calculate angle difference
    let angle = Math.abs(radians1 - radians2) * (180 / Math.PI);
    
    // Normalize to 0-180 range
    if (angle > 180) {
        angle = 360 - angle;
    }
    
    return angle;
}

/**
 * Calculate angle between a line segment and vertical axis
 * Used to check torso lean, back straightness, etc.
 * @param {Object} point1 - {x, y} top point
 * @param {Object} point2 - {x, y} bottom point
 * @returns {number} - angle from vertical in degrees
 */
function calculateVerticalAngle(point1, point2) {
    if (!point1 || !point2) return null;
    
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    
    // Angle from vertical (0 = perfectly vertical)
    const angleFromVertical = Math.abs(Math.atan2(dx, dy) * (180 / Math.PI));
    
    return angleFromVertical;
}

/**
 * Calculate horizontal distance between two points
 * Used for knee-toe alignment checks
 * @param {Object} point1 - {x, y}
 * @param {Object} point2 - {x, y}
 * @returns {number} - horizontal distance
 */
function calculateHorizontalDistance(point1, point2) {
    if (!point1 || !point2) return null;
    return Math.abs(point1.x - point2.x);
}

/**
 * Calculate Euclidean distance between two points
 * @param {Object} point1 - {x, y}
 * @param {Object} point2 - {x, y}
 * @returns {number} - distance
 */
function calculateDistance(point1, point2) {
    if (!point1 || !point2) return null;
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// ==============================================
// 2. SQUAT STATE MACHINE & LOGIC
// ==============================================

class SquatStateMachine {
    constructor(difficulty = 'beginner') {
        this.state = 'standing';
        this.repCount = 0;
        this.difficulty = difficulty;
        this.feedbackMessages = [];
        this.lastRepTime = 0;
        
        // Thresholds based on difficulty
        this.thresholds = difficulty === 'beginner' ? {
            descendKneeAngle: 120,
            descendHipAngle: 120,
            bottomKneeAngle: 90,
            bottomHipAngle: 100,
            ascendKneeAngle: 140,
            depthKneeAngle: 100, // Must go below this
            kneeToeRatio: 0.15, // Knee can be 15% of leg length forward
            torsoLeanAngle: 45 // Max torso lean from vertical
        } : {
            descendKneeAngle: 115,
            descendHipAngle: 115,
            bottomKneeAngle: 80,
            bottomHipAngle: 90,
            ascendKneeAngle: 140,
            depthKneeAngle: 90,
            kneeToeRatio: 0.10,
            torsoLeanAngle: 35
        };
        
        this.minDepthReached = false;
    }
    
    /**
     * Process squat frame and update state
     * @param {Object} angles - {knee, hip, torsoLean}
     * @param {Object} distances - {kneeToe, legLength}
     */
    update(angles, distances) {
        this.feedbackMessages = [];
        
        if (!angles.knee || !angles.hip) {
            this.feedbackMessages.push({type: 'warning', text: 'Cannot detect pose - ensure full body is visible'});
            return;
        }
        
        const { knee, hip, torsoLean } = angles;
        const { kneeToe, legLength } = distances;
        
        // State machine logic
        switch(this.state) {
            case 'standing':
                if (knee < this.thresholds.descendKneeAngle && hip < this.thresholds.descendHipAngle) {
                    this.state = 'descending';
                    this.minDepthReached = false;
                }
                break;
                
            case 'descending':
                // Check for minimum depth
                if (knee < this.thresholds.depthKneeAngle) {
                    this.minDepthReached = true;
                }
                
                // Check if reached bottom position
                if (knee < this.thresholds.bottomKneeAngle && hip < this.thresholds.bottomHipAngle) {
                    this.state = 'bottom';
                }
                
                // Check form during descent
                this.checkSquatForm(torsoLean, kneeToe, legLength);
                break;
                
            case 'bottom':
                // Start ascending
                if (knee > this.thresholds.bottomKneeAngle + 10) {
                    this.state = 'ascending';
                }
                this.checkSquatForm(torsoLean, kneeToe, legLength);
                break;
                
            case 'ascending':
                // Complete rep when back to standing
                if (knee > this.thresholds.ascendKneeAngle && hip > this.thresholds.ascendKneeAngle) {
                    if (this.minDepthReached) {
                        this.repCount++;
                        this.feedbackMessages.push({type: 'success', text: 'Good rep! ✓'});
                        this.lastRepTime = Date.now();
                    } else {
                        this.feedbackMessages.push({type: 'error', text: 'Too shallow - go deeper!'});
                    }
                    this.state = 'standing';
                    this.minDepthReached = false;
                }
                this.checkSquatForm(torsoLean, kneeToe, legLength);
                break;
        }
    }
    
    checkSquatForm(torsoLean, kneeToe, legLength) {
        // Check knee alignment
        if (legLength && kneeToe / legLength > this.thresholds.kneeToeRatio) {
            this.feedbackMessages.push({type: 'warning', text: 'Keep knees behind toes'});
        }
        
        // Check torso lean
        if (torsoLean && torsoLean > this.thresholds.torsoLeanAngle) {
            this.feedbackMessages.push({type: 'warning', text: 'Keep torso more upright'});
        }
    }
    
    reset() {
        this.repCount = 0;
        this.state = 'standing';
        this.minDepthReached = false;
    }
}

// ==============================================
// 3. BENCH PRESS STATE MACHINE & LOGIC
// ==============================================

class BenchPressStateMachine {
    constructor(difficulty = 'beginner') {
        this.state = 'up';
        this.repCount = 0;
        this.difficulty = difficulty;
        this.feedbackMessages = [];
        this.lastRepTime = 0;
        
        this.thresholds = difficulty === 'beginner' ? {
            downElbowAngle: 110,
            downShoulderAngle: 100,
            upElbowAngle: 160,
            pathDeviation: 0.2 // 20% deviation allowed
        } : {
            downElbowAngle: 90,
            downShoulderAngle: 90,
            upElbowAngle: 170,
            pathDeviation: 0.15
        };
    }
    
    /**
     * Process bench press frame
     * @param {Object} angles - {elbow, shoulder}
     * @param {Object} positions - {wrist, elbow, shoulder}
     */
    update(angles, positions) {
        this.feedbackMessages = [];
        
        if (!angles.elbow) {
            this.feedbackMessages.push({type: 'warning', text: 'Cannot detect arms - ensure arms are visible'});
            return;
        }
        
        const { elbow, shoulder } = angles;
        
        switch(this.state) {
            case 'up':
                // Moving down
                if (elbow < this.thresholds.downElbowAngle) {
                    this.state = 'down';
                }
                break;
                
            case 'down':
                // Check depth
                if (elbow < this.thresholds.downElbowAngle && 
                    (!shoulder || shoulder < this.thresholds.downShoulderAngle)) {
                    // Good depth
                }
                
                // Pushing back up
                if (elbow > this.thresholds.upElbowAngle) {
                    this.repCount++;
                    this.feedbackMessages.push({type: 'success', text: 'Good rep! ✓'});
                    this.state = 'up';
                    this.lastRepTime = Date.now();
                }
                
                // Check form
                this.checkBenchForm(positions);
                break;
        }
    }
    
    checkBenchForm(positions) {
        // Check for controlled bar path (wrist should stay relatively aligned with shoulder)
        if (positions.wrist && positions.shoulder) {
            const horizontalDeviation = Math.abs(positions.wrist.x - positions.shoulder.x);
            const shoulderWidth = Math.abs(positions.shoulder.x - positions.elbow.x);
            
            if (horizontalDeviation / shoulderWidth > this.thresholds.pathDeviation) {
                this.feedbackMessages.push({type: 'warning', text: 'Keep controlled bar path'});
            }
        }
    }
    
    reset() {
        this.repCount = 0;
        this.state = 'up';
    }
}

// ==============================================
// 4. DEADLIFT STATE MACHINE & LOGIC
// ==============================================

class DeadliftStateMachine {
    constructor(difficulty = 'beginner') {
        this.state = 'start';
        this.repCount = 0;
        this.difficulty = difficulty;
        this.feedbackMessages = [];
        this.lastRepTime = 0;
        
        this.thresholds = difficulty === 'beginner' ? {
            startHipAngle: 110,
            liftingHipAngle: 130,
            lockoutHipAngle: 160,
            lockoutKneeAngle: 165,
            backAngleMax: 40 // Max back lean from vertical
        } : {
            startHipAngle: 100,
            liftingHipAngle: 130,
            lockoutHipAngle: 170,
            lockoutKneeAngle: 170,
            backAngleMax: 30
        };
    }
    
    /**
     * Process deadlift frame
     * @param {Object} angles - {hip, knee, back}
     */
    update(angles) {
        this.feedbackMessages = [];
        
        if (!angles.hip || !angles.knee) {
            this.feedbackMessages.push({type: 'warning', text: 'Cannot detect pose - stand sideways to camera'});
            return;
        }
        
        const { hip, knee, back } = angles;
        
        switch(this.state) {
            case 'start':
                // In starting position (bent over)
                if (hip < this.thresholds.startHipAngle) {
                    this.state = 'lifting';
                }
                break;
                
            case 'lifting':
                // Lifting phase
                if (hip > this.thresholds.liftingHipAngle) {
                    this.state = 'lockout';
                }
                
                // Check back position during lift
                if (back && back > this.thresholds.backAngleMax) {
                    this.feedbackMessages.push({type: 'error', text: 'Keep back straighter!'});
                }
                break;
                
            case 'lockout':
                // Complete lockout
                if (hip > this.thresholds.lockoutHipAngle && knee > this.thresholds.lockoutKneeAngle) {
                    this.repCount++;
                    this.feedbackMessages.push({type: 'success', text: 'Good rep! ✓'});
                    this.lastRepTime = Date.now();
                    this.state = 'lowering';
                }
                break;
                
            case 'lowering':
                // Lowering back down
                if (hip < this.thresholds.startHipAngle) {
                    this.state = 'start';
                }
                break;
        }
    }
    
    reset() {
        this.repCount = 0;
        this.state = 'start';
    }
}

// ==============================================
// 5. VOICE FEEDBACK USING WEB SPEECH API
// ==============================================

class VoiceFeedback {
    constructor() {
        this.synth = window.speechSynthesis;
        this.enabled = true;
        this.lastSpokenTime = 0;
        this.minSpeechInterval = 3000; // Minimum 3 seconds between speeches
    }
    
    speak(text) {
        if (!this.enabled || !this.synth) return;
        
        const now = Date.now();
        if (now - this.lastSpokenTime < this.minSpeechInterval) {
            return; // Throttle speech
        }
        
        // Cancel any ongoing speech
        this.synth.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        this.synth.speak(utterance);
        this.lastSpokenTime = now;
    }
    
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.synth.cancel();
        }
    }
}

// ==============================================
// 6. KEYPOINT EXTRACTION HELPERS
// ==============================================

/**
 * Extract specific keypoint from pose with confidence check
 * @param {Array} keypoints - pose keypoints array
 * @param {number} index - keypoint index
 * @param {number} minConfidence - minimum confidence threshold
 * @returns {Object|null} - {x, y} or null
 */
function getKeypoint(keypoints, index, minConfidence = 0.6) {
    if (!keypoints || !keypoints[index]) return null;
    
    const keypoint = keypoints[index];
    if (keypoint.score < minConfidence) return null;
    
    return { x: keypoint.x, y: keypoint.y };
}

/**
 * Get average of left and right keypoints (for symmetric points like shoulders, hips)
 * @param {Object} left - {x, y}
 * @param {Object} right - {x, y}
 * @returns {Object|null} - {x, y} average or null
 */
function getAveragePoint(left, right) {
    if (!left && !right) return null;
    if (!left) return right;
    if (!right) return left;
    
    return {
        x: (left.x + right.x) / 2,
        y: (left.y + right.y) / 2
    };
}

// ==============================================
// 7. DRAWING UTILITIES FOR CANVAS
// ==============================================

/**
 * Draw skeleton on canvas
 * @param {Array} keypoints - pose keypoints
 * @param {CanvasRenderingContext2D} ctx - canvas context
 * @param {number} minConfidence - minimum confidence to draw
 */
function drawSkeleton(keypoints, ctx, minConfidence = 0.6) {
    // Define skeleton connections (MoveNet/MediaPipe standard)
    const connections = [
        [5, 6],   // shoulders
        [5, 7],   // left shoulder to elbow
        [7, 9],   // left elbow to wrist
        [6, 8],   // right shoulder to elbow
        [8, 10],  // right elbow to wrist
        [5, 11],  // left shoulder to hip
        [6, 12],  // right shoulder to hip
        [11, 12], // hips
        [11, 13], // left hip to knee
        [13, 15], // left knee to ankle
        [12, 14], // right hip to knee
        [14, 16], // right knee to ankle
    ];
    
    // Draw connections
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    
    connections.forEach(([startIdx, endIdx]) => {
        const start = keypoints[startIdx];
        const end = keypoints[endIdx];
        
        if (start && end && start.score > minConfidence && end.score > minConfidence) {
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
        }
    });
    
    // Draw keypoints
    keypoints.forEach((keypoint, idx) => {
        if (keypoint.score > minConfidence) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

/**
 * Draw text feedback on canvas
 * @param {string} text - text to draw
 * @param {CanvasRenderingContext2D} ctx - canvas context
 * @param {number} x - x position
 * @param {number} y - y position
 * @param {string} color - text color
 */
function drawText(text, ctx, x, y, color = '#ffffff') {
    ctx.fillStyle = color;
    ctx.font = 'bold 24px Arial';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
}
