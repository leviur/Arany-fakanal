// 1. Kategóriák és adatok definiálása
const categories = [
    { name: 'Előételek', icon: '🍽️' },
    { name: 'Levesek', icon: '🥣' },
    { name: 'Halételek és szárnyasok', icon: '🐟' },
    { name: 'Rántott és töltött húsok', icon: '🐟' },
    { name: 'Sültek', icon: '🍖' },
    { name: 'Egytálételek', icon: '🥘' },
    { name: 'Desszertek', icon: '🍰' },
    { name: 'Italok', icon: '🍹' }
];

const categoryData = {
  'Előételek': [
    {
      nev: "Kézműves krémvariációk friss kenyérrel",
      ar: "2690 Ft",
      leiras: "Mangalica tepertőkrém, fűszeres körözött és padlizsánkrém házi kovászos kenyérrel és friss kerti zöldségekkel."
    },
    {
      nev: "Érlelt bélszíntatár a kert legjavával",
      ar: "3990 Ft",
      leiras: "Hagyományos recept alapján fűszerezett, selymes textúrájú marhabélszín, friss idényzöldségekkel, vajjal/kacsazsírral és ropogós házi kovászos kenyérrel."
    },
    {
      nev: "Kemencés velős csont lilahagyma-lekvárral",
      ar: "3190 Ft",
      leiras: "Fűszeres velős csont, házi készítésű, édeskés-savanykás lilahagyma-lekvárral és ropogós házi kovászos kenyérrel."
    },
    {
      nev: "A kamra kincsei",
      ar: "4490 Ft",
      leiras: "Füstölt kolbász, pikáns paprikás szalámi, omlós sonka, érlelt és füstölt sajtok, savanyúság és kovászos kenyér."
    }
  ],

  'Levesek': [
    {
      nev: "Gulyásleves",
      ar: "3490 Ft",
      leiras: "Omlós marhahúsból, lassú tűzön főzött gazdag gulyásleves csipetkével."
    },
    {
      nev: "Füstölt csülkös Jókai bableves",
      ar: "3190 Ft",
      leiras: "Tartalmas bableves füstölt csülökkel és házi kolbásszal, tejföllel és petrezselyemmel."
    },
    {
      nev: "Marhahúsleves gazdagon",
      ar: "2790 Ft",
      leiras: "Kristálytiszta, hosszú főzésű húsleves marhafartővel és házi tésztával."
    },
    {
      nev: "Tavaszi zöldborsóleves vajas galuskával",
      ar: "2790 Ft",
      leiras: "Könnyed zöldborsóleves vajas galuskával."
    },
    {
      nev: "Szegedi halászlé szaftos pontyfilével",
      ar: "3490 Ft",
      leiras: "Intenzív halászlé pontyfilével és friss kenyérrel."
    }
  ],

  'Halételek és szárnyasok': [
    {
      nev: "Mandulás bundában sült fogasfilé",
      ar: "4890 Ft",
      leiras: "Ropogós mandulás bundában sült fogasfilé majonézes burgonyasalátával."
    },
    {
      nev: "Harcsapaprikás túrós csuszával",
      ar: "5890 Ft",
      leiras: "Szaftos harcsapaprikás túrós csuszával."
    },
    {
      nev: "Tanyasi paprikás csirke vajas galuskával",
      ar: "5490 Ft",
      leiras: "Tejfölös paprikás csirke vajas galuskával."
    },
    {
      nev: "Mátrai borzas csirkemell",
      ar: "5690 Ft",
      leiras: "Ropogós csirkemell fokhagymás bundában, füstölt sajttal."
    }
  ],

  'Rántott és töltött húsok': [
    {
      nev: "Klasszikus rántott szelet",
      ar: "5690 Ft",
      leiras: "Aranybarna panko bundás rántott szelet vajas burgonyával."
    },
    {
      nev: "Pásztorok kedvence karaj rántva",
      ar: "5890 Ft",
      leiras: "Töltött karaj kolbásszal és juhtúróval, burgonyapürével."
    }
  ],

  'Sültek': [
    {
      nev: "Marhapörkölt galuskával",
      ar: "5890 Ft",
      leiras: "Omlós marhalábszárból, sűrű szafttal, vörösborral és fűszerpaprikával lassan főzött pörkölt, tojásos házi galuskával és kovászos uborkával."
    },
    {
      nev: "Cigánypecsenye kakastaréjjal",
      ar: "5890 Ft",
      leiras: "Fokhagymás pácban érlelt sertéstarja ropogós szalonnataréjjal, házi rósejbnivel."
    },
    {
      nev: "Kemencés csülök Pékné módra",
      ar: "6590 Ft",
      leiras: "Kívül ropogós, belül omlós csülök, hagymás-fokhagymás kemencés burgonyával."
    }
  ],

  'Egytálételek': [
    {
      nev: "Kolozsvári töltött káposzta",
      ar: "5690 Ft",
      leiras: "Savanyú káposzta ágyon, füstölt csülökkel és házi kolbásszal lassan összefőzött szaftos töltelékek, tejföllel és friss kenyérrel."
    },
    {
      nev: "Házi töltött paprika és paradicsomos húsgombóc",
      ar: "5390 Ft",
      leiras: "Fűszeres húsos rizzsel töltött paprika és omlós húsgombócok selymes paradicsommártásban, főtt burgonyával."
    }
  ],

  'Desszertek': [
    {
      nev: "Somlói galuska",
      ar: "2590 Ft",
      leiras: "Diós, vaníliás és kakaós piskóta rétegek rumos mazsolával és csokoládéöntettel."
    },
    {
      nev: "Pillekönnyű túrógombóc édes tejföllel",
      ar: "2150 Ft",
      leiras: "Túrógombóc pirított morzsában, vaníliás tejföllel."
    },
    {
      nev: "Rákóczi túrós",
      ar: "2790 Ft",
      leiras: "Omlós tészta, citromos túrókrém és tojáshab baracklekvárral."
    },
    {
      nev: "Aranygaluska selymes vaníliasodóval",
      ar: "2790 Ft",
      leiras: "Foszlós kelt tészta dióval és vaníliasodóval."
    },
    {
      nev: "Mákos guba vaníliaöntettel",
      ar: "2190 Ft",
      leiras: "Kifli, mák és vaníliás öntet, sütve."
    }
  ],

  'Italok': [
    {
      nev: "Meggypálinka",
      ar: "2190 Ft",
      leiras: ""
    },
    {
      nev: "Szilvapálinka",
      ar: "2490 Ft",
      leiras: ""
    },
    {
      nev: "Kajszibarack Pálinka",
      ar: "3690 Ft",
      leiras: ""
    },
    {
      nev: "Villányi Portugieser",
      ar: "6890 Ft",
      leiras: ""
    },
    {
      nev: "Tokaji Furmint",
      ar: "9990 Ft",
      leiras: ""
    },
    {
      nev: "Tokaji Aszú 5 Puttonyos",
      ar: "13890 Ft",
      leiras: ""
    },
    {
      nev: "Soproni",
      ar: "1090 Ft",
      leiras: ""
    },
    {
      nev: "Pilsner Urquell",
      ar: "1190 Ft",
      leiras: ""
    },
    {
      nev: "Dreher Bak (Barna sör)",
      ar: "1390 Ft",
      leiras: ""
    },
    {
      nev: "Házi Limonádé szódával",
      ar: "1190 Ft",
      leiras: ""
    }
  ]
};

const days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];

// 2. Segédfüggvények
const getDayHTML = (day) => `
    <div class="day-column">
        <h3>${day}</h3>
        <div class="menu-block">
            <h4>A Menü</h4>
            <label>Leves</label><select class="menu-select" data-type="leves"><option value="">Leves választása</option></select>
            <label>Főétel</label><select class="menu-select" data-type="foetel"><option value="">Főétel választása</option></select>
            <label>Desszert</label><select class="menu-select" data-type="desszert"><option value="">Desszert választása</option></select>
        </div>
        <div class="menu-block">
            <h4>B Menü</h4>
            <label>Leves</label><select class="menu-select" data-type="leves"><option value="">Leves választása</option></select>
            <label>Főétel</label><select class="menu-select" data-type="foetel"><option value="">Főétel választása</option></select>
            <label>Desszert</label><select class="menu-select" data-type="desszert"><option value="">Desszert választása</option></select>
        </div>
    </div>
`;

const generateRows = (items, catName) => items.map((item, index) => `
    <tr>
        <td>${item.nev}</td>
        <td>${item.ar}</td>
        <td>${item.leiras}</td>
        <td class="actions">
            <button class="icon-btn edit-btn" data-cat="${catName}" data-index="${index}">✏️</button>
            <button class="icon-btn delete-btn" data-cat="${catName}" data-index="${index}">🗑️</button>
        </td>
    </tr>
`).join('');

const contentData = {
    'heti-menu': `<div class="menu-grid">${days.map(day => getDayHTML(day)).join('')}</div><button class="heti-menu-save-btn">Heti menü mentése</button>`,
    'etelek': `
        <div class="content-card">
            <aside class="category-sidebar">
                <h3>Kategóriák</h3>
                <ul>${categories.map((cat, index) => `<li class="cat-item ${index === 0 ? 'active' : ''}" data-cat="${cat.name}"><span>${cat.icon}</span> ${cat.name}</li>`).join('')}</ul>
            </aside>
            <main class="category-table-area">
                <div class="table-header"><h2 id="category-title">Előételek</h2><button class="add-btn">+ Új étel hozzáadása</button></div>
                <div class="table-wrapper"><table class="food-table"><thead><tr><th>Név</th><th>Ár</th><th>Leírás</th><th>Műveletek</th></tr></thead><tbody></tbody></table></div>
            </main>
        </div>`
};

// 3. Globális eseménykezelők (Modal és Mentés)
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-overlay');
    document.getElementById('close-modal').addEventListener('click', () => {
        resetModal(modal); 
        modal.classList.add('modal-hidden')
    });

    document.getElementById('save-food').addEventListener('click', () => {
        const nameInput = document.getElementById('food-name');
        const priceInput = document.getElementById('food-price');
        const descInput = document.getElementById('food-desc');

        if (!nameInput.value.trim() || !priceInput.value.trim() || !descInput.value.trim()) {
            alert('Kérlek, minden mezőt tölts ki!');
            return;
        }

        const mode = modal.dataset.mode;
        const editIdx = modal.dataset.editIndex;
        const activeCat = (mode === 'edit') ? modal.dataset.cat : document.querySelector('.cat-item.active').getAttribute('data-cat');
        
        const newFood = { nev: nameInput.value, ar: priceInput.value + ' Ft', leiras: descInput.value };

        if (mode === 'edit') {
            categoryData[activeCat][editIdx] = newFood;
        } else {
            categoryData[activeCat].push(newFood);
        }

        const tbody = document.querySelector('.food-table tbody');
        if (tbody) tbody.innerHTML = generateRows(categoryData[activeCat], activeCat);
        
        resetModal(modal);
        modal.classList.add('modal-hidden');
    });
});

// 4. Tartalom betöltése
function loadContent(target) {
    document.querySelector('.tab-content').innerHTML = contentData[target];

    if (target === 'heti-menu') {
        updateMenuSelects(); // Itt töltjük fel a selecteket
    }
    if (target === 'etelek') {
        const tbody = document.querySelector('.food-table tbody');
        const modal = document.getElementById('modal-overlay');
        const activeCat = document.querySelector('.cat-item.active').getAttribute('data-cat');
        tbody.innerHTML = generateRows(categoryData[activeCat] || [], activeCat);

        tbody.onclick = (e) => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');
            const currentCat = document.querySelector('.cat-item.active').getAttribute('data-cat');

            if (deleteBtn) {
                const idx = deleteBtn.getAttribute('data-index');
                if (confirm('Biztosan törlöd?')) {
                    categoryData[currentCat].splice(idx, 1);
                    tbody.innerHTML = generateRows(categoryData[currentCat], currentCat);
                }
            } else if (editBtn) {
                const idx = editBtn.getAttribute('data-index');
                const item = categoryData[currentCat][idx];
                document.getElementById('modal-cat-name').textContent = currentCat;
                document.getElementById('food-name').value = item.nev;
                document.getElementById('food-desc').value = item.leiras;
                document.getElementById('food-price').value = parseInt(item.ar);
                modal.dataset.mode = 'edit';
                modal.dataset.editIndex = idx;
                modal.dataset.cat = currentCat;
                modal.classList.remove('modal-hidden');
            }
        };

        document.querySelector('.add-btn').onclick = () => {
          resetModal(modal);
          modal.dataset.mode = 'add';
          
          document.getElementById('modal-cat-name').textContent =
              document.querySelector('.cat-item.active').getAttribute('data-cat');

          modal.classList.remove('modal-hidden');
      };

        document.querySelector('.category-sidebar ul').onclick = (e) => {
            const item = e.target.closest('.cat-item');
            if (!item) return;
            document.querySelectorAll('.cat-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const catName = item.getAttribute('data-cat');
            document.getElementById('category-title').innerText = catName;
            tbody.innerHTML = generateRows(categoryData[catName] || [], catName);
        };
    }
}

document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        loadContent(button.getAttribute('data-target'));
    });
});

function resetModal(modal) {
    document.getElementById('food-name').value = "";
    document.getElementById('food-desc').value = "";
    document.getElementById('food-price').value = "";
    document.getElementById('modal-cat-name').textContent = "";

    delete modal.dataset.mode;
    delete modal.dataset.editIndex;
    delete modal.dataset.cat;
}

function updateMenuSelects() {
    // Összegyűjtjük az ételeket kategóriák szerint
    const levesek = categoryData['Levesek'] || [];
    
    // Főételek kategóriái összefűzve (kivéve leves, ital, desszert)
    const foetelekCategories = ['Halételek és szárnyasok', 'Rántott és töltött húsok', 'Sültek', 'Egytálételek'];
    let foetelek = [];
    foetelekCategories.forEach(cat => {
        foetelek = foetelek.concat(categoryData[cat] || []);
    });

    const desszertek = categoryData['Desszertek'] || [];
    
    // Megkeressük az összes "leves" típusú selectet
    document.querySelectorAll('select[data-type="leves"]').forEach(select => {
        // Megtartjuk az első opciót
        select.innerHTML = '<option value="">Leves választása</option>';
        
        // Hozzáfűzzük a felvitt ételeket
        levesek.forEach(leves => {
            const option = document.createElement('option');
            option.value = leves.nev;
            option.textContent = leves.nev;
            select.appendChild(option);
        });
    });

    // Frissítjük az összes "foetel" selectet
    document.querySelectorAll('select[data-type="foetel"]').forEach(select => {
        select.innerHTML = '<option value="">Főétel választása</option>';
        foetelek.forEach(foetel => {
            const option = document.createElement('option');
            option.value = foetel.nev;
            option.textContent = foetel.nev;
            select.appendChild(option);
        });
    });

    // Frissítjük az összes "desszert" selectet
    document.querySelectorAll('select[data-type="desszert"]').forEach(select => {
        select.innerHTML = '<option value="">Desszert választása</option>';
        desszertek.forEach(desszert => {
            const option = document.createElement('option');
            option.value = desszert.nev;
            option.textContent = desszert.nev;
            select.appendChild(option);
        });
    });
}

window.addEventListener('DOMContentLoaded', () => loadContent('heti-menu'));