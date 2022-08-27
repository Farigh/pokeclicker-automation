// Stub of https://github.com/pokeclicker/pokeclicker/blob/e0bd144639479bd27efc3be648d380e6482f1eae/src/scripts/wildBattle/RouteHelper.ts#L7
class RouteHelper
{
    /**
     * Retrieves a list of all Pokémon that can be caught on that route.
     * @param route
     * @param region
     * @param includeHeadbutt
     * @returns {string[]} list of all Pokémon that can be caught
     */
    static getAvailablePokemonList(route, region, includeHeadbutt = true)
    {
        // If the route is somehow higher than allowed, use the first route to generateWildPokemon Pokémon
        const possiblePokemons = Routes.getRoute(region, route)?.pokemon;
        if (!possiblePokemons)
        {
            return ['Rattata'];
        }

        // Land Pokémon
        let pokemonList = possiblePokemons.land;

        // Water Pokémon
        // Skipped KeyItemType.Super_rod requirement
        pokemonList = pokemonList.concat(possiblePokemons.water);

        // Headbutt Pokémon
        if (includeHeadbutt)
        {
            pokemonList = pokemonList.concat(possiblePokemons.headbutt);
        }

        // Skipped special pokemons

        return pokemonList;
    }
}
