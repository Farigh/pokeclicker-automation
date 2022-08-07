/**
 * @class The AutomationFocusQuest regroups the 'Focus on' button's 'Quests' functionalities
 *
 * @note The quest feature is not accessible right away when starting a new game.
 *       This focus topic will be hidden until the functionality is unlocked in-game.
 */
class AutomationFocusQuests
{
    static Settings = { UseSmallRestore: "Focus-Quest-UseSmallRestore" };

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
                run: function (){ this.__internal__start(); }.bind(this),
                stop: function (){ this.__internal__stop(); }.bind(this),
                isUnlocked: function (){ return App.game.quests.isDailyQuestsUnlocked(); },
                refreshRateAsMs: Automation.Focus.__noFunctionalityRefresh
            });
    }

    /**
     * @brief Adds the Quest-specific advanced settings
     *
     * The 'Use/buy Small Restore' setting is disabled by default (if never set in a previous session)
     *
     * @param parent: The div container to insert the settings to
     */
    static __addAdvancedSettings(parent)
    {
        // Disable use/buy small restore mode by default
        Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseSmallRestore, false);

        let smallRestoreTooltip = "Allows the Quests focus topic to buy and use Small Restore items"
                                + Automation.Menu.TooltipSeparator
                                + "This will only be used when a mining quest is active.\n"
                                + "⚠️ This can be cost-heavy during early game";
        let smallRestoreLabel = 'Automatically buy and use<img src="assets/images/items/SmallRestore.png"'
                              // Set the width smaller than the actual image one, and set it to preserve the image ratio to shrink the image margins
                              + ' style="height: 26px; width: 19px; object-fit: cover; object-position: left top;">';
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(smallRestoreLabel,
                                                               this.Settings.UseSmallRestore,
                                                               smallRestoreTooltip,
                                                               parent);
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__autoQuestLoop = null;

    /**
     * @brief Starts the quests automation
     */
    static __internal__start()
    {
        // Only set a loop if there is none active
        if (this.__internal__autoQuestLoop === null)
        {
            // Set auto-quest loop
            this.__internal__autoQuestLoop = setInterval(this.__internal__questLoop.bind(this), 1000); // Runs every second

            // Disable other modes button
            let disableReason = "The 'Focus on Quests' feature is enabled";
            Automation.Menu.setButtonDisabledState(Automation.Click.Settings.FeatureEnabled, true, disableReason);
            Automation.Menu.setButtonDisabledState(Automation.Hatchery.Settings.FeatureEnabled, true, disableReason);
            Automation.Menu.setButtonDisabledState(Automation.Farm.Settings.FeatureEnabled, true, disableReason);
            Automation.Menu.setButtonDisabledState(Automation.Farm.Settings.FocusOnUnlocks, true, disableReason);
            Automation.Menu.setButtonDisabledState(Automation.Underground.Settings.FeatureEnabled, true, disableReason);

            // Select cheri berry to avoid long riping time
            Automation.Farm.ForcePlantBerriesAsked = true;
            FarmController.selectedBerry(BerryType.Cheri);

            // Force enable other modes
            Automation.Click.toggleAutoClick(true);
            Automation.Hatchery.toggleAutoHatchery(true);
            Automation.Farm.toggleAutoFarming(true);
            Automation.Underground.toggleAutoMining(true);
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
        Automation.Farm.ForcePlantBerriesAsked = false;
        Automation.Underground.UseSmallRestoreAsked = false;
        Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.None;

        // Reset other modes status
        Automation.Click.toggleAutoClick();
        Automation.Hatchery.toggleAutoHatchery();
        Automation.Farm.toggleAutoFarming();
        Automation.Underground.toggleAutoMining();

        // Stop gym auto-fight
        Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, false);

        // Re-enable other modes button
        Automation.Menu.setButtonDisabledState(Automation.Click.Settings.FeatureEnabled, false);
        Automation.Menu.setButtonDisabledState(Automation.Hatchery.Settings.FeatureEnabled, false);
        Automation.Menu.setButtonDisabledState(Automation.Farm.Settings.FeatureEnabled, false);
        Automation.Menu.setButtonDisabledState(Automation.Farm.Settings.FocusOnUnlocks, false);
        Automation.Menu.setButtonDisabledState(Automation.Underground.Settings.FeatureEnabled, false);

        // Restore the ball to catch default value
        this.__internal__selectBallToCatch(Automation.Focus.__internal__defaultCaughtPokeballSelectElem.value);
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
        // Make sure to always have some balls to catch pokemons
        this.__internal__tryBuyBallIfUnderThreshold(Automation.Focus.__internal__pokeballToUseSelectElem.value, 10);

        // Disable best route if needed
        Automation.Menu.forceAutomationState("bestRouteClickEnabled", false);

        this.__internal__claimCompletedQuests();
        this.__internal__selectNewQuests();

        this.__internal__workOnQuest();
        this.__internal__workOnBackgroundQuests();
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

        let availableQuests = App.game.quests.questList().filter(
            (_, index) =>
            {
                return (!App.game.quests.questList()[index].isCompleted()
                        && !App.game.quests.questList()[index].inProgress());
            });

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
     * @brief Works on the most efficient quest available.
     */
    static __internal__workOnQuest()
    {
        // Already fighting, nothing to do for now
        if (Automation.Utils.isInInstanceState())
        {
            Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.StopAfterThisRun;
            return;
        }
        Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.None;

        let currentQuests = App.game.quests.currentQuests();
        if (currentQuests.length == 0)
        {
            return;
        }

        // Sort quest to work on the most relevent one
        currentQuests.sort(this.__internal__sortQuestByPriority, this);

        // Filter the quests that do not need specific action
        let filteredQuests = currentQuests.filter(
            (quest) =>
            {
                return !((quest instanceof CatchShiniesQuest)
                         || (quest instanceof GainMoneyQuest)
                         || (quest instanceof GainFarmPointsQuest)
                         || (quest instanceof HarvestBerriesQuest)
                         || (quest instanceof MineItemsQuest)
                         || (quest instanceof MineLayersQuest));
            });

        let quest = filteredQuests[0];

        // Defeat gym quest
        if ((quest instanceof CapturePokemonsQuest)
            || (quest instanceof GainTokensQuest))
        {
            this.__internal__workOnUsePokeballQuest(Automation.Focus.__internal__pokeballToUseSelectElem.value);
        }
        else if (quest instanceof CapturePokemonTypesQuest)
        {
            this.__internal__workOnCapturePokemonTypesQuest(quest);
        }
        else if (quest instanceof DefeatDungeonQuest)
        {
            this.__internal__workOnDefeatDungeonQuest(quest);
        }
        else if (quest instanceof DefeatGymQuest)
        {
            this.__internal__workOnDefeatGymQuest(quest);
        }
        else if (quest instanceof DefeatPokemonsQuest)
        {
            this.__internal__workOnDefeatPokemonsQuest(quest);
        }
        else if (quest instanceof GainGemsQuest)
        {
            this.__internal__workOnGainGemsQuest(quest);
        }
        else if (quest instanceof UseOakItemQuest)
        {
            this.__internal__workOnUseOakItemQuest(quest);
        }
        else if (quest instanceof UsePokeballQuest)
        {
            this.__internal__workOnUsePokeballQuest(quest.pokeball, true);
        }
        else // Other type of quest don't need much
        {
            // Disable catching pokemons if enabled
            this.__internal__selectBallToCatch(GameConstants.Pokeball.None);

            if (currentQuests.some((quest) => quest instanceof CatchShiniesQuest))
            {
                // Buy some ball to be prepared
                this.__internal__tryBuyBallIfUnderThreshold(Automation.Focus.__internal__pokeballToUseSelectElem.value, 10);
                this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);
            }
            else if (currentQuests.some((quest) => quest instanceof GainMoneyQuest))
            {
                this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.Money);

                let bestGym = Automation.Utils.Gym.findBestGymForMoney();
                if (bestGym.bestGymTown !== null)
                {
                    Automation.Utils.Route.moveToTown(bestGym.bestGymTown);
                    Automation.Focus.__enableAutoGymFight(bestGym.bestGym);
                    return;
                }
            }
            else
            {
                this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonExp);
            }

            Automation.Utils.Route.moveToBestRouteForExp();
        }
    }

    /**
     * @brief Performs action related to quests that can be done while other quests are being worked on.
     *
     * For example, planting some crops, or restoring energy for the mine [if enabled].
     */
    static __internal__workOnBackgroundQuests()
    {
        let currentQuests = App.game.quests.currentQuests();

        let isFarmingSpecificBerry = false;

        let hasMiningQuest = false;

        // Filter the quests that do not need specific action
        for (const quest of currentQuests)
        {
            if (quest instanceof HarvestBerriesQuest)
            {
                this.__internal__enableFarmingForBerryType(quest.berryType);
                isFarmingSpecificBerry = true;
            }
            else if ((quest instanceof GainFarmPointsQuest)
                     && !isFarmingSpecificBerry)
            {
                let bestBerry = this.__internal__getMostSuitableBerryForQuest(quest);
                this.__internal__enableFarmingForBerryType(bestBerry);
            }
            else if ((quest instanceof MineItemsQuest)
                     || (quest instanceof MineLayersQuest))
            {
                hasMiningQuest = true;
            }
        }

        Automation.Underground.UseSmallRestoreAsked =
            hasMiningQuest && (Automation.Utils.LocalStorage.getValue(this.Settings.UseSmallRestore) === "true");
    }

    /**
     * @brief Works on a CapturePokemonTypesQuest.
     *
     * It will equip balls to catch already caught pokemons
     * and move to the most efficient route for the quest requested pokemon type.
     *
     * @param quest: The game's quest object
     */
    static __internal__workOnCapturePokemonTypesQuest(quest)
    {
        // Add a pokeball to the Caught type and set the PokemonCatch setup
        let hasBalls = this.__internal__selectBallToCatch(Automation.Focus.__internal__pokeballToUseSelectElem.value);
        this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);

        if (hasBalls)
        {
            let bestRoute = Automation.Utils.Route.findBestRouteForFarmingType(quest.type);
            Automation.Utils.Route.moveToRoute(bestRoute.Route, bestRoute.Region);
        }
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
     * @param quest: The game's quest object
     */
    static __internal__workOnDefeatDungeonQuest(quest)
    {
        // If we don't have enough tokens, go farm some
        if (TownList[quest.dungeon].dungeon.tokenCost > App.game.wallet.currencies[Currency.dungeonToken]())
        {
            this.__internal__workOnUsePokeballQuest(Automation.Focus.__internal__pokeballToUseSelectElem.value);
            return;
        }

        this.__internal__selectBallToCatch(GameConstants.Pokeball.None);

        // Move to dungeon if needed
        if (!Automation.Utils.Route.isPlayerInTown(quest.dungeon))
        {
            Automation.Utils.Route.moveToTown(quest.dungeon);

            // Let a tick to the menu to show up
            return;
        }

        // Bypass user settings like the stop on pokedex one
        Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.BypassUserSettings;

        // Enable auto dungeon fight
        Automation.Menu.forceAutomationState(Automation.Dungeon.Settings.FeatureEnabled, true);
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

        // Move to the associated gym if needed
        if (!Automation.Utils.Route.isPlayerInTown(townToGoTo))
        {
            Automation.Utils.Route.moveToTown(townToGoTo);
        }
        else if (Automation.Utils.LocalStorage.getValue(Automation.Gym.Settings.FeatureEnabled) === "false")
        {
            Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, true);
        }
        else
        {
            // Select the right gym to fight
            if (document.getElementById("selectedAutomationGym").value != quest.gymTown)
            {
                document.getElementById("selectedAutomationGym").value = quest.gymTown;
            }
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
        this.__internal__selectBallToCatch(GameConstants.Pokeball.None);
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
        this.__internal__selectBallToCatch(GameConstants.Pokeball.None);
        this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

        Automation.Focus.__internal__goToBestGymOrRouteForGem(quest.type);
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
            this.__internal__workOnUsePokeballQuest(Automation.Focus.__internal__pokeballToUseSelectElem.value);
        }
        else
        {
            this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

            // Go kill some pokemon
            this.__internal__selectBallToCatch(GameConstants.Pokeball.None);
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
        let hasBalls = this.__internal__selectBallToCatch(ballType, enforceType);
        this.__internal__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);

        if (hasBalls)
        {
            // Go to the highest route, for higher quest point income
            Automation.Utils.Route.moveToHighestDungeonTokenIncomeRoute(ballType);
        }
    }

    /**
     * @brief Choose the most suitable ball to use, based on the user inventory.
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
    static __internal__selectBallToCatch(ballTypeToUse, enforceType = false)
    {
        if (ballTypeToUse == GameConstants.Pokeball.None)
        {
            App.game.pokeballs.alreadyCaughtSelection = ballTypeToUse;
            return;
        }

        if (!enforceType)
        {
            // Choose the most optimal pokeball, based on the other quests
            for (const quest of App.game.quests.currentQuests())
            {
                if (quest instanceof UsePokeballQuest)
                {
                    ballTypeToUse = quest.pokeball;
                    enforceType = true;
                }
            }
        }

        App.game.pokeballs.alreadyCaughtSelection = ballTypeToUse;

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
                App.game.pokeballs.alreadyCaughtSelection = GameConstants.Pokeball.None;
                Automation.Focus.__internal__equipLoadout(Automation.Utils.OakItem.Setup.Money);

                let bestGym = Automation.Utils.Gym.findBestGymForMoney();

                if (bestGym.bestGymTown === null)
                {
                    Automation.Utils.Route.moveToBestRouteForExp();
                    return;
                }

                Automation.Utils.Route.moveToTown(bestGym.bestGymTown);
                Automation.Focus.__enableAutoGymFight(bestGym.bestGym);
            }
            return false;
        }

        return true;
    }

    /**
     * @brief Sets the game's selected berry to @p berryType
     *
     * @see AutomationFarm for the use of such value
     */
    static __internal__enableFarmingForBerryType(berryType)
    {
        // Select the berry type to farm
        FarmController.selectedBerry(berryType);
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
            if (ballItem.totalPrice(amount) < App.game.wallet.currencies[ballItem.currency]())
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
        if (a instanceof CatchShiniesQuest) return -1;
        if (b instanceof CatchShiniesQuest) return 1;

        if (a instanceof CapturePokemonTypesQuest) return -1;
        if (b instanceof CapturePokemonTypesQuest) return 1;

        if (a instanceof CapturePokemonsQuest) return -1;
        if (b instanceof CapturePokemonsQuest) return 1;

        if (a instanceof UsePokeballQuest) return -1;
        if (b instanceof UsePokeballQuest) return 1;

        if (a instanceof GainTokensQuest) return -1;
        if (b instanceof GainTokensQuest) return 1;

        // Then quests related to defeating pokemon/opponents
        // (starting with the oak item one, since it can be related to catching)
        if (a instanceof UseOakItemQuest) return -1;
        if (b instanceof UseOakItemQuest) return 1;

        if (a instanceof GainGemsQuest) return -1;
        if (b instanceof GainGemsQuest) return 1;

        if (a instanceof DefeatDungeonQuest) return -1;
        if (b instanceof DefeatDungeonQuest) return 1;

        if (a instanceof DefeatGymQuest) return -1;
        if (b instanceof DefeatGymQuest) return 1;

        if (a instanceof DefeatPokemonsQuest) return -1;
        if (b instanceof DefeatPokemonsQuest) return 1;

        // Then the gain pokedollar one
        if (a instanceof GainMoneyQuest) return -1;
        if (b instanceof GainMoneyQuest) return 1;

        // Then the egg hatching one
        if (a instanceof HatchEggsQuest) return -1;
        if (b instanceof HatchEggsQuest) return 1;

        // Then the harvest one
        if (a instanceof HarvestBerriesQuest) return -1;
        if (b instanceof HarvestBerriesQuest) return 1;

        if (a instanceof GainFarmPointsQuest) return -1;
        if (b instanceof GainFarmPointsQuest) return 1;

        // Finally the underground ones
        if (a instanceof MineItemsQuest) return -1;
        if (b instanceof MineItemsQuest) return 1;
        if (a instanceof MineLayersQuest) return -1;
        if (b instanceof MineLayersQuest) return 1;

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

        let currentQuests = App.game.quests.currentQuests();

        // Always equip UseOakItemQuest items 1st
        let useOakItemQuests = currentQuests.filter((quest) => quest instanceof UseOakItemQuest)
        if (useOakItemQuests.length == 1)
        {
            optimumItems.push(useOakItemQuests[0].item);
        }

        if (currentQuests.some((quest) => quest instanceof CatchShiniesQuest))
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

        Automation.Focus.__internal__equipLoadout(resultLoadout);
    }
}
