# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-03

### Added

#### Internationalization (Task 1)
- Complete i18n system with Russian and English support
- Language switcher UI component in header
- 300+ translation keys covering all UI elements
- Browser language detection
- Language preference persistence in localStorage
- Dynamic text updates when switching languages

#### File Upload Enhancements (Task 2)
- Drag & drop file upload zone
- Visual feedback during drag events
- Support for multiple file types (TXT, DAT, CSV, ASC)
- Error handling for invalid file types
- File count display with i18n support

#### Chart Visualization (Task 3)
- Chart visibility controls: Original, Cleaned, Both
- Keyboard shortcuts: 1/2/3 for quick toggle
- Chart preference persistence in localStorage
- Smooth transitions between visibility modes

#### Tooltips (Task 4)
- Comprehensive tooltip system for all metrics
- Quality threshold explanations with color coding
- Parameter tooltips with recommended ranges
- CRT-styled glowing tooltip design
- Mobile-friendly touch support

#### Outlier Markers (Task 5)
- Visual outlier markers on charts (yellow/orange points)
- Tooltip display with point coordinates and values
- Scatter dataset for marker overlay
- Glow effects for CRT aesthetic

#### Quality Color Coding (Task 6)
- Color-coded metric values (green/yellow/red)
- Quality threshold indicators
- Visual icons (✓/⚠/✗)
- Dynamic CSS class application
- Excellent/good/poor quality levels

#### Session Management (Task 7)
- Reset session button with confirmation dialog
- Clear all data, charts, logs, and parameters
- Warning message before reset
- CRT-styled modal dialog

#### Export Reports (Task 8)
- JSON report export with structured data
- HTML report export with embedded charts
- PDF-style printable reports
- Metadata section (filename, creation date)
- Quality metrics tables with color coding
- Embedded data chart and parameter map images
- Bilingual report support

#### Data Table View (Task 9)
- Tabular data display
- Filter by series
- Pagination for large datasets
- Export table to CSV
- Valid/outlier status indicators
- Series selection dropdown

#### Optimization Settings (Task 10)
- Chunk-based optimization toggle
- Number of test chunks slider (1-5)
- Performance boost for auto-tuning (5-10x faster)
- Real-time progress updates

#### Presets System (Task 11)
- Settings presets management
- Three built-in presets: Conservative, Balanced, Aggressive
- Custom preset creation and saving
- Preset deletion
- Preset application with instant UI update
- Preset persistence in localStorage

#### Zoom Controls (Task 12)
- Chart zoom controls (+/- buttons)
- Reset zoom button
- Mouse wheel zoom support
- Touch pinch zoom support
- Pan enabled on X axis
- Chart.js Zoom Plugin integration

#### Performance Monitoring (Task 13)
- Real-time ETA calculation
- Time remaining display in RU/EN
- Progress percentage updates
- Time-averaged performance tracking
- Smoothing algorithms for ETA accuracy

#### File Information Panel (Task 14)
- File metadata display
- Filename and size information
- Data points and series count
- Optimal parameters display
- CRT-styled info panel

#### Error Handling (Task 15)
- Centralized error handling module
- User-friendly error messages
- Recovery suggestions for error types
- Error modal with technical details
- Copy error to clipboard functionality
- Error log export as JSON
- Error types: FILE_LOAD, FILE_PARSE, PROCESSING, WORKER, EXPORT, NETWORK, VALIDATION

#### File Format Selection (Task 16)
- Export format dropdown (CSV/TXT)
- File save options checkboxes
- Include validity flag option
- Save restored data option
- Dynamic filename generation

#### Status Indicators (Task 17)
- Real-time status display
- Color-coded status: READY, ONLINE, PROCESSING, ERROR
- Status tooltips with explanations
- Live status updates during operations

#### Responsive Layout (Task 18)
- Improved responsive design
- Mobile-first CSS
- Breakpoints: mobile (≤768px), tablet (768-1024px), desktop (>1024px)
- Collapsible panels on mobile
- Touch-friendly button sizes
- Optimized chart resizing

#### Accessibility (Task 23)
- WCAG 2.1 AA compliance
- Skip-to-main-content link
- High-contrast focus indicators using :focus-visible
- ARIA labels and roles throughout UI
- Screen reader support
- Keyboard shortcuts (Q/W/E/R for operations, 1/2/3 for views, Escape for modals)
- Color contrast improvements (text-muted: #008844 → #00aa55)
- Live regions for status updates
- Semantic HTML structure

#### Documentation (Task 25)
- Comprehensive README.md with Version 2.0 features
- Keyboard shortcuts reference table
- Troubleshooting section
- Updated project structure
- Architecture documentation with new modules
- Development guidelines in AGENTS.md
- Accessibility implementation guide
- Internationalization usage examples
- Error handling patterns
- Performance optimization guide

### Changed

#### Code Architecture
- Refactored into modular IIFE pattern
- Separated concerns: i18n, storage, export, queue, chart, ui, error, utils
- ES5 compatible JavaScript for maximum browser support
- Centralized state management

#### Performance
- Web Worker for non-blocking computations
- Debounce and throttle for UI events
- Batch DOM updates via requestAnimationFrame
- TypedArray usage for efficient data handling

#### User Interface
- Enhanced CRT telemetry aesthetic
- Improved color contrast for accessibility
- Smoother animations and transitions
- Better visual feedback for user actions

### Fixed

- Chart zoom behavior on mobile devices
- Focus indicators visibility
- Language persistence on page reload
- Error modal display issues
- Progress bar alignment

### Technical Details

#### New Modules
- `js/i18n.js` - Internationalization system
- `js/storage.js` - localStorage management
- `js/export.js` - Data export (CSV, TXT, JSON, HTML)
- `js/queue.js` - Batch processing queue
- `js/chart.js` - Chart.js configuration
- `js/ui.js` - UI updates and DOM manipulation
- `js/error.js` - Centralized error handling
- `js/utils.js` - Performance utilities

#### Dependencies
- Chart.js 4.4.0
- Chart.js Zoom Plugin 2.0.1
- No build tools required (vanilla JS)
- No external dependencies beyond Chart.js

#### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- ES5 compatible JavaScript
- LocalStorage support required
- Web Worker support required

## [1.0.0] - 2026-02-02

### Added
- Initial release
- Core outlier detection and cleaning functionality
- MATLAB implementation with App Designer GUI
- Web-based version with all features ported
- Multiple fill methods: center, clip, previous, next, nearest, linear, spline, pchip, makima
- Quality metrics: STDF, DF, ASNR, ARMSE, R², and Pearson correlation
- Batch processing for multiple files
- Web Worker support for non-blocking UI
- Telemetry-inspired user interface
- Real-time data visualization
- Progress logging with detailed execution logs
- Responsive layout for different screen sizes
- Fill method support with extreme value marker (↗∞)
- Multiple outlier detection methods: median, mean, quartiles, grubbs, gesd, movmedian, movmean
- Adaptive iterative cleaning with 100 iterations
- Comprehensive README with usage instructions
- Architecture documentation
- Agent development guide
- HOW_TO_RUN instructions
- MIT License

[Unreleased]: https://github.com/yourusername/timeseries-outlier-cleaner/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/yourusername/timeseries-outlier-cleaner/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/yourusername/timeseries-outlier-cleaner/releases/tag/v1.0.0
