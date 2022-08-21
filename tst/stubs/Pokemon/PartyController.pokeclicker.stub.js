// Stub of https://github.com/pokeclicker/pokeclicker/blob/develop/src/scripts/party/PartyController.ts#L3
class PartyController
{
    static calculateRegionalMultiplier(pokemon, region)
    {
        if (region > -1 && PokemonHelper.calcNativeRegion(pokemon.name) !== region)
        {
            return App.game.party.getRegionAttackMultiplier();
        }
        return 1.0;
    }

    static getCaughtStatusByName(name)
    {
        return this.getCaughtStatus(PokemonHelper.getPokemonByName(name).id);
    }

    static getCaughtStatus(id)
    {
        if (App.game.party.alreadyCaughtPokemon(id, true))
        {
            return CaughtStatus.CaughtShiny;
        }

        if (App.game.party.alreadyCaughtPokemon(id, false))
        {
            return CaughtStatus.Caught;
        }

        return CaughtStatus.NotCaught;
    }
}
