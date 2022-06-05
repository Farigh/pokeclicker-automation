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
    static __forcePlantBerriesAsked = false;

    // Collection of { isNeeded: function(), harvestAsSoonAsPossible: boolean, action: function() };
    static __unlockStrategySelection = [];

    static __harvestCount = 0;
    static __freeSlotCount = 0;
    static __plantedBerryCount = 0;

    static __internalStrategy = null;

    /**
     * @brief Builds the menu, and inialize internal data
     */
    static start()
    {
        this.__buildUnlockStrategySelection();
        this.__buildMenu();
    }

    /**
     * @brief Builds the menu, and retores previous running state if needed
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

        let unlockTooltip = "Takes the necessary actions to unlock new slots and berries";
        Automation.Menu.__addAutomationButton("Auto unlock", "autoUnlockFarmingEnabled", unlockTooltip, this.__farmingContainer);
        this.__chooseUnlockStrategy();
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

        if (localStorage.getItem("autoUnlockFarmingEnabled") === "true")
        {
            this.__chooseUnlockStrategy();
        }

        if ((localStorage.getItem("autoUnlockFarmingEnabled") === "true")
            && !this.__forcePlantBerriesAsked)
        {
            this.__internalStrategy.action();
        }
        else
        {
            this.__plantAllBerries();
        }
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
            });
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

                if ((localStorage.getItem("autoUnlockFarmingEnabled") === "false")
                    || (this.__internalStrategy === null)
                    || (this.__internalStrategy.harvestAsSoonAsPossible === true)
                    || ((plot.berryData.growthTime[4] - plot.age) < 15))
                {
                    App.game.farming.harvest(index);
                    this.__harvestCount++;
                    this.__freeSlotCount++;
                }
            }, this);
    }

    /**
     * @brief If any spot is available, plants the selected berry (from the in-game menu)
     */
    static __plantAllBerries()
    {
        if (this.__freeSlotCount > 0)
        {
            let selectedBerryType = FarmController.selectedBerry();
            let selectedBerryCount = App.game.farming.berryList[selectedBerryType]();

            if (selectedBerryCount > 0)
            {
                App.game.farming.plantAll(selectedBerryType);

                this.__plantedBerryCount = Math.min(this.__freeSlotCount, selectedBerryCount);

                let berryName = BerryType[selectedBerryType];
                let berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';
                this.__sendNotif("Planted some " + berryName + " " + berryImage);
            }
        }
    }

    /**
     * @brief Selects the optimum berry placement for mutation, with two different berry types
     *
     * @param berry1Type: The first berry type
     * @param berry2Type: The second berry type
     */
    static __plantTwoBerriesForMutation(berry1Type, berry2Type)
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
                [ 2, 10, 14, 22 ].forEach((index) => this.__tryPlantBerryAtIndex(index, berry1Type), this);
            }
            else
            {
                // This represents the following strategy
                //  |x|x|1|x|x|
                //  |x| | | |x|
                //  |x| |2| |x|
                //  |x| |1| |x|
                //  |x|x|x|x|x|
                [ 2, 17 ].forEach((index) => this.__tryPlantBerryAtIndex(index, berry1Type), this);
                this.__tryPlantBerryAtIndex(12, berry2Type);
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
            [ 7, 17 ].forEach((index) => this.__tryPlantBerryAtIndex(index, berry1Type), this);
            [ 11, 13 ].forEach((index) => this.__tryPlantBerryAtIndex(index, berry2Type), this);
        }
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
     * @brief Builds the internal berry/slot unlock strategy selection list
     */
    static __buildUnlockStrategySelection()
    {
        this.__addGen1UnlockStrategies();
        this.__addGen2UnlockStrategies();

        this.__addUnneededBerriesStrategies();
    }

    /**
     * @brief Adds first generation berries unlock strategies to the internal list
     */
    static __addGen1UnlockStrategies()
    {
        /*********************************\
        |*     Gen 1 berries unlocks     *|
        \*********************************/

        // #1 Unlock the slot requiring Cherry
        this.__addUnlockSlotStrategy(7, BerryType.Cheri);

        // #2 Unlock the slot requiring Chesto
        this.__addUnlockSlotStrategy(13, BerryType.Chesto);

        // #3 Unlock the slot requiring Pecha
        this.__addUnlockSlotStrategy(17, BerryType.Pecha);

        // #4 Unlock the slot requiring Rawst
        this.__addUnlockSlotStrategy(11, BerryType.Rawst);

        // #5 Unlock the slot requiring Aspear
        this.__addUnlockSlotStrategy(6, BerryType.Aspear);

        // #6 Unlock the slot requiring Leppa
        this.__addUnlockSlotStrategy(8, BerryType.Leppa);

        // #7 Unlock the slot requiring Oran
        this.__addUnlockSlotStrategy(18, BerryType.Oran);

        // #8 Unlock the slot requiring Sitrus
        this.__addUnlockSlotStrategy(16, BerryType.Sitrus);

        /**********************************\
        |*   Harvest some Gen 1 berries   *|
        \**********************************/

        // Make sure to have at least 20 of each berry type before proceeding
        this.__addBerryRequirementBeforeFurtherUnlockStrategy(20, [ BerryType.Cheri, BerryType.Chesto, BerryType.Pecha, BerryType.Rawst, BerryType.Aspear, BerryType.Leppa, BerryType.Oran, BerryType.Sitrus ]);
    }

    /**
     * @brief Adds second generation berries unlock strategies to the internal list
     */
    static __addGen2UnlockStrategies()
    {
        /*********************************\
        |*     Gen 2 berries unlocks     *|
        \*********************************/

        // #9 Unlock at least one Persim berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Persim, function()
                                         {
                                             Automation.Farm.__plantTwoBerriesForMutation(BerryType.Oran, BerryType.Pecha);
                                         });

        // Unlock the slot requiring Persim
        this.__addUnlockSlotStrategy(2, BerryType.Persim);

        // #10 Unlock at least one Razz berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Razz, function()
                                         {
                                             Automation.Farm.__plantTwoBerriesForMutation(BerryType.Leppa, BerryType.Cheri);
                                         });

        // Unlock the slot requiring Razz
        this.__addUnlockSlotStrategy(14, BerryType.Razz);

        // #11 Unlock at least one Bluk berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Bluk, function()
                                         {
                                             Automation.Farm.__plantTwoBerriesForMutation(BerryType.Leppa, BerryType.Chesto);
                                         });

        // Unlock the slot requiring Bluk
        this.__addUnlockSlotStrategy(22, BerryType.Bluk);

        // #12 Unlock at least one Nanab berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Nanab, function()
                                         {
                                             Automation.Farm.__plantTwoBerriesForMutation(BerryType.Aspear, BerryType.Pecha);
                                         });

        // Unlock the slot requiring Nanab
        this.__addUnlockSlotStrategy(10, BerryType.Nanab);

        // #13 Unlock at least one Wepear berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Wepear, function()
                                         {
                                             Automation.Farm.__plantTwoBerriesForMutation(BerryType.Oran, BerryType.Rawst);
                                         });

        // Unlock the slot requiring Wepear
        this.__addUnlockSlotStrategy(3, BerryType.Wepear);

        // #14 Unlock at least one Pinap berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Pinap, function()
                                         {
                                             Automation.Farm.__plantTwoBerriesForMutation(BerryType.Sitrus, BerryType.Aspear);
                                         });

        // Unlock the slot requiring Pinap
        this.__addUnlockSlotStrategy(19, BerryType.Pinap);

        // #15 Unlock at least one Figy berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Figy, function()
                                         {
                                             [ 2, 3, 6, 10, 14, 16, 18, 19, 22 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Cheri));
                                         });

        // Unlock the slot requiring Figy
        this.__addUnlockSlotStrategy(21, BerryType.Figy);

        // #16 Unlock at least one Wiki berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Wiki, function()
                                         {
                                             [ 2, 3, 6, 10, 12, 14, 19, 21, 22 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Chesto));
                                         });

        // Unlock the slot requiring Wiki
        this.__addUnlockSlotStrategy(5, BerryType.Wiki);

        // #17 Unlock at least one Mago berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Mago, function()
                                         {
                                             [ 2, 3, 5, 10, 12, 14, 19, 21, 22 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Pecha));
                                         });

        // Unlock the slot requiring Mago
        this.__addUnlockSlotStrategy(1, BerryType.Mago);

        // #18 Unlock at least one Aguav berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Aguav, function()
                                         {
                                             [ 2, 3, 5, 10, 12, 14, 19, 21, 22 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Rawst));
                                         });

        // Unlock the slot requiring Aguav
        this.__addUnlockSlotStrategy(9, BerryType.Aguav);

        // #19 Unlock at least one Iapapa berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Iapapa, function()
                                         {
                                             [ 2, 3, 5, 10, 12, 14, 19, 21, 22 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Aspear));
                                         });

        // Unlock the slot requiring Iapapa
        this.__addUnlockSlotStrategy(23, BerryType.Iapapa);

        /**********************************\
        |*   Harvest some Gen 2 berries   *|
        \**********************************/

        // Make sure to have at least 20 of each berry type before proceeding
        this.__addBerryRequirementBeforeFurtherUnlockStrategy(20, [ BerryType.Persim, BerryType.Razz, BerryType.Bluk, BerryType.Nanab, BerryType.Wepear, BerryType.Pinap,
                                                                    BerryType.Figy, BerryType.Wiki, BerryType.Mago, BerryType.Aguav, BerryType.Iapapa ]);
    }

    /**
     * @brief Some berries are not needed to unlock other berries and can be pretty anoying to mutate.
     *        This method add such berry farming strategy
     */
    static __addUnneededBerriesStrategies()
    {
        /*************\
        |*   Gen 2   *|
        \*************/

        // #20 Unlock and gather at least 24 Lum berry through mutation
        this.__unlockStrategySelection.push(
            {
                // Check if the berry is unlocked
                isNeeded: function()
                {
                    // The lum berry only produces one berry when harvested
                    // Try to get at least 20 of those through mutation
                    return (!App.game.farming.unlockedBerries[BerryType.Lum]()
                            || (App.game.farming.berryList[BerryType.Lum]() < 24));
                },
                harvestAsSoonAsPossible: false,
                action: function()
                    {
                        // Always harvest the middle on as soon as possible
                        [ 7, 17 ].forEach((index) => FarmController.plotClick(index));

                        // Plant the needed berries
                        [ 1, 21 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Oran));
                        [ 2, 22 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Leppa));
                        [ 3, 23 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Aspear));
                        [ 6, 16 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Sitrus));
                        [ 8, 18 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Rawst));
                        Automation.Farm.__tryPlantBerryAtIndex(11, BerryType.Pecha);
                        Automation.Farm.__tryPlantBerryAtIndex(12, BerryType.Cheri);
                        Automation.Farm.__tryPlantBerryAtIndex(13, BerryType.Chesto);
                    }
            });
    }

    /**
     * @brief Adds an unlock strategy to unlock the slot at @p slotIndex that requires @p berryType
     *
     * @param slotIndex: The index of the slot to unlock
     * @param berryType: The type of berry needed to unlock this slot
     */
    static __addUnlockSlotStrategy(slotIndex, berryType)
    {
        this.__unlockStrategySelection.push(
            {
                // Check if the slot is unlocked
                isNeeded: function() { return !App.game.farming.plotList[slotIndex].isUnlocked; },
                harvestAsSoonAsPossible: true,
                // If not unlocked, then farm some needed berries
                action: function()
                {
                    if (App.game.farming.plotBerryCost(slotIndex).amount > App.game.farming.berryList[berryType]())
                    {
                        FarmController.selectedBerry(berryType);
                    }
                    else
                    {
                        // Not enough farm point, lets plant some Cheri berries to get some fast
                        FarmController.selectedBerry(BerryType.Cheri);
                    }
                    Automation.Farm.__plantAllBerries();
                }
            });
    }

    /**
     * @brief Adds an unlock strategy to unlock a berry using mutations
     *
     * @param berryType: The type of berry to unlock
     * @param actionCallback: The action to perform if it's locked
     */
    static __addUnlockMutationStrategy(berryType, actionCallback)
    {
        this.__unlockStrategySelection.push(
            {
                // Check if the berry is unlocked
                isNeeded: function() { return !App.game.farming.unlockedBerries[berryType](); },
                harvestAsSoonAsPossible: false,
                action: actionCallback
            });
    }

    /**
     * @brief Adds an unlock strategy that requires a certain amount of berry before proceeding any further
     *
     * @param berriesMinAmount: The minimum amount that is required for each berry
     * @param berriesToGather: The types of berry the player must have
     */
    static __addBerryRequirementBeforeFurtherUnlockStrategy(berriesMinAmount, berriesToGather)
    {
        this.__unlockStrategySelection.push(
            {
                // Check if the slot is unlocked
                isNeeded: function()
                {
                    return !berriesToGather.every((berryType) => (App.game.farming.berryList[berryType]() >= berriesMinAmount));
                },
                harvestAsSoonAsPossible: true,
                // If not unlocked, then farm some needed berries
                action: function()
                {
                    let plotIndex = 0;
                    berriesToGather.every(
                        (berryType) =>
                        {
                            let neededAmount = (berriesMinAmount - App.game.farming.berryList[berryType]());
                            let berryHarvestAmount = App.game.farming.berryData[berryType].harvestAmount;

                            let alreadyPlantedCount = App.game.farming.plotList.reduce((count, plot) => count + ((plot.berryData && (plot.berry == berryType)) ? 1 : 0), 0);
                            neededAmount -= (alreadyPlantedCount * berryHarvestAmount);

                            while ((neededAmount > 0) && (plotIndex <= 24))
                            {
                                if (App.game.farming.plotList[plotIndex].isUnlocked
                                    && App.game.farming.plotList[plotIndex].isEmpty()
                                    && App.game.farming.hasBerry(berryType))
                                {
                                    App.game.farming.plant(plotIndex, berryType, true);

                                    // Subtract the harvest amount (-1 for the planted berry)
                                    neededAmount -= (berryHarvestAmount - 1);
                                }
                                plotIndex++;
                            }

                            return (plotIndex <= 24);
                        });

                    // If no more berries are needed, plant Cheris on the remaining plots
                    FarmController.selectedBerry(BerryType.Cheri);
                    Automation.Farm.__plantAllBerries();
                }
            });
    }

    /**
     * @brief Chooses the next unlock strategy based on the current farming state
     */
    static __chooseUnlockStrategy()
    {
        this.__internalStrategy = null;

        this.__unlockStrategySelection.every(
            (strategy) =>
            {
                if (!strategy.isNeeded())
                {
                    return true;
                }

                this.__internalStrategy = strategy;
                return false;
            }, this);

        // If no strategy can be found, turn off the feature and disable the button
        if (this.__internalStrategy === null)
        {
            Automation.Menu.__forceAutomationState("autoUnlockFarmingEnabled", false);
            Automation.Menu.__disableButton("autoUnlockFarmingEnabled", true, "No more automated unlock possible");
            return;
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
