# Architecture Document

## System Overview

The Outlier Cleaner Web Application is a client-side single-page application (SPA) built with vanilla HTML, CSS, and JavaScript. It implements the MATLAB `filloutliers` algorithm with a modern, responsive user interface. Version 2.0 introduces modular architecture with internationalization, error handling, batch processing queue, and improved accessibility (WCAG 2.1 AA compliant).

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                               Browser                                      │
├────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   HTML UI    │  │   CSS Styles │  │  Main Thread │                  │
│  │  (index.html)│  │ (telemetry)  │  │   (main.js)  │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│         │                 │                   │                             │
│         └─────────────────┴───────────────────┘                             │
│                           │                                                │
│         ┌─────────────────┼─────────────────┐                              │
│         │                 │                 │                              │
│    ┌────▼────┐     ┌─────▼─────┐    ┌─────▼─────┐                       │
│    │ i18n.js │     │ storage.js │    │ export.js │                       │
│    │ (I18n)  │     │ (State)   │    │ (Export)  │                       │
│    └─────────┘     └───────────┘    └───────────┘                       │
│         │                 │                 │                              │
│    ┌────▼────┐     ┌─────▼─────┐    ┌─────▼─────┐                       │
│    │ queue.js│     │  ui.js    │    │ chart.js  │                       │
│    │ (Batch) │     │ (UI API)  │    │(Chart.js) │                       │
│    └─────────┘     └───────────┘    └───────────┘                       │
│         │                 │                 │                              │
│    ┌────▼────┐     ┌─────▼─────┐    ┌─────▼─────┐                       │
│    │error.js │     │ utils.js  │    │ metrics.js │                       │
│    │(Error)  │     │ (Utils)   │    │(Quality)  │                       │
│    └─────────┘     └───────────┘    └───────────┘                       │
│                           │                                                │
│                           │ postMessage                                     │
│                           ▼                                                │
│                    ┌──────────────┐                                        │
│                    │  Web Worker  │ ◄──────┐                              │
│                    │  (worker.js) │        │                              │
│                    └──────────────┘        │                              │
│                           │                │                              │
│              ┌──────────┴──────────┐       │                              │
│              │                     │       │                              │
│              ▼                     ▼       │                              │
│    ┌─────────────────┐    ┌─────────────────┐                             │
│    │ filloutliers.js │    │   metrics.js    │                             │
│    │  (Detection &   │    │  (Quality       │                             │
│    │   Fill Logic)   │    │   Metrics)      │                             │
│    └─────────────────┘    └─────────────────┘                             │
└────────────────────────────────────────────────────────────────────────────┘
                           │
                           │ postMessage (results)
                           ▼
                    ┌──────────────┐
                    │   Main Thread │
                    │   Updates UI  │
                    └──────────────┘
```

## Component Breakdown

### 1. UI Layer (`index.html`)

**Purpose**: Provide the user interface structure with accessibility features.

**Components**:
- Skip-to-content link (keyboard navigation)
- Control Panel (left side)
  - File input with batch processing
  - Language switcher
  - Advanced settings toggle
  - Parameter sliders (hidden by default)
  - Presets management
  - Action buttons (Load, Tune, Clean, Save)
  - Save options checkboxes
  - Progress gauge and log area
- Plot Panel (right side)
  - Canvas for data visualization
  - Heatmap for parameter optimization
  - Data table view
  - Zoom controls
- Modals (Reset confirmation, Error display)

**Data Flow**:
- User interactions → Event handlers in `main.js`
- Display updates from worker results
- Keyboard shortcuts via global event listener

**Accessibility Features**:
- ARIA labels and roles for all interactive elements
- Skip-to-main-content link
- High-contrast focus indicators using `:focus-visible`
- WCAG AA color contrast compliance
- Semantic HTML structure
- Live regions for status updates

### 2. Styling Layer (`css/telemetry.css`)

**Purpose**: Telemetry-inspired UI with post-Soviet research institute aesthetics and accessibility compliance.

**Design Elements**:
- **Color Palette**:
  - Deep space blue/black backgrounds
  - CRT green phosphor text
  - Amber warning colors
  - Cyan data visualization
  - Updated text-muted color for better contrast (#00aa55)
- **Typography**:
  - Monospace fonts for data (Consolas, 'Courier New', monospace)
  - Technical/scientific aesthetic
- **Layout**:
  - Two-panel responsive design
  - Grid-based parameter controls
  - Gauge displays for progress
- **Effects**:
  - Subtle CRT scanline overlay
  - Glowing borders on active elements
  - Technical borders with corner accents
- **Accessibility**:
  - Focus-visible indicators with high-contrast cyan glow
  - Visually-hidden class for screen readers
  - Skip-link styles

**Breakpoints**:
- Desktop (>768px): Horizontal layout (2 columns)
- Mobile (≤768px): Vertical layout (stacked panels)

### 3. Internationalization Module (`js/i18n.js`)

**Purpose**: Manage translations for multiple languages (Russian and English).

**Key Functions**:

```javascript
// Get translation for a key with parameter interpolation
I18n.t('button.load'); // Returns translated text
I18n.t('msg.loaded', { points: 1000, series: 2 });

// Set current language
I18n.setLanguage('ru'); // or 'en'

// Get current language
I18n.getLanguage(); // Returns 'ru' or 'en'

// Update all translatable elements in DOM
I18n.updateAllText();
```

**Translation Storage**:
- Russian dictionary with 300+ translation keys
- English dictionary with 300+ translation keys
- Supports parameter interpolation with `{param}` syntax
- Saves language preference to localStorage

**Usage in HTML**:
```html
<!-- Text content -->
<span data-i18n="button.load">Загрузить</span>

<!-- Placeholder -->
<input type="text" data-i18n-placeholder="table.filterPlaceholder">

<!-- Tooltip/Title -->
<button data-i18n-title="tooltip.zoomIn">+</button>

<!-- Options -->
<option value="linear" data-i18n="fillMethod.linear">Linear interpolation</option>
```

**Language Detection**:
1. Check localStorage for saved preference
2. Fall back to browser language (navigator.language)
3. Default to Russian

### 4. Storage Module (`js/storage.js`)

**Purpose**: Manage localStorage persistence for application settings.

**Storage Keys**:
```javascript
const KEYS = {
    LANGUAGE: 'outlierCleanerLanguage',
    CHART_VISIBILITY: 'outlierCleanerChartVisibility',
    PRESETS: 'outlierCleanerPresets'
};
```

**Key Functions**:

```javascript
// Save language preference
Storage.saveLanguage('ru');

// Load language preference
Storage.loadLanguage(); // Returns 'ru' or null

// Save chart visibility mode
Storage.saveChartVisibility('both'); // 'original', 'cleaned', 'both'

// Load chart visibility mode
Storage.loadChartVisibility(); // Returns mode or null

// Save custom presets
Storage.savePresets({ 'myPreset': { windowWidth: 40, threshold: 1.4 } });

// Load custom presets
Storage.loadPresets(); // Returns object or null

// Clear all application data
Storage.clearAll();
```

**Error Handling**:
- All functions wrapped in try-catch
- Console warnings on storage failures
- Graceful fallback when localStorage unavailable

### 5. Export Module (`js/export.js`)

**Purpose**: Handle data export in multiple formats (CSV, TXT, JSON, HTML).

**Key Functions**:

```javascript
// Export to CSV format
var csvContent = Export.exportToCSV(data, {
    includeCleaned: true,
    addValidityFlag: true
});

// Export to TXT/ASCII format (same as CSV internally)
var txtContent = Export.exportToTXT(data, options);

// Trigger file download
Export.downloadFile(content, 'filename.csv', 'text/csv;charset=utf-8');

// Export with automatic format selection
Export.exportData(data, params, metrics, outliers, 'csv', {
    baseName: 'outlier_cleaned_data'
});

// Generate HTML report with charts and metrics
var htmlReport = Export.generateHTMLReport(data, params, metrics, outliers, appState);
```

**HTML Report Features**:
- Metadata section (filename, creation date)
- Cleaning parameters table
- Quality metrics with color-coded ratings
- Outlier statistics
- Embedded data chart (base64 image)
- Embedded parameter map (base64 image)
- Bilingual support (ru/en)
- Print-optimized styles
- Color-coded quality indicators (excellent/good/poor)

### 6. Queue Module (`js/queue.js`)

**Purpose**: Manage batch file processing queue and results.

**Queue Item Structure**:
```javascript
{
    file: File,        // File object
    id: number,        // Unique ID (timestamp + random)
    status: string,    // 'pending', 'processing', 'completed', 'error'
    progress: number,   // 0-100
    result: Object     // Processing result or null
}
```

**Key Functions**:

```javascript
// Add files to batch queue (filters duplicates)
Queue.addToQueue([file1, file2, file3]);

// Remove file from queue by ID or index
Queue.removeFromQueue(id); // or index number

// Get current queue status
var status = Queue.getStatus();
// Returns: { queue: [...], results: [...], isProcessing: bool, isCancelled: bool }

// Start batch processing
Queue.startProcessing(); // Returns true if started, false if already processing

// Complete batch processing
Queue.completeProcessing();

// Cancel batch processing
Queue.cancelProcessing();

// Update queue item status
Queue.updateItem(index, 'processing', 50, { someResult: data });

// Add processed result
Queue.addResult({ filename: 'data.txt', metrics: {...} });

// Clear queue and results
Queue.clear();
```

**Behavior**:
- Prevents duplicate files by name
- Prevents removal during processing
- Maintains separate results array
- Global processing and cancellation flags

### 7. UI Module (`js/ui.js`)

**Purpose**: Centralized UI updates and DOM manipulation.

**Key Functions**:

```javascript
// Cache DOM elements for performance
UI.cacheElements();

// Update file count display
UI.updateFileCount(5); // Updates text with i18n support

// Update progress bar
UI.updateProgress(75, 'Processing file 3/4');

// Show/hide progress bar (with fade animation)
UI.showProgressBar(true);  // Show
UI.showProgressBar(false); // Hide

// Update ETA display
UI.updateETA('осталось 2:35'); // or 'remaining 2:35'

// Add message to log with type
UI.log('File loaded successfully', 'success'); // 'info', 'success', 'warning', 'error'

// Clear all log messages
UI.clearLog();

// Show/hide element by ID
UI.show('advancedSettings');
UI.hide('advancedSettings');

// Toggle element visibility
UI.toggle('advancedSettings');
```

**Cached Elements**:
- fileInput, fileCount
- logArea
- progressBar, progressFill, progressPercent, progressMessage, progressETA

**Log Entry Format**:
```html
<div class="log-entry log-info">
    <span class="log-time">14:32:15</span>
    <span class="log-message">File loaded successfully</span>
</div>
```

### 8. Chart Module (`js/chart.js`)

**Purpose**: Chart.js configuration and management for data visualization.

**Key Functions**:

```javascript
// Initialize main data chart
var chart = ChartModule.initDataChart('chartCanvas');

// Update chart data
ChartModule.updateChartData(chart, {
    datasets: [
        { label: 'Original - Series 1', data: [...], borderColor: '#00ff00' },
        { label: 'Cleaned - Series 1', data: [...], borderColor: '#00aaff' }
    ]
});

// Set chart visibility mode
ChartModule.setChartVisibility(chart, 'original'); // 'original', 'cleaned', 'both'

// Reset zoom
ChartModule.resetZoom(chart);

// Destroy chart instance
ChartModule.destroyChart(chart);

// Get/set chart references
var dataChart = ChartModule.getDataChart();
ChartModule.setDataChart(newChart);
```

**Chart Configuration**:
- Type: line chart
- Responsive: true
- Interaction mode: index (intersect: false)
- Zoom plugin enabled (wheel and pinch)
- Pan plugin enabled
- Telemetry color scheme (green text, cyan borders)
- Tooltip styling matching UI theme

**Zoom/Pan**:
- Wheel zoom on X axis
- Pinch zoom for touch devices
- Pan enabled for navigation
- Reset zoom button integration

### 9. Error Handler Module (`js/error.js`)

**Purpose**: Centralized error management with user-friendly messages and recovery suggestions.

**Error Types**:
```javascript
ErrorHandler.types.FILE_LOAD     // File loading errors
ErrorHandler.types.FILE_PARSE    // File parsing errors
ErrorHandler.types.PROCESSING    // Processing errors
ErrorHandler.types.WORKER        // Web Worker errors
ErrorHandler.types.EXPORT        // Export errors
ErrorHandler.types.NETWORK       // Network errors
ErrorHandler.types.VALIDATION    // Validation errors
ErrorHandler.types.UNKNOWN       // Unknown errors
```

**Key Functions**:

```javascript
// Show error modal
ErrorHandler.show(error, ErrorHandler.types.PROCESSING, 'Processing data.csv');

// Hide error modal
ErrorHandler.hide();
ErrorHandler.hideModal(); // Alias

// Copy last error to clipboard
ErrorHandler.copyError();

// Export error log as JSON
ErrorHandler.exportLog();

// Get error log array
ErrorHandler.getLog();

// Clear error log
ErrorHandler.clearLog();

// Wrap function with error handling
var safeFunction = ErrorHandler.wrap(function() {
    // Function code
}, ErrorHandler.types.PROCESSING, 'Context description');

// Wrap async function with error handling
var safePromise = ErrorHandler.wrapAsync(async function() {
    // Async function code
}, ErrorHandler.types.PROCESSING, 'Context description');
```

**Error Modal Features**:
- User-friendly error message (i18n)
- Context information
- Recovery suggestions list
- Expandable technical details (stack trace)
- Copy to clipboard button
- Auto-close option (configurable)
- Close on Escape key
- Close on outside click

**Error Log Entry Structure**:
```javascript
{
    timestamp: '2024-01-15T14:32:15.123Z',
    type: 'processing',
    message: 'Error processing data',
    context: 'Processing data.csv',
    stack: 'Error: ...\n    at...'
}
```

**Configuration**:
```javascript
ErrorHandler.config.MAX_ERROR_LOG = 100;  // Max log entries
ErrorHandler.config.AUTO_CLOSE_TIMEOUT = 0; // No auto-close (0 = disabled)
ErrorHandler.config.ENABLE_ERROR_SOUND = false;
```

### 10. Utils Module (`js/utils.js`)

**Purpose**: Performance optimization utilities.

**Key Functions**:

```javascript
// Debounce - delays function execution until after delay period
var debouncedResize = Utils.debounce(function() {
    // Resize handler code
}, 250);

// Throttle - limits function execution to once every delay period
var throttledScroll = Utils.throttle(function() {
    // Scroll handler code
}, 100);

// RequestAnimationFrame wrapper
var rafId = Utils.requestAnimationFrame(function() {
    // Animation frame callback
});
Utils.cancelAnimationFrame(rafId);

// Batch DOM updates (executes in single RAF cycle)
Utils.batchDOMUpdates(function() {
    // Multiple DOM updates will be batched
});

// Measure performance
var measuredFn = Utils.measurePerformance(function() {
    // Function to measure
}, 'loadData');
```

**Use Cases**:
- **Debounce**: Resize events, slider inputs (reduces calls)
- **Throttle**: Scroll events, continuous updates
- **Batch DOM Updates**: Multiple UI updates in one frame
- **Performance Measurement**: Identify slow operations (>100ms warning)

### 11. Main Thread Logic (`js/main.js`)

**Purpose**: Orchestrate UI interactions and coordinate Web Worker.

**Responsibilities**:
- File loading and parsing
- Batch processing queue management
- UI event handling
- Progress monitoring
- Result display and visualization
- Chart.js integration for data plotting
- Canvas drawing for heatmaps
- Keyboard shortcuts handling
- State management

**Key Functions**:

```javascript
// File handling
loadFiles(fileList)              // Process multiple files
parseAsciiData(content)          // Parse ASCII format to arrays

// Worker communication
sendWorkerMessage(type, data)    // Dispatch tasks to worker
handleWorkerMessage(event)       // Process worker results

// UI updates
updateProgress(value)            // Update gauge display
appendLog(message)              // Add log entry
updateCharts(data)              // Refresh data plots
drawHeatmap(data)              // Draw optimization heatmap

// State management
appState = {
    originalData: [],      // Raw loaded data
    cleanedData: [],       // Processed data
    parameters: {         // Current settings
        windowWidth: 40,
        threshold: 1.4,
        matrixSize: 16,
        relativeSize: 4,
        fillMethod: 'nearest'
    },
    batchQueue: [],        // Files to process
    currentFile: null,     // Currently processing
    outlierMasks: [],      // Outlier indicators
    language: 'ru'        // Current language
}
```

**Keyboard Shortcuts**:
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

### 12. Web Worker (`js/worker.js`)

**Purpose**: Execute heavy computations without blocking the main thread.

**Responsibilities**:
- Outlier detection and filling
- Quality metrics calculation
- Auto-tuning optimization
- Batch processing iterations

**Message Types**:

```javascript
// Incoming messages (from main thread)
{
    type: 'CLEAN',
    data: {
        signal: Float64Array,
        params: { windowWidth, threshold, fillMethod, ... }
    }
}

{
    type: 'TUNE',
    data: {
        signal: Float64Array,
        params: { matrixSize, relativeSize, windowWidth, threshold, ... }
    }
}

{
    type: 'METRICS',
    data: {
        original: Float64Array,
        cleaned: Float64Array
    }
}

// Outgoing messages (to main thread)
{
    type: 'PROGRESS',
    data: { progress: 0-100, message: '...' }
}

{
    type: 'RESULT',
    data: {
        cleanedData: Float64Array,
        metrics: { STDF, DF, ASNR, ARMSE, R_squared, R_Pirs },
        NTF: Float64Array,
        optimalParams: { windowWidth, threshold }
    }
}

{
    type: 'ERROR',
    data: { message: '...' }
}
```

**Worker Initialization**:
```javascript
importScripts('filloutliers.js', 'metrics.js');
```

### 13. Outlier Detection & Fill Logic (`js/filloutliers.js`)

**Purpose**: Implement MATLAB's `filloutliers` function in JavaScript.

**Core Functions**:

```javascript
// Main entry point
function filloutliers(data, fillMethod, detectionMethod, params) {
    // Returns: [cleanedData, outlierMask, lthresh, uthresh, center]
}

// Detection methods
function detectOutliers_median(data, thresholdFactor)
function detectOutliers_mean(data, thresholdFactor)
function detectOutliers_quartiles(data, thresholdFactor)
function detectOutliers_grubbs(data, alpha, maxOutliers)
function detectOutliers_gesd(data, alpha, maxOutliers)
function detectOutliers_movmedian(data, windowLength, thresholdFactor)
function detectOutliers_movmean(data, windowLength, thresholdFactor)

// Fill methods
function fillWith_extreme(data, outlierMask)        // ↗∞: 999999999
function fillWith_center(data, outlierMask, center)
function fillWith_clip(data, outlierMask, lthresh, uthresh)
function fillWith_previous(data, outlierMask)
function fillWith_next(data, outlierMask)
function fillWith_nearest(data, outlierMask)
function fillWith_linear(data, outlierMask)
function fillWith_spline(data, outlierMask)
function fillWith_pchip(data, outlierMask)
function fillWith_makima(data, outlierMask)

// Utility functions
function scaledMAD(data)    // ~1.4826 * median(abs(data - median(data)))
function iqr(data)         // Q3 - Q1
function median(data)
function quantile(data, p)
```

**Algorithm Details**:

**Median Method** (default):
```javascript
// Detect outliers > 3 scaled MAD from median
center = median(data)
mad = scaledMAD(data)
lowerThreshold = center - thresholdFactor * mad
upperThreshold = center + thresholdFactor * mad
outliers = (data < lowerThreshold) | (data > upperThreshold)
```

**Moving Mean Method**:
```javascript
// For each point, compute local statistics
for i = 0 to n-1:
    window = data[max(0, i-wl/2) : min(n, i+wl/2)]
    localMean = mean(window)
    localStd = std(window)
    outliers[i] = abs(data[i] - localMean) > thresholdFactor * localStd
```

**Grubbs' Test** (iterative):
```javascript
repeat:
    compute test statistic: G = max|x - mean| / std
    compute critical value from t-distribution
    if G > criticalValue:
        remove point farthest from mean
    until no more outliers or maxOutliers reached
```

**GESD Test** (iterative, handles masked outliers):
```javascript
for k = 1 to maxOutliers:
    compute R_k = max|x - mean| / std for each remaining point
    compute critical value lambda_k
    if R_k > lambda_k:
        remove point with max R_k
    else:
        break
```

### 14. Quality Metrics (`js/metrics.js`)

**Purpose**: Compute quality metrics for data cleaning evaluation.

**Functions**:

```javascript
function computeAllMetrics(original, cleaned) {
    return {
        STDF: smoothnessMetric(cleaned),
        DF: deletedFraction(original, cleaned),
        ASNR: signalToNoiseRatio(original, cleaned),
        ARMSE: rootMeanSquareError(original, cleaned),
        R_squared: rSquared(original, cleaned),
        R_Pirs: pearsonCorrelation(original, cleaned)
    }
}

// Individual metric implementations
function smoothnessMetric(data) {
    // STDF = count(diff(data) > std(diff(data))) / count(diff(data))
    const derivative = diff(data)
    const threshold = std(derivative)
    return nnz(derivative > threshold) / derivative.length
}

function deletedFraction(original, cleaned) {
    // DF = count(original != cleaned) / count(data)
    const changed = original.filter((o, i) => o !== cleaned[i])
    return changed.length / original.length
}

function signalToNoiseRatio(original, cleaned) {
    // ASNR = 10 * log10(sum(cleaned²) / sum((original - cleaned)²))
    const signal = cleaned.reduce((sum, v) => sum + v*v, 0)
    const noise = original.reduce((sum, o, i) => {
        return sum + (o - cleaned[i])**2
    }, 0)
    return 10 * Math.log10(signal / noise)
}

function rootMeanSquareError(original, cleaned) {
    // RMSE = sqrt(mean((original - cleaned)²))
    const sqError = original.reduce((sum, o, i) => {
        return sum + (o - cleaned[i])**2
    }, 0)
    return Math.sqrt(sqError / original.length)
}

function rSquared(original, cleaned) {
    // R² = 1 - SS_res / SS_tot
    const meanVal = mean(cleaned)
    const SS_res = original.reduce((sum, o, i) => {
        return sum + (o - cleaned[i])**2
    }, 0)
    const SS_tot = cleaned.reduce((sum, v) => {
        return sum + (v - meanVal)**2
    }, 0)
    return 1 - SS_res / SS_tot
}

function pearsonCorrelation(x, y) {
    // r = cov(x,y) / (std(x) * std(y))
    const meanX = mean(x)
    const meanY = mean(y)
    const cov = x.reduce((sum, xi, i) => {
        return sum + (xi - meanX) * (y[i] - meanY)
    }, 0) / x.length
    const stdX = std(x)
    const stdY = std(y)
    return cov / (stdX * stdY)
}
```

## Data Flow

### Loading Phase

```
User selects files
    ↓
FileReader reads each file (async)
    ↓
Parse ASCII content to Float64Array
    ↓
Store in appState.originalData
    ↓
Display initial plot via ChartModule.updateChartData()
```

### Auto-Tuning Phase

```
User clicks "2. Auto-Tune" (or presses W)
    ↓
main.js sends TUNE message to worker
    ↓
Worker initializes grid search matrices
    ↓
COARSE PASS (step = relativeSize):
    for k = 1 to matrixSize:
        for j = 1 to matrixSize:
            Compute parameters
            Run 100 iterations of filloutliers
            Compute quality metrics via metrics.js
            Send PROGRESS to main thread (update UI via UI.updateProgress())
    ↓
Normalize metrics, compute NTF
    Smooth NTF with 3x3 average
    Find minimum NTF
    ↓
FINE PASS (step = 1):
    Repeat around optimal point
    ↓
Send RESULT to main thread:
    - Optimal parameters
    - NTF matrix (for heatmap)
    - All metrics
    ↓
Update UI: sliders, log, heatmap canvas
```

### Cleaning Phase

```
User clicks "3. Clean" (or presses E)
    ↓
main.js sends CLEAN message to worker
    ↓
Worker performs 100 iterations:
    for i = 1 to 100:
        Compute adaptive parameters
        filloutliers(data, params)
        Send PROGRESS to main thread (UI.updateProgress())
    ↓
Compute final quality metrics via metrics.js
    ↓
Send RESULT to main thread
    ↓
main.js updates appState.cleanedData
    ↓
Update plot via ChartModule.updateChartData() and log via UI.log()
```

### Saving Phase

```
User clicks "4. Save" (or presses R)
    ↓
Export.exportData() handles format selection:
    - CSV/TXT via Export.exportToCSV()
    - JSON with full metadata
    - HTML report with charts via Export.generateHTMLReport()
    ↓
Trigger download via Export.downloadFile()
    ↓
Log success via UI.log()
```

### Batch Processing

```
User selects multiple files
    ↓
Queue.addToQueue() adds files to queue
    ↓
Queue.startProcessing() begins processing
    ↓
For each file in queue:
    Update status to 'processing'
    → Load file
    → Auto-tune (optional)
    → Clean
    → Save (optional)
    → Add result to Queue.results
    Update Queue.updateItem() progress
    ↓
Move to next file until queue empty
    ↓
Queue.completeProcessing() when done
    ↓
User can export all results via "Export All Results"
```

## Performance Considerations

### Memory Management

- Use `Float64Array` for numeric data (efficient memory layout)
- Use `Int8Array` for boolean masks
- Process data in chunks for large files
- Clean up worker state between operations
- Limit error log size (MAX_ERROR_LOG: 100)

### Computational Efficiency

- Web Worker prevents UI blocking
- Batch operations use TypedArray methods (map, filter, reduce)
- Vectorized operations where possible
- Progress updates throttled (not every iteration)
- Debounce resize events via Utils.debounce()
- Throttle scroll events via Utils.throttle()

### Responsiveness

- Throttle progress updates (max 10-20 updates/second)
- Debounce resize events (250ms)
- Use requestAnimationFrame for chart updates
- Lazy load Chart.js only when needed
- Batch DOM updates via Utils.batchDOMUpdates()

## Accessibility (WCAG 2.1 AA)

### Keyboard Navigation

- **Skip Links**: Skip to main content with first focus
- **Tab Order**: Logical tab order through all interactive elements
- **Keyboard Shortcuts**: QWER for main operations, 123 for views, Escape for modals

### Visual Indicators

- **Focus Styles**: High-contrast cyan glow using `:focus-visible`
- **Color Contrast**: All text meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- **Status Indicators**: Visual and text-based status updates

### Screen Reader Support

- **ARIA Labels**: All interactive elements have accessible names
- **Live Regions**: Status updates announced via aria-live
- **Semantic HTML**: Proper use of headings, landmarks, and roles
- **Visually-hidden Class**: For screen-reader-only content

### Error Handling

- User-friendly error messages with recovery suggestions
- Error modal with keyboard navigation
- Copy error details functionality

## Security Considerations

- All processing is client-side (no server communication)
- File content never leaves user's computer
- No external dependencies except Chart.js (CDN)
- Validate input data types before processing
- No eval() or unsafe dynamic code execution

## Future Enhancements

1. **Advanced Interpolation**: Add more sophisticated fill methods
2. **Multi-threading**: Use multiple workers for parallel batch processing
3. **Real-time Preview**: Show cleaning effect as parameters change
4. **Undo/Redo**: Maintain history of operations
5. **Export Reports**: Generate PDF reports with metrics
6. **Plugin System**: Allow custom detection/fill methods
7. **Cloud Integration**: Optional cloud storage for large datasets
8. **Advanced Charts**: Add 3D visualization, spectrograms
9. **Additional Languages**: Support more languages beyond RU/EN
10. **Offline PWA**: Progressive Web App for offline use
