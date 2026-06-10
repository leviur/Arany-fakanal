const messages = [
  {
    id: 1,
    name: "Kovács Anna",
    email: "anna.kovacs@gmail.com",
    subject: "Asztalfoglalás módosítása",
    message: "Szeretném módosítani a pénteki foglalásomat 18:00-ról 19:30-ra. Kérem visszaigazolni, hogy lehetséges-e.",
    date: "2026-06-01 10:15"
  },
  {
    id: 2,
    name: "Nagy Péter",
    email: "peter.nagy@gmail.com",
    subject: "Étel allergia kérdés",
    message: "Érdeklődnék, hogy a menü tartalmaz-e glutént vagy laktózt, mivel ételallergiám van.",
    date: "2026-06-01 12:40"
  },
  {
    id: 3,
    name: "Szabó Luca",
    email: "luca.szabo@gmail.com",
    subject: "Pozitív visszajelzés",
    message: "Nagyon finom volt az étel és a kiszolgálás is kiváló. Biztosan visszatérünk még a családdal!",
    date: "2026-06-02 18:22"
  },
  {
    id: 4,
    name: "Tóth Máté",
    email: "mate.toth@gmail.com",
    subject: "Számla kérés",
    message: "Szükségem lenne a tegnapi rendelésről egy számlára, céges elszámoláshoz.",
    date: "2026-06-02 09:10"
  },
  {
    id: 5,
    name: "Horváth Réka",
    email: "reka.horvath@gmail.com",
    subject: "Hosszabb visszajelzés az étteremről",
    message: "Többször jártunk már Önöknél, és minden alkalommal nagyon elégedettek voltunk. Az ételek mindig frissek és ízletesek. A személyzet figyelmes, a hangulat pedig kiváló.",
    date: "2026-06-03 20:05"
  },
  {
    id: 6,
    name: "Kiss Dániel",
    email: "daniel.kiss@gmail.com",
    subject: "Rendezvény érdeklődés",
    message: "Esküvői vacsorát szeretnénk szervezni kb. 40 főre. Van erre lehetőség az étteremben?",
    date: "2026-06-03 14:33"
  },
  {
    id: 7,
    name: "Varga Eszter",
    email: "eszter.varga@gmail.com",
    subject: "Reklamáció",
    message: "A tegnapi étel hidegen érkezett, és a köret sajnos túl sós volt.",
    date: "2026-06-04 11:20"
  },
  {
    id: 8,
    name: "Fekete Balázs",
    email: "balazs.fekete@gmail.com",
    subject: "Nyitvatartás",
    message: "Ünnepnapokon is nyitva vannak?",
    date: "2026-06-04 08:50"
  },
  {
    id: 9,
    name: "Molnár Zsófia",
    email: "zsofia.molnar@gmail.com",
    subject: "Hosszú élménybeszámoló",
    message: "Nagyon kellemes este volt az étteremben. A hangulat, a zene és a világítás is tökéletes volt. Az ételek kifogástalanok voltak, a desszertek különösen emlékezetesek. A személyzet figyelmes volt, de nem tolakodó.",
    date: "2026-06-05 21:18"
  },
  {
    id: 10,
    name: "Juhász Roland",
    email: "roland.juhasz@gmail.com",
    subject: "Asztalfoglalás",
    message: "Szombatra szeretnék asztalt 4 főre 19:00-ra.",
    date: "2026-06-05 13:05"
  },
  {
    id: 11,
    name: "Simon Tamás",
    email: "tamas.simon@gmail.com",
    subject: "Vegetáriánus opció",
    message: "Van vegetáriánus étel az étlapon?",
    date: "2026-06-06 16:45"
  },
  {
    id: 12,
    name: "Németh Kinga",
    email: "kinga.nemeth@gmail.com",
    subject: "Köszönet",
    message: "Köszönjük a vendéglátást, minden fantasztikus volt!",
    date: "2026-06-06 19:30"
  },

  {
    id: 13,
    name: "Barna Dávid",
    email: "david.barna@gmail.com",
    subject: "Helyszín érdeklődés",
    message: "Érdeklődnék, hogy nagyobb céges rendezvényeket is tudnak-e fogadni 60-80 fővel.",
    date: "2026-06-07 10:10"
  },
  {
    id: 14,
    name: "Tóth Zsuzsa",
    email: "zsuzsa.toth@gmail.com",
    subject: "Étel kérdés",
    message: "Tartalmaz a halászlé glutént?",
    date: "2026-06-07 11:25"
  },
  {
    id: 15,
    name: "Papp Gábor",
    email: "gabor.papp@gmail.com",
    subject: "Hosszabb visszajelzés",
    message: "Az étterem hangulata nagyon kellemes volt, a kiszolgálás gyors és figyelmes. Az ételek ízletesek voltak, különösen a steak és a desszertek. Biztosan visszatérünk még a jövőben.",
    date: "2026-06-07 18:40"
  },
  {
    id: 16,
    name: "Kiss Réka",
    email: "r.kiss@gmail.com",
    subject: "Foglalás módosítás",
    message: "A holnapi foglalásomat szeretném 1 órával későbbre módosítani.",
    date: "2026-06-08 09:00"
  },
  {
    id: 17,
    name: "Horváth László",
    email: "laszlo.horvath@gmail.com",
    subject: "Rövid kérdés",
    message: "Van parkolási lehetőség az étteremnél?",
    date: "2026-06-08 12:15"
  },
  {
    id: 18,
    name: "Farkas Anna",
    email: "anna.farkas@gmail.com",
    subject: "Késés jelzés",
    message: "10-15 percet késünk a foglalásról, ez probléma?",
    date: "2026-06-08 17:20"
  },
  {
    id: 19,
    name: "Molnár Péter",
    email: "peter.molnar@gmail.com",
    subject: "Nagyon hosszú visszajelzés az élményről",
    message: "Az éttermi élményünk kiváló volt. A kiszolgálás gyors, az ételek frissek és ízletesek voltak. A hangulat nagyon barátságos, a személyzet pedig végig figyelmes volt. Külön kiemelném a desszerteket, amelyek igazán különlegesek voltak. Ritkán találkozni ilyen magas színvonalú vendéglátással, ezért biztosan visszatérünk még több alkalommal is a jövőben.",
    date: "2026-06-09 19:45"
  },
  {
    id: 20,
    name: "Szilágyi Erika",
    email: "erika.sz@gmail.com",
    subject: "Asztalfoglalás",
    message: "Kérek egy asztalt 2 főre péntek estére 18:30-ra.",
    date: "2026-06-09 14:10"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  renderMessages(messages);
});

function renderMessages(data) {
  const root = document.getElementById("messages-root");

  root.innerHTML = `
    <div class="msg-grid">
      ${data.map(msg => `
        <div class="msg-card" data-id="${msg.id}">
           <div class="msg-content">

                <div class="msg-head">
                        <div class="msg-name">${msg.name}</div>
                        <div class="msg-date">${msg.date}</div>
                </div>

                <div class="msg-email">${msg.email}</div>
                <div class="msg-subject">${msg.subject}</div>
                <div class="msg-text">${msg.message}</div>
          </div>


          <div class="msg-actions">
            <button class="msg-btn msg-more">Tovább</button>
            <button class="msg-btn msg-btn-delete">Törlés</button>
          </div>


        </div>
      `).join("")}
    </div>
  `;


  document.getElementById("msg-count").textContent =
    `(${data.length} üzenet)`;
  
    enableMessageExpand();

  
}

function enableMessageExpand() {
  document.querySelectorAll(".msg-more").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      const card = btn.closest(".msg-card");
      const isOpen = card.classList.toggle("expanded");

      btn.textContent = isOpen ? "Bezár" : "Tovább";
    });
  });
}






