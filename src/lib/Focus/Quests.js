/**
 * @class The AutomationFocusQuest regroups the 'Focus on' button's 'Quests' functionalities
 *
 * @note The quest feature is not accessible right away when starting a new game.
 *       This focus topic will be hidden until the functionality is unlocked in-game.
 */
class AutomationFocusQuests
{
    static __autoQuestLoop = null;

    static Settings = { UseSmallRestore: "Focus-Quest-UseSmallRestore" };

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
                tooltip: "Automatically add and complete quests"
                       + Automation.Menu.__tooltipSeparator()
                       + "This mode fully automates quest completion\n"
                       + "It automatically equips Oak items and balls\n"
                       + "It automatically moves to the appropriate location\n"
                       + "It automatically attacks, starts gym and enters dungeons"
                       + Automation.Menu.__tooltipSeparator()
                       + "Most modes are disabled while this is enabled\n"
                       + "as it will take over control of those modes"
                       + Automation.Menu.__tooltipSeparator()
                       + "⚠️ You will hardly be able to manually play with this mode enabled",
                run: function (){ this.__start(); }.bind(this),
                stop: function (){ this.__stop(); }.bind(this),
                isUnlocked: function (){ return App.game.quests.isDailyQuestsUnlocked(); },
                refreshRateAsMs: Automation.Focus.__noFunctionalityRefresh
            });
    }

    /**
     * @brief Builds the menu
     *
     * The 'Use/buy Small Restore' functionality is disabled by default (if never set in a previous session)
     *
     * @param parent: The div container to insert the menu to
     */
    static __buildSpecificMenu(parent)
    {
        // Disable use/buy small restore mode by default
        if (localStorage.getItem(this.Settings.UseSmallRestore) === null)
        {
            localStorage.setItem(this.Settings.UseSmallRestore, false);
        }

        let smallRestoreTooltip = "Allows the Quests focus topic to buy and use Small Restore items"
                                + Automation.Menu.__tooltipSeparator()
                                + "This will only be used when a mining quest is active.\n"
                                + "⚠️ This can be cost-heavy during early game";
        let smallRestoreLabel = 'Use/buy<img src="assets/images/items/SmallRestore.png" height="26px">:';
        let buttonContainer = Automation.Menu.__addAutomationButton(smallRestoreLabel, this.Settings.UseSmallRestore, smallRestoreTooltip, parent).parentElement;
        buttonContainer.style.textAlign = "right";
        buttonContainer.style.merginTop = "2px";
    }

    /**
     * @brief Starts the quests automation
     */
    static __start()
    {
        // Only set a loop if there is none active
        if (this.__autoQuestLoop === null)
        {
            // Set auto-quest loop
            this.__autoQuestLoop = setInterval(this.__questLoop.bind(this), 1000); // Runs every second

            // Disable other modes button
            let disableReason = "The 'Focus on Quests' feature is enabled";
            Automation.Menu.__disableButton(Automation.Click.Settings.FeatureEnabled, true, disableReason);
            Automation.Menu.__disableButton(Automation.Hatchery.Settings.FeatureEnabled, true, disableReason);
            Automation.Menu.__disableButton(Automation.Farm.Settings.FeatureEnabled, true, disableReason);
            Automation.Menu.__disableButton(Automation.Farm.Settings.FocusOnUnlocks, true, disableReason);
            Automation.Menu.__disableButton(Automation.Underground.Settings.FeatureEnabled, true, disableReason);

            // Select cheri berry to avoid long riping time
            Automation.Farm.__forcePlantBerriesAsked = true;
            FarmController.selectedBerry(BerryType.Cheri);

            // Force enable other modes
            Automation.Click.__toggleAutoClick(true);
            Automation.Hatchery.__toggleAutoHatchery(true);
            Automation.Farm.__toggleAutoFarming(true);
            Automation.Underground.__toggleAutoMining(true);
        }
    }

    /**
     * @brief Stops the quests automation
     */
    static __stop()
    {
        // Unregister the loop
        clearInterval(this.__autoQuestLoop);
        this.__autoQuestLoop = null;

        // Reset demands
        Automation.Farm.__forcePlantBerriesAsked = false;
        Automation.Dungeon.__stopRequested = false;

        // Reset other modes status
        Automation.Click.__toggleAutoClick();
        Automation.Hatchery.__toggleAutoHatchery();
        Automation.Farm.__toggleAutoFarming();
        Automation.Underground.__toggleAutoMining();

        // Re-enable other modes button
        Automation.Menu.__disableButton(Automation.Click.Settings.FeatureEnabled, false);
        Automation.Menu.__disableButton(Automation.Hatchery.Settings.FeatureEnabled, false);
        Automation.Menu.__disableButton(Automation.Farm.Settings.FeatureEnabled, false);
        Automation.Menu.__disableButton(Automation.Farm.Settings.FocusOnUnlocks, false);
        Automation.Menu.__disableButton(Automation.Underground.Settings.FeatureEnabled, false);

        // Remove the ball to catch
        this.__selectBallToCatch(GameConstants.Pokeball.None);
    }

    /**
     * @brief The Daily Quest loop
     *
     * Automatically chooses new quests if needed.
     * Automatically claims completed quests.
     * Chooses the next quest to work on.
     */
    static __questLoop()
    {
        // Make sure to always have some balls to catch pokemons
        this.__tryBuyBallIfUnderThreshold(GameConstants.Pokeball.Ultraball, 10);

        // Disable best route if needed
        Automation.Menu.__forceAutomationState("bestRouteClickEnabled", false);

        this.__claimCompletedQuests();
        this.__selectNewQuests();

        this.__workOnQuest();
        this.__workOnBackgroundQuests();
    }

    /**
     * @brief Claims any completed quest reward
     */
    static __claimCompletedQuests()
    {
        App.game.quests.questList().forEach(
            (quest, index) =>
            {
                if (quest.isCompleted() && !quest.claimed())
                {
                    App.game.quests.claimQuest(index);
                }
            });
    }

    /**
     * @brief Chooses new quests to perform
     *
     * @see __sortQuestByPriority for the quest selection strategy
     */
    static __selectNewQuests()
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
        availableQuests.sort(this.__sortQuestByPriority, this);

        availableQuests.forEach(
            (quest) =>
            {
                if (App.game.quests.canStartNewQuest())
                {
                    quest.begin();
                }
            });
    }

    /**
     * @brief Works on the most efficient quest available.
     */
    static __workOnQuest()
    {
        // Already fighting, nothing to do for now
        if (Automation.Utils.__isInInstanceState())
        {
            Automation.Dungeon.__stopRequested = true;
            return;
        }
        Automation.Dungeon.__stopRequested = false;

        let currentQuests = App.game.quests.currentQuests();
        if (currentQuests.length == 0)
        {
            return;
        }

        // Sort quest to work on the most relevent one
        currentQuests.sort(this.__sortQuestByPriority, this);

        // Filter the quests that do not need specific action
        currentQuests = currentQuests.filter(
            (quest) =>
            {
                return !((quest instanceof CatchShiniesQuest)
                         || (quest instanceof GainMoneyQuest)
                         || (quest instanceof GainFarmPointsQuest)
                         || (quest instanceof HarvestBerriesQuest)
                         || (quest instanceof MineItemsQuest)
                         || (quest instanceof MineLayersQuest));
            });

        let quest = currentQuests[0];

        // Defeat gym quest
        if ((quest instanceof CapturePokemonsQuest)
            || (quest instanceof GainTokensQuest))
        {
            this.__workOnUsePokeballQuest(GameConstants.Pokeball.Ultraball);
        }
        else if (quest instanceof CapturePokemonTypesQuest)
        {
            this.__workOnCapturePokemonTypesQuest(quest);
        }
        else if (quest instanceof DefeatDungeonQuest)
        {
            this.__workOnDefeatDungeonQuest(quest);
        }
        else if (quest instanceof DefeatGymQuest)
        {
            this.__workOnDefeatGymQuest(quest);
        }
        else if (quest instanceof DefeatPokemonsQuest)
        {
            this.__workOnDefeatPokemonsQuest(quest);
        }
        else if (quest instanceof GainGemsQuest)
        {
            this.__workOnGainGemsQuest(quest);
        }
        else if (quest instanceof UseOakItemQuest)
        {
            this.__workOnUseOakItemQuest(quest);
        }
        else if (quest instanceof UsePokeballQuest)
        {
            this.__workOnUsePokeballQuest(quest.pokeball, true);
        }
        else // Other type of quest don't need much
        {
            // Buy some ball to be prepared
            if (quest instanceof CatchShiniesQuest)
            {
                this.__tryBuyBallIfUnderThreshold(GameConstants.Pokeball.Ultraball, 10);
                this.__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);
            }
            else
            {
                this.__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonExp);
            }

            // Disable catching pokemons if enabled, and go to the best farming route
            this.__selectBallToCatch(GameConstants.Pokeball.None);

            Automation.Utils.Route.__moveToBestRouteForExp();
        }
    }

    /**
     * @brief Performs action related to quests that can be done while other quests are being worked on.
     *
     * For example, planting some crops, or restoring energy for the mine [if enabled].
     */
    static __workOnBackgroundQuests()
    {
        let currentQuests = App.game.quests.currentQuests();

        let isFarmingSpecificBerry = false;

        // Filter the quests that do not need specific action
        currentQuests.forEach(
            (quest) =>
            {
                if (quest instanceof HarvestBerriesQuest)
                {
                    this.__enableFarmingForBerryType(quest.berryType);
                    isFarmingSpecificBerry = true;
                }
                else if ((quest instanceof GainFarmPointsQuest)
                         && !isFarmingSpecificBerry)
                {
                    let bestBerry = this.__getMostSuitableBerryForQuest(quest);
                    this.__enableFarmingForBerryType(bestBerry);
                }
                else if ((quest instanceof MineItemsQuest)
                         || (quest instanceof MineLayersQuest))
                {
                    this.__restoreUndergroundEnergyIfUnderThreshold(5);
                }
            });
    }

    /**
     * @brief Works on a CapturePokemonTypesQuest.
     *
     * It will equip balls to catch already caught pokemons
     * and move to the most efficient route for the quest requested pokemon type.
     *
     * @param quest: The game's quest object
     */
    static __workOnCapturePokemonTypesQuest(quest)
    {
        let { bestRoute, bestRouteRegion } = Automation.Utils.Route.__findBestRouteForFarmingType(quest.type);

        // Add a pokeball to the Caught type and set the PokemonCatch setup
        let hasBalls = this.__selectBallToCatch(GameConstants.Pokeball.Ultraball);
        this.__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);

        if (hasBalls && ((player.route() !== bestRoute) || (player.region !== bestRouteRegion)))
        {
            Automation.Utils.Route.__moveToRoute(bestRoute, bestRouteRegion);
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
    static __workOnDefeatDungeonQuest(quest)
    {
        // If we don't have enough tokens, go farm some
        if (TownList[quest.dungeon].dungeon.tokenCost > App.game.wallet.currencies[Currency.dungeonToken]())
        {
            this.__workOnUsePokeballQuest(GameConstants.Pokeball.Ultraball);
            return;
        }

        this.__selectBallToCatch(GameConstants.Pokeball.None);

        // Move to dungeon if needed
        if ((player.route() != 0) || quest.dungeon !== player.town().name)
        {
            Automation.Utils.Route.__moveToTown(quest.dungeon);

            // Let a tick to the menu to show up
            return;
        }

        // Disable pokedex stop
        Automation.Menu.__forceAutomationState("stopDungeonAtPokedexCompletion", false);

        // Enable auto dungeon fight
        Automation.Menu.__forceAutomationState(Automation.Dungeon.Settings.FeatureEnabled, true);
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
    static __workOnDefeatGymQuest(quest)
    {
        let townToGoTo = quest.gymTown;

        // If a ligue champion is the target, the gymTown points to the champion instead of the town
        if (!TownList[townToGoTo])
        {
            townToGoTo = GymList[townToGoTo].parent.name;
        }

        // Move to the associated gym if needed
        if ((player.route() != 0) || (townToGoTo !== player.town().name))
        {
            Automation.Utils.Route.__moveToTown(townToGoTo);
        }
        else if (localStorage.getItem(Automation.Gym.Settings.FeatureEnabled) === "false")
        {
            Automation.Menu.__forceAutomationState(Automation.Gym.Settings.FeatureEnabled, true);
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
    static __workOnDefeatPokemonsQuest(quest)
    {
        this.__selectBallToCatch(GameConstants.Pokeball.None);

        if ((player.region != quest.region)
            || (player.route() != quest.route))
        {
            Automation.Utils.Route.__moveToRoute(quest.route, quest.region);
        }
        this.__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonExp);
    }

    /**
     * @brief Works on a GainGemsQuest.
     *
     * The player is moved to the best route to defeat the quest requested type pokemons
     *
     * @param quest: The game's quest object
     */
    static __workOnGainGemsQuest(quest)
    {
        this.__selectBallToCatch(GameConstants.Pokeball.None);
        this.__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

        let { bestRoute, bestRouteRegion } = Automation.Utils.Route.__findBestRouteForFarmingType(quest.type);
        Automation.Utils.Route.__moveToRoute(bestRoute, bestRouteRegion);
    }

    /**
     * @brief Works on a UseOakItemQuest.
     *
     * The quest requested oak item is equipped and the player is moved to the best route to defeat pokemons
     * If the item is the Magic_Ball one, some balls are equipped as well to catch the pokemons
     *
     * @param quest: The game's quest object
     */
    static __workOnUseOakItemQuest(quest)
    {
        if (quest.item == OakItemType.Magic_Ball)
        {
            this.__workOnUsePokeballQuest(GameConstants.Pokeball.Ultraball);
        }
        else
        {
            this.__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

            // Go kill some pokemon
            this.__selectBallToCatch(GameConstants.Pokeball.None);
            Automation.Utils.Route.__moveToBestRouteForExp();
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
    static __workOnUsePokeballQuest(ballType, enforceType = false)
    {
        let hasBalls = this.__selectBallToCatch(ballType, enforceType);
        this.__equipOptimizedLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);

        if (hasBalls)
        {
            // Go to the highest route, for higher quest point income
            Automation.Utils.Route.__moveToHighestDungeonTokenIncomeRoute(ballType);
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
    static __selectBallToCatch(ballTypeToUse, enforceType = false)
    {
        if (ballTypeToUse === GameConstants.Pokeball.None)
        {
            App.game.pokeballs.alreadyCaughtSelection = ballTypeToUse;
            return;
        }

        if (!enforceType)
        {
            // Choose the optimal pokeball, base on the other quests
            App.game.quests.currentQuests().forEach(
                (quest) =>
                {
                    if (quest instanceof UsePokeballQuest)
                    {
                        ballTypeToUse = quest.pokeball;
                        enforceType = true;
                    }
                });
        }

        App.game.pokeballs.alreadyCaughtSelection = ballTypeToUse;

        // Make sure to always have some balls to catch pokemons
        this.__tryBuyBallIfUnderThreshold(ballTypeToUse, 10);

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
                Automation.Utils.Route.__moveToBestRouteForExp();
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
    static __enableFarmingForBerryType(berryType)
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
    static __getMostSuitableBerryForQuest(quest)
    {
        let bestTime = Number.MAX_SAFE_INTEGER;
        let bestBerry = 0;

        let availableSlotCount = App.game.farming.plotList.filter((plot) => plot.isUnlocked).length;

        App.game.farming.unlockedBerries.forEach(
            (isUnlocked, index) =>
            {
                // Don't consider locked berries
                if (!isUnlocked())
                {
                    return;
                }

                let berryData = App.game.farming.berryData[index];

                // Don't consider out-of-stock berries
                if (App.game.farming.berryList[index]() === 0)
                {
                    return;
                }

                let berryTime = (berryData.growthTime[3] * Math.ceil(quest.amount / availableSlotCount / berryData.farmValue));

                // The time can't go below the berry growth time
                let time = Math.max(berryData.growthTime[3], berryTime);
                if (time < bestTime)
                {
                    bestTime = time;
                    bestBerry = index;
                }
            });

        return bestBerry;
    }

    /**
     * @brief Ties to buy some ball if the player's amount goes under the provided @p amount
     *
     * @param ballType: The type of pokeball to check
     * @param amount: The minimum amount to have in stock at all time
     */
    static __tryBuyBallIfUnderThreshold(ballType, amount)
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
     * @brief Ties to buy some Small Restore if the player's amount goes under the provided @p amount
     *
     * @param amount: The minimum amount to have in stock at all time
     */
    static __restoreUndergroundEnergyIfUnderThreshold(amount)
    {
        // Only use Small Restore item if:
        //    - It can be bought (ie. the Cinnabar Island store is unlocked)
        //    - The user allowed it
        if (!TownList["Cinnabar Island"].isUnlocked()
            && (localStorage.getItem(this.Settings.UseSmallRestore) === "true"))
        {
            return;
        }

        let currentEnergy = Math.floor(App.game.underground.energy);

        if (currentEnergy < 20)
        {
            // Use the small restore since it's the one with best cost/value ratio
            let smallRestoreCount = player.itemList[GameConstants.EnergyRestoreSize[0]]();
            let item = ItemList[GameConstants.EnergyRestoreSize[0]];

            if (smallRestoreCount < amount)
            {
                if (item.totalPrice(amount) < App.game.wallet.currencies[item.currency]())
                {
                    item.buy(amount);
                    smallRestoreCount += 5;
                }
            }
            if (smallRestoreCount > 0)
            {
                item.use();
            }
        }
    }

    /**
     * @brief The predicate that sorts the quest from the most important one to the least important
     *
     * @param a: The first quest to compare
     * @param a: The second quest to compare
     */
    static __sortQuestByPriority(a, b)
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
    static __equipOptimizedLoadout(loadoutCandidates)
    {
        let optimumItems = [];

        let currentQuests = App.game.quests.currentQuests();

        // Always equip UseOakItemQuest items 1st
        let useOakItemQuests = currentQuests.filter((quest) => quest instanceof UseOakItemQuest)
        if (useOakItemQuests == 1)
        {
            optimumItems.push(useOakItemQuests[0].item);
        }

        if (currentQuests.some((quest) => quest instanceof CatchShiniesQuest))
        {
            optimumItems.push(OakItemType.Shiny_Charm);
        }

        let resultLoadout = loadoutCandidates;
        // Reverse iterate so the order is preserved, since the items will be prepended to the list
        optimumItems.reverse().forEach(
            (wantedItem) =>
            {
                if (App.game.oakItems.isUnlocked(wantedItem))
                {
                    // Remove the item from the default loadout if it already exists, so we are sure it ends up in the 1st position
                    resultLoadout = resultLoadout.filter((item) => item !== wantedItem);

                    // Prepend the needed item
                    resultLoadout.unshift(wantedItem);
                }
            });

        Automation.Utils.OakItem.__equipLoadout(resultLoadout);
    }
}
