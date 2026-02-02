# Outlier Cleaner Web Application

A web-based tool for cleaning time series data from noise and outliers, ported from MATLAB to HTML/CSS/JavaScript.

## Overview

This application provides a modern, web-based implementation of the MATLAB outlier cleaning algorithm. It detects and replaces outliers in time series data using various statistical methods, with automatic parameter optimization and batch processing capabilities.

## Features

- **Multi-series support**: Handle multiple time series in a single file
- **Automatic parameter tuning**: Two-pass optimization algorithm
- **Quality metrics**: STDF, DF, ASNR, ARMSE, R², and Pearson correlation
- **Batch processing**: Load and process multiple files
- **Non-blocking UI**: Web Workers prevent interface freezing during calculations
- **Real-time visualization**: Interactive charts using modern graphing libraries
- **Progress logging**: Detailed execution logs with progress indicators
- **Telemetry-inspired UI**: Space telemetry interface with post-Soviet research institute aesthetics

## Installation

No installation required. This is a client-side web application that runs directly in any modern browser.

### Running the Application

1. Open `index.html` in your web browser
2. Or serve it using a local web server:
   ```bash
   # Using Python
   python -m http.server 8000
   # Using Node.js
   npx serve
   ```

## Usage

### Basic Workflow

1. **Load Files**: Click "1. Load" and select one or more data files
   - Supported format: ASCII text files
   - First column: Time/X axis
   - Remaining columns: Signal/Y data (multiple series supported)

2. **Adjust Settings** (Optional): Toggle "Open Hood" to reveal advanced parameters
   - Window Width: Sliding window size for moving statistics (1-100)
   - Threshold Factor: Outlier detection sensitivity (0.1-2.0)
   - Matrix Size: Grid search dimensions for auto-tuning (10-50)
   - Relative Size: Coarse search step size (1-9)
   - Fill Method: How to replace detected outliers

3. **Auto-Tune** (Recommended): Click "2. Auto-Tune" for automatic parameter optimization
   - Performs two-pass grid search (coarse → fine)
   - Computes multiple quality metrics
   - Displays parameter heatmap
   - Updates sliders with optimal values

4. **Clean Data**: Click "3. Clean" to apply the cleaning algorithm
   - Runs 100 iterations with adaptive parameters
   - Shows progress in real-time
   - Displays quality metrics

5. **Save Results**: Click "4. Save" to export cleaned data
   - Save all data (with restored values)
   - Save only valid data (filter out outliers)
   - Optionally add validity flag column

### Fill Methods

| Method | Description |
|--------|-------------|
| ↗∞ | Fill with extreme value (999999999) - marks outliers |
| center | Fill with median/mean (center value) |
| clip | Clip to threshold bounds |
| previous | Previous non-outlier value |
| next | Next non-outlier value |
| nearest | Nearest non-outlier value |
| linear | Linear interpolation |
| spline | Cubic spline interpolation |
| pchip | Piecewise cubic Hermite interpolating polynomial |
| makima | Modified Akima interpolation |

### Outlier Detection Methods

| Method | Description | Default Threshold |
|--------|-------------|-------------------|
| median | 3 scaled MAD from median | 3.0 |
| mean | 3 standard deviations from mean (3-sigma rule) | 3.0 |
| quartiles | 1.5 IQR from quartiles | 1.5 |
| grubbs | Grubbs' test (iterative) | 0.05 |
| gesd | Generalized ESD test (iterative) | 0.05 |
| movmedian | 3 scaled MAD from local median | 3.0 |
| movmean | 3 std from local mean | 3.0 |

## Input File Format

ASCII text files with numeric values:

```
# Comment lines starting with # are ignored
0.0  10.5  20.3  30.1
1.0  11.2  21.5  31.4
2.0  10.8  20.9  30.8
...
```

- Column 1: Time/X values (optional, will be auto-generated if missing)
- Columns 2+: Signal data to be cleaned

## Output File Format

ASCII text files with the same structure as input.

Options:
- **With restored data**: All rows preserved, outliers are filled
- **With validity flag**: Adds boolean column indicating if value was restored
- **Only valid data**: Rows with outliers removed

## Mathematical Algorithms

### Adaptive Iterative Cleaning

The cleaning process uses 100 iterations with exponentially decreasing parameters:

```
For iteration i = 1 to 100:
    window = base + (base/100) * 4 * (10 - i^0.5)
    threshold = (thresh/100) + (thresh/100) * 4 * (10 - i^0.5) / 100
    data = filloutliers(data, method, detection, window, threshold)
```

### Auto-Tuning Optimization

Two-pass grid search over window width (k) and threshold (j):

1. **Coarse Pass**: Step = `Relative Size` parameter
2. **Fine Pass**: Step = 1 (pixel-perfect)

For each parameter combination, compute:
- **STDF**: Smoothness = peaks in derivative / total samples
- **DF**: Deleted Fraction = changed points / total points
- **ASNR**: Signal-to-Noise Ratio = 10 * log10(signal² / noise²)
- **ARMSE**: Root Mean Square Error
- **AR²**: R-squared coefficient
- **AR_Pirs**: Pearson correlation coefficient

**Combined Score**:
```
NTF = normalize(SNR - RMSE + R² + Pearson + Smoothness + DF)
```

Minimum NTF indicates optimal parameters.

## Technical Details

### Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Any browser supporting ES6, Web Workers, and Canvas

### Performance

- Uses Web Workers for all heavy computations
- Batch processing allows parallel file operations
- Canvas-based rendering for fast data visualization
- Memory-efficient array operations using TypedArrays

### File Size Limits

Limited by browser memory (typically 500MB - 2GB per file).

## Architecture

See `ARCHITECTURE.md` for detailed system architecture.

## Development

### Project Structure

```
.
├── index.html              # Main HTML structure
├── css/
│   └── telemetry.css       # Telemetry-inspired styling
├── js/
│   ├── main.js             # Main application logic
│   ├── filloutliers.js     # Outlier detection/fill functions
│   ├── metrics.js          # Quality metrics calculations
│   └── worker.js           # Web Worker for non-blocking operations
├── data/
│   └── test_data.txt       # Sample data file
└── docs/
    ├── README.md           # This file
    ├── ARCHITECTURE.md     # System architecture
    └── AGENTS.md           # Agent development guide
```

### Adding New Features

1. For new fill methods: Edit `filloutliers.js`
2. For new metrics: Edit `metrics.js`
3. For UI changes: Edit `index.html` and `css/telemetry.css`
4. For algorithm changes: Edit `js/worker.js`

## Credits

**Original MATLAB Implementation**: Vladimir Mikhailovich Funtikov (Фунтиков Владимир Михайлович)

**Web Port**: Converted from MATLAB to JavaScript with preserved algorithms.

## License

See project repository for license information.
