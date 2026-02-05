/**
 * metrics.js - Quality metrics for outlier cleaning evaluation
 * Ported from MATLAB metrics calculations
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Compute mean of an array
 */
function mean(data) {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
}

/**
 * Compute standard deviation
 */
function std(data) {
    const m = mean(data);
    const variance = data.reduce((sum, val) => sum + (val - m) ** 2, 0) / data.length;
    return Math.sqrt(variance);
}

/**
 * Compute variance
 */
function variance(data) {
    const m = mean(data);
    return data.reduce((sum, val) => sum + (val - m) ** 2, 0) / data.length;
}

/**
 * Compute first difference
 */
function diff(data) {
    return data.slice(1).map((val, i) => val - data[i]);
}

/**
 * Count non-zero elements
 */
function nnz(data) {
    return data.filter(x => Math.abs(x) > 1e-10).length;
}

/**
 * Normalize array to range [0, 1]
 */
function normalizeRange(data) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    if (Math.abs(range) < 1e-10) return data.map(() => 0);
    return data.map(x => (x - min) / range);
}

/**
 * Flatten 2D array to 1D
 */
function flatten2D(data2D) {
    const result = [];
    for (let col = 0; col < data2D[0].length; col++) {
        for (let row = 0; row < data2D.length; row++) {
            result.push(data2D[row][col]);
        }
    }
    return result;
}

// ============================================================================
// SIGNAL ANALYSIS FOR OPTIMIZATION
// ============================================================================

/**
 * Analyze signal noise by splitting into chunks
 * @param {Float64Array} signal - Input signal
 * @param {number} chunkSize - Size of each chunk (default: 25)
 * @returns {object} {chunks: [], noiseLevels: []}
 */
function analyzeSignalNoise(signal, chunkSize = 25) {
    const chunks = [];
    const noiseLevels = [];

    // Split signal into chunks
    for (let i = 0; i < signal.length; i += chunkSize) {
        const end = Math.min(i + chunkSize, signal.length);
        const chunk = signal.slice(i, end);

        chunks.push({
            index: chunks.length,
            start: i,
            end: end,
            data: chunk,
            length: chunk.length
        });

        // Calculate variance (noise level)
        const mean = chunk.reduce((a, b) => a + b) / chunk.length;
        const variance = chunk.reduce((sum, val) => sum + (val - mean) ** 2, 0) / chunk.length;
        const stdDev = Math.sqrt(variance);

        noiseLevels.push({
            chunkIndex: chunks.length - 1,
            variance: variance,
            stdDev: stdDev,
            mean: mean
        });
    }

    // Sort by noise level (variance) - descending (noisiest first)
    const sortedNoise = [...noiseLevels].sort((a, b) => b.variance - a.variance);

    return {
        chunks: chunks,
        noiseLevels: sortedNoise
    };
}

/**
 * Select representative chunks for optimization
 * @param {object} analysis - Result from analyzeSignalNoise
 * @param {number} numChunks - Number of chunks to select (default: 3)
 * @returns {Array} Array of selected chunks
 */
function selectRepresentativeChunks(analysis, numChunks = 3) {
    const { chunks, noiseLevels } = analysis;

    if (numChunks <= 0 || numChunks > chunks.length) {
        return chunks;
    }

    const selected = [];
    const indices = new Set();

    // Strategy: distribute evenly across noise spectrum
    // 1 chunk from noisy third, 1 from middle third, 1 from clean third

    const third = Math.ceil(noiseLevels.length / 3);

    // Noisiest chunk (top third)
    const noisiestIdx = noiseLevels[0].chunkIndex;
    selected.push(chunks[noisiestIdx]);
    indices.add(noisiestIdx);

    if (numChunks >= 2) {
        // Middle noise chunk (middle third)
        const midIdx = Math.floor(noiseLevels.length / 2);
        const middleIdx = noiseLevels[midIdx].chunkIndex;
        if (!indices.has(middleIdx)) {
            selected.push(chunks[middleIdx]);
            indices.add(middleIdx);
        }
    }

    if (numChunks >= 3) {
        // Cleanest chunk (bottom third)
        const cleanIdx = noiseLevels[noiseLevels.length - 1].chunkIndex;
        if (!indices.has(cleanIdx)) {
            selected.push(chunks[cleanIdx]);
            indices.add(cleanIdx);
        }
    }

    // Additional chunks (evenly distributed)
    if (numChunks > 3) {
        const step = Math.floor(noiseLevels.length / numChunks);
        for (let i = 1; i < numChunks - 2; i++) {
            const idx = i * step;
            if (idx < noiseLevels.length) {
                const chunkIdx = noiseLevels[idx].chunkIndex;
                if (!indices.has(chunkIdx)) {
                    selected.push(chunks[chunkIdx]);
                    indices.add(chunkIdx);
                }
            }
        }
    }

    console.log(`[Worker] Выбрано ${selected.length} чанков из ${chunks.length}:`,
        selected.map(c => `индекс:${c.index}, позиция:${c.start}-${c.end}`));

    return selected;
}

// ============================================================================
// QUALITY METRICS
// ============================================================================

/**
 * Smoothness Metric (STDF)
 * Ratio of derivative peaks to total derivative samples
 * Lower values indicate smoother data
 */
function smoothnessMetric(data) {
    if (data.length < 2) return 0;

    const derivative = diff(data);
    const stdDev = std(derivative);
    const threshold = stdDev;

    // Count points above threshold (peaks)
    const peaks = nnz(derivative.map(d => d > threshold ? 1 : 0));
    const total = derivative.length;

    if (total === 0) return 0;
    return peaks / total;
}

/**
 * Deleted Fraction (DF)
 * Percentage of points that were changed during cleaning
 * Lower values indicate less modification of data
 */
function deletedFraction(original, cleaned) {
    if (original.length === 0) return 0;

    let changed = 0;
    for (let i = 0; i < original.length; i++) {
        if (Math.abs(original[i] - cleaned[i]) > 1e-10) {
            changed++;
        }
    }

    return changed / original.length;
}

/**
 * Signal-to-Noise Ratio (ASNR)
 * Logarithmic ratio of signal power to noise power
 * Higher values indicate better cleaning
 */
function signalToNoiseRatio(original, cleaned) {
    if (cleaned.length === 0) return -Infinity;

    const signalPower = cleaned.reduce((sum, v) => sum + v * v, 0);
    const noise = original.map((o, i) => o - cleaned[i]);
    const noisePower = noise.reduce((sum, n) => sum + n * n, 0);

    if (noisePower < 1e-10) return 100; // Very high SNR
    return 10 * Math.log10(signalPower / noisePower);
}

/**
 * Root Mean Square Error (ARMSE)
 * Square root of average squared differences
 * Lower values indicate better cleaning
 */
function rootMeanSquareError(original, cleaned) {
    if (original.length === 0) return Infinity;

    const sqError = original.reduce((sum, o, i) => {
        return sum + (o - cleaned[i]) ** 2;
    }, 0);

    return Math.sqrt(sqError / original.length);
}

/**
 * R-squared (Coefficient of Determination)
 * Proportion of variance explained by the model
 * Range: 0 to 1, higher is better
 */
function rSquared(original, cleaned) {
    if (original.length === 0 || original.length !== cleaned.length) return 0;

    // Use mean of ORIGINAL data (not cleaned)
    const meanOriginal = mean(original);

    // Residual sum of squares (difference between original and cleaned)
    const SS_res = original.reduce((sum, o, i) => {
        return sum + (o - cleaned[i]) ** 2;
    }, 0);

    // Total sum of squares (variance of original data)
    const SS_tot = original.reduce((sum, o) => {
        return sum + (o - meanOriginal) ** 2;
    }, 0);

    // Protect against division by zero
    if (Math.abs(SS_tot) < 1e-10) return 0;

    const r2 = 1 - SS_res / SS_tot;

    // Clamp to reasonable range [0, 1] (though R² can be negative)
    return r2;
}

/**
 * Pearson Correlation Coefficient (R_Pirs)
 * Linear correlation between original and cleaned data
 * Range: -1 to 1, values close to 1 indicate better preservation
 */
function pearsonCorrelation(x, y) {
    if (x.length === 0 || x.length !== y.length) return 0;

    const meanX = mean(x);
    const meanY = mean(y);

    // Covariance
    let cov = 0;
    for (let i = 0; i < x.length; i++) {
        cov += (x[i] - meanX) * (y[i] - meanY);
    }
    cov /= x.length;

    // Standard deviations
    const stdX = std(x);
    const stdY = std(y);

    if (stdX < 1e-10 || stdY < 1e-10) return 0;
    return cov / (stdX * stdY);
}

// ============================================================================
// MULTI-SERIES METRICS
// ============================================================================

/**
 * Compute all quality metrics for a single time series
 */
function computeAllMetricsSingle(original, cleaned) {
    return {
        STDF: smoothnessMetric(cleaned),
        DF: deletedFraction(original, cleaned),
        ASNR: signalToNoiseRatio(original, cleaned),
        ARMSE: rootMeanSquareError(original, cleaned),
        R_squared: rSquared(original, cleaned),
        R_Pirs: pearsonCorrelation(original, cleaned)
    };
}

/**
 * Compute quality metrics for multiple time series
 * Averages metrics across all series
 */
function computeAllMetricsMultiSeries(originalMatrix, cleanedMatrix) {
    if (originalMatrix.length === 0 || originalMatrix[0].length === 0) {
        return {
            STDF: 0,
            DF: 0,
            ASNR: -Infinity,
            ARMSE: Infinity,
            R_squared: 0,
            R_Pirs: 0
        };
    }

    const numSeries = originalMatrix[0].length;
    const metrics = {
        STDF: new Array(numSeries),
        DF: new Array(numSeries),
        ASNR: new Array(numSeries),
        ARMSE: new Array(numSeries),
        R_squared: new Array(numSeries),
        R_Pirs: new Array(numSeries)
    };

    // Compute metrics for each series
    for (let col = 0; col < numSeries; col++) {
        const original = originalMatrix.map(row => row[col]);
        const cleaned = cleanedMatrix.map(row => row[col]);

        metrics.STDF[col] = smoothnessMetric(cleaned);
        metrics.DF[col] = deletedFraction(original, cleaned);
        metrics.ASNR[col] = signalToNoiseRatio(original, cleaned);
        metrics.ARMSE[col] = rootMeanSquareError(original, cleaned);
        metrics.R_squared[col] = rSquared(original, cleaned);
        metrics.R_Pirs[col] = pearsonCorrelation(original, cleaned);
    }

    // Average across all series
    return {
        STDF: mean(metrics.STDF),
        DF: mean(metrics.DF),
        ASNR: mean(metrics.ASNR),
        ARMSE: mean(metrics.ARMSE),
        R_squared: mean(metrics.R_squared),
        R_Pirs: mean(metrics.R_Pirs)
    };
}

// ============================================================================
// MATRIX SMOOTHING (for auto-tuning)
// ============================================================================

/**
 * Smooth a matrix using 2D moving average
 * @param {Float64Array[]} matrix - 2D array to smooth
 * @param {number} radius - Smoothing radius (window size = 2*radius + 1)
 * @returns {Float64Array[]} Smoothed matrix
 */
function smoothMatrix(matrix, radius = 1) {
    console.log(`[smoothMatrix] Вход: ${matrix.length}x${matrix[0].length}, radius=${radius}`);
    const rows = matrix.length;
    const cols = matrix[0].length;

    // Create smoothed matrix (smaller by 2*radius in each dimension)
    const smoothed = [];
    const smoothedRows = rows - 2 * radius;
    const smoothedCols = cols - 2 * radius;

    console.log(`[smoothMatrix] Выходные размеры: ${smoothedRows}x${smoothedCols}`);

    if (smoothedRows <= 0 || smoothedCols <= 0) {
        console.log('[smoothMatrix] Размеры <= 0, возвращаю копию исходной матрицы');
        return matrix.map(row => [...row]);
    }

    for (let i = 0; i < smoothedRows; i++) {
        const row = [];
        for (let j = 0; j < smoothedCols; j++) {
            let sum = 0;
            let count = 0;

            // Average over window
            for (let di = 0; di <= 2 * radius; di++) {
                for (let dj = 0; dj <= 2 * radius; dj++) {
                    const ii = i + di;
                    const jj = j + dj;
                    if (ii >= 0 && ii < rows && jj >= 0 && jj < cols) {
                        sum += matrix[ii][jj];
                        count++;
                    }
                }
            }

            row.push(sum / count);
        }
        smoothed.push(row);
    }

    console.log(`[smoothMatrix] Возврат: ${smoothed.length}x${smoothed[0].length}`);
    return smoothed;
}

// ============================================================================
// AUTO-TUNING GRID SEARCH
// ============================================================================

/**
 * Perform grid search for optimal parameters
 * @param {Float64Array[]} originalData - Original data (matrix: rows=time, cols=series)
 * @param {object} params - Tuning parameters
 * @param {function} progressCallback - Callback for progress updates
 * @returns {object} { NTF, optimalParams, allMetrics }
 */
function performGridSearch(originalData, params, progressCallback) {
    console.log('[Worker] ========== START performGridSearch ==========');
    console.log('[Worker] Параметры:', params);

    var baseWindow = params.windowWidth || 40;
    var baseThreshold = params.threshold || 1.4;
    var matrixSize = params.matrixSize || 16;
    var step = params.relativeSize || 4;
    var fillMethod = params.fillMethod || 'nearest';
    var numChunks = params.numChunks || 3;
    var useChunks = params.useChunks !== false;

    console.log('[Worker] Распакованные параметры:', {
        baseWindow: baseWindow,
        baseThreshold: baseThreshold,
        matrixSize: matrixSize,
        step: step,
        fillMethod: fillMethod,
        numChunks: numChunks,
        useChunks: useChunks
    });

    // Convert threshold to thresholdFactor (multiply by 100 as in MATLAB)
    var threshFactor = baseThreshold * 100;

    var numSeries = originalData[0].length;
    var signalLength = originalData.length;

    console.log('[Worker] performGridSearch: серия=' + numSeries + ', точек=' + signalLength + ', чанков=' + numChunks + ', оптимизация=' + useChunks);

    // Check if optimization functions are available
    if (typeof analyzeSignalNoise !== 'function') {
        console.error('[Worker] ОШИБКА: analyzeSignalNoise не определена!');
        useChunks = false;
    }

    if (typeof selectRepresentativeChunks !== 'function') {
        console.error('[Worker] ОШИБКА: selectRepresentativeChunks не определена!');
        useChunks = false;
    }

    // Select representative chunks (optimization)
    var selectedChunks = [];

    if (useChunks) {
        // Analyze signal to select chunks (use first series for selection)
        var firstSeries = [];
        for (var idx = 0; idx < originalData.length; idx++) {
            firstSeries.push(originalData[idx][0]);
        }
        var analysis = analyzeSignalNoise(firstSeries, 25);
        selectedChunks = selectRepresentativeChunks(analysis, numChunks);

        console.log('[Worker] Выбрано ' + selectedChunks.length + ' чанков из ' + analysis.chunks.length + ' для оптимизации');
    }

    // Main loop: Execute TWICE (as in MATLAB)
    var finalNTF = null; // Store final NTF from second pass
    for (var d = step; d >= 1; d = (d === step ? 1 : 0)) {
        if (d === 0) break; // Exit after second pass

        var isFirstPass = d === step;
        var optimalWinWidth = 0;
        var optimalThreshFactor = 0;
        var phaseBaseProgress = isFirstPass ? 0 : 50; // First pass 0-50%, Second 50-100%

        // Initialize metric matrices for this pass
        var STDF = [];
        var DF = [];
        var ASNR = [];
        var ARMSE = [];
        var RSquared = [];
        var RPirs = [];

        for (var k = 0; k < matrixSize; k++) {
            STDF[k] = new Float64Array(matrixSize).fill(1);
            DF[k] = new Float64Array(matrixSize).fill(1);
            ASNR[k] = new Float64Array(matrixSize).fill(1);
            ARMSE[k] = new Float64Array(matrixSize).fill(1);
            RSquared[k] = new Float64Array(matrixSize).fill(1);
            RPirs[k] = new Float64Array(matrixSize).fill(1);
        }

        // Grid search for this pass
        for (var k = 0; k < matrixSize; k++) {
            // Update progress (0-50% for first pass, 50-100% for second)
            var progress = phaseBaseProgress + 50 * (k + 1) / matrixSize;
            if (progressCallback) {
                progressCallback({
                    progress: progress,
                    message: 'Сканирование параметров (проход ' + (isFirstPass ? 1 : 2) + '): окно ' + (k + 1) + '/' + matrixSize
                });
            }

            var currentWindow;
            if (d === 1) {
                // Second pass: center around optimal values from first pass
                currentWindow = baseWindow + (k - (matrixSize + 1) / 2);
            } else {
                currentWindow = Math.abs(baseWindow + (matrixSize * d / 2) - (k * d) - 1) + 1;
            }

            for (var j = 0; j < matrixSize; j++) {
                // Recalculate threshold inside inner loop as in MATLAB (line 157)
                var currentThresholdInner;
                if (d === 1) {
                    // Second pass: center around optimal values from first pass
                    currentThresholdInner = (threshFactor + (j - (matrixSize + 1) / 2)) / 100;
                } else {
                    currentThresholdInner = (threshFactor + (matrixSize * d / 2) - d * j) / 100;
                }

                // Process each series and compute metrics
                var sumSTDF = 0, sumDF = 0, sumASNR = 0, sumARMSE = 0, sumRSquared = 0, sumRPirs = 0;
                var metricCount = 0;

                for (var col = 0; col < numSeries; col++) {
                    var original = [];
                    for (var rowIdx = 0; rowIdx < originalData.length; rowIdx++) {
                        original.push(originalData[rowIdx][col]);
                    }

                    if (useChunks && selectedChunks.length > 0) {
                        // Process only selected chunks (optimization)
                        for (var chunkIdx = 0; chunkIdx < selectedChunks.length; chunkIdx++) {
                            var chunk = selectedChunks[chunkIdx];
                            var chunkOriginal = original.slice(chunk.start, chunk.end);
                            var chunkData = chunkOriginal.slice(); // Copy for this iteration

                            // Run cleaning iterations (100 passes)
                            for (var iter = 0; iter < 100; iter++) {
                                var adaptiveWin = currentWindow + (baseWindow / 100) * 4 * Math.pow(10 - Math.sqrt(iter + 1), 0.5);
                                var adaptiveThresh = currentThresholdInner + (threshFactor / 100) * 4 * Math.pow(10 - Math.sqrt(iter + 1), 0.5) / 100;

                                var result = filloutliers(
                                    new Float64Array(chunkData),
                                    fillMethod,
                                    'movmean',
                                    {
                                        thresholdFactor: adaptiveThresh,
                                        windowLength: Math.round(adaptiveWin)
                                    }
                                );
                                chunkData = Array.from(result.cleanedData);
                            }

                            // Compute metrics for this chunk
                            sumSTDF += smoothnessMetric(chunkData);
                            sumDF += deletedFraction(chunkOriginal, chunkData);
                            sumASNR += signalToNoiseRatio(chunkOriginal, chunkData);
                            sumARMSE += rootMeanSquareError(chunkOriginal, chunkData);
                            sumRSquared += rSquared(chunkOriginal, chunkData);
                            sumRPirs += pearsonCorrelation(chunkOriginal, chunkData);
                            metricCount++;
                        }
                    } else {
                        // Process entire signal (no optimization)
                        var data = original.slice(); // Copy original for this iteration

                        // Run cleaning iterations (100 passes)
                        for (var iter = 0; iter < 100; iter++) {
                            var adaptiveWin = currentWindow + (baseWindow / 100) * 4 * Math.pow(10 - Math.sqrt(iter + 1), 0.5);
                            var adaptiveThresh = currentThresholdInner + (threshFactor / 100) * 4 * Math.pow(10 - Math.sqrt(iter + 1), 0.5) / 100;

                            var result = filloutliers(
                                new Float64Array(data),
                                fillMethod,
                                'movmean',
                                {
                                    thresholdFactor: adaptiveThresh,
                                    windowLength: Math.round(adaptiveWin)
                                }
                            );
                            data = Array.from(result.cleanedData);
                        }

                        // Compute metrics for entire signal
                        sumSTDF += smoothnessMetric(data);
                        sumDF += deletedFraction(original, data);
                        sumASNR += signalToNoiseRatio(original, data);
                        sumARMSE += rootMeanSquareError(original, data);
                        sumRSquared += rSquared(original, data);
                        sumRPirs += pearsonCorrelation(original, data);
                        metricCount++;
                    }
                }

                // Average metrics (across series and chunks)
                if (metricCount > 0) {
                    STDF[k][j] = sumSTDF / metricCount;
                    DF[k][j] = sumDF / metricCount;
                    ASNR[k][j] = sumASNR / metricCount;
                    ARMSE[k][j] = sumARMSE / metricCount;
                    RSquared[k][j] = sumRSquared / metricCount;
                    RPirs[k][j] = sumRPirs / metricCount;
                }
            }
        }

        // --- NORMALIZATION AND COMBINATION ---
        // As in MATLAB: normalize(ASNR - ARMSE + R² + R_Pirs + STDF + DF, 'range')
        // Note: ASNR is SUBTRACTED (higher is better)
        // ARMSE is SUBTRACTED (lower is better)
        // Others are ADDED

        // Helper: normalize matrix to range
        const normalizeMatrix = (matrix) => {
            const rows = matrix.length;
            const cols = matrix[0].length;
            const result = [];

            // Find min/max
            let minVal = Infinity;
            let maxVal = -Infinity;
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    minVal = Math.min(minVal, matrix[i][j]);
                    maxVal = Math.max(maxVal, matrix[i][j]);
                }
            }

            const range = maxVal - minVal;
            if (Math.abs(range) < 1e-10) {
                // Return matrix filled with 0.5 if range is too small (middle of range)
                for (let i = 0; i < rows; i++) {
                    result[i] = new Float64Array(cols).fill(0.5);
                }
                return result;
            }

            // Normalize
            for (let i = 0; i < rows; i++) {
                result[i] = new Float64Array(cols);
                for (let j = 0; j < cols; j++) {
                    result[i][j] = (matrix[i][j] - minVal) / range;
                }
            }

            return result;
        };

        // Debug: Check metric matrices before normalization
        console.log('[Worker] Матрицы перед нормализацией: ASNR=' + (ASNR ? ASNR.length : 'null') + 'x' + (ASNR && ASNR[0] ? ASNR[0].length : '?') +
                    ', ARMSE=' + (ARMSE ? ARMSE.length : 'null') + 'x' + (ARMSE && ARMSE[0] ? ARMSE[0].length : '?') +
                    ', RSquared=' + (RSquared ? RSquared.length : 'null') + 'x' + (RSquared && RSquared[0] ? RSquared[0].length : '?'));

        // Initialize variables that may be used outside try block
        var optimal = null;
        var logThreshold = threshFactor / 100;

        try {
            var normASNR = normalizeMatrix(ASNR);
            var normARMSE = normalizeMatrix(ARMSE);
            var normRSquared = normalizeMatrix(RSquared);
            var normRPirs = normalizeMatrix(RPirs);
            var normSTDF = normalizeMatrix(STDF);
            var normDF = normalizeMatrix(DF);

            // Combine metrics: ASNR - ARMSE + R² + R_Pirs + STDF + DF
            var combined = [];
            for (var i = 0; i < matrixSize; i++) {
                combined[i] = new Float64Array(matrixSize);
                for (var j = 0; j < matrixSize; j++) {
                    combined[i][j] = normASNR[i][j] - normARMSE[i][j] +
                                       normRSquared[i][j] + normRPirs[i][j] +
                                       normSTDF[i][j] + normDF[i][j];
                }
            }

            // Final normalization of NTF
            var NTF = normalizeMatrix(combined);

            console.log('[Worker] NTF создана: ' + NTF.length + 'x' + NTF[0].length);

            // --- SMOOTHING BEFORE FINDING MINIMUM ---
            // Smooth NTF (3x3 moving average, radius = 1)
            var smoothedNTF = smoothMatrix(NTF, 1);

            console.log('[Worker] NTF smoothed: rows=' + (smoothedNTF ? smoothedNTF.length : 0) + ', cols=' + (smoothedNTF && smoothedNTF[0] ? smoothedNTF[0].length : 0) + ', pass=' + (isFirstPass ? 1 : 2));

            // Store NTF from second pass for display
            if (!isFirstPass) {
                finalNTF = smoothedNTF;
                console.log('[Worker] finalNTF сохранена из второго прохода:', finalNTF ? finalNTF.length : 'null');
            }

            // --- FIND OPTIMAL PARAMETERS ---
            optimal = findOptimalParamsFromMatrix(smoothedNTF, baseWindow, threshFactor, matrixSize, d);

            // Update base parameters for next iteration
            if (d === 1) {
                // Second pass: restore optimal values from first pass
                baseWindow = optimalWinWidth;
                threshFactor = optimalThreshFactor;
            } else {
                // First pass: compute and save optimal values
                baseWindow = optimal.windowWidth;
                threshFactor = optimal.thresholdFactor;
                optimalWinWidth = baseWindow;
                optimalThreshFactor = threshFactor;
            }

            // Log optimal parameters after this pass
            logThreshold = threshFactor / 100;
            console.log('[Worker] Проход ' + (isFirstPass ? 1 : 2) + ': окно=' + optimal.windowWidth.toFixed(0) + ', порог=' + logThreshold.toFixed(2) + ', minI=' + optimal.minI + ', minJ=' + optimal.minJ);
            console.log('[Worker] Отладка: исходные baseWindow=' + (isFirstPass ? 40 : 'из 1-го прохода') + ', threshFactor=' + (isFirstPass ? 140 : 'из 1-го прохода') + ', после обновления: windowWidth=' + optimal.windowWidth.toFixed(0) + ', newThreshFactor=' + optimal.thresholdFactor.toFixed(0));
        } catch (error) {
            console.error('[Worker] ОШИБКА при создании NTF:', error);
            console.error('[Worker] Stack trace:', error.stack);
            console.error('[Worker] ASNR:', ASNR ? ASNR.length + 'x' + (ASNR[0] ? ASNR[0].length : '?') : 'null');
            console.error('[Worker] ARMSE:', ARMSE ? ARMSE.length + 'x' + (ARMSE[0] ? ARMSE[0].length : '?') : 'null');
            console.error('[Worker] RSquared:', RSquared ? RSquared.length + 'x' + (RSquared[0] ? RSquared[0].length : '?') : 'null');
            console.error('[Worker] RPirs:', RPirs ? RPirs.length + 'x' + (RPirs[0] ? RPirs[0].length : '?') : 'null');
            console.error('[Worker] STDF:', STDF ? STDF.length + 'x' + (STDF[0] ? STDF[0].length : '?') : 'null');
            console.error('[Worker] DF:', DF ? DF.length + 'x' + (DF[0] ? DF[0].length : '?') : 'null');
        }

        if (progressCallback && isFirstPass && optimal) {
            progressCallback({
                progress: 50,
                message: 'Первый проход: окно=' + optimal.windowWidth.toFixed(0) + ', порог=' + logThreshold.toFixed(2)
            });
        }

        if (!isFirstPass) {
            // After second pass, send final progress update
            if (progressCallback && optimal) {
                progressCallback({
                    progress: 100,
                    message: 'Второй проход: окно=' + optimal.windowWidth.toFixed(0) + ', порог=' + logThreshold.toFixed(2)
                });
            }
        }
    }

    // Final result: convert thresholdFactor back to threshold
    console.log('[Worker] Финальные параметры: окно=' + baseWindow.toFixed(0) + ', порог=' + (threshFactor / 100).toFixed(2));
    console.log('[Worker] finalNTF перед возвратом:', finalNTF ? (finalNTF.length + 'x' + finalNTF[0].length) : 'null');

    return {
        NTF: finalNTF, // Return NTF from second pass for heatmap display
        optimalParams: { windowWidth: baseWindow, threshold: threshFactor / 100 },
        allMetrics: null // Only needed for MATLAB
    };
}

/**
 * Find optimal parameters from NTF matrix
 */
function findOptimalParamsFromMatrix(NTF, baseWindow, threshFactor, matrixSize, step) {
    const rows = NTF.length;
    const cols = NTF[0].length;

    // Find minimum NTF position
    let minNTF = Infinity;
    let minI = 0, minJ = 0;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (NTF[i][j] < minNTF) {
                minNTF = NTF[i][j];
                minI = i;
                minJ = j;
            }
        }
    }

    // Recalculate windowWidth and threshFactor based on found indices (as in MATLAB)
    // Line 233-234 MATLAB:
    // winWidth = abs(winWidth + (matrixSize * d / 2) - (IminNTF_k * d) - 1) + 1;
    // threshFactor = abs(threshFactor + (matrixSize * d / 2) - (d * IminNTF_j) - 1) + 1;

    const windowWidth = Math.abs(baseWindow + (matrixSize * step / 2) - (minI * step) - 1) + 1;
    const newThreshFactor = Math.abs(threshFactor + (matrixSize * step / 2) - (step * minJ) - 1) + 1;

    return {
        windowWidth: windowWidth,
        thresholdFactor: newThreshFactor,
        threshold: newThreshFactor / 100, // For display
        minNTF: minNTF,
        minI: minI,
        minJ: minJ
    };
}
