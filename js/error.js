/**
 * error.js - Error handling system
 * Centralized error management with user-friendly messages and recovery suggestions
 */

(function(global) {
    'use strict';

    // ============================================================================
    // ERROR TYPES
    // ============================================================================

    const ErrorTypes = {
        FILE_LOAD: 'file_load',
        FILE_PARSE: 'file_parse',
        PROCESSING: 'processing',
        WORKER: 'worker',
        EXPORT: 'export',
        NETWORK: 'network',
        VALIDATION: 'validation',
        UNKNOWN: 'unknown'
    };

    // ============================================================================
    // ERROR CONFIGURATION
    // ============================================================================

    const ErrorConfig = {
        // Maximum number of errors to store in log
        MAX_ERROR_LOG: 100,

        // Auto-close error modal after this many milliseconds (0 = no auto-close)
        AUTO_CLOSE_TIMEOUT: 0,

        // Enable error sound
        ENABLE_ERROR_SOUND: false
    };

    // ============================================================================
    // ERROR LOG
    // ============================================================================

    const errorLog = [];

    // ============================================================================
    // ERROR RECOVERY SUGGESTIONS
    // ============================================================================

    const recoverySuggestions = {
        file_load: [
            'Проверьте, что файл существует и доступен для чтения',
            'Убедитесь, что файл имеет правильный формат (ASCII, CSV, TXT, DAT)',
            'Попробуйте выбрать другой файл'
        ],
        file_parse: [
            'Проверьте формат файла - он должен содержать числовые данные',
            'Убедитесь, что файл не поврежден',
            'Проверьте разделители значений (пробелы, табуляции, запятые)',
            'Откройте файл в текстовом редакторе и проверьте структуру'
        ],
        processing: [
            'Проверьте параметры очистки (окно, порог)',
            'Попробуйте с другими параметрами',
            'Уменьшите размер данных или разбейте на части',
            'Обновите страницу и попробуйте снова'
        ],
        worker: [
            'Обновите страницу',
            'Проверьте работу JavaScript в браузере',
            'Попробуйте использовать другой браузер',
            'Отключите расширения браузера, которые могут блокировать Web Workers'
        ],
        export: [
            'Проверьте, что данные были успешно загружены и обработаны',
            'Попробуйте другой формат экспорта',
            'Убедитесь, что браузеру разрешено скачивать файлы',
            'Попробуйте снова или используйте другой браузер'
        ],
        network: [
            'Проверьте подключение к интернету',
            'Попробуйте снова через несколько минут',
            'Обновите страницу',
            'Используйте локальный сервер вместо удаленного'
        ],
        validation: [
            'Проверьте введенные данные',
            'Убедитесь, что все обязательные поля заполнены',
            'Проверьте диапазоны значений',
            'Сверьте требования к формату данных'
        ],
        unknown: [
            'Обновите страницу',
            'Попробуйте снова с теми же данными',
            'Проверьте консоль браузера для дополнительной информации',
            'Свяжитесь с технической поддержкой'
        ]
    };

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /**
     * Get recovery suggestions for error type
     */
    function getRecoverySuggestions(errorType) {
        const type = errorType || ErrorTypes.UNKNOWN;
        return recoverySuggestions[type] || recoverySuggestions[ErrorTypes.UNKNOWN];
    }

    /**
     * Format error for display
     */
    function formatError(error) {
        if (error instanceof Error) {
            return error.message || String(error);
        }
        return String(error);
    }

    /**
     * Add error to log
     */
    function addToLog(error, errorType, context) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: errorType,
            message: formatError(error),
            context: context || null,
            stack: error instanceof Error ? error.stack : null
        };

        errorLog.push(logEntry);

        // Keep log size limited
        if (errorLog.length > ErrorConfig.MAX_ERROR_LOG) {
            errorLog.shift();
        }

        // Also log to console
        console.error('[Error Handler]', logEntry);

        return logEntry;
    }

    /**
     * Get user-friendly error message from i18n
     */
    function getUserMessage(errorType, error) {
        const i18nKey = 'error.' + errorType;
        const message = formatError(error);

        if (global.I18n && global.I18n.t) {
            try {
                return global.I18n.t(i18nKey, { message: message });
            } catch (e) {
                // Fallback to simple message
            }
        }

        return message;
    }

    // ============================================================================
    // ERROR DISPLAY
    // ============================================================================

    /**
     * Show error modal
     */
    function showErrorModal(error, errorType, context) {
        const userMessage = getUserMessage(errorType, error);
        const suggestions = getRecoverySuggestions(errorType);

        // Add to log
        const logEntry = addToLog(error, errorType, context);

        // Create or update error modal
        let errorModal = document.getElementById('errorModal');
        if (!errorModal) {
            errorModal = createErrorModal();
            document.body.appendChild(errorModal);
        }

        // Update modal content
        const titleEl = errorModal.querySelector('.error-title');
        const messageEl = errorModal.querySelector('.error-message');
        const contextEl = errorModal.querySelector('.error-context');
        const suggestionsEl = errorModal.querySelector('.error-suggestions');
        const detailsEl = errorModal.querySelector('.error-details');

        if (titleEl) titleEl.textContent = global.I18n ? global.I18n.t('modal.error.title') : 'Ошибка';
        if (messageEl) messageEl.textContent = userMessage;
        if (contextEl) contextEl.textContent = context || '';

        // Update suggestions
        if (suggestionsEl) {
            suggestionsEl.innerHTML = '';
            if (suggestions && suggestions.length > 0) {
                const ul = document.createElement('ul');
                suggestions.forEach(function(suggestion) {
                    const li = document.createElement('li');
                    li.textContent = suggestion;
                    ul.appendChild(li);
                });
                suggestionsEl.appendChild(ul);
            }
        }

        // Update details (expandable)
        if (detailsEl) {
            const errorInfo = error instanceof Error ? error.stack : formatError(error);
            detailsEl.textContent = errorInfo || 'No details available';
        }

        // Show modal
        errorModal.classList.add('show');

        // Auto-close if configured
        if (ErrorConfig.AUTO_CLOSE_TIMEOUT > 0) {
            setTimeout(function() {
                hideErrorModal();
            }, ErrorConfig.AUTO_CLOSE_TIMEOUT);
        }

        return logEntry;
    }

    /**
     * Hide error modal
     */
    function hideErrorModal() {
        const errorModal = document.getElementById('errorModal');
        if (errorModal) {
            errorModal.classList.remove('show');
        }
    }

    /**
     * Create error modal DOM structure
     */
    function createErrorModal() {
        const modal = document.createElement('div');
        modal.id = 'errorModal';
        modal.className = 'modal-overlay error-modal';
        modal.innerHTML = `
            <div class="modal-content error-content">
                <div class="modal-header error-header">
                    <h3 class="modal-title error-title" data-i18n="modal.error.title">Ошибка</h3>
                    <button class="modal-close error-close" onclick="ErrorHandler.hideModal()">&#10005;</button>
                </div>
                <div class="modal-body error-body">
                    <p class="error-message"></p>
                    <div class="error-context-container" style="display: none;">
                        <p class="error-context"></p>
                    </div>
                    <div class="error-suggestions-container">
                        <h4 class="error-suggestions-title" data-i18n="modal.error.suggestions">Возможные решения:</h4>
                        <div class="error-suggestions"></div>
                    </div>
                    <details class="error-details-container">
                        <summary class="error-details-toggle" data-i18n="modal.error.showDetails">Показать технические детали</summary>
                        <pre class="error-details"></pre>
                    </details>
                </div>
                <div class="modal-footer error-footer">
                    <button class="modal-button error-button-primary" onclick="ErrorHandler.hideModal()" data-i18n="modal.error.close">Закрыть</button>
                    <button class="modal-button error-button-secondary" onclick="ErrorHandler.copyError()" data-i18n="modal.error.copy">Копировать</button>
                </div>
            </div>
        `;
        return modal;
    }

    /**
     * Copy error details to clipboard
     */
    function copyLastError() {
        if (errorLog.length === 0) {
            return;
        }

        const lastError = errorLog[errorLog.length - 1];
        const text = JSON.stringify(lastError, null, 2);

        // Copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function() {
                // Show success feedback
                const btn = document.querySelector('.error-button-secondary');
                if (btn) {
                    const originalText = btn.textContent;
                    btn.textContent = global.I18n ? global.I18n.t('modal.error.copied') : 'Скопировано!';
                    setTimeout(function() {
                        btn.textContent = originalText;
                    }, 2000);
                }
            }).catch(function(err) {
                console.error('Failed to copy error:', err);
            });
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }

    // ============================================================================
    // ERROR EXPORT
    // ============================================================================

    /**
     * Export error log as JSON
     */
    function exportErrorLog() {
        if (errorLog.length === 0) {
            if (global.UI && global.UI.log) {
                UI.logMsg('log.errorLogEmpty', null, 'warning');
            }
            return;
        }

        const content = JSON.stringify(errorLog, null, 2);
        const filename = 'error_log_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';

        if (global.Export && global.Export.downloadFile) {
            Export.downloadFile(content, filename);
        } else {
            // Fallback
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }

        if (global.UI && global.UI.log) {
            UI.logMsg('log.errorLogExported', {filename: filename}, 'success');
        }
    }

    /**
     * Get error log
     */
    function getErrorLog() {
        return errorLog.slice(); // Return copy
    }

    /**
     * Clear error log
     */
    function clearErrorLog() {
        errorLog.length = 0;
    }

    // ============================================================================
    // WRAPPER FUNCTIONS
    // ============================================================================

    /**
     * Wrap a function with error handling
     */
    function wrapWithHandler(fn, errorType, context) {
        return function() {
            try {
                return fn.apply(this, arguments);
            } catch (error) {
                showErrorModal(error, errorType, context);
                throw error; // Re-throw for further handling
            }
        };
    }

    /**
     * Wrap an async function with error handling
     */
    function wrapPromise(fn, errorType, context) {
        return function() {
            try {
                var promise = fn.apply(this, arguments);
                if (promise && typeof promise.catch === 'function') {
                    return promise.catch(function(error) {
                        showErrorModal(error, errorType, context);
                        throw error; // Re-throw
                    });
                }
                return promise;
            } catch (error) {
                showErrorModal(error, errorType, context);
                return Promise.reject(error);
            }
        };
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    global.ErrorHandler = {
        // Error types
        types: ErrorTypes,

        // Configuration
        config: ErrorConfig,

        // Display errors
        show: showErrorModal,
        hide: hideErrorModal,
        hideModal: hideErrorModal,
        copyError: copyLastError,

        // Error log
        exportLog: exportErrorLog,
        getLog: getErrorLog,
        clearLog: clearErrorLog,

        // Wrapper functions
        wrap: wrapWithHandler,
        wrapAsync: wrapPromise
    };

    // Initialize error modal close on outside click
    document.addEventListener('click', function(e) {
        const errorModal = document.getElementById('errorModal');
        if (errorModal && errorModal.classList.contains('show')) {
            if (e.target === errorModal) {
                hideErrorModal();
            }
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideErrorModal();
        }
    });

})(typeof window !== 'undefined' ? window : this);
