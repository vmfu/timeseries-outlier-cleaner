# Outlier Cleaner Web Application

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![MATLAB Compatible](https://img.shields.io/badge/MATLAB-Compatible-blue.svg)](https://www.mathworks.com/products/matlab.html)
[![Status: Stable](https://img.shields.io/badge/Status-Stable-green.svg)](https://github.com/vmfu/timeseries-outlier-cleaner)

A web-based tool for cleaning time series data from noise and outliers, ported from MATLAB to HTML/CSS/JavaScript.

## Overview

This application provides a modern, web-based implementation of the MATLAB outlier cleaning algorithm. It detects and replaces outliers in time series data using various statistical methods, with automatic parameter optimization and batch processing capabilities.

## Features

### Core Functionality
- **Multi-series support**: Handle multiple time series in a single file
- **Automatic parameter tuning**: Two-pass optimization algorithm
- **Quality metrics**: STDF, DF, ASNR, ARMSE, R², and Pearson correlation
- **Batch processing**: Load and process multiple files
- **Non-blocking UI**: Web Workers prevent interface freezing during calculations
- **Real-time visualization**: Interactive charts using modern graphing libraries
- **Progress logging**: Detailed execution logs with progress indicators
- **Telemetry-inspired UI**: Space telemetry interface with post-Soviet research institute aesthetics

### Version 2.0 Enhancements

**Internationalization**
- Full bilingual support (Russian/English)
- Dynamic language switching
- All UI elements translated
- Persistent language preference

**Improved User Experience**
- Drag & drop file upload with visual feedback
- Interactive chart visibility toggles (Original/Cleaned/Both)
- Comprehensive tooltips for all metrics and parameters
- Outlier markers displayed on charts
- Color-coded quality indicators for metrics

**Data Management**
- Interactive data table view with sorting and filtering
- Pagination for large datasets
- Table export to CSV
- Settings presets for quick parameter switching
- Reset session with confirmation dialog

**Export Options**
- Export in multiple formats: CSV, TXT, JSON, HTML
- Structured JSON reports with metadata
- HTML reports with embedded charts
- Error log export functionality
- Batch export for processed files

**Visualization Enhancements**
- Chart zoom and pan controls
- Interactive parameter heatmap
- Click-to-select parameters from heatmap
- ETA display for long operations

**Accessibility**
- WCAG AA compliant color contrast
- Full keyboard navigation support
- Screen reader compatible with ARIA labels
- Focus indicators for all interactive elements
- Skip to main content link

**Performance**
- Debounced UI updates for smoother experience
- Chart rendering optimizations
- Batch processing queue with progress tracking
- Chunk-based optimization for fast parameter tuning

**Error Handling**
- Comprehensive error modal system
- Detailed error messages with recovery suggestions
- Error log export for debugging

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

## Keyboard Shortcuts

The application supports keyboard shortcuts for quick access to common operations:

| Shortcut | Action |
|----------|---------|
| **Q** | Load data |
| **W** | Auto-tune parameters |
| **E** | Clean data |
| **R** | Save results |
| **1** | Show original data only |
| **2** | Show cleaned data only |
| **3** | Show both datasets |
| **Tab** | Navigate between interactive elements |
| **Shift + Tab** | Navigate backwards |
| **Escape** | Close modals (reset confirmation, error messages) |
| **Enter** | Activate focused button/link |

**Note**: Shortcuts only work when not typing in text input fields.

## Troubleshooting

### Common Issues

**"File not loading"**
- Ensure file is ASCII text format (not Excel binary)
- Check file has numeric data separated by spaces or tabs
- Verify file is not corrupted (try opening in text editor)

**"No chart visible"**
- Wait for data to finish loading
- Check browser console for errors (F12)
- Try refreshing the page

**"Processing is slow"**
- Enable "Optimize via chunks" in advanced settings
- Reduce "Matrix Size" for faster tuning
- Use smaller test chunks for quick preview

**"Keyboard shortcuts not working"**
- Click anywhere in the page to ensure focus
- Ensure not typing in input field
- Check browser hasn't disabled JavaScript

**"Modal won't close"**
- Press Escape key
- Click the X button in top-right corner
- Try clicking outside modal

**Export issues**
- Check browser popup blocker allows file downloads
- Verify enough disk space available
- Try different export format (CSV/TXT)

### Browser-Specific Issues

**Firefox**: Web Workers may show security warnings for local files. Serve via HTTP server.
**Safari**: Web Workers require HTTPS or localhost. Use local server for best results.
**Edge/Chrome**: Generally compatible. If issues, clear cache and cookies.

### Getting Help

- Check [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Review [CHANGELOG.md](CHANGELOG.md) for recent changes
- Open browser console (F12) and check for errors

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
│   └── telemetry.css       # Telemetry-inspired styling with accessibility
├── js/
│   ├── main.js             # Main application logic and event handlers
│   ├── i18n.js            # Internationalization system (RU/EN)
│   ├── storage.js          # LocalStorage management
│   ├── export.js           # Export functionality (CSV, TXT, JSON, HTML)
│   ├── queue.js            # Batch processing queue
│   ├── chart.js            # Chart.js configuration and management
│   ├── ui.js               # UI component interactions
│   ├── error.js            # Error handling system
│   ├── utils.js            # Performance utilities (debounce, throttle)
│   ├── filloutliers.js     # Outlier detection/fill functions
│   ├── metrics.js          # Quality metrics calculations
│   └── worker.js           # Web Worker for non-blocking operations
├── data/
│   └── test_data.txt       # Sample data file
└── docs/
    ├── README.md           # This file
    ├── ARCHITECTURE.md     # System architecture
    ├── TODO.md            # Task list and progress tracking
    ├── AGENTS.md          # Agent development guide
    ├── CHANGELOG.md       # Version history
    └── CONTRIBUTING.md    # Contribution guidelines
```

### Adding New Features

1. For new fill methods: Edit `js/filloutliers.js`
2. For new metrics: Edit `js/metrics.js`
3. For UI changes: Edit `index.html` and `css/telemetry.css`
4. For algorithm changes: Edit `js/worker.js`
5. For new translations: Add entries to `js/i18n.js`
6. For new export formats: Extend `js/export.js`
7. For error handling: Use `ErrorHandler` from `js/error.js`

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed module documentation.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a history of changes.

## Code of Conduct

Please read our [Code of Conduct](.github/CODE_OF_CONDUCT.md) before participating.

## Security

For security policies and vulnerability reporting, see [SECURITY.md](.github/SECURITY.md).

## Credits

**Original MATLAB Implementation**: Vladimir Mikhailovich Funtikov (Фунтиков Владимир Михайлович)

**Web Port**: Converted from MATLAB to JavaScript with preserved algorithms.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
