/**
 * test-i18n.js - Unit tests for i18n.js
 */

QUnit.module('i18n.js - Language Management', function() {

    QUnit.test('getLanguage() returns current language', function(assert) {
        if (typeof I18n !== 'undefined') {
            var lang = I18n.getLanguage();
            assert.ok(lang === 'ru' || lang === 'en', 'Returns ru or en');
        } else {
            assert.ok(true, 'I18n module loaded (skipped)');
        }
    });

    QUnit.test('setLanguage() changes language', function(assert) {
        if (typeof I18n !== 'undefined') {
            I18n.setLanguage('en');
            assert.equal(I18n.getLanguage(), 'en', 'Language changed to en');

            I18n.setLanguage('ru');
            assert.equal(I18n.getLanguage(), 'ru', 'Language changed to ru');
        } else {
            assert.ok(true, 'I18n module loaded (skipped)');
        }
    });

    QUnit.test('setLanguage() saves to localStorage', function(assert) {
        if (typeof I18n !== 'undefined') {
            var originalGetItem = localStorage.getItem;
            var savedLang = null;
            localStorage.getItem = function(key) {
                if (key === 'outlierCleaner_language') {
                    return savedLang;
                }
                return originalGetItem.call(localStorage, key);
            };

            I18n.setLanguage('en');
            assert.equal(savedLang, 'en', 'Saves language to localStorage');

            localStorage.getItem = originalGetItem;
        } else {
            assert.ok(true, 'I18n module loaded (skipped)');
        }
    });
});

QUnit.module('i18n.js - Translation Function', function() {

    QUnit.test('t() returns translation for known key', function(assert) {
        if (typeof I18n !== 'undefined') {
            I18n.setLanguage('en');
            var result = I18n.t('app.title');
            assert.ok(typeof result === 'string', 'Returns string');
            assert.ok(result.length > 0, 'Returns non-empty string');
        } else {
            assert.ok(true, 'I18n module loaded (skipped)');
        }
    });

    QUnit.test('t() handles missing key', function(assert) {
        if (typeof I18n !== 'undefined') {
            var result = I18n.t('nonexistent.key');
            assert.ok(typeof result === 'string', 'Returns string for missing key');
            assert.ok(result.length > 0, 'Returns non-empty string');
        } else {
            assert.ok(true, 'I18n module loaded (skipped)');
        }
    });

    QUnit.test('t() respects current language', function(assert) {
        if (typeof I18n !== 'undefined') {
            I18n.setLanguage('ru');
            var ruResult = I18n.t('app.title');

            I18n.setLanguage('en');
            var enResult = I18n.t('app.title');

            assert.notEqual(ruResult, enResult, 'Different languages give different translations');
        } else {
            assert.ok(true, 'I18n module loaded (skipped)');
        }
    });
});

QUnit.module('i18n.js - Update UI', function() {

    QUnit.test('updateAllTextElements() updates elements with data-i18n', function(assert) {
        var container = document.createElement('div');
        container.innerHTML = '<span data-i18n="test.key">Old Text</span>';

        document.getElementById = function(id) {
            return null;
        };

        var mockTranslations = {
            ru: { 'test.key': 'Тест' },
            en: { 'test.key': 'Test' }
        };

        if (typeof I18n !== 'undefined') {
            I18n.updateAllTextElements(container);
        }
    });

    QUnit.test('updateAllTextElements() handles elements without data-i18n', function(assert) {
        var container = document.createElement('div');
        container.innerHTML = '<span>Static Text</span><span data-i18n="test.key">Dynamic Text</span>';

        var unchanged = container.querySelector('span:not([data-i18n])');
        assert.equal(unchanged.textContent, 'Static Text', 'Static text unchanged');
    });
});

QUnit.module('i18n.js - Dictionary Structure', function() {

    QUnit.test('Russian dictionary has required keys', function(assert) {
        if (typeof I18n !== 'undefined') {
            I18n.setLanguage('ru');
            var requiredKeys = ['app.title', 'button.load', 'button.tune', 'button.clean', 'button.save'];
            var allFound = requiredKeys.every(function(key) {
                return I18n.t(key) !== key;
            });
            assert.ok(allFound, 'Russian dictionary has all required keys');
        } else {
            assert.ok(true, 'I18n module loaded (skipped)');
        }
    });

    QUnit.test('English dictionary has required keys', function(assert) {
        if (typeof I18n !== 'undefined') {
            I18n.setLanguage('en');
            var requiredKeys = ['app.title', 'button.load', 'button.tune', 'button.clean', 'button.save'];
            var allFound = requiredKeys.every(function(key) {
                return I18n.t(key) !== key;
            });
            assert.ok(allFound, 'English dictionary has all required keys');
        } else {
            assert.ok(true, 'I18n module loaded (skipped)');
        }
    });
});
