// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/breeding/Breeding.ts#L8
class Breeding
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    constructor()
    {
        this.hatchList = [];
        this.eggList = [];
        this.eggSlots = 4;

        this.__canAccess = true;
        this.__eggList = [];

        this.__initEggList();
        this.__initHatchList();
    }

    addPokemonToHatchery(pokemon)
    {
        // If they have a free eggslot, add the pokemon to the egg now
        if (this.hasFreeEggSlot())
        {
            return this.gainPokemonEgg(pokemon);
        }

        // Skipped the queue stuff

        return false;
    }

    canAccess()
    {
        return this.__canAccess;
    }

    createEgg(pokemonName, type = EggType.Pokemon)
    {
        const dataPokemon = PokemonHelper.getPokemonByName(pokemonName);
        return new Egg(type, this.getSteps(dataPokemon.eggCycles), pokemonName);
    }

    createTypedEgg(type)
    {
        const pokemonName = this.__getNextPokemonToHatch(type);
        return this.createEgg(pokemonName, type);
    }

    gainEgg(egg)
    {
        if (egg.isNone())
        {
            return false;
        }

        for (let i = 0; i < this.__eggList.length; i++)
        {
            if (this.__eggList[i].isNone())
            {
                this.__eggList[i] = egg;
                return true;
            }
        }

        throw AutomationTestUtils.formatErrors(`Error: Could not place ${EggType[egg.type]} Egg`);
    }

    gainPokemonEgg(pokemon, isHelper = false)
    {
        if (!this.hasFreeEggSlot(isHelper))
        {
            return false;
        }

        const egg = this.createEgg(pokemon.name);

        const success = this.gainEgg(egg, isHelper);

        if (success && pokemon instanceof PartyPokemon)
        {
            pokemon.breeding = true;
        }

        return success;
    }

    gainRandomEgg()
    {
        // Don't go random, for testing repeatability reason
        const pokemonName = this.__getNextPokemonToHatch(null);
        return this.gainEgg(this.createEgg(pokemonName, EggType.Mystery));
    }

    getSteps(eggCycles)
    {
        return eggCycles * 40;
    }

    hasFreeEggSlot(isHelper = false)
    {
        return this.__eggList.some((egg) => egg.isNone());
    }

    hatchPokemonEgg(index)
    {
        const hatched = this.__eggList[index].hatch();

        if (hatched)
        {
            this.__eggList[index] = new Egg();

            // Sipped the other eggs being moved left, we don't need it for the tests
        }
    }

    getAllCaughtStatus()
    {
        return Object.keys(EggType).map(Number).filter((k) => !Number.isNaN(k)).reduce(
            (status, type) =>
            {
                return this.hatchList[type]
                        ? Math.min(status, this.getTypeCaughtStatus(type))
                        : status;
            }, CaughtStatus.CaughtShiny);
    }

    getTypeCaughtStatus(type)
    {
        const hatchList = this.hatchList[type];
        if (!hatchList)
        {
            return CaughtStatus.NotCaught;
        }

        const hatchable = hatchList.slice(0, player.highestRegion() + 1).flat();
        return hatchable.reduce((status, pname) => Math.min(status, PartyController.getCaughtStatusByName(pname)), CaughtStatus.CaughtShiny);
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    static __hatchAnExistingPokemon = false;

    __getNextPokemonToHatch(type = null)
    {
        let hatchable = [];

        if (type != null)
        {
            const hatchList = this.hatchList[type];
            hatchable = hatchList.slice(0, player.highestRegion() + 1).flat();
        }
        else
        {
            for (const list of this.hatchList)
            {
                hatchable = hatchable.concat(list.slice(0, player.highestRegion() + 1).flat());
            }
        }

        if (this.__hatchAnExistingPokemon)
        {
            return hatchable.filter((pokemonName) => PartyController.getCaughtStatusByName(pokemonName) != CaughtStatus.NotCaught)[0];
        }
        else
        {
            return hatchable.filter((pokemonName) => PartyController.getCaughtStatusByName(pokemonName) == CaughtStatus.NotCaught)[0];
        }
    }

    __initEggList()
    {
        for (let i = 0; i < this.eggSlots; i++)
        {
            this.__eggList[i] = new Egg();
            this.eggList[i] = function() { return this.__eggList[i]; }.bind(this);
        }
    }

    __initHatchList()
    {
        this.hatchList[EggType.Fire] =
            [
                ['Charmander', 'Vulpix', 'Growlithe', 'Ponyta'],
                ['Cyndaquil', 'Slugma', 'Houndour', 'Magby'],
                ['Torchic', 'Numel'],
                ['Chimchar'],
                ['Tepig', 'Pansear'],
                ['Fennekin'],
                ['Litten'],
                ['Scorbunny', 'Sizzlipede'],
            ];
        this.hatchList[EggType.Water] =
            [
                ['Squirtle', 'Lapras', 'Staryu', 'Psyduck'],
                ['Totodile', 'Wooper', 'Marill', 'Qwilfish'],
                ['Mudkip', 'Feebas', 'Clamperl'],
                ['Piplup', 'Finneon', 'Buizel'],
                ['Oshawott', 'Panpour'],
                ['Froakie'],
                ['Popplio', 'Wimpod'],
                ['Sobble', 'Chewtle'],
            ];
        this.hatchList[EggType.Grass] =
            [
                ['Bulbasaur', 'Oddish', 'Tangela', 'Bellsprout'],
                ['Chikorita', 'Hoppip', 'Sunkern'],
                ['Treecko', 'Tropius', 'Roselia'],
                ['Turtwig', 'Carnivine', 'Budew'],
                ['Snivy', 'Pansage'],
                ['Chespin'],
                ['Rowlet', 'Morelull'],
                ['Grookey', 'Gossifleur'],
            ];
        this.hatchList[EggType.Fighting] =
            [
                ['Hitmonlee', 'Hitmonchan', 'Machop', 'Mankey'],
                ['Tyrogue'],
                ['Makuhita', 'Meditite'],
                ['Riolu'],
                ['Throh', 'Sawk'],
                [],
                ['Crabrawler'],
                ['Falinks'],
            ];
        this.hatchList[EggType.Electric] =
            [
                ['Magnemite', 'Pikachu', 'Voltorb', 'Electabuzz'],
                ['Chinchou', 'Mareep', 'Elekid'],
                ['Plusle', 'Minun', 'Electrike'],
                ['Pachirisu', 'Shinx'],
                ['Blitzle'],
                [],
                [],
                ['Toxel', 'Pincurchin'],
            ];
        this.hatchList[EggType.Dragon] =
            [
                ['Dratini', 'Dragonair', 'Dragonite'],
                [],
                ['Bagon', 'Shelgon', 'Salamence'],
                ['Gible', 'Gabite', 'Garchomp'],
                ['Deino', 'Zweilous', 'Hydreigon'],
                ['Goomy'],
                ['Turtonator', 'Drampa', 'Jangmo-o', 'Hakamo-o', 'Kommo-o'],
                ['Dreepy', 'Drakloak', 'Dragapult'],
            ];
    }
}
