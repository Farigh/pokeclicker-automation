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

    static __internal__battleCafePanel = null;
    static __internal__battleCafeSweetContainers = [];
    static __internal__currentlyVisibleSweet = null;
    static __internal__caughtPokemonIndicators = new Map();

    /**
     * @brief Builds the 'Battle Café' menu panel
     */
    static __internal__buildMenu()
    {
        let battleCafeTitle = '☕ Battle Café ☕';
        const battleCafeContainer = Automation.Menu.addCategory("automationBattleCafe", battleCafeTitle);
        this.__internal__battleCafePanel = battleCafeContainer.parentElement;

        // Always put it on top, so the user can interact with it while the game displays the modal overlay
        this.__internal__battleCafePanel.style.position = "relative";
        this.__internal__battleCafePanel.style.zIndex = "9999";

        // Hide the battle café menu by default
        this.__internal__battleCafePanel.hidden = true;

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
        let tooltip = "By spining "
        let pokemonName = "Milcery (Cheesy)";
        if (spinType == -1)
        {
            container.style.textAlign = "left";
            summary = "Random"
            container.style.marginLeft = "5px";
            tooltip += "any sweet you can randomly get "
        }
        else
        {
            // Spin count info
            container.style.marginLeft = "10px";
            if (spinType == GameConstants.AlcremieSpins.at7Above10)
            {
                tooltip += "11 times or more "
                summary += "11+";
            }
            else if ((spinType == GameConstants.AlcremieSpins.dayClockwiseAbove5)
                     || (spinType == GameConstants.AlcremieSpins.nightClockwiseAbove5)
                     || (spinType == GameConstants.AlcremieSpins.dayCounterclockwiseAbove5)
                     || (spinType == GameConstants.AlcremieSpins.nightCounterclockwiseAbove5))
            {
                tooltip += "5 times or more "
                summary += "5+";
            }
            else
            {
                tooltip += "from 1 to 4 times "
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
            tooltip += "\nyou can get "
        }

        let pokemonId = pokemonMap[pokemonName].id;
        summary += ` : #${pokemonId}`;
        tooltip += pokemonName;

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
    }

    /**
     * @brief Toggle the 'Battle Café' category visibility based on the game state
     *        It will refresh the selected sweet as well
     *
     * The category is only visible the player entered the Battle Café
     */
    static __internal__updateDivVisibilityAndContent()
    {
        const battleCafeModal = document.getElementById("battleCafeModal");
        if (battleCafeModal.classList.contains("show"))
        {
            this.__internal__battleCafePanel.hidden = false;

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
        else
        {
            this.__internal__battleCafePanel.hidden = true;
        }
    }

    /**
     * @brief Refreshes the caught status of the given @p pokemonName, if it changed
     *
     * @param {string} pokemonName: The name of the pokemon to refresh
     */
    static __internal__refreshCaughtStatus(pokemonName)
    {
        const internalData = this.__internal__caughtPokemonIndicators.get(pokemonName);
        const caughtStatus = Automation.Utils.getPokemonCaughtStatus(internalData.pokemonId);

        if (caughtStatus != internalData.currentStatus)
        {
            internalData.container.innerHTML = Automation.Menu.getCaughtStatusImage(caughtStatus);
            internalData.currentStatus = caughtStatus;
        }
    }
}
