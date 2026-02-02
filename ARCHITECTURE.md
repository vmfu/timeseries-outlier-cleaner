# Architecture Document

## System Overview

The Outlier Cleaner Web Application is a client-side single-page application (SPA) built with vanilla HTML, CSS, and JavaScript. It implements the MATLAB `filloutliers` algorithm with a modern, responsive user interface.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   HTML UI    │  │   CSS Styles │  │  Main Thread │         │
│  │  (index.html)│  │ (telemetry)  │  │   (main.js)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                 │                   │                │
│         │                 │                   │                │
│         └─────────────────┴───────────────────┘                │
│                           │                                    │
│                           │ postMessage                        │
│                           ▼                                    │
│                    ┌──────────────┐                            │
│                    │  Web Worker  │ ◄──────┐                   │
│                    │  (worker.js) │        │                   │
│                    └──────────────┘        │                   │
│                           │               │                   │
│              ┌──────────┴──────────┐     │                   │
│              │                     │     │                   │
│              ▼                     ▼     │                   │
│    ┌─────────────────┐    ┌─────────────────┐                │
│    │ filloutliers.js │    │   metrics.js    │                │
│    │  (Detection &   │    │  (Quality       │                │
│    │   Fill Logic)   │    │   Metrics)      │                │
│    └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
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

**Purpose**: Provide the user interface structure.

**Components**:
- Control Panel (left side)
  - File input with batch processing
  - Advanced settings toggle
  - Parameter sliders (hidden by default)
  - Action buttons (Load, Tune, Clean, Save)
  - Save options checkboxes
  - Progress gauge and log area
- Plot Panel (right side)
  - Canvas for data visualization
  - Heatmap for parameter optimization

**Data Flow**:
- User interactions → Event handlers in `main.js`
- Display updates from worker results

### 2. Styling Layer (`css/telemetry.css`)

**Purpose**: Telemetry-inspired UI with post-Soviet research institute aesthetics.

**Design Elements**:
- **Color Palette**:
  - Deep space blue/black backgrounds
  - CRT green phosphor text
  - Amber warning colors
  - Cyan data visualization
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

**Breakpoints**:
- Desktop (>768px): Horizontal layout (2 columns)
- Mobile (≤768px): Vertical layout (stacked panels)

### 3. Main Thread Logic (`js/main.js`)

**Purpose**: Orchestrate UI interactions and coordinate Web Worker.

**Responsibilities**:
- File loading and parsing
- Batch processing queue management
- UI event handling
- Progress monitoring
- Result display and visualization
- Chart.js integration for data plotting
- Canvas drawing for heatmaps

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
    currentFile: null      // Currently processing
}
```

### 4. Web Worker (`js/worker.js`)

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

### 5. Outlier Detection & Fill Logic (`js/filloutliers.js`)

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

### 6. Quality Metrics (`js/metrics.js`)

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
Display initial plot
```

### Auto-Tuning Phase

```
User clicks "2. Auto-Tune"
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
            Compute quality metrics
            Send PROGRESS to main thread
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
```

### Cleaning Phase

```
User clicks "3. Clean"
    ↓
main.js sends CLEAN message to worker
    ↓
Worker performs 100 iterations:
    for i = 1 to 100:
        Compute adaptive parameters
        filloutliers(data, params)
        Send PROGRESS to main thread
    ↓
Compute final quality metrics
    ↓
Send RESULT to main thread
    ↓
main.js updates appState.cleanedData
    ↓
Update plot and log
```

### Saving Phase

```
User clicks "4. Save"
    ↓
Format output based on options:
    - All data or only valid
    - With or without validity flag
    ↓
Generate ASCII content
    ↓
Create Blob and trigger download
```

## Batch Processing

```
User selects multiple files
    ↓
main.js creates batchQueue
    ↓
Process first file:
    → Auto-tune (optional)
    → Clean
    → Save (optional)
    ↓
Move to next file
    ↓
Repeat until queue empty
```

## Performance Considerations

### Memory Management

- Use `Float64Array` for numeric data (efficient memory layout)
- Use `Int8Array` for boolean masks
- Process data in chunks for large files
- Clean up worker state between operations

### Computational Efficiency

- Web Worker prevents UI blocking
- Batch operations use TypedArray methods (map, filter, reduce)
- Vectorized operations where possible
- Progress updates at reasonable intervals (not every iteration)

### Responsiveness

- Throttle progress updates (max 10-20 updates/second)
- Debounce resize events
- Use requestAnimationFrame for chart updates
- Lazy load Chart.js only when needed

## Security Considerations

- All processing is client-side (no server communication)
- File content never leaves user's computer
- No external dependencies except Chart.js (CDN)
- Validate input data types before processing

## Future Enhancements

1. **Advanced Interpolation**: Add more sophisticated fill methods
2. **Multi-threading**: Use multiple workers for parallel batch processing
3. **Real-time Preview**: Show cleaning effect as parameters change
4. **Undo/Redo**: Maintain history of operations
5. **Export Reports**: Generate PDF/HTML reports with metrics
6. **Plugin System**: Allow custom detection/fill methods
7. **Cloud Integration**: Optional cloud storage for large datasets
8. **Advanced Charts**: Add 3D visualization, spectrograms
