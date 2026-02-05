/**
 * filloutliers.js - Outlier detection and replacement algorithms
 * Ported from MATLAB's filloutliers function
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Compute median of an array
 */
function median(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

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
 * Compute quantile (0-1 range)
 */
function quantile(data, q) {
    const sorted = [...data].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
}

/**
 * Scaled Median Absolute Deviation
 * mad = K * median(|data - median(data)|) where K ≈ 1.4826
 */
function scaledMAD(data) {
    const m = median(data);
    const absDeviations = data.map(x => Math.abs(x - m));
    const mad = median(absDeviations);
    return 1.4826 * mad;
}

/**
 * Interquartile Range
 */
function iqr(data) {
    return quantile(data, 0.75) - quantile(data, 0.25);
}

/**
 * Count non-zero elements
 */
function nnz(data) {
    return data.filter(x => x !== 0).length;
}

/**
 * Compute first difference
 */
function diff(data) {
    return data.slice(1).map((val, i) => val - data[i]);
}

/**
 * Normalize array to range [0, 1]
 */
function normalizeRange(data) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    if (range === 0) return data.map(() => 0);
    return data.map(x => (x - min) / range);
}

// ============================================================================
// OUTLIER DETECTION METHODS
// ============================================================================

/**
 * Detect outliers using median method (default)
 * Outliers are > 3 scaled MAD from median
 */
function detectOutliers_median(data, thresholdFactor = 3) {
    const center = median(data);
    const mad = scaledMAD(data);
    const lowerThreshold = center - thresholdFactor * mad;
    const upperThreshold = center + thresholdFactor * mad;

    const outlierMask = new Int8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        outlierMask[i] = (data[i] < lowerThreshold || data[i] > upperThreshold) ? 1 : 0;
    }

    return {
        mask: outlierMask,
        lthresh: lowerThreshold,
        uthresh: upperThreshold,
        center: center
    };
}

/**
 * Detect outliers using mean method (3-sigma rule)
 * Outliers are > 3 standard deviations from mean
 */
function detectOutliers_mean(data, thresholdFactor = 3) {
    const center = mean(data);
    const sd = std(data);
    const lowerThreshold = center - thresholdFactor * sd;
    const upperThreshold = center + thresholdFactor * sd;

    const outlierMask = new Int8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        outlierMask[i] = (data[i] < lowerThreshold || data[i] > upperThreshold) ? 1 : 0;
    }

    return {
        mask: outlierMask,
        lthresh: lowerThreshold,
        uthresh: upperThreshold,
        center: center
    };
}

/**
 * Detect outliers using quartiles (IQR method)
 * Outliers are > 1.5 IQR from quartiles
 */
function detectOutliers_quartiles(data, thresholdFactor = 1.5) {
    const q1 = quantile(data, 0.25);
    const q3 = quantile(data, 0.75);
    const iqrValue = iqr(data);
    const lowerThreshold = q1 - thresholdFactor * iqrValue;
    const upperThreshold = q3 + thresholdFactor * iqrValue;
    const center = (q1 + q3) / 2;

    const outlierMask = new Int8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        outlierMask[i] = (data[i] < lowerThreshold || data[i] > upperThreshold) ? 1 : 0;
    }

    return {
        mask: outlierMask,
        lthresh: lowerThreshold,
        uthresh: upperThreshold,
        center: center
    };
}

/**
 * Grubbs' test for outliers (iterative)
 * Assumes normal distribution
 */
function detectOutliers_grubbs(data, alpha = 0.05, maxOutliers = Math.ceil(data.length * 0.1)) {
    let workingData = [...data];
    const outlierMask = new Int8Array(data.length).fill(0);
    let iteration = 0;
    let numOutliers = 0;

    while (iteration < maxOutliers) {
        iteration++;

        const m = mean(workingData);
        const s = std(workingData);

        // Find point farthest from mean
        let maxDev = 0;
        let maxIdx = 0;
        for (let i = 0; i < workingData.length; i++) {
            const dev = Math.abs(workingData[i] - m);
            if (dev > maxDev) {
                maxDev = dev;
                maxIdx = i;
            }
        }

        const G = maxDev / s;

        // Critical value from t-distribution (simplified)
        const n = workingData.length;
        const tCritical = tDistributionCritical(alpha / (2 * n), n - 2);
        const criticalValue = ((n - 1) / Math.sqrt(n)) *
            Math.sqrt(tCritical ** 2 / (n - 2 + tCritical ** 2));

        if (G > criticalValue) {
            // Find original index
            let originalIdx = -1;
            let found = 0;
            for (let i = 0; i < data.length; i++) {
                if (outlierMask[i] === 0 && Math.abs(data[i] - workingData[maxIdx]) < 1e-10) {
                    originalIdx = i;
                    break;
                }
            }

            if (originalIdx >= 0) {
                outlierMask[originalIdx] = 1;
                numOutliers++;
                workingData.splice(maxIdx, 1);
            } else {
                break;
            }
        } else {
            break;
        }

        if (workingData.length < 3) break;
    }

    const center = mean(data);
    const mad = scaledMAD(data);

    return {
        mask: outlierMask,
        lthresh: center - 3 * mad,
        uthresh: center + 3 * mad,
        center: center
    };
}

/**
 * Generalized ESD test for outliers
 * Better handles multiple masked outliers than Grubbs
 */
function detectOutliers_gesd(data, alpha = 0.05, maxOutliers = Math.ceil(data.length * 0.1)) {
    let workingData = [...data];
    const outlierMask = new Int8Array(data.length).fill(0);
    const R = [];
    const n = data.length;

    // Compute R values for all potential outliers
    for (let k = 1; k <= maxOutliers && workingData.length >= 3; k++) {
        const m = mean(workingData);
        const s = std(workingData);

        let maxDev = 0;
        let maxIdx = 0;
        for (let i = 0; i < workingData.length; i++) {
            const dev = Math.abs(workingData[i] - m);
            if (dev > maxDev) {
                maxDev = dev;
                maxIdx = i;
            }
        }

        R[k - 1] = maxDev / s;
        workingData.splice(maxIdx, 1);
    }

    // Find number of outliers
    workingData = [...data];
    let numOutliers = 0;

    for (let k = maxOutliers; k >= 1; k--) {
        const p = 1 - alpha / (2 * (n - k + 1));
        const tCritical = tDistributionCritical(p, n - k - 1);
        const lambda = ((n - k) * tCritical) /
            Math.sqrt((n - k - 1 + tCritical ** 2) * (n - k + 1));

        if (R[k - 1] > lambda) {
            numOutliers = k;
            break;
        }
    }

    // Mark outliers
    for (let iter = 0; iter < numOutliers; iter++) {
        const m = mean(workingData);
        const s = std(workingData);

        let maxDev = 0;
        let maxIdx = 0;
        for (let i = 0; i < workingData.length; i++) {
            const dev = Math.abs(workingData[i] - m);
            if (dev > maxDev) {
                maxDev = dev;
                maxIdx = i;
            }
        }

        // Find original index
        for (let i = 0; i < data.length; i++) {
            if (outlierMask[i] === 0 && Math.abs(data[i] - workingData[maxIdx]) < 1e-10) {
                outlierMask[i] = 1;
                break;
            }
        }

        workingData.splice(maxIdx, 1);
    }

    const center = mean(data);
    const mad = scaledMAD(data);

    return {
        mask: outlierMask,
        lthresh: center - 3 * mad,
        uthresh: center + 3 * mad,
        center: center
    };
}

/**
 * Detect outliers using moving median method
 * Contextual outliers in sliding window
 */
function detectOutliers_movmedian(data, windowLength, thresholdFactor = 3) {
    const n = data.length;
    const outlierMask = new Int8Array(n);
    const lthresh = new Float64Array(n);
    const uthresh = new Float64Array(n);
    const center = new Float64Array(n);

    const halfWindow = Math.floor(windowLength / 2);

    for (let i = 0; i < n; i++) {
        const start = Math.max(0, i - halfWindow);
        const end = Math.min(n, i + halfWindow + 1);
        const window = data.slice(start, end);

        const localMedian = median(window);
        const localMad = scaledMAD(window);

        lthresh[i] = localMedian - thresholdFactor * localMad;
        uthresh[i] = localMedian + thresholdFactor * localMad;
        center[i] = localMedian;

        outlierMask[i] = (data[i] < lthresh[i] || data[i] > uthresh[i]) ? 1 : 0;
    }

    return { mask: outlierMask, lthresh, uthresh, center };
}

/**
 * Detect outliers using moving mean method
 * Contextual outliers in sliding window
 */
function detectOutliers_movmean(data, windowLength, thresholdFactor = 3) {
    const n = data.length;
    const outlierMask = new Int8Array(n);
    const lthresh = new Float64Array(n);
    const uthresh = new Float64Array(n);
    const center = new Float64Array(n);

    const halfWindow = Math.floor(windowLength / 2);

    for (let i = 0; i < n; i++) {
        const start = Math.max(0, i - halfWindow);
        const end = Math.min(n, i + halfWindow + 1);
        const window = data.slice(start, end);

        const localMean = mean(window);
        const localStd = std(window);

        lthresh[i] = localMean - thresholdFactor * localStd;
        uthresh[i] = localMean + thresholdFactor * localStd;
        center[i] = localMean;

        outlierMask[i] = (data[i] < lthresh[i] || data[i] > uthresh[i]) ? 1 : 0;
    }

    return { mask: outlierMask, lthresh, uthresh, center };
}

/**
 * Student's t-distribution critical value approximation
 * Using inverse of t-distribution CDF
 */
function tDistributionCritical(p, degreesOfFreedom) {
    // Wilson-Hilferty approximation
    const z = normalCritical(p);
    const a = 4 / degreesOfFreedom;
    const b = 5 + degreesOfFreedom;
    return z * Math.sqrt(degreesOfFreedom / b) * (1 - (z ** 2 + 1) / (4 * b));
}

/**
 * Standard normal critical value (inverse of CDF)
 * Using Abramowitz and Stegun approximation
 */
function normalCritical(p) {
    if (p <= 0 || p >= 1) return 0;

    const t = Math.sqrt(-2 * Math.log(Math.min(p, 1 - p)));
    const c0 = 2.515517;
    const c1 = 0.802853;
    const c2 = 0.010328;
    const d1 = 1.432788;
    const d2 = 0.189269;
    const d3 = 0.001308;

    const sign = p > 0.5 ? 1 : -1;
    const num = c0 + c1 * t + c2 * t * t;
    const den = 1 + d1 * t + d2 * t * t + d3 * t * t * t;

    return sign * (t - num / den);
}

// ============================================================================
// FILL METHODS
// ============================================================================

/**
 * Fill with extreme value (999999999) - for marking outliers
 */
function fillWith_extreme(data, outlierMask) {
    const result = new Float64Array(data.length);
    const extremeValue = 999999999;

    for (let i = 0; i < data.length; i++) {
        result[i] = outlierMask[i] ? extremeValue : data[i];
    }

    return result;
}

/**
 * Fill with center value (median/mean)
 */
function fillWith_center(data, outlierMask, center) {
    const result = new Float64Array(data.length);

    for (let i = 0; i < data.length; i++) {
        result[i] = outlierMask[i] ? center : data[i];
    }

    return result;
}

/**
 * Fill with clipping to thresholds
 */
function fillWith_clip(data, outlierMask, lthresh, uthresh) {
    const result = new Float64Array(data.length);

    for (let i = 0; i < data.length; i++) {
        if (outlierMask[i]) {
            result[i] = data[i] < lthresh ? lthresh : uthresh;
        } else {
            result[i] = data[i];
        }
    }

    return result;
}

/**
 * Fill with previous non-outlier value
 */
function fillWith_previous(data, outlierMask) {
    const result = new Float64Array(data.length);
    let lastValid = data[0];

    for (let i = 0; i < data.length; i++) {
        if (outlierMask[i]) {
            result[i] = lastValid;
        } else {
            result[i] = data[i];
            lastValid = data[i];
        }
    }

    return result;
}

/**
 * Fill with next non-outlier value
 */
function fillWith_next(data, outlierMask) {
    const result = new Float64Array(data.length);
    let nextValid = data[data.length - 1];

    for (let i = data.length - 1; i >= 0; i--) {
        if (outlierMask[i]) {
            result[i] = nextValid;
        } else {
            result[i] = data[i];
            nextValid = data[i];
        }
    }

    return result;
}

/**
 * Fill with nearest non-outlier value
 */
function fillWith_nearest(data, outlierMask) {
    const result = new Float64Array(data.length);
    const n = data.length;

    for (let i = 0; i < n; i++) {
        if (outlierMask[i]) {
            // Search backward
            let prevDist = Infinity;
            let prevValue = data[i];
            for (let j = i - 1; j >= 0; j--) {
                if (!outlierMask[j]) {
                    prevDist = i - j;
                    prevValue = data[j];
                    break;
                }
            }

            // Search forward
            let nextDist = Infinity;
            let nextValue = data[i];
            for (let j = i + 1; j < n; j++) {
                if (!outlierMask[j]) {
                    nextDist = j - i;
                    nextValue = data[j];
                    break;
                }
            }

            result[i] = prevDist <= nextDist ? prevValue : nextValue;
        } else {
            result[i] = data[i];
        }
    }

    return result;
}

/**
 * Fill with linear interpolation
 */
function fillWith_linear(data, outlierMask) {
    const result = new Float64Array(data.length);
    const n = data.length;

    // Find valid points
    const validIndices = [];
    const validValues = [];
    for (let i = 0; i < n; i++) {
        if (!outlierMask[i]) {
            validIndices.push(i);
            validValues.push(data[i]);
        }
    }

    // No valid points
    if (validIndices.length === 0) {
        return result.fill(0);
    }

    // Copy valid points
    for (let idx = 0; idx < validIndices.length; idx++) {
        result[validIndices[idx]] = validValues[idx];
    }

    // Interpolate between valid points
    for (let k = 0; k < validIndices.length - 1; k++) {
        const i1 = validIndices[k];
        const i2 = validIndices[k + 1];
        const v1 = validValues[k];
        const v2 = validValues[k + 1];

        for (let i = i1 + 1; i < i2; i++) {
            const t = (i - i1) / (i2 - i1);
            result[i] = v1 + t * (v2 - v1);
        }
    }

    // Extrapolate at edges
    if (validIndices[0] > 0) {
        const v = validValues[0];
        for (let i = 0; i < validIndices[0]; i++) {
            result[i] = v;
        }
    }

    if (validIndices[validIndices.length - 1] < n - 1) {
        const v = validValues[validIndices.length - 1];
        for (let i = validIndices[validIndices.length - 1] + 1; i < n; i++) {
            result[i] = v;
        }
    }

    return result;
}

/**
 * Fill with cubic spline interpolation
 * Using natural spline implementation
 */
function fillWith_spline(data, outlierMask) {
    const result = new Float64Array(data.length);
    const n = data.length;

    // Find valid points
    const validIndices = [];
    const validValues = [];
    for (let i = 0; i < n; i++) {
        if (!outlierMask[i]) {
            validIndices.push(i);
            validValues.push(data[i]);
        }
    }

    // No valid points
    if (validIndices.length === 0) {
        return result.fill(0);
    }

    // Copy valid points
    for (let idx = 0; idx < validIndices.length; idx++) {
        result[validIndices[idx]] = validValues[idx];
    }

    // Need at least 4 points for cubic spline
    if (validIndices.length < 4) {
        return fillWith_linear(data, outlierMask);
    }

    // Compute spline coefficients (natural spline)
    const m = validIndices.length - 1;
    const h = [];
    const alpha = [];
    const l = new Array(m + 1).fill(1);
    const mu = new Array(m + 1).fill(0);
    const z = new Array(m + 1).fill(0);
    const c = new Array(m + 1).fill(0);
    const b = new Array(m).fill(0);
    const d = new Array(m).fill(0);

    for (let i = 0; i < m; i++) {
        h[i] = validIndices[i + 1] - validIndices[i];
    }

    for (let i = 1; i < m; i++) {
        alpha[i] = (3 / h[i]) * (validValues[i + 1] - validValues[i]) -
                   (3 / h[i - 1]) * (validValues[i] - validValues[i - 1]);
    }

    for (let i = 1; i < m; i++) {
        l[i] = 2 * (validIndices[i + 1] - validIndices[i - 1]) - h[i - 1] * mu[i];
        mu[i] = h[i] / l[i];
        z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
    }

    for (let j = m - 1; j >= 0; j--) {
        c[j] = z[j] - mu[j] * c[j + 1];
        b[j] = (validValues[j + 1] - validValues[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
        d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
    }

    // Interpolate between valid points
    for (let k = 0; k < m; k++) {
        const x1 = validIndices[k];
        const x2 = validIndices[k + 1];
        for (let i = x1 + 1; i < x2; i++) {
            const dx = i - x1;
            result[i] = validValues[k] + b[k] * dx + c[k] * dx * dx + d[k] * dx * dx * dx;
        }
    }

    // Extrapolate at edges
    if (validIndices[0] > 0) {
        const dx = validIndices[1] - validIndices[0];
        for (let i = 0; i < validIndices[0]; i++) {
            const dist = validIndices[0] - i;
            result[i] = validValues[0] - b[0] * dist - c[0] * dist * dist - d[0] * dist * dist * dist;
        }
    }

    if (validIndices[m] < n - 1) {
        const dx = validIndices[m] - validIndices[m - 1];
        for (let i = validIndices[m] + 1; i < n; i++) {
            const dist = i - validIndices[m];
            result[i] = validValues[m] + b[m - 1] * dist + c[m] * dist * dist + d[m - 1] * dist * dist * dist;
        }
    }

    return result;
}

/**
 * Fill with PCHIP (Piecewise Cubic Hermite Interpolating Polynomial)
 * Shape-preserving interpolation
 */
function fillWith_pchip(data, outlierMask) {
    const result = new Float64Array(data.length);
    const n = data.length;

    // Find valid points
    const validIndices = [];
    const validValues = [];
    for (let i = 0; i < n; i++) {
        if (!outlierMask[i]) {
            validIndices.push(i);
            validValues.push(data[i]);
        }
    }

    // No valid points
    if (validIndices.length === 0) {
        return result.fill(0);
    }

    // Copy valid points
    for (let idx = 0; idx < validIndices.length; idx++) {
        result[validIndices[idx]] = validValues[idx];
    }

    // Need at least 2 points
    if (validIndices.length < 2) {
        return result;
    }

    // Compute PCHIP slopes (shape-preserving)
    const m = validIndices.length - 1;
    const delta = [];
    const slopes = new Array(m + 1).fill(0);

    for (let i = 0; i < m; i++) {
        delta[i] = (validValues[i + 1] - validValues[i]) / (validIndices[i + 1] - validIndices[i]);
    }

    // Internal points
    for (let i = 1; i < m; i++) {
        if (delta[i - 1] * delta[i] > 0) {
            // Weighted harmonic mean
            const w1 = 2 * (validIndices[i + 1] - validIndices[i]) + (validIndices[i] - validIndices[i - 1]);
            const w2 = (validIndices[i + 1] - validIndices[i]) + 2 * (validIndices[i] - validIndices[i - 1]);
            slopes[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
        } else {
            slopes[i] = 0;
        }
    }

    // End points
    slopes[0] = delta[0] * (2 * (validIndices[1] - validIndices[0]) + (validIndices[1] - validIndices[0])) /
               ((validIndices[1] - validIndices[0]) + 2 * (validIndices[1] - validIndices[0]));
    slopes[m] = delta[m - 1] * (2 * (validIndices[m] - validIndices[m - 1]) + (validIndices[m] - validIndices[m - 1])) /
               ((validIndices[m] - validIndices[m - 1]) + 2 * (validIndices[m] - validIndices[m - 1]));

    // Interpolate between valid points
    for (let k = 0; k < m; k++) {
        const x1 = validIndices[k];
        const x2 = validIndices[k + 1];
        const h = x2 - x1;
        for (let i = x1 + 1; i < x2; i++) {
            const t = (i - x1) / h;
            const t2 = t * t;
            const t3 = t2 * t;
            const h00 = 2 * t3 - 3 * t2 + 1;
            const h10 = t3 - 2 * t2 + t;
            const h01 = -2 * t3 + 3 * t2;
            const h11 = t3 - t2;
            result[i] = h00 * validValues[k] + h10 * h * slopes[k] +
                        h01 * validValues[k + 1] + h11 * h * slopes[k + 1];
        }
    }

    // Extrapolate at edges
    if (validIndices[0] > 0) {
        for (let i = 0; i < validIndices[0]; i++) {
            result[i] = validValues[0] + slopes[0] * (i - validIndices[0]);
        }
    }

    if (validIndices[m] < n - 1) {
        for (let i = validIndices[m] + 1; i < n; i++) {
            result[i] = validValues[m] + slopes[m] * (i - validIndices[m]);
        }
    }

    return result;
}

/**
 * Fill with Modified Akima interpolation
 * Reduces overshoot compared to cubic spline
 */
function fillWith_makima(data, outlierMask) {
    const result = new Float64Array(data.length);
    const n = data.length;

    // Find valid points
    const validIndices = [];
    const validValues = [];
    for (let i = 0; i < n; i++) {
        if (!outlierMask[i]) {
            validIndices.push(i);
            validValues.push(data[i]);
        }
    }

    // No valid points
    if (validIndices.length === 0) {
        return result.fill(0);
    }

    // Copy valid points
    for (let idx = 0; idx < validIndices.length; idx++) {
        result[validIndices[idx]] = validValues[idx];
    }

    // Need at least 2 points
    if (validIndices.length < 2) {
        return result;
    }

    const m = validIndices.length;

    // Compute slopes (modified Akima)
    const d = [];
    for (let i = 0; i < m - 1; i++) {
        d[i] = (validValues[i + 1] - validValues[i]) / (validIndices[i + 1] - validIndices[i]);
    }

    const s = new Array(m).fill(0);
    for (let i = 1; i < m - 1; i++) {
        const w1 = Math.abs(d[i] - d[i - 1]);
        const w2 = Math.abs(d[i + 1] - d[i]);
        if (w1 + w2 === 0) {
            s[i] = (d[i - 1] + d[i]) / 2;
        } else {
            s[i] = (w1 * d[i + 1] + w2 * d[i - 1]) / (w1 + w2);
        }
    }

    // End slopes
    s[0] = d[0];
    s[m - 1] = d[m - 2];

    // Interpolate using Hermite cubic
    for (let k = 0; k < m - 1; k++) {
        const x1 = validIndices[k];
        const x2 = validIndices[k + 1];
        const h = x2 - x1;
        for (let i = x1 + 1; i < x2; i++) {
            const t = (i - x1) / h;
            const t2 = t * t;
            const t3 = t2 * t;
            const h00 = 2 * t3 - 3 * t2 + 1;
            const h10 = t3 - 2 * t2 + t;
            const h01 = -2 * t3 + 3 * t2;
            const h11 = t3 - t2;
            result[i] = h00 * validValues[k] + h10 * h * s[k] +
                        h01 * validValues[k + 1] + h11 * h * s[k + 1];
        }
    }

    // Extrapolate at edges
    if (validIndices[0] > 0) {
        for (let i = 0; i < validIndices[0]; i++) {
            result[i] = validValues[0] + s[0] * (i - validIndices[0]);
        }
    }

    if (validIndices[m - 1] < n - 1) {
        for (let i = validIndices[m - 1] + 1; i < n; i++) {
            result[i] = validValues[m - 1] + s[m - 1] * (i - validIndices[m - 1]);
        }
    }

    return result;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Main filloutliers function
 * @param {Float64Array} data - Input data array
 * @param {string} fillMethod - Fill method ('center', 'clip', 'previous', 'next', 'nearest', 'linear', 'spline', 'pchip', 'makima', 'extreme')
 * @param {string} detectionMethod - Detection method ('median', 'mean', 'quartiles', 'grubbs', 'gesd', 'movmedian', 'movmean')
 * @param {object} params - Parameters
 * @returns {object} { cleanedData, outlierMask, lthresh, uthresh, center }
 */
function filloutliers(data, fillMethod, detectionMethod, params = {}) {
    const {
        thresholdFactor = 3,
        windowLength = 10,
        maxOutliers = Math.ceil(data.length * 0.1),
        lowup = null,
        outlierLocations = null
    } = params;

    // Use pre-defined outlier locations if provided
    if (outlierLocations) {
        const mask = new Int8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            mask[i] = outlierLocations[i] ? 1 : 0;
        }

        let cleaned;
        switch (fillMethod) {
            case 'extreme':
                cleaned = fillWith_extreme(data, mask);
                break;
            case 'center':
                cleaned = fillWith_center(data, mask, median(data));
                break;
            case 'clip':
                const m = median(data);
                const mad = scaledMAD(data);
                cleaned = fillWith_clip(data, mask, m - thresholdFactor * mad, m + thresholdFactor * mad);
                break;
            case 'previous':
                cleaned = fillWith_previous(data, mask);
                break;
            case 'next':
                cleaned = fillWith_next(data, mask);
                break;
            case 'nearest':
                cleaned = fillWith_nearest(data, mask);
                break;
            case 'linear':
                cleaned = fillWith_linear(data, mask);
                break;
            case 'spline':
                cleaned = fillWith_spline(data, mask);
                break;
            case 'pchip':
                cleaned = fillWith_pchip(data, mask);
                break;
            case 'makima':
                cleaned = fillWith_makima(data, mask);
                break;
            default:
                cleaned = fillWith_nearest(data, mask);
        }

        return {
            cleanedData: cleaned,
            outlierMask: mask,
            lthresh: median(data) - thresholdFactor * scaledMAD(data),
            uthresh: median(data) + thresholdFactor * scaledMAD(data),
            center: median(data)
        };
    }

    // Detect outliers
    let detection;
    if (detectionMethod === 'percentiles' && lowup) {
        // Percentile-based detection
        const lp = quantile(data, lowup[0] / 100);
        const up = quantile(data, lowup[1] / 100);
        const mask = new Int8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            mask[i] = (data[i] < lp || data[i] > up) ? 1 : 0;
        }
        detection = {
            mask: mask,
            lthresh: lp,
            uthresh: up,
            center: (lp + up) / 2
        };
    } else {
        switch (detectionMethod) {
            case 'median':
                detection = detectOutliers_median(data, thresholdFactor);
                break;
            case 'mean':
                detection = detectOutliers_mean(data, thresholdFactor);
                break;
            case 'quartiles':
                detection = detectOutliers_quartiles(data, thresholdFactor);
                break;
            case 'grubbs':
                detection = detectOutliers_grubbs(data, thresholdFactor, maxOutliers);
                break;
            case 'gesd':
                detection = detectOutliers_gesd(data, thresholdFactor, maxOutliers);
                break;
            case 'movmedian':
                detection = detectOutliers_movmedian(data, windowLength, thresholdFactor);
                break;
            case 'movmean':
                detection = detectOutliers_movmean(data, windowLength, thresholdFactor);
                break;
            default:
                detection = detectOutliers_median(data, thresholdFactor);
        }
    }

    // Fill outliers
    let cleaned;
    switch (fillMethod) {
        case 'extreme':
            cleaned = fillWith_extreme(data, detection.mask);
            break;
        case 'center':
            cleaned = fillWith_center(data, detection.mask, detection.center);
            break;
        case 'clip':
            cleaned = fillWith_clip(data, detection.mask, detection.lthresh, detection.uthresh);
            break;
        case 'previous':
            cleaned = fillWith_previous(data, detection.mask);
            break;
        case 'next':
            cleaned = fillWith_next(data, detection.mask);
            break;
        case 'nearest':
            cleaned = fillWith_nearest(data, detection.mask);
            break;
        case 'linear':
            cleaned = fillWith_linear(data, detection.mask);
            break;
        case 'spline':
            cleaned = fillWith_spline(data, detection.mask);
            break;
        case 'pchip':
            cleaned = fillWith_pchip(data, detection.mask);
            break;
        case 'makima':
            cleaned = fillWith_makima(data, detection.mask);
            break;
        default:
            cleaned = fillWith_nearest(data, detection.mask);
    }

    return {
        cleanedData: cleaned,
        outlierMask: detection.mask,
        lthresh: detection.lthresh,
        uthresh: detection.uthresh,
        center: detection.center
    };
}
