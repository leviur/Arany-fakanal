const Bookings = (() => {

  let filteredBookings = [];
  let activeBooking = null;

const demoBookings = [
  { id: "001", name: "Kiss János", email: "kiss.janos@gmail.com", phone: "+36 30 111 2233", occasion: "Születésnap", date: "2026.06.09", time: "17:00", eventDateTime: "2026.06.09 17:00", createdAt: "2026.06.08 09:00", statusChangedAt: "", guests: 4, note: "Ablak melletti asztal", status: "Új" },
  { id: "002", name: "Nagy Anna", email: "anna.nagy@gmail.com", phone: "+36 20 444 5566", occasion: "Évforduló", date: "2026.06.09", time: "18:30", eventDateTime: "2026.06.09 18:30", createdAt: "2026.06.08 09:15", statusChangedAt: "", guests: 2, note: "", status: "Új" },
  { id: "003", name: "Szabó Péter", email: "szabo.peter@freemail.hu", phone: "+36 70 777 8899", occasion: "Céges vacsora", date: "2026.06.09", time: "20:00", eventDateTime: "2026.06.09 20:00", createdAt: "2026.06.08 10:00", statusChangedAt: "", guests: 8, note: "VIP asztal", status: "Új" },
  { id: "004", name: "Tóth Réka", email: "reka.toth@gmail.com", phone: "+36 30 222 3344", occasion: "Baráti találkozó", date: "2026.06.09", time: "21:00", eventDateTime: "2026.06.09 21:00", createdAt: "2026.06.08 10:30", statusChangedAt: "", guests: 3, note: "", status: "Új" },
  { id: "005", name: "Horváth László", email: "laci.horvath@gmail.com", phone: "+36 20 123 4567", occasion: "Családi ebéd", date: "2026.06.10", time: "13:00", eventDateTime: "2026.06.10 13:00", createdAt: "2026.06.08 11:00", statusChangedAt: "", guests: 5, note: "Etetőszék szükséges", status: "Új" },
  { id: "006", name: "Kovács Dóra", email: "kovacs.dora@gmail.com", phone: "+36 70 987 6543", occasion: "Születésnap", date: "2026.06.10", time: "19:00", eventDateTime: "2026.06.10 19:00", createdAt: "2026.06.08 11:30", statusChangedAt: "", guests: 6, note: "Torta szükséges", status: "Új" },
  { id: "007", name: "Varga Tamás", email: "tamas.varga@gmail.com", phone: "+36 30 555 6677", occasion: "Randevú", date: "2026.06.10", time: "19:30", eventDateTime: "2026.06.10 19:30", createdAt: "2026.06.08 12:00", statusChangedAt: "", guests: 2, note: "", status: "Új" },
  { id: "008", name: "Farkas Lilla", email: "lilla.farkas@gmail.com", phone: "+36 20 333 4455", occasion: "Évforduló", date: "2026.06.10", time: "20:00", eventDateTime: "2026.06.10 20:00", createdAt: "2026.06.08 12:45", statusChangedAt: "", guests: 2, note: "Romantikus asztal", status: "Új" },
  { id: "009", name: "Molnár Zoltán", email: "zoltan.molnar@gmail.com", phone: "+36 70 111 9988", occasion: "Üzleti ebéd", date: "2026.06.11", time: "12:00", eventDateTime: "2026.06.11 12:00", createdAt: "2026.06.08 13:00", statusChangedAt: "", guests: 3, note: "Csendesebb sarok", status: "Új" },
  { id: "010", name: "Balogh Katalin", email: "kati.balogh@gmail.com", phone: "+36 30 666 7788", occasion: "Névnap", date: "2026.06.11", time: "18:00", eventDateTime: "2026.06.11 18:00", createdAt: "2026.06.08 13:30", statusChangedAt: "", guests: 4, note: "", status: "Új" },
  { id: "011", name: "Lakatos Imre", email: "imre.lakatos@gmail.com", phone: "+36 20 222 1100", occasion: "Baráti sörözés", date: "2026.06.11", time: "20:30", eventDateTime: "2026.06.11 20:30", createdAt: "2026.06.08 14:00", statusChangedAt: "", guests: 6, note: "", status: "Új" },
  { id: "012", name: "Papp Viktória", email: "viktoria.papp@gmail.com", phone: "+36 70 444 3322", occasion: "Születésnap", date: "2026.06.12", time: "17:00", eventDateTime: "2026.06.12 17:00", createdAt: "2026.06.08 14:30", statusChangedAt: "", guests: 5, note: "Gyertyák kellenek", status: "Új" },
  { id: "013", name: "Németh Ádám", email: "adam.nemeth@gmail.com", phone: "+36 30 888 7766", occasion: "Randevú", date: "2026.06.12", time: "18:30", eventDateTime: "2026.06.12 18:30", createdAt: "2026.06.08 15:00", statusChangedAt: "", guests: 2, note: "", status: "Új" },
  { id: "014", name: "Oláh Zsófia", email: "zsofia.olah@gmail.com", phone: "+36 20 999 0011", occasion: "Családi vacsora", date: "2026.06.12", time: "19:00", eventDateTime: "2026.06.12 19:00", createdAt: "2026.06.08 15:30", statusChangedAt: "", guests: 4, note: "", status: "Új" },
  { id: "015", name: "Gulyás Tamás", email: "tamas.gulyas@gmail.com", phone: "+36 70 222 5566", occasion: "Céges csapatépítő", date: "2026.06.13", time: "19:00", eventDateTime: "2026.06.13 19:00", createdAt: "2026.06.08 16:00", statusChangedAt: "", guests: 10, note: "Hosszú asztal", status: "Új" },
  { id: "016", name: "Takács Éva", email: "eva.takacs@gmail.com", phone: "+36 30 444 8877", occasion: "Baráti találkozó", date: "2026.06.13", time: "20:00", eventDateTime: "2026.06.13 20:00", createdAt: "2026.06.08 16:30", statusChangedAt: "", guests: 4, note: "", status: "Új" },
  { id: "017", name: "Simon Krisztián", email: "krisztian.simon@gmail.com", phone: "+36 20 111 6677", occasion: "Születésnap", date: "2026.06.14", time: "18:00", eventDateTime: "2026.06.14 18:00", createdAt: "2026.06.08 17:00", statusChangedAt: "", guests: 7, note: "", status: "Új" },
  { id: "018", name: "Boros Dóra", email: "dora.boros@gmail.com", phone: "+36 70 555 4433", occasion: "Évforduló", date: "2026.06.14", time: "19:30", eventDateTime: "2026.06.14 19:30", createdAt: "2026.06.08 17:30", statusChangedAt: "", guests: 2, note: "Pezsgő bekészítve", status: "Új" },
  { id: "019", name: "Kerekes Márk", email: "mark.kerekes@gmail.com", phone: "+36 30 777 0099", occasion: "Randevú", date: "2026.06.14", time: "20:00", eventDateTime: "2026.06.14 20:00", createdAt: "2026.06.08 18:00", statusChangedAt: "", guests: 2, note: "", status: "Új" },
  { id: "020", name: "Szalai Petra", email: "petra.szalai@gmail.com", phone: "+36 20 888 2233", occasion: "Baráti sörözés", date: "2026.06.15", time: "21:00", eventDateTime: "2026.06.15 21:00", createdAt: "2026.06.08 18:30", statusChangedAt: "", guests: 3, note: "Pult közelébe", status: "Új" }
];

  function getBookings() {
  return demoBookings.map(b => ({
    ...b,
    status: b.status || "Új"
  }));
}

  function applyFilters() {
    const searchValue =
      document.getElementById("bookingSearch")?.value.toLowerCase() || "";

    const statusValue =
      document.getElementById("bookingStatusFilter")?.value || "all";

    filteredBookings = demoBookings.filter(b => {

      const matchesSearch =
        b.name.toLowerCase().includes(searchValue) ||
        b.email.toLowerCase().includes(searchValue) ||
        b.phone.toLowerCase().includes(searchValue) ||
        b.occasion.toLowerCase().includes(searchValue) ||
        b.date.includes(searchValue);

      const matchesStatus =
        statusValue === "all" || b.status === statusValue;

      return matchesSearch && matchesStatus;
    });

    updateTable();
  }

  function updateTable() {
    const tbody = document.getElementById("bookingTableBody");
    if (!tbody) return;

    tbody.innerHTML = filteredBookings.map(createRow).join("");
    bindEvents();
  }


  
 /* A táblázat sorainak generálása */
function createRow(b) {
    const sla = getBookingStatus(b); // A beállítások szerinti állapot
    
    
    const dateTime = b.eventDateTime || `${b.date} ${b.time}`;
    const formattedDateTime = dateTime.replace(" ", "<br>");

    // Státusz osztályok a CSS-hez (warning, problem, ok)
    let rowClass = "";
    if (sla.state === "warning") rowClass = "row-warning";
    if (sla.state === "problem") rowClass = "row-problem";

    return `
        <tr data-id="${b.id}">
            <td>${b.id}</td>
            <td>${b.name}</td>
            <td>${b.email}</td>
            <td>${b.phone}</td>
            <td>${b.occasion}</td>
            <td>${b.date} ${b.time}</td>
            <td>${b.guests} fő</td>
            <td>${b.note || '-'}</td>
            <td>${b.createdAt}</td>
            <td>
                <select class="booking-status-select" data-id="${b.id}">
                    <option value="Új" ${b.status === 'Új' ? 'selected' : ''}>Új</option>
                    <option value="Visszaigazolt" ${b.status === 'Visszaigazolt' ? 'selected' : ''}>Visszaigazolt</option>
                    <option value="Lemondva" ${b.status === 'Lemondva' ? 'selected' : ''}>Lemondva</option>
                    <option value="Teljesítve" ${b.status === 'Teljesítve' ? 'selected' : ''}>Teljesítve</option>
                </select>
            </td>
            <td>${b.statusChangedAt || '-'}</td>
            <td>
                <button class="bookings-edit-btn" onclick="Bookings.openModal('${b.id}')">✏️</button>
                <button class="bookings-delete-btn" onclick="Bookings.deleteBooking('${b.id}')">🗑️</button>
            </td>
        </tr>
    `;
}

/* Státusz színezése */
function updateBookingStatusColor(select) {
  select.classList.remove(
    "status-new",
    "status-confirmed",
    "status-cancelled",
    "status-done"
  );

  const map = {
    "Új": "status-new",
    "Visszaigazolt": "status-confirmed",
    "Lemondva": "status-cancelled",
    "Teljesítve": "status-done"
  };
  select.classList.add(map[select.value]);
}


 /* A teljes táblázat renderelése */
function render() {
    const tbody = document.getElementById("bookingTableBody");
    if (!tbody) {
        console.error("Nem található a bookingTableBody elem!");
        return;
    }

    // A saját, modulon belüli demoBookings-ot használjuk!
    const bookings = demoBookings; 

    const sortedBookings = [...bookings].sort((a, b) => 
        new Date(a.eventDateTime) - new Date(b.eventDateTime)
    );

    tbody.innerHTML = sortedBookings.map(b => createRow(b)).join("");
    bindEvents(); // Itt kell meghívni az eseménykötést is!
}

  function bindEvents() {

    document.querySelectorAll(".booking-status-select").forEach(sel => {
      sel.addEventListener("change", (e) => {
        updateBookingStatusColor(sel);
        const id = sel.dataset.id;
        const booking = demoBookings.find(b => b.id === id);
        if (!booking) return;

        booking.status = e.target.value;
        booking.statusChangedAt = new Date().toLocaleString("hu-HU");
        applyFilters();
        window.refreshDashboard?.();
      });
    });

    document.getElementById("bookingSearch")
      ?.addEventListener("input", applyFilters);

    document.getElementById("bookingStatusFilter")
      ?.addEventListener("change", applyFilters);

    document.getElementById("bookingModalClose")
      ?.addEventListener("click", closeModal);

    document.querySelectorAll(".booking-status-select").forEach(select => {
      updateBookingStatusColor(select);
    });
  }

  function openModal(id) {
  activeBooking = demoBookings.find(b => b.id === id);
  if (!activeBooking) return;

  const modal = document.getElementById("bookingModal");
  modal.classList.remove("hidden");

  document.getElementById("m-name").value = activeBooking.name;
  document.getElementById("m-email").value = activeBooking.email;
  document.getElementById("m-phone").value = activeBooking.phone;
  document.getElementById("m-occasion").value = activeBooking.occasion;

  document.getElementById("m-date").value = activeBooking.date.replace(/\./g, '-');
  
  document.getElementById("m-guests").value = activeBooking.guests;
  document.getElementById("m-note").value = activeBooking.note;

  initTimeStepper(activeBooking.time);  
}

function deleteBooking(id) {
  const index = demoBookings.findIndex(b => b.id === id);
  if (index === -1) return;

  const ok = confirm("Biztosan törlöd ezt a foglalást?");
  if (!ok) return;

  demoBookings.splice(index, 1);

  applyFilters();
  window.refreshDashboard?.();
}

  function closeModal() {
    document.getElementById("bookingModal").classList.add("hidden");
    activeBooking = null;
  }

  function saveModal() {
    if (!activeBooking) return;

    activeBooking.name = document.getElementById("m-name").value;
    activeBooking.email = document.getElementById("m-email").value;
    activeBooking.phone = document.getElementById("m-phone").value;
    activeBooking.occasion = document.getElementById("m-occasion").value;
    activeBooking.date = document.getElementById("m-date").value;
    activeBooking.time = document.getElementById("m-time").value;
    activeBooking.guests = document.getElementById("m-guests").value;
    activeBooking.note = document.getElementById("m-note").value;

    applyFilters();
    closeModal();

    window.refreshDashboard?.();
  }


  return {
    render,
    saveModal,
    openModal,
    closeModal,
    getBookings,
    deleteBooking
  };

})();


const TIME_SLOTS = (() => {
  const arr = [];
  const start = 11 * 60;
  const end = 20 * 60 + 30;

  for (let t = start; t <= end; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;

    arr.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
  }

  return arr;
})();

let timeIndex = 0;

function updateTimeUI() {
  const time = TIME_SLOTS[timeIndex];

  document.getElementById("time-display").textContent = time;
  document.getElementById("m-time").value = time;
}

function initTimeStepper(selectedTime = "11:00") {
  const index = TIME_SLOTS.indexOf(selectedTime);

  timeIndex = index >= 0 ? index : 0;

  updateTimeUI();

  document.getElementById("time-prev").onclick = () => {
    if (timeIndex > 0) {
      timeIndex--;
      updateTimeUI();
    }
  };

  document.getElementById("time-next").onclick = () => {
    if (timeIndex < TIME_SLOTS.length - 1) {
      timeIndex++;
      updateTimeUI();
    }
  };
}


function getBookings() {
  return demoBookings.map(b => ({
    ...b,
    status: b.status || "Új"
  }));
}