/**
 * test-metrics.js - Unit tests for metrics.js
 */

QUnit.module('metrics.js - Utility Functions', function() {

    QUnit.test('mean()', function(assert) {
        assert.equal(mean([1, 2, 3, 4, 5]), 3, 'Mean of [1,2,3,4,5] is 3');
        assert.equal(mean([0, 0, 0]), 0, 'Mean of zeros is 0');
        assert.equal(mean([-5, 5]), 0, 'Mean of symmetric values');
    });

    QUnit.test('std()', function(assert) {
        var result = std([1, 2, 3, 4, 5]);
        assert.ok(Math.abs(result - 1.414) < 0.01, 'Standard deviation calculation');
    });

    QUnit.test('variance()', function(assert) {
        var result = variance([1, 2, 3, 4, 5]);
        assert.ok(Math.abs(result - 2) < 0.01, 'Variance calculation');
    });

    QUnit.test('diff()', function(assert) {
        var result = diff([1, 2, 4, 7, 11]);
        assert.deepEqual(result, [1, 2, 3, 4], 'First difference');
        assert.equal(result.length, 4, 'Result is one element shorter');
    });

    QUnit.test('nnz()', function(assert) {
        assert.equal(nnz([0, 1, 0, 2, 0]), 2, 'Count non-zero elements');
        assert.equal(nnz([1, 2, 3]), 3, 'All non-zero');
        assert.equal(nnz([0.0001, 0, 1]), 2, 'Handles small non-zero values');
    });

    QUnit.test('normalizeRange()', function(assert) {
        var result = normalizeRange([1, 2, 3, 4, 5]);
        assert.equal(result[0], 0, 'First element normalized to 0');
        assert.equal(result[4], 1, 'Last element normalized to 1');

        var constantResult = normalizeRange([5, 5, 5]);
        assert.equal(constantResult[0], 0, 'Constant data normalizes to 0');
    });

    QUnit.test('flatten2D()', function(assert) {
        var data2D = [
            [1, 2],
            [3, 4],
            [5, 6]
        ];
        var result = flatten2D(data2D);
        assert.deepEqual(result, [1, 3, 5, 2, 4, 6], 'Flattens column-major');
    });
});

QUnit.module('metrics.js - Signal Analysis', function() {

    QUnit.test('analyzeSignalNoise()', function(assert) {
        var signal = TestUtils.generateTestSignal(100, 0.1, [25, 50, 75]);
        var analysis = analyzeSignalNoise(signal, 25);

        assert.ok(analysis.chunks, 'Returns chunks array');
        assert.ok(analysis.noiseLevels, 'Returns noise levels array');
        assert.equal(analysis.chunks.length, 4, 'Correct number of chunks');
        assert.equal(analysis.noiseLevels.length, 4, 'Noise levels match chunks');
    });

    QUnit.test('selectRepresentativeChunks()', function(assert) {
        var signal = TestUtils.generateTestSignal(100, 0.1, [25, 50, 75]);
        var analysis = analyzeSignalNoise(signal, 25);
        var selected = selectRepresentativeChunks(analysis, 3);

        assert.ok(selected.length <= 3, 'Selects at most requested chunks');
        assert.ok(selected.length > 0, 'Selects at least one chunk');
        assert.equal(selected[0].data.length, 25, 'Selected chunks have correct length');
    });

    QUnit.test('selectRepresentativeChunks() with more than 3 chunks', function(assert) {
        var signal = TestUtils.generateTestSignal(200, 0.1, []);
        var analysis = analyzeSignalNoise(signal, 25);
        var selected = selectRepresentativeChunks(analysis, 5);

        assert.ok(selected.length <= 5, 'Respects numChunks parameter');
        assert.ok(selected.length > 3, 'Can select more than 3 chunks');
    });
});

QUnit.module('metrics.js - Quality Metrics', function() {

    QUnit.test('smoothnessMetric()', function(assert) {
        var smoothData = [1, 1.1, 1.2, 1.3, 1.4];
        var noisyData = [1, 10, 1, 10, 1];

        var smoothSTDF = smoothnessMetric(smoothData);
        var noisySTDF = smoothnessMetric(noisyData);

        assert.ok(smoothSTDF < noisySTDF, 'Smooth data has lower STDF');
        assert.ok(smoothSTDF >= 0, 'STDF is non-negative');
    });

    QUnit.test('deletedFraction()', function(assert) {
        var original = [1, 2, 3, 4, 5];
        var cleaned = [1, 2, 3.5, 4, 5];
        var df = deletedFraction(original, cleaned);

        assert.ok(df > 0, 'Detects changes');
        assert.ok(df <= 1, 'DF is between 0 and 1');
        assert.ok(df === 0.2, 'Correct fraction calculated');
    });

    QUnit.test('deletedFraction() with no changes', function(assert) {
        var original = [1, 2, 3, 4, 5];
        var cleaned = [1, 2, 3, 4, 5];
        var df = deletedFraction(original, cleaned);

        assert.equal(df, 0, 'No changes means DF is 0');
    });

    QUnit.test('signalToNoiseRatio()', function(assert) {
        var original = [1, 2, 3, 4, 5];
        var cleaned = [1, 1.5, 3, 4, 5];
        var snr = signalToNoiseRatio(original, cleaned);

        assert.ok(snr > 0, 'SNR is positive');
        assert.ok(snr < 100, 'SNR is reasonable');
    });

    QUnit.test('signalToNoiseRatio() with perfect cleaning', function(assert) {
        var original = [1, 2, 3, 4, 5];
        var cleaned = [1, 2, 3, 4, 5];
        var snr = signalToNoiseRatio(original, cleaned);

        assert.equal(snr, 100, 'Perfect cleaning gives high SNR');
    });

    QUnit.test('rootMeanSquareError()', function(assert) {
        var original = [1, 2, 3, 4, 5];
        var cleaned = [1, 2.5, 3, 4, 5];
        var rmse = rootMeanSquareError(original, cleaned);

        assert.ok(rmse > 0, 'RMSE is positive for different data');
        assert.ok(rmse < 10, 'RMSE is reasonable');
    });

    QUnit.test('rootMeanSquareError() with identical data', function(assert) {
        var original = [1, 2, 3, 4, 5];
        var cleaned = [1, 2, 3, 4, 5];
        var rmse = rootMeanSquareError(original, cleaned);

        assert.equal(rmse, 0, 'Identical data has RMSE of 0');
    });

    QUnit.test('rSquared()', function(assert) {
        var original = [1, 2, 3, 4, 5];
        var cleaned = [1, 2, 3, 4, 5];
        var r2 = rSquared(original, cleaned);

        assert.equal(r2, 1, 'Perfect correlation gives R² of 1');
    });

    QUnit.test('rSquared() with noise', function(assert) {
        var original = [1, 2, 3, 4, 5];
        var cleaned = [1, 2.5, 3, 4.5, 5];
        var r2 = rSquared(original, cleaned);

        assert.ok(r2 >= 0, 'R² is non-negative');
        assert.ok(r2 <= 1, 'R² is at most 1');
        assert.ok(r2 < 1, 'Noise reduces R²');
    });

    QUnit.test('pearsonCorrelation()', function(assert) {
        var x = [1, 2, 3, 4, 5];
        var y = [1, 2, 3, 4, 5];
        var pearson = pearsonCorrelation(x, y);

        assert.equal(pearson, 1, 'Perfect positive correlation');
    });

    QUnit.test('pearsonCorrelation() with anti-correlation', function(assert) {
        var x = [1, 2, 3, 4, 5];
        var y = [5, 4, 3, 2, 1];
        var pearson = pearsonCorrelation(x, y);

        assert.equal(pearson, -1, 'Perfect negative correlation');
    });

    QUnit.test('pearsonCorrelation() with no correlation', function(assert) {
        var x = [1, 2, 3, 4, 5];
        var y = [5, 1, 4, 2, 3];
        var pearson = pearsonCorrelation(x, y);

        assert.ok(pearson > -1, 'Pearson is >= -1');
        assert.ok(pearson < 1, 'Pearson is <= 1');
    });
});

QUnit.module('metrics.js - Multi-Series Metrics', function() {

    QUnit.test('computeAllMetricsSingle()', function(assert) {
        var original = [1, 2, 3, 4, 5];
        var cleaned = [1, 2, 3, 4, 5];
        var metrics = computeAllMetricsSingle(original, cleaned);

        assert.ok(metrics.STDF !== undefined, 'Returns STDF');
        assert.ok(metrics.DF !== undefined, 'Returns DF');
        assert.ok(metrics.ASNR !== undefined, 'Returns ASNR');
        assert.ok(metrics.ARMSE !== undefined, 'Returns ARMSE');
        assert.ok(metrics.R_squared !== undefined, 'Returns R²');
        assert.ok(metrics.R_Pirs !== undefined, 'Returns Pearson');
    });

    QUnit.test('computeAllMetricsMultiSeries()', function(assert) {
        var originalMatrix = [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
            [4, 5]
        ];
        var cleanedMatrix = [
            [0, 1.5],
            [1, 2.5],
            [2, 3.5],
            [3, 4.5],
            [4, 5.5]
        ];
        var metrics = computeAllMetricsMultiSeries(originalMatrix, cleanedMatrix);

        assert.ok(metrics.STDF !== undefined, 'Returns STDF');
        assert.ok(metrics.DF !== undefined, 'Returns DF');
        assert.ok(metrics.ASNR !== undefined, 'Returns ASNR');
        assert.ok(metrics.ARMSE !== undefined, 'Returns ARMSE');
        assert.ok(metrics.R_squared !== undefined, 'Returns R²');
        assert.ok(metrics.R_Pirs !== undefined, 'Returns Pearson');
    });

    QUnit.test('computeAllMetricsMultiSeries() handles empty', function(assert) {
        var result = computeAllMetricsMultiSeries([], []);

        assert.ok(result.STDF === 0, 'Handles empty input');
        assert.ok(result.DF === 0, 'Handles empty input');
    });
});

QUnit.module('metrics.js - Matrix Smoothing', function() {

    QUnit.test('smoothMatrix()', function(assert) {
        var matrix = [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ];
        var smoothed = smoothMatrix(matrix, 1);

        assert.ok(smoothed.length < matrix.length, 'Smoothing reduces size');
        assert.ok(smoothed[0].length < matrix[0].length, 'Smoothing reduces columns');
    });

    QUnit.test('smoothMatrix() with radius 0', function(assert) {
        var matrix = [
            [1, 2],
            [3, 4]
        ];
        var smoothed = smoothMatrix(matrix, 0);

        assert.ok(smoothed.length === matrix.length, 'Radius 0 keeps size');
    });
});
