# 🏋️ AI Fitness Pose Detection - Rep Counter

Real-time camera-based fitness pose detection and rep counting application using TensorFlow.js MoveNet. Track your squats, bench press, and deadlift exercises with automatic rep counting and form feedback.

![License](https://img.shields.io/badge/license-MIT-green)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.11.0-orange)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)

## 🌟 Features

- **Real-time Pose Detection**: Uses TensorFlow.js MoveNet Lightning model for fast, accurate pose estimation
- **3 Exercise Types**: Squats, Bench Press, and Deadlift with custom state machines
- **Automatic Rep Counting**: Intelligent state machines track exercise phases and count reps
- **Form Feedback**: Real-time posture analysis with visual and voice feedback
- **Voice Guidance**: Web Speech API announces form corrections and rep completions
- **Difficulty Modes**: Beginner and Advanced thresholds for different fitness levels
- **Browser-Based**: No installation required - runs entirely in your browser
- **Privacy-Focused**: All processing happens locally - no data sent to servers

## 🎯 Supported Exercises

### 🧍 Squats
- Monitors knee and hip angles
- Checks depth (parallel or below)
- Detects knee-toe alignment
- Tracks torso lean

### 💪 Bench Press
- Tracks elbow extension
- Monitors bar path control
- Checks shoulder stability
- Counts full range reps

### 🏋️ Deadlift
- Monitors hip extension
- Checks back straightness
- Tracks knee stability
- Ensures proper lockout

## 🚀 Quick Start

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Webcam access
- Node.js (optional, for local server)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ai-fitness-pose-detection.git
cd ai-fitness-pose-detection
```

2. **Install dependencies** (optional)
```bash
npm install
```

3. **Run local server**

**Option A: Using npm**
```bash
npm start
```

**Option B: Using Python**
```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

**Option C: Using VS Code Live Server**
- Install "Live Server" extension in VS Code
- Right-click `index.html` and select "Open with Live Server"

4. **Open in browser**
```
http://localhost:8080
```

### Using CDN (No Installation Required)
Simply open `index.html` in your browser - the app loads TensorFlow.js and MoveNet from CDN automatically.

## 📖 How to Use

1. **Grant Camera Access**: Allow the browser to access your webcam
2. **Select Exercise**: Click on Squats, Bench Press, or Deadlift
3. **Position Yourself**: 
   - Squats/Deadlift: Stand sideways to camera
   - Bench Press: Face camera or use side view
   - Ensure your entire body is visible in frame
4. **Start Exercising**: The app will automatically detect and count your reps
5. **Listen for Feedback**: Voice and visual feedback guide your form

## 🎨 UI Components

- **Exercise Selector**: Switch between exercise types
- **Rep Counter**: Live rep count display
- **Current State**: Shows exercise phase (standing, descending, bottom, etc.)
- **Form Quality**: Real-time form assessment (Perfect, Good, Poor)
- **Feedback Panel**: Live text feedback messages
- **Debug Panel**: Optional angle display for advanced users
- **Settings**: Voice toggle and difficulty selection

## ⚙️ Technical Architecture

### Models Used
- **Primary**: TensorFlow.js MoveNet Lightning (fastest, 15-30 FPS)
- **Backend**: WebGL for GPU acceleration
- **Keypoints**: 17 body landmarks with confidence scores

### File Structure
```
AI_Pose_Detection/
├── index.html          # Main HTML structure
├── app.js             # Pose detection & main logic
├── utils.js           # Angle calculations & state machines
├── styles.css         # UI styling
├── package.json       # Dependencies
└── README.md          # Documentation
```

### Key Technologies
- **TensorFlow.js**: Machine learning in the browser
- **MoveNet**: Pre-trained pose estimation model
- **Web Speech API**: Voice feedback
- **Canvas API**: Skeleton visualization
- **getUserMedia**: Camera access

## 🧮 Angle Calculations

The app computes joint angles using three-point angle calculations:

```javascript
angle(A, B, C) = angle at vertex B
- Uses atan2 for precise angle calculation
- Returns angles in 0-180° range
- Filters low confidence keypoints (< 0.6)
```

### Monitored Angles
- **Knee Angle**: Hip → Knee → Ankle
- **Hip Angle**: Shoulder → Hip → Knee
- **Elbow Angle**: Shoulder → Elbow → Wrist
- **Torso Lean**: Shoulder → Hip vs. vertical
- **Back Angle**: Shoulder → Hip vs. vertical

## 🎛️ State Machines

Each exercise uses a state machine for rep tracking:

### Squat States
1. **Standing** → 2. **Descending** → 3. **Bottom** → 4. **Ascending** → 1. **Standing** (rep++)

### Bench Press States
1. **Up** → 2. **Down** → 1. **Up** (rep++)

### Deadlift States
1. **Start** → 2. **Lifting** → 3. **Lockout** → 4. **Lowering** → 1. **Start** (rep++)

## 🔧 Configuration

### Difficulty Thresholds

**Beginner Mode**: More lenient angle thresholds
- Squat depth: 100° knee angle
- Torso lean: Up to 45°

**Advanced Mode**: Stricter form requirements
- Squat depth: 90° knee angle
- Torso lean: Up to 35°

### Performance Settings
- Frame processing: Every 2nd frame (adjustable in `app.js`)
- Confidence threshold: 0.6 (adjustable)
- Speech interval: 3 seconds minimum

## 🐛 Troubleshooting

### Camera Not Working
- Ensure browser has camera permissions
- Use HTTPS (required for camera access on non-localhost)
- Try different browsers (Chrome recommended)

### Model Loading Slow
- Check internet connection (models load from CDN)
- Clear browser cache
- Ensure WebGL is supported

### Pose Not Detected
- Improve lighting conditions
- Move entire body into frame
- Stand 6-10 feet from camera
- Ensure contrasting background

### Rep Count Incorrect
- Perform full range of motion
- Maintain steady pace
- Ensure side view for squats/deadlifts
- Adjust difficulty setting

## 📊 Performance Tips

1. **Optimal Setup**:
   - Good lighting
   - Contrasting background
   - Camera height at chest level
   - 6-10 feet distance

2. **Browser Performance**:
   - Use Chrome for best WebGL support
   - Close unnecessary tabs
   - Enable hardware acceleration

3. **Exercise Execution**:
   - Controlled movements
   - Full range of motion
   - Maintain visibility of joints

## 🛠️ Development

### Adding New Exercises

1. Create state machine in `utils.js`:
```javascript
class NewExerciseStateMachine {
    constructor(difficulty) {
        this.state = 'start';
        this.repCount = 0;
        // Define thresholds
    }
    
    update(angles) {
        // State logic
    }
}
```

2. Add processing function in `app.js`:
```javascript
function processNewExercise(keypoints) {
    // Extract keypoints
    // Calculate angles
    // Update state machine
}
```

3. Update UI in `index.html` and `styles.css`

### Customizing Thresholds

Edit threshold values in state machine constructors (`utils.js`):
```javascript
this.thresholds = {
    descendKneeAngle: 120,  // Adjust as needed
    bottomKneeAngle: 90,
    // ...
};
```

## 📝 Code Structure

### utils.js
- `calculateAngle()`: Three-point angle calculation
- `SquatStateMachine`: Squat logic and rep counting
- `BenchPressStateMachine`: Bench press logic
- `DeadliftStateMachine`: Deadlift logic
- `VoiceFeedback`: Speech synthesis wrapper
- Drawing utilities for skeleton visualization

### app.js
- Camera setup and management
- TensorFlow.js model loading
- Main detection loop (requestAnimationFrame)
- Exercise-specific pose processing
- UI updates and feedback display

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- TensorFlow.js team for MoveNet model
- Google MediaPipe for pose estimation research
- Web Speech API for voice synthesis

## 📚 Resources

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [MoveNet Model Card](https://tfhub.dev/google/movenet/singlepose/lightning/4)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Pose Detection Guide](https://www.tensorflow.org/lite/examples/pose_estimation/overview)

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check the Troubleshooting section
- Review browser console for error messages

## 🔮 Future Enhancements

- [ ] Add more exercises (pull-ups, push-ups, rows)
- [ ] Session tracking and history
- [ ] Export workout data
- [ ] Mobile app version
- [ ] Multi-person detection
- [ ] Exercise recommendation based on form
- [ ] Integration with fitness trackers

---

**Built with ❤️ using TensorFlow.js and Modern Web Technologies**

*No servers, no data collection, just pure client-side AI fitness tracking!*
