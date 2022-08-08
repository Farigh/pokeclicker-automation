let pokemonMap = new Object();

// Stub of : https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/pokemons/PokemonHelper.ts#L21
class PokemonHelper
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    static getPokemonByName(name)
    {
        let basePokemon = pokemonMap[name];
        if (basePokemon === undefined)
        {
            throw AutomationTestUtils.formatErrors(`Cound not find pokemon named '${name}'`);
        }

        const type1 = basePokemon.type[0];
        const type2 = basePokemon.type[1] ?? PokemonType.None;

        return new DataPokemon(basePokemon.id, basePokemon.name, basePokemon.eggCycles, type1, type2);
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    static __registerPokemon(name, id, base, type, eggCycles)
    {
        if (pokemonMap[name] !== undefined)
        {
            throw AutomationTestUtils.formatErrors(`Trying to register pokemon named '${name}' twice`);
        }

        if (pokemonMap[id] !== undefined)
        {
            throw AutomationTestUtils.formatErrors(`Trying to register pokemon with the id '${id}' twice`);
        }

        pokemonMap[name] = new TmpPokemonListData(id, name, type, base, eggCycles);
        pokemonMap[id] = pokemonMap[name];
        App.game.statistics.__addPokemon(id);
    }
}
