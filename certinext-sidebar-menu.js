// ==UserScript==
// @name         CertiNext – Expand Certificates Sidebar
// @namespace    https://us.certinext.io/
// @version      1.0.0
// @description  Adds the Organizations, Domains, and Public Link order tabs to the Certificates sidebar.
// @match        https://us.certinext.io/*
// @downloadURL  https://raw.githubusercontent.com/eric-olstad/certinext-userscripts/main/certinext-sidebar-menu.js
// @updateURL    https://raw.githubusercontent.com/eric-olstad/certinext-userscripts/main/certinext-sidebar-menu.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const ORDER_TABS = [
        { label: 'Orders', tabId: 'ordersTab', hash: 'orders', tabNumber: '1' },
        { label: 'Organizations', tabId: 'organizationTab', hash: 'organizationDiv' },
        { label: 'Domains', tabId: 'domainsTab', hash: 'domains' },
        { label: 'Public Link', tabId: 'publicLinkTab', hash: 'publicLink' }
    ];
    const MENU_ITEM_CLASS = 'certinext-order-tab-menu-item';

    function getCertificatesSubmenu() {
        const sideMenu = document.querySelector('#side-menu');
        if (!sideMenu) return null;

        const topLevelItems = sideMenu.querySelectorAll(':scope > li');
        for (let i = 0; i < topLevelItems.length; i += 1) {
            const item = topLevelItems[i];
            const link = item.querySelector(':scope > a');
            if (!link) continue;

            const text = link.textContent.replace(/\s+/g, ' ').trim();
            if (!/^Certificates\b/i.test(text)) continue;
            return item.querySelector(':scope > ul.submenu');
        }
        return null;
    }

    function createMenuItem(tab) {
        const item = document.createElement('li');
        item.className = MENU_ITEM_CLASS;
        item.dataset.tabHash = tab.hash;

        const link = document.createElement('a');
        link.href = '/manageOrders#' + tab.hash;
        link.textContent = tab.label;
        link.dataset.certinextOrderTab = tab.tabId;
        link.addEventListener('click', (event) => {
            if (window.location.pathname !== '/manageOrders') return;

            event.preventDefault();
            window.history.replaceState({}, '', link.href);
            activateOrderTabFromHash();
        });

        item.appendChild(link);
        return item;
    }

    function addOrderTabLinks() {
        const submenu = getCertificatesSubmenu();
        if (!submenu) return;

        const existingLinks = submenu.querySelectorAll('a[data-certinext-order-tab]');
        const existingTabs = {};
        for (let i = 0; i < existingLinks.length; i += 1) {
            existingTabs[existingLinks[i].dataset.certinextOrderTab] = existingLinks[i];
        }

        const ordersLink = submenu.querySelector('a[href="/manageOrders"]');
        if (ordersLink) {
            ordersLink.href = '/manageOrders#orders';
            ordersLink.dataset.certinextOrderTab = 'ordersTab';
        }

        let lastItem = ordersLink ? ordersLink.closest('li') : null;
        ORDER_TABS.slice(1).forEach((tab) => {
            if (existingTabs[tab.tabId]) return;

            const item = createMenuItem(tab);
            if (lastItem) {
                lastItem.insertAdjacentElement('afterend', item);
            } else {
                submenu.appendChild(item);
            }
            lastItem = item;
        });
    }

    let activatedHash = null;

    function activateOrderTabFromHash() {
        if (window.location.pathname !== '/manageOrders') return;

        const hash = window.location.hash.slice(1);
        const tab = ORDER_TABS.find((candidate) => candidate.hash === hash);
        if (!tab) return;

        const tabLink = document.getElementById(tab.tabId);
        if (!tabLink) return;
        if (activatedHash === hash) return;

        if (typeof window.getCurrentTab !== 'function') {
            window.setTimeout(activateOrderTabFromHash, 50);
            return;
        }

        activatedHash = hash;
        tabLink.click();
    }

    function enhance() {
        addOrderTabLinks();
        activateOrderTabFromHash();
    }

    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', activateOrderTabFromHash);
    window.addEventListener('load', enhance);
    enhance();
})();
