/**
 * @class The AutomationFarm regroups the 'Farming' functionalities
 *
 * @note The farm is not accessible right away when starting a new game.
 *       This menu will be hidden until the functionality is unlocked in-game.
 */
class AutomationFarm
{
    static __farmingContainer = null;

    static __farmingLoop = null;
    static __forceMutationOffAsked = false;

    static __berryToStrategyMap = new Object();

    static __harvestCount = 0;
    static __freeSlotCount = 0;
    static __plantedBerryCount = 0;

    /**
     * @brief Builds the menu, and inialize internal data
     */
    static start()
    {
        this.__buildBerryCallbackMap();
        this.__buildMenu();
    }

    /**
     * @brief Builds the menu, and retores previous running state if needed
     *
     * @todo (30/05/2022): Rework the mutation menu (possibly recycling it to an 'unlock berry/slot' one would be a better solution)
     */
    static __buildMenu()
    {
        // Add the related buttons to the automation menu
        this.__farmingContainer = document.createElement("div");
        Automation.Menu.__automationButtonsDiv.appendChild(this.__farmingContainer);

        Automation.Menu.__addSeparator(this.__farmingContainer);

        // Only display the menu when the farm is unlocked
        if (!App.game.farming.canAccess())
        {
            this.__farmingContainer.hidden = true;
            this.__setFarmingUnlockWatcher();
        }

        let autoFarmTooltip = "Automatically harvest and plant crops"
                            + Automation.Menu.__tooltipSeparator()
                            + "Crops are harvested as soon as they ripe\n"
                            + "New crops are planted using the selected one in the farm menu";
        let autoFarmingButton = Automation.Menu.__addAutomationButton("Farming", "autoFarmingEnabled", autoFarmTooltip, this.__farmingContainer);
        autoFarmingButton.addEventListener("click", this.__toggleAutoFarming.bind(this), false);
        this.__toggleAutoFarming();

        let mutationTooltip = "⚠️This is still a work-in-progress, it will be refactored⚠️";
        let automationButton = Automation.Menu.__addAutomationButton("Mutation", "autoMutationFarmingEnabled", mutationTooltip, this.__farmingContainer);

        // Add the available mutation list
        let selectElem = Automation.Menu.__createDropDownList("selectedMutationBerry");
        selectElem.style.marginRight = "5px";
        this.__farmingContainer.appendChild(selectElem);

        // Do not display this element until it's ready to publish
        selectElem.hidden = true;
        automationButton.parentElement.hidden = true;
        if (localStorage.getItem("autoMutationFarmingEnabled") === "true")
        {
            localStorage.setItem("autoMutationFarmingEnabled", false);
        }

        // Get values to put as options
        let availableOptions = [];
        for (let key in Automation.Farm.__berryToStrategyMap)
        {
            availableOptions.push([key, BerryType[key]]);
        }

        // Sort the options alphabetically
        availableOptions.sort(([keyA, valueA], [keyB, valueB]) =>
                                  {
                                      if (valueA > valueB)
                                      {
                                          return 1;
                                      }
                                      if (valueA < valueB)
                                      {
                                          return -1;
                                      }

                                      return 0;
                                  });

        // Build the options
        availableOptions.forEach(
            ([key, value]) =>
            {
                let opt = document.createElement("option");
                opt.value = key;
                opt.id = key;
                opt.innerHTML = value;

                selectElem.options.add(opt);
            });
    }

    /**
     * @brief Watches for the in-game functionality to be unlocked.
     *        Once unlocked, the menu will be displayed to the user
     */
    static __setFarmingUnlockWatcher()
    {
        let watcher = setInterval(function()
        {
            if (App.game.farming.canAccess())
            {
                clearInterval(watcher);
                this.__farmingContainer.hidden = false;
                this.__toggleAutoFarming();
            }
        }.bind(this), 10000); // Check every 10 seconds
    }

    /**
     * @brief Toggles the 'Farming' feature
     *
     * If the feature was enabled and it's toggled to disabled, the auto attack loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the auto attack loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will used to set the right state.
     *                Otherwise, the cookie stored value will be used
     */
    static __toggleAutoFarming(enable)
    {
        if (!App.game.farming.canAccess())
        {
            return;
        }

        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (localStorage.getItem("autoFarmingEnabled") === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__farmingLoop === null)
            {
                // Set auto-farm loop
                this.__farmingLoop = setInterval(this.__farmLoop.bind(this), 10000); // Runs every 10 seconds
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__farmingLoop);
            this.__farmingLoop = null;
        }
    }

    /**
     * @brief The Farming loop
     *
     * Automatically harvests crops and plants the selected berry (from the in-game menu)
     */
    static __farmLoop()
    {
        this.__harvestAsEfficientAsPossible();
        this.__tryToUnlockNewSpots();

        if ((localStorage.getItem("autoMutationFarmingEnabled") === "true")
            && !this.__forceMutationOffAsked)
        {
            this.__performBerryMutationStrategy();
        }
        else
        {
            this.__plantAllBerries();
        }
    }

    /**
     * @brief Builds the internal berry mutation strategy
     *
     * @todo (30/05/2022): Rework this entierly
     */
    static __buildBerryCallbackMap()
    {
        // 2nd gen with 2 1st gen berries
        this.__berryToStrategyMap[BerryType.Persim] =
            function () { this.__twoBerriesMutation(BerryType.Pecha, BerryType.Oran); }.bind(this);
        this.__berryToStrategyMap[BerryType.Razz] =
            function () { this.__twoBerriesMutation(BerryType.Leppa, BerryType.Cheri); }.bind(this);
        this.__berryToStrategyMap[BerryType.Bluk] =
            function () { this.__twoBerriesMutation(BerryType.Leppa, BerryType.Chesto); }.bind(this);
        this.__berryToStrategyMap[BerryType.Nanab] =
            function () { this.__twoBerriesMutation(BerryType.Aspear, BerryType.Pecha); }.bind(this);
        this.__berryToStrategyMap[BerryType.Wepear] =
            function () { this.__twoBerriesMutation(BerryType.Oran, BerryType.Rawst); }.bind(this);
        this.__berryToStrategyMap[BerryType.Pinap] =
            function () { this.__twoBerriesMutation(BerryType.Sitrus, BerryType.Aspear); }.bind(this);
    }

    /**
     * @brief Unlock any locked spot if the player has the required resources
     */
    static __tryToUnlockNewSpots()
    {
        App.game.farming.plotList.forEach(
            (plot, index) =>
            {
                if (!plot.isUnlocked)
                {
                    FarmController.plotClick(index);
                }
            }, this);
    }

    /**
     * @brief Chooses the best harvesting time depending on the desired action.
     *
     * While trying to get mutations or to attract wandering pokemons, the best move is to harvest the crop right before they die
     * Otherwise, the crop is harvested as soon as it ripes
     */
    static __harvestAsEfficientAsPossible()
    {
        this.__harvestCount = 0;
        this.__freeSlotCount = 0;
        this.__plantedBerryCount = 0;

        // Mutations can only occur while the berry is fully ripe, so we need to collect them the later possible
        App.game.farming.plotList.forEach(
            (plot, index) =>
            {
                if (plot.isEmpty())
                {
                    if (plot.isUnlocked)
                    {
                        this.__freeSlotCount++;
                    }
                    return;
                }

                if (plot.stage() != PlotStage.Berry)
                {
                    return;
                }

                if ((localStorage.getItem("autoMutationFarmingEnabled") === "false")
                    || ((plot.berryData.growthTime[4] - plot.age) < 15))
                {
                    App.game.farming.harvest(index);
                    this.__harvestCount++;
                    this.__freeSlotCount++;
                }
            }, this);
    }

    /**
     * @deprecated Needs rework
     */
    static __performBerryMutationStrategy()
    {
        let berryType = document.getElementById("selectedMutationBerry").value;
        Automation.Farm.__berryToStrategyMap[berryType]();

        let berryName = BerryType[berryType];
        let berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';

        this.__sendNotif("Looking for " + berryName + " " + berryImage + " mutation");
    }

    /**
     * @brief If any spot is available, plants the selected berry (from the in-game menu)
     */
    static __plantAllBerries()
    {
        if (this.__freeSlotCount > 0)
        {
            App.game.farming.plantAll(FarmController.selectedBerry());

            this.__plantedBerryCount = this.__freeSlotCount;

            let berryName = Object.values(BerryType)[FarmController.selectedBerry()];
            let berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';
            this.__sendNotif("Planted back some " + berryName + " " + berryImage);
        }
    }

    /**
     * @deprecated Needs rework
     */
    static __singleBerryFarm(berryType)
    {
        [2, 3, 5, 10, 12, 14, 19, 21, 21].forEach((index) => this.__tryPlantBerryAtIndex(index, berryType), this);
    }

    /**
     * @deprecated Needs rework
     */
    static __twoBerriesMutation(berry1Type, berry2Type)
    {
        if (App.game.farming.plotList[2].isUnlocked)
        {
            if (App.game.farming.plotList[10].isUnlocked
                && App.game.farming.plotList[14].isUnlocked
                && App.game.farming.plotList[22].isUnlocked)
            {
                // This represents the following strategy
                //  |x|x|1|x|x|
                //  |x| | | |x|
                //  |1| |2| |1|
                //  |x| | | |x|
                //  |x|x|1|x|x|
                this.__tryPlantBerryAtIndex(12, berry2Type);
                [2, 10, 14, 22].forEach((index) => this.__tryPlantBerryAtIndex(index, berry1Type), this);
            }
            else
            {
                // This represents the following strategy
                //  |x|x|1|x|x|
                //  |x| | | |x|
                //  |x| |2| |x|
                //  |x| |1| |x|
                //  |x|x|x|x|x|
                this.__tryPlantBerryAtIndex(2, berry1Type);
                this.__tryPlantBerryAtIndex(12, berry2Type);
                this.__tryPlantBerryAtIndex(17, berry1Type);
            }
        }
        else
        {
            // This represents the following strategy
            //  |x|x|x|x|x|
            //  |x| |1| |x|
            //  |x|2| |2|x|
            //  |x| |1| |x|
            //  |x|x|x|x|x|
            this.__tryPlantBerryAtIndex(7, berry1Type);
            this.__tryPlantBerryAtIndex(11, berry2Type);
            this.__tryPlantBerryAtIndex(13, berry2Type);
            this.__tryPlantBerryAtIndex(17, berry1Type);
        }
    }

    /**
     * @deprecated Needs rework
     */
    static __fourBerryFarm(lookingForBerryType)
    {
        let neededBerries = [];

        if (lookingForBerryType === BerryType.Roseli)
        {
            neededBerries = [ BerryType.Mago, BerryType.Magost, BerryType.Nanab, BerryType.Watmel ];
        }
        else
        {
            Automation.Utils.__sendNotif("ERROR: No strategy for berry " + lookingForBerryType.toString());
            return;
        }

        [0, 4, 17].forEach((index) => this.__tryPlantBerryAtIndex(index, neededBerries[0]), this);
        [2, 15, 19].forEach((index) => this.__tryPlantBerryAtIndex(index, neededBerries[1]), this);
        [5, 9, 22].forEach((index) => this.__tryPlantBerryAtIndex(index, neededBerries[2]), this);
        [7, 20, 24].forEach((index) => this.__tryPlantBerryAtIndex(index, neededBerries[3]), this);
    }

    /**
     * @deprecated Needs rework
     */
    static __lumBerryFarm()
    {
        this.__tryPlantBerryAtIndex(6, BerryType.Cheri);
        this.__tryPlantBerryAtIndex(7, BerryType.Chesto);
        this.__tryPlantBerryAtIndex(8, BerryType.Pecha);
        this.__tryPlantBerryAtIndex(11, BerryType.Rawst);
        this.__tryPlantBerryAtIndex(13, BerryType.Aspear);
        this.__tryPlantBerryAtIndex(16, BerryType.Leppa);
        this.__tryPlantBerryAtIndex(17, BerryType.Oran);
        this.__tryPlantBerryAtIndex(18, BerryType.Sitrus);
    }

    /**
     * @brief Tries to plant the given @p berryType in the selected @p index
     *
     * A berry can only be planted if:
     *    - The selected spot is unlocked
     *    - The spot is empty
     *    - The player has a berry to plant in its inventory
     *
     * @param index: The index of the spot to plant the berry in
     * @param berryType: The type of the berry to plant
     */
    static __tryPlantBerryAtIndex(index, berryType)
    {
        if (App.game.farming.plotList[index].isUnlocked
            && App.game.farming.plotList[index].isEmpty()
            && App.game.farming.hasBerry(berryType))
        {
            App.game.farming.plant(index, berryType, true);
            this.__plantedBerryCount++;
        }
    }

    /**
     * @brief Sends the Farming automation notification, if at least a berry was harvested
     */
    static __sendNotif(details)
    {
        if (this.__plantedBerryCount > 0)
        {
            Automation.Utils.__sendNotif("Harvested " + this.__harvestCount.toString() + " berries<br>" + details);
        }
    }
}
