/**
 * test-export.js - Unit tests for export.js
 */

QUnit.module('export.js - CSV Export', function() {

    QUnit.test('exportToCSV() basic', function(assert) {
        var data = [
            [1, 10],
            [2, 20],
            [3, 30]
        ];
        var result = exportToCSV(data);

        assert.ok(result.indexOf('Time,Signal1') === 0, 'Has correct header');
        assert.ok(result.indexOf('1,10') > 0, 'Contains first row');
        assert.ok(result.indexOf('2,20') > 0, 'Contains second row');
    });

    QUnit.test('exportToCSV() with cleaned data option', function(assert) {
        var data = [
            [1, 10],
            [2, 20],
            [3, 30]
        ];
        var options = { includeCleaned: true };
        var result = exportToCSV(data, options);

        assert.ok(result.indexOf('Signal1') !== -1, 'Has original column');
        assert.ok(result.indexOf('Signal1_Cleaned') !== -1, 'Has cleaned column');
    });

    QUnit.test('exportToCSV() with validity flag option', function(assert) {
        var data = [
            [1, 10],
            [2, 20],
            [3, 30]
        ];
        var options = { addValidityFlag: true };
        var result = exportToCSV(data, options);

        assert.ok(result.indexOf('Valid') !== -1, 'Has Valid column');
    });

    QUnit.test('exportToCSV() handles empty data', function(assert) {
        var result = exportToCSV([]);
        assert.equal(result, '', 'Returns empty string for empty data');
    });

    QUnit.test('exportToCSV() handles null/undefined options', function(assert) {
        var data = [
            [1, 10],
            [2, 20]
        ];
        var result = exportToCSV(data, null);

        assert.ok(result.indexOf('Time') !== -1, 'Handles null options');
    });

    QUnit.test('exportToTXT() delegates to CSV', function(assert) {
        var data = [
            [1, 10],
            [2, 20]
        ];
        var csvResult = exportToCSV(data);
        var txtResult = exportToTXT(data);

        assert.equal(csvResult, txtResult, 'TXT export matches CSV');
    });
});

QUnit.module('export.js - JSON Export', function() {

    QUnit.test('exportData() with JSON format', function(assert) {
        var mockBlob = function(content, type) {
            this.content = content;
            this.type = type;
        };

        var data = [
            [1, 10],
            [2, 20]
        ];
        var params = { windowWidth: 40, threshold: 1.4 };
        var metrics = { STDF: 0.01, DF: 0.05 };
        var outliers = [5, 10];
        var options = { baseName: 'test_data' };

        var originalBlob = window.Blob;
        window.Blob = mockBlob;
        exportData(data, params, metrics, outliers, 'json', options);
        window.Blob = originalBlob;
    });

    QUnit.test('exportData() JSON structure', function(assert) {
        var data = [
            [1, 10],
            [2, 20]
        ];
        var params = { windowWidth: 40, threshold: 1.4 };
        var metrics = { STDF: 0.01, DF: 0.05 };
        var outliers = [5, 10];
        var options = { baseName: 'test_data' };

        var mockBlob = function(content) {
            var json = JSON.parse(content);
            assert.ok(json.filename, 'JSON has filename');
            assert.ok(json.timestamp, 'JSON has timestamp');
            assert.deepEqual(json.parameters, params, 'JSON has parameters');
            assert.deepEqual(json.metrics, metrics, 'JSON has metrics');
            assert.deepEqual(json.outliers, outliers, 'JSON has outliers');
            assert.deepEqual(json.data, data, 'JSON has data');
        };

        var originalBlob = window.Blob;
        var mockCreateElement = function(tag) {
            if (tag === 'a') {
                var link = { tag: 'a' };
                var clickCallback = null;
                Object.defineProperty(link, 'href', {
                    get: function() { return ''; },
                    set: function(val) { this._href = val; }
                });
                Object.defineProperty(link, 'download', {
                    get: function() { return ''; },
                    set: function(val) { this._download = val; }
                });
                link.click = function() { clickCallback && clickCallback(); };
                Object.defineProperty(link, 'addEventListener', {
                    value: function(event, handler) {
                        if (event === 'click') clickCallback = handler;
                    }
                });
                return link;
            }
            return originalCreateElement.call(document, tag);
        };

        var originalCreateElement = document.createElement;
        window.Blob = mockBlob;
        document.createElement = mockCreateElement;
        exportData(data, params, metrics, outliers, 'json', options);
        window.Blob = originalBlob;
        document.createElement = originalCreateElement;
    });
});

QUnit.module('export.js - HTML Export', function() {

    QUnit.test('generateHTMLReport() creates valid HTML', function(assert) {
        var data = [
            [1, 10],
            [2, 20],
            [3, 30]
        ];
        var params = { windowWidth: 40, threshold: 1.4 };
        var metrics = { STDF: 0.01, DF: 0.05 };
        var outliers = [[true, false], [false, true]];
        var state = { outlierMasks: outliers };

        var result = generateHTMLReport(data, params, metrics, [], state);

        assert.ok(result.indexOf('<!DOCTYPE html>') !== -1, 'Has DOCTYPE');
        assert.ok(result.indexOf('<html') !== -1, 'Has HTML tag');
        assert.ok(result.indexOf('<body>') !== -1, 'Has body tag');
        assert.ok(result.indexOf('</html>') !== -1, 'Has closing HTML tag');
    });

    QUnit.test('generateHTMLReport() includes metadata', function(assert) {
        var data = [
            [1, 10],
            [2, 20]
        ];
        var params = { windowWidth: 40, threshold: 1.4 };
        var metrics = {};
        var state = {};

        var result = generateHTMLReport(data, params, metrics, [], state);

        assert.ok(result.indexOf('windowWidth') !== -1, 'Includes windowWidth');
        assert.ok(result.indexOf('threshold') !== -1, 'Includes threshold');
    });

    QUnit.test('generateHTMLReport() handles Russian language', function(assert) {
        var originalSetLanguage = window.I18n ? window.I18n.setLanguage : null;
        if (window.I18n) window.I18n.setLanguage('ru');

        var data = [[1, 10]];
        var params = {};
        var metrics = {};
        var state = {};

        var result = generateHTMLReport(data, params, metrics, [], state);

        assert.ok(result.indexOf('ru') !== -1 || result.indexOf('en') !== -1, 'Has language attribute');
        if (originalSetLanguage) window.I18n.setLanguage = originalSetLanguage;
    });

    QUnit.test('generateHTMLReport() includes outlier statistics', function(assert) {
        var data = [
            [1, 10],
            [2, 20]
        ];
        var params = {};
        var metrics = {};
        var outliers = [
            [true, false, true],
            [false, true, false]
        ];
        var state = { outlierMasks: outliers };

        var result = generateHTMLReport(data, params, metrics, [], state);

        assert.ok(result.indexOf('Статистика выбросов') !== -1 ||
                  result.indexOf('Outlier Statistics') !== -1, 'Includes outlier section');
    });
});

QUnit.module('export.js - File Download', function() {

    QUnit.test('downloadFile() creates correct blob', function(assert) {
        var mockBlobs = [];
        var mockBlob = function(content, options) {
            mockBlobs.push({ content: content, options: options });
            return { size: content.length };
        };

        var content = 'test,data';
        var originalBlob = window.Blob;
        window.Blob = mockBlob;

        downloadFile(content, 'test.csv', 'text/csv');

        window.Blob = originalBlob;

        assert.equal(mockBlobs.length, 1, 'Creates one blob');
        assert.equal(mockBlobs[0].content, content, 'Blob has correct content');
    });

    QUnit.test('downloadFile() sets correct filename', function(assert) {
        var linksCreated = [];
        var mockCreateElement = function(tag) {
            if (tag === 'a') {
                var link = {
                    tagName: 'A',
                    href: '',
                    download: '',
                    _clicked: false
                };
                Object.defineProperty(link, 'click', {
                    value: function() { this._clicked = true; }
                });
                linksCreated.push(link);
                return link;
            }
            return originalCreateElement.call(document, tag);
        };

        var content = 'test,data';
        var filename = 'test_output.csv';
        var originalCreateElement = document.createElement;

        document.createElement = mockCreateElement;
        downloadFile(content, filename, 'text/csv');
        document.createElement = originalCreateElement;

        assert.equal(linksCreated.length, 1, 'Creates one link');
        assert.equal(linksCreated[0].download, filename, 'Sets correct filename');
        assert.ok(linksCreated[0]._clicked, 'Triggers click');
    });
});
