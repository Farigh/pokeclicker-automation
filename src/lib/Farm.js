/**
 * @class The AutomationFarm regroups the 'Farming' functionalities
 *
 * @note The farm is not accessible right away when starting a new game.
 *       This menu will be hidden until the functionality is unlocked in-game.
 */
class AutomationFarm
{
    static Settings = {
                          FeatureEnabled: "Farming-Enabled",
                          FocusOnUnlocks: "Farming-FocusOnUnlocks",
                          OakItemLoadoutUpdate: "Farming-OakItemLoadoutUpdate"
                      };

    static ForcePlantBerriesAsked = false;

    /**
     * @brief Builds the menu, and initializes internal data
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
            this.__internal__buildUnlockStrategySelection();
            this.__internal__chooseUnlockStrategy();

            // Restore previous session state
            this.toggleAutoFarming();
        }
    }

    /**
     * @brief Toggles the 'Farming' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static toggleAutoFarming(enable)
    {
        if (!App.game.farming.canAccess())
        {
            return;
        }

        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__farmingLoop === null)
            {
                // Set auto-farm loop
                this.__internal__farmingLoop = setInterval(this.__internal__farmLoop.bind(this), 10000); // Runs every 10 seconds
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__farmingLoop);
            this.__internal__farmingLoop = null;

            // Restore setting
            Automation.Utils.OakItem.ForbiddenItems = [];
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__farmingContainer = null;

    static __internal__farmingLoop = null;

    static __internal__harvestTimingType = { AsSoonAsPossible: 0, RightBeforeWithering: 1, LetTheBerryDie: 2 };

    // Collection of
    // {
    //     isNeeded: function(),
    //     berryToUnlock: BerryType,
    //     harvestStrategy: this.__internal__harvestTimingType,
    //     oakItemToEquip: OakItemType,
    //     forbiddenOakItems: Array of OakItemType,
    //     requiredPokemon: String,
    //     requiresDiscord: boolean,
    //     action: function()
    // }
    static __internal__unlockStrategySelection = [];

    static __internal__harvestCount = 0;
    static __internal__freeSlotCount = 0;
    static __internal__plantedBerryCount = 0;

    static __internal__currentStrategy = null;

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        // Add the related buttons to the automation menu
        this.__internal__farmingContainer = document.createElement("div");
        Automation.Menu.AutomationButtonsDiv.appendChild(this.__internal__farmingContainer);

        Automation.Menu.addSeparator(this.__internal__farmingContainer);

        // Only display the menu when the farm is unlocked
        if (!App.game.farming.canAccess())
        {
            this.__internal__farmingContainer.hidden = true;
            this.__internal__setFarmingUnlockWatcher();
        }

        let autoFarmTooltip = "Automatically harvest and plant crops"
                            + Automation.Menu.TooltipSeparator
                            + "Crops are harvested as soon as they ripe\n"
                            + "New crops are planted using the selected one in the farm menu";
        let autoFarmingButton =
            Automation.Menu.addAutomationButton("Farming", this.Settings.FeatureEnabled, autoFarmTooltip, this.__internal__farmingContainer);
        autoFarmingButton.addEventListener("click", this.toggleAutoFarming.bind(this), false);

        // Build advanced settings panel
        let farmingSettingPanel = Automation.Menu.addSettingPanel(autoFarmingButton.parentElement.parentElement);

        let titleDiv = Automation.Menu.createTitleElement("Farming advanced settings");
        titleDiv.style.marginBottom = "10px";
        farmingSettingPanel.appendChild(titleDiv);

        let unlockTooltip = "Takes the necessary actions to unlock new slots and berries";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Focus on unlocking plots and new berries",
                                                               this.Settings.FocusOnUnlocks,
                                                               unlockTooltip,
                                                               farmingSettingPanel);

        let disableOakItemTooltip = "Modifies the oak item loadout when required for a mutation to occur"
                                  + Automation.Menu.TooltipSeparator
                                  + "⚠️ Disabling this functionality will prevent some berries from being unlocked";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Update oak item loadout when needed",
                                                               this.Settings.OakItemLoadoutUpdate,
                                                               disableOakItemTooltip,
                                                               farmingSettingPanel);
    }

    /**
     * @brief Watches for the in-game functionality to be unlocked.
     *        Once unlocked, the menu will be displayed to the user
     */
    static __internal__setFarmingUnlockWatcher()
    {
        let watcher = setInterval(function()
        {
            if (App.game.farming.canAccess())
            {
                clearInterval(watcher);
                this.__internal__farmingContainer.hidden = false;
                this.toggleAutoFarming();
            }
        }.bind(this), 10000); // Check every 10 seconds
    }

    /**
     * @brief The Farming loop
     *
     * Automatically harvests crops and plants the selected berry (from the in-game menu)
     */
    static __internal__farmLoop()
    {
        this.__internal__harvestAsEfficientAsPossible();
        this.__internal__tryToUnlockNewSpots();

        if (Automation.Utils.LocalStorage.getValue(this.Settings.FocusOnUnlocks) === "true")
        {
            this.__internal__chooseUnlockStrategy();
        }
        else if (this.__internal__currentStrategy !== null)
        {
            // If the focus is turned off, clear the current strategy
            this.__internal__currentStrategy = null;
        }

        if ((Automation.Utils.LocalStorage.getValue(this.Settings.FocusOnUnlocks) === "true")
            && !this.ForcePlantBerriesAsked)
        {
            this.__internal__removeOakItemIfNeeded();
            this.__internal__equipOakItemIfNeeded();
            this.__internal__currentStrategy.action();
        }
        else
        {
            this.__internal__plantAllBerries();
        }
    }

    static __internal__equipOakItemIfNeeded()
    {
        if ((this.__internal__currentStrategy.oakItemToEquip === null)
            || (Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) !== "true"))
        {
            return;
        }

        // Equip the right oak item if not already equipped
        let currentLoadout = App.game.oakItems.itemList.filter((item) => item.isActive);

        if (!currentLoadout.some(item => (item.name == this.__internal__currentStrategy.oakItemToEquip)))
        {
            // Remove the last item of the current loadout if needed
            if (currentLoadout.length === App.game.oakItems.maxActiveCount())
            {
                App.game.oakItems.deactivate(currentLoadout.reverse()[0].name);
            }

            // Equip the needed item
            App.game.oakItems.activate(this.__internal__currentStrategy.oakItemToEquip);
        }
    }

    static __internal__removeOakItemIfNeeded()
    {
        if (Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) !== "true")
        {
            return;
        }

        Automation.Utils.OakItem.ForbiddenItems = this.__internal__currentStrategy.forbiddenOakItems;

        for (const item of this.__internal__currentStrategy.forbiddenOakItems)
        {
            App.game.oakItems.deactivate(item);
        }
    }

    /**
     * @brief Unlock any locked spot if the player has the required resources
     */
    static __internal__tryToUnlockNewSpots()
    {
        for (const [ index, plot ] of App.game.farming.plotList.entries())
        {
            if (!plot.isUnlocked)
            {
                FarmController.plotClick(index, { shiftKey: false });
            }
        }
    }

    /**
     * @brief Chooses the best harvesting time depending on the desired action.
     *
     * While trying to get mutations or to attract wandering pokemons, the best move is to harvest the crop right before they die
     * Otherwise, the crop is harvested as soon as it ripes
     */
    static __internal__harvestAsEfficientAsPossible()
    {
        this.__internal__harvestCount = 0;
        this.__internal__freeSlotCount = 0;
        this.__internal__plantedBerryCount = 0;

        // Mutations can only occur while the berry is fully ripe, so we need to collect them the later possible
        for (const [ index, plot ] of App.game.farming.plotList.entries())
        {
            if (plot.isEmpty())
            {
                if (plot.isUnlocked)
                {
                    this.__internal__freeSlotCount++;
                }
                continue;
            }

            if (plot.stage() != PlotStage.Berry)
            {
                continue;
            }

            // Harvest berry in any of those cases:
            //   - The unlock feature is disabled
            //   - Another feature required force harvesting
            //   - The strategy requires to harvest as soon as possible
            //   - The berry is the target one
            //   - The berry is close to dying (less than 15s)
            if ((this.__internal__currentStrategy.harvestStrategy !== this.__internal__harvestTimingType.LetTheBerryDie)
                && ((Automation.Utils.LocalStorage.getValue(this.Settings.FocusOnUnlocks) === "false")
                    || this.ForcePlantBerriesAsked
                    || (this.__internal__currentStrategy === null)
                    || (this.__internal__currentStrategy.harvestStrategy === this.__internal__harvestTimingType.AsSoonAsPossible)
                    || ((this.__internal__currentStrategy.berryToUnlock !== undefined)
                        && (this.__internal__currentStrategy.berryToUnlock == plot.berry))
                    || ((plot.berryData.growthTime[PlotStage.Berry] - plot.age) < 15)))
            {
                App.game.farming.harvest(index);
                this.__internal__harvestCount++;
                this.__internal__freeSlotCount++;
            }
        }
    }

    /**
     * @brief If any spot is available, plants the selected berry (from the in-game menu)
     */
    static __internal__plantAllBerries()
    {
        if (this.__internal__freeSlotCount > 0)
        {
            let selectedBerryType = FarmController.selectedBerry();
            let selectedBerryCount = App.game.farming.berryList[selectedBerryType]();

            if (selectedBerryCount > 0)
            {
                App.game.farming.plantAll(selectedBerryType);

                this.__internal__plantedBerryCount = Math.min(this.__internal__freeSlotCount, selectedBerryCount);

                let berryName = BerryType[selectedBerryType];
                let berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';
                this.__internal__sendNotif("Planted some " + berryName + " " + berryImage);
            }
        }
    }

    /**
     * @brief Builds the optimum berry configuration for mutation requiring over 600 points, with a single berry type
     *
     * @param berryType: The type of berry to plant
     *
     * @returns The built config { <berryType>: [ indexes... ] }
     */
    static __internal__plantABerryForMutationRequiringOver600PointsConfig(berryType)
    {
        // This represents the following strategy
        //  |o|o|o|o|o|
        //  |o| |o| |o|
        //  |o| | | |o|
        //  |o|o|o|o|o|
        //  |o|o|o|o|o|
        let config = {};
        config[berryType] = App.game.farming.plotList.map((_, index) => index).filter(index => ![ 6, 8, 11, 12, 13 ].includes(index));
        return config;
    }

    /**
     * @brief Builds the optimum berry configuration for mutation requiring 23 berries on the field, with a single berry type
     *
     * @param berryType: The type of berry to plant
     *
     * @returns The built config { <berryType>: [ indexes... ] }
     */
    static __internal__plantABerryForMutationRequiring23BerriesConfig(berryType)
    {
        // This represents the following strategy
        //  |o|o|o|o|o|
        //  |o|o|o|o|o|
        //  |o|o| | |o|
        //  |o|o|o|o|o|
        //  |o|o|o|o|o|
        let config = {};
        config[berryType] = App.game.farming.plotList.map((_, index) => index).filter(index => ![ 12, 13 ].includes(index));
        return config;
    }

    /**
     * @brief Builds the optimum berry configuration for mutation, with two different berry types
     *
     * @param berry1Type: The first berry type
     * @param berry2Type: The second berry type
     * @param everyPlotUnlocked: Set to true if every single plot is expected to be unlocked
     * @param thirteenthPlotUnlocked: Set to true if at least 13 plots are expected to be unlocked
     * @param tenthPlotUnlocked: Set to true if at least 10 plots are expected to be unlocked
     *
     * @returns The built config { <berryType>: [ indexes... ], ... }
     */
    static __internal__plantTwoBerriesForMutationConfig(
        berry1Type, berry2Type, everyPlotUnlocked = true, thirteenthPlotUnlocked = true, tenthPlotUnlocked = true)
    {
        let config = {};
        if (everyPlotUnlocked)
        {
            // This represents the following strategy
            //  |1| | |1| |
            //  | |2| | |2|
            //  | | | | | |
            //  |1| | |1| |
            //  | |2| | |2|
            config[berry1Type] = [ 0, 3, 15, 18 ];
            config[berry2Type] = [ 6, 9, 21, 24 ];
        }
        else if (tenthPlotUnlocked)
        {
            if (thirteenthPlotUnlocked)
            {
                // This represents the following strategy
                //  |x|x|1|x|x|
                //  |x| | | |x|
                //  |1| |2| |1|
                //  |x| | | |x|
                //  |x|x|1|x|x|
                config[berry1Type] = [ 2, 10, 14, 22 ];
                config[berry2Type] = [ 12 ];
            }
            else
            {
                // This represents the following strategy
                //  |x|x|1|x|x|
                //  |x| | | |x|
                //  |x| |2| |x|
                //  |x| |1| |x|
                //  |x|x|x|x|x|
                config[berry1Type] = [ 2, 17 ];
                config[berry2Type] = [ 12 ];
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
            config[berry1Type] = [ 7, 17 ];
            config[berry2Type] = [ 11, 13 ];
        }

        return config;
    }

    /**
     * @brief Builds the optimum berry configuration for mutation, with three different berry types
     *
     * @param berry1Type: The first berry type
     * @param berry2Type: The second berry type
     * @param berry3Type: The third berry type
     *
     * @returns The built config { <berryType>: [ indexes... ], ... }
     */
    static __internal__plantThreeBerriesForMutationConfig(berry1Type, berry2Type, berry3Type)
    {
        // This represents the following strategy
        //  | |1| | |1|
        //  |2|3| |2|3|
        //  | | | | | |
        //  | |1| | |1|
        //  |2|3| |2|3|
        let config = {};
        config[berry1Type] = [ 1, 4, 16, 19 ];
        config[berry2Type] = [ 5, 8, 20, 23 ];
        config[berry3Type] = [ 6, 9, 21, 24 ];

        return config;
    }

    /**
     * @brief Builds the optimum berry configuration for mutation, with four different berry types
     *
     * @param berry1Type: The first berry type
     * @param berry2Type: The second berry type
     * @param berry3Type: The third berry type
     * @param berry4Type: The fourth berry type
     *
     * @returns The built config { <berryType>: [ indexes... ], ... }
     */
    static __internal__plantFourBerriesForMutationConfig(berry1Type, berry2Type, berry3Type, berry4Type)
    {
        // This represents the following strategy
        //  |1| |2| |1|
        //  |3| |4| |3|
        //  | | | | | |
        //  |2| |1| |2|
        //  |4| |3| |4|
        let config = {};
        config[berry1Type] = [ 0, 4, 17 ];
        config[berry2Type] = [ 2, 15, 19 ];
        config[berry3Type] = [ 5, 9, 22 ];
        config[berry4Type] = [ 7, 20, 24 ];

        return config;
    }

    /**
     * @brief Builds the optimum berry configuration for surrounding berry mutation, with two different berry types
     *
     * @param triggerBerryType: The berry type that triggers the mutation
     * @param mutatedBerryType: The berry type of the mutated berry
     *
     * @returns The built config { <berryType>: [ indexes... ], ... }
     */
    static __internal__plantTwoBerriesForSurroundingMutationConfig(triggerBerryType, mutatedBerryType)
    {
        // This represents the following strategy (triggerBerryType = x, mutatedBerryType = o)
        //  |o|o|o|o|o|
        //  |o|x|o|o|x|
        //  |o|o|o|o|o|
        //  |o|o|o|o|o|
        //  |o|x|o|o|x|
        let config = {};
        config[triggerBerryType] = [ 6, 9, 21, 24 ];
        config[mutatedBerryType] = App.game.farming.plotList.map((_, index) => index).filter(x => !config[triggerBerryType].includes(x));

        return config;
    }

    /**
     * @brief Tries to plant the given @p berryType at the given @p index
     *
     * A berry can only be planted if:
     *    - The selected spot is unlocked
     *    - The spot is empty
     *    - The player has a berry to plant in its inventory
     *
     * @param index: The index of the spot to plant the berry in
     * @param berryType: The type of the berry to plant
     *                   (passing BerryType.None will remove any present berry, but plant none)
     * @param removeAnyUnwantedBerry: If set to true, any unwanted berry at the given @p index will be removed, if possible
     *
     * @returns True if a berry was planted, false otherwise
     */
    static __internal__tryPlantBerryAtIndex(index, berryType, removeAnyUnwantedBerry = true)
    {
        let plot = App.game.farming.plotList[index];

        if (!plot.isUnlocked)
        {
            return false;
        }

        // Remove any mutation that might have occured, as soon as possible
        if (removeAnyUnwantedBerry && !this.__internal__removeAnyUnwantedBerry(index, berryType))
        {
            return false;
        }

        if (berryType === BerryType.None)
        {
            return false;
        }

        if (App.game.farming.hasBerry(berryType))
        {
            App.game.farming.plant(index, berryType, true);
            this.__internal__plantedBerryCount++;
            return true;
        }

        return false;
    }

    /**
     * @brief Tries to plant the given @p berryType in the selected @p indexes
     *
     * @see __internal__tryPlantBerryAtIndex
     *
     * @param indexes: The list of indexes of the spot to plant the berry in
     * @param berryType: The type of the berry to plant
     */
    static __internal__tryPlantBerryAtIndexes(berryType, indexes)
    {
        for (const index of indexes)
        {
            this.__internal__tryPlantBerryAtIndex(index, berryType);
        }
    }

    /**
     * @brief Builds the internal berry/slot unlock strategy selection list
     */
    static __internal__buildUnlockStrategySelection()
    {
        this.__internal__addGen1UnlockStrategies();
        this.__internal__addGen2UnlockStrategies();
        this.__internal__addGen3UnlockStrategies();
        this.__internal__addGen4UnlockStrategies();
        this.__internal__addGen5UnlockStrategies();

        this.__internal__addUnneededBerriesStrategies();
        this.__internal__addEnigmaBerryStrategy();
    }

    /**
     * @brief Adds first generation berries unlock strategies to the internal list
     */
    static __internal__addGen1UnlockStrategies()
    {
        /*********************************\
        |*     Gen 1 berries unlocks     *|
        \*********************************/

        // #1 Unlock the slot requiring Cheri
        this.__internal__addUnlockSlotStrategy(7, BerryType.Cheri);

        // #2 Unlock the slot requiring Chesto
        this.__internal__addUnlockSlotStrategy(13, BerryType.Chesto);

        // #3 Unlock the slot requiring Pecha
        this.__internal__addUnlockSlotStrategy(17, BerryType.Pecha);

        // #4 Unlock the slot requiring Rawst
        this.__internal__addUnlockSlotStrategy(11, BerryType.Rawst);

        // #5 Unlock the slot requiring Aspear
        this.__internal__addUnlockSlotStrategy(6, BerryType.Aspear);

        // #6 Unlock the slot requiring Leppa
        this.__internal__addUnlockSlotStrategy(8, BerryType.Leppa);

        // #7 Unlock the slot requiring Oran
        this.__internal__addUnlockSlotStrategy(18, BerryType.Oran);

        // #8 Unlock the slot requiring Sitrus
        this.__internal__addUnlockSlotStrategy(16, BerryType.Sitrus);

        /**********************************\
        |*   Harvest some Gen 1 berries   *|
        \**********************************/

        // Make sure to have at least 20 of each berry type before proceeding
        this.__internal__addBerryRequirementBeforeFurtherUnlockStrategy(
            20,
            [
                BerryType.Cheri, BerryType.Chesto, BerryType.Pecha, BerryType.Rawst,
                BerryType.Aspear, BerryType.Leppa, BerryType.Oran, BerryType.Sitrus
            ]);
    }

    /**
     * @brief Adds second generation berries unlock strategies to the internal list
     */
    static __internal__addGen2UnlockStrategies()
    {
        /*********************************\
        |*     Gen 2 berries unlocks     *|
        \*********************************/

        // #9 Unlock at least one Persim berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Persim, this.__internal__plantTwoBerriesForMutationConfig(BerryType.Oran, BerryType.Pecha, false, false, false));

        // Unlock the slot requiring Persim
        this.__internal__addUnlockSlotStrategy(2, BerryType.Persim);

        // #10 Unlock at least one Razz berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Razz, this.__internal__plantTwoBerriesForMutationConfig(BerryType.Leppa, BerryType.Cheri, false, false));

        // Unlock the slot requiring Razz
        this.__internal__addUnlockSlotStrategy(14, BerryType.Razz);

        // #11 Unlock at least one Bluk berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Bluk, this.__internal__plantTwoBerriesForMutationConfig(BerryType.Leppa, BerryType.Chesto, false, false));

        // Unlock the slot requiring Bluk
        this.__internal__addUnlockSlotStrategy(22, BerryType.Bluk);

        // #12 Unlock at least one Nanab berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Nanab, this.__internal__plantTwoBerriesForMutationConfig(BerryType.Aspear, BerryType.Pecha, false, false));

        // Unlock the slot requiring Nanab
        this.__internal__addUnlockSlotStrategy(10, BerryType.Nanab);

        // #13 Unlock at least one Wepear berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Wepear, this.__internal__plantTwoBerriesForMutationConfig(BerryType.Oran, BerryType.Rawst, false));

        // Unlock the slot requiring Wepear
        this.__internal__addUnlockSlotStrategy(3, BerryType.Wepear);

        // #14 Unlock at least one Pinap berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Pinap, this.__internal__plantTwoBerriesForMutationConfig(BerryType.Sitrus, BerryType.Aspear, false));

        // Unlock the slot requiring Pinap
        this.__internal__addUnlockSlotStrategy(19, BerryType.Pinap);

        // #15 Unlock at least one Figy berry through mutation
        let figyConfig = {};
        figyConfig[BerryType.Cheri] = [ 2, 3, 6, 10, 14, 16, 18, 19, 22 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Figy, figyConfig);

        // Unlock the slot requiring Figy
        this.__internal__addUnlockSlotStrategy(21, BerryType.Figy);

        // #16 Unlock at least one Wiki berry through mutation
        let chestoConfig = {};
        chestoConfig[BerryType.Chesto] = [ 2, 3, 6, 10, 12, 14, 19, 21, 22 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Wiki, chestoConfig);

        // Unlock the slot requiring Wiki
        this.__internal__addUnlockSlotStrategy(5, BerryType.Wiki);

        // #17 Unlock at least one Mago berry through mutation
        let magoConfig = {};
        magoConfig[BerryType.Pecha] = [ 2, 3, 5, 10, 12, 14, 19, 21, 22 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Mago, magoConfig);

        // Unlock the slot requiring Mago
        this.__internal__addUnlockSlotStrategy(1, BerryType.Mago);

        // #18 Unlock at least one Aguav berry through mutation
        let aguavConfig = {};
        aguavConfig[BerryType.Rawst] = [ 2, 3, 5, 10, 12, 14, 19, 21, 22 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Aguav, aguavConfig);

        // Unlock the slot requiring Aguav
        this.__internal__addUnlockSlotStrategy(9, BerryType.Aguav);

        // #19 Unlock at least one Iapapa berry through mutation
        let iapapaConfig = {};
        iapapaConfig[BerryType.Aspear] = [ 2, 3, 5, 10, 12, 14, 19, 21, 22 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Iapapa, iapapaConfig);

        // Unlock the slot requiring Iapapa
        this.__internal__addUnlockSlotStrategy(23, BerryType.Iapapa);

        /**********************************\
        |*   Harvest some Gen 2 berries   *|
        \**********************************/

        // Make sure to have at least 20 of each berry type before proceeding
        this.__internal__addBerryRequirementBeforeFurtherUnlockStrategy(
            20,
            [
                BerryType.Persim, BerryType.Razz, BerryType.Bluk, BerryType.Nanab, BerryType.Wepear, BerryType.Pinap,
                BerryType.Figy, BerryType.Wiki, BerryType.Mago, BerryType.Aguav, BerryType.Iapapa
            ]);
    }

    /**
     * @brief Adds third generation berries unlock strategies to the internal list
     */
    static __internal__addGen3UnlockStrategies()
    {
        /*********************************\
        |*     Gen 3 berries unlocks     *|
        \*********************************/

        // #21 Unlock at least one Pomeg berry through mutation
        let pomegConfig = {};
        pomegConfig[BerryType.Iapapa] = [ 5, 8, 16, 19 ];
        pomegConfig[BerryType.Mago] = [ 6, 9, 22 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Pomeg, pomegConfig);

        // Unlock the slot requiring Pomeg
        this.__internal__addUnlockSlotStrategy(15, BerryType.Pomeg);

        // #22 Unlock at least one Kelpsy berry through mutation
        let kelpsyConfig = {};
        kelpsyConfig[BerryType.Persim] = [ 6, 8, 21, 23 ];
        kelpsyConfig[BerryType.Chesto] = [ 7, 10, 14, 22 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Kelpsy, kelpsyConfig);

        // Unlock the slot requiring Kelpsy
        this.__internal__addUnlockSlotStrategy(0, BerryType.Kelpsy);

        // #23 Unlock at least one Qualot berry through mutation
        let qualotConfig = {};
        qualotConfig[BerryType.Pinap] = [ 0, 8, 15, 18 ];
        qualotConfig[BerryType.Mago] = [ 6, 9, 19, 21 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Qualot, qualotConfig);

        // Unlock the slot requiring Qualot
        this.__internal__addUnlockSlotStrategy(4, BerryType.Qualot);

        // #24 Unlock at least one Hondew berry through mutation
        let hondewConfig = {};
        hondewConfig[BerryType.Figy] = [ 1, 8, 15, 23 ];
        hondewConfig[BerryType.Wiki] = [ 3, 5, 17, 19 ];
        hondewConfig[BerryType.Aguav] = [ 6, 9, 22 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Hondew, hondewConfig);

        // Unlock the slot requiring Hondew
        this.__internal__addUnlockSlotStrategy(24, BerryType.Hondew);

        // #25 Unlock at least one Grepa berry through mutation
        let grepaConfig = {};
        grepaConfig[BerryType.Aguav] = [ 0, 3, 15, 18 ];
        grepaConfig[BerryType.Figy] = [ 6, 9, 21, 24 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Grepa, grepaConfig);

        // Unlock the slot requiring Grepa
        this.__internal__addUnlockSlotStrategy(20, BerryType.Grepa);

        /////
        ///// From here, all spots are available
        /////

        // #26 Unlock at least one Tamato berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Tamato, this.__internal__plantTwoBerriesForSurroundingMutationConfig(BerryType.Pomeg, BerryType.Razz));

        // #27 Unlock at least one Cornn berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Cornn, this.__internal__plantThreeBerriesForMutationConfig(BerryType.Leppa, BerryType.Bluk, BerryType.Wiki));

        // #28 Unlock at least one Magost berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Magost, this.__internal__plantThreeBerriesForMutationConfig(BerryType.Pecha, BerryType.Nanab, BerryType.Mago));

        // #29 Unlock at least one Rabuta berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Rabuta, this.__internal__plantTwoBerriesForSurroundingMutationConfig(BerryType.Aguav, BerryType.Aspear));

        // #30 Unlock at least one Nomel berry through mutation
        let nomelConfig = {};
        nomelConfig[BerryType.Pinap] = [ 6, 9, 21, 24 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Nomel, nomelConfig);

        // Make sure to have at least 25 of each berry type before proceeding
        this.__internal__addBerryRequirementBeforeFurtherUnlockStrategy(
            25,
            [
                BerryType.Tamato, BerryType.Cornn, BerryType.Magost, BerryType.Rabuta, BerryType.Nomel
            ]);

        // #31 Unlock at least one Spelon berry through mutation
        let allSlotIndexes = App.game.farming.plotList.map((_, index) => index)
        let spelonConfig = {};
        spelonConfig[BerryType.Tamato] = allSlotIndexes;
        this.__internal__addUnlockMutationStrategy(BerryType.Spelon, spelonConfig);

        // #32 Unlock at least one Pamtre berry through mutation
        let pamtreConfig = {};
        pamtreConfig[BerryType.Cornn] = allSlotIndexes;
        this.__internal__addUnlockMutationStrategy(BerryType.Pamtre, pamtreConfig, 1, null, [ OakItemType.Cell_Battery ]);

        // #33 Unlock at least one Watmel berry through mutation
        let watmelConfig = {};
        watmelConfig[BerryType.Magost] = allSlotIndexes;
        this.__internal__addUnlockMutationStrategy(BerryType.Watmel, watmelConfig);

        // #34 Unlock at least one Durin berry through mutation
        let durinConfig = {};
        durinConfig[BerryType.Rabuta] = allSlotIndexes;
        this.__internal__addUnlockMutationStrategy(BerryType.Durin, durinConfig);

        // #35 Unlock at least one Belue berry through mutation
        let belueConfig = {};
        belueConfig[BerryType.Nomel] = allSlotIndexes;
        this.__internal__addUnlockMutationStrategy(BerryType.Belue, belueConfig);

        /**********************************\
        |*   Harvest some Gen 3 berries   *|
        \**********************************/

        // Make sure to have at least 25 of each berry type before proceeding
        this.__internal__addBerryRequirementBeforeFurtherUnlockStrategy(
            25,
            [
                BerryType.Pomeg, BerryType.Kelpsy, BerryType.Qualot, BerryType.Hondew, BerryType.Grepa,
                BerryType.Spelon, BerryType.Pamtre, BerryType.Watmel, BerryType.Durin, BerryType.Belue
            ]);
    }

    /**
     * @brief Adds fourth generation berries unlock strategies to the internal list
     */
    static __internal__addGen4UnlockStrategies()
    {
        /*********************************\
        |*     Gen 4 berries unlocks     *|
        \*********************************/

        // #36 Unlock at least one Occa berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Occa, this.__internal__plantFourBerriesForMutationConfig(BerryType.Tamato, BerryType.Figy, BerryType.Spelon, BerryType.Razz),
            1,
            null,
            [ OakItemType.Blaze_Cassette ]);

        // #44 Unlock at least one Coba berry through mutation (even though it's a berry further in the list, it's needed for the next berry's unlock)
        this.__internal__addUnlockMutationStrategy(
            BerryType.Coba, this.__internal__plantTwoBerriesForMutationConfig(BerryType.Wiki, BerryType.Aguav));

        // #37 Unlock at least one Passho berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Passho, this.__internal__plantFourBerriesForMutationConfig(BerryType.Oran, BerryType.Kelpsy, BerryType.Chesto, BerryType.Coba));

        // #38 Unlock at least one Wacan berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Wacan, this.__internal__plantFourBerriesForMutationConfig(BerryType.Iapapa, BerryType.Pinap, BerryType.Qualot, BerryType.Grepa));

        // #39 Unlock at least one Rindo berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Rindo, this.__internal__plantTwoBerriesForMutationConfig(BerryType.Figy, BerryType.Aguav));

        // #40 Unlock at least one Yache berry through mutation
        let yacheConfig = {};
        yacheConfig[BerryType.Passho] = [ 0, 2, 4, 10, 12, 14, 20, 22, 24 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Yache, yacheConfig);

        // #45 Unlock at least one Payapa berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Payapa,
            this.__internal__plantFourBerriesForMutationConfig(BerryType.Wiki, BerryType.Cornn, BerryType.Bluk, BerryType.Pamtre),
            1,
            null,
            [ OakItemType.Rocky_Helmet, OakItemType.Cell_Battery ]);

        // #46 Unlock at least one Tanga berry through mutation
        let tangaConfig = {};
        tangaConfig[BerryType.Rindo] = App.game.farming.plotList.map((_, index) => index).filter(index => ![ 6, 8, 16, 18 ].includes(index));
        this.__internal__addUnlockMutationStrategy(BerryType.Tanga, tangaConfig);

        // #48 Unlock at least four Kasib berries through mutation
        this.__internal__unlockStrategySelection.push(
            {
                // Check if the berry is unlocked and the player has at least 1 of them in stock or planted
                isNeeded: function()
                    {
                        if (!App.game.farming.unlockedBerries[BerryType.Kasib]())
                        {
                            return true;
                        }

                        let totalCount = App.game.farming.berryList[BerryType.Kasib]() + this.__internal__getPlantedBerriesCount(BerryType.Kasib);
                        return (totalCount < 4);
                    }.bind(this),
                berryToUnlock: BerryType.Kasib,
                harvestStrategy: this.__internal__harvestTimingType.LetTheBerryDie,
                oakItemToEquip: null,
                forbiddenOakItems: [],
                requiredPokemon: null,
                requiresDiscord: false,
                action: function ()
                    {
                        for (const index of App.game.farming.plotList.keys())
                        {
                            Automation.Farm.__internal__tryPlantBerryAtIndex(index, BerryType.Cheri);
                        }
                    }
            });

        // #49 Unlock at least one Haban berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Haban, this.__internal__plantFourBerriesForMutationConfig(BerryType.Occa, BerryType.Passho, BerryType.Wacan, BerryType.Rindo));

        // #50 Unlock at least one Colbur berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Colbur, this.__internal__plantThreeBerriesForMutationConfig(BerryType.Rabuta, BerryType.Kasib, BerryType.Payapa));

        // #53 Unlock at least one Roseli berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Roseli,
            this.__internal__plantFourBerriesForMutationConfig(BerryType.Mago, BerryType.Magost, BerryType.Nanab, BerryType.Watmel),
            1,
            null,
            [ OakItemType.Sprinklotad ]);

        /////
        // Perform mutations requiring Oak items last to avoid any problem du to the player not having unlocked those

        // #43 Unlock at least one Shuca berry through mutation (moved this far to avoid any problem, since it uses Oak items)
        let allSlotIndexes = App.game.farming.plotList.map((_, index) => index)
        let shucaConfig = {};
        shucaConfig[BerryType.Watmel] = allSlotIndexes;
        this.__internal__addUnlockMutationStrategy(BerryType.Shuca, shucaConfig, 1, OakItemType.Sprinklotad);

        // #47 Unlock at least one Charti berry through mutation (moved this far to avoid any problem, since it uses Oak items)
        let chartiConfig = {};
        chartiConfig[BerryType.Cornn] = allSlotIndexes;
        this.__internal__addUnlockMutationStrategy(BerryType.Charti, chartiConfig, 1, OakItemType.Cell_Battery);

        // #51 Unlock at least one Babiri berry through mutation
        let babiriConfig = {};
        babiriConfig[BerryType.Shuca] = [ 0, 1, 2, 3, 4, 7, 17, 20, 21, 22, 23, 24 ];
        babiriConfig[BerryType.Charti] = [ 5, 9, 10, 11, 12, 13, 14, 15, 19 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Babiri, babiriConfig);

        // #41 Unlock at least one Chople berry through mutation (moved this far to avoid any problem, since it uses Oak items)
        let chopleConfig = {};
        chopleConfig[BerryType.Spelon] = allSlotIndexes;
        this.__internal__addUnlockMutationStrategy(BerryType.Chople, chopleConfig, 1, OakItemType.Blaze_Cassette);

        // The next mutation need to grow berries while others are ripe, so we need to start on a empty farm
        this.__internal__unlockStrategySelection.push(
            {
                isNeeded: function()
                    {
                        return !App.game.farming.unlockedBerries[BerryType.Chilan]()
                            && !App.game.farming.plotList.every(
                                   (plot) =>
                                   {
                                        return plot.isEmpty() || (plot.berry === BerryType.Chople);
                                   });
                    },
                harvestStrategy: this.__internal__harvestTimingType.AsSoonAsPossible,
                oakItemToEquip: null,
                forbiddenOakItems: [],
                requiredPokemon: null,
                requiresDiscord: false,
                action: function() {}
            });

        // #52 Unlock at least one Chilan berry through mutation
        this.__internal__unlockStrategySelection.push(
            {
                // Check if the berry is unlocked and the player has at least 1 of them in stock or planted
                isNeeded: function()
                    {
                        if (!App.game.farming.unlockedBerries[BerryType.Chilan]())
                        {
                            return true;
                        }

                        let totalCount = App.game.farming.berryList[BerryType.Chilan]() + this.__internal__getPlantedBerriesCount(BerryType.Chilan);
                        return (totalCount < 1);
                    }.bind(this),
                berryToUnlock: BerryType.Chilan,
                harvestStrategy: this.__internal__harvestTimingType.RightBeforeWithering,
                oakItemToEquip: null,
                forbiddenOakItems: [],
                requiredPokemon: null,
                requiresDiscord: false,
                action: function()
                {
                    // Nothing planted, plant the first batch
                    if (App.game.farming.plotList[6].isEmpty())
                    {
                        for (const index of [ 6, 8, 16, 18 ])
                        {
                            Automation.Farm.__internal__tryPlantBerryAtIndex(index, BerryType.Chople);
                        }
                    }
                    // First batch ripped, plant the rest
                    else if (App.game.farming.plotList[6].age > App.game.farming.plotList[6].berryData.growthTime[PlotStage.Bloom])
                    {
                        for (const index of App.game.farming.plotList.keys())
                        {
                            Automation.Farm.__internal__tryPlantBerryAtIndex(index, BerryType.Chople);
                        }
                    }
                }
            });

        // #42 Unlock at least one Kebia berry through mutation
        let kebiaConfig = {};
        kebiaConfig[BerryType.Pamtre] = allSlotIndexes;
        this.__internal__addUnlockMutationStrategy(BerryType.Kebia, kebiaConfig, 1, OakItemType.Rocky_Helmet);
    }

    /**
     * @brief Adds fifth generation berries unlock strategies to the internal list
     */
    static __internal__addGen5UnlockStrategies()
    {
        /*********************************\
        |*     Gen 5 berries unlocks     *|
        \*********************************/

        // #54 Unlock at least one Micle berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Micle,
            this.__internal__plantABerryForMutationRequiringOver600PointsConfig(BerryType.Pamtre),
            1,
            null,
            [ OakItemType.Rocky_Helmet ]);

        // #55 Unlock at least one Custap berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Custap,
            this.__internal__plantABerryForMutationRequiringOver600PointsConfig(BerryType.Watmel),
            1,
            null,
            [ OakItemType.Sprinklotad ]);

        // #56 Unlock at least one Jaboca berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Jaboca, this.__internal__plantABerryForMutationRequiringOver600PointsConfig(BerryType.Durin));

        // #57 Unlock at least one Rowap berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Rowap, this.__internal__plantABerryForMutationRequiringOver600PointsConfig(BerryType.Belue));

        //////
        // The following mutations require the player to have caught legendary pokemons

        // #60 Unlock at least one Liechi berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Liechi,
            this.__internal__plantABerryForMutationRequiring23BerriesConfig(BerryType.Passho),
            4,
            null,
            [],
            "Kyogre");

        // #61 Unlock at least one Ganlon berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Ganlon,
            this.__internal__plantABerryForMutationRequiring23BerriesConfig(BerryType.Shuca),
            4,
            null,
            [],
            "Groudon");

        // #58 Unlock at least one Kee berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Kee, this.__internal__plantTwoBerriesForMutationConfig(BerryType.Liechi, BerryType.Ganlon));

        // #62 Unlock at least four Salac berries through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Salac,
            this.__internal__plantABerryForMutationRequiring23BerriesConfig(BerryType.Coba),
            4,
            null,
            [],
            "Rayquaza");

        // #63 Unlock at least four Petaya berries through mutation
        let petayaConfig = {};
        petayaConfig[BerryType.Kasib] = [ 0 ];
        petayaConfig[BerryType.Payapa] = [ 2 ];
        petayaConfig[BerryType.Yache] = [ 4 ];
        petayaConfig[BerryType.Shuca] = [ 5 ];
        petayaConfig[BerryType.Wacan] = [ 9 ];
        petayaConfig[BerryType.Chople] = [ 10 ];
        petayaConfig[BerryType.Coba] = [ 11 ];
        petayaConfig[BerryType.Kebia] = [ 12 ];
        petayaConfig[BerryType.Haban] = [ 14 ];
        petayaConfig[BerryType.Colbur] = [ 15 ];
        petayaConfig[BerryType.Babiri] = [ 16 ];
        petayaConfig[BerryType.Charti] = [ 17 ];
        petayaConfig[BerryType.Tanga] = [ 19 ];
        petayaConfig[BerryType.Occa] = [ 20 ];
        petayaConfig[BerryType.Rindo] = [ 21 ];
        petayaConfig[BerryType.Passho] = [ 22 ];
        petayaConfig[BerryType.Roseli] = [ 23 ];
        petayaConfig[BerryType.Chilan] = [ 24 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Petaya, petayaConfig, 4);

        // #59 Unlock at least one Maranga berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Maranga, this.__internal__plantTwoBerriesForMutationConfig(BerryType.Salac, BerryType.Petaya));

        // #64 Unlock at least one Apicot berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Apicot,
            this.__internal__plantABerryForMutationRequiring23BerriesConfig(BerryType.Chilan),
            1,
            null,
            [],
            "Palkia");

        // #65 Unlock at least one Lansat berry through mutation
        this.__internal__addUnlockMutationStrategy(
            BerryType.Lansat,
            this.__internal__plantABerryForMutationRequiring23BerriesConfig(BerryType.Roseli),
            1,
            null,
            [],
            "Dialga");

        // #66 Unlock at least one Starf berry through mutation
        let starfConfig = {};
        starfConfig[BerryType.Roseli] = App.game.farming.plotList.map((_, index) => index).filter(index => ![ 11, 12, 13 ].includes(index));
        this.__internal__addUnlockMutationStrategy(BerryType.Starf, starfConfig);
    }

    /**
     * @brief Some berries are not needed to unlock other berries and can be pretty anoying to mutate.
     *        This method add such berry farming strategy
     */
    static __internal__addUnneededBerriesStrategies()
    {
        /*************\
        |*   Gen 2   *|
        \*************/

        // #20 Unlock and gather at least 24 Lum berry through mutation
        let lumConfig = {};
        lumConfig[BerryType.Sitrus] = [ 0, 4, 20, 24 ];
        lumConfig[BerryType.Oran] = [ 1, 3, 21, 23 ];
        lumConfig[BerryType.Aspear] = [ 2, 22 ];
        lumConfig[BerryType.Leppa] = [ 5, 9, 15, 19 ];
        lumConfig[BerryType.Pecha] = [ 7, 17 ];
        lumConfig[BerryType.Rawst] = [ 10, 14 ];
        lumConfig[BerryType.Chesto] = [ 11, 13 ];
        lumConfig[BerryType.Cheri] = [ 12 ];
        this.__internal__addUnlockMutationStrategy(BerryType.Lum, lumConfig, 24);
    }

    /**
     * @brief Adds Enigma berry (requiring a discord account linked) unlock strategy to the internal list
     */
    static __internal__addEnigmaBerryStrategy()
    {
        let neededBerries = EnigmaMutation.getReqs();

        // This represents the following strategy
        // | |a| | | |
        // |b| |c| | |  with:  a : North berry
        // | |d| |a| |         b : West berry
        // | | |b| |c|         c : East berry
        // | | | |d| |         d : South berry
        let enigmaConfig = {};
        enigmaConfig[neededBerries[0]] = [ 1, 13 ];
        enigmaConfig[neededBerries[1]] = [ 5, 17 ];
        enigmaConfig[neededBerries[2]] = [ 7, 19 ];
        enigmaConfig[neededBerries[3]] = [ 11, 23 ];

        this.__internal__addUnlockMutationStrategy(BerryType.Enigma, enigmaConfig);
        this.__internal__unlockStrategySelection[this.__internal__unlockStrategySelection.length - 1].requiresDiscord = true;
    }

    /**
     * @brief Adds an unlock strategy to unlock the slot at @p slotIndex that requires @p berryType
     *
     * @param slotIndex: The index of the slot to unlock
     * @param berryType: The type of berry needed to unlock this slot
     */
    static __internal__addUnlockSlotStrategy(slotIndex, berryType)
    {
        this.__internal__unlockStrategySelection.push(
            {
                // Check if the slot is unlocked
                isNeeded: function() { return !App.game.farming.plotList[slotIndex].isUnlocked; },
                harvestStrategy: this.__internal__harvestTimingType.AsSoonAsPossible,
                oakItemToEquip: null,
                forbiddenOakItems: [],
                requiredPokemon: null,
                requiresDiscord: false,
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
                    Automation.Farm.__internal__plantAllBerries();
                }
            });
    }

    /**
     * @brief Adds an unlock strategy aiming at unlocking a berry using mutations
     *
     * @param berryType: The type of berry to unlock
     * @param berriesIndexes: The berries to plant and their indexes ({ <berryType>: [ indexes... ], ... })
     * @param minimumRequiredBerry: The minimum of berries to hold required (Default: 1)
     * @param oakItemNeeded: The Oak item needed for the mutation to work (Default: None)
     * @param oakItemsToRemove: The Oak items list that might ruin the mutation and needs to be forbidden (Default: None)
     * @param requiredPokemonName: The name of the Pokemon needed for the mutation to occur (Default: None)
     */
    static __internal__addUnlockMutationStrategy(berryType,
                                                 berriesIndexes,
                                                 minimumRequiredBerry = 1,
                                                 oakItemNeeded = null,
                                                 oakItemsToRemove = [],
                                                 requiredPokemonName = null)
    {
        let step =
            {
                // Check if the berry is unlocked and the player has at least 1 of them in stock or planted
                isNeeded: function()
                    {
                        if (!App.game.farming.unlockedBerries[berryType]())
                        {
                            return true;
                        }

                        let totalCount = App.game.farming.berryList[berryType]() + this.__internal__getPlantedBerriesCount(berryType);
                        return (totalCount < minimumRequiredBerry);
                    }.bind(this),
                berryToUnlock: berryType,
                harvestStrategy: this.__internal__harvestTimingType.RightBeforeWithering,
                oakItemToEquip: oakItemNeeded,
                forbiddenOakItems: oakItemsToRemove,
                requiredPokemon: requiredPokemonName,
                requiresDiscord: false
            };

        this.__internal__setSlotConfigStrategy(step, berriesIndexes);
        this.__internal__unlockStrategySelection.push(step);
    }

    /**
     * @brief Adds an unlock strategy that requires a certain amount of berry before proceeding any further
     *
     * @param berriesMinAmount: The minimum amount that is required for each berry
     * @param berriesToGather: The types of berry the player must have
     */
    static __internal__addBerryRequirementBeforeFurtherUnlockStrategy(berriesMinAmount, berriesToGather)
    {
        this.__internal__unlockStrategySelection.push(
            {
                // Check if all berries are in sufficient amount
                isNeeded: function()
                {
                    return !berriesToGather.every(
                        (berryType) =>
                        {
                            let alreadyPlantedCount = Automation.Farm.__internal__getPlantedBerriesCount(berryType);
                            let berryHarvestAmount = App.game.farming.berryData[berryType].harvestAmount;

                            return (App.game.farming.berryList[berryType]() >= (berriesMinAmount - (alreadyPlantedCount * berryHarvestAmount)))
                        });
                },
                harvestStrategy: this.__internal__harvestTimingType.AsSoonAsPossible,
                oakItemToEquip: null,
                forbiddenOakItems: [],
                requiredPokemon: null,
                requiresDiscord: false,
                // If not, then farm some needed berries
                action: function()
                {
                    let plotIndex = 0;
                    for (const berryType of berriesToGather)
                    {
                        if (!App.game.farming.hasBerry(berryType))
                        {
                            continue;
                        }

                        let neededAmount = (berriesMinAmount - App.game.farming.berryList[berryType]());
                        let berryHarvestAmount = App.game.farming.berryData[berryType].harvestAmount;

                        let alreadyPlantedCount = this.__internal__getPlantedBerriesCount(berryType);
                        neededAmount -= (alreadyPlantedCount * berryHarvestAmount);

                        while ((neededAmount > 0) && (plotIndex <= 24) && App.game.farming.hasBerry(berryType))
                        {
                            if (App.game.farming.plotList[plotIndex].isUnlocked
                                && App.game.farming.plotList[plotIndex].isEmpty())
                            {
                                App.game.farming.plant(plotIndex, berryType, true);

                                // Subtract the harvest amount (-1 for the planted berry)
                                neededAmount -= (berryHarvestAmount - 1);
                            }
                            plotIndex++;
                        }

                        if (plotIndex > 24)
                        {
                            break;
                        }
                    }

                    // If no more berries are needed, plant Cheris on the remaining plots
                    FarmController.selectedBerry(BerryType.Cheri);
                    Automation.Farm.__internal__plantAllBerries();
                }.bind(this)
            });
    }

    /**
     * @brief Chooses the next unlock strategy based on the current farming state
     */
    static __internal__chooseUnlockStrategy()
    {
        this.__internal__currentStrategy = null;

        for (const strategy of this.__internal__unlockStrategySelection)
        {
            if (strategy.isNeeded())
            {
                this.__internal__currentStrategy = strategy;
                break;
            }
        }

        // If no strategy can be found, turn off the feature and disable the button
        if (this.__internal__currentStrategy === null)
        {
            this.__internal__disableAutoUnlock("No more automated unlock possible");
            Automation.Utils.sendWarningNotif("No more automated unlock possible.\nDisabling the 'Auto unlock' feature", "Farming");
            return;
        }

        this.__internal__checkOakItemRequirement();
        this.__internal__checkPokemonRequirement();
        this.__internal__checkDiscordLinkRequirement();
    }

    /**
     * @brief If the new strategy requires an Oak item that the player does not have, turn off the feature and disable the button
     */
    static __internal__checkOakItemRequirement()
    {
        if (this.__internal__currentStrategy.oakItemToEquip === null)
        {
            return;
        }

        let oakItem = App.game.oakItems.itemList[this.__internal__currentStrategy.oakItemToEquip];

        if ((Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) !== "true")
            && !oakItem.isActive)
        {
            this.__internal__disableAutoUnlock("The next unlock requires the '" + oakItem.displayName + "' Oak item\n"
                                             + "and loadout auto-update was disabled.\n"
                                             + "You can either equip it manually or turn auto-equip back on.");

            // Set a watcher to re-enable the feature once the item is equipped or the option was re-enabled
            let watcher = setInterval(function()
                {
                    if ((Automation.Utils.LocalStorage.getValue(this.Settings.OakItemLoadoutUpdate) === "true")
                        || App.game.oakItems.itemList[this.__internal__currentStrategy.oakItemToEquip].isActive)
                    {
                        Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                        clearInterval(watcher);
                    }
                }.bind(this), 5000); // Check every 5s

            return;
        }

        if (oakItem.isUnlocked())
        {
            return;
        }

        this.__internal__disableAutoUnlock("The '" + oakItem.displayName + "' Oak item is required for the next unlock");

        // Set a watcher to re-enable the feature once the item is unlocked
        let watcher = setInterval(function()
            {
                if (App.game.oakItems.itemList[this.__internal__currentStrategy.oakItemToEquip].isUnlocked())
                {
                    Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                    clearInterval(watcher);
                }
            }.bind(this), 5000); // Check every 5s
    }

    /**
     * @brief If the new strategy requires a pokemon that the player does not have, turn off the feature and disable the button
     */
    static __internal__checkPokemonRequirement()
    {
        if (this.__internal__currentStrategy.requiredPokemon === null)
        {
            return;
        }

        // Check if the needed pokemon was caught
        let neededPokemonId = PokemonHelper.getPokemonByName(this.__internal__currentStrategy.requiredPokemon).id;
        if (App.game.statistics.pokemonCaptured[neededPokemonId]() !== 0)
        {
            return;
        }

        this.__internal__disableAutoUnlock("You need to catch " + this.__internal__currentStrategy.requiredPokemon
                                         + " (#" + neededPokemonId.toString() + ") for the next unlock");

        // Set a watcher to re-enable the feature once the pokemon has been caught
        let watcher = setInterval(function()
            {
                if (App.game.statistics.pokemonCaptured[neededPokemonId]() !== 0)
                {
                    Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                    clearInterval(watcher);
                }
            }.bind(this), 5000); // Check every 5s
    }

    /**
     * @brief If the new strategy requires a linked discord account and it's not the case, turn off the feature and disable the button
     */
    static __internal__checkDiscordLinkRequirement()
    {
        if (!this.__internal__currentStrategy.requiresDiscord)
        {
            return;
        }

        // Check if the discord is linked and all hints are gathered
        if (App.game.discord.ID() !== null)
        {
            let enigmaMutation = App.game.farming.mutations.filter((mutation) => mutation instanceof EnigmaMutation)[0];

            if (enigmaMutation.hintsSeen.every((seen) => seen()))
            {
                return;
            }

            this.__internal__disableAutoUnlock("You need to collect the four hints from the Kanto Berry Master\n"
                                             + "for the next unlock. He's located in Cerulean City.");
        }
        else
        {
            this.__internal__disableAutoUnlock("A linked discord account is needed for the next unlock.");
        }

        // Set a watcher to re-enable the feature once the pokemon has been caught
        let watcher = setInterval(function()
            {
                if (App.game.discord.ID() === null)
                {
                    return;
                }

                let enigmaMutation = App.game.farming.mutations.filter((mutation) => mutation instanceof EnigmaMutation)[0];

                if (enigmaMutation.hintsSeen.every((seen) => seen()))
                {
                    Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, false);
                    clearInterval(watcher);
                }
            }.bind(this), 5000); // Check every 5s
    }

    /**
     * @brief Gets the planted count for the given @p berryType
     *
     * @param berryType: The type of the berry
     *
     * @returns The number of planted berries of the given type
     */
    static __internal__getPlantedBerriesCount(berryType)
    {
        return App.game.farming.plotList.reduce((count, plot) => count + ((plot.berryData && (plot.berry == berryType)) ? 1 : 0), 0);
    }

    /**
     * @brief Disables the 'Auto unlock' button
     *
     * @param reason: The reason for disabling the button to display in the tooltip
     */
    static __internal__disableAutoUnlock(reason)
    {
        // TODO (06/08/2022): Don't turn the feature off in most cases
        Automation.Menu.forceAutomationState(this.Settings.FocusOnUnlocks, false);
        Automation.Menu.setButtonDisabledState(this.Settings.FocusOnUnlocks, true, reason);
        Automation.Utils.OakItem.ForbiddenItems = [];
    }

    /**
     * @brief Sends the Farming automation notification, if at least a berry was harvested
     *
     * @param {string} details: The extra-message to display
     */
    static __internal__sendNotif(details)
    {
        if (this.__internal__plantedBerryCount > 0)
        {
            Automation.Utils.sendNotif("Harvested " + this.__internal__harvestCount.toString() + " berries<br>" + details, "Farming");
        }
    }

    /**
     * @brief Removes any unwanted berry from the plot at the given @p index
     *
     * @param {number} index: The index of the plot to clean
     * @param expectedBerryType: The expected berry type, any other type would be cleaned
     *
     * @returns False if the plot still contains an unwanted berry, true otherwise
     */
    static __internal__removeAnyUnwantedBerry(index, expectedBerryType)
    {
        let plot = App.game.farming.plotList[index];

        if (!plot.isUnlocked)
        {
            return false;
        }

        if (!plot.isEmpty())
        {
            // TODO (02/08/2022): We should add an option to use shovels in such case
            if ((plot.berry !== expectedBerryType) && (plot.stage() == PlotStage.Berry))
            {
                this.__internal__harvestCount++;
                App.game.farming.harvest(index);
                return true;
            }
            else
            {
                return false
            }
        }

        return true;
    }

    /**
     * @brief Sets the action callback of the provided @p step, according to @p berriesIndexes
     *
     * @note The strategy wont start if any plot needed is already occupied by another berry,
     *       or an unneeded slot contains a berry riping after the longest berry of the strategy
     *
     * @param step: The step to set the action callback to
     * @param berriesIndexes: The berries to plant and their indexes ({ <berryType>: [ indexes... ], ... })
     */
    static __internal__setSlotConfigStrategy(step, berriesIndexes)
    {
        // Sort berries from longer riping time to shorter
        // We need to use parseInt here to convert the object key from string to int
        let berriesOrder = [...Object.keys(berriesIndexes)].map(x => parseInt(x)).sort(
            (a, b) => App.game.farming.berryData[b].growthTime[PlotStage.Bloom] - App.game.farming.berryData[a].growthTime[PlotStage.Bloom]);

        // Compute config representation
        let config = new Array(App.game.farming.plotList.length).fill(BerryType.None);
        for (const berryType of berriesOrder)
        {
            for (const index of berriesIndexes[berryType])
            {
                config[index] = berryType;
            }
        }

        // Register the callback
        step.action = function()
        {
            // Remove any mutation that might have occured, as soon as possible
            for (const [ index, berryType ] of config.entries())
            {
                this.__internal__removeAnyUnwantedBerry(index, berryType);
            }

            // Compute Bloom target time
            let firstBerryType = berriesOrder[0];
            let firstBerryBloomDuration = App.game.farming.berryData[firstBerryType].growthTime[PlotStage.Bloom];
            let bloomTarget = firstBerryBloomDuration;
            for (const index of berriesIndexes[firstBerryType])
            {
                let plot = App.game.farming.plotList[index];

                if (!plot.isEmpty() && (plot.berry === firstBerryType))
                {
                    // Sync with the one with the lowest remaining time
                    let remainingTime = firstBerryBloomDuration - plot.age;
                    if (remainingTime < bloomTarget)
                    {
                        bloomTarget = remainingTime;
                    }
                }
            }

            // Don't start the strategy if any plot is occupied with an unwanted berry
            let waitBeforeStartingStrategy = false;
            for (const [ index, plot ] of App.game.farming.plotList.entries())
            {
                let expectedBerryType = config[index];
                if (plot.isEmpty())
                {
                    continue;
                }

                // Any berry that is not part of the strategy should be removed before proceeding
                if (plot.berry !== expectedBerryType)
                {
                    if (expectedBerryType === BerryType.None)
                    {
                        let berryBloomDuration = App.game.farming.berryData[plot.berry].growthTime[PlotStage.Bloom] - plot.age;
                        if (berryBloomDuration <= bloomTarget)
                        {
                            // Berries that would bloom before any of the strategy's berries are not a problem
                            continue;
                        }
                    }
                    else
                    {
                        let berryBloomDuration = App.game.farming.berryData[plot.berry].growthTime[PlotStage.Bloom] - plot.age;
                        let expectedBerryTime = App.game.farming.berryData[expectedBerryType].growthTime[PlotStage.Bloom];
                        if (berryBloomDuration <= (bloomTarget - expectedBerryTime))
                        {
                            // Berries that would bloom before the plot is required by the strategy are not a problem
                            continue;
                        }
                    }

                    waitBeforeStartingStrategy = true;
                }
            }

            if (waitBeforeStartingStrategy)
            {
                return;
            }

            // Plant berries, if the conditions are met
            for (const berryType of berriesOrder)
            {
                let currentBerryBloomDuration = App.game.farming.berryData[berryType].growthTime[PlotStage.Bloom];

                // Wait to sync riping
                if (currentBerryBloomDuration < bloomTarget)
                {
                    break;
                }

                for (const index of berriesIndexes[berryType])
                {
                    this.__internal__tryPlantBerryAtIndex(index, berryType, false);
                }
            }
        }.bind(this);
    }
}
