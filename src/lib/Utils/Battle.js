/**
 * @class The AutomationUtilsBattle regroups helpers related to pokeclicker battles
 */
class AutomationUtilsBattle
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

        this.__internal__buildPokemonAttackMap();
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
        let worstAtk = Number.MAX_SAFE_INTEGER;

        let weatherType = Weather.regionalWeather[region]();

        for (const type of Array(Gems.nTypes).keys())
        {
            let pokemonAttack = this.__internal__calculatePokemonAttack(type, region, weatherType);
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

    // Map [ pokemonId => { lastEffortPoints, lastAttackBonusAmount, [ attackPerType ], nativeRegion, pokemonData } ]
    static __internal__PokemonAttackMap = new Map();
    static __internal__lastPokemonAttackMapUpdate = 0;

    /**
     * @brief Updates the pokemon attack map
     */
    static __internal__buildPokemonAttackMap()
    {
        this.__internal__lastHighestRegion = player.highestRegion();

        for (const pokemon of App.game.party.caughtPokemon)
        {
            this.__internal__PokemonAttackMap.set(pokemon.id, this.__internal__getPokemonAttackInfo(pokemon));
        }

        this.__internal__lastPokemonAttackMapUpdate = Date.now();
    }

    /**
     * @brief Updates the pokemon attack map for each modified pokemons
     *        Only perform the update at most once every second
     */
    static __internal__updatePokemonAttackMap()
    {
        // Do not update more than once every second
        if ((Date.now() - this.__internal__lastPokemonAttackMapUpdate) < 1000)
        {
            return;
        }

        for (const pokemon of App.game.party.caughtPokemon)
        {
            if (!this.__internal__PokemonAttackMap.has(pokemon.id))
            {
                this.__internal__PokemonAttackMap.set(pokemon.id, this.__internal__getPokemonAttackInfo(pokemon));
            }
            else
            {
                let data = this.__internal__PokemonAttackMap.get(pokemon.id);
                if ((data.lastEffortPoints != pokemon.effortPoints) || (data.lastAttackBonusAmount != pokemon.attackBonusAmount))
                {
                    this.__internal__PokemonAttackMap.set(pokemon.id, this.__internal__getPokemonAttackInfo(pokemon));
                }
            }
        }

        this.__internal__lastPokemonAttackMapUpdate = Date.now();
    }

    /**
     * @brief Get the attack info of the given @p pokemon
     *
     * @param pokemon: The pokeclicker PartyPokemon instance to get the info of
     *
     * @returns the info related to the pokemon
     */
    static __internal__getPokemonAttackInfo(pokemon)
    {
        // Get the invariant pokemon attack
        let ignoreAttackDebuff = true;
        let includeBreeding = true;
        let ignoreLevel = true;
        let useBaseAttack = false;
        let weather = WeatherType.Clear; // No weather buff
        let includeFlute = false;
        let region = GameConstants.Region.none;

        let attackPerType = [];

        for (const type of Array(Gems.nTypes).keys())
        {
            let pokemonAttack = App.game.party.calculateOnePokemonAttack(
                pokemon, type, PokemonType.None, region, ignoreAttackDebuff, includeBreeding, useBaseAttack, weather, ignoreLevel, includeFlute);

            attackPerType.push(pokemonAttack);
        }

        // Effort points are used to compute EVs, attack bonus is increased each time the pokemon is hatched from an egg
        return {
                   lastEffortPoints: pokemon.effortPoints,
                   lastAttackBonusAmount: pokemon.attackBonusAmount,
                   attackPerType,
                   nativeRegion: PokemonHelper.calcNativeRegion(pokemon.name),
                   pokemonData: PokemonHelper.getPokemonByName(pokemon.name)
               };
    }

    /**
     * @brief Optimized version of pokéclicker's App.game.party.calculatePokemonAttack method
     *
     * @see https://github.com/pokeclicker/pokeclicker/blob/26fe119da094d14cb263c229549d9aeb2e6180bb/src/scripts/party/Party.ts#L124-L174
     *
     * @param {number} type: The pokemon type to fight
     * @param {number} region: The fight region
     * @param {number} weatherType: The weather type of the region
     *
     * @returns The calculated pokemon attack
     */
    static __internal__calculatePokemonAttack(type, region, weatherType)
    {
        this.__internal__updatePokemonAttackMap();

        let attack = 0;
        for (const pokemon of App.game.party.caughtPokemon)
        {
            if (!this.__internal__PokemonAttackMap.has(pokemon.id))
            {
                continue;
            }

            let storedData = this.__internal__PokemonAttackMap.get(pokemon.id);
            let pokemonAttack = storedData.attackPerType[type];

            // Apply the regional debuff
            if (App.game.challenges.list.regionalAttackDebuff.active()
                && (region != storedData.nativeRegion))
            {
                pokemonAttack *= App.game.party.getRegionAttackMultiplier();
            }

            // Apply weather bonus
            const weather = Weather.weatherConditions[weatherType];
            for (const bonus of weather.multipliers)
            {
                if (bonus.type == storedData.pokemonData.type1)
                {
                    pokemonAttack *= bonus.multiplier;
                }
                if (bonus.type == storedData.pokemonData.type2)
                {
                    pokemonAttack *= bonus.multiplier;
                }
            }

            // Apply flute bonus
            for (const bonus of FluteEffectRunner.activeGemTypes())
            {
                if (bonus.type == storedData.pokemonData.type1)
                {
                    pokemonAttack *= GameConstants.FLUTE_TYPE_ATTACK_MULTIPLIER;
                }
                if (bonus.type == storedData.pokemonData.type2)
                {
                    pokemonAttack *= GameConstants.FLUTE_TYPE_ATTACK_MULTIPLIER;
                }
            }

            attack += pokemonAttack;
        }

        const bonus = App.game.party.multiplier.getBonus('pokemonAttack');

        return Math.round(attack * bonus);
    }
}
