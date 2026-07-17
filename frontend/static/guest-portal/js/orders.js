/**********************
 * guest-portal/js/orders.js — Rendeléseim szekció
 *
 *
 * ── API hívások──
 *      Lista:             GET    /api/guest-portal/orders/?scope=active|closed&page=1
 *      Cím vagy nap A/B:  PATCH  /api/guest-portal/orders/<id>/         — cím VAGY nap A/B mennyiség
 *      Nap lemondás:      DELETE /api/guest-portal/orders/<id>/items/     — { item_ids: [...] }
 *
 * ── Üzleti szabály ──
 *   Csak „Új” (status=new) státuszú nap/tétel szerkeszthető vagy mondható le.
 *   A backend `can_edit` mezőt küld minden tételre — a gombok ettől disabled-ek.
 *
 * ── UI — két tab, két kinézet ──
 *   Aktív:  módosítási info banner, nincs lapozás
 *   Lezárt: archívum info banner,  lapozás
 *
 * ── Modálok ──
 *   Nap szerkesztés (A/B), cím, lemondás — csak Aktív tabon elérhető
 *
 * ── Állapot ──
 *   guestOrders, ordersTab, ordersPage, expandedOrderIds
 *   Aktív + Lezárt tab: egyszerre max. 1 nyitva (accordion)
 *
 * ── Mentés / live-sync ──
 *   refreshOrdersAfterChange(), reloadGuestOrders() — guest-portal-sync.js
 *
 * IIFE,  azonnal lefuttatott függvény: (function () — ne ütközzön más szekciók JS-eivel (pl. bookings.js).
 **********************/


//Saját „dobozt” (scope-ot) csinál a változóknak, hogy az orders.js belső változói ne keveredjenek a bookings.js (és más szekciók) változóival — csak a szándékosan kitesett függvények (initOrdersSection, reloadGuestOrders) legyenek elérhetők kívülről.
(function () {
// DB státusz → magyar felirat (dashboard orders.js-sel egyezik)
        const STATUS_FROM_API = {
          new: "Új",
          confirmed: "Elfogadva",
          preparing: "Készül",
          ready: "Kiszállítás alatt",
          delivered: "Kézbesítve",
          cancelled: "Sikertelen kézbesítés",
        };

        const STATUS_BADGE_CLASS = {
          "Új": "status-new",
          "Elfogadva": "status-accepted",
          "Készül": "status-preparing",
          "Kiszállítás alatt": "status-delivery",
          "Kézbesítve": "status-done",
          "Sikertelen kézbesítés": "status-failed",
        };

        // Lezárt tétel — ilyenkor a rendelés a „Lezárt” tabra kerül
        const TERMINAL_ITEM_STATUSES = new Set(["delivered", "cancelled"]);

        // Aktív tab: kevés rendelés, egyszerre betöltjük (nincs „Több betöltése”)
        const ACTIVE_ORDERS_PAGE_SIZE = 50;
        const CLOSED_ORDERS_PAGE_SIZE = 10;

        let guestOrders = [];   // betöltött rendelések
        let ordersTab = "active"; //  "active" vagy "closed"
        let ordersPage = 1; //  lapozás (lezárt tabnál)
        let ordersHasNext = false;
        let orderCounts = { active: 0, closed: 0 };
        let expandedOrderIds = new Set();  // melyik kártya van kinyitva
        let pendingCancel = null;
        let pendingDayEdit = null;
        let pendingAddressEdit = null;
        let editingLineQty = { A: 0, B: 0 };

        function statusLabel(apiStatus) {
          return STATUS_FROM_API[apiStatus] || apiStatus || "Új";
        }

        function formatPrice(amount) {
          const num = Number(amount);
          if (Number.isNaN(num)) return "—";
          return `${Math.round(num).toLocaleString("hu-HU")} Ft`;
        }

        function formatDate(isoDate) {
          return window.formatHuDate?.(isoDate) ?? isoDate ?? "";
        }

        function formatDateTime(isoString) {
          return window.formatHuDateTime?.(isoString) ?? isoString ?? "";
        }

        // Egy rendelés tételeit napokra bontjuk (pl. hétfő + kedd → két sor)
        function groupItemsByDay(items) {
          const groups = new Map();

          for (const item of items || []) {
            const key = item.delivery_date;
            if (!groups.has(key)) {
              groups.set(key, {
                delivery_date: key,
                day: item.day,
                items: [],
                itemIds: [],
              });
            }
            const group = groups.get(key);
            group.items.push(item);
            group.itemIds.push(item.id);
          }

          return Array.from(groups.values()).sort((a, b) =>
            String(a.delivery_date).localeCompare(String(b.delivery_date)),
          );
        }

        function dayStatusLabel(dayGroup) {
          const labels = dayGroup.items.map((item) => statusLabel(item.status));
          const first = labels[0];
          return labels.every((label) => label === first) ? first : "Eltérő";
        }

        function dayCanEdit(dayGroup) {
          return dayGroup.items.length > 0 && dayGroup.items.every((item) => item.can_edit);
        }

        function orderHasEditableDay(order) {
          return groupItemsByDay(order.items).some(dayCanEdit);
        }

        function orderIsActive(order) {
          return (order.items || []).some((item) => !TERMINAL_ITEM_STATUSES.has(item.status));
        }

        // Összecsukott kártya fejléc — rövid összefoglaló
        function getOrderCardSummary(order) {
          const dayGroups = groupItemsByDay(order.items);

          if (!dayGroups.length) {
            return "Nincs tétel";
          }

          const upcoming = dayGroups.find((dayGroup) =>
            dayGroup.items.some((item) => !TERMINAL_ITEM_STATUSES.has(item.status)),
          );

          if (upcoming) {
            return `Következő: ${upcoming.day}, ${formatDate(upcoming.delivery_date)}`;
          }

          const dayLabel =
            dayGroups.length === 1 ? "1 nap" : `${dayGroups.length} nap`;
          return `Mind lezárva · ${dayLabel}`;
        }

        function escapeHtml(text) {
          return String(text ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
        }

        function getApiErrorMessage(data, fallback = "Hiba történt.") {
          if (!data || typeof data !== "object") return fallback;
          if (typeof data.detail === "string") return data.detail;
          const firstKey = Object.keys(data)[0];
          if (!firstKey) return fallback;
          const value = data[firstKey];
          if (Array.isArray(value)) return value[0];
          return String(value);
        }

        // ── API ──

        async function fetchGuestOrdersPage(scope, page) {
          const pageSize = scope === "active" ? ACTIVE_ORDERS_PAGE_SIZE : CLOSED_ORDERS_PAGE_SIZE;
          const params = new URLSearchParams({
            scope,
            page: String(page),
            page_size: String(pageSize),
          });
          const response = await apiRequest(`/api/guest-portal/orders/?${params}`);
          if (!response.ok) {
            throw new Error(`Rendelések betöltése sikertelen (${response.status})`);
          }
          return response.json();
        }

        async function patchGuestOrder(orderId, body) {
          const response = await apiRequest(`/api/guest-portal/orders/${orderId}/`, {
            method: "PATCH",
            body: JSON.stringify(body),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(getApiErrorMessage(data));
          }
          return data;
        }

        async function deleteGuestOrderItems(orderId, itemIds) {
          const response = await apiRequest(`/api/guest-portal/orders/${orderId}/items/`, {
            method: "DELETE",
            body: JSON.stringify({ item_ids: itemIds }),
          });

          if (response.status === 204) {
            return null;
          }

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(getApiErrorMessage(data));
          }
          return data;
        }

        // ── Megjelenítés ──

        function formatMenuDetails(item) {
          const details = item?.menu_details;
          if (!details) return "";

          return [details.soup, details.main_course, details.dessert]
            .filter(Boolean)
            .join(", ");
        }

        function renderMenuDetailsHtml(item) {
          const details = item?.menu_details;
          if (!details) return "";

          const rows = [
            ["Leves", details.soup],
            ["Főétel", details.main_course],
            ["Desszert", details.dessert],
          ].filter(([, name]) => name);

          if (!rows.length) return "";

          return `<ul class="gp-order-menu-dishes">${rows
            .map(
              ([label, name]) =>
                `<li><span>${escapeHtml(label)}</span>${escapeHtml(name)}</li>`,
            )
            .join("")}</ul>`;
        }

        function renderDayItemsHtml(dayGroup) {
          return dayGroup.items
            .map((item) => {
              const detailsHtml = renderMenuDetailsHtml(item);

              return `
                <div class="gp-order-menu-card">
                  <div class="gp-order-menu-head">
                    <span class="gp-order-menu-type">${escapeHtml(item.menu_type)} menü</span>
                    <span class="gp-order-menu-qty">× ${item.quantity}</span>
                  </div>
                  ${detailsHtml}
                </div>`;
            })
            .join("");
        }

        function renderOrderDayBlock(order, dayGroup, { readOnly = false } = {}) {
          const label = dayStatusLabel(dayGroup);
          const badgeClass = STATUS_BADGE_CLASS[label] || "status-new";
          const editable = !readOnly && dayCanEdit(dayGroup);
          const formattedDate = formatDate(dayGroup.delivery_date);

          const actionsHtml = readOnly
            ? ""
            : `
                <div class="gp-order-day-actions">
                  <button type="button" class="gp-order-btn gp-order-edit-day-btn"
                    data-order-id="${order.id}"
                    data-delivery-date="${dayGroup.delivery_date}"
                    ${editable ? "" : "disabled"}
                    title="${editable ? "Mennyiség módosítása" : "Ez a nap már nem szerkeszthető"}">
                    Szerkesztés
                  </button>
                  <button type="button" class="gp-order-btn gp-order-btn--danger gp-order-cancel-day-btn"
                    data-order-id="${order.id}"
                    data-delivery-date="${dayGroup.delivery_date}"
                    ${editable ? "" : "disabled"}
                    title="${editable ? "Nap lemondása" : "Ez a nap már nem mondható le"}">
                    Lemondás
                  </button>
                </div>`;

          return `
            <article
              class="gp-order-day"
              data-order-id="${order.id}"
              data-delivery-date="${dayGroup.delivery_date}"
            >
              <div class="gp-order-day-date">
                <span class="gp-order-day-date-kicker">Kiszállítás</span>
                <time class="gp-order-day-date-main" datetime="${escapeHtml(dayGroup.delivery_date)}">
                  <span class="gp-order-day-weekday">${escapeHtml(dayGroup.day)}</span>
                  <span class="gp-order-day-full">${escapeHtml(formattedDate)}</span>
                </time>
              </div>

              <div class="gp-order-day-body">
                <div class="gp-order-day-top">
                  <span class="gp-status-badge ${badgeClass}">${escapeHtml(label)}</span>
                </div>

                <div class="gp-order-day-menus">${renderDayItemsHtml(dayGroup)}</div>
                ${actionsHtml}
              </div>
            </article>`;
        }

        /** Kártya belseje — Aktív (szerkeszthető) és Lezárt (readOnly) is ezt használja. */
        function renderOrderCardBody(order, { readOnly = false } = {}) {
          const dayGroups = groupItemsByDay(order.items);
          const canEditAddress = !readOnly && orderHasEditableDay(order);

          const daysHtml = dayGroups
            .map((dayGroup) => renderOrderDayBlock(order, dayGroup, { readOnly }))
            .join("");

          const dayCountLabel =
            dayGroups.length === 1
              ? "1 kiszállítási nap"
              : `${dayGroups.length} kiszállítási nap`;

          const addressEditBtn = canEditAddress
            ? `<button type="button" class="gp-order-card-address-edit gp-order-edit-address-btn"
                    data-order-id="${order.id}"
                    title="Szállítási cím módosítása — csak ehhez a rendeléshez">
                    Cím módosítása
                  </button>`
            : "";

          // Mikor hasznos: csak ez az Order rekord kap új címet — profil és más rendelések érintetlenek
          const addressHintHtml = canEditAddress
            ? `<p class="gp-order-address-hint">
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    Csak ehhez a rendeléshez. Hasznos, ha átmenetileg máshova kéred a kiszállítást,
                    vagy javítani szeretnéd a leadáskor megadott címet — az
                    <strong>Adataim</strong> profilod és a többi rendelésed nem változik.
                  </p>`
            : "";

          return `
            <div class="gp-order-card-meta-row">
              Leadva: ${escapeHtml(formatDateTime(order.created_at))}
            </div>

            <div class="gp-order-card-address${readOnly ? " gp-order-card-address--readonly" : ""}">
              <div class="gp-order-card-address-label">
                <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                Szállítási cím
              </div>
              <p class="gp-order-card-address-text">${escapeHtml(order.delivery_address)}</p>
              ${addressEditBtn}
              ${addressHintHtml}
            </div>

            <div class="gp-order-days-wrap">
              <div class="gp-order-days-header">
                <i class="fa-solid fa-truck" aria-hidden="true"></i>
                <span>Kiszállítási napok</span>
                <span class="gp-order-days-count">${dayCountLabel}</span>
              </div>
              <div class="gp-order-days">${daysHtml}</div>
            </div>`;
        }

        // Lezárt tab összefoglaló sora — „2 nap · Kézbesítve”
        function getClosedOrderSummary(order) {
          const dayGroups = groupItemsByDay(order.items);
          if (!dayGroups.length) return "Nincs tétel";

          const dayLabel = dayGroups.length === 1 ? "1 nap" : `${dayGroups.length} nap`;
          const labels = [...new Set(dayGroups.map((group) => dayStatusLabel(group)))];
          const statusPart = labels.length === 1 ? labels[0] : "Eltérő státusz";
          return `${dayLabel} · ${statusPart}`;
        }

        function renderClosedOrderRow(order, isExpanded) {
          const summary = getClosedOrderSummary(order);
          const expandedClass = isExpanded ? "is-expanded" : "is-collapsed";
          const leadDate = formatDate(order.created_at?.slice?.(0, 10) || order.created_at);

          return `
            <article class="gp-order-row ${expandedClass}" data-order-id="${order.id}">
              <button
                type="button"
                class="gp-order-row-toggle"
                aria-expanded="${isExpanded ? "true" : "false"}"
                aria-controls="gp-order-row-body-${order.id}"
              >
                <div class="gp-order-row-main">
                  <span class="gp-order-row-title">${escapeHtml(leadDate)} · ${escapeHtml(summary)}</span>
                </div>
                <div class="gp-order-row-meta">
                  <span class="gp-order-row-price">${escapeHtml(formatPrice(order.total_price))}</span>
                  <i class="fa-solid fa-chevron-down gp-order-row-chevron" aria-hidden="true"></i>
                </div>
              </button>
              <div class="gp-order-row-body" id="gp-order-row-body-${order.id}">
                ${renderOrderCardBody(order, { readOnly: true })}
              </div>
            </article>`;
        }

        function renderOrderCard(order, isExpanded) {
          const summary = getOrderCardSummary(order);
          const expandedClass = isExpanded ? "is-expanded" : "is-collapsed";

          return `
            <article class="gp-order-card ${expandedClass}" data-order-id="${order.id}">
              <button
                type="button"
                class="gp-order-card-toggle"
                aria-expanded="${isExpanded ? "true" : "false"}"
                aria-controls="gp-order-body-${order.id}"
              >
                <div class="gp-order-card-toggle-main">
                  <span class="gp-order-card-toggle-title">${escapeHtml(summary)}</span>
                </div>
                <div class="gp-order-card-toggle-meta">
                  <span class="gp-order-card-toggle-price">${escapeHtml(formatPrice(order.total_price))}</span>
                  <i class="fa-solid fa-chevron-down gp-order-card-chevron" aria-hidden="true"></i>
                </div>
              </button>

              <div class="gp-order-card-body" id="gp-order-body-${order.id}">
                ${renderOrderCardBody(order, { readOnly: false })}
              </div>
            </article>
          `;
        }

        function updateTabCountsUI() {
          const activeEl = document.getElementById("ordersActiveCount");
          const closedEl = document.getElementById("ordersClosedCount");
          if (activeEl) activeEl.textContent = orderCounts.active;
          if (closedEl) closedEl.textContent = orderCounts.closed;
        }

        function updateTabsUI() {
          document.querySelectorAll("#ordersToolbar .gp-orders-tab").forEach((tab) => {
            const isActive = tab.dataset.scope === ordersTab;
            tab.classList.toggle("active", isActive);
            tab.setAttribute("aria-selected", isActive ? "true" : "false");
          });
        }

        function updateLoadMoreUI() {
          const btn = document.getElementById("ordersLoadMoreBtn");
          if (!btn) return;
          // Lapozás csak Lezárt tabon
          const show = ordersTab === "closed" && guestOrders.length > 0 && ordersHasNext;
          btn.classList.toggle("gp-orders-hidden", !show);
        }

        function updateOrdersInfoBanner() {
          const activeBanner = document.getElementById("ordersInfoActive");
          const closedBanner = document.getElementById("ordersInfoClosed");
          const isActiveTab = ordersTab === "active";

          // visibility (nem display:none) — a fejléc magassága tabváltáskor ne ugráljon
          activeBanner?.classList.toggle("gp-orders-info-inactive", !isActiveTab);
          closedBanner?.classList.toggle("gp-orders-info-inactive", isActiveTab);

          activeBanner?.setAttribute("aria-hidden", isActiveTab ? "false" : "true");
          closedBanner?.setAttribute("aria-hidden", isActiveTab ? "true" : "false");
        }

        function updateToolbarVisibility() {
          const toolbar = document.getElementById("ordersToolbar");
          const hasAny = orderCounts.active + orderCounts.closed > 0;
          toolbar?.classList.toggle("gp-orders-hidden", !hasAny);
        }

        function renderEmptyState() {
          const emptyEl = document.getElementById("ordersEmpty");
          if (!emptyEl) return;

          const titleEl = emptyEl.querySelector("h2");
          const textEl = emptyEl.querySelector("p");
          const linkEl = emptyEl.querySelector("a");

          if (ordersTab === "closed") {
            if (titleEl) titleEl.textContent = "Nincs lezárt rendelésed";
            if (textEl) {
              textEl.textContent =
                "A kézbesített és lezárt rendeléseid itt fognak megjelenni.";
            }
            linkEl?.classList.add("gp-orders-hidden");
            return;
          }

          if (orderCounts.closed > 0 && orderCounts.active === 0) {
            if (titleEl) titleEl.textContent = "Nincs aktív rendelésed";
            if (textEl) {
              textEl.textContent =
                "Jelenleg nincs folyamatban lévő rendelésed. A korábbiakat a Lezárt tabon nézheted meg.";
            }
            linkEl?.classList.add("gp-orders-hidden");
            return;
          }

          if (titleEl) titleEl.textContent = "Még nincs rendelésed";
          if (textEl) {
            textEl.textContent =
              "Amint leadsz egy rendelést a főoldalon, itt fogod látni — státusszal, módosítási és lemondási lehetőséggel.";
          }
          linkEl?.classList.remove("gp-orders-hidden");
        }

        /** Accordion — más nyitott kártya/sor bezárása (Aktív + Lezárt tab). */
        function collapseOtherOrderItems(exceptContainer) {
          document
            .querySelectorAll("#ordersList .gp-order-card.is-expanded, #ordersList .gp-order-row.is-expanded")
            .forEach((item) => {
              if (item === exceptContainer) return;
              item.classList.remove("is-expanded");
              item.classList.add("is-collapsed");
              item
                .querySelector(".gp-order-card-toggle, .gp-order-row-toggle")
                ?.setAttribute("aria-expanded", "false");
            });
        }

        function setOrderExpanded(container, orderId, expanded) {
          container.classList.toggle("is-expanded", expanded);
          container.classList.toggle("is-collapsed", !expanded);
          container.querySelector(".gp-order-card-toggle, .gp-order-row-toggle")?.setAttribute(
            "aria-expanded",
            expanded ? "true" : "false",
          );

          if (expanded) {
            collapseOtherOrderItems(container);
            expandedOrderIds.clear();
            expandedOrderIds.add(orderId);
          } else {
            expandedOrderIds.delete(orderId);
          }
        }

        function renderOrdersList() {
          const listEl = document.getElementById("ordersList");
          const emptyEl = document.getElementById("ordersEmpty");
          if (!listEl || !emptyEl) return;

          updateToolbarVisibility();
          updateTabCountsUI();
          updateTabsUI();
          updateOrdersInfoBanner();
          updateLoadMoreUI();

          if (!guestOrders.length) {
            listEl.innerHTML = "";
            listEl.classList.remove("gp-orders-list--closed");
            listEl.classList.add("gp-orders-hidden");
            renderEmptyState();
            emptyEl.classList.remove("gp-orders-hidden");
            return;
          }

          emptyEl.classList.add("gp-orders-hidden");
          listEl.classList.remove("gp-orders-hidden");
          listEl.classList.toggle("gp-orders-list--closed", ordersTab === "closed");
          listEl.innerHTML = guestOrders
            .map((order) => {
              const isExpanded = expandedOrderIds.has(order.id);
              return ordersTab === "closed"
                ? renderClosedOrderRow(order, isExpanded)
                : renderOrderCard(order, isExpanded);
            })
            .join("");
        }

        function setOrdersLoading(loading) {
          document.getElementById("ordersLoading")?.classList.toggle("gp-orders-hidden", !loading);
          if (loading) {
            document.getElementById("ordersList")?.classList.add("gp-orders-hidden");
            document.getElementById("ordersEmpty")?.classList.add("gp-orders-hidden");
            document.getElementById("ordersLoadMoreBtn")?.classList.add("gp-orders-hidden");
          }
        }

        // betölti a rendeléseket
        async function loadOrders({ reset = true, preserveExpanded = null } = {}) {
          if (reset) {
            ordersPage = 1;
            guestOrders = [];
            if (!preserveExpanded) {
              expandedOrderIds.clear();
            }
          }

          setOrdersLoading(reset);

          try {
            const data = await fetchGuestOrdersPage(ordersTab, ordersPage);
            orderCounts.active = data.active_count ?? 0;
            orderCounts.closed = data.closed_count ?? 0;
            ordersHasNext = Boolean(data.next);

            const pageResults = data.results || [];
            guestOrders = reset ? pageResults : guestOrders.concat(pageResults);

            // Aktív tab: első kártya nyitva. Lezárt: mind csukva (kattintásra nyílik, egyszerre max. 1).
            if (reset && guestOrders.length) {
              if (preserveExpanded?.size) {
                const existingIds = new Set(guestOrders.map((order) => order.id));
                expandedOrderIds = new Set(
                  [...preserveExpanded].filter((id) => existingIds.has(id)),
                );
              }
              if (expandedOrderIds.size > 1) {
                expandedOrderIds = new Set([[...expandedOrderIds][0]]);
              }
              if (expandedOrderIds.size === 0 && ordersTab === "active") {
                expandedOrderIds.add(guestOrders[0].id);
              }
            }

            renderOrdersList();
          } catch (error) {
            console.error("Rendelések:", error);
            window.showToast?.("Nem sikerült betölteni a rendeléseidet.", "error");
          } finally {
            setOrdersLoading(false);
          }
        }

        async function loadMoreOrders() {
          if (ordersTab !== "closed" || !ordersHasNext) return;
          ordersPage += 1;

          const btn = document.getElementById("ordersLoadMoreBtn");
          if (btn) {
            btn.disabled = true;
            btn.textContent = "Betöltés…";
          }

          try {
            const data = await fetchGuestOrdersPage(ordersTab, ordersPage);
            orderCounts.active = data.active_count ?? orderCounts.active;
            orderCounts.closed = data.closed_count ?? orderCounts.closed;
            ordersHasNext = Boolean(data.next);
            guestOrders = guestOrders.concat(data.results || []);
            renderOrdersList();
          } catch (error) {
            ordersPage -= 1;
            console.error("Több rendelés:", error);
            window.showToast?.("Nem sikerült betölteni a többi rendelést.", "error");
          } finally {
            if (btn) {
              btn.disabled = false;
              btn.textContent = "Több rendelés betöltése";
            }
          }
        }

        // Aktív ↔ Lezárt váltás
        function switchOrdersTab(scope) {
          if (scope === ordersTab) return;
          ordersTab = scope;
          loadOrders({ reset: true });
        }

        async function reloadOrders() {
          // Live-sync és kézi frissítés: ne csukjon össze minden kártyát újratöltéskor
          const previousExpanded = new Set(expandedOrderIds);
          await loadOrders({ reset: true, preserveExpanded: previousExpanded });
        }

        /**
         * Admin módosít rendelést → revision nő → Live-sync.js → guest-portal-sync.js → reloadGuestOrders() → lista frissül anélkül, hogy minden kártya összecsukódna.
         * Lásd: frontend/static/js/live-sync.js → refreshGuestPortalData()
         */
        async function reloadGuestOrders() {
          await reloadOrders();
        }

        async function refreshOrdersAfterChange() {
          const previousExpanded = new Set(expandedOrderIds);
          await loadOrders({ reset: true, preserveExpanded: previousExpanded });
        }

        async function upsertOrder() {
          await refreshOrdersAfterChange();
        }

        async function removeOrder() {
          await refreshOrdersAfterChange();
        }

        // ── Modálok — dashboard modal-box / confirm-box ──

        function openModal(modalId) {
          const modal = document.getElementById(modalId);
          if (!modal) return;
          modal.classList.remove("modal-hidden");
          requestAnimationFrame(() => modal.classList.add("open"));
        }

        function closeModal(modalId) {
          const modal = document.getElementById(modalId);
          if (!modal) return;
          modal.classList.remove("open");
          setTimeout(() => modal.classList.add("modal-hidden"), 200);
        }

        function findOrder(orderId) {
          return guestOrders.find((order) => String(order.id) === String(orderId));
        }

        function findDayGroup(order, deliveryDate) {
          return groupItemsByDay(order.items).find(
            (group) => group.delivery_date === deliveryDate,
          );
        }

        // A/B menü stepper — ugyanaz a minta, mint dashboard/orders.js
        function renderQtyStepper(menuType, qty) {
          return `
            <div class="order-edit-stepper" data-menu-type="${menuType}">
              <button type="button" class="order-edit-step-btn" data-action="dec" aria-label="Kevesebb">−</button>
              <span class="order-edit-qty" id="guestEditQty${menuType}">${qty}</span>
              <button type="button" class="order-edit-step-btn" data-action="inc" aria-label="Több">+</button>
            </div>`;
        }

        function renderDayEditLines(deliveryDate, dayGroup) {
          editingLineQty = {
            A: dayGroup.items.find((item) => item.menu_type === "A")?.quantity ?? 0,
            B: dayGroup.items.find((item) => item.menu_type === "B")?.quantity ?? 0,
          };

          const weekdayEl = document.getElementById("orderDayEditWeekday");
          const dateLabel = document.getElementById("orderDayEditDateLabel");
          const dateTime = document.getElementById("orderDayEditDateTime");

          if (weekdayEl) weekdayEl.textContent = dayGroup.day || "—";
          if (dateLabel) dateLabel.textContent = formatDate(deliveryDate);
          if (dateTime) dateTime.setAttribute("datetime", deliveryDate);

          const container = document.getElementById("orderDayEditLines");
          if (!container) return;

          const renderLine = (menuType) => {
            const item = dayGroup.items.find((entry) => entry.menu_type === menuType);
            const details = formatMenuDetails(item);
            const qty = editingLineQty[menuType];

            return `
              <div class="order-edit-line">
                <div class="order-edit-line-info">
                  <span class="order-edit-line-label">${menuType} menü</span>
                  ${details ? `<span class="order-edit-line-desc">${escapeHtml(details)}</span>` : ""}
                </div>
                ${renderQtyStepper(menuType, qty)}
              </div>`;
          };

          container.innerHTML = renderLine("A") + renderLine("B");
        }

        function changeDayEditQty(menuType, delta) {
          editingLineQty[menuType] = Math.max(0, Math.min(20, editingLineQty[menuType] + delta));
          const qtyEl = document.getElementById(`guestEditQty${menuType}`);
          if (qtyEl) qtyEl.textContent = editingLineQty[menuType];
        }

        // Egy nap A/B mennyiség módosítása
        function openDayEditModal(orderId, deliveryDate) {
          const order = findOrder(orderId);
          const dayGroup = order ? findDayGroup(order, deliveryDate) : null;
          if (!order || !dayGroup || !dayCanEdit(dayGroup)) return;

          pendingDayEdit = { orderId, deliveryDate };
          renderDayEditLines(deliveryDate, dayGroup);
          openModal("orderDayEditModal");
        }

        async function confirmDayEdit() {
          if (!pendingDayEdit) return;

          const qtyA = editingLineQty.A;
          const qtyB = editingLineQty.B;

          if (qtyA + qtyB < 1) {
            window.showToast?.("Legalább egy menüből kell legalább 1 darab.", "error");
            return;
          }

          const saveBtn = document.getElementById("orderDayEditConfirmBtn");
          if (saveBtn) saveBtn.disabled = true;

          try {
            await patchGuestOrder(pendingDayEdit.orderId, {
              delivery_date: pendingDayEdit.deliveryDate,
              item_lines: [
                { menu_type: "A", quantity: qtyA },
                { menu_type: "B", quantity: qtyB },
              ],
            });
            await upsertOrder();
            closeModal("orderDayEditModal");
            window.showToast?.("A nap mennyisége frissítve.", "success");
          } catch (error) {
            window.showToast?.(error.message || "Mentés sikertelen.", "error");
          } finally {
            if (saveBtn) saveBtn.disabled = false;
            pendingDayEdit = null;
            editingLineQty = { A: 0, B: 0 };
          }
        }

        // Szállítási cím szerkesztése
        function openAddressEditModal(orderId) {
          const order = findOrder(orderId);
          if (!order || !orderHasEditableDay(order)) return;

          pendingAddressEdit = { orderId };
          const input = document.getElementById("orderAddressEditInput");
          if (input) input.value = order.delivery_address || "";

          const hint = document.getElementById("orderAddressEditHint");
          if (hint) {
            hint.textContent = `A mentés csak a #${order.id} rendelés kiszállítási címét frissíti — pl. ideiglenes cím vagy elírás javítása. Az Adataim szekcióban mentett profilcím és a többi rendelésed változatlan marad.`;
          }

          openModal("orderAddressEditModal");
        }

        async function confirmAddressEdit() {
          if (!pendingAddressEdit) return;

          const address = (document.getElementById("orderAddressEditInput")?.value || "").trim();
          if (!address) {
            window.showToast?.("A cím megadása kötelező.", "error");
            return;
          }

          const saveBtn = document.getElementById("orderAddressEditConfirmBtn");
          if (saveBtn) saveBtn.disabled = true;

          try {
            await patchGuestOrder(pendingAddressEdit.orderId, {
              delivery_address: address,
            });
            await upsertOrder();
            closeModal("orderAddressEditModal");
            window.showToast?.("A szállítási cím frissítve.", "success");
          } catch (error) {
            window.showToast?.(error.message || "Mentés sikertelen.", "error");
          } finally {
            if (saveBtn) saveBtn.disabled = false;
            pendingAddressEdit = null;
          }
        }

        // Nap lemondása
        function openCancelModal(orderId, deliveryDate) {
          const order = findOrder(orderId);
          const dayGroup = order ? findDayGroup(order, deliveryDate) : null;
          if (!order || !dayGroup || !dayCanEdit(dayGroup)) return;

          pendingCancel = { orderId, deliveryDate, itemIds: dayGroup.itemIds };

          const body = document.getElementById("orderCancelText");
          if (body) {
            body.textContent = `Biztosan lemondod a ${dayGroup.day} (${formatDate(deliveryDate)}) napot? Ez a művelet nem vonható vissza.`;
          }

          openModal("orderCancelModal");
        }

        async function confirmCancelDay() {
          if (!pendingCancel) return;

          const confirmBtn = document.getElementById("orderCancelConfirmBtn");
          if (confirmBtn) confirmBtn.disabled = true;

          try {
            const updated = await deleteGuestOrderItems(
              pendingCancel.orderId,
              pendingCancel.itemIds,
            );

            if (updated === null) {
              await removeOrder();
            } else {
              await upsertOrder();
            }

            closeModal("orderCancelModal");
            window.showToast?.("A nap lemondva.", "success");
          } catch (error) {
            window.showToast?.(error.message || "Lemondás sikertelen.", "error");
          } finally {
            if (confirmBtn) confirmBtn.disabled = false;
            pendingCancel = null;
          }
        }

        // ── Eseménykezelők ──

        function bindOrdersEvents() {
          document.querySelectorAll("#ordersToolbar .gp-orders-tab").forEach((tab) => {
            tab.addEventListener("click", () => switchOrdersTab(tab.dataset.scope));
          });

          document.getElementById("ordersLoadMoreBtn")?.addEventListener("click", loadMoreOrders);

          const listEl = document.getElementById("ordersList");
          listEl?.addEventListener("click", (event) => {
            const toggle = event.target.closest(".gp-order-card-toggle, .gp-order-row-toggle");
            if (toggle) {
              const container = toggle.closest(".gp-order-card, .gp-order-row");
              const orderId = Number(container?.dataset.orderId);
              if (!container || !orderId) return;

              const willExpand = !container.classList.contains("is-expanded");
              setOrderExpanded(container, orderId, willExpand);
              return;
            }

            const editDayBtn = event.target.closest(".gp-order-edit-day-btn");
            if (editDayBtn && !editDayBtn.disabled) {
              openDayEditModal(editDayBtn.dataset.orderId, editDayBtn.dataset.deliveryDate);
              return;
            }

            const cancelDayBtn = event.target.closest(".gp-order-cancel-day-btn");
            if (cancelDayBtn && !cancelDayBtn.disabled) {
              openCancelModal(cancelDayBtn.dataset.orderId, cancelDayBtn.dataset.deliveryDate);
              return;
            }

            const editAddressBtn = event.target.closest(".gp-order-edit-address-btn");
            if (editAddressBtn && !editAddressBtn.disabled) {
              openAddressEditModal(editAddressBtn.dataset.orderId);
            }
          });

          // Stepper gombok a nap szerkesztő modálban
          document.getElementById("orderDayEditLines")?.addEventListener("click", (event) => {
            const btn = event.target.closest(".order-edit-step-btn");
            if (!btn) return;
            const menuType = btn.closest(".order-edit-stepper")?.dataset.menuType;
            if (!menuType) return;
            changeDayEditQty(menuType, btn.dataset.action === "inc" ? 1 : -1);
          });

          document.getElementById("orderDayEditCancelBtn")?.addEventListener("click", () => {
            pendingDayEdit = null;
            editingLineQty = { A: 0, B: 0 };
            closeModal("orderDayEditModal");
          });
          document.getElementById("orderDayEditConfirmBtn")?.addEventListener("click", confirmDayEdit);

          document.getElementById("orderAddressEditCancelBtn")?.addEventListener("click", () => {
            pendingAddressEdit = null;
            closeModal("orderAddressEditModal");
          });
          document.getElementById("orderAddressEditConfirmBtn")?.addEventListener("click", confirmAddressEdit);

          document.getElementById("orderCancelCancelBtn")?.addEventListener("click", () => {
            pendingCancel = null;
            closeModal("orderCancelModal");
          });
          document.getElementById("orderCancelConfirmBtn")?.addEventListener("click", confirmCancelDay);

          // Kattintás a sötét háttérre → bezár
          ["orderDayEditModal", "orderAddressEditModal", "orderCancelModal"].forEach((modalId) => {
            document.getElementById(modalId)?.addEventListener("click", (event) => {
              if (event.target.id === modalId) {
                pendingDayEdit = null;
                pendingAddressEdit = null;
                pendingCancel = null;
                editingLineQty = { A: 0, B: 0 };
                closeModal(modalId);
              }
            });
          });
        }

        // index.js hívja — események + első betöltés
        function initOrdersSection() { 
          const root = document.getElementById("ordersRoot");
          if (!root) return;

          bindOrdersEvents();
          loadOrders({ reset: true });
        }

        window.initOrdersSection = initOrdersSection;
        window.reloadGuestOrders = reloadGuestOrders;
})();
