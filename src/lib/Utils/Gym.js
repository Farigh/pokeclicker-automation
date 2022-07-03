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
     * @returns Null if no gym could be found, or a struct { bestGymName, bestGymTown }, where:
     *          @c bestGymName is the best gym name
     *          @c bestGymTown is the best gym town name
     */
    static findBestGymForFarmingType(pokemonType)
    {
        let bestGymName = null;
        let bestGymTown = null;
        let bestGymRate = 0;

        let playerClickAttack = App.game.party.calculateClickAttack();
        let playerWorstPokemonAttack = Automation.Utils.Route.getPlayerWorstPokemonAttack();
        let totalAtkPerSecond = (20 * playerClickAttack) + playerWorstPokemonAttack;

        this.__internal__gymGemTypeMap.get(pokemonType).forEach(
            (gymData) =>
            {
                let gym = GymList[gymData.gymName];

                // Skip any gym that we can't access
                if (!gym.isUnlocked()
                    || !Automation.Utils.Route.canMoveToRegion(gymData.region))
                {
                    return;
                }

                let currentGymGemPerTick = 0;
                gym.pokemons.forEach(
                    (pokemon) =>
                    {
                        let pokemonData = pokemonMap[pokemon.name];
                        if (!pokemonData.type.includes(pokemonType))
                        {
                            return;
                        }

                        let currentPokemonTickToDefeat =
                            Automation.Utils.Route.getGameTickCountNeededToDefeatPokemon(pokemon.maxHealth, playerClickAttack, totalAtkPerSecond);
                        currentGymGemPerTick += (GameConstants.GYM_GEMS / currentPokemonTickToDefeat);
                    });

                // TODO (26/06/2022): Be more precise, all pokemons do not have the same health
                currentGymGemPerTick /= gym.pokemons.length;

                if (currentGymGemPerTick > bestGymRate)
                {
                    bestGymName = gymData.gymName;
                    bestGymTown = gymData.gymTown;
                    bestGymRate = currentGymGemPerTick;
                }
            });

        return (bestGymName !== null) ? { Name: bestGymName, Town: bestGymTown } : null;
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
        let playerClickAttack = App.game.party.calculateClickAttack();
        Object.keys(GymList).forEach(
            (key) =>
            {
                let gym = GymList[key];

                // Skip locked gyms
                if (!gym.isUnlocked())
                {
                    return;
                }

                // If it's a ligue champion is the target, its town points to the champion instead of the town
                let gymTown = gym.town;
                if (!TownList[gymTown])
                {
                    gymTown = gym.parent.name;
                }

                // Some gyms are trials linked to a dungeon, don't consider those
                if (TownList[gymTown] instanceof DungeonTown)
                {
                    return;
                }

                // Don't consider town that the player can't move to either
                if (!Automation.Utils.Route.canMoveToRegion(gymTown.region))
                {
                    return;
                }

                // Some champion have a team that depends on the player's starter pick
                if (gym instanceof Champion)
                {
                    gym.setPokemon(player.regionStarters[player.region]());
                }

                let ticksToWin = gym.pokemons.reduce((count, pokemon) => count + Math.ceil(pokemon.maxHealth / playerClickAttack), 0);
                let rewardRatio = Math.floor(gym.moneyReward / ticksToWin);

                if (rewardRatio > bestGymRatio)
                {
                    bestGymTown = gymTown;
                    bestGym = key;
                    bestGymRatio = rewardRatio;
                }
            });

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
        [...Array(Gems.nTypes).keys()].forEach(
            (gemType) =>
            {
                this.__internal__gymGemTypeMap.set(gemType, []);
            }, this);

        Object.keys(GymList).forEach(
            (gymName) =>
            {
                let gym = GymList[gymName];

                gym.pokemons.forEach(
                    (pokemon) =>
                    {
                        let pokemonData = pokemonMap[pokemon.name];

                        pokemonData.type.forEach(
                            (type) =>
                            {
                                let gemTypeData = this.__internal__gymGemTypeMap.get(type);

                                if ((gemTypeData.length == 0) || gemTypeData[gemTypeData.length - 1].gymName != gymName)
                                {
                                    let gymTown = gym.town;
                                    // If a ligue champion is the target, the gymTown points to the champion instead of the town
                                    if (!TownList[gymTown])
                                    {
                                        // If this happens, then it's a work in progress in pokeclicker code-base
                                        if (gym.parent == undefined)
                                        {
                                            return;
                                        }

                                        gymTown = gym.parent.name;
                                    }

                                    gemTypeData.push({
                                                         gymName: gymName,
                                                         gymTown: gymTown,
                                                         region: TownList[gymTown].region,
                                                         pokemonMathingType: 1,
                                                         totalPokemons: gym.pokemons.length
                                                     });
                                }
                                else
                                {
                                    gemTypeData[gemTypeData.length - 1].pokemonMathingType += 1;
                                }
                            }, this);
                    }, this);
            }, this);
    }
}
