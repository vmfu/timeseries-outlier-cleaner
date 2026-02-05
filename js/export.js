/**
 * export.js - Export functionality
 * Handles exporting data in various formats (CSV, TXT, JSON, HTML)
 */

(function(global) {
    'use strict';

    // ============================================================================
    // EXPORT FUNCTIONS
    // ============================================================================

    /**
     * Export data to CSV format
     * @param {Array} data - 2D array of data to export
     * @param {Object} options - Export options
     * @param {boolean} options.includeCleaned - Include cleaned data
     * @param {boolean} options.addValidityFlag - Add validity flag column
     * @returns {string} CSV formatted string
     */
    function exportToCSV(data, options) {
        if (!data || data.length === 0) return '';

        var includeCleaned = options && options.includeCleaned;
        var addValidityFlag = options && options.addValidityFlag;

        var csv = [];
        var rows = data.length;
        var cols = data[0].length;
        var numSeries = cols - 1;

        // Use semicolon as delimiter (works with Excel in Russian locale)
        var delimiter = ';';

        // Build header
        var header = ['Time'];
        for (var i = 1; i <= numSeries; i++) {
            header.push('Signal' + i);
            if (includeCleaned) {
                header.push('Signal' + i + '_Cleaned');
            }
        }
        if (addValidityFlag) {
            header.push('Valid');
        }
        csv.push(header.join(delimiter));

        // Build data rows
        for (var r = 0; r < rows; r++) {
            var row = [];
            for (var c = 0; c < cols; c++) {
                // Wrap in quotes if contains special characters
                var val = String(data[r][c]);
                if (val.indexOf(delimiter) !== -1 || val.indexOf('"') !== -1 || val.indexOf('\n') !== -1) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                row.push(val);
            }
            csv.push(row.join(delimiter));
        }

        return csv.join('\r\n');
    }

    /**
     * Export data to TXT/ASCII format
     * @param {Array} data - 2D array of data to export
     * @param {Object} options - Export options
     * @returns {string} TXT formatted string
     */
    function exportToTXT(data, options) {
        return exportToCSV(data, options);
    }

    /**
     * Trigger file download
     * @param {string} content - File content
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    function downloadFile(content, filename, mimeType) {
        // Add BOM for Excel to recognize UTF-8 encoding
        var bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        var encoder = new TextEncoder();
        var contentBytes = encoder.encode(content);
        var bytes = new Uint8Array(bom.length + contentBytes.length);
        bytes.set(bom, 0);
        bytes.set(contentBytes, bom.length);
        var blob = new Blob([bytes], { type: mimeType });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Export data with format selection
     * @param {Array} data - Data to export
     * @param {Object} params - Parameters used for cleaning
     * @param {Object} metrics - Quality metrics
     * @param {Array} outliers - Outlier indices
     * @param {string} format - Export format ('csv', 'txt', 'json', 'html')
     * @param {Object} options - Additional export options
     */
    function exportData(data, params, metrics, outliers, format, options) {
        var content = '';
        var baseName = options && options.baseName || 'outlier_cleaned_data';
        var extension = format.toLowerCase();

        switch (extension) {
            case 'csv':
                content = exportToCSV(data, options);
                downloadFile(content, baseName + '.csv', 'text/csv;charset=utf-8');
                break;
            case 'txt':
                content = exportToTXT(data, options);
                downloadFile(content, baseName + '.txt', 'text/plain;charset=utf-8');
                break;
            case 'json':
                content = JSON.stringify({
                    filename: baseName,
                    timestamp: new Date().toISOString(),
                    parameters: params,
                    metrics: metrics,
                    outliers: outliers,
                    data: data
                }, null, 2);
                downloadFile(content, baseName + '_report.json', 'application/json;charset=utf-8');
                break;
            case 'html':
                content = generateHTMLReport(data, params, metrics, outliers);
                downloadFile(content, baseName + '_report.html', 'text/html;charset=utf-8');
                break;
            default:
                console.error('[Export] Unsupported format:', format);
        }
    }

    /**
     * Generate HTML report
     * @param {Array} data - Data to include in report
     * @param {Object} params - Parameters used
     * @param {Object} metrics - Quality metrics
     * @param {Array} outliers - Outlier information
     * @param {Object} state - Application state with chart reference, outlierMasks, etc.
     * @returns {string} HTML report content
     */
    function generateHTMLReport(data, params, metrics, outliers, state) {
        var lang = global.I18n ? global.I18n.getLanguage() : 'en';
        var isRu = lang === 'ru';

        // Get chart images
        var dataChartImage = state.dataChart ? state.dataChart.toBase64Image() : '';
        var heatmapCanvas = document.getElementById('heatmapCanvas');
        var heatmapImage = heatmapCanvas ? heatmapCanvas.toDataURL('image/png') : '';

        // Build HTML
        var html = '<!DOCTYPE html>\n';
        html += '<html lang="' + lang + '">\n';
        html += '<head>\n';
        html += '    <meta charset="UTF-8">\n';
        html += '    <title>' + (isRu ? 'Отчет об очистке данных' : 'Data Cleaning Report') + '</title>\n';
        html += '    <style>\n';
        html += '        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }\n';
        html += '        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }\n';
        html += '        h1 { color: #00aaff; border-bottom: 3px solid #00aaff; padding-bottom: 10px; }\n';
        html += '        h2 { color: #ffaa00; margin-top: 30px; }\n';
        html += '        .section { margin: 20px 0; }\n';
        html += '        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }\n';
        html += '        .info-table th { background: #00aaff; color: white; padding: 12px; text-align: left; }\n';
        html += '        .info-table td { padding: 12px; border-bottom: 1px solid #ddd; }\n';
        html += '        .info-table tr:hover { background: #f5f5f5; }\n';
        html += '        .metric-table { width: 100%; border-collapse: collapse; margin: 20px 0; }\n';
        html += '        .metric-table th { background: #ffaa00; color: white; padding: 12px; }\n';
        html += '        .metric-table td { padding: 12px; border-bottom: 1px solid #ddd; text-align: center; }\n';
        html += '        .chart-container { margin: 30px 0; text-align: center; }\n';
        html += '        .chart-container img { max-width: 100%; border: 2px solid #00aaff; }\n';
        html += '        .footer { margin-top: 40px; text-align: center; color: #888; font-size: 12px; }\n';
        html += '        .quality-excellent { color: #00ff88; font-weight: bold; }\n';
        html += '        .quality-good { color: #ffaa00; font-weight: bold; }\n';
        html += '        .quality-poor { color: #ff4444; font-weight: bold; }\n';
        html += '        @media print { body { margin: 0; } .container { box-shadow: none; } }\n';
        html += '    </style>\n';
        html += '</head>\n';
        html += '<body>\n';
        html += '    <div class="container">\n';
        html += '        <h1>' + (isRu ? 'ОТЧЕТ ОБ ОЧИСТКЕ ДАННЫХ' : 'DATA CLEANING REPORT') + '</h1>\n';

        // Metadata section
        html += '        <div class="section">\n';
        html += '            <h2>' + (isRu ? 'Метаданные' : 'Metadata') + '</h2>\n';
        html += '            <table class="info-table">\n';
        html += '                <tr><th>' + (isRu ? 'Параметр' : 'Parameter') + '</th><th>' + (isRu ? 'Значение' : 'Value') + '</th></tr>\n';
        html += '                <tr><td>' + (isRu ? 'Имя файла' : 'Filename') + '</td><td>' + (state.currentFile ? state.currentFile.name : 'unknown') + '</td></tr>\n';
        html += '                <tr><td>' + (isRu ? 'Дата создания' : 'Created') + '</td><td>' + new Date().toLocaleString() + '</td></tr>\n';
        html += '            </table>\n';
        html += '        </div>\n';

        // Parameters section
        html += '        <div class="section">\n';
        html += '            <h2>' + (isRu ? 'Параметры очистки' : 'Cleaning Parameters') + '</h2>\n';
        html += '            <table class="info-table">\n';
        html += '                <tr><th>' + (isRu ? 'Параметр' : 'Parameter') + '</th><th>' + (isRu ? 'Значение' : 'Value') + '</th></tr>\n';
        html += '                <tr><td>' + (isRu ? 'Ширина окна' : 'Window Width') + '</td><td>' + params.windowWidth + '</td></tr>\n';
        html += '                <tr><td>' + (isRu ? 'Пороговый коэффициент' : 'Threshold') + '</td><td>' + params.threshold + '</td></tr>\n';
        html += '                <tr><td>' + (isRu ? 'Размер матрицы' : 'Matrix Size') + '</td><td>' + params.matrixSize + '</td></tr>\n';
        html += '                <tr><td>' + (isRu ? 'Относительный размер' : 'Relative Size') + '</td><td>' + params.relativeSize + '</td></tr>\n';
        html += '                <tr><td>' + (isRu ? 'Метод заполнения' : 'Fill Method') + '</td><td>' + params.fillMethod + '</td></tr>\n';
        html += '            </table>\n';
        html += '        </div>\n';

        // Metrics section
        html += '        <div class="section">\n';
        html += '            <h2>' + (isRu ? 'Метрики качества' : 'Quality Metrics') + '</h2>\n';

        if (data && data.length > 0) {
            var numSeries = data[0] ? data[0].length - 1 : 0;

            html += '            <table class="metric-table">\n';
            html += '                <tr><th>' + (isRu ? 'Серия' : 'Series') + '</th><th>STDF</th><th>DF</th><th>ASNR</th><th>RMSE</th><th>R²</th><th>Pearson</th></tr>\n';

            for (var s = 0; s < numSeries; s++) {
                var stdfEl = document.getElementById('STDF_' + s);
                var dfEl = document.getElementById('DF_' + s);
                var asnrEl = document.getElementById('ASNR_' + s);
                var rmseEl = document.getElementById('RMSE_' + s);
                var r2El = document.getElementById('RSquared_' + s);
                var pearsonEl = document.getElementById('Pearson_' + s);

                var stdf = stdfEl ? parseFloat(stdfEl.textContent) : 0;
                var df = dfEl ? parseFloat(dfEl.textContent) : 0;
                var asnr = asnrEl ? parseFloat(asnrEl.textContent) : 0;
                var rmse = rmseEl ? parseFloat(rmseEl.textContent) : 0;
                var r2 = r2El ? parseFloat(r2El.textContent) : 0;
                var pearson = pearsonEl ? parseFloat(pearsonEl.textContent) : 0;

                var stdfClass = stdf < 0.01 ? 'quality-excellent' : (stdf < 0.05 ? 'quality-good' : 'quality-poor');
                var r2Class = r2 > 0.9 ? 'quality-excellent' : (r2 >= 0.7 ? 'quality-good' : 'quality-poor');
                var pearsonClass = pearson > 0.9 ? 'quality-excellent' : (pearson >= 0.7 ? 'quality-good' : 'quality-poor');

                html += '                <tr>';
                html += '<td><strong>' + (s + 1) + '</strong></td>';
                html += '<td>' + stdf.toFixed(4) + '</td>';
                html += '<td>' + df.toFixed(2) + '%</td>';
                html += '<td>' + asnr.toFixed(2) + ' dB</td>';
                html += '<td>' + rmse.toFixed(4) + '</td>';
                html += '<td class="' + r2Class + '">' + r2.toFixed(4) + '</td>';
                html += '<td class="' + pearsonClass + '">' + pearson.toFixed(4) + '</td>';
                html += '</tr>\n';
            }

            html += '            </table>\n';
        }

        html += '        </div>\n';

        // Outliers section
        if (state.outlierMasks) {
            html += '        <div class="section">\n';
            html += '            <h2>' + (isRu ? 'Статистика выбросов' : 'Outlier Statistics') + '</h2>\n';
            html += '            <table class="info-table">\n';
            html += '                <tr><th>' + (isRu ? 'Серия' : 'Series') + '</th><th>' + (isRu ? 'Количество' : 'Count') + '</th></tr>\n';

            var totalOutliers = 0;
            for (var i = 0; i < state.outlierMasks.length; i++) {
                var mask = state.outlierMasks[i];
                var count = 0;
                for (var j = 0; j < mask.length; j++) {
                    if (mask[j] === 1) count++;
                }
                totalOutliers += count;
                html += '                <tr><td>' + (isRu ? 'Серия ' : 'Series ') + (i + 1) + '</td><td>' + count + '</td></tr>\n';
            }

            html += '                <tr><td><strong>' + (isRu ? 'Всего' : 'Total') + '</strong></td><td><strong>' + totalOutliers + '</strong></td></tr>\n';
            html += '            </table>\n';
            html += '        </div>\n';
        }

        // Charts section
        html += '        <div class="section">\n';
        html += '            <h2>' + (isRu ? 'Визуализация' : 'Visualization') + '</h2>\n';
        if (dataChartImage) {
            html += '            <div class="chart-container">\n';
            html += '                <h3>' + (isRu ? 'Данные' : 'Data Chart') + '</h3>\n';
            html += '                <img src="' + dataChartImage + '" alt="Data Chart">\n';
            html += '            </div>\n';
        }
        if (heatmapImage) {
            html += '            <div class="chart-container">\n';
            html += '                <h3>' + (isRu ? 'Карта параметров' : 'Parameter Map') + '</h3>\n';
            html += '                <img src="' + heatmapImage + '" alt="Parameter Map">\n';
            html += '            </div>\n';
        }
        html += '        </div>\n';

        // Footer
        html += '        <div class="footer">\n';
        html += '            <p>ОТК-001 /// СИСТЕМА ОЧИСТКИ ДАННЫХ ВРЕМЕННЫХ РЯДОВ /// ODC-001 Time Series Data Cleaning System</p>\n';
        html += '            <p>' + (isRu ? 'Разработчик: Фунтиков В.М.' : 'Developer: Vladimir M. Funtikov') + '</p>\n';
        html += '        </div>\n';
        html += '    </div>\n';
        html += '</body>\n';
        html += '</html>\n';

        return html;
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    // Export to global scope
    global.Export = {
        exportToCSV: exportToCSV,
        exportToTXT: exportToTXT,
        downloadFile: downloadFile,
        exportData: exportData,
        generateHTMLReport: generateHTMLReport
    };

})(typeof window !== 'undefined' ? window : this);
