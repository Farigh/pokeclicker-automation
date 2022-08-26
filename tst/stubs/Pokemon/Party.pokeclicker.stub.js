// Stub of : https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/party/Party.ts#L5
class Party
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    // Stripped: multiplier
    constructor()
    {
        this.caughtPokemon = [];
        this.multiplier = new Multiplier();
        this.__caughtPokemonMap = new Map();
        this.__clickAttack = 0;
    }

    alreadyCaughtPokemon(id, shiny = false)
    {
        const pokemon = this.getPokemon(id);
        if (pokemon)
        {
            return (!shiny || pokemon.shiny);
        }
        return false;
    }

    calculateClickAttack()
    {
        return this.__clickAttack;
    }

    calculatePokemonAttack(type1 = PokemonType.None, type2 = PokemonType.None, ignoreRegionMultiplier = false, region = player.region,
                           includeBreeding = false, useBaseAttack = false, overrideWeather = null, ignoreLevel = false, includeFlute = true)
    {
        let attack = 0;
        for (const pokemon of this.caughtPokemon)
        {
            attack += this.calculateOnePokemonAttack(
                pokemon, type1, type2, region, ignoreRegionMultiplier, includeBreeding, useBaseAttack, overrideWeather, ignoreLevel, includeFlute);
        }

        const bonus = this.multiplier.getBonus('pokemonAttack');

        return Math.round(attack * bonus);
    }

    calculateOnePokemonAttack(pokemon, type1 = PokemonType.None, type2 = PokemonType.None,
                              region = player.region, ignoreRegionMultiplier = false,
                              includeBreeding = false, useBaseAttack = false, overrideWeather = null,
                              ignoreLevel = false, includeFlute = true)
    {
        let multiplier = 1
        let  attack = 0;
        const pAttack = useBaseAttack ? pokemon.baseAttack : (ignoreLevel ? pokemon.calculateAttack(ignoreLevel) : pokemon.attack);
        const nativeRegion = PokemonHelper.calcNativeRegion(pokemon.name);

        // Check if the pokemon is in their native region
        if (!ignoreRegionMultiplier && nativeRegion != region && nativeRegion != GameConstants.Region.none)
        {
            // Check if the challenge mode is active
            if (App.game.challenges.list.regionalAttackDebuff.active())
            {
                // Pokemon only retain a % of their total damage in other regions based on highest region.
                multiplier = this.getRegionAttackMultiplier();
            }
        }

        // Check if the Pokemon is currently breeding (no attack)
        if (includeBreeding || !pokemon.breeding)
        {
            if (type1 == PokemonType.None)
            {
                attack = pAttack * multiplier;
            }
            else
            {
                const dataPokemon = PokemonHelper.getPokemonByName(pokemon.name);
                attack = pAttack * TypeHelper.getAttackModifier(dataPokemon.type1, dataPokemon.type2, type1, type2) * multiplier;
            }
        }

        // Weather boost
        const weather = Weather.weatherConditions[overrideWeather ?? Weather.currentWeather()];
        const dataPokemon = PokemonHelper.getPokemonByName(pokemon.name);
        weather.multipliers?.forEach(
            (value) =>
            {
                if (value.type == dataPokemon.type1)
                {
                    attack *= value.multiplier;
                }
                if (value.type == dataPokemon.type2)
                {
                    attack *= value.multiplier;
                }
            });

        // Should we take flute boost into account
        if (includeFlute)
        {
            const dataPokemon = PokemonHelper.getPokemonByName(pokemon.name);
            FluteEffectRunner.activeGemTypes().forEach(
                (value) =>
                {
                    if (value == dataPokemon.type1)
                    {
                        attack *= GameConstants.FLUTE_TYPE_ATTACK_MULTIPLIER;
                    }
                    if (value == dataPokemon.type2)
                    {
                        attack *= GameConstants.FLUTE_TYPE_ATTACK_MULTIPLIER;
                    }
                });
        }

        return attack;
    }

    gainPokemonById(id)
    {
        if (this.__caughtPokemonMap.has(id))
        {
            return;
        }

        const pokemonData = pokemonMap[id];
        this.__addCaughtPokemon(id, pokemonData.name, pokemonData.base.attack, false);
    }

    getPokemon(id)
    {
        return this.__caughtPokemonMap.get(id);
    }

    getRegionAttackMultiplier(highestRegion = player.highestRegion())
    {
        return Math.min(1, Math.max(0.2, 0.1 + (highestRegion / 10)));
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    __reset()
    {
        this.caughtPokemon = [];
        this.__caughtPokemonMap = new Map();
    }

    __addCaughtPokemon(id, name, baseAttack, shiny)
    {
        let pokemon = new PartyPokemon(id, name, baseAttack, shiny);
        this.caughtPokemon.push(pokemon);
        this.__caughtPokemonMap.set(id, pokemon);
    }
}
