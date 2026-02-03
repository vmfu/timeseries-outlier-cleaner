# AGENTS.md - Outlier Cleaner MATLAB Project

## Project Overview

This is a MATLAB-based outlier detection and data cleaning application with a graphical user interface (GUI) built using MATLAB App Designer. The application automates the process of detecting and replacing outliers in time-series or signal data.

**Purpose**: Clean experimental/measurement data by removing outliers and filling missing values using various interpolation methods.

**Author**: Vladimir Mikhailovich Funtikov (Фунтиков Владимир Михайлович)

---

## File Structure

```
.
├── filloutliers.m              # Core MATLAB function for outlier detection/replacement
├── Form_code.m.txt             # App Designer GUI code (rename to .m to use)
├── TEST_data.txt               # Test data file (ASCII format)
├── package.json                # Standard npm config (not used for MATLAB)
├── start_new_project.bat       # Project initialization script
└── primary prompt is a human task.txt  # Original task description
```

---

## Running the Application

### Method 1: Using the App Designer file
1. Rename `Form_code.m.txt` to `OutlierCleaner_APP_GPT.m`
2. Open in MATLAB
3. Run the class directly: `app = OutlierCleaner_APP_GPT`

### Method 2: Via App Designer
1. Open App Designer in MATLAB
2. Import `Form_code.m.txt`
3. Run the app

---

## Essential Commands

**MATLAB console:**
```matlab
% Run the application
app = OutlierCleaner_APP_GPT;

% Load and test the filloutliers function directly
data = load('TEST_data.txt', '-ascii');
[cleanedData, tf, lthresh, uthresh, center] = filloutliers(data(:,2), 'linear', 'movmean', 10, 'ThresholdFactor', 3);
```

**No build/test commands** - This is a MATLAB script/project, not a compiled application.

---

## Code Organization

### Main Components

#### `filloutliers.m`
- **Purpose**: Core function for detecting and replacing outliers in data
- **Input**: Data matrix/vector, fill method, outlier detection method
- **Output**: Cleaned data, outlier locations, thresholds, center value

**Key parameters:**
- `FILL`: Method to replace outliers ('center', 'clip', 'previous', 'next', 'nearest', 'linear', 'spline', 'pchip', 'makima')
- `METHOD`: Outlier detection method ('median', 'mean', 'quartiles', 'grubbs', 'gesd', 'movmedian', 'movmean')
- `ThresholdFactor`: Multiplier for detection thresholds (default varies by method)
- `WindowLength`: For moving methods ('movmedian', 'movmean')

#### `OutlierCleaner_APP_GPT` class (Form_code.m.txt)
GUI application with four main workflow steps:

**1. Load (Загрузить)**:
- Loads ASCII data file
- Expects format: First column = time/X, remaining columns = signals/Y
- Plots original data as scatter plot

**2. Tune (Навестись)**:
- **Automatic parameter optimization**
- Grid search over window width and threshold parameters
- Two-pass optimization:
  - Pass 1: Coarse search with step = `RelMatrixSizeSlider` value
  - Pass 2: Fine search with step = 1
- **Metrics computed**:
  - `STDF`: Smoothness (peaks in derivative / total derivative samples)
  - `DF`: Deleted Fraction (percentage of points changed)
  - `ASNR`: Signal-to-Noise Ratio (log scale)
  - `ARMSE`: Root Mean Square Error
  - `AR_squared`: R-squared coefficient
  - `AR_Pirs`: Pearson correlation coefficient
- **Combined score**: `NTF = normalize(SNR - RMSE + R² + Pearson + Smoothness + DF, 'range')`
- **Output**: Updates sliders with optimal parameters, displays heatmap

**3. Clean (Очистить)**:
- Applies final cleaning with selected parameters
- Uses iterative approach (100 iterations) with adaptive thresholds
- Adaptive formula:
  ```
  adaptiveWin = baseWin + (baseWin/100) * 4 * (10 - i^0.5)
  adaptiveThresh = (baseThresh/100) + (baseThresh/100) * 4 * (10 - i^0.5) / 100
  ```
- Plots cleaned data
- Logs final metrics (deleted fraction, R-squared)

**4. Save (Сохранить)**:
- Options:
  - **Save restored data only**: Keeps all rows, optionally adds validity flag
  - **Save only valid data**: Filters out rows with outliers
- Output format: ASCII text file

---

## Code Conventions and Patterns

### MATLAB Coding Style
- Comments in **Russian** throughout the codebase
- Variable names use **camelCase** (e.g., `cleanedData`, `originalData`)
- Hungarian notation for some GUI elements (`app.*` prefix)

### Function Naming
- Public methods: PascalCase (`LoadButtonPushed`, `TuneButtonPushed`)
- Private functions: camelCase (`startupFcn`, `updateAppLayout`)

### Data Structures
- **Input data format**: Matrix where column 1 = X/time, columns 2+ = Y/signals
- **Data loading**: `load(fileName, '-ascii')`
- **Data saving**: `save(fileName, 'saveData', '-ascii')`

### GUI Layout
- Two-panel responsive layout (ControlPanel + PlotPanel)
- Adaptive reflow: Horizontal for wide windows (>576px), vertical for narrow
- Hidden by default: Advanced settings (sliders, fill method dropdown)
- Revealed via: "Открыть капот" (Open hood) checkbox

---

## Key Algorithms

### Outlier Detection
The app uses MATLAB's `filloutliers` function with:
- **Default method**: 'movmean' (moving mean)
- **Detection threshold**: Scaled by `ThresholdFactor` parameter
- **Window size**: Defined by `WindowWidthSlider`

### Adaptive Iterative Cleaning
The cleaning process runs 100 iterations with exponentially decreasing parameters:
```
For iteration i = 1 to 100:
    window = base + (base/100) * 4 * (10 - i^0.5)
    threshold = (thresh/100) + (thresh/100) * 4 * (10 - i^0.5) / 100
    data = filloutliers(data, fillMethod, 'movmean', window, 'ThresholdFactor', threshold)
```

This allows aggressive cleaning early (large window, high threshold) and refinement later (smaller window, lower threshold).

### Special Fill Method: "↗∞"
When this method is selected:
- Fills outliers with value `999999999`
- This marks outliers with an extreme value rather than interpolating
- Useful for flagging outliers without modifying the underlying data structure

---

## Important Gotchas

### 1. File Naming
- The main app file is named `Form_code.m.txt` - must be renamed to `.m` for MATLAB
- The class name inside is `OutlierCleaner_APP_GPT`

### 2. Data Format
- Input files **must** be ASCII format
- First column is treated as time/X axis
- All other columns are treated as signals/Y to be cleaned
- Example: `TEST_data.txt` shows expected format

### 3. Hidden Advanced Settings
- Sliders (WindowWidth, Threshold, MatrixSize, RelMatrixSize) and FillMethod dropdown are **hidden by default**
- Enable via "Открыть капот" (Open hood) checkbox in GUI
- The auto-tune function updates these hidden sliders

### 4. Progress Gauges
- Tune operation updates progress gauge in two passes (0-50%, 50-100%)
- Clean operation updates progress gauge linearly (1-100)
- Small `pause(1)` in tune loop ensures UI updates

### 5. Fill Method Dropdown Items
- Display text is in Russian
- Actual `ItemsData` values are in English MATLAB keywords:
  ```
  '↗∞'          → Custom extreme value fill
  'center'      → Fill with median/mean
  'clip'        → Clip to thresholds
  'previous'    → Previous valid value
  'next'        → Next valid value
  'nearest'     → Nearest valid value
  'linear'      → Linear interpolation
  'spline'      → Cubic spline interpolation
  'pchip'       → Piecewise cubic Hermite interpolating polynomial
  'makima'      → Modified Akima interpolation
  ```

### 6. Logging
- All actions logged to `LogTextArea`
- Messages are in Russian with numeric prefixes (1., 2., 3., 4.)
- Format: `"N. Description; parameter = value;"`

### 7. Error Handling
- Minimal explicit error handling in GUI callbacks
- File not found shows `uialert` popup
- Assumes valid data formats after successful load

### 8. Special Characters
- The special fill method uses Unicode arrow-infinity symbol: "↗∞"
- MATLAB supports this string but it's unusual

---

## Dependencies

### MATLAB Toolboxes Required
- **Statistics and Machine Learning Toolbox** (for `filloutliers`)
- **App Designer** (built into modern MATLAB)

### No npm dependencies
- `package.json` exists but is only for project metadata
- This is NOT a Node.js project

---

## Testing

No automated test suite exists. To test manually:

1. Run `app = OutlierCleaner_APP_GPT`
2. Load `TEST_data.txt` (or your own ASCII file)
3. Click "2. Навестись" to auto-tune parameters
4. Inspect the heatmap plot that appears
5. Click "3. Очистить" to apply cleaning
6. Verify cleaned data in the plot
7. Save and inspect output file

---

## Contact

**Questions or issues**: Vladimir Mikhailovich Funtikov (Фунтиков Владимир Михайлович)

Contact information appears in the welcome message in the LogTextArea.

---

## Working with This Codebase

When modifying this project:

1. **Keep Russian comments** - This is a Russian-language project
2. **Preserve GUI layout logic** - The responsive layout depends on `updateAppLayout` callback
3. **Understand the two-pass optimization** - Tune button runs optimization twice (coarse then fine)
4. **Test with real data** - Use `TEST_data.txt` as a reference for expected input format
5. **Be careful with fill methods** - The "↗∞" method has special behavior (fills with 999999999)
6. **Matrix operations** - The code uses matrix operations for efficiency (avoid explicit loops where possible)
7. **Progress updates** - If adding long operations, update `app.ProgressGauge.Value` and add `pause` for UI responsiveness

---

# Web Application (Version 2.0)

## Overview

The web version is a client-side single-page application (SPA) built with vanilla HTML, CSS, and JavaScript. It implements the MATLAB `filloutliers` algorithm with a modern, responsive user interface and full accessibility support (WCAG 2.1 AA).

## File Structure

```
.
├── index.html                 # Main HTML structure with accessibility features
├── css/
│   └── telemetry.css         # Telemetry-inspired styling with focus styles
├── js/
│   ├── main.js              # Main application logic and event handling
│   ├── i18n.js             # Internationalization (RU/EN)
│   ├── storage.js           # localStorage persistence
│   ├── export.js            # Data export (CSV, TXT, JSON, HTML)
│   ├── queue.js             # Batch processing queue
│   ├── chart.js            # Chart.js configuration
│   ├── ui.js               # UI updates and DOM manipulation
│   ├── error.js            # Centralized error handling
│   ├── utils.js            # Performance utilities
│   ├── worker.js           # Web Worker for heavy computations
│   ├── filloutliers.js     # Outlier detection/fill logic
│   └── metrics.js         # Quality metrics calculation
└── README.md               # User documentation
```

## Running the Application

### Local Server
```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080

# Node.js (if installed)
npx http-server -p 8080
```

Then open `http://localhost:8080` in your browser.

### Direct Opening
Simply open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari).

## Development Standards

### Code Style

#### JavaScript (ES5 Compatible)
- Use IIFE pattern to avoid global namespace pollution
- Use `var` instead of `const`/`let` for ES5 compatibility
- Add JSDoc-style comments for functions
- Follow camelCase naming for variables and functions
- Use PascalCase for modules/classes

```javascript
/**
 * Function description
 * @param {string} param1 - Parameter description
 * @returns {number} Return value description
 */
(function(global) {
    'use strict';

    function myFunction(param1) {
        // Implementation
        return 42;
    }

    global.Module = {
        myFunction: myFunction
    };
})(typeof window !== 'undefined' ? window : this);
```

#### CSS
- Use CSS custom properties for theme colors
- Follow BEM-like naming for components
- Mobile-first responsive design
- Include accessibility focus states

```css
/* Custom properties */
:root {
    --color-primary: #00ff00;
    --color-secondary: #00aaff;
}

/* Component with focus state */
.button {
    border: 2px solid var(--color-primary);
}

.button:focus-visible {
    outline: 2px solid #00aaff;
    box-shadow: 0 0 10px #00aaff;
}
```

### Accessibility Guidelines (WCAG 2.1 AA)

#### Color Contrast
- Normal text: minimum 4.5:1 contrast ratio
- Large text (18pt+): minimum 3:1 contrast ratio
- Use contrast checker tool to verify

#### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Logical tab order
- Focus indicators must be visible
- Skip-to-content link at top of page

```html
<!-- Skip link -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Main content with ID -->
<main id="main-content">
    <!-- Content -->
</main>
```

#### ARIA Attributes
```html
<!-- Interactive elements -->
<button aria-label="Load data">Load</button>
<button aria-pressed="false">Toggle</button>

<!-- Live regions for status updates -->
<div aria-live="polite" id="status"></div>
<div aria-live="assertive" id="error"></div>

<!-- Labels for inputs -->
<label for="fileInput">Select file:</label>
<input type="file" id="fileInput">

<!-- Semantic HTML -->
<nav aria-label="Main navigation">
    <!-- Navigation -->
</nav>

<main>
    <!-- Main content -->
</main>
```

#### Focus Management
- Use `:focus-visible` pseudo-class for keyboard-only focus
- Maintain focus context when opening/closing modals
- Trap focus inside modals
- Return focus to trigger element after closing

```css
/* Only show focus from keyboard, not mouse click */
button:focus-visible {
    outline: 3px solid #00aaff;
    outline-offset: 2px;
}
```

#### Screen Reader Support
```css
/* Visually hidden but available to screen readers */
.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
}
```

### Internationalization (i18n)

#### Adding New Translations
1. Add translation keys to both `ru` and `en` dictionaries in `js/i18n.js`
2. Use `data-i18n` attribute in HTML
3. Call `I18n.updateAllText()` when switching languages

```javascript
// In js/i18n.js
const translations = {
    'ru': {
        'my.new.key': 'Новый текст',
        'my.key.with.param': 'Значение: {value}'
    },
    'en': {
        'my.new.key': 'New text',
        'my.key.with.param': 'Value: {value}'
    }
};
```

```html
<!-- In HTML -->
<span data-i18n="my.new.key">Text</span>

<!-- With parameters -->
<span data-i18n="my.key.with.param" data-i18n-params='{"value": "123"}'>Text</span>

<!-- In JavaScript -->
var text = I18n.t('my.key.with.param', { value: 123 });
```

### Error Handling

#### Using the Error Handler
```javascript
// Show error modal with recovery suggestions
ErrorHandler.show(error, ErrorHandler.types.PROCESSING, 'Processing data.txt');

// Wrap functions for automatic error handling
var safeFunction = ErrorHandler.wrap(function() {
    // Code that might throw
}, ErrorHandler.types.FILE_LOAD, 'Loading data');

// Wrap async functions
var safePromise = ErrorHandler.wrapAsync(async function() {
    // Async code
}, ErrorHandler.types.PROCESSING, 'Context');

// Export error log for debugging
ErrorHandler.exportLog();
```

#### Adding Recovery Suggestions
Edit `recoverySuggestions` object in `js/error.js`:

```javascript
const recoverySuggestions = {
    my_error_type: [
        'Check if file exists',
        'Try a different format',
        'Contact support if problem persists'
    ]
};
```

### Performance Optimization

#### Debouncing and Throttling
```javascript
// Debounce resize events
var debouncedResize = Utils.debounce(function() {
    // Handle resize
}, 250);

// Throttle scroll events
var throttledScroll = Utils.throttle(function() {
    // Handle scroll
}, 100);

// Batch DOM updates
Utils.batchDOMUpdates(function() {
    // Multiple DOM updates here
    // Will execute in single RAF cycle
});
```

#### Web Worker Usage
- Run heavy computations in worker thread
- Send messages, not function calls
- Use postMessage for data transfer

```javascript
// In main thread
worker.postMessage({
    type: 'PROCESS',
    data: largeArray
});

// In worker
self.addEventListener('message', function(e) {
    if (e.data.type === 'PROCESS') {
        var result = heavyComputation(e.data.data);
        self.postMessage({ type: 'RESULT', data: result });
    }
});
```

### Module Architecture

#### Creating a New Module
```javascript
(function(global) {
    'use strict';

    // Private variables
    var privateVar = {};

    // Private functions
    function privateFunction() {
        // Implementation
    }

    // Public API
    global.MyModule = {
        publicMethod: function() {
            // Can use private variables/functions
            return privateFunction();
        }
    };
})(typeof window !== 'undefined' ? window : this);
```

#### Module Dependencies
- Keep modules independent where possible
- Use global namespace for required dependencies
- Document required dependencies in module comments

```javascript
/**
 * My Module
 * Dependencies: I18n, Storage
 */
(function(global) {
    'use strict';

    function myFunction() {
        var lang = I18n.getLanguage();
        var prefs = Storage.loadPresets();
        // ...
    }

    global.MyModule = {
        myFunction: myFunction
    };
})(typeof window !== 'undefined' ? window : this);
```

## Testing Guidelines

### Manual Testing Checklist
- Test all features in Chrome/Edge
- Test all features in Firefox
- Test all features in Safari
- Test on desktop (large screens)
- Test on tablets (medium screens)
- Test on mobile (small screens)
- Test with various file formats
- Test with various dataset sizes
- Test with different languages
- Test keyboard navigation
- Test accessibility tools (screen readers)

### Accessibility Testing
- Use keyboard only (no mouse)
- Test with screen reader (NVDA, JAWS, VoiceOver)
- Use contrast checker tools
- Test with browser zoom (200%)
- Test focus order with Tab key
- Test ARIA labels with accessibility inspector

## Keyboard Shortcuts Convention

The application uses a gaming-style QWER layout:

```
Q - Load file
W - Auto-tune parameters
E - Clean data
R - Save results

1 - Show original data
2 - Show cleaned data
3 - Show both datasets

Escape - Close modals
```

When adding new shortcuts:
- Choose mnemonic keys if possible
- Avoid conflicting with browser defaults
- Document in README.md
- Ensure accessibility (provide alternatives)

## Commit Conventions

```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Maintenance tasks
```

Examples:
```
feat(i18n): Add German language support
fix(chart): Correct zoom behavior on mobile
docs(readme): Add troubleshooting section
```

## Known Limitations

1. **Browser Compatibility**: Requires ES5-compatible browser (modern browsers only)
2. **File Size**: Very large files (>100MB) may cause performance issues
3. **Worker Limitations**: Some browsers limit number of workers
4. **localStorage**: Limited to ~5MB, stores only preferences not data
5. **No Backend**: All processing is client-side, no server capabilities

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Chart.js Documentation](https://www.chartjs.org/docs/)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
