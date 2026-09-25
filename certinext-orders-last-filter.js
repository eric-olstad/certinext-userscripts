// ==UserScript==
// @name         CertiNext – Orders Last Filter
// @namespace    https://us.certinext.io/
// @version      1.16.0
// @description  Remembers and restores the last Orders list filter after viewing an order.
// @match        https://us.certinext.io/manageOrders*
// @match        https://sandbox-us.certinext.io/manageOrders*
// @downloadURL  https://raw.githubusercontent.com/eric-olstad/certinext-userscripts/main/certinext-orders-last-filter.js
// @updateURL    https://raw.githubusercontent.com/eric-olstad/certinext-userscripts/main/certinext-orders-last-filter.js
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'certinext-orders-last-filter:' + window.location.host;
    const FILTER_SELECTOR = '#advanceSearchOrdDiv';
    const pageWindow = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
    let restoring = false;
    let restorePending = false;
    let restored = false;
    let saveTimer = null;
    let initialized = false;
    let hookedGetOrderDetails = null;
    let originalGetOrderDetails = null;

    function installInitialLoadHook() {
        const current = pageWindow.getOrderDetails;
        if (typeof current !== 'function'
            || current === hookedGetOrderDetails
            || current === originalGetOrderDetails) return;

        const original = current;
        const wrapped = function () {
            const searchType = arguments[0];
            const isInitialRequest = searchType === 'onload'
                || (searchType === '0' && arguments[1] === '0');
            const shouldSuppress = isInitialRequest
                && isOrdersTab()
                && isUsableFilterState(loadFilterState());

            if (shouldSuppress) {
                return false;
            }

            return original.apply(this, arguments);
        };

        try {
            pageWindow.getOrderDetails = wrapped;
            hookedGetOrderDetails = wrapped;
            originalGetOrderDetails = original;
        } catch (error) {
            console.warn('CertiNext Orders Last Filter: unable to hook initial Orders load', error);
        }
    }

    installInitialLoadHook();
    window.setInterval(installInitialLoadHook, 10);

    function getFilterElement() {
        return document.querySelector(FILTER_SELECTOR);
    }

    function getRows(filter) {
        return Array.from(filter.querySelectorAll('.ordSearchBoxClass'));
    }

    function readFilterState() {
        const filter = getFilterElement();
        if (!filter) return null;

        const rows = getRows(filter).map((row) => {
            const logic = row.querySelector('.logic-dropdown select');
            const column = row.querySelector('select[id^="ordColumnId"]');
            const operator = row.querySelector('select[id^="ordOperatorType"]');
            const valueElement = row.querySelector('#ordersId' + row.dataset.rowCount)
                || row.querySelector('input.botValueWidth, select.botValueWidth, input[id^="ordersId"]');
            const selects = {};
            const inputs = {};

            row.querySelectorAll('select').forEach((select) => {
                if (!select.id) return;
                selects[select.id] = select.multiple
                    ? Array.from(select.selectedOptions).map((option) => option.value)
                    : select.value;
            });
            row.querySelectorAll('input').forEach((input) => {
                if (input.id) inputs[input.id] = input.value;
            });

            return {
                logic: logic ? logic.value : '',
                column: column ? column.value : '0',
                operator: operator ? operator.value : '0',
                value: valueElement
                    ? (valueElement.multiple
                        ? Array.from(valueElement.selectedOptions).map((option) => option.value).join(',')
                        : valueElement.value)
                    : '',
                selects: selects,
                inputs: inputs
            };
        });

        return { rows: rows };
    }

    function saveFilterState() {
        if (restoring || restorePending) return;
        const state = readFilterState();
        if (!isUsableFilterState(state)) {
            clearFilterState();
            return;
        }

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.warn('CertiNext Orders Last Filter: unable to save browser fallback state', error);
        }

        try {
            window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.warn('CertiNext Orders Last Filter: unable to save session state', error);
        }

        try {
            GM_setValue(STORAGE_KEY, state);
        } catch (error) {
            console.warn('CertiNext Orders Last Filter: unable to save filter state', error);
        }
    }

    function clearFilterState() {
        restorePending = false;
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn('CertiNext Orders Last Filter: unable to clear browser fallback state', error);
        }

        try {
            window.sessionStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.warn('CertiNext Orders Last Filter: unable to clear session state', error);
        }

        try {
            GM_deleteValue(STORAGE_KEY);
        } catch (error) {
            console.warn('CertiNext Orders Last Filter: unable to clear filter state', error);
        }
    }

    function scheduleSave() {
        if (restoring || saveTimer) return;
        saveTimer = window.setTimeout(() => {
            saveTimer = null;
            saveFilterState();
        }, 100);
    }

    function loadFilterState() {
        try {
            const sessionState = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
            if (isUsableFilterState(sessionState)) return sessionState;
        } catch (error) {
            console.warn('CertiNext Orders Last Filter: unable to load session state', error);
        }

        try {
            const localState = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
            if (isUsableFilterState(localState)) return localState;
        } catch (error) {
            console.warn('CertiNext Orders Last Filter: unable to load browser fallback state', error);
        }

        try {
            const state = GM_getValue(STORAGE_KEY, null);
            return isUsableFilterState(state) ? state : null;
        } catch (error) {
            console.warn('CertiNext Orders Last Filter: unable to load filter state', error);
            return null;
        }
    }

    function isUsableFilterState(state) {
        if (!state || !Array.isArray(state.rows) || !state.rows.length) return false;

        return state.rows.some((row) => {
            const column = row.column
                || (row.selects && Object.keys(row.selects)
                    .find((id) => id.indexOf('ordColumnId') === 0)
                    ? row.selects[Object.keys(row.selects)
                        .find((id) => id.indexOf('ordColumnId') === 0)]
                    : '');
            const operator = row.operator
                || (row.selects && Object.keys(row.selects)
                    .find((id) => id.indexOf('ordOperatorType') === 0)
                    ? row.selects[Object.keys(row.selects)
                        .find((id) => id.indexOf('ordOperatorType') === 0)]
                    : '');
            const inputValues = row.inputs ? Object.values(row.inputs) : [];
            const selectValues = row.selects
                ? Object.entries(row.selects)
                    .filter(([id]) => id.indexOf('ordColumnId') !== 0
                        && id.indexOf('ordOperatorType') !== 0)
                    .map(([, value]) => value)
                    .flat()
                : [];
            const hasValue = Boolean(row.value)
                || inputValues.some((value) => Boolean(value))
                || selectValues.some((value) => Boolean(value) && value !== '0');

            return Boolean(column && column !== '0' && operator && operator !== '0' && hasValue);
        });
    }

    function isOrdersTab() {
        return window.location.pathname === '/manageOrders'
            && (!window.location.hash || window.location.hash === '#orders');
    }

    function wait(milliseconds) {
        return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    }

    function setValue(element, value) {
        if (!element) return;
        if (pageWindow.jQuery && pageWindow.jQuery(element).hasClass('select2-hidden-accessible')) {
            pageWindow.jQuery(element).val(value).trigger('change');
            return;
        }
        if (element.multiple) {
            const values = Array.isArray(value) ? value : [value];
            Array.from(element.options).forEach((option) => {
                option.selected = values.indexOf(option.value) !== -1;
            });
        } else {
            element.value = value;
        }
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function getFilterValueText(row) {
        const count = row.dataset.rowCount;
        const valueElement = row.querySelector('#ordersId' + count)
            || row.querySelector('input.botValueWidth, select.botValueWidth');
        if (!valueElement) return '';

        if (valueElement.multiple) {
            return Array.from(valueElement.selectedOptions)
                .map((option) => option.textContent.trim())
                .filter(Boolean)
                .join(', ');
        }
        return valueElement.value || '';
    }

    function buildSearchHistoryBar() {
        const bar = document.querySelector('#manageOrdersSearchHistoryBar');
        const filter = getFilterElement();
        if (!bar || !filter) return;

        if (!bar.innerHTML.trim()) {
            const clear = document.createElement('span');
            clear.className = 'badge bg-primary';
            clear.innerHTML = '<i class="fa fa-redo-alt"></i> Clear All';
            clear.addEventListener('click', () => {
                if (typeof pageWindow.clearOrdSortAndSearchFilter === 'function') {
                    pageWindow.clearOrdSortAndSearchFilter('ordersDetail');
                }
            });
            bar.appendChild(clear);

            getRows(filter).forEach((row) => {
                const column = row.querySelector('select[id^="ordColumnId"]');
                const valueText = getFilterValueText(row);
                if (!column || !column.value || column.value === '0' || !valueText) return;

                const badge = document.createElement('span');
                const count = row.dataset.rowCount;
                const label = column.options[column.selectedIndex]
                    ? column.options[column.selectedIndex].textContent.trim()
                    : column.value;
                badge.className = 'badge badge-outline';
                badge.id = 'removeOrdReportSearchBoxLabel' + count;
                badge.innerHTML = '<span></span> <i class="fa fa-times"></i>';
                badge.querySelector('span').textContent = label + ': [' + valueText + ']';
                badge.querySelector('i').addEventListener('click', () => {
                    if (typeof pageWindow.removeRowOrdSingleRow === 'function') {
                        pageWindow.removeRowOrdSingleRow(column.value, 'ordSearchTab', count);
                    }
                });
                bar.appendChild(badge);
            });
        }

        bar.style.display = '';
    }

    function scheduleSearchHistoryBar() {
        [0, 250, 750, 1500].forEach((delay) => {
            window.setTimeout(() => {
                if (isOrdersTab()) buildSearchHistoryBar();
            }, delay);
        });
    }

    async function restoreFilterState(state) {
        const filter = getFilterElement();
        if (!filter || !state || !state.rows.length) return;

        restoring = true;
        try {
            let attempts = 0;
            while (getRows(filter).length < state.rows.length
                && typeof pageWindow.addOrdNextSearch === 'function'
                && attempts < 40) {
                pageWindow.addOrdNextSearch('ordSearchTab');
                attempts += 1;
                await wait(50);
            }

            const rows = getRows(filter);
            if (rows.length < state.rows.length) return;

            for (let i = 0; i < state.rows.length; i += 1) {
                const savedRow = state.rows[i];
                const row = rows[i];
                const logic = row.querySelector('.logic-dropdown select');
                const column = row.querySelector('select[id^="ordColumnId"]');
                const operator = row.querySelector('select[id^="ordOperatorType"]');
                const savedSelects = savedRow.selects || {};
                const savedInputs = savedRow.inputs || {};

                if (logic && savedRow.logic) logic.value = savedRow.logic;
                setValue(column, savedSelects[column ? column.id : ''] || savedRow.column || '0');
                await wait(100);

                Object.keys(savedSelects).forEach((id) => {
                    if (column && id === column.id) return;
                    const select = row.querySelector('#' + id);
                    if (select) setValue(select, savedSelects[id]);
                });
                if (!Object.keys(savedSelects).length) {
                    setValue(operator, savedRow.operator || '0');
                }

                Object.keys(savedInputs).forEach((id) => {
                    const input = row.querySelector('#' + id);
                    if (!input) return;
                    input.value = savedInputs[id];
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });
                if (!Object.keys(savedInputs).length && savedRow.value) {
                    const value = row.querySelector('input.botValueWidth, select.botValueWidth, input[id^="ordersId"]');
                    if (value) setValue(value, savedRow.value);
                }
            }

            await wait(100);
            if (typeof pageWindow.getOrderDetails === 'function') {
                pageWindow.getOrderDetails('advanceSearch', '1');
            } else {
                const filterButton = filter.querySelector('input[type="button"][value="Filter"]');
                if (filterButton) filterButton.click();
            }
            scheduleSearchHistoryBar();
        } finally {
            restoring = false;
            restorePending = false;
        }
    }

    function restoreWhenReady(state, attempt) {
        if (restored || !isOrdersTab() || !state) return;
        restorePending = true;

        const filter = getFilterElement();
        if (document.readyState !== 'complete'
            || !filter
            || typeof pageWindow.addOrdNextSearch !== 'function'
            || typeof pageWindow.getOrderDetails !== 'function') {
            if (attempt < 80) {
                window.setTimeout(() => restoreWhenReady(state, attempt + 1), 100);
            } else {
                restorePending = false;
            }
            return;
        }

        restored = true;
        restoreFilterState(state);
    }

    function restoreAfterNavigation() {
        if (restoring) return;
        restored = false;
        restorePending = false;
        restoreWhenReady(loadFilterState(), 0);
    }

    function restoreAfterOrdersTabSwitch() {
        if (!isOrdersTab() || restoring) return;
        restored = false;
        restorePending = false;
        window.setTimeout(() => {
            restoreWhenReady(loadFilterState(), 0);
        }, 50);
    }

    const filterObserver = new MutationObserver(scheduleSave);

    function initialize() {
        if (initialized) return;
        if (document.readyState !== 'complete') {
            window.setTimeout(initialize, 100);
            return;
        }
        const filter = getFilterElement();
        if (!filter) {
            window.setTimeout(initialize, 100);
            return;
        }

        initialized = true;
        filterObserver.observe(filter, { childList: true, subtree: true });
        filter.addEventListener('input', scheduleSave, true);
        filter.addEventListener('change', scheduleSave, true);

        restoreWhenReady(loadFilterState(), 0);
    }

    document.addEventListener('click', (event) => {
        const ordersTab = event.target.closest('#ordersTab');
        const target = event.target.closest('button.viewBtn');
        const filterButton = event.target.closest(
            '#advanceSearchOrdDiv input[type="button"][value="Filter"]'
        );
        const removeAllButton = event.target.closest(
            '#advanceSearchOrdDiv a[onclick*="removeOrdAllSearch"]'
        );
        if (target) {
            saveFilterState();
        } else if (filterButton) {
            window.setTimeout(saveFilterState, 0);
        }
        if (removeAllButton) clearFilterState();
        if (ordersTab) restoreAfterOrdersTabSwitch();
    }, true);
    window.addEventListener('pagehide', saveFilterState);
    window.addEventListener('beforeunload', saveFilterState);
    window.addEventListener('pageshow', restoreAfterNavigation);
    document.addEventListener('DOMContentLoaded', initialize);
    window.addEventListener('load', initialize);
    if (pageWindow.jQuery) {
        pageWindow.jQuery(document).on(
            'shown.bs.tab.certinextOrdersLastFilter',
            '#ordersTab',
            restoreAfterOrdersTabSwitch
        );
    }
    initialize();
})();
