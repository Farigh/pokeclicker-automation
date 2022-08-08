let pokemonMap = new Object();

// Stub of : https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/pokemons/PokemonHelper.ts#L21
class PokemonHelper
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    static getPokemonByName(name)
    {
        let pokemonData = pokemonMap[name];
        if (pokemonData === undefined)
        {
            throw AutomationTestUtils.formatErrors(`Cound not find pokemon named '${name}'`);
        }

        return new DataPokemon(pokemonData.id, pokemonData.name);
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    static __registerPokemon(name, id)
    {
        if (pokemonMap[name] !== undefined)
        {
            throw AutomationTestUtils.formatErrors(`Trying to register pokemon named '${name}' twice`);
        }

        if (pokemonMap[id] !== undefined)
        {
            throw AutomationTestUtils.formatErrors(`Trying to register pokemon with the id '${id}' twice`);
        }

        pokemonMap[name] = new TmpPokemonListData(id, name);
        pokemonMap[id] = pokemonMap[name];
        App.game.statistics.__addPokemon(id);
    }
}
