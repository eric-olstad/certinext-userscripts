// ==UserScript==
// @name         CertiNext – Product Filters (Groups)
// @namespace    https://us.certinext.io/
// @version      1.2.1
// @description  Adds persistent tri-mode product filters to the CertiNext Groups product selector.
// @match        https://us.certinext.io/addGroups*
// @match        https://sandbox-us.certinext.io/addGroups*
// @downloadURL   https://raw.githubusercontent.com/eric-olstad/certinext-userscripts/main/certinext-ov-filter.user.js
// @updateURL     https://raw.githubusercontent.com/eric-olstad/certinext-userscripts/main/certinext-ov-filter.user.js
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    const FILTERS = ['DV', 'OV', 'IGTF', 'Wildcard'];
    const SELECTOR = '#productSelect';
    const WRAPPER_CLASS = 'certinext-groups-product-filters';
    const STORAGE_KEY = 'productFilterStates';
    const DEFAULT_STATES = { DV: 'excluded', OV: 'unchecked', IGTF: 'excluded', Wildcard: 'unchecked' };

    function loadFilterStates() {
        const saved = GM_getValue(STORAGE_KEY, null);
        return saved && typeof saved === 'object' ? Object.assign({}, DEFAULT_STATES, saved) : Object.assign({}, DEFAULT_STATES);
    }

    function saveFilterStates(wrapper) {
        const states = {};
        const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
        for (let i = 0; i < checkboxes.length; i += 1) states[checkboxes[i].value] = checkboxes[i].dataset.state || 'unchecked';
        GM_setValue(STORAGE_KEY, states);
    }

    function setCheckboxState(checkbox, state) {
        checkbox.dataset.state = state;
        checkbox.checked = state === 'included';
        checkbox.indeterminate = state === 'excluded';
        checkbox.setAttribute('aria-checked', state === 'included' ? 'true' : state === 'excluded' ? 'mixed' : 'false');
    }

    function matchesFilter(text, filter) {
        return new RegExp(`\\b${filter}\\b`, 'i').test(text);
    }

    function applyProductFilters(resultsList, wrapper) {
        const includedFilters = [];
        const excludedFilters = [];
        const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
        for (let i = 0; i < checkboxes.length; i += 1) {
            if (checkboxes[i].dataset.state === 'included') includedFilters.push(checkboxes[i].value);
            if (checkboxes[i].dataset.state === 'excluded') excludedFilters.push(checkboxes[i].value);
        }

        const showAll = includedFilters.length === 0;
        const options = resultsList.querySelectorAll('li.select2-results__option');
        for (let i = 0; i < options.length; i += 1) {
            const option = options[i];
            if (!option.id.includes('select2-productSelect-result-')) continue;
            const text = option.textContent.trim();
            const matchesIncluded = showAll || includedFilters.some((filter) => matchesFilter(text, filter));
            const matchesExcluded = excludedFilters.some((filter) => matchesFilter(text, filter));
            const showOption = matchesIncluded && !matchesExcluded;
            option.hidden = !showOption;
            option.style.display = showOption ? '' : 'none';
        }
    }

    function createFilterControls(select) {
        const parent = select.parentElement;
        const existing = parent.querySelector(`.${WRAPPER_CLASS}`);
        if (existing) return existing;

        const wrapper = document.createElement('div');
        wrapper.className = WRAPPER_CLASS;
        wrapper.setAttribute('role', 'group');
        wrapper.setAttribute('aria-label', 'Product filters');
        wrapper.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin-bottom:8px;align-items:center';

        const heading = document.createElement('span');
        heading.textContent = 'Filter products:';
        heading.style.fontWeight = '600';
        wrapper.appendChild(heading);

        const savedStates = loadFilterStates();
        FILTERS.forEach((filter) => {
            const label = document.createElement('label');
            label.style.cssText = 'display:inline-flex;gap:4px;align-items:center;cursor:pointer';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = filter;
            checkbox.setAttribute('aria-label', `${filter} product filter`);
            checkbox.title = 'Click: include; click again: exclude; click again: clear';
            setCheckboxState(checkbox, savedStates[filter] || 'unchecked');
            checkbox.addEventListener('change', () => {
                const states = ['unchecked', 'included', 'excluded'];
                const currentState = checkbox.dataset.state || 'unchecked';
                setCheckboxState(checkbox, states[(states.indexOf(currentState) + 1) % states.length]);
                saveFilterStates(wrapper);
                applyCurrentResults();
            });
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(filter));
            wrapper.appendChild(label);
        });

        const select2Container = parent.querySelector('.select2-container');
        parent.insertBefore(wrapper, select2Container || select);
        return wrapper;
    }

    let activeSelect = null;
    let activeWrapper = null;
    let activeResultsList = null;
    let resultsObserver = null;
    let scheduled = false;

    function findResultsList() {
        const lists = document.querySelectorAll('ul.select2-results__options');
        for (let i = 0; i < lists.length; i += 1) {
            if (lists[i].querySelector('[id*="select2-productSelect-result-"]')) return lists[i];
        }
        return null;
    }

    function applyCurrentResults() {
        scheduled = false;
        if (activeResultsList && activeWrapper) applyProductFilters(activeResultsList, activeWrapper);
    }

    function scheduleApply() {
        if (scheduled) return;
        scheduled = true;
        window.setTimeout(applyCurrentResults, 0);
    }

    function enhance() {
        const select = document.querySelector(SELECTOR);
        if (!select || !select.parentElement) return;
        let targetChanged = false;
        if (select !== activeSelect) {
            if (resultsObserver) resultsObserver.disconnect();
            activeSelect = select;
            activeWrapper = createFilterControls(select);
            targetChanged = true;
        }

        const resultsList = findResultsList();
        if (resultsList && resultsList !== activeResultsList) {
            if (resultsObserver) resultsObserver.disconnect();
            activeResultsList = resultsList;
            resultsObserver = new MutationObserver(scheduleApply);
            resultsObserver.observe(resultsList, { childList: true, subtree: true });
            targetChanged = true;
        }
        if (targetChanged && activeResultsList && activeWrapper) applyProductFilters(activeResultsList, activeWrapper);
    }

    const pageObserver = new MutationObserver(enhance);
    pageObserver.observe(document.body, { childList: true, subtree: true });
    enhance();
})();
