const specializations = {
    USA: ["USMC", "Armored Brigade", "Airborne Infantry", "Baltic Battalion", "SOF", "Stryker"],
    Russia: ["VDV Brigade", "Guard Tank Brigade", "Coastal Troops", "Mechanized", "Tank", "Naval", "SOF"]
};

const limits = { REC: 2250, INF: 2250, VEH: 1750, SUP: 1250, HEL: 1250, AIR: 1250 };
const deckLimit = 10000;

let allUnits = [];
let deck = [];
let currentFaction = "USA";
let currentSpecs = [];
let searchQuery = "";
let currentCategory = "ALL";
let currentTag = "ALL";
let selectedUnit = null;
let currentView = "cards";

async function loadUnits() {
    const response = await fetch("data/units.json");
    allUnits = await response.json();
    renderUnits();
    renderDeck();
    updatePoints();
    updateAnalysis();
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
        refreshAll();
    }

    factionSelect.addEventListener("change", populateSpecs);
    specOneSelect.addEventListener("change", () => { currentSpecs = [specOneSelect.value, specTwoSelect.value]; renderUnits(); });
    specTwoSelect.addEventListener("change", () => { currentSpecs = [specOneSelect.value, specTwoSelect.value]; renderUnits(); });
    searchInput.addEventListener("input", () => { searchQuery = searchInput.value.toLowerCase(); renderUnits(); });
    categoryFilter.addEventListener("change", () => { currentCategory = categoryFilter.value; renderUnits(); });
    tagFilter.addEventListener("change", () => { currentTag = tagFilter.value; renderUnits(); });

    populateSpecs();
}

function refreshAll() {
    renderUnits();
    renderDeck();
    updatePoints();
    updateAnalysis();
}

function getFilteredUnits() {
    return allUnits.filter(unit =>
        unit.faction === currentFaction &&
        currentSpecs.includes(unit.specialization) &&
        unit.name.toLowerCase().includes(searchQuery) &&
        (currentCategory === "ALL" || unit.category === currentCategory) &&
        (currentTag === "ALL" || unit.tags.includes(currentTag))
    );
}

function renderUnits() {
    const container = document.getElementById("unitsContainer");
    container.innerHTML = "";
    const filteredUnits = getFilteredUnits();
    currentView === "tree" ? renderTreeView(container, filteredUnits) : renderCardView(container, filteredUnits);
}

function renderCardView(container, units) {

    container.className = "units-grid compact-grid";

    units.forEach(unit => {

        const card = document.createElement("div");

        card.className = `
    compact-unit
    ${selectedUnit?.id === unit.id ? "selected" : ""}
`;
card.onclick = () => {
    selectUnit(unit.id);
};
        card.innerHTML = `

            <div class="compact-left">

                <div class="compact-icon">
                    ${getCategoryIcon(unit.category)}
                </div>

                <div class="compact-info">

                    <div class="compact-name">
                        ${unit.name}
                    </div>

                    <div class="compact-meta">
                        ${unit.specialization}
                    </div>

                    <div class="compact-tags">
                        ${unit.tags.map(tag =>
                            `<span class="mini-tag">${tag}</span>`
                        ).join("")}
                    </div>

                </div>

            </div>

            <div class="compact-right">

                <div class="compact-cost">
                    ${unit.cost ?? 0}
                </div>

                <button
                    class="compact-add"
                    onclick="addToDeck(${unit.id})">

                    ADD

                </button>

            </div>
        `;

        container.appendChild(card);
    });
}

function renderTreeView(container, units) {
    container.className = "tree-view";

    currentSpecs.forEach(spec => {
        const specUnits = units.filter(unit => unit.specialization === spec);
        if (!specUnits.length) return;

        const specBox = document.createElement("div");
        specBox.className = "tree-spec";
        let html = `<h3>${spec}</h3>`;

        ["REC", "INF", "VEH", "SUP", "HEL", "AIR"].forEach(category => {
            const categoryUnits = specUnits.filter(unit => unit.category === category);
            if (!categoryUnits.length) return;

            html += `<div class="tree-category"><h4>${getCategoryIcon(category)} ${category}</h4>`;
            categoryUnits.forEach(unit => {
                html += `
                    <div class="tree-unit">
                        <div class="tree-unit-header">
                            <div><strong>${unit.name}</strong><div>${formatCost(unit.cost)} pts ${getVerifiedBadge(unit)}</div></div>
                            <button class="add-btn" onclick="addToDeck(${unit.id})">Add</button>
                        </div>
                        <div class="unit-tags">${(unit.tags || []).map(tag => `<span class="tag">${tag}</span>`).join("")}</div>
                    </div>`;
            });
            html += `</div>`;
        });

        specBox.innerHTML = html;
        container.appendChild(specBox);
    });
}

function setView(view) {
    currentView = view;
    document.getElementById("cardViewBtn").classList.toggle("active", view === "cards");
    document.getElementById("treeViewBtn").classList.toggle("active", view === "tree");
    renderUnits();
}

function addToDeck(unitId) {
    const unit = allUnits.find(u => u.id === unitId);
    if (!unit) return;
    deck.push({
    ...unit,
    selectedUpgrades:
    [...(unit.selectedUpgrades || [])],
    selectedTransport:
        unit.selectedTransport ?? null
});
    refreshAll();
}

function renderDeck() {
    const container = document.getElementById("deckContainer");
    if (!container) return;
    container.innerHTML = "";

    ["REC", "INF", "VEH", "SUP", "HEL", "AIR"].forEach(category => {
        const units = deck.map((unit, originalIndex) => ({ unit, originalIndex })).filter(item => item.unit.category === category);
        const total = units.reduce((sum, item) => sum + getUnitTotalCost(item.unit), 0);
        const section = document.createElement("div");
        section.className = "deck-category-section";
        section.innerHTML = `
            <div class="deck-category-header">
                <span>${getCategoryIcon(category)} ${category}</span>
                <span>${total} / ${limits[category]}</span>
            </div>
            <div class="deck-strip"></div>`;
        container.appendChild(section);

        const strip = section.querySelector(".deck-strip");
        units.forEach(({ unit, originalIndex }) => {
            const card = document.createElement("div");
            card.className = "deck-unit";
            card.innerHTML = `
                <div class="deck-unit-top">
                    <span class="deck-unit-icon">${getCategoryIcon(unit.category)}</span>
                    <button class="deck-remove" onclick="removeFromDeck(${originalIndex})">×</button>
                </div>
                <div class="deck-unit-name">${unit.name}</div>
                <div class="deck-unit-cost">${formatCost(getUnitTotalCost(unit))} pts</div>
                <div class="deck-unit-upgrades">${unit.selectedUpgrades.length} upgrades</div>
                <div>${getVerifiedBadge(unit)}</div>
            `;
            strip.appendChild(card);
        });
    });
}

function toggleUpgrade(unitIndex, upgradeIndex) {
    const unit = deck[unitIndex];
    if (!unit) return;

    if (unit.selectedUpgrades.includes(upgradeIndex)) {
        unit.selectedUpgrades = unit.selectedUpgrades.filter(i => i !== upgradeIndex);
    } else {
        unit.selectedUpgrades.push(upgradeIndex);
    }
    refreshAll();
}

function getUpgradeCost(unit) {
    if (!unit.upgrades) return 0;
    return unit.selectedUpgrades.reduce((total, upgradeIndex) => total + (unit.upgrades[upgradeIndex]?.cost || 0), 0);
}

function getUnitTotalCost(unit) {

    let total =
        (unit.cost ?? 0) +
        getUpgradeCost(unit);

    if (
        unit.transportOptions &&
        unit.selectedTransport !== null &&
        unit.selectedTransport !== undefined
    ) {

        total +=
            unit.transportOptions[
                unit.selectedTransport
            ]?.cost || 0;
    }

    return total;
}

function removeFromDeck(index) {
    deck.splice(index, 1);
    refreshAll();
}

function updatePoints() {
    const totals = { REC: 0, INF: 0, VEH: 0, SUP: 0, HEL: 0, AIR: 0 };
    deck.forEach(unit => { totals[unit.category] += getUnitTotalCost(unit); });

    updateCategory("recPoints", totals.REC, limits.REC);
    updateCategory("infPoints", totals.INF, limits.INF);
    updateCategory("vehPoints", totals.VEH, limits.VEH);
    updateCategory("supPoints", totals.SUP, limits.SUP);
    updateCategory("helPoints", totals.HEL, limits.HEL);
    updateCategory("airPoints", totals.AIR, limits.AIR);

    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    const totalElement = document.getElementById("totalDeckPoints");
    if (totalElement) {
        totalElement.textContent = `${total} / ${deckLimit}`;
        totalElement.className = total > deckLimit ? "total-bad" : "total-ok";
    }
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
    const hasUnverified = deck.some(unit => unit.verified === false || unit.cost === 0 || unit.cost === null);
    const total = deck.reduce((sum, unit) => sum + getUnitTotalCost(unit), 0);

    container.innerHTML = `
        ${total <= deckLimit ? `<div class="analysis-good">✓ Total points valid</div>` : `<div class="analysis-bad">✕ Total points over 10000</div>`}
        ${hasRecon ? `<div class="analysis-good">✓ Recon coverage present</div>` : `<div class="analysis-bad">✕ No recon selected</div>`}
        ${hasAA ? `<div class="analysis-good">✓ Anti-air coverage present</div>` : `<div class="analysis-warn">⚠ No AA selected</div>`}
        ${hasArtillery ? `<div class="analysis-good">✓ Fire support available</div>` : `<div class="analysis-warn">⚠ No artillery / rocket support selected</div>`}
        ${hasLogistics ? `<div class="analysis-good">✓ Logistics support present</div>` : `<div class="analysis-warn">⚠ No supply/logistics selected</div>`}
        ${hasParadrop ? `<div class="analysis-good">✓ Paradrop capability detected</div>` : `<div class="analysis-warn">⚠ No paradrop capability detected</div>`}
        ${hasUnverified ? `<div class="analysis-warn">⚠ Deck contains unverified costs</div>` : `<div class="analysis-good">✓ All selected costs verified</div>`}
    `;
}

function saveDeck() {
    localStorage.setItem("brokenArrowSavedDeck", JSON.stringify({ faction: currentFaction, specs: currentSpecs, deck }));
    alert("Deck saved!");
}

function loadSavedDeck() {
    const saved = localStorage.getItem("brokenArrowSavedDeck");
    if (!saved) { alert("No saved deck found."); return; }
    const savedDeck = JSON.parse(saved);
    currentFaction = savedDeck.faction;
    currentSpecs = savedDeck.specs;
    deck = savedDeck.deck || [];
    refreshAll();
    alert("Deck loaded!");
}

function clearDeck() {
    deck = [];
    refreshAll();
}

function getCategoryIcon(category) {
    const icons = { REC: "🛰️", INF: "👥", VEH: "🛞", SUP: "💥", HEL: "🚁", AIR: "✈️" };
    return icons[category] || "◆";
}

function formatCost(cost) {
    return cost === null || cost === undefined ? "?" : cost;
}

function getVerifiedBadge(unit) {
    const verified = unit.verified === true && unit.cost !== 0 && unit.cost !== null;
    return verified ? `<span class="verified-pill">Verified</span>` : `<span class="unverified-pill">Unverified</span>`;
}

setupFilters();
loadUnits();

function selectUnit(unitId) {

    const unit =
        allUnits.find(u => u.id === unitId);

    selectedUnit = unit;

    renderUnitDetails();
}

function renderUnitDetails() {

    const panel =
        document.getElementById("unitDetailPanel");

    if (!selectedUnit) {

        panel.innerHTML = `
            <div class="empty-detail">
                Select a unit to view details
            </div>
        `;

        return;
    }

    const upgrades =
        selectedUnit.upgrades || [];

    const transports =
        selectedUnit.transportOptions || [];

    panel.innerHTML = `

        <div class="detail-header">

            <div class="detail-icon">
                ${getCategoryIcon(selectedUnit.category)}
            </div>

            <div>

                <div class="detail-name">
                    ${selectedUnit.name}
                </div>

                <div class="detail-spec">
                    ${selectedUnit.specialization}
                </div>

            </div>

        </div>

        <div class="detail-cost">
            ${selectedUnit.cost ?? 0} pts
        </div>

        <div class="detail-tags">

            ${selectedUnit.tags.map(tag =>
                `<span class="mini-tag">${tag}</span>`
            ).join("")}

        </div>

<div class="detail-section-title">
    Upgrades
</div>

<div class="detail-list">

    ${upgrades.length > 0

        ? upgrades.map((upgrade, index) => `

            <label class="upgrade-option-detail">

                <input
                    type="checkbox"

                    onchange="toggleSelectedUpgrade(${selectedUnit.id}, ${index})"

                    ${selectedUnit.selectedUpgrades?.includes(index)
                        ? "checked"
                        : ""
                    }
                >

                <div class="upgrade-info">

                    <span>
                        ${upgrade.name}
                    </span>

                    <span class="upgrade-cost">
                        +${upgrade.cost}
                    </span>

                </div>

            </label>

        `).join("")

        :

        `<div class="empty-small">
            No upgrades added
        </div>`
    }

</div>

<div class="detail-section-title">
    Transport
</div>

<div class="detail-list">

    ${transports.length > 0

        ? transports.map((transport, index) => `

            <label class="transport-option">

                <input
                    type="radio"
                    name="transportOption"
                    onchange="selectTransport(${selectedUnit.id}, ${index})"

                    ${selectedUnit.selectedTransport === index
                        ? "checked"
                        : ""
                    }
                >

                <div class="transport-info">

                    <span>
                        ${transport.name}
                    </span>

                    <span class="transport-cost">
                        +${transport.cost}
                    </span>

                </div>

            </label>

        `).join("")

        :

        `<div class="empty-small">
            No transport options
        </div>`
    }

</div>

        <button
            class="detail-add-btn"
            onclick="addToDeck(${selectedUnit.id})">

            ADD TO DECK

        </button>
    `;
}

function selectTransport(unitId, transportIndex) {

    const unit =
        allUnits.find(u => u.id === unitId);

    if (!unit) return;

    unit.selectedTransport =
        transportIndex;

    selectedUnit = unit;

    renderUnitDetails();
}

function toggleSelectedUpgrade(unitId, upgradeIndex) {

    const unit =
        allUnits.find(u => u.id === unitId);

    if (!unit) return;

    if (!unit.selectedUpgrades) {
        unit.selectedUpgrades = [];
    }

    if (
        unit.selectedUpgrades.includes(upgradeIndex)
    ) {

        unit.selectedUpgrades =
            unit.selectedUpgrades.filter(
                i => i !== upgradeIndex
            );

    } else {

        unit.selectedUpgrades.push(upgradeIndex);
    }

    selectedUnit = unit;

    renderUnitDetails();
}