let doWork = new Worker('interval.js');
doWork.onmessage = function (event) {
    if (event.data === 'interval.start') {
        tick();
    }
};

let settings = {};
let theView;
let selected = [];
let timeList = [];
let timer = 0;
let stop = 0;
let multFromFps = 1;
let msWaitTime = 1000;
let theGrid = [];
let menuOpen = "";
let upgradeTab;
let startingDragPoint = {};
let endingDragPoint = {};
let select = new Select();
let isDragging = false;
let rclickStartingPoint;
let currentLevel, highestLevel;
let bonuses, autobuy, stats, achieves;
let specialLevels = [0, 10, 25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 775, 850, 925, 1000, 1075, 1150, 1225, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2200, 2400, 2600, 2800, 3000, 3300, 3600, 3900, 4200, 4500, 4800, 5200, 5600, 6000, 6600, 7300, 7900, 8500, 9400, 10000];
let numTutLevels = 2;

function getSpecialLevels(pos) {
    if(specialLevels[pos] === undefined) {
        specialLevels[pos] = 10000 + (pos+1 - specialLevels.length);
    }
    return specialLevels[pos];
}

function clearSave() {
    window.localStorage.version4 = "";
    window.localStorage.version5 = "";
    load();
}

function loadDefaults() {
    settings.buyPerClick = 1;
	settings.autobuyToggle = 0;
	settings.autobuyPerTick = 1;
    settings.selectedResourceNum = 0;
    settings.selectGridFont = 0;

    settings.selectOneOrMultiple = 0;
    settings.buyLowestOrAll = 1;
    settings.showLastOrLowest = 0;
    settings.selectAllOrLowestBorderColor = 0;
    settings.selectShowNoneOrNanitesOrAmount = 3;
    highestLevel = 0; //SHOULD BE 0 BEFORE COMMIT
    currentLevel = 0;

    bonuses = { points:0, availableEP:0};
    autobuy = {};
    resetEPUpgrades();
    bonuses.derivs = [];
    resetDerivBonuses();
	stats = { ticksThisLevel:0, totalTicks:0, producedThisLevel:0, totalProduced:0, transferredThisLevel:0, totalTransferred:0, totalLevels:0, highestTicks:0, highestProduced:0, highestTransferred:0};
	achieves = { highestTicksAch:0, totalTicksAch:0, highestProducedAch:0, totalProducedAch:0, highestTransferredAch:0, totalTransferredAch:0, highestLevelAch:0, totalLevelsAch:0};
    openUpgradeTab();
}

function resetEPUpgrades() {
    bonuses.tickSpeedLevel = 1;
    bonuses.transferRateLevel = 1;
    bonuses.discountLevel = 0;
    autobuy.currentMax = 1;
    autobuy.amtToSpend = 1;
}

function toggleIMessedUpPopup1() { //Let's hope there's not more
    if(document.getElementById("imessedup").style.display === "block") {
        document.getElementById("imessedup").style.display = "none";
    } else {
        document.getElementById("imessedup").style.display = "block";
    }
}

function toggleIMessedUpPopup2() { //Let's hope there's not more
    if(document.getElementById("imessedup2").style.display === "block") {
        document.getElementById("imessedup2").style.display = "none";
    } else {
        document.getElementById("imessedup2").style.display = "block";
    }
}

function clearBoard() {
    createGrid();
    if(!theView) {
        theView = new View();
    }
    theView.createGrid();
    theView.update();
    recalcInterval(bonuses.tickSpeedLevel);
}

function load() {
    loadDefaults();
    if (!window.localStorage.version5) { //New players to the game
        clearBoard();
        if(window.localStorage.version3) { //New players to version 4
            let oldLoad = JSON.parse(window.localStorage.version3);
            let roughBonus = ((oldLoad.bonuses.tickSpeedLevel - 1)  * 5) + oldLoad.bonuses.transferRateLevel * .4 + oldLoad.bonuses.discountLevel * .2 + oldLoad.autobuy.currentMax * .3 + oldLoad.autobuy.amtToSpend * .5;
            roughBonus = round2(Math.pow(2, roughBonus));
            oldLoad.bonuses.points += roughBonus;
            bonuses.points = oldLoad.bonuses.points > 1000 ? 1000 : oldLoad.bonuses.points;
            toggleIMessedUpPopup1();
            document.getElementById("messedupEP").innerHTML = bonuses.points;
            window.localStorage.version3 = "";
        }
        if(window.localStorage.version4) {
            let oldLoad = JSON.parse(window.localStorage.version4);
            let newBonus = oldLoad.bonuses.points > 1000 ? 1000 : oldLoad.bonuses.points;
            toggleIMessedUpPopup2();
            window.localStorage.version4 = "";
            if(newBonus) {
                bonuses.points = newBonus;
                bonuses.availableEP = newBonus;
            }
        }
        openHelpBox();
        return;
    }
    let toLoad = JSON.parse(window.localStorage.version5);
    currentLevel = toLoad.currentLevel;

    //Handles a change in properties
    for(let property in toLoad.bonuses) {
        if (toLoad.bonuses.hasOwnProperty(property)) {
            bonuses[property] = toLoad.bonuses[property];
        }
    }

    for(let property in toLoad.autobuy) {
        if (toLoad.autobuy.hasOwnProperty(property)) {
            autobuy[property] = toLoad.autobuy[property];
        }
    }
	for(let property in toLoad.stats) {
        if (toLoad.stats.hasOwnProperty(property)) {
            stats[property] = toLoad.stats[property];
        }
    }
	for(let property in toLoad.achieves) {
        if (toLoad.achieves.hasOwnProperty(property)) {
            achieves[property] = toLoad.achieves[property];
        }
    }

    settings = toLoad.settings;
    highestLevel = toLoad.highestLevel;
    settings.buyPerClick = 1; //resets on refresh
    settings.selectedResourceNum = 0;

    createGridFromSave(toLoad.theGrid);
    setTransferRate(bonuses.transferRateLevel);
    recalcInterval(bonuses.tickSpeedLevel);
}

function save() {
    let toSave = {};
    toSave.settings = settings;
    toSave.currentLevel = currentLevel;
    toSave.theGrid = theGrid;
    toSave.highestLevel = highestLevel;
    toSave.bonuses = bonuses;
	toSave.autobuy = autobuy;
	toSave.stats = stats;
	toSave.achieves = achieves;
    // console.log('saved');
    window.localStorage.version5 = JSON.stringify(toSave);
}

function exportSave() {
    save();
    document.getElementById("exportImport").value = encode(window.localStorage.version5);
    document.getElementById("exportImport").select();
    document.execCommand('copy');
    document.getElementById("exportImport").value = "";
}

function importSave() {
    window.localStorage.version5 = decode(document.getElementById("exportImport").value);
    load();
}

load();
