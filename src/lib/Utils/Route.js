/**
 * @class The AutomationUtilsRoute regroups helpers related to pokeclicker routes
 */
class AutomationUtilsRoute
{
    /**
     * @brief Initializes the class members
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        // Only consider the Finalize init step
        if (initStep != Automation.InitSteps.Finalize) return;

        this.__internal__buildRouteMaxHealthMap();
        this.__internal__buildRouteIncomeMap();
    }

    /**
     * @brief Moves the player to the given @p route, in the @p region
     *
     * @param {number} route: The number of the route to move to
     * @param {number} region: The region number of the route to move to
     *
     * @note If the @p route or @p region have not been unlocked, no move will happen
     */
    static moveToRoute(route, region)
    {
        // Don't move if the player is already there, or the game would not allow it
        if (((player.route() === route) && (player.region === region))
            || !this.canMoveToRegion(region)
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
    static moveToTown(townName)
    {
        // If the player is already in the right town, there's nothing to do
        if (this.isPlayerInTown(townName))
        {
            return;
        }

        let town = TownList[townName];

        // Don't move if the game would not allow it
        if (!this.canMoveToRegion(town.region)
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
     * @brief Checks if the player is in the provided @p townName
     *
     * @param {string} townName: The name of the town to check
     *
     * @returns True if the player is in the town, false otherwise
     */
    static isPlayerInTown(townName)
    {
        // player.town() points to the last visited town, so we need to check if the current route is 0 as well
        return (player.route() == 0) && (player.town().name == townName);
    }

    /**
     * @brief Checks if the player is allowed to move to the given @p region
     *
     * @param {number} region: The region number to move to
     *
     * @returns True if the player can mov to the region, False otherwise
     */
    static canMoveToRegion(region)
    {
        // Not possible move
        if (Automation.Utils.isInInstanceState()
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
    static moveToBestRouteForExp()
    {
        // Disable best route if any instance is in progress, and exit
        if (Automation.Utils.isInInstanceState())
        {
            return;
        }

        let playerClickAttack = App.game.party.calculateClickAttack();

        // We need to find a new road if:
        //    - The highest region changed
        //    - The player attack decreased (this can happen if the rocky helmet item was unequipped)
        //    - We are currently on the highest route of the map
        //    - The next best route is still over-powered
        let needsNewRoad = (this.__internal__lastHighestRegion !== player.highestRegion())
                        || (this.__internal__routeMaxHealthMap.get(this.__internal__lastBestRouteRegion).get(this.__internal__lastBestRoute) > playerClickAttack)
                        || ((this.__internal__lastNextBestRoute !== this.__internal__lastBestRoute)
                            && (this.__internal__routeMaxHealthMap.get(this.__internal__lastNextBestRouteRegion).get(this.__internal__lastNextBestRoute) < playerClickAttack));

        // Don't refresh if we already are on the best road
        if ((this.__internal__lastBestRoute === player.route())
            && (this.__internal__lastBestRouteRegion === player.region)
            && !needsNewRoad)
        {
            return;
        }

        if (needsNewRoad)
        {
            this.__internal__lastHighestRegion = player.highestRegion();

            // If no routes are below the user attack, just choose the 1st one
            this.__internal__lastBestRoute = 0;
            this.__internal__lastBestRouteRegion = 0;
            this.__internal__lastNextBestRoute = 0;
            this.__internal__lastNextBestRouteRegion = 0;

            // Fortunately routes are sorted by region and by attack
            for (const route of Routes.regionRoutes)
            {
                // Skip any route that we can't access
                if (!this.canMoveToRegion(route.region))
                {
                    continue;
                }

                if (this.__internal__routeMaxHealthMap.get(route.region).get(route.number) < playerClickAttack)
                {
                    this.__internal__lastBestRoute = route.number;
                    this.__internal__lastBestRouteRegion = route.region;

                    continue;
                }

                this.__internal__lastNextBestRoute = route.number;
                this.__internal__lastNextBestRouteRegion = route.region;
                break;
            }

            // This can happen if the player is in a new region and the docks are not unlocked yet
            if (this.__internal__lastBestRoute == 0)
            {
                let regionRoutes = Routes.getRoutesByRegion(player.region);
                this.__internal__lastBestRoute = regionRoutes[0].number;
                this.__internal__lastBestRouteRegion = regionRoutes[0].region;
                this.__internal__lastNextBestRoute = regionRoutes[1].number;
                this.__internal__lastNextBestRouteRegion = regionRoutes[1].region;
            }
        }

        this.moveToRoute(this.__internal__lastBestRoute, this.__internal__lastBestRouteRegion);
    }

    /**
     * @brief Moves the player to the most suitable route for dungeon token farming
     *
     * Such route is the one giving the most token per game tick
     *
     * @param ballTypeToUse: The pokeball type that will be used (might have a different catch time)
     */
    static moveToHighestDungeonTokenIncomeRoute(ballTypeToUse)
    {
        let bestRoute = 0;
        let bestRouteRegion = 0;
        let bestRouteIncome = 0;

        let playerClickAttack = App.game.party.calculateClickAttack();
        let totalAtkPerSecondByRegion = this.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);
        let catchTimeTicks = App.game.pokeballs.calculateCatchTime(ballTypeToUse) / 50;

        // Fortunately routes are sorted by attack
        for (const route of Routes.regionRoutes)
        {
            // Skip any route that we can't access
            if (!route.isUnlocked() || !this.canMoveToRegion(route.region))
            {
                continue;
            }

            let routeIncome = this.__internal__routeIncomeMap.get(route.region).get(route.number);

            let routeAvgHp = PokemonFactory.routeHealth(route.number, route.region);
            let nbGameTickToDefeat =
                this.getGameTickCountNeededToDefeatPokemon(routeAvgHp, playerClickAttack, totalAtkPerSecondByRegion[route.region]);
            routeIncome = (routeIncome / (nbGameTickToDefeat + catchTimeTicks));

            // Compare with a 1/1000 precision
            if (Math.ceil(routeIncome * 1000) >= Math.ceil(bestRouteIncome * 1000))
            {
                bestRoute = route.number;
                bestRouteRegion = route.region;
                bestRouteIncome = routeIncome;
            }
        }

        this.moveToRoute(bestRoute, bestRouteRegion);
    }

    /**
     * @brief Finds the best available route to farm the given @p pokemonType gems/pokemons
     *
     * The best route is the one that will give the most gems per game tick
     *
     * @param pokemonType: The pokemon type to look for
     *
     * @returns A struct { Route, Region, Rate }, where:
     *          @c Route is the best route number
     *          @c Region is the best route region number
     *          @c Rate is the best route gem rate
     */
    static findBestRouteForFarmingType(pokemonType)
    {
        let bestRoute = 0;
        let bestRouteRegion = 0;
        let bestRouteRate = 0;

        let playerClickAttack = App.game.party.calculateClickAttack();
        let totalAtkPerSecondByRegion = this.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);

        // Fortunately routes are sorted by attack
        for (const route of Routes.regionRoutes)
        {
            // Skip any route that we can't access
            if (!route.isUnlocked() || !this.canMoveToRegion(route.region))
            {
                continue;
            }

            let pokemons = RouteHelper.getAvailablePokemonList(route.number, route.region);

            let currentRouteCount = 0;
            for (const pokemon of pokemons)
            {
                let pokemonData = pokemonMap[pokemon];

                if (pokemonData.type.includes(pokemonType))
                {
                    currentRouteCount++;
                }
            }

            let currentRouteRate = currentRouteCount / pokemons.length;

            let routeAvgHp = PokemonFactory.routeHealth(route.number, route.region);
            let nbGameTickToDefeat =
                this.getGameTickCountNeededToDefeatPokemon(routeAvgHp, playerClickAttack, totalAtkPerSecondByRegion[route.region]);
            currentRouteRate = currentRouteRate / nbGameTickToDefeat;

            // Compare with a 1/1000 precision
            if (Math.ceil(currentRouteRate * 1000) >= Math.ceil(bestRouteRate * 1000))
            {
                bestRoute = route.number;
                bestRouteRegion = route.region;
                bestRouteRate = currentRouteRate;
            }
        }

        return { Route: bestRoute, Region: bestRouteRegion, Rate: bestRouteRate };
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
    static getGameTickCountNeededToDefeatPokemon(pokemonHp, playerClickAttack, totalAtkPerSecond)
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
     * @brief Computes the player's worst possible attack value against any pokemon for each region
     *
     * @param {number} playerClickAttack: The current player click attack
     *
     * @returns The list of lowest possible attack for each region
     */
    static getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack)
    {
        let worstAtks = [];

        // Populate the list
        for (let regionId = GameConstants.Region.kanto; regionId <= GameConstants.MAX_AVAILABLE_REGION; regionId++)
        {
            worstAtks.push((20 * playerClickAttack) + this.getPlayerWorstPokemonAttack(regionId));
        }

        return worstAtks;
    }

    /**
     * @brief Computes the player's worst possible pokemon attack value against any pokemon
     *
     * @param {number} region: The region to consider
     *
     * @returns The lowest possible pokemon attack
     */
    static getPlayerWorstPokemonAttack(region)
    {
        let worstAtk = Number.MAX_SAFE_INTEGER

        let ignoreDebuff = !App.game.challenges.list.regionalAttackDebuff.active();
        let ignoreBreeding = true;
        let ignoreLevel = true;
        let useBaseAttack = false;
        let weather = Weather.regionalWeather[region]();

        for (const type of Array(Gems.nTypes).keys())
        {
            let pokemonAttack = App.game.party.calculatePokemonAttack(
                type, PokemonType.None, ignoreDebuff, region, ignoreBreeding, useBaseAttack, weather, ignoreLevel);
            if (pokemonAttack < worstAtk)
            {
                worstAtk = pokemonAttack
            }
        }

        return worstAtk;
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    // Map of Map [ region => [ route => maxHp ]]
    static __internal__routeMaxHealthMap = new Map();

    static __internal__lastHighestRegion = null;
    static __internal__lastBestRouteRegion = null;
    static __internal__lastBestRoute = null;
    static __internal__lastNextBestRoute = null;
    static __internal__lastNextBestRouteRegion = null;
    static __internal__routeIncomeMap = new Map();

    /**
     * @brief Gets the highest HP amount that a pokemon can have on the given @p route
     *
     * @param route: The pokeclicker RegionRoute object
     *
     * @returns The computed route max HP
     */
    static __internal__getRouteMaxHealth(route)
    {
        let routeMaxHealth = 0;
        for (const pokemonName of RouteHelper.getAvailablePokemonList(route.number, route.region))
        {
            routeMaxHealth = Math.max(routeMaxHealth, this.__internal__getPokemonMaxHealth(route, pokemonName));
        }

        return routeMaxHealth;
    }

    /**
     * @brief Gets the given @p pokemonName total HP on the given @p route
     *
     * @param route: The pokeclicker RegionRoute object
     * @param pokemonName: The name of the pokemon to compute the total HP of
     *
     * @returns The computed pokemon max HP
     */
    static __internal__getPokemonMaxHealth(route, pokemonName)
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
     * The resulting map is stored as a member of this class @c __internal__routeMaxHealthMap for further use
     */
    static __internal__buildRouteMaxHealthMap()
    {
        for (const route of Routes.regionRoutes)
        {
            if (route.region >= this.__internal__routeMaxHealthMap.size)
            {
                this.__internal__routeMaxHealthMap.set(route.region, new Map());
            }

            let routeMaxHealth = this.__internal__getRouteMaxHealth(route);
            this.__internal__routeMaxHealthMap.get(route.region).set(route.number, routeMaxHealth);
        }
    }

    static __internal__buildRouteIncomeMap()
    {
        for (const route of Routes.regionRoutes)
        {
            if (route.region >= this.__internal__routeIncomeMap.size)
            {
                this.__internal__routeIncomeMap.set(route.region, new Map());
            }

            let routeIncome = PokemonFactory.routeDungeonTokens(route.number, route.region);

            // Compute the bonus
            routeIncome = Math.floor(routeIncome * App.game.wallet.calcBonus(new Amount(routeIncome, Currency.dungeonToken)));

            this.__internal__routeIncomeMap.get(route.region).set(route.number, routeIncome);
        }
    }
}
