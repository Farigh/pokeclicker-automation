/**
 * @class The AutomationBattleCafe regroups the BattleCafe panel elements
 */
class AutomationBattleCafe
{
    /**
     * @brief Initializes the Battle Café components
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            // Set the div visibility and content watcher
            setInterval(this.__internal__updateDivVisibilityAndContent.bind(this), 1000); // Refresh every 1s
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__battleCafeInGameModal = null;
    static __internal__battleCafeSweetContainers = [];
    static __internal__currentlyVisibleSweet = null;
    static __internal__caughtPokemonIndicators = new Map();
    static __internal__pokemonPokerusIndicators = new Map();

    /**
     * @brief Builds the 'Battle Café' menu panel
     */
    static __internal__buildMenu()
    {
        // Store the in-game modal internally
        this.__internal__battleCafeInGameModal = document.getElementById("battleCafeModal");

        let battleCafeTitle = '☕ Battle Café ☕';
        const battleCafeContainer =
            Automation.Menu.addFloatingCategory("automationBattleCafe", battleCafeTitle, this.__internal__battleCafeInGameModal);

        // Update the style to fit the width according to the panel content
        const mainContainer = battleCafeContainer.parentElement;
        mainContainer.style.width = "unset";
        mainContainer.style.minWidth = "145px";

        this.__internal__addInfo(null, -1, battleCafeContainer);

        for (const sweetIndex in BattleCafeController.evolutions)
        {
            const sweetData = BattleCafeController.evolutions[sweetIndex];

            const currentSweetContainer = document.createElement("div");
            currentSweetContainer.hidden = true;
            currentSweetContainer.style.textAlign = "left";
            currentSweetContainer.style.marginLeft = "5px";
            this.__internal__battleCafeSweetContainers.push(currentSweetContainer);

            currentSweetContainer.appendChild(document.createElement("br"));
            currentSweetContainer.appendChild(document.createTextNode("Day (6:00 → 18:00)"));
            currentSweetContainer.appendChild(document.createElement("br"));
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.dayClockwiseBelow5, currentSweetContainer);
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.dayClockwiseAbove5, currentSweetContainer);
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.dayCounterclockwiseBelow5, currentSweetContainer);
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.dayCounterclockwiseAbove5, currentSweetContainer);

            currentSweetContainer.appendChild(document.createElement("br"));
            currentSweetContainer.appendChild(document.createTextNode("Dusk (17:00 → 18:00)"));
            currentSweetContainer.appendChild(document.createElement("br"));
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.at5Above10, currentSweetContainer);

            currentSweetContainer.appendChild(document.createElement("br"));
            currentSweetContainer.appendChild(document.createTextNode("Night (18:00 → 6:00)"));
            currentSweetContainer.appendChild(document.createElement("br"));
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.nightClockwiseBelow5, currentSweetContainer);
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.nightClockwiseAbove5, currentSweetContainer);
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.nightCounterclockwiseBelow5, currentSweetContainer);
            this.__internal__addInfo(sweetData, GameConstants.AlcremieSpins.nightCounterclockwiseAbove5, currentSweetContainer);
            battleCafeContainer.appendChild(currentSweetContainer);
        }
    }

    /**
     * @brief Adds the given @p spinType info to the panel
     *
     * @param sweetData: The battle café sweet data
     * @param spinType: The spin type
     * @param {Element} parent: The parent div
     */
    static __internal__addInfo(sweetData, spinType, parent)
    {
        let container = document.createElement("div");
        parent.appendChild(container);

        let summary = "";
        let tooltip = "By spining for "
        let pokemonName = "Milcery (Cheesy)";
        if (spinType == -1)
        {
            container.style.textAlign = "center";
            summary = "3600"
            container.style.marginLeft = "5px";
            tooltip += "3600 seconds in any direction, with any sweet,";
        }
        else
        {
            // Spin count info
            container.style.marginLeft = "10px";
            if (spinType == GameConstants.AlcremieSpins.at5Above10)
            {
                tooltip += "11 seconds or more "
                summary += "11+";
            }
            else if ((spinType == GameConstants.AlcremieSpins.dayClockwiseAbove5)
                     || (spinType == GameConstants.AlcremieSpins.nightClockwiseAbove5)
                     || (spinType == GameConstants.AlcremieSpins.dayCounterclockwiseAbove5)
                     || (spinType == GameConstants.AlcremieSpins.nightCounterclockwiseAbove5))
            {
                tooltip += "5 seconds or more "
                summary += "5+";
            }
            else
            {
                tooltip += "1 to 4 seconds "
                summary += "1→4";
            }

            // Spin direction info
            if ((spinType == GameConstants.AlcremieSpins.dayClockwiseBelow5)
                || (spinType == GameConstants.AlcremieSpins.dayClockwiseAbove5)
                || (spinType == GameConstants.AlcremieSpins.nightClockwiseBelow5)
                || (spinType == GameConstants.AlcremieSpins.nightClockwiseAbove5))
            {
                // Clockwise symbole
                summary += " ↻";
                tooltip += "clockwise"
            }
            else
            {
                // Counter clockwise symbole
                summary += " ↺";
                tooltip += "counter-clockwise"
            }
            pokemonName = sweetData[spinType].name;
        }
        tooltip += ""

        let pokemonId = pokemonMap[pokemonName].id;
        summary += ` : #${pokemonId}`;
        tooltip += `\nyou can get ${pokemonName}`;

        // Set the tooltip
        container.classList.add("hasAutomationTooltip");
        container.classList.add("centeredAutomationTooltip");
        container.classList.add("shortTransitionAutomationTooltip");
        container.style.cursor = "help";
        container.setAttribute("automation-tooltip-text", tooltip);

        container.appendChild(document.createTextNode(summary));

        // Add the caught status placeholder
        const caughtIndicatorElem = document.createElement("span");
        container.appendChild(caughtIndicatorElem);
        this.__internal__caughtPokemonIndicators.set(
            pokemonName, { container: caughtIndicatorElem, pokemonId: pokemonId, currentStatus: null });

        // Add the pokérus status placeholder
        const pokerusIndicatorElem = document.createElement("span");
        pokerusIndicatorElem.style.marginRight = "4px";
        container.appendChild(pokerusIndicatorElem);
        this.__internal__pokemonPokerusIndicators.set(
            pokemonName, { container: pokerusIndicatorElem, pokemonId: pokemonId, currentStatus: null });
    }

    /**
     * @brief Toggle the 'Battle Café' category visibility based on the game state
     *        It will refresh the selected sweet as well
     *
     * The category is only visible the player entered the Battle Café
     */
    static __internal__updateDivVisibilityAndContent()
    {
        if (this.__internal__battleCafeInGameModal.classList.contains("show"))
        {
            const selectedSweet = BattleCafeController.selectedSweet();

            // Refresh caught statuses
            this.__internal__refreshCaughtStatus("Milcery (Cheesy)");
            const currentRewards = BattleCafeController.evolutions[selectedSweet];
            for (const rewardIndex in currentRewards)
            {
                this.__internal__refreshCaughtStatus(currentRewards[rewardIndex].name);
            }

            if (selectedSweet == this.__internal__currentlyVisibleSweet)
            {
                // Nothing changed
                return;
            }

            if (this.__internal__currentlyVisibleSweet != null)
            {
                this.__internal__battleCafeSweetContainers[this.__internal__currentlyVisibleSweet].hidden = true;
            }

            this.__internal__battleCafeSweetContainers[selectedSweet].hidden = false;
            this.__internal__currentlyVisibleSweet = selectedSweet;
        }
    }

    /**
     * @brief Refreshes the caught status of the given @p pokemonName, if it changed
     *
     * @param {string} pokemonName: The name of the pokemon to refresh
     */
    static __internal__refreshCaughtStatus(pokemonName)
    {
        // Refresh the caught status
        const internalCaughtData = this.__internal__caughtPokemonIndicators.get(pokemonName);
        const caughtStatus = Automation.Utils.getPokemonCaughtStatus(internalCaughtData.pokemonId);

        if (caughtStatus != internalCaughtData.currentStatus)
        {
            internalCaughtData.container.innerHTML = Automation.Menu.getCaughtStatusImage(caughtStatus);
            internalCaughtData.container.style.position = "relative";
            internalCaughtData.container.style.bottom = "2px";
            internalCaughtData.container.style.marginLeft = "3px";
            internalCaughtData.currentStatus = caughtStatus;
        }

        // Refresh the pokérus status
        const internalPokerusData = this.__internal__pokemonPokerusIndicators.get(pokemonName);
        const pokerusStatus = PartyController.getPokerusStatus(internalPokerusData.pokemonId);

        if (pokerusStatus != internalPokerusData.currentStatus)
        {
            internalPokerusData.container.innerHTML = Automation.Menu.getPokerusStatusImage(pokerusStatus);
            internalPokerusData.container.style.paddingLeft = (internalPokerusData.container.innerHTML == "") ? "0px" : "3px";
            internalPokerusData.currentStatus = pokerusStatus;
        }
    }
}
