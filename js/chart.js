/**
 * chart.js - Chart.js configuration
 * Handles chart creation, updates, and configuration
 */

(function(global) {
    'use strict';

    // ============================================================================
    // CHART STATE
    // ============================================================================

    var dataChart = null;
    var heatmapChart = null;

    // ============================================================================
    // CHART CREATION
    // ============================================================================

    /**
     * Initialize main data chart
     * @param {string} canvasId - Canvas element ID
     * @returns {Chart} Chart instance
     */
    function initDataChart(canvasId) {
        var ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        return new Chart(ctx, {
            type: 'line',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#00ff00',
                            font: {
                                family: 'Courier New, monospace'
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(0, 20, 40, 0.95)',
                        titleColor: '#00ff00',
                        bodyColor: '#00ff00',
                        borderColor: '#00ff00',
                        borderWidth: 1,
                        titleFont: { family: 'Courier New, monospace' },
                        bodyFont: { family: 'Courier New, monospace' }
                    },
                    zoom: {
                        zoom: {
                            wheel: { enabled: true },
                            pinch: { enabled: true },
                            mode: 'x',
                        },
                        pan: {
                            enabled: true,
                            mode: 'x',
                        },
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time / Index',
                            color: '#00ff00'
                        },
                        grid: {
                            color: 'rgba(0, 255, 0, 0.2)'
                        },
                        ticks: { color: '#00ff00' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Signal Value',
                            color: '#00ff00'
                        },
                        grid: {
                            color: 'rgba(0, 255, 0, 0.2)'
                        },
                        ticks: { color: '#00ff00' }
                    }
                }
            }
        });
    }

    /**
     * Update chart data
     * @param {Chart} chart - Chart instance
     * @param {Object} data - Data object with original and cleaned datasets
     */
    function updateChartData(chart, data) {
        if (!chart) return;

        chart.data.datasets = data.datasets || [];
        chart.update();
    }

    /**
     * Set chart visibility mode
     * @param {Chart} chart - Chart instance
     * @param {string} mode - 'original', 'cleaned', or 'both'
     */
    function setChartVisibility(chart, mode) {
        if (!chart) return;

        chart.data.datasets.forEach(function(dataset, index) {
            var isOriginal = dataset.label.includes('Original');
            var isCleaned = dataset.label.includes('Cleaned');

            switch (mode) {
                case 'original':
                    dataset.hidden = !isOriginal;
                    break;
                case 'cleaned':
                    dataset.hidden = !isCleaned;
                    break;
                case 'both':
                default:
                    dataset.hidden = false;
                    break;
            }
        });

        chart.update();
    }

    /**
     * Reset chart zoom
     * @param {Chart} chart - Chart instance
     */
    function resetZoom(chart) {
        if (chart && chart.resetZoom) {
            chart.resetZoom();
        }
    }

    /**
     * Destroy chart instance
     * @param {Chart} chart - Chart instance
     */
    function destroyChart(chart) {
        if (chart) {
            chart.destroy();
        }
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    // Export to global scope
    global.ChartModule = {
        initDataChart: initDataChart,
        updateChartData: updateChartData,
        setChartVisibility: setChartVisibility,
        resetZoom: resetZoom,
        destroyChart: destroyChart,
        getDataChart: function() { return dataChart; },
        setDataChart: function(chart) { dataChart = chart; },
        getHeatmapChart: function() { return heatmapChart; },
        setHeatmapChart: function(chart) { heatmapChart = chart; }
    };

})(typeof window !== 'undefined' ? window : this);
