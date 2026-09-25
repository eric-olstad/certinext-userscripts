// ==UserScript==
// @name         CertiNext – Sort and Filter Groups
// @namespace    https://us.certinext.io/
// @version      1.1.1
// @description  Sorts the CertiNext group selector alphabetically and hides deleted groups.
// @match        https://us.certinext.io/acmeApi*
// @match        https://sandbox-us.certinext.io/acmeApi*
// @downloadURL   https://raw.githubusercontent.com/eric-olstad/certinext-userscripts/main/certinext-group-sort.user.js
// @updateURL     https://raw.githubusercontent.com/eric-olstad/certinext-userscripts/main/certinext-group-sort.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function sortAndFilterGroups() {
        const groupSelect = document.querySelector('#groupID');
        if (!groupSelect || groupSelect.options.length === 0) return;

        const options = Array.from(groupSelect.options);
        const placeholder = options.find((option) => option.value === '0');
        const groups = options.filter((option) => option !== placeholder);

        groups.forEach((option) => {
            const isDeleted = /^\s*\[Deleted\]/i.test(option.textContent.trim());
            option.hidden = isDeleted;
            option.style.display = isDeleted ? 'none' : '';
        });

        const sorted = [...groups].sort((a, b) =>
            a.textContent.trim().localeCompare(b.textContent.trim(), undefined, {
                numeric: true,
                sensitivity: 'base'
            })
        );

        const desiredOrder = placeholder ? [placeholder, ...sorted] : sorted;
        const currentOrder = Array.from(groupSelect.options);
        if (desiredOrder.some((option, index) => option !== currentOrder[index])) {
            desiredOrder.forEach((option) => groupSelect.appendChild(option));
        }
    }

    let scheduled = false;
    const scheduleSort = () => {
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(() => {
            scheduled = false;
            sortAndFilterGroups();
        });
    };

    const observer = new MutationObserver(scheduleSort);
    observer.observe(document.body, { childList: true, subtree: true });
    scheduleSort();
})();
