/**
 * @class The AutomationFocusQuest regroups the 'Focus on' button's 'Quests' functionalities
 *
 * @note The quest feature is not accessible right away when starting a new game.
 *       This focus topic will be hidden until the functionality is unlocked in-game.
 */
class AutomationFocusQuests
{
    /******************************************************************************\
    |***    Focus-specific members, should only be used by focus sub-classes    ***|
    \******************************************************************************/

    /**
     * @brief Adds the Quests functionality to the 'Focus on' list
     *
     * @param {Array} functionalitiesList: The list to add the functionality to
     */
    static __registerFunctionalities(functionalitiesList)
    {
        functionalitiesList.push(
            {
                id: "Quests",
                name: "Quests",
                tooltip: "Automatically adds and completes quests"
                       + Automation.Menu.TooltipSeparator
                       + "This mode fully automates quest completion\n"
                       + "It automatically equips Oak items and balls\n"
                       + "It automatically moves to the appropriate location\n"
                       + "It automatically attacks, starts gym and enters dungeons"
                       + Automation.Menu.TooltipSeparator
                       + "Most modes are disabled while this is enabled\n"
                       + "as it will take over control of those modes"
                       + Automation.Menu.TooltipSeparator
                       + "⚠️ You will hardly be able to manually play with this mode enabled",
                run: function() { this.__internal__start(); }.bind(this),
                stop: function() { this.__internal__stop(); }.bind(this),
                isUnlocked: function() { return App.game.quests.isDailyQuestsUnlocked(); },
                refreshRateAsMs: Automation.Focus.__noFunctionalityRefresh
            });
    }

    /**
     * @brief Builds the 'Focus on Quests' advanced settings tab, and initializes internal data
     *
     * @param {Element} parent: The parent div to add the settings to
     */
    static __buildAdvancedSettings(parent)
    {
        this.__internal__initializeQuestData();
        this.__internal__buildAdvancedSettings(parent);
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__autoQuestLoop = null;
    static __internal__questLabels = {};

    static __internal__advancedSettings = {
                                              QuestEnabled: function(questName) { return `Focus-${questName}-Enabled`; }
                                          };

    /**
     * @brief Initializes the internal quest data
     */
    static __internal__initializeQuestData()
    {
        this.__internal__questLabels["DefeatPokemonsQuest"] = "Defeat <n> Pokémon on <Route>.";
        this.__internal__questLabels["CapturePokemonsQuest"] = "Capture or hatch <n> Pokémon.";
        this.__internal__questLabels["CapturePokemonTypesQuest"] = "Capture or hatch <n> <Type> Pokémon.";
        this.__internal__questLabels["ClearBattleFrontierQuest"] = "Clear <n> Stages in the Battle Frontier.";
        this.__internal__questLabels["GainFarmPointsQuest"] = "Gain <n> Farm Points.";
        this.__internal__questLabels["GainMoneyQuest"] = "Gain <n> Pokédollars.";
        this.__internal__questLabels["GainTokensQuest"] = "Gain <n> Dungeon Tokens.";
        this.__internal__questLabels["GainGemsQuest"] = "Gain <n> <Type> gems.";
        this.__internal__questLabels["HatchEggsQuest"] = "Hatch <n> Eggs.";
        this.__internal__questLabels["MineLayersQuest"] = "Mine <n> layer in the Underground.";
        this.__internal__questLabels["MineItemsQuest"] = "Mine <n> item in the Underground.";
        this.__internal__questLabels["CatchShiniesQuest"] = "Catch 1 shiny Pokémon.";
        this.__internal__questLabels["CatchShadowsQuest"] = "Catch <n> Shadow Pokémon.";
        this.__internal__questLabels["DefeatGymQuest"] = "Defeat <Gym leader> <n> times.";
        this.__internal__questLabels["DefeatDungeonQuest"] = "Defeat the <Dungeon name> dungeon in <Region> <n> times.";
        this.__internal__questLabels["UsePokeballQuest"] = "Use <n> <Balls type>.";
        this.__internal__questLabels["UseOakItemQuest"] = "Equip the <Oak item> and <Action>.";
        this.__internal__questLabels["HarvestBerriesQuest"] = "Harvest <n> <Berry type> Berries at the farm.";

        // Generate default descriptions for any unknown quest
        for (const quest in QuestHelper.quests)
        {
            if (!this.__internal__questLabels[quest])
            {
                let questClass = QuestHelper.quests[quest];
                let args = questClass.generateData();
                let questInstance = new questClass(...args);
                this.__internal__questLabels[quest] = questInstance.description;
            }
        }
    }

    /**
     * @brief Builds the 'Focus on Quests' advanced settings tab
     *
     * @param {Element} parent: The parent div to add the settings to
     */
    static __internal__buildAdvancedSettings(parent)
    {
        const tooltip = "Skipping quests can be cost-heavy"
        const descriptionElem = document.createElement("span");
        descriptionElem.textContent = "Choose which quest should be performed, or skipped ⚠️";
        descriptionElem.classList.add("hasAutomationTooltip");
        descriptionElem.classList.add("rightMostAutomationTooltip");
        descriptionElem.classList.add("shortTransitionAutomationTooltip");
        descriptionElem.style.cursor = "help";
        descriptionElem.setAttribute("automation-tooltip-text", tooltip);
        parent.appendChild(descriptionElem);

        const tableContainer = document.createElement("div");
        tableContainer.classList.add("automationTabSubContent");
        parent.appendChild(tableContainer);

        const tableElem = document.createElement("table");
        tableElem.style.width = "100%";
        tableContainer.appendChild(tableElem);

        for (const quest in QuestHelper.quests)
        {
            const rowElem = document.createElement("tr");
            tableElem.appendChild(rowElem);

            const labelCellElem = document.createElement("td");
            labelCellElem.style.width = "100%"; // Make the cell take the maximum place, for menu consistency
            labelCellElem.style.paddingLeft = "5px";
            labelCellElem.style.paddingRight = "7px";
            let label = this.__internal__questLabels[quest];
            label = label.replaceAll(/<([^>]+)>/g, "<i>&lt;$1&gt;</i>").replace(/.$/, "");
            labelCellElem.innerHTML = label;
            rowElem.appendChild(labelCellElem);

            const toggleCellElem = document.createElement("td");
            toggleCellElem.style.paddingRight = "5px"; // Align toggle with ones outside the sub-content div
            rowElem.appendChild(toggleCellElem);

            const storageKey = this.__internal__advancedSettings.QuestEnabled(quest);
            // Enable the quest by default, unless the user chose to disable settings by default
            Automation.Utils.LocalStorage.setDefaultValue(storageKey, !Automation.Menu.DisableSettingsByDefault);

            const toggleButton = Automation.Menu.addLocalStorageBoundToggleButton(storageKey);
            toggleCellElem.appendChild(toggleButton);

            if ((quest == "GainFarmPointsQuest") || (quest == "HarvestBerriesQuest"))
            {
                // Every time the status of the farming quests changes, we need to refresh the farming takeover
                toggleButton.addEventListener("click", this.__internal__takeOverFarmIfNeeded.bind(this), false);
            }
        }
    }

    /**
     * @brief Starts the quests automation
     */
    static __internal__start()
    {
        // Only set a loop if there is none active
        if (this.__internal__autoQuestLoop === null)
        {
            // Disable other modes button
            const disableReason = "The 'Focus on Quests' feature is enabled";
            Automation.Menu.setButtonDisabledState(Automation.Click.Settings.FeatureEnabled, true, disableReason);
            Automation.Menu.setButtonDisabledState(Automation.Hatchery.Settings.FeatureEnabled, true, disableReason);
            Automation.Menu.setButtonDisabledState(Automation.Underground.Settings.FeatureEnabled, true, disableReason);

            this.__internal__takeOverFarmIfNeeded();

            // Force enable other modes
            Automation.Click.toggleAutoClick(true);
            Automation.Hatchery.toggleAutoHatchery(true);
            Automation.Underground.toggleAutoMining(true);

            // Set auto-quest loop
            this.__internal__autoQuestLoop = setInterval(this.__internal__questLoop.bind(this), 1000); // Runs every second
            this.__internal__questLoop();
        }
    }

    /**
     * @brief Takes over the farming automation, only if any farming quest is enabled
     */
    static __internal__takeOverFarmIfNeeded()
    {
        if ((Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.QuestEnabled("GainFarmPointsQuest")) == "true")
            || (Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.QuestEnabled("HarvestBerriesQuest")) == "true"))
        {
            const disableReason = "The 'Focus on Quests' feature is enabled,\nand farming quests are enabled";
            Automation.Menu.setButtonDisabledState(Automation.Farm.Settings.FeatureEnabled, true, disableReason);
            Automation.Menu.setButtonDisabledState(Automation.Farm.Settings.FocusOnUnlocks, true, disableReason);

            // Select cheri berry to avoid long riping time
            Automation.Farm.ForcePlantBerriesAsked = BerryType.Cheri;

            Automation.Farm.toggleAutoFarming(true);
        }
        else
        {
            // Reset farming automation user-selected state
            Automation.Farm.toggleAutoFarming();

            Automation.Farm.ForcePlantBerriesAsked = null;
            Automation.Menu.setButtonDisabledState(Automation.Farm.Settings.FeatureEnabled, false);
            Automation.Menu.setButtonDisabledState(Automation.Farm.Settings.FocusOnUnlocks, false);
        }
    }

    /**
     * @brief Stops the quests automation
     */
    static __internal__stop()
    {
        // Unregister the loop
        clearInterval(this.__internal__autoQuestLoop);
        this.__internal__autoQuestLoop = null;

        // Reset demands
        Automation.Farm.ForcePlantBerriesAsked = null;
        Automation.Dungeon.stopAfterThisRun();

        // Reset other modes status
        Automation.Click.toggleAutoClick();
        Automation.Hatchery.toggleAutoHatchery();
        Automation.Farm.toggleAutoFarming();
        Automation.Underground.toggleAutoMining();

        // Stop any gym auto-fight
        Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, false);

        // Stop any Battle Frontier fight
        Automation.BattleFrontier.ForceStop();

        // Re-enable other modes button
        Automation.Menu.setButtonDisabledState(Automation.Click.Settings.FeatureEnabled, false);
        Automation.Menu.setButtonDisabledState(Automation.Hatchery.Settings.FeatureEnabled, false);
        Automation.Menu.setButtonDisabledState(Automation.Farm.Settings.FeatureEnabled, false);
        Automation.Menu.setButtonDisabledState(Automation.Farm.Settings.FocusOnUnlocks, false);
        Automation.Menu.setButtonDisabledState(Automation.Underground.Settings.FeatureEnabled, false);

        // Disable automation catch filter
        Automation.Utils.Pokeball.disableAutomationFilter();
    }

    /**
     * @brief The Daily Quest loop
     *
     * Automatically chooses new quests if needed.
     * Automatically claims completed quests.
     * Chooses the next quest to work on.
     */
    static __internal__questLoop()
    {
        this.__internal__claimCompletedQuests();
        this.__internal__selectNewQuests();

        const filteredQuests = this.__internal__getFilteredCurrentQuests();

        // Skip any unwanted quest
        if (filteredQuests.length == 0)
        {
            // Stop any running Battle Frontier instance
            if (App.game.gameState == GameConstants.GameState.battleFrontier)
            {
                Automation.BattleFrontier.ForceStop();
            }

            this.__internal__skipRemainingQuests();
        }
        else
        {
            this.__internal__workOnQuest(filteredQuests);
            this.__internal__workOnBackgroundQuests();
        }
    }

    /**
     * @brief Claims any completed quest reward
     */
    static __internal__claimCompletedQuests()
    {
        for (const [ index, quest ] of App.game.quests.questList().entries())
        {
            if (quest.isCompleted() && !quest.claimed())
            {
                App.game.quests.claimQuest(index);
            }
        }
    }

    /**
     * @brief Chooses new quests to perform
     *
     * @see __internal__sortQuestByPriority for the quest selection strategy
     */
    static __internal__selectNewQuests()
    {
        if (!App.game.quests.canStartNewQuest())
        {
            return;
        }

        // Only consider quests that:
        //   - Are not already completed
        //   - Are not already in progress
        //   - Are not disabled by the user
        let availableQuests = App.game.quests.questList().filter(
            quest =>
            {
                return (!quest.isCompleted()
                        && !quest.inProgress()
                        && (Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.QuestEnabled(quest.constructor.name)) == "true"));
            }, this);

        // Sort quest to group the same type together
        availableQuests.sort(this.__internal__sortQuestByPriority, this);

        for (const quest of availableQuests)
        {
            if (App.game.quests.canStartNewQuest())
            {
                quest.begin();
            }
        }
    }

    /**
     * @brief Skips the remaining quest, if they were skipped by the user
     */
    static __internal__skipRemainingQuests()
    {
        // Make sure some quests were not completed (ie. excluded ones)
        let availableQuests = App.game.quests.questList().filter(
            (_, index) =>
            {
                let quest = App.game.quests.questList()[index];
                return (!quest.isCompleted()
                        && !quest.inProgress());
            });
        if (availableQuests.length == 0)
        {
            return;
        }

        // Make sure the player can afford the refresh
        if (!App.game.quests.freeRefresh() && !App.game.quests.canAffordRefresh())
        {
            // Go farm some money
            this.__internal__farmSomeMoney();
            return;
        }

        let pokedollarsImage = '<img src="assets/images/currency/money.svg" height="25px">';
        let refreshCost = App.game.quests.freeRefresh() ? "free" : `${App.game.quests.getRefreshCost().amount} ${pokedollarsImage}`;

        App.game.quests.refreshQuests();

        Automation.Notifications.sendNotif(`Skipped disabled quests for ${refreshCost}`, "Focus", "Quests");
    }

    /**
     * @brief Works on the most efficient quest available.
     *
     * @param currentQuests: The currently active quests to process
     */
    static __internal__workOnQuest(currentQuests)
    {
        // Already fighting, nothing to do for now
        if ((App.game.gameState != GameConstants.GameState.battleFrontier) && Automation.Utils.isInInstanceState())
        {
            Automation.Dungeon.stopAfterThisRun();
            return;
        }

        // Sort quest to work on the most relevant one
        currentQuests.sort(this.__internal__sortQuestByPriority, this);

        // Filter the quests that do not need specific action
        const filteredQuests = currentQuests.filter(
            (quest) =>
            {
                return !(Automation.Utils.isInstanceOf(quest, "CatchShiniesQuest")
                         || Automation.Utils.isInstanceOf(quest, "GainMoneyQuest")
                         || Automation.Utils.isInstanceOf(quest, "GainFarmPointsQuest")
                         || Automation.Utils.isInstanceOf(quest, "HarvestBerriesQuest")
                         || Automation.Utils.isInstanceOf(quest, "MineItemsQuest")
                         || Automation.Utils.isInstanceOf(quest, "MineLayersQuest"));
            });

        const quest = filteredQuests[0];

        if (Automation.Utils.isInstanceOf(quest, "ClearBattleFrontierQuest"))
        {
            this.__internal__workOnClearBattleFrontierQuest();
            return;
        }
        else if (App.game.gameState == GameConstants.GameState.battleFrontier)
        {
            // Cleanup battle frontier, if needed
            Automation.BattleFrontier.ForceStop();
            return;
        }

        // Defeat gym quest
        if (Automation.Utils.isInstanceOf(quest, "CapturePokemonsQuest")
            || Automation.Utils.isInstanceOf(quest, "GainTokensQuest"))
        {
            const selectedPokeball = parseInt(Automation.Utils.LocalStorage.getValue(Automation.Focus.Settings.BallToUseToCatch));
            this.__internal__workOnUsePokeballQuest(selectedPokeball);
        }
        else if (Automation.Utils.isInstanceOf(quest, "CapturePokemonTypesQuest"))
        {
            this.__internal__workOnCapturePokemonTypesQuest(quest);
        }
        else if (Automation.Utils.isInstanceOf(quest, "CatchShadowsQuest"))
        {
            // Use the 1st available dungeon with shadow pokémons for now
            const dungeonName = "Phenac City Battles";
            this.__internal__workOnDefeatDungeonQuest(dungeonName, true);
        }
        else if (Automation.Utils.isInstanceOf(quest, "DefeatDungeonQuest"))
        {
            const catchShadows = currentQuests.some((quest) => Automation.Utils.isInstanceOf(quest, "CatchShadowsQuest"))
                              && Automation.Dungeon.hasShadowPokemons(quest.dungeon);
            this.__internal__workOnDefeatDungeonQuest(quest.dungeon, catchShadows);
        }
        else if (Automation.Utils.isInstanceOf(quest, "DefeatGymQuest"))
        {
            this.__internal__workOnDefeatGymQuest(quest);
        }
        else if (Automation.Utils.isInstanceOf(quest, "DefeatPokemonsQuest"))
        {
            this.__internal__workOnDefeatPokemonsQuest(quest);
        }
        else if (Automation.Utils.isInstanceOf(quest, "GainGemsQuest"))
        {
            this.__internal__workOnGainGemsQuest(quest);
        }
        else if (Automation.Utils.isInstanceOf(quest, "UseOakItemQuest"))
        {
            this.__internal__workOnUseOakItemQuest(quest);
        }
        else if (Automation.Utils.isInstanceOf(quest, "UsePokeballQuest"))
        {
            this.__internal__workOnUsePokeballQuest(quest.pokeball, true);
        }
        else // Other type of quest don't need much
        {
            // Disable automation catch filter
            Automation.Utils.Pokeball.disableAutomationFilter();

            if (currentQuests.some((quest) => Automation.Utils.isInstanceOf(quest, "CatchShiniesQuest")))
            {
                // Buy some ball to be prepared
                const selectedPokeball = parseInt(Automation.Utils.LocalStorage.getValue(Automation.Focus.Settings.BallToUseToCatch));
                this.__internal__tryBuyBallIfUnderThreshold(selectedPokeball, 10);
                this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);
            }
            else if (currentQuests.some((quest) => Automation.Utils.isInstanceOf(quest, "GainMoneyQuest")))
            {
                this.__internal__farmSomeMoney();
                return;
            }
            else
            {
                this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonExp);
            }

            Automation.Utils.Route.moveToBestRouteForExp();
        }
    }

    /**
     * @brief Equips the Money loadout and move to the best place to farm money
     */
    static __internal__farmSomeMoney()
    {
        this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.Money);

        const bestGym = Automation.Utils.Gym.findBestGymForMoney();
        if (bestGym.bestGymTown !== null)
        {
            Automation.Utils.Route.moveToTown(bestGym.bestGymTown);
            Automation.Focus.__enableAutoGymFight(bestGym.bestGym);
            return;
        }

        Automation.Utils.Route.moveToBestRouteForExp();
    }

    /**
     * @brief Performs action related to quests that can be done while other quests are being worked on.
     *
     * For example, planting some crops, or restoring energy for the mine [if enabled].
     */
    static __internal__workOnBackgroundQuests()
    {
        let currentQuests = this.__internal__getFilteredCurrentQuests();

        let isFarmingSpecificBerry = false;

        // Filter the quests that do not need specific action
        for (const quest of currentQuests)
        {
            if (Automation.Utils.isInstanceOf(quest, "HarvestBerriesQuest"))
            {
                Automation.Farm.ForcePlantBerriesAsked = quest.berryType;
                isFarmingSpecificBerry = true;
            }
            else if (Automation.Utils.isInstanceOf(quest, "GainFarmPointsQuest")
                     && !isFarmingSpecificBerry)
            {
                const bestBerry = this.__internal__getMostSuitableBerryForQuest(quest);
                Automation.Farm.ForcePlantBerriesAsked = bestBerry;
            }
        }
    }

    /**
     * @brief Works on a CapturePokemonTypesQuest.
     *
     * It will equip balls to catch any pokemon matching the quest type
     * and move to the most efficient route for the quest requested pokemon type.
     *
     * @param quest: The game's quest object
     */
    static __internal__workOnCapturePokemonTypesQuest(quest)
    {
        // Add a pokeball to the Caught type and set the PokemonCatch setup
        const selectedPokeball = parseInt(Automation.Utils.LocalStorage.getValue(Automation.Focus.Settings.BallToUseToCatch));
        const hasBalls = this.__internal__trySelectBallToCatch(selectedPokeball);

        if (hasBalls)
        {
            Automation.Utils.Pokeball.restrictCaptureToPokemonType(quest.type);

            this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);
            const bestRoute = Automation.Utils.Route.findBestRouteForFarmingType(quest.type);
            Automation.Utils.Route.moveToRoute(bestRoute.Route, bestRoute.Region);
        }
    }

    /**
     * @brief Works on a quest requiring to clear Battle Frontier battles.
     */
    static __internal__workOnClearBattleFrontierQuest()
    {
        if (BattleFrontierRunner.started())
        {
            // Nothing else to do
            return;
        }

        // Move to Battle Frontier town if not already there
        const battleFrontierTownName = "Battle Frontier";
        if (!Automation.Utils.Route.isPlayerInTown(battleFrontierTownName))
        {
            Automation.Utils.Route.moveToTown(battleFrontierTownName);
        }

        // Enter Battle Frontier
        if (App.game.gameState != GameConstants.GameState.battleFrontier)
        {
            App.game.battleFrontier.enter();

            // Let a tick for the menu to show up
            return;
        }

        // Start the automation
        Automation.Menu.forceAutomationState(Automation.BattleFrontier.Settings.FeatureEnabled, true);
    }

    /**
     * @brief Works on a DefeatDungeonQuest.
     *
     * If the player does not have enough dungeon token to enter the dungeon, some balls are equipped
     * and the player is moved to the best road to farm some token.
     * Otherwise, the player is moved to the quest requested location, and the Auto Dungeon feature is enabled
     *
     * @see AutomationDungeon class
     *
     * @param  {string} dungeonName: The name of the dungeon to defeat
     * @param {boolean} catchShadows: Set to true if the shadow pokémon catch filter needs to be set, false otherwise
     */
    static __internal__workOnDefeatDungeonQuest(dungeonName, catchShadows)
    {
        const selectedPokeball = parseInt(Automation.Utils.LocalStorage.getValue(Automation.Focus.Settings.BallToUseToCatch));

        // If we don't have enough tokens, go farm some
        if (TownList[dungeonName].dungeon.tokenCost > App.game.wallet.currencies[GameConstants.Currency.dungeonToken]())
        {
            this.__internal__workOnUsePokeballQuest(selectedPokeball);
            return;
        }

        if (catchShadows)
        {
            this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);
            Automation.Utils.Pokeball.catchEverythingWith(selectedPokeball);
            Automation.Utils.Pokeball.restrictCaptureToShadow(true);
            Automation.Utils.Pokeball.enableAutomationFilter();
        }
        else
        {
            // Disable automation catch filter
            Automation.Utils.Pokeball.disableAutomationFilter();
        }

        // Move to dungeon if needed
        if (!Automation.Utils.Route.isPlayerInTown(dungeonName))
        {
            Automation.Utils.Route.moveToTown(dungeonName);

            // Let a tick for the menu to show up
            return;
        }

        // Enable auto dungeon fight
        Automation.Menu.forceAutomationState(Automation.Dungeon.Settings.FeatureEnabled, true);

        // Bypass user settings like the stop on pokedex one
        Automation.Dungeon.AutomationRequestedMode = (catchShadows) ? Automation.Dungeon.InternalModes.ForcePokemonFight
                                                                    : Automation.Dungeon.InternalModes.ForceDungeonCompletion;
    }

    /**
     * @brief Works on a DefeatGymQuest.
     *
     * The player is moved to the quest requested location, and the Auto Gym Fight feature is enabled
     *
     * @see AutomationGym class
     *
     * @param quest: The game's quest object
     */
    static __internal__workOnDefeatGymQuest(quest)
    {
        let townToGoTo = quest.gymTown;

        // If a ligue champion is the target, the gymTown points to the champion instead of the town
        if (!TownList[townToGoTo])
        {
            townToGoTo = GymList[townToGoTo].parent.name;
        }

        // Move to the associated gym town if needed
        if (!Automation.Utils.Route.isPlayerInTown(townToGoTo))
        {
            Automation.Utils.Route.moveToTown(townToGoTo);
        }
        // Select the right gym to fight
        else if (Automation.Gym.GymSelectElem.value != quest.gymTown)
        {
            Automation.Gym.GymSelectElem.value = quest.gymTown;
        }
        // Enable gym auto-fight feature if not already done
        else if (Automation.Utils.LocalStorage.getValue(Automation.Gym.Settings.FeatureEnabled) === "false")
        {
            Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, true);
        }
    }

    /**
     * @brief Works on a DefeatPokemonsQuest.
     *
     * The player is moved to the best pokemon farming route to defeat pokemons
     *
     * @param quest: The game's quest object
     */
    static __internal__workOnDefeatPokemonsQuest(quest)
    {
        // Use the user's default setting, if no other quest requires pokéball
        Automation.Utils.Pokeball.disableAutomationFilter();

        this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

        Automation.Utils.Route.moveToRoute(quest.route, quest.region);
    }

    /**
     * @brief Works on a GainGemsQuest.
     *
     * The player is moved to the best route to defeat the quest requested type pokemons
     *
     * @param quest: The game's quest object
     */
    static __internal__workOnGainGemsQuest(quest)
    {
        // Use the user's default setting, if no other quest requires pokéball
        Automation.Utils.Pokeball.disableAutomationFilter();

        this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

        Automation.Focus.__goToBestGymOrRouteForGem(quest.type);
    }

    /**
     * @brief Works on a UseOakItemQuest.
     *
     * The quest requested oak item is equipped and the player is moved to the best route to defeat pokemons
     * If the item is the Magic_Ball one, some balls are equipped as well to catch the pokemons
     *
     * @param quest: The game's quest object
     */
    static __internal__workOnUseOakItemQuest(quest)
    {
        if (quest.item == OakItemType.Magic_Ball)
        {
            const selectedPokeball = parseInt(Automation.Utils.LocalStorage.getValue(Automation.Focus.Settings.BallToUseToCatch));
            this.__internal__workOnUsePokeballQuest(selectedPokeball);
        }
        else
        {
            this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

            // Use the user's default setting, if no other quest requires pokéball
            Automation.Utils.Pokeball.disableAutomationFilter();

            // Go kill some pokemon
            Automation.Utils.Route.moveToBestRouteForExp();
        }
    }

    /**
     * @brief Works on a quest requiring to use pokeballs.
     *
     * Some balls are equipped and the player is moved to the best route to catch pokemons.
     *
     * @param ballType: The type of pokeball to use
     * @param enforceType: If set to true, the @p ballType must be used, otherwise lower balls grade are just as fine
     */
    static __internal__workOnUsePokeballQuest(ballType, enforceType = false)
    {
        const hasBalls = this.__internal__trySelectBallToCatch(ballType, enforceType);

        if (hasBalls)
        {
            this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);
            // Go to the highest route, for higher quest point income
            Automation.Utils.Route.moveToHighestDungeonTokenIncomeRoute(ballType);
        }
    }

    /**
     * @brief Tries to choose the most suitable ball to use, based on the user inventory.
     *
     * If the user have the balls available, it be set as the ball to catch
     * If not, if it has enough currency to by some, they will be bought
     * If not, if @p enforceType is set to false, the lower grade pokeball will be considered
     *
     * @param ballTypeToUse: The type of pokeball to use
     * @param enforceType: If set to true, the @p ballType must be used, otherwise lower balls grade are just as fine
     *
     * @returns True if a ball can be used, False otherwise.
     */
    static __internal__trySelectBallToCatch(ballTypeToUse, enforceType = false)
    {
        if (!enforceType)
        {
            // Choose the most optimal pokeball, based on the other quests
            const quest = this.__internal__getFilteredCurrentQuests().find((quest) => Automation.Utils.isInstanceOf(quest, "UsePokeballQuest"));
            if (quest)
            {
                ballTypeToUse = quest.pokeball;
                enforceType = true;
            }
        }

        // Make sure to always have some balls to catch pokemons
        this.__internal__tryBuyBallIfUnderThreshold(ballTypeToUse, 10);

        if (App.game.pokeballs.getBallQuantity(ballTypeToUse) === 0)
        {
            let hasAnyPokeball = false;
            if (!enforceType && (ballTypeToUse <= GameConstants.Pokeball.Ultraball))
            {
                // Look if we can find a ball
                for (let i = ballTypeToUse; i >= 0; i--)
                {
                    if (App.game.pokeballs.pokeballs[i].quantity() > 0)
                    {
                        hasAnyPokeball = true;
                        break;
                    }
                }
            }

            if (!hasAnyPokeball)
            {
                // No more balls, go farm to buy some
                Automation.Utils.Pokeball.disableAutomationFilter();

                Automation.Focus.__equipLoadout(Automation.Utils.OakItem.Setup.Money);

                let bestGym = Automation.Utils.Gym.findBestGymForMoney();

                if (bestGym.bestGymTown === null)
                {
                    Automation.Utils.Route.moveToBestRouteForExp();
                }
                else
                {
                    Automation.Utils.Route.moveToTown(bestGym.bestGymTown);
                    Automation.Focus.__enableAutoGymFight(bestGym.bestGym);
                }

                return false;
            }
        }

        Automation.Utils.Pokeball.catchEverythingWith(ballTypeToUse);
        return true;
    }

    /**
     * @brief Gets the most suitable berry for the given GainFarmPointsQuest
     *
     * Such quest requires to collect a set amount of Farm Points.
     * The most suitable berry is the one that will provide such amount in the shortest time possible.
     *
     * @returns The most suitable berry type
     */
    static __internal__getMostSuitableBerryForQuest(quest)
    {
        let bestTime = Number.MAX_SAFE_INTEGER;
        let bestBerry = 0;

        let availableSlotCount = App.game.farming.plotList.filter((plot) => plot.isUnlocked).length;

        for (const [ index, isUnlocked ] of App.game.farming.unlockedBerries.entries())
        {
            // Don't consider locked berries
            if (!isUnlocked())
            {
                continue;
            }

            let berryData = App.game.farming.berryData[index];

            // Don't consider out-of-stock berries
            if (App.game.farming.berryList[index]() === 0)
            {
                continue;
            }

            let berryTime = (berryData.growthTime[PlotStage.Bloom] * Math.ceil(quest.amount / availableSlotCount / berryData.farmValue));

            // The time can't go below the berry growth time
            let time = Math.max(berryData.growthTime[PlotStage.Bloom], berryTime);
            if (time < bestTime)
            {
                bestTime = time;
                bestBerry = index;
            }
        }

        return bestBerry;
    }

    /**
     * @brief Ties to buy some ball if the player's amount goes under the provided @p amount
     *
     * @param ballType: The type of pokeball to check
     * @param amount: The minimum amount to have in stock at all time
     */
    static __internal__tryBuyBallIfUnderThreshold(ballType, amount)
    {
        // Try to buy some if the quantity is low, and we can afford it
        if (App.game.pokeballs.getBallQuantity(ballType) < amount)
        {
            let ballItem = ItemList[GameConstants.Pokeball[ballType]];
            // Only try to buy balls for money
            if ((ballItem.currency == GameConstants.Currency.money)
                && (ballItem.totalPrice(amount) < App.game.wallet.currencies[ballItem.currency]()))
            {
                ballItem.buy(amount);
            }
        }
    }

    /**
     * @brief The predicate that sorts the quest from the most important one to the least important
     *
     * @param a: The first quest to compare
     * @param a: The second quest to compare
     */
    static __internal__sortQuestByPriority(a, b)
    {
        // Select pokemon catching related quests (starting with the shiny one)
        if (Automation.Utils.isInstanceOf(a, "CatchShiniesQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "CatchShiniesQuest")) return 1;

        if (Automation.Utils.isInstanceOf(a, "CapturePokemonTypesQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "CapturePokemonTypesQuest")) return 1;

        if (Automation.Utils.isInstanceOf(a, "CapturePokemonsQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "CapturePokemonsQuest")) return 1;

        if (Automation.Utils.isInstanceOf(a, "UsePokeballQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "UsePokeballQuest")) return 1;

        if (Automation.Utils.isInstanceOf(a, "GainTokensQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "GainTokensQuest")) return 1;

        // Then quests related to defeating pokemon/opponents
        // (starting with the oak item one, since it can be related to catching)
        if (Automation.Utils.isInstanceOf(a, "UseOakItemQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "UseOakItemQuest")) return 1;

        if (Automation.Utils.isInstanceOf(a, "GainGemsQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "GainGemsQuest")) return 1;

        if (Automation.Utils.isInstanceOf(a, "DefeatDungeonQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "DefeatDungeonQuest")) return 1;

        // Select catch shadow quest after the DefeatDungeonQuest in case said dungeon has shadow pokémons
        if (Automation.Utils.isInstanceOf(a, "CatchShadowsQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "CatchShadowsQuest")) return 1;

        if (Automation.Utils.isInstanceOf(a, "DefeatGymQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "DefeatGymQuest")) return 1;

        if (Automation.Utils.isInstanceOf(a, "DefeatPokemonsQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "DefeatPokemonsQuest")) return 1;

        if (Automation.Utils.isInstanceOf(a, "ClearBattleFrontierQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "ClearBattleFrontierQuest")) return 1;

        // Then the gain pokedollar one
        if (Automation.Utils.isInstanceOf(a, "GainMoneyQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "GainMoneyQuest")) return 1;

        // Then the egg hatching one
        if (Automation.Utils.isInstanceOf(a, "HatchEggsQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "HatchEggsQuest")) return 1;

        // Then the harvest one
        if (Automation.Utils.isInstanceOf(a, "HarvestBerriesQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "HarvestBerriesQuest")) return 1;

        if (Automation.Utils.isInstanceOf(a, "GainFarmPointsQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "GainFarmPointsQuest")) return 1;

        // Finally the underground ones
        if (Automation.Utils.isInstanceOf(a, "MineItemsQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "MineItemsQuest")) return 1;
        if (Automation.Utils.isInstanceOf(a, "MineLayersQuest")) return -1;
        if (Automation.Utils.isInstanceOf(b, "MineLayersQuest")) return 1;

        // Don't sort other quests
        return 0;
    }

    /**
     * @brief Amends the @p loadoutCandidates with any side quests needed Oak item, and equips the resulting loadout
     *
     * @param {Array} loadoutCandidates: The wanted loadout composition
     */
    static __internal__equipOptimizedLoadout(loadoutCandidates)
    {
        let optimumItems = [];

        const currentQuests = this.__internal__getFilteredCurrentQuests();

        // Always equip UseOakItemQuest items 1st
        const useOakItemQuests = currentQuests.filter((quest) => Automation.Utils.isInstanceOf(quest, "UseOakItemQuest"));
        if (useOakItemQuests.length == 1)
        {
            optimumItems.push(useOakItemQuests[0].item);
        }

        if (currentQuests.some((quest) => Automation.Utils.isInstanceOf(quest, "CatchShiniesQuest")))
        {
            optimumItems.push(OakItemType.Shiny_Charm);
        }

        let resultLoadout = loadoutCandidates;
        // Reverse iterate so the order is preserved, since the items will be prepended to the list
        for (const wantedItem of optimumItems.reverse())
        {
            if (App.game.oakItems.isUnlocked(wantedItem))
            {
                // Remove the item from the default loadout if it already exists, so we are sure it ends up in the 1st position
                resultLoadout = resultLoadout.filter((item) => item !== wantedItem);

                // Prepend the needed item
                resultLoadout.unshift(wantedItem);
            }
        }

        Automation.Focus.__equipLoadout(resultLoadout);
    }

    /**
     * @returns The current quests list, without the user disabled ones
     */
    static __internal__getFilteredCurrentQuests()
    {
        return App.game.quests.currentQuests().filter(
                (quest) => (Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.QuestEnabled(quest.constructor.name)) == "true")
            , this);
    }
}
