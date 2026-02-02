# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial web-based implementation of MATLAB outlier cleaner
- Automatic parameter tuning with two-pass optimization
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

### Changed
- Ported from MATLAB App Designer to HTML/CSS/JavaScript
- Converted MATLAB algorithms to pure JavaScript

### Documentation
- Comprehensive README with usage instructions
- Architecture documentation
- Agent development guide
- HOW_TO_RUN instructions
- MIT License

## [1.0.0] - 2026-02-02

### Added
- Initial release
- Core outlier detection and cleaning functionality
- MATLAB implementation with App Designer GUI
- Web-based version with all features ported
