# CertiNext userscripts

Tampermonkey userscripts that improve product and group selection on the CertiNext US portal.

## Scripts

| Script | Page | What it does |
| --- | --- | --- |
| [`certinext-group-sort.js`](./certinext-group-sort.js) | `us.certinext.io/acmeApi*` and `sandbox-us.certinext.io/acmeApi*` | Sorts the group selector alphabetically and hides groups whose name starts with `[Deleted]`. The placeholder remains at the top. |
| [`certinext-product-filters.js`](./certinext-product-filters.js) | `us.certinext.io/acmeApi*` and `sandbox-us.certinext.io/acmeApi*` | Adds persistent tri-state `DV`, `OV`, `IGTF`, and `Wildcard` filters to the product selector. |
| [`certinext-ov-filter.js`](./certinext-ov-filter.js) | `us.certinext.io/addGroups*` and `sandbox-us.certinext.io/addGroups*` | Adds the same persistent tri-state filters to the Groups page's Select2 Products selector. |
| [`certinext-sidebar-menu.js`](./certinext-sidebar-menu.js) | `us.certinext.io/*` and `sandbox-us.certinext.io/*` | Adds Organizations, Domains, and Public Link to the Certificates sidebar and activates the matching Orders tab. |
| [`certinext-orders-last-filter.js`](./certinext-orders-last-filter.js) | `us.certinext.io/manageOrders*` and `sandbox-us.certinext.io/manageOrders*` | Remembers the Orders filter and restores it after viewing an order. |

The scripts are independent. Install only the ones you need.

## Installation

1. Install the [Tampermonkey browser extension](https://www.tampermonkey.net/) for your browser.
2. Open a script file from this repository.
3. Copy its contents into a new Tampermonkey script, or use Tampermonkey's **Create a new script** editor and paste the file contents.
4. Save the script with `Ctrl+S` / `Cmd+S`.
5. Visit or reload the matching CertiNext page.

The userscripts run only on the URLs listed in the table above. If a script does not appear to work, check that it is enabled in Tampermonkey and that the current page matches its URL pattern.

## Certificates sidebar

`certinext-sidebar-menu.js` expands the Certificates section of the site-wide sidebar with all tabs from the Orders page:

- Orders
- Organizations
- Domains
- Public Link

The added links open `/manageOrders` with the actual tab pane ID in the URL. On the Orders page, the userscript invokes CertiNext's own Bootstrap tab and `getCurrentTab` behavior so the page loads the selected tab correctly. They work from any matching CertiNext page, not only from the Orders page.

## Orders Last Filter

`certinext-orders-last-filter.js` preserves the temporary filter on the Orders tab when you open an order with its **View** button or switch away from and back to Orders. It saves every filter row's columns, operators, values, and multi-select selections, then restores the native filter controls and applies the filter when you return to `/manageOrders#orders`, switch back to the Orders tab, or reload the page.

Using **Remove All** also clears the persisted Last Filter.

When a valid Last Filter exists, the script runs early and intercepts CertiNext's unfiltered initialization requests, including the `onload` and `getCurrentTab('1')` paths. It then lets the restored filter request populate the list first, avoiding the normal unfiltered load.

After returning to Orders from another tab, it also restores the native-style search-history summary bar when CertiNext does not recreate it automatically.

The saved state is kept separately for the production and sandbox hosts, using browser session storage plus persistent storage fallbacks. It is independent of CertiNext's named Saved Filters.

## Product filter controls

Both product-filter scripts provide a three-state control for `DV`, `OV`, `IGTF`, and `Wildcard`:

- **Unchecked**: the filter has no effect.
- **Included**: show products containing the filter term.
- **Excluded**: hide products containing the filter term.

Click a filter repeatedly to cycle through those states. The controls apply dynamically as product results are loaded or updated. Multiple included filters are combined with **OR**; excluded filters always remove matching products. By default, `DV` and `IGTF` are excluded, while `OV` and `Wildcard` are unchecked.

On the `addGroups` page, the controls appear above the Select2 **Products** selector and filter its result list as it is opened and populated. The `acmeApi` script applies the controls directly to its product `<select>` options.

Filter states are saved by Tampermonkey and restored on later visits. Both scripts use the same saved filter state, so the settings are available on either page. To reset them, clear the userscript's stored data in Tampermonkey, or cycle each filter back to the desired state.

## Permissions

- `certinext-group-sort.js` requires no Tampermonkey permissions.
- `certinext-product-filters.js` and `certinext-ov-filter.js` use `GM_getValue` and `GM_setValue` only to persist filter states.

## Development

There is no build step. Edit the `.js` files directly and reinstall or reload the updated script in Tampermonkey. The userscripts use `MutationObserver` so they continue to apply when CertiNext updates selectors dynamically.
