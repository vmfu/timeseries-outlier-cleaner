/**
 * worker.js - Web Worker for non-blocking outlier cleaning operations
 * Handles heavy computations to keep UI responsive
 */

// Import scripts (relative path from worker file)
importScripts('filloutliers.js', 'metrics.js');

let currentJobId = null;

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = function(event) {
    const { type, jobId, data } = event.data;

    // Cancel previous job if new one comes in
    if (currentJobId && jobId !== currentJobId) {
        // Optionally handle cancellation
    }

    currentJobId = jobId;

    try {
        switch (type) {
            case 'CLEAN':
                handleClean(jobId, data);
                break;
            case 'CLEAN_SERIES':
                handleCleanSeries(jobId, data);
                break;
            case 'TUNE':
                handleTune(jobId, data);
                break;
            case 'METRICS':
                handleMetrics(jobId, data);
                break;
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            jobId: jobId,
            data: { message: error.message, stack: error.stack }
        });
    }
};

// ============================================================================
// CLEAN OPERATION
// ============================================================================

function handleClean(jobId, data) {
    const {
        signal: originalSignal,
        params
    } = data;

    const {
        windowWidth = 40,
        threshold = 1.4,
        fillMethod = 'nearest',
        detectionMethod = 'movmean'
    } = params;

    const ma = windowWidth;
    const tfa = threshold * 100;

    let signal = originalSignal.slice(); // Create mutable copy

    // Perform 100 iterations with adaptive parameters
    for (let i = 1; i <= 100; i++) {
        const adaptiveWin = ma + (ma / 100) * 4 * Math.pow(10 - Math.sqrt(i), 0.5);
        const adaptiveThresh = tfa / 100 + (tfa / 100) * 4 * Math.pow(10 - Math.sqrt(i), 0.5) / 100;

        const result = filloutliers(
            new Float64Array(signal),
            fillMethod,
            detectionMethod,
            {
                thresholdFactor: adaptiveThresh,
                windowLength: Math.round(adaptiveWin)
            }
        );

        signal = Array.from(result.cleanedData);

        // Send progress update
        self.postMessage({
            type: 'PROGRESS',
            jobId: jobId,
            data: {
                progress: i,
                message: `Iteration ${i}/100 - Window: ${Math.round(adaptiveWin)}, Threshold: ${adaptiveThresh.toFixed(4)}`
            }
        });
    }

    // Compute final metrics
    const metrics = computeAllMetricsSingle(data.original, signal);

    self.postMessage({
        type: 'RESULT',
        jobId: jobId,
        data: {
            cleanedData: new Float64Array(signal),
            metrics: metrics
        }
    });
}

/**
 * Handle clean operation for a single series (returns series index)
 */
function handleCleanSeries(jobId, data) {
    const {
        seriesIndex,
        signal: originalSignal,
        params
    } = data;

    const {
        windowWidth = 40,
        threshold = 1.4,
        fillMethod = 'nearest',
        detectionMethod = 'movmean'
    } = params;

    const ma = windowWidth;
    const tfa = threshold * 100;

    let signal = originalSignal.slice(); // Create mutable copy

    // Perform 100 iterations with adaptive parameters
    for (let i = 1; i <= 100; i++) {
        const adaptiveWin = ma + (ma / 100) * 4 * Math.pow(10 - Math.sqrt(i), 0.5);
        const adaptiveThresh = tfa / 100 + (tfa / 100) * 4 * Math.pow(10 - Math.sqrt(i), 0.5) / 100;

        const result = filloutliers(
            new Float64Array(signal),
            fillMethod,
            detectionMethod,
            {
                thresholdFactor: adaptiveThresh,
                windowLength: Math.round(adaptiveWin)
            }
        );

        signal = Array.from(result.cleanedData);

        // Send progress update (less frequent to avoid flooding)
        if (i % 20 === 0 || i === 100) {
            self.postMessage({
                type: 'PROGRESS',
                jobId: jobId,
                data: {
                    progress: i,
                    message: `Series ${seriesIndex}: Iteration ${i}/100 - Window: ${Math.round(adaptiveWin)}, Threshold: ${adaptiveThresh.toFixed(4)}`
                }
            });
        }
    }

    // Compute final metrics
    const metrics = computeAllMetricsSingle(data.original, signal);

    self.postMessage({
        type: 'RESULT',
        jobId: jobId,
        data: {
            seriesIndex: seriesIndex,
            cleanedData: new Float64Array(signal),
            metrics: metrics
        }
    });
}

// ============================================================================
// TUNE OPERATION
// ============================================================================

function handleTune(jobId, data) {
    console.log('[Worker] ========== START handleTune ==========');
    console.log('[Worker] Данные:', data);

    console.log('[Worker] Проверяю доступные функции...');
    console.log('[Worker]   typeof performGridSearch:', typeof performGridSearch);
    console.log('[Worker]   typeof analyzeSignalNoise:', typeof analyzeSignalNoise);
    console.log('[Worker]   typeof selectRepresentativeChunks:', typeof selectRepresentativeChunks);

    // Perform grid search
    const result = performGridSearch(
        data.originalData,
        data.params,
        (progressInfo) => {
            self.postMessage({
                type: 'PROGRESS',
                jobId: jobId,
                data: progressInfo
            });
        }
    );

    console.log('[Worker] ========== END handleTune ==========');
    console.log('[Worker] Результат автоподбора:', result);

    self.postMessage({
        type: 'RESULT',
        jobId: jobId,
        data: {
            NTF: result.NTF,
            optimalParams: result.optimalParams,
            allMetrics: result.allMetrics
        }
    });
}

// ============================================================================
// METRICS OPERATION
// ============================================================================

function handleMetrics(jobId, data) {
    const {
        original,
        cleaned
    } = data;

    let metrics;

    if (Array.isArray(original[0])) {
        // Multi-series
        metrics = computeAllMetricsMultiSeries(original, cleaned);
    } else {
        // Single series
        metrics = computeAllMetricsSingle(original, cleaned);
    }

    self.postMessage({
        type: 'RESULT',
        jobId: jobId,
        data: {
            metrics: metrics
        }
    });
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

async function processBatch(files, params, onProgress) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        onProgress({
            progress: (i / files.length) * 100,
            message: `Processing file ${i + 1}/${files.length}: ${file.name}`
        });

        // Parse file
        const data = parseAsciiData(file.content);

        // Clean data
        const cleaned = await cleanData(data, params);

        results.push({
            filename: file.name,
            data: cleaned,
            metrics: computeAllMetricsMultiSeries(data, cleaned)
        });
    }

    return results;
}

function parseAsciiData(content) {
    const lines = content.trim().split('\n');
    const data = [];

    for (const line of lines) {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || line.trim() === '') {
            continue;
        }

        const values = line.trim().split(/\s+/).map(v => parseFloat(v));

        // Skip lines with no valid numbers
        if (values.some(isNaN)) {
            continue;
        }

        data.push(values);
    }

    return data;
}

async function cleanData(data, params) {
    const numSeries = data[0].length - 1; // Assume first column is time

    const cleaned = [];
    for (const row of data) {
        cleaned.push(row.slice());
    }

    // Clean each series
    for (let col = 1; col < data[0].length; col++) {
        const signal = data.map(row => row[col]);

        let workingSignal = signal.slice();

        const ma = params.windowWidth || 40;
        const tfa = (params.threshold || 1.4) * 100;

        for (let i = 1; i <= 100; i++) {
            const adaptiveWin = ma + (ma / 100) * 4 * Math.pow(10 - Math.sqrt(i), 0.5);
            const adaptiveThresh = tfa / 100 + (tfa / 100) * 4 * Math.pow(10 - Math.sqrt(i), 0.5) / 100;

            const result = filloutliers(
                new Float64Array(workingSignal),
                params.fillMethod || 'nearest',
                params.detectionMethod || 'movmean',
                {
                    thresholdFactor: adaptiveThresh,
                    windowLength: Math.round(adaptiveWin)
                }
            );

            workingSignal = Array.from(result.cleanedData);
        }

        // Update cleaned data
        for (let row = 0; row < data.length; row++) {
            cleaned[row][col] = workingSignal[row];
        }
    }

    return cleaned;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique job ID
 */
function generateJobId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Parse ASCII data file content
 */
function parseFileContent(content) {
    const lines = content.split('\n');
    const data = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip comments and empty lines
        if (line === '' || line.startsWith('#') || line.startsWith('%')) {
            continue;
        }

        const values = line.split(/[\s,]+/).map(v => {
            const num = parseFloat(v);
            return isNaN(num) ? null : num;
        });

        // Filter out NaN values and ensure we have data
        const validValues = values.filter(v => v !== null);
        if (validValues.length > 0) {
            data.push(validValues);
        }
    }

    return data;
}

/**
 * Format data for export
 */
function formatForExport(data, options) {
    const {
        includeTime = true,
        includeValidityFlag = false,
        onlyValid = false
    } = options;

    let output = '';

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        let line = '';

        if (includeTime && row.length > 1) {
            // Assume first column is time
            line += row[0].toFixed(6) + '\t';
            const signalData = row.slice(1);
            line += signalData.map(v => v.toFixed(6)).join('\t');
        } else {
            line += row.map(v => v.toFixed(6)).join('\t');
        }

        output += line + '\n';
    }

    return output;
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export utility for saving processed data
 */
const ExportUtils = {
    /**
     * Prepare data for download
     */
    prepareDownload(data, filename, options) {
        const content = formatForExport(data, options);
        return {
            filename: filename || 'cleaned_data.txt',
            content: content,
            mimeType: 'text/plain'
        };
    },

    /**
     * Create blob from prepared data
     */
    createBlob(data) {
        return new Blob([data.content], { type: data.mimeType });
    }
};

// Export for use in worker
self.ExportUtils = ExportUtils;
