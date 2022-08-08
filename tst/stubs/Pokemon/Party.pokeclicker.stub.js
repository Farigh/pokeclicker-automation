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
        this.__caughtPokemonMap = new Map();
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

    gainPokemonById(id)
    {
        const pokemonData = pokemonMap[id];
        this.__addCaughtPokemon(id, pokemonData.name, pokemonData.base.attack, false);
    }

    getPokemon(id)
    {
        return this.__caughtPokemonMap.get(id);
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
