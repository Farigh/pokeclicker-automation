/**
 * @class The AutomationUtilsBattle regroups helpers related to pokeclicker battles
 */
class AutomationUtilsBattle
{
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
}
