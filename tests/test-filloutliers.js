/**
 * test-filloutliers.js - Unit tests for filloutliers.js
 */

QUnit.module('filloutliers.js - Utility Functions', function() {

    QUnit.test('mean()', function(assert) {
        assert.equal(mean([1, 2, 3, 4, 5]), 3, 'Mean of [1,2,3,4,5] is 3');
        assert.equal(mean([0, 0, 0]), 0, 'Mean of [0,0,0] is 0');
        assert.equal(mean([-1, 1]), 0, 'Mean of [-1,1] is 0');
        assert.equal(mean([10]), 10, 'Mean of single element is the element itself');
    });

    QUnit.test('median()', function(assert) {
        assert.equal(median([1, 2, 3, 4, 5]), 3, 'Median of odd length array');
        assert.equal(median([1, 2, 3, 4]), 2.5, 'Median of even length array');
        assert.equal(median([5, 1, 3, 2, 4]), 3, 'Median of unsorted array');
        assert.equal(median([10]), 10, 'Median of single element');
    });

    QUnit.test('std()', function(assert) {
        var result = std([1, 2, 3, 4, 5]);
        assert.ok(Math.abs(result - 1.414) < 0.01, 'Standard deviation calculation');
    });

    QUnit.test('quantile()', function(assert) {
        assert.equal(quantile([1, 2, 3, 4, 5], 0.25), 2, 'First quartile');
        assert.equal(quantile([1, 2, 3, 4, 5], 0.5), 3, 'Median (0.5 quantile)');
        assert.equal(quantile([1, 2, 3, 4, 5], 0.75), 4, 'Third quartile');
    });

    QUnit.test('scaledMAD()', function(assert) {
        var data = [1, 2, 3, 4, 5];
        var result = scaledMAD(data);
        assert.ok(result > 0, 'Scaled MAD should be positive for non-constant data');
        assert.ok(result < 10, 'Scaled MAD should be reasonable');
    });

    QUnit.test('iqr()', function(assert) {
        var data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        var result = iqr(data);
        assert.equal(result, 5, 'IQR of sequential data');
    });

    QUnit.test('nnz()', function(assert) {
        assert.equal(nnz([0, 1, 0, 2, 0]), 2, 'Count non-zero elements');
        assert.equal(nnz([1, 2, 3]), 3, 'All non-zero');
        assert.equal(nnz([0, 0, 0]), 0, 'All zero');
    });

    QUnit.test('diff()', function(assert) {
        var result = diff([1, 2, 4, 7, 11]);
        assert.deepEqual(result, [1, 2, 3, 4], 'First difference');
    });

    QUnit.test('normalizeRange()', function(assert) {
        var result = normalizeRange([1, 2, 3, 4, 5]);
        assert.equal(result[0], 0, 'First element normalized to 0');
        assert.equal(result[4], 1, 'Last element normalized to 1');

        var constantResult = normalizeRange([5, 5, 5]);
        assert.equal(constantResult[0], 0, 'Constant data normalizes to 0');
    });
});

QUnit.module('filloutliers.js - Outlier Detection Methods', function() {

    QUnit.test('detectOutliersMedian()', function(assert) {
        var data = [1, 2, 100, 2, 3, 1];
        var result = detectOutliersMedian(new Float64Array(data), 3);
        assert.ok(result.tf[2], 'Detect obvious outlier (100)');
        assert.ok(result.tf[2] === true, 'Outlier flagged correctly');
    });

    QUnit.test('detectOutliersMean()', function(assert) {
        var data = [1, 2, 100, 2, 3, 1];
        var result = detectOutliersMean(new Float64Array(data), 3);
        assert.ok(result.tf[2], 'Mean method detects outlier');
    });

    QUnit.test('detectOutliersQuartiles()', function(assert) {
        var data = [1, 2, 3, 4, 5, 100, 7];
        var result = detectOutliersQuartiles(new Float64Array(data), 3);
        assert.ok(result.tf[5], 'Quartile method detects extreme value');
    });

    QUnit.test('detectOutliersMovmedian()', function(assert) {
        var data = [1, 2, 3, 100, 5, 6, 7];
        var result = detectOutliersMovmedian(new Float64Array(data), 3, 3);
        assert.ok(result.outlierIndices.length > 0, 'Moving median detects outlier');
    });

    QUnit.test('detectOutliersMovmean()', function(assert) {
        var data = [1, 2, 3, 100, 5, 6, 7];
        var result = detectOutliersMovmean(new Float64Array(data), 3, 3);
        assert.ok(result.outlierIndices.length > 0, 'Moving mean detects outlier');
    });
});

QUnit.module('filloutliers.js - Fill Methods', function() {

    QUnit.test('fillCenter()', function(assert) {
        var data = [1, 2, 100, 2, 3];
        var tf = [false, false, true, false, false];
        var result = fillCenter(data, tf);
        assert.equal(result[2], 2, 'Fills with median');
        assert.equal(result[0], 1, 'Non-outlier unchanged');
    });

    QUnit.test('fillClip()', function(assert) {
        var data = [1, 2, 100, 2, 3];
        var tf = [false, false, true, false, false];
        var result = fillClip(data, tf, 1, 3);
        assert.equal(result[2], 3, 'Clips to upper threshold');
    });

    QUnit.test('fillPrevious()', function(assert) {
        var data = [1, 2, 100, 2, 3];
        var tf = [false, false, true, false, false];
        var result = fillPrevious(data, tf);
        assert.equal(result[2], 2, 'Fills with previous value');
    });

    QUnit.test('fillNext()', function(assert) {
        var data = [1, 2, 100, 2, 3];
        var tf = [false, false, true, false, false];
        var result = fillNext(data, tf);
        assert.equal(result[2], 2, 'Fills with next value');
    });

    QUnit.test('fillNearest()', function(assert) {
        var data = [1, 2, 100, 2, 3];
        var tf = [false, false, true, false, false];
        var result = fillNearest(data, tf);
        assert.ok(result[2] === 2 || result[2] === 3, 'Fills with nearest valid value');
    });

    QUnit.test('fillLinear()', function(assert) {
        var data = [1, 2, 100, 2, 3];
        var tf = [false, false, true, false, false];
        var result = fillLinear(data, tf);
        assert.ok(result[2] > 2 && result[2] < 3, 'Linear interpolation between neighbors');
    });

    QUnit.test('fillSpline()', function(assert) {
        var data = [1, 2, 100, 2, 3];
        var tf = [false, false, true, false, false];
        var result = fillSpline(data, tf);
        assert.ok(result[2] !== 100, 'Spline interpolation replaces outlier');
    });

    QUnit.test('fillPchip()', function(assert) {
        var data = [1, 2, 100, 2, 3];
        var tf = [false, false, true, false, false];
        var result = fillPchip(data, tf);
        assert.ok(result[2] !== 100, 'PCHIP interpolation replaces outlier');
    });

    QUnit.test('fillMakima()', function(assert) {
        var data = [1, 2, 100, 2, 3];
        var tf = [false, false, true, false, false];
        var result = fillMakima(data, tf);
        assert.ok(result[2] !== 100, 'Modified Akima interpolation replaces outlier');
    });
});

QUnit.module('filloutliers.js - Main Function', function() {

    QUnit.test('filloutliers() with nearest method', function(assert) {
        var data = new Float64Array([1, 2, 100, 2, 3, 1]);
        var result = filloutliers(data, 'nearest', 'median', { thresholdFactor: 3 });
        assert.ok(result.cleanedData.length === data.length, 'Output length matches input');
        assert.ok(result.cleanedData[2] !== 100, 'Outlier replaced');
    });

    QUnit.test('filloutliers() with linear method', function(assert) {
        var data = new Float64Array([1, 2, 100, 2, 3, 1]);
        var result = filloutliers(data, 'linear', 'median', { thresholdFactor: 3 });
        assert.ok(result.cleanedData.length === data.length, 'Output length matches input');
        assert.ok(result.cleanedData[2] !== 100, 'Outlier interpolated');
    });

    QUnit.test('filloutliers() with movmean detection', function(assert) {
        var data = new Float64Array([1, 2, 3, 100, 5, 6, 7]);
        var result = filloutliers(data, 'nearest', 'movmean', {
            thresholdFactor: 3,
            windowLength: 3
        });
        assert.ok(result.cleanedData[3] !== 100, 'Outlier detected and replaced');
    });

    QUnit.test('filloutliers() returns correct structure', function(assert) {
        var data = new Float64Array([1, 2, 3, 4, 5]);
        var result = filloutliers(data, 'nearest', 'median', { thresholdFactor: 3 });
        assert.ok(result.cleanedData, 'Returns cleanedData');
        assert.ok(result.tf, 'Returns outlier flags');
        assert.ok(result.lthresh !== undefined, 'Returns lower threshold');
        assert.ok(result.uthresh !== undefined, 'Returns upper threshold');
        assert.ok(result.center !== undefined, 'Returns center value');
    });

    QUnit.test('filloutliers() handles edge cases', function(assert) {
        var emptyData = new Float64Array([]);
        var result = filloutliers(emptyData, 'nearest', 'median', { thresholdFactor: 3 });
        assert.ok(result.cleanedData.length === 0, 'Handles empty array');

        var singleData = new Float64Array([1]);
        var result2 = filloutliers(singleData, 'nearest', 'median', { thresholdFactor: 3 });
        assert.ok(result2.cleanedData.length === 1, 'Handles single element');
    });

    QUnit.test('filloutliers() with custom threshold factor', function(assert) {
        var data = new Float64Array([1, 2, 3, 4, 100, 6]);
        var result = filloutliers(data, 'nearest', 'median', { thresholdFactor: 1 });
        assert.ok(result.tf[4], 'Lower threshold detects more outliers');
    });
});
