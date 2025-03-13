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

        this.__internal__buildRouteMaxHealthData();
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
        if (((player.route === route) && (player.region === region))
            || !this.canMoveToRoute(route, region))
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

        const town = TownList[townName];

        // Don't move if the game would not allow it
        if (!this.canMoveToTown(town))
        {
            return;
        }

        // Move the player to the region first, if needed
        if (town.region != player.region)
        {
            MapHelper.moveToTown(GameConstants.DockTowns[town.region]);
            player.region = town.region;
        }
        player.subregion = town.subRegion;

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
        // player.town points to the last visited town, so we need to check if the current route is 0 as well
        return (player.route == 0) && (player.town.name == townName);
    }

    /**
     * @brief Checks if a subregion is Magikarp Jump
     *
     * @param {number} region: The region to check
     * @param {number} subRegion: The subregion to check
     *
     * @returns True if the given sub-region matches Magikarp Jump
     */
    static isInMagikarpJumpIsland(region, subRegion)
    {
        return ((region == GameConstants.Region.alola) && (subRegion == GameConstants.AlolaSubRegions.MagikarpJump));
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
        if (isNaN(region)
            || Automation.Utils.isInInstanceState()
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
     * @brief Determines if the player can move to the given @p town
     *
     * @param town: The game's town instance
     *
     * @returns True if the player can move to the town, false otherwise
     */
    static canMoveToTown(town)
    {
        // Moving to a town can only be performed if the player can move to its region and the town is accessible
        return this.canMoveToRegion(town.region) && town.isUnlocked();
    }

    /**
     * @brief Determines if the player can move to the given @p route, in the given @p region
     *
     * @param {number} route: The number of the route to move to
     * @param {number} region: The region number of the route to move to
     * @param routeData: The route data (for perf optimisation)
     *
     * @returns True if the player can move to the route, false otherwise
     */
    static canMoveToRoute(route, region, routeData = null)
    {
        if (!this.canMoveToRegion(region))
        {
            return false;
        }

        const routeObj = routeData ?? Routes.getRoute(region, route);
        if (!routeObj)
        {
            return false;
        }

        return routeObj.isUnlocked();
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

        const playerClickAttack = Automation.Utils.Battle.calculateClickAttack();

        // In case click attack is 0, use the pokemon attack instead (no-click challenge)
        let playerSingleAttackByRegion;
        if (playerClickAttack == 0)
        {
            playerSingleAttackByRegion = Automation.Utils.Battle.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);
        }
        else
        {
            playerSingleAttackByRegion = new Map();
            for (let regionId = GameConstants.Region.kanto; regionId <= GameConstants.MAX_AVAILABLE_REGION; regionId++)
            {
                playerSingleAttackByRegion.set(regionId, playerClickAttack);
            }
        }

        // We need to find a new road if:
        //    - The highest region changed
        //    - The player attack decreased (this can happen if the rocky helmet item was unequipped)
        //    - We are currently on the highest route of the map
        //    - The next best route is still over-powered
        const needsNewRoad = (this.__internal__lastHighestRegion !== player.highestRegion())
                          || (this.__internal__lastBestRouteData.maxHealth > playerSingleAttackByRegion.get(this.__internal__lastBestRouteData.route.region))
                          || ((this.__internal__lastNextBestRouteData != null)
                              && (this.__internal__lastNextBestRouteData.maxHealth < playerSingleAttackByRegion.get(this.__internal__lastNextBestRouteData.route.region)))
                          || !this.canMoveToRoute(this.__internal__lastBestRouteData.route.number, this.__internal__lastBestRouteData.route.region, this.__internal__lastBestRouteData.route.route);

        if (needsNewRoad)
        {
            this.__internal__lastHighestRegion = player.highestRegion();

            this.__internal__lastBestRouteData = null;
            this.__internal__lastNextBestRouteData = null;

            for (const routeData of this.__internal__routeMaxHealthData)
            {
                // Skip any route that we can't access
                if (!this.canMoveToRoute(routeData.route.number, routeData.route.region, routeData.route))
                {
                    continue;
                }

                // Skip Magikarp jump route, for now
                if (Automation.Utils.Route.isInMagikarpJumpIsland(routeData.route.region, routeData.route.subRegion))
                {
                    // TODO: Compute magikarp worst attack instead
                    continue;
                }

                if (routeData.maxHealth < playerSingleAttackByRegion.get(routeData.route.region))
                {
                    this.__internal__lastBestRouteData = routeData;

                    continue;
                }

                // Internal __internal__routeMaxHealthData routes are sorted by maxHealth so we can stop searching for better roads
                this.__internal__lastNextBestRouteData = routeData;
                break;
            }

            // This can happen if the player is in a new region and the docks are not unlocked yet
            if (this.__internal__lastBestRouteData == null)
            {
                // If no routes are below the user attack, just choose the 1st accessible ones
                const accessibleRoutes = Automation.Utils.Route.__internal__routeMaxHealthData.filter(
                    routeData => Automation.Utils.Route.canMoveToRoute(routeData.route.number, routeData.route.region, routeData.route))

                this.__internal__lastBestRouteData = accessibleRoutes[0];
                this.__internal__lastNextBestRouteData = accessibleRoutes[0];
            }
        }

        this.moveToRoute(this.__internal__lastBestRouteData.route.number, this.__internal__lastBestRouteData.route.region);
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

        const playerClickAttack = Automation.Utils.Battle.calculateClickAttack();
        const totalAtkPerSecondByRegion = Automation.Utils.Battle.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);
        const catchTimeTicks = App.game.pokeballs.calculateCatchTime(ballTypeToUse) / 50;

        // The bonus is the same, no matter the amount
        const dungeonTokenBonus = App.game.wallet.calcBonus(new Amount(1, GameConstants.Currency.dungeonToken));

        const pokeballBonus = App.game.pokeballs.getCatchBonus(ballTypeToUse);
        const oakBonus = App.game.oakItems.calculateBonus(OakItemType.Magic_Ball);

        // Fortunately routes are sorted by attack
        for (const route of Routes.regionRoutes)
        {
            // Skip any route that we can't access
            if (!this.canMoveToRoute(route.number, route.region, route))
            {
                continue;
            }

            // Skip Magikarp jump route, for now
            if (Automation.Utils.Route.isInMagikarpJumpIsland(route.region, route.subRegion))
            {
                // TODO: Compute magikarp worst attack instead
                continue;
            }

            const pokemons = RouteHelper.getAvailablePokemonList(route.number, route.region);

            let currentRouteRate = 0;
            for (const pokemon of pokemons)
            {
                currentRouteRate += PokemonFactory.catchRateHelper(pokemonMap[pokemon].catchRate, true);
            }

            currentRouteRate /= pokemons.length;
            currentRouteRate += pokeballBonus + oakBonus;

            let routeIncome = this.__internal__routeRawIncomeMap.get(route.region).get(route.number) * dungeonTokenBonus * (currentRouteRate / 100);

            const routeAvgHp = PokemonFactory.routeHealth(route.number, route.region);
            const nbGameTickToDefeat = Automation.Utils.Battle.getGameTickCountNeededToDefeatPokemon(
                routeAvgHp, playerClickAttack, totalAtkPerSecondByRegion.get(route.region));
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

        const playerClickAttack = Automation.Utils.Battle.calculateClickAttack();
        const totalAtkPerSecondByRegion = Automation.Utils.Battle.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);

        // Fortunately routes are sorted by attack
        for (const route of Routes.regionRoutes)
        {
            // Skip any route that we can't access
            if (!this.canMoveToRoute(route.number, route.region, route))
            {
                continue;
            }

            // Skip Magikarp jump route, for now
            if (Automation.Utils.Route.isInMagikarpJumpIsland(route.region, route.subRegion))
            {
                // TODO: Compute magikarp worst attack instead
                continue;
            }

            const pokemons = RouteHelper.getAvailablePokemonList(route.number, route.region);

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

            const routeAvgHp = PokemonFactory.routeHealth(route.number, route.region);
            const nbGameTickToDefeat = Automation.Utils.Battle.getGameTickCountNeededToDefeatPokemon(
                routeAvgHp, playerClickAttack, totalAtkPerSecondByRegion.get(route.region));
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

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    // List of { route, maxHealth }
    static __internal__routeMaxHealthData = [];

    static __internal__lastHighestRegion = null;
    static __internal__lastBestRouteData = null;
    static __internal__lastNextBestRouteData = null;

    static __internal__routeRawIncomeMap = new Map();

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
     * @brief Builds the [ { route, maxHealth } ] list containing each existing routes
     *
     * The result is stored as a member of this class @c __internal__routeMaxHealthData for further use
     */
    static __internal__buildRouteMaxHealthData()
    {
        for (const route of Routes.regionRoutes)
        {
            let routeMaxHealth = this.__internal__getRouteMaxHealth(route);
            this.__internal__routeMaxHealthData.push({ route: route, maxHealth: routeMaxHealth });
        }

        // Sort __internal__routeData by maxHealth
        this.__internal__routeMaxHealthData.sort((a, b) => a.maxHealth - b.maxHealth);
    }

    static __internal__buildRouteIncomeMap()
    {
        for (const route of Routes.regionRoutes)
        {
            if (route.region >= this.__internal__routeRawIncomeMap.size)
            {
                this.__internal__routeRawIncomeMap.set(route.region, new Map());
            }

            let routeIncome = PokemonFactory.routeDungeonTokens(route.number, route.region);

            this.__internal__routeRawIncomeMap.get(route.region).set(route.number, routeIncome);
        }
    }
}
