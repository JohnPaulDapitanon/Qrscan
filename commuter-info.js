/* ==========================================================================
   Commuter Quick Info loader.
   Fetches commuter-info.html, puts the card where <div id="commuter-info">
   sits and the popups at the end of <body>, then wires everything up.
   Weekly fuel prices: edit FUEL_STATIONS and FUEL_BRANDS below.
   ========================================================================== */
(function () {
    'use strict';

    async function loadCommuterInfo() {
        const slot = document.getElementById('commuter-info');
        if (!slot) return;
        let markup;
        try {
            const res = await fetch('commuter-info.html');
            if (!res.ok) throw new Error(res.status);
            markup = await res.text();
        } catch (err) {
            console.error('Commuter Quick Info could not load commuter-info.html', err);
            return;
        }
        const tpl = document.createElement('template');
        tpl.innerHTML = markup;
        const card = tpl.content.querySelector('[data-ci-card]');
        if (card) slot.replaceWith(card);
        document.body.append(tpl.content);
        initCommuterInfo();
    }

    function initCommuterInfo() {
        // Commuter Quick Info fullscreen modals
        let activeModalTrigger = null;

        function openQuickInfoModal(modalId, trigger) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            const frame = modal.querySelector('iframe[data-src]');
            if (frame && !frame.src) frame.src = frame.dataset.src;
            activeModalTrigger = trigger || null;
            modal.hidden = false;
            document.body.classList.add('qi-modal-open');
            modal.querySelector('.qi-modal-close').focus();
        }

        function closeQuickInfoModal() {
            const modal = document.querySelector('.qi-modal:not([hidden])');
            if (!modal) return;
            modal.hidden = true;
            document.body.classList.remove('qi-modal-open');
            if (activeModalTrigger) activeModalTrigger.focus();
            activeModalTrigger = null;
        }

        document.querySelectorAll('.quick-info-trigger').forEach((btn) => {
            btn.addEventListener('click', () => openQuickInfoModal(btn.dataset.modal, btn));
        });
        document.querySelectorAll('[data-close-modal]').forEach((btn) => {
            btn.addEventListener('click', closeQuickInfoModal);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeQuickInfoModal();
        });

        // Fuel Price Watchlist — SAMPLE DATA. Replace with the week's prices; null = not sold.
        const FUEL_STATIONS = [
            { brand: 'Seaoil', place: 'Brgy. Sainz', unleaded: 92.55, premium: 94.85, diesel: 90.80, premiumDiesel: 96.60, kerosene: 133.75 },
            { brand: 'Petron', place: 'Brgy. Poblacion', unleaded: 92.40, premium: 93.40, diesel: 91.60, premiumDiesel: 94.90, kerosene: 128.50 },
            { brand: 'Phoenix', place: 'Brgy. Madang', unleaded: 92.20, premium: 93.35, diesel: 91.65, premiumDiesel: null, kerosene: null },
            { brand: 'Petron', place: 'Brgy. Badas', unleaded: 92.60, premium: 93.60, diesel: 91.75, premiumDiesel: 95.05, kerosene: null },
            { brand: 'Shell', place: 'Brgy. Dahican', unleaded: 94.00, premium: 100.30, diesel: 92.45, premiumDiesel: 98.05, kerosene: 131.90 },
            { brand: 'Shell', place: 'Brgy. Matiao', unleaded: 94.10, premium: 100.40, diesel: 92.50, premiumDiesel: null, kerosene: null },
            { brand: 'Caltex', place: 'Brgy. Dawan', unleaded: 93.90, premium: 99.75, diesel: 93.10, premiumDiesel: 97.95, kerosene: null },
            { brand: 'Caltex', place: 'Brgy. Central', unleaded: 94.05, premium: 99.80, diesel: 93.20, premiumDiesel: 98.00, kerosene: 127.60 },
        ];

        // Brand averages as [price, change vs last week]; null = not sold.
        const FUEL_BRANDS = [
            { brand: 'Shell', stations: 204, diesel: [92.47, -2.97], premiumDiesel: [98.07, -3.00], unleaded91: [94.02, 1.48], egas: null, premium95: [100.32, 1.50], premium97: [103.02, 1.50], kerosene: [131.95, 1.70] },
            { brand: 'Petron', stations: 240, diesel: [91.72, -2.99], premiumDiesel: [95.03, -3.00], unleaded91: [92.59, 1.46], egas: null, premium95: [93.57, 1.44], premium97: [101.82, 1.50], kerosene: [128.68, 1.70] },
            { brand: 'Caltex', stations: 131, diesel: [93.21, -3.05], premiumDiesel: [98.01, -3.01], unleaded91: [94.04, 1.56], egas: null, premium95: [99.84, 1.56], premium97: [101.06, 1.56], kerosene: [127.65, 1.77] },
            { brand: 'Phoenix', stations: 70, diesel: [91.67, -3.00], premiumDiesel: null, unleaded91: [92.23, 1.50], egas: [108.54, 1.50], premium95: [93.35, 1.50], premium97: [100.58, 1.50], kerosene: null },
            { brand: 'Seaoil', stations: 71, diesel: [90.84, -3.01], premiumDiesel: [96.63, -3.01], unleaded91: [92.56, 1.54], egas: [120.31, 1.56], premium95: [94.86, 1.56], premium97: [96.71, 1.56], kerosene: [133.78, 1.77] },
        ];

        const STATION_FUELS = [
            { key: 'unleaded', label: 'Unleaded' },
            { key: 'premium', label: 'Premium' },
            { key: 'diesel', label: 'Diesel' },
            { key: 'premiumDiesel', label: 'Diesel', pre: 'Premium' },
            { key: 'kerosene', label: 'Kerosene' },
        ];

        const TABLE_FUELS = [
            { key: 'diesel', label: 'Diesel' },
            { key: 'premiumDiesel', label: 'Premium Diesel' },
            { key: 'unleaded91', label: 'Unleaded 91' },
            { key: 'egas', label: 'E-Gas' },
            { key: 'premium95', label: 'Premium 95' },
            { key: 'premium97', label: 'Premium 97' },
            { key: 'kerosene', label: 'Kerosene' },
        ];

        function el(tag, className, text) {
            const node = document.createElement(tag);
            if (className) node.className = className;
            if (text !== undefined) node.textContent = text;
            return node;
        }

        const minOf = (values) => Math.min(...values.filter((v) => v !== null));
        const byPrice = (a, b) => (a === null) - (b === null) || a - b;

        function renderFuelStations() {
            const box = document.getElementById('fw-stations');
            if (!box) return;
            const lowest = {};
            STATION_FUELS.forEach(({ key }) => { lowest[key] = minOf(FUEL_STATIONS.map((s) => s[key])); });

            [...FUEL_STATIONS].sort((a, b) => byPrice(a.diesel, b.diesel)).forEach((s) => {
                const card = el('article', `fw-station fw-brand--${s.brand.toLowerCase()}`);
                card.append(el('h4', 'fw-station-name', s.brand), el('p', 'fw-station-place', `${s.place}, Mati City`));
                const grid = el('div', 'fw-station-prices');
                STATION_FUELS.forEach(({ key, label, pre }) => {
                    const cell = el('div', `fw-price fw-fuel--${key}`);
                    const name = el('span', 'fw-price-label');
                    if (pre) name.append(el('small', '', pre));
                    name.append(label);
                    const val = s[key];
                    const amount = el('span', 'fw-price-value' + (val !== null && val === lowest[key] ? ' is-lowest' : ''),
                        val === null ? '—' : `₱ ${val.toFixed(2)}`);
                    cell.append(name, amount);
                    grid.append(cell);
                });
                card.append(grid);
                box.append(card);
            });
        }

        function renderFuelTable(sortKey = 'diesel', keepFocus = false) {
            const table = document.getElementById('fw-table');
            if (!table) return;
            const price = (b, key) => (b[key] ? b[key][0] : null);
            const lowest = {};
            TABLE_FUELS.forEach(({ key }) => { lowest[key] = minOf(FUEL_BRANDS.map((b) => price(b, key))); });

            const headRow = el('tr');
            headRow.append(el('th', 'fw-th-brand', 'Brand'), el('th', 'fw-th-num', 'Stations'));
            TABLE_FUELS.forEach(({ key, label }) => {
                const th = el('th', 'fw-th-num' + (key === sortKey ? ' is-active' : ''));
                th.setAttribute('aria-sort', key === sortKey ? 'ascending' : 'none');
                const btn = el('button', 'fw-sort', label);
                btn.type = 'button';
                btn.addEventListener('click', () => renderFuelTable(key, true));
                th.append(btn);
                headRow.append(th);
            });
            table.tHead.replaceChildren(headRow);

            const rows = [...FUEL_BRANDS].sort((a, b) => byPrice(price(a, sortKey), price(b, sortKey))).map((b) => {
                const tr = el('tr');
                tr.append(el('th', 'fw-td-brand', b.brand), el('td', 'fw-td-num fw-mono', String(b.stations)));
                TABLE_FUELS.forEach(({ key }) => {
                    const td = el('td', 'fw-td-num' + (key === sortKey ? ' is-active' : ''));
                    if (!b[key]) {
                        td.append(el('span', 'fw-none', '—'));
                    } else {
                        const [val, change] = b[key];
                        td.append(
                            el('span', 'fw-mono fw-cell-price' + (val === lowest[key] ? ' fw-low' : ''), val.toFixed(2)),
                            el('span', 'fw-mono fw-cell-change ' + (change < 0 ? 'fw-down' : 'fw-up'),
                                `${change < 0 ? '▼' : '▲'}${Math.abs(change).toFixed(2)}`)
                        );
                    }
                    tr.append(td);
                });
                return tr;
            });
            table.tBodies[0].replaceChildren(...rows);
            if (keepFocus) table.querySelector('th.is-active .fw-sort').focus();
        }

        renderFuelStations();
        renderFuelTable();

        // Nearest Gasoline Station: search near the user's location, fall back to City of Mati
        const nearestGasBtn = document.getElementById('btn-nearest-gas');
        if (nearestGasBtn && navigator.geolocation) {
            nearestGasBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const fallbackUrl = nearestGasBtn.href;
                const mapsTab = window.open('', '_blank');
                if (!mapsTab) { window.location.href = fallbackUrl; return; }
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const { latitude, longitude } = pos.coords;
                        mapsTab.location.href = `https://www.google.com/maps/search/gas+station/@${latitude},${longitude},15z`;
                    },
                    () => { mapsTab.location.href = fallbackUrl; },
                    { timeout: 8000 }
                );
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadCommuterInfo);
    } else {
        loadCommuterInfo();
    }
})();
