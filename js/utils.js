/**
 * Utils Module - Utility functions for performance optimization
 *
 * Provides debounce and throttle functions to optimize UI updates
 * and prevent excessive function calls.
 */

(function(global) {
    'use strict';

    /**
     * Debounce function - Delays function execution until after a delay period
     * Useful for resize events, slider inputs, and other frequently fired events
     *
     * @param {Function} func - Function to debounce
     * @param {number} wait - Delay in milliseconds
     * @param {boolean} immediate - Whether to execute immediately on first call
     * @returns {Function} Debounced function
     */
    function debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) {
                    func.apply(context, args);
                }
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) {
                func.apply(context, args);
            }
        };
    }

    /**
     * Throttle function - Limits function execution to once every delay period
     * Useful for scroll events, animations, and other continuous events
     *
     * @param {Function} func - Function to throttle
     * @param {number} limit - Minimum time between executions in milliseconds
     * @returns {Function} Throttled function
     */
    function throttle(func, limit) {
        var inThrottle;
        return function() {
            var context = this;
            var args = arguments;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
        };
    }

    /**
     * RequestAnimationFrame wrapper for smooth animations
     * Uses RAF for browser-optimized animation timing
     *
     * @param {Function} callback - Function to call on next animation frame
     * @returns {number} Request ID that can be used to cancel the request
     */
    function requestAnimationFrame(callback) {
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            return window.requestAnimationFrame(callback);
        } else {
            // Fallback for browsers without RAF support
            return setTimeout(callback, 16); // ~60fps
        }
    }

    /**
     * Cancel RAF request
     *
     * @param {number} requestId - Request ID to cancel
     */
    function cancelAnimationFrame(requestId) {
        if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
            window.cancelAnimationFrame(requestId);
        } else {
            clearTimeout(requestId);
        }
    }

    /**
     * Batch DOM updates to reduce reflows
     * Collects multiple DOM updates and applies them in a single RAF cycle
     *
     * @returns {Function} Function that accepts a callback to be executed in the next RAF
     */
    function batchDOMUpdates() {
        var callbacks = [];
        var scheduled = false;

        function flush() {
            scheduled = false;
            var currentCallbacks = callbacks;
            callbacks = [];

            // Execute all callbacks
            for (var i = 0; i < currentCallbacks.length; i++) {
                try {
                    currentCallbacks[i]();
                } catch (e) {
                    console.error('Error in batched DOM update:', e);
                }
            }
        }

        return function(callback) {
            callbacks.push(callback);
            if (!scheduled) {
                scheduled = true;
                requestAnimationFrame(flush);
            }
        };
    }

    /**
     * Create a batched DOM updater instance
     */
    var batchUpdater = batchDOMUpdates();

    /**
     * Measure performance of a function
     *
     * @param {Function} func - Function to measure
     * @param {string} label - Label for the measurement
     * @returns {Function} Wrapped function that logs execution time
     */
    function measurePerformance(func, label) {
        if (typeof performance === 'undefined' || !performance.mark) {
            return func;
        }

        return function() {
            var startLabel = label + '-start';
            var endLabel = label + '-end';

            performance.mark(startLabel);

            var result = func.apply(this, arguments);

            performance.mark(endLabel);
            performance.measure(label, startLabel, endLabel);

            var measure = performance.getEntriesByName(label)[0];
            if (measure && measure.duration > 100) {
                console.warn('Performance warning:', label, 'took', measure.duration.toFixed(2), 'ms');
            }

            // Cleanup marks
            performance.clearMarks(startLabel);
            performance.clearMarks(endLabel);
            performance.clearMeasures(label);

            return result;
        };
    }

    // Export public API
    var Utils = {
        debounce: debounce,
        throttle: throttle,
        requestAnimationFrame: requestAnimationFrame,
        cancelAnimationFrame: cancelAnimationFrame,
        batchDOMUpdates: batchUpdater,
        measurePerformance: measurePerformance
    };

    // Export to global scope
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Utils;
    } else {
        global.Utils = Utils;
    }

})(typeof window !== 'undefined' ? window : this);
