/**
 * @class The AutomationUtilsGym regroups helpers related to pokeclicker gyms
 */
class AutomationUtilsGym
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

        this.__internal__buildGymGemTypeMap();
    }

    /**
     * @brief Finds the best available gym to farm the given @p pokemonType gems/pokemons
     *
     * The best gym is the one that will give the most gems per game tick
     *
     * @param pokemonType: The pokemon type to look for
     *
     * @returns Null if no gym could be found, or a struct { Name, Town, Rate }, where:
     *          @c Name is the best gym name
     *          @c Town is the best gym town name
     *          @c Rate is the gem rate
     */
    static findBestGymForFarmingType(pokemonType)
    {
        let bestGymName = null;
        let bestGymTown = null;
        let bestGymRate = 0;

        const playerClickAttack = Automation.Utils.Battle.calculateClickAttack();
        const magikarpPlayerClickAttack = Automation.Utils.Battle.calculateClickAttack(true);
        const totalAtkPerSecondByRegion = Automation.Utils.Battle.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);

        for (const gymData of this.__internal__gymGemTypeMap.get(pokemonType))
        {
            const gym = GymList[gymData.gymName];

            // Skip any gym that we can't access
            if (!gym.isUnlocked()
                || !Automation.Utils.Route.canMoveToRegion(gymData.region))
            {
                continue;
            }

            // Some gyms are trials linked to a dungeon, don't consider those
            if (Automation.Utils.isInstanceOf(TownList[gymData.gymTown], "DungeonTown"))
            {
                continue;
            }

            const isMagikarpJump = Automation.Utils.Route.isInMagikarpJumpIsland(gymData.region, gymData.subRegion);
            const gymRegion = isMagikarpJump ? Automation.Utils.Battle.SpecialRegion.MagikarpJump
                                             : gymData.region;

            const currentGymClickAttack = isMagikarpJump ? magikarpPlayerClickAttack
                                                         : playerClickAttack;

            let currentGymGemPerClear = 0;
            let currentGymTickToClear = 0;
            const gymPokemons = gym.getPokemonList()
            for (const pokemon of gymPokemons)
            {
                const currentPokemonTickToDefeat = Automation.Utils.Battle.getGameTickCountNeededToDefeatPokemon(
                    pokemon.maxHealth, currentGymClickAttack, totalAtkPerSecondByRegion.get(gymRegion));
                currentGymTickToClear += currentPokemonTickToDefeat;

                const pokemonData = pokemonMap[pokemon.name];
                if (pokemonData.type.includes(pokemonType))
                {
                    currentGymGemPerClear += GameConstants.GYM_GEMS;
                }
            }

            const currentGymGemPerTick = currentGymGemPerClear / currentGymTickToClear;

            // Compare with a 1/1000 precision
            if (Math.ceil(currentGymGemPerTick * 1000) >= Math.ceil(bestGymRate * 1000))
            {
                bestGymName = gymData.gymName;
                bestGymTown = gymData.gymTown;
                bestGymRate = currentGymGemPerTick;
            }
        }

        return (bestGymName !== null) ? { Name: bestGymName, Town: bestGymTown, Rate: bestGymRate } : null;
    }

    /**
     * @brief Finds the most efficent gym to earn money
     *
     * @returns A struct { bestGym, bestGymTown }, where:
     *          @c bestGym is the best gym name
     *          @c bestGymTown is the best gym town name
     */
    static findBestGymForMoney()
    {
        // Move to the best Gym
        let bestGym = null;
        let bestGymTown = null;
        let bestGymRatio = 0;

        const playerClickAttack = Automation.Utils.Battle.calculateClickAttack();
        const magikarpPlayerClickAttack = Automation.Utils.Battle.calculateClickAttack(true);

        for (const key of Object.keys(GymList))
        {
            const gym = GymList[key];

            // Skip locked gyms
            if (!gym.isUnlocked())
            {
                continue;
            }

            // If it's a ligue champion is the target, its town points to the champion instead of the town
            let gymTown = gym.town;
            if (!TownList[gymTown])
            {
                gymTown = gym.parent.name;
            }

            // Some gyms are trials linked to a dungeon, don't consider those
            if (Automation.Utils.isInstanceOf(TownList[gymTown], "DungeonTown"))
            {
                continue;
            }

            const townRegion = TownList[gymTown].region;

            // Don't consider town that the player can't move to either
            if (!Automation.Utils.Route.canMoveToRegion(townRegion))
            {
                continue;
            }

            // Some champion have a team that depends on the player's starter pick
            if (Automation.Utils.isInstanceOf(gym, "Champion"))
            {
                gym.setPokemon(player.regionStarters[townRegion]());
            }

            const currentGymClickAttack = Automation.Utils.Route.isInMagikarpJumpIsland(townRegion, TownList[gymTown].subRegion)
                                        ? magikarpPlayerClickAttack
                                        : playerClickAttack;

            const weatherType = Weather.regionalWeather[townRegion]();

            const ticksToWin = gym.getPokemonList().reduce(
                (count, pokemon) =>
                {
                    const partyAttack =
                        Automation.Utils.Battle.calculatePokemonAttack(pokemonMap[pokemon.name].type[0], townRegion, weatherType);
                    const nbGameTickToDefeat = Automation.Utils.Battle.getGameTickCountNeededToDefeatPokemon(
                        pokemon.maxHealth, currentGymClickAttack, partyAttack);

                    return count + nbGameTickToDefeat;
                }, 0);

            const rewardRatio = Math.floor(gym.moneyReward / ticksToWin);

            if (rewardRatio > bestGymRatio)
            {
                bestGymTown = gymTown;
                bestGym = key;
                bestGymRatio = rewardRatio;
            }
        }

        return { bestGym, bestGymTown };
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__gymGemTypeMap = new Map();

    /**
     * @brief Builds the [ gemType => list(gyms)] map of list of gyms for each pokemon type
     *
     * The resulting map is stored as a member of this class @c __internal__gymGemTypeMap for further use
     */
    static __internal__buildGymGemTypeMap()
    {
        // Initialize the map for each gem types
        for (const gemType of Array(Gems.nTypes).keys())
        {
            this.__internal__gymGemTypeMap.set(gemType, []);
        }

        for (const gymName of Object.keys(GymList))
        {
            let gym = GymList[gymName];

            for (const pokemon of gym.getPokemonList())
            {
                let pokemonData = pokemonMap[pokemon.name];

                for (const type of pokemonData.type)
                {
                    let gemTypeData = this.__internal__gymGemTypeMap.get(type);

                    if ((gemTypeData.length == 0) || gemTypeData.at(-1).gymName != gymName)
                    {
                        let gymTown = gym.town;
                        // If a ligue champion is the target, the gymTown points to the champion instead of the town
                        if (!TownList[gymTown])
                        {
                            // If this happens, then it's a work in progress in pokeclicker's code-base
                            if (gym.parent == undefined)
                            {
                                continue;
                            }

                            gymTown = gym.parent.name;
                        }

                        gemTypeData.push({
                                             gymName: gymName,
                                             gymTown: gymTown,
                                             region: TownList[gymTown].region,
                                             subRegion: TownList[gymTown].subRegion
                                         });
                    }
                }
            }
        }
    }
}
