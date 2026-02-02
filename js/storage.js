/**
 * storage.js - localStorage management
 * Handles saving and loading application settings from localStorage
 */

(function(global) {
    'use strict';

    // ============================================================================
    // STORAGE KEYS
    // ============================================================================

    const KEYS = {
        LANGUAGE: 'outlierCleanerLanguage',
        CHART_VISIBILITY: 'outlierCleanerChartVisibility',
        PRESETS: 'outlierCleanerPresets'
    };

    // ============================================================================
    // STORAGE FUNCTIONS
    // ============================================================================

    /**
     * Save language preference to localStorage
     * @param {string} lang - Language code
     */
    function saveLanguage(lang) {
        try {
            localStorage.setItem(KEYS.LANGUAGE, lang);
        } catch (e) {
            console.warn('[Storage] Failed to save language:', e);
        }
    }

    /**
     * Load language preference from localStorage
     * @returns {string|null} Saved language code or null
     */
    function loadLanguage() {
        try {
            return localStorage.getItem(KEYS.LANGUAGE);
        } catch (e) {
            console.warn('[Storage] Failed to load language:', e);
            return null;
        }
    }

    /**
     * Save chart visibility preference
     * @param {string} mode - 'original', 'cleaned', or 'both'
     */
    function saveChartVisibility(mode) {
        try {
            localStorage.setItem(KEYS.CHART_VISIBILITY, mode);
        } catch (e) {
            console.warn('[Storage] Failed to save chart visibility:', e);
        }
    }

    /**
     * Load chart visibility preference
     * @returns {string|null} Saved visibility mode or null
     */
    function loadChartVisibility() {
        try {
            return localStorage.getItem(KEYS.CHART_VISIBILITY);
        } catch (e) {
            console.warn('[Storage] Failed to load chart visibility:', e);
            return null;
        }
    }

    /**
     * Save custom presets to localStorage
     * @param {Object} presets - Presets object with preset names as keys
     */
    function savePresets(presets) {
        try {
            localStorage.setItem(KEYS.PRESETS, JSON.stringify(presets));
        } catch (e) {
            console.warn('[Storage] Failed to save presets:', e);
        }
    }

    /**
     * Load custom presets from localStorage
     * @returns {Object|null} Saved presets object or null
     */
    function loadPresets() {
        try {
            const data = localStorage.getItem(KEYS.PRESETS);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.warn('[Storage] Failed to load presets:', e);
            return null;
        }
    }

    /**
     * Clear all application data from localStorage
     */
    function clearAll() {
        try {
            Object.values(KEYS).forEach(function(key) {
                localStorage.removeItem(key);
            });
        } catch (e) {
            console.warn('[Storage] Failed to clear storage:', e);
        }
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    // Export to global scope
    global.Storage = {
        saveLanguage: saveLanguage,
        loadLanguage: loadLanguage,
        saveChartVisibility: saveChartVisibility,
        loadChartVisibility: loadChartVisibility,
        savePresets: savePresets,
        loadPresets: loadPresets,
        clearAll: clearAll
    };

})(typeof window !== 'undefined' ? window : this);
