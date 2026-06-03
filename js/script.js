const specializations = {
    USA: [
        "USMC",
        "Armored Brigade",
        "Airborne Infantry",
        "Baltic Battalion",
        "SOF",
        "Stryker"
    ],

    Russia: [
        "VDV Brigade",
        "Guard Tank Brigade",
        "Coastal Troops",
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
    renderUnits();
}

function setupFilters() {
    const factionSelect = document.getElementById("factionSelect");
    const specOneSelect = document.getElementById("specOneSelect");
    const specTwoSelect = document.getElementById("specTwoSelect");
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const tagFilter = document.getElementById("tagFilter");

    function populateSpecs() {
        const specs = specializations[factionSelect.value];

        specOneSelect.innerHTML = "";
        specTwoSelect.innerHTML = "";

        specs.forEach(spec => {
            specOneSelect.innerHTML += `<option value="${spec}">${spec}</option>`;
            specTwoSelect.innerHTML += `<option value="${spec}">${spec}</option>`;
        });

        if (specs.length > 1) specTwoSelect.selectedIndex = 1;

        currentFaction = factionSelect.value;
        currentSpecs = [specOneSelect.value, specTwoSelect.value];

        deck = [];
        renderUnits();
        renderDeck();
        updatePoints();
        updateAnalysis();
    }

    factionSelect.addEventListener("change", populateSpecs);

    specOneSelect.addEventListener("change", () => {
        currentSpecs = [specOneSelect.value, specTwoSelect.value];
        renderUnits();
    });

    specTwoSelect.addEventListener("change", () => {
        currentSpecs = [specOneSelect.value, specTwoSelect.value];
        renderUnits();
    });

    searchInput.addEventListener("input", () => {
        searchQuery = searchInput.value.toLowerCase();
        renderUnits();
    });

    categoryFilter.addEventListener("change", () => {
        currentCategory = categoryFilter.value;
        renderUnits();
    });

    tagFilter.addEventListener("change", () => {
        currentTag = tagFilter.value;
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
            (currentCategory === "ALL" || unit.category === currentCategory) &&
            (currentTag === "ALL" || unit.tags.includes(currentTag))
        )
        .forEach(unit => {
            const card = document.createElement("div");
            card.className = "unit-card";
            card.dataset.category = unit.category;

            card.innerHTML = `
                <h3>${unit.name}</h3>
                <p><strong>Faction:</strong> ${unit.faction}</p>
                <p><strong>Specialization:</strong> ${unit.specialization}</p>
                <p><strong>Category:</strong> ${unit.category}</p>
                <p><strong>Base Cost:</strong> ${unit.cost}</p>

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

    deck.push({
        ...unit,
        selectedUpgrades: []
    });

    renderDeck();
    updatePoints();
    updateAnalysis();
}

function renderDeck() {
    const container = document.getElementById("deckContainer");
    if (!container) return;

    container.innerHTML = "";

    deck.forEach((unit, index) => {
        const upgrades = unit.upgrades || [];
        const upgradeCost = getUpgradeCost(unit);
        const totalCost = unit.cost + upgradeCost;

        const card = document.createElement("div");
        card.className = "unit-card";
        card.dataset.category = unit.category;
        card.innerHTML = `
            <h3>${unit.name}</h3>
            <p><strong>Category:</strong> ${unit.category}</p>
            <p><strong>Base Cost:</strong> ${unit.cost}</p>
            <p><strong>Upgrade Cost:</strong> ${upgradeCost}</p>
            <p><strong>Total Cost:</strong> ${totalCost}</p>

            <div class="upgrade-list">
                ${upgrades.length > 0
                    ? upgrades.map((upgrade, upgradeIndex) => `
                        <label class="upgrade-option">
                            <input
                                type="checkbox"
                                onchange="toggleUpgrade(${index}, ${upgradeIndex})"
                                ${unit.selectedUpgrades.includes(upgradeIndex) ? "checked" : ""}
                            >
                            ${upgrade.name} (+${upgrade.cost})
                        </label>
                    `).join("")
                    : `<p class="no-upgrades">No upgrades added yet</p>`
                }
            </div>

            <button class="remove-btn" onclick="removeFromDeck(${index})">
                Remove
            </button>
        `;

        container.appendChild(card);
    });
}

function toggleUpgrade(unitIndex, upgradeIndex) {
    const unit = deck[unitIndex];

    if (unit.selectedUpgrades.includes(upgradeIndex)) {
        unit.selectedUpgrades = unit.selectedUpgrades.filter(i => i !== upgradeIndex);
    } else {
        unit.selectedUpgrades.push(upgradeIndex);
    }

    renderDeck();
    updatePoints();
    updateAnalysis();
}

function getUpgradeCost(unit) {
    if (!unit.upgrades) return 0;

    return unit.selectedUpgrades.reduce((total, upgradeIndex) => {
        return total + unit.upgrades[upgradeIndex].cost;
    }, 0);
}

function removeFromDeck(index) {
    deck.splice(index, 1);

    renderDeck();
    updatePoints();
    updateAnalysis();
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
        totals[unit.category] += unit.cost + getUpgradeCost(unit);
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
    element.style.color = used > limit ? "#ef4444" : "#10b981";
}

function updateAnalysis() {
    const container = document.getElementById("analysisContainer");
    if (!container) return;

    const hasRecon = deck.some(unit => unit.tags.includes("Recon") || unit.category === "REC");
    const hasAA = deck.some(unit => unit.tags.includes("AA"));
    const hasArtillery = deck.some(unit => unit.tags.includes("Artillery") || unit.tags.includes("Rocket"));
    const hasLogistics = deck.some(unit => unit.tags.includes("Logistics") || unit.tags.includes("Supply"));
    const hasParadrop = deck.some(unit => unit.tags.includes("Paradrop"));

    container.innerHTML = `
        ${hasRecon ? `<div class="analysis-good">✓ Recon coverage present</div>` : `<div class="analysis-bad">✕ No recon selected</div>`}
        ${hasAA ? `<div class="analysis-good">✓ Anti-air coverage present</div>` : `<div class="analysis-warn">⚠ No AA selected</div>`}
        ${hasArtillery ? `<div class="analysis-good">✓ Fire support available</div>` : `<div class="analysis-warn">⚠ No artillery / rocket support selected</div>`}
        ${hasLogistics ? `<div class="analysis-good">✓ Logistics support present</div>` : `<div class="analysis-warn">⚠ No supply/logistics selected</div>`}
        ${hasParadrop ? `<div class="analysis-good">✓ Paradrop capability detected</div>` : `<div class="analysis-warn">⚠ No paradrop capability detected</div>`}
    `;
}

setupFilters();
loadUnits();