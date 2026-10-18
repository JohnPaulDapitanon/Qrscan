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
            // Don't keep GPS running for directions nobody can see
            if (modal.querySelector('#gas-map') && watchId !== null) stopDirections();
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
        // Same stations, in the same order, as gas-stations.json (the map); keep the two lists in step.
        const FUEL_STATIONS = [
            { brand: 'Damke', place: 'Bilawan 2, City of Mati', unleaded: 91.40, premium: 92.60, diesel: 90.20, premiumDiesel: null, kerosene: null },
            { brand: 'Petron', place: 'Madang, City of Mati', unleaded: 92.60, premium: 93.60, diesel: 91.70, premiumDiesel: 95.05, kerosene: 128.60 },
            { brand: 'Shell', place: 'Madang, City of Mati', unleaded: 94.05, premium: 100.35, diesel: 92.45, premiumDiesel: 98.05, kerosene: 131.90 },
            { brand: 'My Gas', place: 'Madang, City of Mati', unleaded: 91.60, premium: 92.80, diesel: 90.40, premiumDiesel: null, kerosene: null },
            { brand: 'Phoenix', place: 'Surigao - Davao Coastal Road, City of Mati', unleaded: 92.25, premium: 93.35, diesel: 91.65, premiumDiesel: null, kerosene: null },
            { brand: 'Seaoil', place: 'Surigao - Davao Coastal Road, City of Mati', unleaded: 92.55, premium: 94.85, diesel: 90.85, premiumDiesel: 96.60, kerosene: 133.75 },
            { brand: 'Fusion', place: 'Rizal Street, City of Mati', unleaded: 91.85, premium: 93.05, diesel: 90.65, premiumDiesel: null, kerosene: null },
            { brand: 'Damke', place: 'Mati-Maragusan Road, City of Mati', unleaded: 91.45, premium: 92.65, diesel: 90.25, premiumDiesel: null, kerosene: null },
            { brand: 'Petron', place: 'Poblacion, City of Mati', unleaded: 92.65, premium: 93.65, diesel: 91.75, premiumDiesel: 95.10, kerosene: 128.65 },
            { brand: 'Shell', place: 'Poblacion, City of Mati', unleaded: 94.10, premium: 100.40, diesel: 92.50, premiumDiesel: 98.10, kerosene: 131.95 },
            { brand: 'Star', place: 'Tagawisan, City of Mati', unleaded: 91.50, premium: 92.70, diesel: 90.35, premiumDiesel: null, kerosene: null },
            { brand: 'Flying V', place: 'Tagawisan, City of Mati', unleaded: 91.75, premium: 92.95, diesel: 90.55, premiumDiesel: null, kerosene: 127.90 },
            { brand: 'Seaoil', place: 'President Diosdado P. Macapagal Highway, City of Mati', unleaded: 92.60, premium: 94.90, diesel: 90.90, premiumDiesel: 96.65, kerosene: 133.80 },
            { brand: 'Jetti', place: 'President Diosdado P. Macapagal Highway, City of Mati', unleaded: 91.90, premium: 93.10, diesel: 90.70, premiumDiesel: null, kerosene: null },
            { brand: 'Flying V', place: 'Dahican Rotunda, City of Mati', unleaded: 91.80, premium: 93.00, diesel: 90.60, premiumDiesel: null, kerosene: 127.95 },
            { brand: 'Zep Oil', place: 'Dahican Rotunda, City of Mati', unleaded: 91.30, premium: 92.50, diesel: 90.10, premiumDiesel: null, kerosene: null },
            { brand: 'My Gas', place: 'President Diosdado P. Macapagal Highway, City of Mati', unleaded: 91.65, premium: 92.85, diesel: 90.45, premiumDiesel: null, kerosene: null },
            { brand: 'Phoenix', place: 'President Diosdado P. Macapagal Highway, City of Mati', unleaded: 92.30, premium: 93.40, diesel: 91.70, premiumDiesel: null, kerosene: null },
            { brand: 'Shell', place: 'President Diosdado P. Macapagal Highway, City of Mati', unleaded: 94.00, premium: 100.30, diesel: 92.40, premiumDiesel: 98.00, kerosene: 131.85 },
            { brand: 'Seaoil', place: 'President Diosdado P. Macapagal Highway, City of Mati', unleaded: 92.50, premium: 94.80, diesel: 90.80, premiumDiesel: 96.55, kerosene: 133.70 },
            { brand: 'YKG', place: 'President Diosdado P. Macapagal Highway, City of Mati', unleaded: 91.20, premium: 92.40, diesel: 90.00, premiumDiesel: null, kerosene: null },
            { brand: 'Gas station', place: 'President Diosdado P. Macapagal Highway, City of Mati', unleaded: 91.00, premium: null, diesel: 89.90, premiumDiesel: null, kerosene: null },
            { brand: 'RM Petrol', place: 'President Diosdado P. Macapagal Highway, City of Mati', unleaded: 91.10, premium: 92.30, diesel: 89.95, premiumDiesel: null, kerosene: null },
            { brand: 'My Gas', place: 'President Diosdado P. Macapagal Highway, City of Mati', unleaded: 91.55, premium: 92.75, diesel: 90.35, premiumDiesel: null, kerosene: null },
            { brand: 'Petro Gazz', place: 'Dahican-Lawigan Road, City of Mati', unleaded: 91.70, premium: 92.90, diesel: 90.50, premiumDiesel: null, kerosene: 128.20 },
            { brand: 'Omnah Gas', place: 'Dahican-Lawigan Road, City of Mati', unleaded: 91.25, premium: 92.45, diesel: 90.05, premiumDiesel: null, kerosene: null },
            { brand: 'Botrol Fuels', place: 'Dawan, City of Mati', unleaded: 90.95, premium: 92.15, diesel: 89.80, premiumDiesel: null, kerosene: null },
        ];

        const FUEL_BRANDS = [
            { brand: 'Shell', stations: 3, diesel: [92.45, -3.00], premiumDiesel: [98.05, -2.97], unleaded91: [94.05, 1.50], egas: null, premium95: [100.35, 1.53], premium97: [103.05, 1.55], kerosene: [131.90, 1.70] },
            { brand: 'Petron', stations: 2, diesel: [91.73, -2.97], premiumDiesel: [95.07, -3.04], unleaded91: [92.63, 1.53], egas: null, premium95: [93.63, 1.46], premium97: [101.85, 1.48], kerosene: [128.63, 1.73] },
            { brand: 'Phoenix', stations: 2, diesel: [91.68, -3.04], premiumDiesel: null, unleaded91: [92.28, 1.46], egas: [108.55, 1.48], premium95: [93.38, 1.55], premium97: [100.60, 1.56], kerosene: null },
            { brand: 'Seaoil', stations: 3, diesel: [90.85, -2.95], premiumDiesel: [96.60, -3.02], unleaded91: [92.55, 1.55], egas: [120.30, 1.56], premium95: [94.85, 1.48], premium97: [96.70, 1.50], kerosene: [133.75, 1.75] },
            { brand: 'Fusion', stations: 1, diesel: [90.65, -3.02], premiumDiesel: null, unleaded91: [91.85, 1.48], egas: null, premium95: [93.05, 1.56], premium97: null, kerosene: null },
            { brand: 'Jetti', stations: 1, diesel: [90.70, -2.94], premiumDiesel: null, unleaded91: [91.90, 1.56], egas: null, premium95: [93.10, 1.50], premium97: null, kerosene: null },
            { brand: 'Flying V', stations: 2, diesel: [90.57, -3.00], premiumDiesel: null, unleaded91: [91.78, 1.50], egas: null, premium95: [92.98, 1.53], premium97: null, kerosene: [127.93, 1.70] },
            { brand: 'Petro Gazz', stations: 1, diesel: [90.50, -2.97], premiumDiesel: null, unleaded91: [91.70, 1.53], egas: null, premium95: [92.90, 1.46], premium97: null, kerosene: [128.20, 1.73] },
            { brand: 'My Gas', stations: 3, diesel: [90.40, -3.04], premiumDiesel: null, unleaded91: [91.60, 1.46], egas: null, premium95: [92.80, 1.55], premium97: null, kerosene: null },
            { brand: 'Star', stations: 1, diesel: [90.35, -2.95], premiumDiesel: null, unleaded91: [91.50, 1.55], egas: null, premium95: [92.70, 1.48], premium97: null, kerosene: null },
            { brand: 'Damke', stations: 2, diesel: [90.23, -3.02], premiumDiesel: null, unleaded91: [91.43, 1.48], egas: null, premium95: [92.63, 1.56], premium97: null, kerosene: null },
            { brand: 'Zep Oil', stations: 1, diesel: [90.10, -2.94], premiumDiesel: null, unleaded91: [91.30, 1.56], egas: null, premium95: [92.50, 1.50], premium97: null, kerosene: null },
            { brand: 'Omnah Gas', stations: 1, diesel: [90.05, -3.00], premiumDiesel: null, unleaded91: [91.25, 1.50], egas: null, premium95: [92.45, 1.53], premium97: null, kerosene: null },
            { brand: 'YKG', stations: 1, diesel: [90.00, -2.97], premiumDiesel: null, unleaded91: [91.20, 1.53], egas: null, premium95: [92.40, 1.46], premium97: null, kerosene: null },
            { brand: 'RM Petrol', stations: 1, diesel: [89.95, -3.04], premiumDiesel: null, unleaded91: [91.10, 1.46], egas: null, premium95: [92.30, 1.55], premium97: null, kerosene: null },
            { brand: 'Gas Station', stations: 1, diesel: [89.90, -2.95], premiumDiesel: null, unleaded91: [91.00, 1.55], egas: null, premium95: null, premium97: null, kerosene: null },
            { brand: 'Botrol Fuels', stations: 1, diesel: [89.80, -3.02], premiumDiesel: null, unleaded91: [90.95, 1.48], egas: null, premium95: [92.15, 1.56], premium97: null, kerosene: null },
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

        // Cheapest first for the chosen fuel; stations that don't sell it go last
        function renderFuelStations(sortKey = 'diesel') {
            const box = document.getElementById('fw-stations');
            if (!box) return;
            box.replaceChildren();
            if (box.parentElement) box.parentElement.scrollTop = 0;
            const lowest = {};
            STATION_FUELS.forEach(({ key }) => { lowest[key] = minOf(FUEL_STATIONS.map((s) => s[key])); });

            [...FUEL_STATIONS].sort((a, b) => byPrice(a[sortKey], b[sortKey])).forEach((s) => {
                const card = el('article', `fw-station fw-brand--${s.brand.toLowerCase().replace(/\s+/g, '-')}`);
                card.append(el('h4', 'fw-station-name', s.brand), el('p', 'fw-station-place', s.place));
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

        const stationSort = document.getElementById('fw-station-sort');
        renderFuelStations(stationSort ? stationSort.value : 'diesel');
        if (stationSort) stationSort.addEventListener('change', () => renderFuelStations(stationSort.value));
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
            gasMap.attributionControl.addAttribution(
                'Routing &copy; <a href="https://project-osrm.org/">OSRM</a> / <a href="https://routing.openstreetmap.de/">FOSSGIS</a>');

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

        // Directions to the nearest station: a road route from the free OSRM service on OpenStreetMap
        // roads (routing.openstreetmap.de), followed with GPS. The part already traveled is erased.
        const ROUTE_SERVERS = [
            'https://routing.openstreetmap.de/routed-car/route/v1/driving/',
            'https://router.project-osrm.org/route/v1/driving/', // backup if the first can't be reached
        ];
        const OFF_ROUTE_M = 50;          // farther than this from the path = take a new route
        const ARRIVED_M = 30;            // this close to the station = arrived
        const REROUTE_GAP_MS = 10000;    // space out route requests to the free service
        const nearestGasBtn = document.getElementById('btn-nearest-gas');
        const gasBtnLabel = nearestGasBtn ? nearestGasBtn.textContent : '';
        let watchId = null;
        let target = null;               // station being navigated to
        let route = null;                // { points, line, casing, index, total, duration }
        let routing = false;             // a route request is in flight
        let lastRouteAt = 0;

        const formatMinutes = (s) => `about ${Math.max(1, Math.round(s / 60))} min`;
        const pathLength = (pts) => pts.reduce((sum, p, i) => (i ? sum + pts[i - 1].distanceTo(p) : 0), 0);

        function showUser(here) {
            if (userMarker) { userMarker.setLatLng(here); return; }
            userMarker = L.circleMarker(here, {
                radius: 9, color: '#FFFFFF', weight: 3, fillColor: '#000EB5', fillOpacity: 1,
            }).bindPopup('You are here').addTo(gasMap);
        }

        function clearRoute() {
            if (!route) return;
            route.casing.remove();
            route.line.remove();
            route = null;
        }

        function drawRoute(points, duration) {
            clearRoute();
            const style = { lineCap: 'round', lineJoin: 'round', interactive: false };
            const casing = L.polyline(points, { ...style, color: '#FFFFFF', weight: 10, opacity: 0.9 }).addTo(gasMap);
            const line = L.polyline(points, { ...style, color: '#000EB5', weight: 6 }).addTo(gasMap);
            route = { points, casing, line, index: 0, total: pathLength(points), duration };
            if (userMarker) userMarker.bringToFront();
        }

        // Closest point to p on segment a-b (flat approximation, fine at street scale)
        function projectOnSegment(p, a, b) {
            const k = Math.cos(p.lat * Math.PI / 180);
            const dx = (b.lng - a.lng) * k;
            const dy = b.lat - a.lat;
            const len2 = dx * dx + dy * dy;
            const t = len2 ? Math.max(0, Math.min(1, ((p.lng - a.lng) * k * dx + (p.lat - a.lat) * dy) / len2)) : 0;
            return L.latLng(a.lat + t * (b.lat - a.lat), a.lng + t * (b.lng - a.lng));
        }

        // Cut the route at the user's position and update the status.
        // Returns how far the user is from the path and how much of it is left.
        function updateProgress(here) {
            const pts = route.points;
            let best = { d: Infinity, i: route.index, at: pts[route.index] };
            // Only look ahead of the last match, so the path never grows back behind the user
            for (let i = route.index; i < pts.length - 1 && i < route.index + 60; i++) {
                const at = projectOnSegment(here, pts[i], pts[i + 1]);
                const d = here.distanceTo(at);
                if (d < best.d) best = { d, i, at };
            }
            route.index = best.i;
            const rest = [best.at, ...pts.slice(best.i + 1)];
            route.line.setLatLngs(rest);
            route.casing.setLatLngs(rest);
            const remaining = pathLength(rest);
            const seconds = route.total ? route.duration * (remaining / route.total) : 0;
            setGasStatus(`${target.name} · ${formatDistance(remaining)} · ${formatMinutes(seconds)} by vehicle`);
            return { offBy: best.d, remaining };
        }

        function requestRoute(here, fit) {
            const station = target;
            routing = true;
            lastRouteAt = Date.now();
            const path = `${here.lng},${here.lat};${station.lon},${station.lat}?overview=full&geometries=geojson`;
            const tryServer = (i) => fetch(ROUTE_SERVERS[i] + path)
                .then((res) => { if (!res.ok) throw new Error(res.status); return res.json(); })
                .then((data) => {
                    if (data.code !== 'Ok' || !data.routes.length) throw new Error(data.code);
                    return data.routes[0];
                })
                .catch((err) => {
                    if (i + 1 < ROUTE_SERVERS.length) return tryServer(i + 1);
                    throw err;
                });
            tryServer(0)
                .then((r) => {
                    if (target !== station) return; // directions were stopped meanwhile
                    routing = false;
                    drawRoute(r.geometry.coordinates.map(([lon, lat]) => L.latLng(lat, lon)), r.duration);
                    station.marker.setPopupContent(stationPopup(station, route.total));
                    if (fit) gasMap.fitBounds(route.line.getBounds().extend(here), { padding: [48, 48], maxZoom: 17 });
                    updateProgress(userMarker ? userMarker.getLatLng() : here);
                })
                .catch((err) => {
                    if (target !== station) return;
                    routing = false;
                    console.error('Route request failed', err);
                    // Keep the old route if there is one; otherwise fall back to the straight-line distance
                    if (!route) {
                        const straight = formatDistance(here.distanceTo([station.lat, station.lon]));
                        setGasStatus(`Nearest: ${station.name}, ${straight} away. Road directions unavailable right now.`);
                    }
                });
        }

        function stopDirections(message) {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            watchId = null;
            target = null;
            routing = false;
            clearRoute();
            if (nearestGasBtn) {
                nearestGasBtn.disabled = false;
                nearestGasBtn.textContent = gasBtnLabel;
            }
            setGasStatus(message || `${gasStations.length} gas stations in and around the City of Mati`);
        }

        function startDirections(here) {
            let nearest = null;
            let nearestM = Infinity;
            gasStations.forEach((s) => {
                const m = here.distanceTo([s.lat, s.lon]);
                if (m < nearestM) { nearest = s; nearestM = m; }
            });
            if (!nearest) { gasMap.setView(here, 15); stopDirections('Showing your location.'); return; }
            if (nearestM <= ARRIVED_M) { stopDirections(`You're already at ${nearest.name}.`); return; }

            target = nearest;
            nearestGasBtn.disabled = false;
            nearestGasBtn.textContent = 'Stop directions';
            gasMap.fitBounds(L.latLngBounds([here, [nearest.lat, nearest.lon]]), { padding: [48, 48], maxZoom: 17 });
            setGasStatus(`Getting directions to ${nearest.name}…`);
            requestRoute(here, true);
        }

        function onPosition(pos) {
            if (!target) return;
            const here = L.latLng(pos.coords.latitude, pos.coords.longitude);
            showUser(here);
            if (here.distanceTo([target.lat, target.lon]) <= ARRIVED_M) {
                stopDirections(`You've arrived at ${target.name}.`);
                return;
            }
            const canReroute = !routing && Date.now() - lastRouteAt >= REROUTE_GAP_MS;
            if (!route) {
                if (canReroute) requestRoute(here, false); // retry after a failed request
                return;
            }
            const { offBy, remaining } = updateProgress(here);
            // The route ends on the road nearest the station, which can be a little way from its pin
            if (offBy <= OFF_ROUTE_M && remaining <= 15) {
                stopDirections(`You've arrived at ${target.name}.`);
                return;
            }
            if (offBy > OFF_ROUTE_M && canReroute) {
                setGasStatus('Off the route. Finding a new one…');
                requestRoute(here, false);
            }
        }

        if (nearestGasBtn) {
            nearestGasBtn.addEventListener('click', () => {
                if (!gasMap) return;
                if (watchId !== null) { stopDirections('Directions stopped.'); return; }
                if (!navigator.geolocation) { setGasStatus("This browser can't share your location."); return; }
                nearestGasBtn.disabled = true;
                nearestGasBtn.textContent = 'Finding your location…';

                let first = true;
                watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        if (!first) { onPosition(pos); return; }
                        first = false;
                        const here = L.latLng(pos.coords.latitude, pos.coords.longitude);
                        showUser(here);
                        startDirections(here);
                    },
                    (err) => {
                        // Later GPS hiccups are ignored; tracking carries on with the next fix
                        if (!first && err.code !== err.PERMISSION_DENIED) return;
                        stopDirections(err.code === err.PERMISSION_DENIED
                            ? 'Location access was blocked. Allow it in your browser settings to find the nearest station.'
                            : "Couldn't get your location. Please try again.");
                    },
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
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
