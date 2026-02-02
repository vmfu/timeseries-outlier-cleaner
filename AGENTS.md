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
