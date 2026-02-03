# Unit Tests for Outlier Cleaner

## Overview

This directory contains unit tests for the Outlier Cleaner application, using QUnit as the testing framework.

## Running Tests

### Method 1: Open in Browser

Simply open `tests/index.html` in your web browser:

```bash
# Windows
start tests/index.html

# Or double-click the file in Explorer
```

### Method 2: Using Local Server

Start a local server and navigate to the test page:

```bash
# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (http-server)
npx http-server -p 8000

# Then open http://localhost:8000/tests/ in your browser
```

## Test Structure

```
tests/
├── index.html          # Test runner HTML file
├── test-utils.js       # Test utility functions and helpers
├── test-filloutliers.js  # Tests for filloutliers.js module
├── test-metrics.js    # Tests for metrics.js module
├── test-export.js     # Tests for export.js module
└── test-i18n.js       # Tests for i18n.js module
```

## Test Coverage

### Modules Tested

1. **filloutliers.js** - Core outlier detection and replacement
   - Utility functions (mean, median, std, etc.)
   - Outlier detection methods (median, mean, quartiles, movmedian, movmean)
   - Fill methods (center, clip, previous, next, nearest, linear, spline, pchip, makima)
   - Main filloutliers() function

2. **metrics.js** - Quality metrics calculations
   - Utility functions
   - Signal analysis (noise analysis, chunk selection)
   - Quality metrics (STDF, DF, ASNR, RMSE, R², Pearson)
   - Multi-series metrics
   - Matrix smoothing

3. **export.js** - Data export functionality
   - CSV export
   - JSON export
   - HTML report generation
   - File download functionality

4. **i18n.js** - Internationalization
   - Language management (getLanguage, setLanguage)
   - Translation function (t)
   - UI updates (updateAllTextElements)
   - Dictionary structure

## Writing New Tests

### Test File Template

```javascript
/**
 * test-modulename.js - Unit tests for module
 */

QUnit.module('modulename - Feature Group', function() {

    QUnit.test('test description', function(assert) {
        // Arrange
        var input = ...;

        // Act
        var result = functionUnderTest(input);

        // Assert
        assert.equal(result, expected, 'description');
    });
});
```

### Available Assertions

- `assert.equal(actual, expected, message)` - Equality check
- `assert.notEqual(actual, expected, message)` - Inequality check
- `assert.deepEqual(actual, expected, message)` - Deep equality
- `assert.ok(value, message)` - Truthy check
- `assert.notOk(value, message)` - Falsy check
- `assert.raises(block, expected, message)` - Exception check

### Test Utilities

Use `TestUtils` for common test utilities:

```javascript
// Generate test signal with noise and outliers
var signal = TestUtils.generateTestSignal(100, 0.1, [25, 50, 75]);

// Create test data matrix
var matrix = TestUtils.createTestDataMatrix(10, 3);

// Array equality with tolerance
TestUtils.assertArrayEqual(actual, expected, 'Arrays should match', 0.001);

// Number equality with tolerance
TestUtils.assertNumEqual(actual, expected, 'Numbers should match', 0.0001);

// Approximate equality
TestUtils.assertApproxEqual(actual, expected, 'Values should be close', 0.01);
```

## Debugging Tests

1. Open browser DevTools (F12)
2. Add `debugger;` statements in test code
3. Check the QUnit output for detailed error messages
4. Use `console.log()` for debugging information

## Continuous Integration

### GitHub Actions

Tests can be automated in CI using:

```yaml
name: Run Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
      - name: Install QUnit
        run: npm install -g qunit
      - name: Run tests
        run: |
          npx http-server -p 8000 &
          sleep 5
          # Tests would run via headless browser
```

## Troubleshooting

### Tests don't load

- Check that all JS files are loaded in `tests/index.html`
- Verify file paths are correct
- Check browser console for loading errors

### Tests fail randomly

- Check for async timing issues
- Ensure proper cleanup between tests
- Verify no global state pollution

### QUnit not rendering

- Check that QUnit CSS is loaded
- Verify QUnit script is loaded after test modules
- Check browser console for errors

## Test Standards

- All tests should be independent (no dependencies on other tests)
- Tests should clean up after themselves
- Use descriptive test names
- Group related tests in modules using `QUnit.module()`
- Keep tests focused and atomic

---

**Version**: 1.0.0
**Last Updated**: 2026-02-03
**Framework**: QUnit 2.25.0
