const specializations = {
    USA: [
        "Airborne",
        "Armored",
        "SOF",
        "Marines",
        "Stryker"
    ],

    Russia: [
        "VDV",
        "Mechanized",
        "Tank",
        "Naval",
        "SOF"
    ]
};

const limits = {
    REC: 2250,
    INF: 2250,
    VEH: 1750,
    SUP: 1250,
    HEL: 1250,
    AIR: 1250
};

let allUnits = [];
let deck = [];

let currentFaction = "USA";
let currentSpecs = [];

let searchQuery = "";

let currentCategory = "ALL";
let currentTag = "ALL";

async function loadUnits() {
    const response = await fetch("data/units.json");
    allUnits = await response.json();

    console.log("Units loaded:", allUnits);

    renderUnits();
}

function setupFilters() {
    const factionSelect = document.getElementById("factionSelect");
    const specOneSelect = document.getElementById("specOneSelect");
    const specTwoSelect = document.getElementById("specTwoSelect");

    const searchInput =
    document.getElementById("searchInput");

    const categoryFilter =
    document.getElementById("categoryFilter");

const tagFilter =
    document.getElementById("tagFilter");

    function populateSpecs() {
        const specs = specializations[factionSelect.value];

        specOneSelect.innerHTML = "";
        specTwoSelect.innerHTML = "";

        specs.forEach(spec => {
            const optionOne = document.createElement("option");
            optionOne.value = spec;
            optionOne.textContent = spec;
            specOneSelect.appendChild(optionOne);

            const optionTwo = document.createElement("option");
            optionTwo.value = spec;
            optionTwo.textContent = spec;
            specTwoSelect.appendChild(optionTwo);
        });

        if (specs.length > 1) {
            specTwoSelect.selectedIndex = 1;
        }

        currentFaction = factionSelect.value;

        currentSpecs = [
            specOneSelect.value,
            specTwoSelect.value
        ];

        deck = [];
        renderUnits();
        renderDeck();
        updatePoints();
    }

    factionSelect.addEventListener("change", populateSpecs);

    specOneSelect.addEventListener("change", () => {
        currentSpecs = [
            specOneSelect.value,
            specTwoSelect.value
        ];

        renderUnits();
    });

    specTwoSelect.addEventListener("change", () => {
        currentSpecs = [
            specOneSelect.value,
            specTwoSelect.value
        ];

        renderUnits();
    });

    searchInput.addEventListener("input", () => {

    searchQuery =
        searchInput.value.toLowerCase();

    renderUnits();
});

categoryFilter.addEventListener("change", () => {

    currentCategory =
        categoryFilter.value;

    renderUnits();
});

tagFilter.addEventListener("change", () => {

    currentTag =
        tagFilter.value;

    renderUnits();
});

    populateSpecs();
}

function renderUnits() {
    const container = document.getElementById("unitsContainer");

    container.innerHTML = "";

    allUnits
.filter(unit =>
    unit.faction === currentFaction &&
    currentSpecs.includes(unit.specialization) &&
    unit.name.toLowerCase().includes(searchQuery) &&
    (
        currentCategory === "ALL" ||
        unit.category === currentCategory
    ) &&
    (
        currentTag === "ALL" ||
        unit.tags.includes(currentTag)
    )
)
        .forEach(unit => {
            const card = document.createElement("div");

            card.className = "unit-card";

            card.innerHTML = `
                <h3>${unit.name}</h3>

                <p><strong>Faction:</strong> ${unit.faction}</p>
                <p><strong>Specialization:</strong> ${unit.specialization}</p>
                <p><strong>Category:</strong> ${unit.category}</p>
                <p><strong>Cost:</strong> ${unit.cost}</p>

                <button class="add-btn" onclick="addToDeck(${unit.id})">
                    Add To Deck
                </button>

                <div class="unit-tags">
                    ${unit.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}
                </div>
            `;

            container.appendChild(card);
        });
}

function addToDeck(unitId) {
    const unit = allUnits.find(u => u.id === unitId);

    deck.push(unit);

    renderDeck();
    updatePoints();
}

function renderDeck() {
    const container = document.getElementById("deckContainer");

    if (!container) return;

    container.innerHTML = "";

    deck.forEach((unit, index) => {
        const card = document.createElement("div");

        card.className = "unit-card";

        card.innerHTML = `
            <h3>${unit.name}</h3>

            <p><strong>Category:</strong> ${unit.category}</p>
            <p><strong>Cost:</strong> ${unit.cost}</p>

            <button class="remove-btn" onclick="removeFromDeck(${index})">
                Remove
            </button>
        `;

        container.appendChild(card);
    });
}

function removeFromDeck(index) {
    deck.splice(index, 1);

    renderDeck();
    updatePoints();
}

function updatePoints() {
    const totals = {
        REC: 0,
        INF: 0,
        VEH: 0,
        SUP: 0,
        HEL: 0,
        AIR: 0
    };

    deck.forEach(unit => {
        totals[unit.category] += unit.cost;
    });

    updateCategory("recPoints", totals.REC, limits.REC);
    updateCategory("infPoints", totals.INF, limits.INF);
    updateCategory("vehPoints", totals.VEH, limits.VEH);
    updateCategory("supPoints", totals.SUP, limits.SUP);
    updateCategory("helPoints", totals.HEL, limits.HEL);
    updateCategory("airPoints", totals.AIR, limits.AIR);
}

function updateCategory(id, used, limit) {
    const element = document.getElementById(id);

    element.textContent = `${used} / ${limit}`;

    if (used > limit) {
        element.style.color = "#ef4444";
    } else {
        element.style.color = "#10b981";
    }
}

setupFilters();
loadUnits();