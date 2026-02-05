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

    // Log history for language switching
    var logHistory = [];

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
        // Cache elements if not already done
        if (!elements.fileCount) {
            cacheElements();
        }

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
        // Cache elements if not already done
        if (!elements.progressBar) {
            cacheElements();
        }

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
     * @param {string|Object} message - Log message or i18n key object {key, params}
     * @param {string} type - Log type ('info', 'success', 'warning', 'error')
     */
    function log(message, type) {
        // Cache elements if not already done
        if (!elements.logArea) {
            cacheElements();
        }

        if (!elements.logArea) return;

        type = type || 'info';
        var now = new Date();
        var time = now.toTimeString().split(' ')[0];

        // Store log entry for language switching
        var logEntry = {
            time: time,
            type: type,
            message: message,
            i18nKey: null,
            i18nParams: null
        };

        // Check if message is an i18n key object
        if (typeof message === 'object' && message.key) {
            logEntry.i18nKey = message.key;
            logEntry.i18nParams = message.params;
            message = global.I18n ? global.I18n.t(message.key, message.params) : message.key;
        }

        var entry = document.createElement('div');
        entry.className = 'log-entry log-' + type;
        entry.innerHTML = '<span class="log-time">' + time + '</span><span class="log-message">' + message + '</span>';

        elements.logArea.appendChild(entry);
        elements.logArea.scrollTop = elements.logArea.scrollHeight;

        // Store in history
        logHistory.push(logEntry);
    }

    /**
     * Clear log messages
     */
    function clearLog() {
        if (elements.logArea) {
            elements.logArea.innerHTML = '';
        }
        logHistory = [];
    }

    /**
     * Update all log messages for language switching
     */
    function updateLogs() {
        if (!elements.logArea) {
            cacheElements();
        }

        if (!elements.logArea) return;

        elements.logArea.innerHTML = '';

        for (var i = 0; i < logHistory.length; i++) {
            var entry = logHistory[i];
            var message = entry.message;

            // Re-translate if i18n key is stored
            if (entry.i18nKey && global.I18n) {
                message = global.I18n.t(entry.i18nKey, entry.i18nParams);
            }

            var entryElement = document.createElement('div');
            entryElement.className = 'log-entry log-' + entry.type;
            entryElement.innerHTML = '<span class="log-time">' + entry.time + '</span><span class="log-message">' + message + '</span>';

            elements.logArea.appendChild(entryElement);
        }

        elements.logArea.scrollTop = elements.logArea.scrollHeight;
    }

    /**
     * Log a translatable message with i18n key
     * @param {string} key - i18n translation key
     * @param {Object} params - i18n parameters
     * @param {string} type - Log type ('info', 'success', 'warning', 'error')
     */
    function logMsg(key, params, type) {
        log({key: key, params: params}, type);
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
        logMsg: logMsg,
        clearLog: clearLog,
        updateLogs: updateLogs,
        show: show,
        hide: hide,
        toggle: toggle
    };

})(typeof window !== 'undefined' ? window : this);
