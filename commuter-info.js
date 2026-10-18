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
            activeModalTrigger = trigger || null;
            modal.hidden = false;
            // Leaflet needs a visible container to measure, so set the map up after showing the popup
            if (modal.querySelector('#gas-map')) initGasMap();
            document.body.classList.add('qi-modal-open');
            modal.querySelector('.qi-modal-close').focus();
            // Give the popup its own history entry so the phone's Back button closes it
            // instead of leaving the site.
            history.pushState({ qiModal: modalId }, '');
        }

        // Hide the open popup and bring the Commuter Quick Info card back into view.
        function closeQuickInfoModal() {
            const modal = document.querySelector('.qi-modal:not([hidden])');
            if (!modal) return;
            modal.hidden = true;
            document.body.classList.remove('qi-modal-open');
            const card = document.querySelector('[data-ci-card]');
            // Wait a frame: on Back the browser restores the old scroll position first,
            // which would cancel an immediate scroll.
            if (card) {
                setTimeout(() => {
                    const header = document.querySelector('.site-header');
                    const offset = (header ? header.offsetHeight : 0) + 16; // clear the sticky header
                    window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - offset);
                }, 50);
            }
            if (activeModalTrigger) activeModalTrigger.focus({ preventScroll: true });
            activeModalTrigger = null;
        }

        // X button / Escape: step back through the popup's history entry; the popstate
        // handler below then closes it, so no stray entry is left behind.
        function requestCloseQuickInfoModal() {
            if (!document.querySelector('.qi-modal:not([hidden])')) return;
            if (history.state && history.state.qiModal) {
                history.back();
            } else {
                closeQuickInfoModal();
            }
        }

        // Phone/browser Back button (and the history.back() above)
        window.addEventListener('popstate', closeQuickInfoModal);

        document.querySelectorAll('.quick-info-trigger').forEach((btn) => {
            btn.addEventListener('click', () => openQuickInfoModal(btn.dataset.modal, btn));
        });
        document.querySelectorAll('[data-close-modal]').forEach((btn) => {
            btn.addEventListener('click', requestCloseQuickInfoModal);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') requestCloseQuickInfoModal();
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

        // Nearest Gasoline Station map (Leaflet + OpenStreetMap).
        // Station list comes from OpenStreetMap; edit gas-stations.json to update it.
        const MATI_CENTER = [6.9525, 126.2200];
        let gasMap = null;
        let gasStations = [];
        let userMarker = null;

        function setGasStatus(text) {
            const status = document.getElementById('gas-map-status');
            if (status) status.textContent = text;
        }

        function stationPopup(s, distanceM) {
            const box = el('div', 'qi-map-popup');
            box.append(el('strong', '', s.brand ? `${s.name} (${s.brand})` : s.name));
            if (s.address) box.append(el('span', '', s.address));
            if (distanceM !== undefined) box.append(el('div', '', `${formatDistance(distanceM)} from you`));
            return box;
        }

        const formatDistance = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

        function initGasMap() {
            const box = document.getElementById('gas-map');
            if (!box) return;
            if (gasMap) { gasMap.invalidateSize(); return; }
            if (!window.L) { setGasStatus('The map could not load. Check your connection and try again.'); return; }

            gasMap = L.map(box).setView(MATI_CENTER, 14);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(gasMap);

            setGasStatus('Loading gas stations…');
            fetch('gas-stations.json')
                .then((res) => { if (!res.ok) throw new Error(res.status); return res.json(); })
                .then((list) => {
                    // Red map pin with a blue fuel pump; the pin's tip sits on the station
                    const gasIcon = L.divIcon({
                        className: 'qi-gas-pin',
                        iconSize: [32, 40],
                        iconAnchor: [16, 40],
                        popupAnchor: [0, -36],
                        html: `<svg viewBox="0 0 40 50" width="32" height="40" aria-hidden="true">
                            <path d="M20 49C20 49 3 32 3 19a17 17 0 1 1 34 0c0 13-17 30-17 30z" fill="#D10000"/>
                            <circle cx="20" cy="19" r="12" fill="#FFFFFF"/>
                            <rect x="12.5" y="11" width="9" height="13.5" rx="1.6" fill="#2F6BFF"/>
                            <rect x="14.3" y="13" width="5.4" height="4" rx="0.6" fill="#FFFFFF"/>
                            <rect x="11" y="24" width="12" height="2.2" rx="1" fill="#2F6BFF"/>
                            <path d="M21.5 15.5h2.2v6.3a1.4 1.4 0 0 0 2.8 0v-7.6l-2.4-2.8" fill="none" stroke="#2F6BFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                            <rect x="25.2" y="12.6" width="2.6" height="3.8" rx="0.8" fill="#2F6BFF"/>
                        </svg>`,
                    });
                    gasStations = list.map((s) => {
                        const marker = L.marker([s.lat, s.lon], { icon: gasIcon, title: s.name })
                            .bindPopup(() => stationPopup(s)).addTo(gasMap);
                        return { ...s, marker };
                    });
                    setGasStatus(`${gasStations.length} gas stations in and around the City of Mati`);
                })
                .catch((err) => {
                    console.error('Could not load gas-stations.json', err);
                    setGasStatus('Gas stations could not load. Please try again later.');
                });
        }

        const nearestGasBtn = document.getElementById('btn-nearest-gas');
        if (nearestGasBtn) {
            const label = nearestGasBtn.textContent;
            nearestGasBtn.addEventListener('click', () => {
                if (!gasMap) return;
                if (!navigator.geolocation) { setGasStatus("This browser can't share your location."); return; }
                nearestGasBtn.disabled = true;
                nearestGasBtn.textContent = 'Finding your location…';
                const done = () => { nearestGasBtn.disabled = false; nearestGasBtn.textContent = label; };

                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        done();
                        const here = L.latLng(pos.coords.latitude, pos.coords.longitude);
                        if (userMarker) userMarker.remove();
                        userMarker = L.circleMarker(here, {
                            radius: 9, color: '#FFFFFF', weight: 3, fillColor: '#000EB5', fillOpacity: 1,
                        }).bindPopup('You are here').addTo(gasMap);

                        let nearest = null;
                        let nearestM = Infinity;
                        gasStations.forEach((s) => {
                            const m = here.distanceTo([s.lat, s.lon]);
                            if (m < nearestM) { nearest = s; nearestM = m; }
                        });
                        if (!nearest) { gasMap.setView(here, 15); setGasStatus('Showing your location.'); return; }

                        gasMap.fitBounds(L.latLngBounds([here, [nearest.lat, nearest.lon]]), { padding: [48, 48], maxZoom: 17 });
                        nearest.marker.setPopupContent(stationPopup(nearest, nearestM)).openPopup();
                        setGasStatus(`Nearest: ${nearest.name}, ${formatDistance(nearestM)} away`);
                    },
                    (err) => {
                        done();
                        setGasStatus(err.code === err.PERMISSION_DENIED
                            ? 'Location access was blocked. Allow it in your browser settings to find the nearest station.'
                            : "Couldn't get your location. Please try again.");
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
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
