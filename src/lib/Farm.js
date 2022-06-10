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

    // Collection of { isNeeded: function(), harvestAsSoonAsPossible: boolean, oakItemToEquip: OakItemType, forbiddenOakItem: OakItemType, action: function() };
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

        let unlockTooltip = "Takes the necessary actions to unlock new slots and berries";
        Automation.Menu.__addAutomationButton("Auto unlock", "autoUnlockFarmingEnabled", unlockTooltip, this.__farmingContainer);
        this.__chooseUnlockStrategy();

        // Restore previous session state
        this.__toggleAutoFarming();
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

            // Restore setting
            Automation.Quest.__forbiddenItem = null;
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
            this.__equipOakItemIfNeeded();
            this.__removeOakItemIfNeeded();
            this.__internalStrategy.action();
        }
        else
        {
            this.__plantAllBerries();
        }
    }

    static __equipOakItemIfNeeded()
    {
        if (this.__internalStrategy.oakItemToEquip === null)
        {
            return;
        }

        // Equip the right oak item if not already equiped
        let customOakLoadout = App.game.oakItems.itemList.filter((item) => item.isActive);

        if (!customOakLoadout.includes(this.__internalStrategy.oakItemToEquip.oakItemToEquip))
        {
            // Prepend the item if it's not part of the current loadout
            customOakLoadout.unshift(this.__internalStrategy.oakItemToEquip.oakItemToEquip);

            App.game.oakItems.deactivateAll();
            customOakLoadout.forEach((item) => { App.game.oakItems.activate(item); });
        }
    }

    static __removeOakItemIfNeeded()
    {
        Automation.Quest.__forbiddenItem = this.__internalStrategy.forbiddenOakItem;

        if (this.__internalStrategy.forbiddenOakItem !== null)
        {
            App.game.oakItems.deactivate(this.__internalStrategy.forbiddenOakItem);
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
        if (App.game.farming.plotList.every((plot) => plot.isUnlocked))
        {
            // This represents the following strategy
            //  |1| | |1| |
            //  | |2| | |2|
            //  | | | | | |
            //  |1| | |1| |
            //  | |2| | |2|
            [ 0, 3, 15, 18 ].forEach((index) => this.__tryPlantBerryAtIndex(index, berry1Type), this);
            [ 6, 9, 21, 24 ].forEach((index) => this.__tryPlantBerryAtIndex(index, berry2Type), this);
        }
        else if (App.game.farming.plotList[2].isUnlocked)
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
     * @brief Selects the optimum berry placement for mutation, with three different berry types
     *
     * @param berry1Type: The first berry type
     * @param berry2Type: The second berry type
     * @param berry3Type: The third berry type
     */
    static __plantThreeBerriesForMutation(berry1Type, berry2Type, berry3Type)
    {
        // This represents the following strategy
        //  | |1| | |1|
        //  |2|3| |2|3|
        //  | | | | | |
        //  | |1| | |1|
        //  |2|3| |2|3|
        [ 1, 4, 16, 19 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, berry1Type));
        [ 5, 8, 20, 23 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, berry2Type));
        [ 6, 9, 21, 24 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, berry3Type));
    }

    /**
     * @brief Selects the optimum berry placement for mutation, with four different berry types
     *
     * @param berry1Type: The first berry type
     * @param berry2Type: The second berry type
     * @param berry3Type: The third berry type
     * @param berry4Type: The fourth berry type
     */
    static __plantFourBerriesForMutation(berry1Type, berry2Type, berry3Type, berry4Type)
    {
        [ 0, 4, 17 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, berry1Type));
        [ 2, 15, 19 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, berry2Type));
        [ 5, 9, 22 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, berry3Type));
        [ 7, 20, 24 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, berry4Type));
    }

    /**
     * @brief Selects the optimum berry placement for surrounding berry mutation, with two different berry types
     *
     * @param triggerBerryType: The berry type that triggers the mutation
     * @param mutatedBerryType: The berry type of the mutated berry
     */
    static __plantTwoBerriesForSurroundingMutation(triggerBerryType, mutatedBerryType)
    {
        // This represents the following strategy (triggerBerryType = x, mutatedBerryType = o)
        //  |o|o|o|o|o|
        //  |o|x|o|o|x|
        //  |o|o|o|o|o|
        //  |o|o|o|o|o|
        //  |o|x|o|o|x|
        App.game.farming.plotList.forEach(
            (plot, index) =>
            {
                let berryType = [ 6, 9, 21, 24 ].includes(index) ? triggerBerryType : mutatedBerryType;
                Automation.Farm.__tryPlantBerryAtIndex(index, berryType);
            });
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
        this.__addGen3UnlockStrategies();
        this.__addGen4UnlockStrategies();

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
     * @brief Adds third generation berries unlock strategies to the internal list
     */
    static __addGen3UnlockStrategies()
    {
        /*********************************\
        |*     Gen 3 berries unlocks     *|
        \*********************************/

        // #21 Unlock at least one Pomeg berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Pomeg, function()
                                         {
                                             [ 5, 8, 16, 19 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Iapapa));
                                             [ 6, 9, 22 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Mago));
                                         });

        // Unlock the slot requiring Pomeg
        this.__addUnlockSlotStrategy(15, BerryType.Pomeg);

        // #22 Unlock at least one Kelpsy berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Kelpsy, function()
                                         {
                                             [ 6, 8, 21, 23 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Persim));
                                             [ 7, 10, 14, 22 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Chesto));
                                         });

        // Unlock the slot requiring Kelpsy
        this.__addUnlockSlotStrategy(0, BerryType.Kelpsy);

        // #23 Unlock at least one Qualot berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Qualot, function()
                                         {
                                             [ 0, 8, 15, 18 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Pinap));
                                             [ 6, 9, 19, 21 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Mago));
                                         });

        // Unlock the slot requiring Qualot
        this.__addUnlockSlotStrategy(4, BerryType.Qualot);

        // #24 Unlock at least one Hondew berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Hondew, function()
                                         {
                                             [ 1, 8, 15, 23 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Figy));
                                             [ 3, 5, 17, 19 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Wiki));
                                             [ 6, 9, 22 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Aguav));
                                         });

        // Unlock the slot requiring Hondew
        this.__addUnlockSlotStrategy(24, BerryType.Hondew);

        // #25 Unlock at least one Grepa berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Grepa, function()
                                         {
                                             [ 0, 3, 15, 18 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Aguav));
                                             [ 6, 9, 21, 24 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Figy));
                                         });

        // Unlock the slot requiring Grepa
        this.__addUnlockSlotStrategy(20, BerryType.Grepa);

        /////
        ///// From here, all spots are available
        /////

        // #26 Unlock at least one Tamato berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Tamato, function()
                                         {
                                             Automation.Farm.__plantTwoBerriesForSurroundingMutation(BerryType.Pomeg, BerryType.Razz);
                                         });

        // #27 Unlock at least one Cornn berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Cornn, function()
                                         {
                                             Automation.Farm.__plantThreeBerriesForMutation(BerryType.Leppa, BerryType.Bluk, BerryType.Wiki);
                                         });

        // #28 Unlock at least one Magost berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Magost, function()
                                         {
                                             Automation.Farm.__plantThreeBerriesForMutation(BerryType.Pecha, BerryType.Nanab, BerryType.Mago);
                                         });

        // #29 Unlock at least one Rabuta berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Rabuta, function()
                                         {
                                             Automation.Farm.__plantTwoBerriesForSurroundingMutation(BerryType.Aguav, BerryType.Aspear);
                                         });

        // #30 Unlock at least one Nomel berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Nomel, function()
                                         {
                                             [ 6, 9, 21, 24 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Pinap));
                                         });

        // #31 Unlock at least one Spelon berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Spelon, function()
                                         {
                                             App.game.farming.plotList.forEach((plot, index) => { Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Tamato); });
                                         });

        // #32 Unlock at least one Pamtre berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Pamtre, function()
                                         {
                                             App.game.farming.plotList.forEach((plot, index) => { Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Cornn); });
                                         },
                                         null,
                                         OakItemType.Cell_Battery);

        // #33 Unlock at least one Watmel berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Watmel, function()
                                         {
                                             App.game.farming.plotList.forEach((plot, index) => { Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Magost); });
                                         });

        // #34 Unlock at least one Durin berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Durin, function()
                                         {
                                             App.game.farming.plotList.forEach((plot, index) => { Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Rabuta); });
                                         });

        // #35 Unlock at least one Belue berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Belue, function()
                                         {
                                             App.game.farming.plotList.forEach((plot, index) => { Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Nomel); });
                                         });

        /**********************************\
        |*   Harvest some Gen 3 berries   *|
        \**********************************/

        // Make sure to have at least 24 of each berry type before proceeding
        this.__addBerryRequirementBeforeFurtherUnlockStrategy(24, [ BerryType.Pomeg, BerryType.Kelpsy, BerryType.Qualot, BerryType.Hondew, BerryType.Grepa, BerryType.Tamato,
                                                                    BerryType.Cornn, BerryType.Magost, BerryType.Rabuta, BerryType.Nomel, BerryType.Spelon, BerryType.Pamtre,
                                                                    BerryType.Watmel, BerryType.Durin, BerryType.Belue ]);
    }

    /**
     * @brief Adds fourth generation berries unlock strategies to the internal list
     */
    static __addGen4UnlockStrategies()
    {
        /*********************************\
        |*     Gen 4 berries unlocks     *|
        \*********************************/

        // #36 Unlock at least one Occa berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Occa, function()
                                         {
                                             Automation.Farm.__plantFourBerriesForMutation(BerryType.Tamato, BerryType.Figy, BerryType.Spelon, BerryType.Razz);
                                         },
                                         null,
                                         OakItemType.Blaze_Cassette);

        // #44 Unlock at least one Coba berry through mutation (even though it's a berry further in the list, it's needed for the next berry's unlock)
        this.__addUnlockMutationStrategy(BerryType.Coba, function()
                                         {
                                             Automation.Farm.__plantTwoBerriesForMutation(BerryType.Wiki, BerryType.Aguav);
                                         });

        // #37 Unlock at least one Passho berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Passho, function()
                                         {
                                             Automation.Farm.__plantFourBerriesForMutation(BerryType.Oran, BerryType.Kelpsy, BerryType.Chesto, BerryType.Coba);
                                         });

        // #38 Unlock at least one Wacan berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Wacan, function()
                                         {
                                             Automation.Farm.__plantFourBerriesForMutation(BerryType.Iapapa, BerryType.Pinap, BerryType.Qualot, BerryType.Grepa);
                                         });

        // #39 Unlock at least one Rindo berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Rindo, function()
                                         {
                                             Automation.Farm.__plantTwoBerriesForMutation(BerryType.Figy, BerryType.Aguav);
                                         });

        // #40 Unlock at least one Yache berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Yache, function()
                                         {
                                             [ 0, 2, 4, 10, 12, 14, 20, 22, 24 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Passho));
                                         });

        // #45 Unlock at least one Payapa berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Payapa, function()
                                         {
                                             Automation.Farm.__plantFourBerriesForMutation(BerryType.Wiki, BerryType.Cornn, BerryType.Bluk, BerryType.Pamtre);
                                         },
                                         null,
                                         OakItemType.Poison_Barb);

        // #46 Unlock at least one Tanga berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Tanga, function()
                                         {
                                             App.game.farming.plotList.forEach(
                                                 (plot, index) =>
                                                 {
                                                     if (![ 6, 9, 21, 24 ].includes(index))
                                                     {
                                                        Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Rindo);
                                                     }
                                                 });
                                         });

        // #48 Unlock at least one Kasib berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Kasib, function()
                                         {
                                             App.game.farming.plotList.forEach((plot, index) => { Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Cheri); });
                                         });

        // #49 Unlock at least one Haban berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Haban, function()
                                         {
                                             Automation.Farm.__plantFourBerriesForMutation(BerryType.Occa, BerryType.Passho, BerryType.Wacan, BerryType.Rindo);
                                         });

        // #50 Unlock at least one Colbur berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Colbur, function()
                                         {
                                             Automation.Farm.__plantThreeBerriesForMutation(BerryType.Rabuta, BerryType.Kasib, BerryType.Payapa);
                                         });

        // #53 Unlock at least one Roseli berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Roseli, function()
                                         {
                                             Automation.Farm.__plantFourBerriesForMutation(BerryType.Mago, BerryType.Magost, BerryType.Nanab, BerryType.Watmel);
                                         },
                                         null,
                                         OakItemType.Sprinklotad);

        /////
        // Perform mutations requiring Oak items lst to avoid any problem du to the player not having unlocked those

        // #43 Unlock at least one Shuca berry through mutation (moved this far to avoid any problem, since it uses Oak items)
        this.__addUnlockMutationStrategy(BerryType.Shuca, function()
                                         {
                                             App.game.farming.plotList.forEach((plot, index) => { Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Watmel); });
                                         },
                                         OakItemType.Sprinklotad);

        // #47 Unlock at least one Charti berry through mutation (moved this far to avoid any problem, since it uses Oak items)
        this.__addUnlockMutationStrategy(BerryType.Charti, function()
                                         {
                                             App.game.farming.plotList.forEach((plot, index) => { Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Cornn); });
                                         },
                                         OakItemType.Cell_Battery);

        // #51 Unlock at least one Babiri berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Babiri, function()
                                         {
                                             [ 0, 1, 2, 3, 4, 7, 17, 20, 21, 22, 23, 24 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Shuca));
                                             [ 5, 9, 10, 11, 12, 13, 14, 15, 19 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Charti));
                                         });

        // #41 Unlock at least one Chople berry through mutation (moved this far to avoid any problem, since it uses Oak items)
        this.__addUnlockMutationStrategy(BerryType.Chople, function()
                                         {
                                             App.game.farming.plotList.forEach((plot, index) => { Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Spelon); });
                                         },
                                         OakItemType.Blaze_Cassette);

        // The next mutation need to grow berries while others are riped, so we need to start on a empty farm
        this.__unlockStrategySelection.push(
            {
                isNeeded: function()
                    {
                        return !App.game.farming.unlockedBerries[BerryType.Chilan]()
                            && !App.game.farming.plotList.every(
                                   (plot) =>
                                   {
                                       if ([ 6, 8, 16, 18 ].includes(index))
                                       {
                                           return (App.game.farming.plotList[index].berry === BerryType.Chople);
                                       }
                                       else
                                       {
                                           return plot.isEmpty();
                                       }
                                   });
                    },
                harvestAsSoonAsPossible: true,
                oakItemToEquip: null,
                forbiddenOakItem: null,
                action: function() {}
            });

        // #52 Unlock at least one Chilan berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Chilan, function()
                                         {
                                             // Nothing planted, plant the first batch
                                             if (App.game.farming.plotList[6].isEmpty())
                                             {
                                                 [ 6, 8, 16, 18 ].forEach((index) => Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Chople));
                                             }
                                             // First batch ripped, plant the rest
                                             else if (App.game.farming.plotList[6].age > App.game.farming.plotList[6].berryData.growthTime[3])
                                             {
                                                 App.game.farming.plotList.forEach((plot, index) => { Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Chople); });
                                             }
                                         });
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
                oakItemToEquip: null,
                forbiddenOakItem: null,
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

        /*************\
        |*   Gen 4   *|
        \*************/

        // #42 Unlock at least one Kebia berry through mutation
        this.__addUnlockMutationStrategy(BerryType.Kebia, function()
                                         {
                                             App.game.farming.plotList.forEach((plot, index) => { Automation.Farm.__tryPlantBerryAtIndex(index, BerryType.Pamtre); });
                                         },
                                         OakItemType.Poison_Barb);
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
                oakItemToEquip: null,
                forbiddenOakItem: null,
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
     * @param oakItemNeeded: The Oak item needed for the mutation to work
     * @param oakItemToRemove: The Oak item that might ruin the mutation and needs to be forbidden
     */
    static __addUnlockMutationStrategy(berryType, actionCallback, oakItemNeeded = null, oakItemToRemove = null)
    {
        this.__unlockStrategySelection.push(
            {
                // Check if the berry is unlocked
                isNeeded: function() { return !App.game.farming.unlockedBerries[berryType](); },
                harvestAsSoonAsPossible: false,
                oakItemToEquip: oakItemNeeded,
                forbiddenOakItem: oakItemToRemove,
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
                oakItemToEquip: null,
                forbiddenOakItem: null,
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
            this.__disableAutoUnlock("No more automated unlock possible");
            return;
        }

        this.__checkOakItemRequirement();
    }

    /**
     * @brief If the new strategy requires an Oak item that the player does not have, turn off the feature and disable the button
     */
    static __checkOakItemRequirement()
    {
        if (this.__internalStrategy.oakItemToEquip === null)
        {
            return;
        }

        let oakItem = App.game.oakItems.itemList[this.__internalStrategy.oakItemToEquip];
        if (oakItem.isUnlocked())
        {
            return;
        }

        this.__disableAutoUnlock("The '" + oakItem.displayName + "' Oak item is required for the next unlock");

        // Set a watcher to re-enable the feature once the item is purchased
        let watcher = setInterval(function()
            {
                if (App.game.oakItems.itemList[this.__internalStrategy.oakItemToEquip].isUnlocked())
                {
                    Automation.Menu.__disableButton("autoUnlockFarmingEnabled", false);
                    clearInterval(watcher);
                }
            }.bind(this), 5000); // Check every 5s
    }

    /**
     * @brief Disables the 'Auto unlock' button
     *
     * @param reason: The reason for disabling the button to display in the tooltip
     */
    static __disableAutoUnlock(reason)
    {
        Automation.Menu.__forceAutomationState("autoUnlockFarmingEnabled", false);
        Automation.Menu.__disableButton("autoUnlockFarmingEnabled", true, reason);
        Automation.Quest.__forbiddenItem = null;
    }

    /**
     * @brief Sends the Farming automation notification, if at least a berry was harvested
     *
     * @param details: The extra-message to display
     */
    static __sendNotif(details)
    {
        if (this.__plantedBerryCount > 0)
        {
            Automation.Utils.__sendNotif("Harvested " + this.__harvestCount.toString() + " berries<br>" + details);
        }
    }
}
