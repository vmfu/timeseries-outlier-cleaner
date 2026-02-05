/**
 * queue.js - Batch processing queue
 * Manages batch file processing queue and results
 */

(function(global) {
    'use strict';

    // ============================================================================
    // QUEUE STATE
    // ============================================================================

    var queue = [];
    var results = [];
    var isProcessing = false;
    var isCancelled = false;

    // ============================================================================
    // QUEUE FUNCTIONS
    // ============================================================================

    /**
     * Add files to batch queue
     * @param {Array} files - Array of File objects
     */
    function addToQueue(files) {
        var uniqueFiles = [];

        // Filter out duplicates
        files.forEach(function(file) {
            var exists = queue.some(function(item) {
                return item.file.name === file.name;
            });
            if (!exists) {
                queue.push({
                    file: file,
                    id: Date.now() + Math.random(),
                    status: 'pending',  // pending, processing, completed, error
                    progress: 0,
                    result: null
                });
            }
        });

        return queue;
    }

    /**
     * Remove file from queue
     * @param {string|number} id - File ID or index
     */
    function removeFromQueue(id) {
        if (isProcessing) {
            console.warn('[Queue] Cannot remove file during processing');
            return false;
        }

        if (typeof id === 'number') {
            queue.splice(id, 1);
        } else {
            var index = queue.findIndex(function(item) {
                return item.id === id;
            });
            if (index !== -1) {
                queue.splice(index, 1);
            }
        }

        return true;
    }

    /**
     * Get current queue status
     * @returns {Object} Queue status object
     */
    function getStatus() {
        return {
            queue: queue,
            results: results,
            isProcessing: isProcessing,
            isCancelled: isCancelled
        };
    }

    /**
     * Start batch processing
     * @returns {boolean} Success or failure
     */
    function startProcessing() {
        if (isProcessing) {
            console.warn('[Queue] Already processing');
            return false;
        }

        isProcessing = true;
        isCancelled = false;
        return true;
    }

    /**
     * Complete batch processing
     */
    function completeProcessing() {
        isProcessing = false;
    }

    /**
     * Cancel batch processing
     */
    function cancelProcessing() {
        isCancelled = true;
        isProcessing = false;
    }

    /**
     * Update queue item status
     * @param {number} index - Item index
     * @param {string} status - New status
     * @param {number} progress - Progress percentage
     * @param {Object} result - Processing result
     */
    function updateItem(index, status, progress, result) {
        if (queue[index]) {
            if (status) queue[index].status = status;
            if (progress !== undefined) queue[index].progress = progress;
            if (result) queue[index].result = result;
        }
    }

    /**
     * Add processed result
     * @param {Object} result - Processing result
     */
    function addResult(result) {
        results.push(result);
    }

    /**
     * Clear queue and results
     */
    function clear() {
        queue = [];
        results = [];
        isProcessing = false;
        isCancelled = false;
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    // Export to global scope
    global.Queue = {
        addToQueue: addToQueue,
        removeFromQueue: removeFromQueue,
        getStatus: getStatus,
        startProcessing: startProcessing,
        completeProcessing: completeProcessing,
        cancelProcessing: cancelProcessing,
        updateItem: updateItem,
        addResult: addResult,
        clear: clear
    };

})(typeof window !== 'undefined' ? window : this);
