// ==UserScript==
// @name         CertiNext – Product Filters
// @namespace    https://us.certinext.io/
// @version      1.3.0
// @description  Adds dynamic DV, OV, IGTF, and Wildcard filters to the CertiNext product selector.
// @match        https://us.certinext.io/acmeApi*
// @downloadURL   https://raw.githubusercontent.com/eric-olstad/certinext-userscripts/main/certinext-product-filters.user.js
// @updateURL     https://raw.githubusercontent.com/eric-olstad/certinext-userscripts/main/certinext-product-filters.user.js
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';

    const FILTERS = ['DV', 'OV', 'IGTF', 'Wildcard'];
    const SELECTOR = '#masterProductID';
    const WRAPPER_CLASS = 'certinext-product-filters';
    const STORAGE_KEY = 'productFilterStates';
    const DEFAULT_STATES = {
        DV: 'excluded',
        OV: 'unchecked',
        IGTF: 'excluded',
        Wildcard: 'unchecked'
    };

    function loadFilterStates() {
        const saved = GM_getValue(STORAGE_KEY, null);
        return saved && typeof saved === 'object'
            ? Object.assign({}, DEFAULT_STATES, saved)
            : Object.assign({}, DEFAULT_STATES);
    }

    function saveFilterStates(wrapper) {
        const states = {};
        const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
        for (let i = 0; i < checkboxes.length; i += 1) {
            states[checkboxes[i].value] = checkboxes[i].dataset.state || 'unchecked';
        }
        GM_setValue(STORAGE_KEY, states);
    }

    function setCheckboxState(checkbox, state) {
        checkbox.dataset.state = state;
        checkbox.checked = state === 'included';
        checkbox.indeterminate = state === 'excluded';
        checkbox.setAttribute(
            'aria-checked',
            state === 'included' ? 'true' : state === 'excluded' ? 'mixed' : 'false'
        );
    }

    function matchesFilter(optionText, filter) {
        return new RegExp(`\\b${filter}\\b`, 'i').test(optionText);
    }

    function applyProductFilters(select, wrapper) {
        const includedFilters = [];
        const excludedFilters = [];
        const checkboxes = wrapper.querySelectorAll('input[type="checkbox"]');
        for (let i = 0; i < checkboxes.length; i += 1) {
            const checkbox = checkboxes[i];
            if (checkbox.dataset.state === 'included') includedFilters.push(checkbox.value);
            if (checkbox.dataset.state === 'excluded') excludedFilters.push(checkbox.value);
        }
        const showAll = includedFilters.length === 0;
        const options = select.options;

        for (let i = 0; i < options.length; i += 1) {
            const option = options[i];
            const isPlaceholder = option.value === '0' || option.disabled;
            const optionText = option.textContent.trim();
            const matchesIncluded = showAll || includedFilters.some((filter) =>
                matchesFilter(optionText, filter)
            );
            const matchesExcluded = excludedFilters.some((filter) =>
                matchesFilter(optionText, filter)
            );
            const showOption = isPlaceholder || (matchesIncluded && !matchesExcluded);

            const shouldHide = !showOption;
            if (option.hidden !== shouldHide) option.hidden = shouldHide;
            const display = showOption ? '' : 'none';
            if (option.style.display !== display) option.style.display = display;
        }

        const groups = select.querySelectorAll('optgroup');
        for (let i = 0; i < groups.length; i += 1) {
            const group = groups[i];
            let hasVisibleOption = false;
            const groupOptions = group.querySelectorAll('option');
            for (let j = 0; j < groupOptions.length; j += 1) {
                if (!groupOptions[j].hidden) {
                    hasVisibleOption = true;
                    break;
                }
            }
            if (group.hidden !== !hasVisibleOption) group.hidden = !hasVisibleOption;
            const display = hasVisibleOption ? '' : 'none';
            if (group.style.display !== display) group.style.display = display;
        }
    }

    function createFilterControls(select) {
        const existing = select.parentElement.querySelector(`.${WRAPPER_CLASS}`);
        if (existing) return existing;

        const wrapper = document.createElement('div');
        wrapper.className = WRAPPER_CLASS;
        wrapper.setAttribute('role', 'group');
        wrapper.setAttribute('aria-label', 'Product filters');
        wrapper.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin-bottom:8px;align-items:center';

        const label = document.createElement('span');
        label.textContent = 'Filter products:';
        label.style.fontWeight = '600';
        wrapper.appendChild(label);

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
                const nextState = states[(states.indexOf(currentState) + 1) % states.length];

                setCheckboxState(checkbox, nextState);
                saveFilterStates(wrapper);
                applyProductFilters(select, wrapper);
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(filter));
            wrapper.appendChild(label);
        });

        select.parentElement.insertBefore(wrapper, select);
        return wrapper;
    }

    let activeSelect = null;
    let activeWrapper = null;
    let selectObserver = null;
    let scheduled = false;

    function applyToActiveSelect() {
        scheduled = false;
        if (activeSelect && activeWrapper) applyProductFilters(activeSelect, activeWrapper);
    }

    function scheduleApply() {
        if (scheduled) return;
        scheduled = true;
        window.setTimeout(applyToActiveSelect, 0);
    }

    function enhanceProductSelect() {
        const select = document.querySelector(SELECTOR);
        if (!select || !select.parentElement || select === activeSelect) return;

        if (selectObserver) selectObserver.disconnect();
        activeSelect = select;
        activeWrapper = createFilterControls(select);
        applyProductFilters(activeSelect, activeWrapper);

        selectObserver = new MutationObserver(scheduleApply);
        selectObserver.observe(select, { childList: true, subtree: true });
    }

    const pageObserver = new MutationObserver(enhanceProductSelect);
    pageObserver.observe(document.body, { childList: true, subtree: true });
    enhanceProductSelect();
})();
