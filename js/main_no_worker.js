/**
 * main_no_worker.js - Backup version that runs without Web Worker
 * Use this only for testing when Web Worker is not available
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const appState = {
    originalData: null,
    cleanedData: null,
    currentFile: null,
    params: {
        windowWidth: 40,
        threshold: 1.4,
        matrixSize: 16,
        relativeSize: 4,
        fillMethod: 'nearest'
    },
    optimalParams: null,
    dataChart: null,
    NTF: null,
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    initializeCharts();
    log('Внимание: Работает без Web Worker. Интерфейс может зависать при больших данных!', 'warning');
});

/**
 * Initialize Chart.js (same as main.js)
 */
function initializeCharts() {
    var ctx = document.getElementById('dataChart').getContext('2d');

    Chart.defaults.color = '#00ff88';
    Chart.defaults.borderColor = '#008844';

    appState.dataChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            elements: {
                point: {
                    radius: 0,
                    hitRadius: 10,
                    hoverRadius: 4
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Время / Индекс',
                        color: '#00aaff'
                    },
                    grid: {
                        color: '#003322'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Значение сигнала',
                        color: '#00aaff'
                    },
                    grid: {
                        color: '#003322'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#00ff88',
                        font: {
                            family: 'Consolas, monospace'
                        }
                    }
                }
            }
        }
    });
}

/**
 * Initialize UI
 */
function initializeUI() {
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    document.getElementById('advancedToggle').addEventListener('change', toggleAdvancedSettings);

    // Sliders
    const sliders = ['windowWidth', 'threshold', 'matrixSize', 'relativeSize'];
    sliders.forEach(function(id) {
        var slider = document.getElementById(id);
        var valueDisplay = document.getElementById(id + 'Value');
        if (slider && valueDisplay) {
            slider.addEventListener('input', function() {
                valueDisplay.textContent = this.value;
                if (id === 'relativeSize') {
                    appState.params.relativeSize = parseFloat(this.value);
                } else {
                    appState.params[id] = parseFloat(this.value);
                }
            });
        }
    });

    document.getElementById('fillMethod').addEventListener('change', function() {
        appState.params.fillMethod = this.value;
    });

    document.getElementById('saveRestored').addEventListener('change', function() {
        var validityWrapper = document.getElementById('validityFlagWrapper');
        if (validityWrapper) {
            validityWrapper.style.opacity = this.checked ? '1' : '0.5';
        }
    });

    document.getElementById('loadBtn').addEventListener('click', loadData);
    document.getElementById('tuneBtn').addEventListener('click', autoTune);
    document.getElementById('cleanBtn').addEventListener('click', cleanData);
    document.getElementById('saveBtn').addEventListener('click', saveData);

    document.querySelectorAll('.tab-button').forEach(function(button) {
        button.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
}

// ============================================================================
// FILE HANDLING
// ============================================================================

function handleFileSelect(event) {
    var files = Array.from(event.target.files);

    if (files.length === 0) return;

    appState.batchQueue = files;
    document.getElementById('fileCount').textContent = 'Выбрано файлов: ' + files.length;

    var container = document.getElementById('selectedFiles');
    container.innerHTML = '';
    files.forEach(function(file, index) {
        var div = document.createElement('div');
        div.className = 'file-item';
        div.textContent = (index + 1) + '. ' + file.name + ' (' + formatFileSize(file.size) + ')';
        container.appendChild(div);
    });

    document.getElementById('loadBtn').disabled = false;
    log('Выбрано файлов: ' + files.length, 'info');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

function loadData() {
    if (appState.batchQueue.length === 0) {
        log('Файлы не выбраны.', 'warning');
        return;
    }

    var file = appState.batchQueue[0];
    appState.currentFile = file;

    log('Загрузка файла: ' + file.name, 'info');

    readFileContent(file).then(function(content) {
        var data = parseAsciiData(content);

        if (data.length === 0) {
            throw new Error('Файл не содержит данных');
        }

        appState.originalData = data;
        appState.cleanedData = null;

        updateFileInfo(file, data);
        updateDataChart(data, null);

        document.getElementById('tuneBtn').disabled = false;
        document.getElementById('cleanBtn').disabled = true;
        document.getElementById('saveBtn').disabled = true;

        log('Файл загружен: ' + data.length + ' точек, ' + (data[0].length - 1) + ' серий', 'success');
        log('ВНИМАНИЕ: Без Web Worker операция очистки может занять время!', 'warning');

    }).catch(function(error) {
        log('Ошибка загрузки файла: ' + error.message, 'error');
        console.error('File loading error:', error);
    });
}

function readFileContent(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function(e) {
            reject(e);
        };
        reader.readAsText(file);
    });
}

function parseAsciiData(content) {
    var lines = content.trim().split('\n');
    var data = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmed = line.trim();

        if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('%')) {
            continue;
        }

        var values = trimmed.split(/[\s,]+/)
            .map(function(v) { return parseFloat(v); })
            .filter(function(v) { return !isNaN(v); });

        if (values.length > 0) {
            data.push(values);
        }
    }

    if (data.length > 0 && data.every(function(row) { return row.length === 1; })) {
        for (var i = 0; i < data.length; i++) {
            data[i] = [i, data[i][0]];
        }
    }

    return data;
}

// ============================================================================
// OPERATIONS (Without Worker - runs on main thread)
// ============================================================================

function autoTune() {
    if (!appState.originalData) {
        log('Сначала загрузите данные', 'warning');
        return;
    }

    log('Автоподбор без Worker может занять много времени...', 'warning');
    log('Рекомендуется использовать файлы до 1000 точек', 'warning');

    setTimeout(function() {
        log('Автоподбор параметров без Worker не реализован. Используйте сервер.', 'error');
    }, 100);
}

function cleanData() {
    if (!appState.originalData) {
        log('Сначала загрузите данные', 'warning');
        return;
    }

    log('Очистка без Worker не реализована. Используйте сервер.', 'error');
}

function saveData() {
    log('Сохранение без Worker не реализовано.', 'error');
}

// ============================================================================
// UI UPDATES
// ============================================================================

function updateFileInfo(file, data) {
    document.getElementById('infoFilename').textContent = file.name;
    document.getElementById('infoSize').textContent = formatFileSize(file.size);
    document.getElementById('infoPoints').textContent = data.length;
    document.getElementById('infoSeries').textContent = data[0].length - 1;
    document.getElementById('infoOptWindow').textContent = '--';
    document.getElementById('infoOptThreshold').textContent = '--';
}

function updateDataChart(original, cleaned) {
    var chart = appState.dataChart;
    if (!chart) return;

    document.getElementById('noDataMessage').classList.add('hidden');

    var datasets = [];
    var maxPointsPerSeries = 2000;

    function downsampleData(data, maxPoints) {
        if (data.length <= maxPoints) return data;
        var step = Math.ceil(data.length / maxPoints);
        var result = [];
        for (var i = 0; i < data.length; i += step) {
            result.push(data[i]);
        }
        return result;
    }

    if (original && original.length > 0) {
        var numSeries = original[0].length - 1;

        for (var s = 0; s < numSeries; s++) {
            var seriesIndex = s + 1;
            var data = original.map(function(row, i) {
                return {
                    x: row[0],
                    y: row[seriesIndex]
                };
            });

            data = downsampleData(data, maxPointsPerSeries);

            datasets.push({
                label: 'Исходные - Серия ' + (s + 1),
                data: data,
                borderColor: '#ff4444',
                backgroundColor: 'transparent',
                borderWidth: 1,
                pointRadius: 0,
                pointHoverRadius: 3,
                tension: 0
            });
        }
    }

    if (cleaned && cleaned.length > 0) {
        var numSeries = cleaned[0].length - 1;

        for (var s = 0; s < numSeries; s++) {
            var seriesIndex = s + 1;
            var data = cleaned.map(function(row, i) {
                return {
                    x: row[0],
                    y: row[seriesIndex]
                };
            });

            data = downsampleData(data, maxPointsPerSeries);

            datasets.push({
                label: 'Очищенные - Серия ' + (s + 1),
                data: data,
                borderColor: '#00ff88',
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 3,
                tension: 0.1
            });
        }
    }

    chart.data.datasets = datasets;
    chart.update('none');
}

function toggleAdvancedSettings() {
    var settings = document.getElementById('advancedSettings');
    var isVisible = document.getElementById('advancedToggle').checked;

    if (isVisible) {
        settings.classList.remove('hidden');
        log('Расширенные настройки отображены', 'info');
    } else {
        settings.classList.add('hidden');
        log('Расширенные настройки скрыты', 'info');
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.tab-pane').forEach(function(pane) {
        pane.classList.remove('active');
    });

    var targetPane = document.getElementById(tabName + 'Tab');
    if (targetPane) {
        targetPane.classList.add('active');
    }
}

function log(message, type) {
    type = type || 'info';
    var logArea = document.getElementById('logArea');
    var now = new Date();
    var time = now.toTimeString().split(' ')[0];

    var entry = document.createElement('div');
    entry.className = 'log-entry log-' + type;
    entry.innerHTML = '<span class="log-time">' + time + '</span><span class="log-message">' + message + '</span>';

    logArea.appendChild(entry);
    logArea.scrollTop = logArea.scrollHeight;
}
