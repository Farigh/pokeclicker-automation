// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/breeding/Egg.ts#L5
class Egg
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    // Stripped: shinyChance, notified
    constructor(type = EggType.None, totalSteps = 0, pokemon = "MissingNo.", steps = 0)
    {
        this.partyPokemon = function() { return this.__partyPokemon; }.bind(this);
        this.pokemon = pokemon;
        this.steps = function() { return this.__steps; }.bind(this);
        this.totalSteps = totalSteps;
        this.type = type;

        this.__partyPokemon = null;
        this.__steps = steps;

        this.__initPokemon();
    }

    canHatch()
    {
        return !this.isNone() && (this.steps() >= this.totalSteps);
    }

    hatch(efficiency = 100, helper = false)
    {
        if (!this.canHatch())
        {
            return false;
        }

        const partyPokemon = this.partyPokemon();
        if (partyPokemon)
        {
            // Skipped all the pokemon stats enhancement and shiny acquisition part, it's not needed at the moment

            if (partyPokemon.breeding)
            {
                partyPokemon.breeding = false;
            }
        }

        const pokemonId = PokemonHelper.getPokemonByName(this.pokemon).id;
        App.game.party.gainPokemonById(pokemonId, false);

        // Skipped all the base pokemon unlock part, it's not needed at the moment

        return true;
    }

    isNone()
    {
        return this.type === EggType.None;
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    __initPokemon()
    {
        // Init pokemon types
        if (this.pokemon != "MissingNo.")
        {
            const dataPokemon = PokemonHelper.getPokemonByName(this.pokemon);
            this.pokemonType1 = dataPokemon.type1;
            this.pokemonType2 = dataPokemon.type2 === PokemonType.None ? dataPokemon.type1 : dataPokemon.type2;
        }
        else
        {
            this.pokemonType1 = PokemonType.Normal;
            this.pokemonType2 = PokemonType.Normal;
        }

        // Init the party pokemon
        if (!this.isNone())
        {
            this.__partyPokemon = App.game.party.getPokemon(PokemonHelper.getPokemonByName(this.pokemon).id);
        }
    }
}
