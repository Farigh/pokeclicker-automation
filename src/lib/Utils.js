/**
 * @class The AutomationUtils regroups any utility methods needed across the different functionalities
 */
class AutomationUtils
{
    /**
     * @brief Initializes the Utils components
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        this.Route.initialize(initStep);
    }

    /**
     * @class The OakItem inner-class
     */
    static OakItem = class AutomationOakItemUtils
    {
        static __forbiddenItem = null;

        /**
         * @class The Setup class lists the different setup to use based on the current objectives
         */
        static Setup = class AutomationOakItemUtilsSetup
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
         * @brief Updates the Oak item loadout with the provided @p loadoutCandidates
         *
         * The @p loadoutCandidates might contain more items than the user have unlocked.
         * In such case, the items will be equipped respecting the provided list order
         *
         * @param {Array} loadoutCandidates: The wanted loadout composition
         */
        static __equipLoadout(loadoutCandidates)
        {
            let possibleEquippedItem = 0;
            let expectedLoadout = loadoutCandidates.filter(
                (item) =>
                {
                    // Skip any forbidden item
                    if (item === this.__forbiddenItem)
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
                }, this);

            App.game.oakItems.deactivateAll();
            expectedLoadout.forEach(
                (item) =>
                {
                    App.game.oakItems.activate(item);
                });
        }
    }

    /**
     * @class The Route inner-class
     */
    static Route = class AutomationRouteUtils
    {
        // Map of Map [ region => [ route => maxHp ]]
        static __routeMaxHealthMap = new Map();

        static __lastHighestRegion = null;
        static __lastBestRouteRegion = null;
        static __lastBestRoute = null;
        static __lastNextBestRoute = null;
        static __lastNextBestRouteRegion = null;

        /**
         * @brief Initializes the class members
         *
         * @param initStep: The current automation init step
         */
        static initialize(initStep)
        {
            // Only consider the Finalize init step
            if (initStep != Automation.InitSteps.Finalize) return;

            this.__buildRouteMaxHealthMap();
        }

        /**
         * @brief Moves the player to the given @p route, in the @p region
         *
         * @param {number} route: The number of the route to move to
         * @param {number} region: The region number of the route to move to
         *
         * @note If the @p route or @p region have not been unlocked, no move will happen
         */
        static __moveToRoute(route, region)
        {
            // Don't move if the game would not allow it
            if (!this.__canMoveToRegion(region)
                || !MapHelper.accessToRoute(route, region))
            {
                return;
            }

            MapHelper.moveToRoute(route, region);
        }

        /**
         * @brief Moves the player to the town named @p townName
         *
         * @param townName: The name of the town to move to
         *
         * @note If the given town was not unlocked, no move will happen
         */
        static __moveToTown(townName)
        {
            let town = TownList[townName];

            // Don't move if the game would not allow it
            if (!this.__canMoveToRegion(town.region)
                || !town.isUnlocked())
            {
                return;
            }

            // Move the player to the region first, if needed
            if (town.region != player.region)
            {
                MapHelper.moveToTown(GameConstants.DockTowns[town.region]);
                player.region = town.region;
                player._subregion(0);
            }

            MapHelper.moveToTown(townName);
        }

        /**
         * @brief Checks if the player is allowed to move to the given @p region
         *
         * @param {number} region: The region number to move to
         *
         * @returns True if the player can mov to the region, False otherwise
         */
        static __canMoveToRegion(region)
        {
            // Not possible move
            if (Automation.Utils.__isInInstanceState()
                || (region > player.highestRegion())
                || (region < 0))
            {
                return false;
            }

            // Highest region restricts the inter-region moves until the docks are unlocked
            if ((player.region === player.highestRegion())
                && (region !== player.region))
            {
                return TownList[GameConstants.DockTowns[player.region]].isUnlocked();
            }

            return true;
        }

        /**
         * @brief Moves to the best available route for pokemon Exp farming
         *
         * The best route is the highest unlocked route where any pokemon can be defeated in a single click attack
         */
        static __moveToBestRouteForExp()
        {
            // Disable best route if any instance is in progress, and exit
            if (Automation.Utils.__isInInstanceState())
            {
                return;
            }

            let playerClickAttack = App.game.party.calculateClickAttack();

            // We need to find a new road if:
            //    - The highest region changed
            //    - The player attack decreased (this can happen if the poison bard item was unequiped)
            //    - We are currently on the highest route of the map
            //    - The next best route is still over-powered
            let needsNewRoad = (this.__lastHighestRegion !== player.highestRegion())
                            || (this.__routeMaxHealthMap.get(this.__lastBestRouteRegion).get(this.__lastBestRoute) > playerClickAttack)
                            || ((this.__lastNextBestRoute !== this.__lastBestRoute)
                                && (this.__routeMaxHealthMap.get(this.__lastNextBestRouteRegion).get(this.__lastNextBestRoute) < playerClickAttack));

            // Don't refresh if we already are on the best road
            if ((this.__lastBestRoute === player.route()) && !needsNewRoad)
            {
                return;
            }

            if (needsNewRoad)
            {
                this.__lastHighestRegion = player.highestRegion();

                // If no routes are below the user attack, just choose the 1st one
                this.__lastBestRoute = 0;
                this.__lastBestRouteRegion = 0;
                this.__lastNextBestRoute = 0;
                this.__lastNextBestRouteRegion = 0;

                // Fortunately routes are sorted by region and by attack
                Routes.regionRoutes.every(
                    (route) =>
                    {
                        // Skip any route that we can't access
                        if (!Automation.Utils.Route.__canMoveToRegion(route.region))
                        {
                            return true;
                        }

                        if (this.__routeMaxHealthMap.get(route.region).get(route.number) < playerClickAttack)
                        {
                            this.__lastBestRoute = route.number;
                            this.__lastBestRouteRegion = route.region;

                            return true;
                        }

                        this.__lastNextBestRoute = route.number;
                        this.__lastNextBestRouteRegion = route.region;
                        return false;
                    }, this);

                // This can happen if the player is in a new region and the docks are not unlocked yet
                if (this.__lastBestRoute == 0)
                {
                    let regionRoutes = Routes.getRoutesByRegion(player.region);
                    this.__lastBestRoute = regionRoutes[0].number;
                    this.__lastBestRouteRegion = regionRoutes[0].region;
                    this.__lastNextBestRoute = regionRoutes[1].number;
                    this.__lastNextBestRouteRegion = regionRoutes[1].region;
                }
            }

            this.__moveToRoute(this.__lastBestRoute, this.__lastBestRouteRegion);
        }

        /**
         * @brief Moves the player to the most suitable route for dungeon token farming
         *
         * Such route is the one giving the most token per game tick
         *
         * @param ballTypeToUse: The pokeball type that will be used (might have a different catch time)
         */
        static __moveToHighestDungeonTokenIncomeRoute(ballTypeToUse)
        {
            let bestRoute = 0;
            let bestRouteRegion = 0;
            let bestRouteIncome = 0;

            let playerClickAttack = App.game.party.calculateClickAttack();
            let playerWorstPokemonAttack = this.__getPlayerWorstPokemonAttack();
            let totalAtkPerSecond = (20 * playerClickAttack) + playerWorstPokemonAttack;
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
                    if (!this.__canMoveToRegion(route.region))
                    {
                        return true;
                    }

                    let routeIncome = PokemonFactory.routeDungeonTokens(route.number, route.region);

                    // Compute the bonus
                    routeIncome = Math.floor(routeIncome * App.game.wallet.calcBonus(new Amount(routeIncome, Currency.dungeonToken)));

                    let routeAvgHp = PokemonFactory.routeHealth(route.number, route.region);
                    let nbGameTickToDefeat = this.__getGameTickCountNeededToDefeatPokemon(routeAvgHp, playerClickAttack, totalAtkPerSecond);
                    routeIncome = (routeIncome / (nbGameTickToDefeat + catchTimeTicks));

                    if (routeIncome > bestRouteIncome)
                    {
                        bestRoute = route.number;
                        bestRouteRegion = route.region;
                        bestRouteIncome = routeIncome;
                    }

                    return true;
                }, this);

            if ((player.region !== bestRouteRegion)
                || (player.route() !== bestRoute))
            {
                this.__moveToRoute(bestRoute, bestRouteRegion);
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
            let playerWorstPokemonAttack = this.__getPlayerWorstPokemonAttack();
            let totalAtkPerSecond = (20 * playerClickAttack) + playerWorstPokemonAttack;

            // Fortunately routes are sorted by attack
            Routes.regionRoutes.every(
                (route) =>
                {
                    if (!route.isUnlocked())
                    {
                        return false;
                    }

                    // Skip any route that we can't access
                    if (!this.__canMoveToRegion(route.region))
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
                    let nbGameTickToDefeat = this.__getGameTickCountNeededToDefeatPokemon(routeAvgHp, playerClickAttack, totalAtkPerSecond);
                    currentRouteRate = currentRouteRate / nbGameTickToDefeat;

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
         * @brief Gets the highest HP amount that a pokemon can have on the given @p route
         *
         * @param route: The pokeclicker RegionRoute object
         *
         * @returns The computed route max HP
         */
        static __getRouteMaxHealth(route)
        {
            let routeMaxHealth = 0;
            RouteHelper.getAvailablePokemonList(route.number, route.region).forEach(
                (pokemonName) =>
                {
                    routeMaxHealth = Math.max(routeMaxHealth, this.__getPokemonMaxHealth(route, pokemonName));
                }, this);

            return routeMaxHealth;
        }

        /**
         * @brief Computes the maximum number of click needed to defeat a pokemon with the given @p pokemonHp
         *
         * @param {number} pokemonHp: The HP of the pokemon to defeat
         * @param {number} playerClickAttack: The current player click attack
         * @param {number} totalAtkPerSecond: The players total attack per seconds (click + pokemon)
         *
         * @returns The number of game ticks needed to defeat the pokemon
         */
        static __getGameTickCountNeededToDefeatPokemon(pokemonHp, playerClickAttack, totalAtkPerSecond)
        {
            let nbGameTickToDefeat = 1;
            let nbTicksPerSeconds = 20; // Based on https://github.com/pokeclicker/pokeclicker/blob/b5807ae2b8b14431e267d90563ae8944272e1679/src/scripts/Battle.ts#L55-L57

            if (pokemonHp > playerClickAttack)
            {
                nbGameTickToDefeat = Math.ceil(pokemonHp / playerClickAttack);

                if (nbGameTickToDefeat > nbTicksPerSeconds)
                {
                    // Compute the number of game tick considering click and pokemon attack
                    let nbSecondsToDefeat = Math.floor(pokemonHp / totalAtkPerSecond);
                    let leftLifeAfterPokemonAttack = pokemonHp % totalAtkPerSecond;
                    let nbClickForLifeLeft = Math.ceil(leftLifeAfterPokemonAttack / playerClickAttack);

                    nbGameTickToDefeat = (nbSecondsToDefeat * nbTicksPerSeconds) + Math.min(nbClickForLifeLeft, nbTicksPerSeconds);
                }
            }

            return nbGameTickToDefeat;
        }

        /**
         * @brief Computes the player's worst possible pokemon attack value against any pokemon
         *
         * @returns The lowest possible pokemon attack
         */
        static __getPlayerWorstPokemonAttack()
        {
            return [...Array(Gems.nTypes).keys()].reduce(
                (count, type) =>
                {
                    let pokemonAttack = App.game.party.calculatePokemonAttack(type);
                    return (pokemonAttack < count) ? pokemonAttack : count;
                }, Number.MAX_SAFE_INTEGER);
        }

        /**
         * @brief Gets the given @p pokemonName total HP on the given @p route
         *
         * @param route: The pokeclicker RegionRoute object
         * @param pokemonName: The name of the pokemon to compute the total HP of
         *
         * @returns The computed pokemon max HP
         */
        static __getPokemonMaxHealth(route, pokemonName)
        {
            // Based on https://github.com/pokeclicker/pokeclicker/blob/b5807ae2b8b14431e267d90563ae8944272e1679/src/scripts/pokemons/PokemonFactory.ts#L33
            let basePokemon = PokemonHelper.getPokemonByName(pokemonName);

            let getRouteAverageHp = function()
            {
                let poke = [...new Set(Object.values(Routes.getRoute(route.region, route.number).pokemon).flat().map(p => p.pokemon ?? p).flat())];
                let total = poke.map(p => pokemonMap[p].base.hitpoints).reduce((s, a) => s + a, 0);
                return total / poke.length;
            };

            let routeAvgHp = getRouteAverageHp();
            let routeHp = PokemonFactory.routeHealth(route.number, route.region);

            return Math.round((routeHp - (routeHp / 10)) + (routeHp / 10 / routeAvgHp * basePokemon.hitpoints));
        }

        /**
         * @brief Builds the [ region => [ route => maxHp ]] map of map for each existing routes
         *
         * The resulting map is stored as a member of this class @c __routeMaxHealthMap for further use
         */
        static __buildRouteMaxHealthMap()
        {
            Routes.regionRoutes.forEach(
                (route) =>
                {
                    if (route.region >= this.__routeMaxHealthMap.size)
                    {
                        this.__routeMaxHealthMap.set(route.region, new Map());
                    }

                    let routeMaxHealth = this.__getRouteMaxHealth(route);
                    this.__routeMaxHealthMap.get(route.region).set(route.number, routeMaxHealth);
                }, this);
        }
    }

    /**
     * @brief Adds a pokeclicker notification using the given @p message
     *        The notification is a blue one, without sound and with the "Automation" title
     *
     * @param {string} message: The notification message
     * @param {string} module: [optional] The automation module name
     */
    static __sendNotif(message, module = null)
    {
        if (localStorage.getItem("automationNotificationsEnabled") == "true")
        {
            let titleStr = "Automation";
            if (module !== null)
            {
                titleStr += " > " + module;
            }

            Notifier.notify({
                                title: titleStr,
                                message: message,
                                type: NotificationConstants.NotificationOption.primary,
                                timeout: 3000,
                            });
        }
    }

    /**
     * @brief Adds a pokeclicker warning notification using the given @p message
     *        The notification is a yellow one, without sound and with the "Automation" title
     *
     * @param {string} message: The warning notification message
     * @param {string} module: [optional] The automation module name
     */
    static __sendWarningNotif(message, module = null)
    {
        if (localStorage.getItem("automationNotificationsEnabled") == "true")
        {
            let titleStr = "Automation";
            if (module !== null)
            {
                titleStr += " > " + module;
            }

            Notifier.notify({
                                title: titleStr,
                                message: message,
                                type: NotificationConstants.NotificationOption.warning,
                                timeout: 10000,
                            });
        }
    }

    /**
     * @brief Checks if the player is in an instance states
     *
     * Is considered an instance any state in which the player can't acces the map anymore.
     * The following states are considered:
     *   - Dungeon
     *   - Battle frontier
     *   - Temporary battle
     *   - Safari
     *
     * Some actions are not allowed in instance states, like moving to another location.
     *
     * @returns True if the player is in an instance, False otherwise
     */
    static __isInInstanceState()
    {
        return (App.game.gameState === GameConstants.GameState.dungeon)
            || (App.game.gameState === GameConstants.GameState.battleFrontier)
            || (App.game.gameState === GameConstants.GameState.temporaryBattle)
            || (App.game.gameState === GameConstants.GameState.safari);
    }

    /**
     * @brief Checks if two arrays are equals
     *
     * Arrays are equals if:
     *   - They both are arrays
     *   - Their length is the same
     *   - Their content is the same and at the same index
     *
     * @param {Array} a: The first array
     * @param {Array} b: The second array
     *
     * @returns True if the arrays are equals, False otherwise
     */
    static __areArrayEquals(a, b)
    {
        return Array.isArray(a)
            && Array.isArray(b)
            && (a.length === b.length)
            && a.every((val, index) => val === b[index]);
    }
}