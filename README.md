# CertiNext userscripts

Tampermonkey userscripts that improve product and group selection on the CertiNext US portal.

## Scripts

| Script | Page | What it does |
| --- | --- | --- |
| [`certinext-group-sort.js`](./certinext-group-sort.js) | `https://us.certinext.io/acmeApi*` | Sorts the group selector alphabetically and hides groups whose name starts with `[Deleted]`. The placeholder remains at the top. |
| [`certinext-product-filters.js`](./certinext-product-filters.js) | `https://us.certinext.io/acmeApi*` | Adds dynamic `DV`, `OV`, `IGTF`, and `Wildcard` filters to the product selector. |
| [`certinext-ov-filter.js`](./certinext-ov-filter.js) | `https://us.certinext.io/addGroups*` | Shows only products containing `OV` as a standalone term in the Select2 product results and sorts them alphabetically. |

The scripts are independent. Install only the ones you need.

## Installation

1. Install the [Tampermonkey browser extension](https://www.tampermonkey.net/) for your browser.
2. Open a script file from this repository.
3. Copy its contents into a new Tampermonkey script, or use Tampermonkey's **Create a new script** editor and paste the file contents.
4. Save the script with `Ctrl+S` / `Cmd+S`.
5. Visit or reload the matching CertiNext page.

The userscripts run only on the URLs listed in the table above. If a script does not appear to work, check that it is enabled in Tampermonkey and that the current page matches its URL pattern.

## Product filter controls

`certinext-product-filters.js` provides a three-state control for each filter:

- **Unchecked**: the filter has no effect.
- **Included**: show products containing the filter term.
- **Excluded**: hide products containing the filter term.

Click a filter repeatedly to cycle through those states. Multiple included filters are combined with **OR**; excluded filters always remove matching products. By default, `DV` and `IGTF` are excluded, while `OV` and `Wildcard` are unchecked.

Filter states are saved by Tampermonkey and restored on later visits. To reset them, clear the userscript's stored data in Tampermonkey, or cycle each filter back to the desired state.

## Permissions

- `certinext-group-sort.js` and `certinext-ov-filter.js` require no Tampermonkey permissions.
- `certinext-product-filters.js` uses `GM_getValue` and `GM_setValue` only to persist filter states.

## Development

There is no build step. Edit the `.js` files directly and reinstall or reload the updated script in Tampermonkey. The userscripts use `MutationObserver` so they continue to apply when CertiNext updates selectors dynamically.
