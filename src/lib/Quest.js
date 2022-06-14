/**
 * @class The AutomationQuest regroups the 'Daily Quest' functionalities
 *
 * @note The quest feature is not accessible right away when starting a new game.
 *       This menu will be hidden until the functionality is unlocked in-game.
 */
class AutomationQuest
{
    static __questContainer = null;

    static __autoQuestLoop = null;
    static __forbiddenItem = null;

    /**
     * @brief Builds the menu, and retores previous running state if needed
     *
     * The 'Use/buy Small Restore' functionality is disabled by default (if never set in a previous session)
     */
    static start()
    {
        // Disable use/buy small restore mode by default
        if (localStorage.getItem("autoUseSmallRestoreEnabled") === null)
        {
            localStorage.setItem("autoUseSmallRestoreEnabled", false);
        }

        // Add the related button to the automation menu
        this.__questContainer = document.createElement("div");
        Automation.Menu.__automationButtonsDiv.appendChild(this.__questContainer);

        Automation.Menu.__addSeparator(this.__questContainer);

        // Only display the menu when the hatchery is unlocked
        if (!App.game.quests.isDailyQuestsUnlocked())
        {
            this.__questContainer.hidden = true;
            this.__setQuestUnlockWatcher();
        }

        let autoQuestTooltip = "Automatically add and complete quests"
                             + Automation.Menu.__tooltipSeparator()
                             + "This mode fully automates quest completion\n"
                             + "It automatically equips Oak items and balls\n"
                             + "It automatically moves to the appropriate location\n"
                             + "It automatically attacks, starts gym and enters dungeons"
                             + Automation.Menu.__tooltipSeparator()
                             + "Most modes are disabled while this is enabled\n"
                             + "as it will take over control of those modes"
                             + Automation.Menu.__tooltipSeparator()
                             + "⚠️ You will hardly be able to manually play with this mode enabled";
        let questButton = Automation.Menu.__addAutomationButton("AutoQuests", "autoQuestEnabled", autoQuestTooltip, this.__questContainer);
        questButton.addEventListener("click", this.__toggleAutoQuest.bind(this), false);

        let smallRestoreTooltip = "Allows the AutoQuests mode to buy and use Small Restore items"
                                + Automation.Menu.__tooltipSeparator()
                                + "⚠️ This can be cost-heavy during early game";
        let smallRestoreLabel = 'Use/buy<img src="assets/images/items/SmallRestore.png" height="26px">:';
        Automation.Menu.__addAutomationButton(smallRestoreLabel, "autoUseSmallRestoreEnabled", smallRestoreTooltip, this.__questContainer);

        // Restore previous session state
        this.__toggleAutoQuest();
    }

    /**
     * @class The OakItemSetup lists the different setup to use based on the current objectives
     */
    static OakItemSetup = class AutomationOakItemSetup
    {
        /**
         * @brief The most efficient setup to catch pokemons
         */
        static PokemonCatch = [
                                  OakItemType.Magic_Ball,
                                  OakItemType.Shiny_Charm,
                                  OakItemType.Poison_Barb,
                                  OakItemType.Exp_Share
                              ];
        /**
         * @brief The most efficient setup to increase the pokemon power and make money
         */
        static PokemonExp = [
                                OakItemType.Poison_Barb,
                                OakItemType.Amulet_Coin,
                                OakItemType.Blaze_Cassette,
                                OakItemType.Exp_Share
                            ];
    }

    /**
     * @brief Watches for the in-game functionality to be unlocked.
     *        Once unlocked, the menu will be displayed to the user
     */
    static __setQuestUnlockWatcher()
    {
        let watcher = setInterval(function()
        {
            if (App.game.quests.isDailyQuestsUnlocked())
            {
                clearInterval(watcher);
                this.__questContainer.hidden = false;
                this.__toggleAutoQuest();
            }
        }.bind(this), 10000); // Check every 10 seconds
    }

    /**
     * @brief Toggles the 'Daily Quest' feature
     *
     * If the feature was enabled and it's toggled to disabled, the auto attack loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the auto attack loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will used to set the right state.
     *                Otherwise, the cookie stored value will be used
     */
    static __toggleAutoQuest(enable)
    {
        if (!App.game.quests.isDailyQuestsUnlocked())
        {
            return;
        }

        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (localStorage.getItem("autoQuestEnabled") === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__autoQuestLoop === null)
            {
                // Set auto-quest loop
                this.__autoQuestLoop = setInterval(this.__questLoop.bind(this), 1000); // Runs every second

                // Disable other modes button
                let disableReason = "The 'AutoQuests' feature is enabled";
                Automation.Menu.__disableButton("autoClickEnabled", true, disableReason);
                Automation.Menu.__disableButton("bestRouteClickEnabled", true, disableReason);
                Automation.Menu.__disableButton("hatcheryAutomationEnabled", true, disableReason);
                Automation.Menu.__disableButton("autoFarmingEnabled", true, disableReason);
                Automation.Menu.__disableButton("autoUnlockFarmingEnabled", true, disableReason);
                Automation.Menu.__disableButton("autoMiningEnabled", true, disableReason);

                // Select cheri berry to avoid long riping time
                Automation.Farm.__forcePlantBerriesAsked = true;
                FarmController.selectedBerry(BerryType.Cheri);

                // Force enable other modes
                Automation.Click.__toggleAutoClick(true);
                Automation.Hatchery.__toggleAutoHatchery(true);
                Automation.Farm.__toggleAutoFarming(true);
                Automation.Underground.__toggleAutoMining(true);

                // Force disable best route mode
                Automation.Click.__toggleBestRoute(false);
            }
        }
        else if (this.__autoQuestLoop !== null)
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
            Automation.Menu.__disableButton("autoClickEnabled", false);
            Automation.Menu.__disableButton("bestRouteClickEnabled", false);
            Automation.Menu.__disableButton("hatcheryAutomationEnabled", false);
            Automation.Menu.__disableButton("autoFarmingEnabled", false);
            Automation.Menu.__disableButton("autoUnlockFarmingEnabled", false);
            Automation.Menu.__disableButton("autoMiningEnabled", false);

            // Remove the ball to catch
            this.__selectBallToCatch(GameConstants.Pokeball.None);
        }
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
            (quest, index) =>
            {
                return (!App.game.quests.questList()[index].isCompleted()
                        && !App.game.quests.questList()[index].inProgress());
            });

        // Sort quest to group the same type together
        availableQuests.sort(this.__sortQuestByPriority, this);

        availableQuests.forEach(
            (quest, index) =>
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
                this.__selectOwkItems(this.OakItemSetup.PokemonCatch);
            }
            else
            {
                this.__selectOwkItems(this.OakItemSetup.PokemonExp);
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
        let { bestRoute, bestRouteRegion } = this.__findBestRouteForFarmingType(quest.type);

        // Add a pokeball to the Caught type and set the PokemonCatch setup
        let hasBalls = this.__selectBallToCatch(GameConstants.Pokeball.Ultraball);
        this.__selectOwkItems(this.OakItemSetup.PokemonCatch);

        if (hasBalls && (player.route() !== bestRoute))
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
        Automation.Menu.__forceAutomationState("dungeonFightEnabled", true);
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
        else if (localStorage.getItem("gymFightEnabled") === "false")
        {
            Automation.Menu.__forceAutomationState("gymFightEnabled", true);
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
        this.__selectOwkItems(this.OakItemSetup.PokemonExp);
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
        this.__selectOwkItems(this.OakItemSetup.PokemonExp);

        let { bestRoute, bestRouteRegion } = this.__findBestRouteForFarmingType(quest.type);
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
            // Select the right oak item
            let customOakLoadout = this.OakItemSetup.PokemonExp;

            // Remove the item from the default loadout if it already exists, so we are sure it ends up in the 1st position
            customOakLoadout = customOakLoadout.filter((item) => item !== quest.item);

            // Prepend the needed item
            customOakLoadout.unshift(quest.item);

            this.__selectOwkItems(customOakLoadout);

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
        this.__selectOwkItems(this.OakItemSetup.PokemonCatch);

        if (hasBalls)
        {
            // Go to the highest route, for higher quest point income
            this.__goToHighestDungeonTokenIncomeRoute(ballType);
        }
    }

    /**
     * @brief Finds the best available route to farm the given @p pokemonType gems/pokemons
     *
     * The best route is the one that will give the most gems per game tick
     *
     * @param pokemonType: The pokemon type to look for
     *
     * @returns A struct { bestRoute, bestRouteRegion }, where:
     *          @c bestRoute is the best route number
     *          @c bestRouteRegion is the best route region number
     */
    static __findBestRouteForFarmingType(pokemonType)
    {
        let bestRoute = 0;
        let bestRouteRegion = 0;
        let bestRouteRate = 0;

        let playerClickAttack = App.game.party.calculateClickAttack();

        // Fortunately routes are sorted by attack
        Routes.regionRoutes.every(
            (route) =>
            {
                if (!route.isUnlocked())
                {
                    return false;
                }

                // Skip any route that we can't access
                if (!Automation.Utils.Route.__canMoveToRegion(route.region))
                {
                    return true;
                }

                let pokemons = RouteHelper.getAvailablePokemonList(route.number, route.region);

                let currentRouteCount = 0;
                pokemons.forEach(
                    (pokemon) =>
                    {
                        let pokemonData = pokemonMap[pokemon];

                        if (pokemonData.type.includes(pokemonType))
                        {
                            currentRouteCount++;
                        }
                    });

                let currentRouteRate = currentRouteCount / pokemons.length;

                let routeAvgHp = PokemonFactory.routeHealth(route.number, route.region);
                if (routeAvgHp > playerClickAttack)
                {
                    let nbClickToDefeat = Math.ceil(routeAvgHp / playerClickAttack);
                    currentRouteRate = currentRouteRate / nbClickToDefeat;
                }

                if (currentRouteRate > bestRouteRate)
                {
                    bestRoute = route.number;
                    bestRouteRegion = route.region;
                    bestRouteRate = currentRouteRate;
                }

                return true;
            }, this);

        return { bestRoute, bestRouteRegion };
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
     * @brief Updates the Oak item loadout with the provided @p loadoutCandidates
     *
     * The @p loadoutCandidates contains three items but the user might have less slots unlocked.
     *
     * @param loadoutCandidates: The wanted loadout composition
     */
    static __selectOwkItems(loadoutCandidates)
    {
        let possibleEquippedItem = 0;
        let expectedLoadout = loadoutCandidates.filter(
            (item) =>
            {
                // Skip any forbidden item
                if (item === Automation.Quest.__forbiddenItem)
                {
                    return false;
                }

                if (App.game.oakItems.itemList[item].isUnlocked())
                {
                    if (possibleEquippedItem < App.game.oakItems.maxActiveCount())
                    {
                        possibleEquippedItem++;
                        return true;
                    }
                }
                return false;
            });

        App.game.oakItems.deactivateAll();
        expectedLoadout.forEach(
            (item) =>
            {
                App.game.oakItems.activate(item);
            });
    }

    /**
     * @brief Moves the player to the most suitable route for dungeon token farming
     *
     * Such route is the ine giving the most token per game tick
     */
    static __goToHighestDungeonTokenIncomeRoute(ballTypeToUse)
    {
        let bestRoute = 0;
        let bestRouteRegion = 0;
        let bestRouteIncome = 0;

        let playerClickAttack = App.game.party.calculateClickAttack();
        let catchTimeTicks = App.game.pokeballs.calculateCatchTime(ballTypeToUse) / 50;

        // Fortunately routes are sorted by attack
        Routes.regionRoutes.every(
            (route) =>
            {
                if (!route.isUnlocked())
                {
                    return false;
                }

                // Skip any route that we can't access
                if (!Automation.Utils.Route.__canMoveToRegion(route.region))
                {
                    return true;
                }

                let routeIncome = PokemonFactory.routeDungeonTokens(route.number, route.region);

                let routeAvgHp = PokemonFactory.routeHealth(route.number, route.region);
                if (routeAvgHp > playerClickAttack)
                {
                    let nbClickToDefeat = Math.ceil(routeAvgHp / playerClickAttack);
                    routeIncome = routeIncome / (nbClickToDefeat + catchTimeTicks);
                }

                if (routeIncome > bestRouteIncome)
                {
                    bestRoute = route.number;
                    bestRouteRegion = route.region;
                    bestRouteIncome = routeIncome;
                }

                return true;
            }, this);

        if (player.route() !== bestRoute)
        {
            Automation.Utils.Route.__moveToRoute(bestRoute, bestRouteRegion);
        }
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
            && (localStorage.getItem("autoUseSmallRestoreEnabled") === "true"))
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
}
