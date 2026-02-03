/**
 * test-utils.js - Test utility functions for QUnit
 */

(function(global) {
    'use strict';

    // ============================================================================
    // ASSERTION HELPERS
    // ============================================================================

    /**
     * Assert two arrays are equal (with tolerance for floating point)
     */
    function assertArrayEqual(actual, expected, message, tolerance) {
        tolerance = tolerance || 1e-10;

        if (actual.length !== expected.length) {
            QUnit.pushFailure({
                message: message || 'Array lengths differ',
                actual: actual,
                expected: expected
            });
            return;
        }

        for (var i = 0; i < actual.length; i++) {
            if (Math.abs(actual[i] - expected[i]) > tolerance) {
                QUnit.pushFailure({
                    message: message || 'Arrays differ at index ' + i,
                    actual: actual,
                    expected: expected
                });
                return;
            }
        }

        QUnit.pushSuccess({
            message: message
        });
    }

    /**
     * Assert two numbers are equal (with tolerance)
     */
    function assertNumEqual(actual, expected, message, tolerance) {
        tolerance = tolerance || 1e-10;

        if (Math.abs(actual - expected) > tolerance) {
            QUnit.pushFailure({
                message: message || 'Numbers differ',
                actual: actual,
                expected: expected
            });
            return;
        }

        QUnit.pushSuccess({
            message: message
        });
    }

    /**
     * Assert approximate equality for objects
     */
    function assertApproxEqual(actual, expected, message, tolerance) {
        tolerance = tolerance || 1e-6;

        var actualNum = parseFloat(actual);
        var expectedNum = parseFloat(expected);

        if (Math.abs(actualNum - expectedNum) > tolerance) {
            QUnit.pushFailure({
                message: message || 'Values differ',
                actual: actual,
                expected: expected
            });
            return;
        }

        QUnit.pushSuccess({
            message: message
        });
    }

    /**
     * Generate test signal data
     */
    function generateTestSignal(length, noiseLevel, outliers) {
        length = length || 100;
        noiseLevel = noiseLevel || 0.1;
        outliers = outliers || [];

        var signal = [];
        for (var i = 0; i < length; i++) {
            signal.push(Math.sin(i * 0.1) + (Math.random() - 0.5) * noiseLevel);
        }

        // Add outliers
        for (var j = 0; j < outliers.length; j++) {
            var idx = outliers[j];
            if (idx < length) {
                signal[idx] += (Math.random() > 0.5 ? 5 : -5);
            }
        }

        return signal;
    }

    /**
     * Create test data matrix
     */
    function createTestDataMatrix(rows, cols) {
        var matrix = [];
        for (var i = 0; i < rows; i++) {
            var row = [];
            for (var j = 0; j < cols; j++) {
                row.push(Math.sin(i * 0.1 * (j + 1)));
            }
            matrix.push(row);
        }
        return matrix;
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    global.TestUtils = {
        assertArrayEqual: assertArrayEqual,
        assertNumEqual: assertNumEqual,
        assertApproxEqual: assertApproxEqual,
        generateTestSignal: generateTestSignal,
        createTestDataMatrix: createTestDataMatrix,
        TOLERANCE: 1e-6
    };

})(typeof window !== 'undefined' ? window : this);
