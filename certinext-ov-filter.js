// ==UserScript==
// @name         CertiNext – Show OV Products Only
// @namespace    https://us.certinext.io/
// @version      1.0.0
// @downloadURL  https://raw.githubusercontent.com/eric-olstad/certinext-userscripts/main/certinext-ov-filter.js
// @updateURL    https://raw.githubusercontent.com/eric-olstad/certinext-userscripts/main/certinext-ov-filter.js
// @description  Filters the CertiNext product selector to products containing the standalone term OV.
// @match        https://us.certinext.io/addGroups*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const OV_PATTERN = /\bOV\b/i;

    function filterProductResults(root = document) {
        const lists = root.querySelectorAll('ul.select2-results__options');

        lists.forEach((list) => {
            const productOption = list.querySelector('[id*="select2-productSelect-result-"]');
            if (!productOption) return;

            const options = Array.from(list.querySelectorAll('li.select2-results__option'))
                .filter((option) => option.id.includes('select2-productSelect-result-'));

            options.forEach((option) => {
                option.hidden = !OV_PATTERN.test(option.textContent.trim());
            });

            const sorted = [...options].sort((a, b) =>
                a.textContent.trim().localeCompare(b.textContent.trim(), undefined, {
                    numeric: true,
                    sensitivity: 'base'
                })
            );

            if (sorted.some((option, index) => option !== options[index])) {
                sorted.forEach((option) => list.appendChild(option));
            }
        });
    }

    const observer = new MutationObserver(() => filterProductResults());
    observer.observe(document.body, { childList: true, subtree: true });
    filterProductResults();
})();
