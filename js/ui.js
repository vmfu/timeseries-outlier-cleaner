/**
 * ui.js - UI components and interactions
 * Handles UI interactions, event listeners, and DOM updates
 */

(function(global) {
    'use strict';

    // ============================================================================
    // DOM ELEMENTS
    // ============================================================================

    var elements = {};

    /**
     * Cache DOM elements for performance
     */
    function cacheElements() {
        // Cache frequently accessed elements
        elements.fileInput = document.getElementById('fileInput');
        elements.fileCount = document.getElementById('fileCount');
        elements.logArea = document.getElementById('logArea');
        elements.progressBar = document.getElementById('progressBar');
        elements.progressFill = document.getElementById('progressFill');
        elements.progressPercent = document.getElementById('progressPercent');
        elements.progressMessage = document.getElementById('progressMessage');
        elements.progressETA = document.getElementById('progressETA');
    }

    /**
     * Update file count display
     * @param {number} count - Number of files selected
     */
    function updateFileCount(count) {
        if (elements.fileCount) {
            elements.fileCount.textContent = I18n.t('file.count', { count: count });
        }
    }

    /**
     * Update progress bar and label
     * @param {number} value - Progress value (0-100)
     * @param {string} message - Optional message
     */
    function updateProgress(value, message) {
        if (!elements.progressBar) return;

        if (value >= 0 && value <= 100) {
            elements.progressBar.classList.remove('hidden');
            elements.progressBar.classList.add('visible');
            if (elements.progressFill) {
                elements.progressFill.style.width = value + '%';
            }
            if (elements.progressPercent) {
                elements.progressPercent.textContent = Math.round(value) + '%';
            }
        }

        if (message && elements.progressMessage) {
            elements.progressMessage.textContent = message;
        }
    }

    /**
     * Show/hide progress bar
     * @param {boolean} show - Whether to show or hide the progress bar
     */
    function showProgressBar(show) {
        if (show) {
            if (elements.progressBar) {
                elements.progressBar.classList.remove('hidden');
                elements.progressBar.classList.add('visible');
            }
        } else {
            if (elements.progressBar) {
                setTimeout(function() {
                    elements.progressBar.classList.add('hidden');
                    elements.progressBar.classList.remove('visible');
                    if (elements.progressETA) {
                        elements.progressETA.classList.add('hidden');
                        elements.progressETA.textContent = '';
                    }
                    if (elements.progressFill) {
                        elements.progressFill.style.width = '0%';
                    }
                }, 300);
            }
        }
    }

    /**
     * Update ETA display
     * @param {string} etaText - ETA text to display
     */
    function updateETA(etaText) {
        if (!elements.progressETA) return;

        if (etaText) {
            elements.progressETA.textContent = etaText;
            elements.progressETA.classList.remove('hidden');
        } else {
            elements.progressETA.classList.add('hidden');
        }
    }

    /**
     * Add message to log
     * @param {string} message - Log message
     * @param {string} type - Log type ('info', 'success', 'warning', 'error')
     */
    function log(message, type) {
        if (!elements.logArea) return;

        type = type || 'info';
        var now = new Date();
        var time = now.toTimeString().split(' ')[0];

        var entry = document.createElement('div');
        entry.className = 'log-entry log-' + type;
        entry.innerHTML = '<span class="log-time">' + time + '</span><span class="log-message">' + message + '</span>';

        elements.logArea.appendChild(entry);
        elements.logArea.scrollTop = elements.logArea.scrollHeight;
    }

    /**
     * Clear log messages
     */
    function clearLog() {
        if (elements.logArea) {
            elements.logArea.innerHTML = '';
        }
    }

    /**
     * Show element
     * @param {string} id - Element ID
     */
    function show(id) {
        var el = document.getElementById(id);
        if (el) {
            el.style.display = 'block';
        }
    }

    /**
     * Hide element
     * @param {string} id - Element ID
     */
    function hide(id) {
        var el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
        }
    }

    /**
     * Toggle element visibility
     * @param {string} id - Element ID
     */
    function toggle(id) {
        var el = document.getElementById(id);
        if (el) {
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
        }
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    // Export to global scope
    global.UI = {
        cacheElements: cacheElements,
        updateFileCount: updateFileCount,
        updateProgress: updateProgress,
        showProgressBar: showProgressBar,
        updateETA: updateETA,
        log: log,
        clearLog: clearLog,
        show: show,
        hide: hide,
        toggle: toggle
    };

})(typeof window !== 'undefined' ? window : this);
