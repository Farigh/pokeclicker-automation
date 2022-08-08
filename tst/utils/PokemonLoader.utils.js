class PokemonLoader
{
    /**
     * @brief Loads the farming unlocks related pokemons
     */
    static loadFarmingUnlockPokemons()
    {
        PokemonHelper.__registerPokemon("Kyogre", 382, { attack: 100 }, [ 2 ], 120);
        PokemonHelper.__registerPokemon("Groudon", 383, { attack: 150 }, [ 8 ], 120);
        PokemonHelper.__registerPokemon("Rayquaza", 384, { attack: 150 }, [ 14, 9 ], 120);
        PokemonHelper.__registerPokemon("Dialga", 483, { attack: 120 }, [ 16, 14 ], 120);
        PokemonHelper.__registerPokemon("Palkia", 484, { attack: 120 }, [ 2, 14 ], 120);
    }

    /**
     * @brief Loads the eggs hatching related pokemons
     */
    static loadEggsPokemons()
    {
        // Fire egg pokemons
        PokemonHelper.__registerPokemon("Charmander", 4, { attack: 52 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Vulpix", 37, { attack: 41 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Growlithe", 58, { attack: 70 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Ponyta", 77, { attack: 85 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Cyndaquil", 155, { attack: 52 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Slugma", 218, { attack: 40 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Houndour", 228, { attack: 60 }, [ 15, 1 ], 20);
        PokemonHelper.__registerPokemon("Magby", 240, { attack: 75 }, [ 1 ], 20);

        // Water egg pokemons
        PokemonHelper.__registerPokemon("Squirtle", 7, { attack: 48 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Lapras", 131, { attack: 85 }, [ 2, 5 ], 40);
        PokemonHelper.__registerPokemon("Staryu", 120, { attack: 45 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Psyduck", 54, { attack: 52 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Totodile", 158, { attack: 65 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Wooper", 194, { attack: 45 }, [ 2, 8 ], 20);
        PokemonHelper.__registerPokemon("Marill", 183, { attack: 20 }, [ 2, 17 ], 10);
        PokemonHelper.__registerPokemon("Qwilfish", 211, { attack: 95 }, [ 2, 7 ], 20);

        // Grass egg pokemons
        PokemonHelper.__registerPokemon("Bulbasaur", 1, { attack: 49 }, [ 4, 7 ], 20);
        PokemonHelper.__registerPokemon("Oddish", 43, { attack: 50 }, [ 4, 7 ], 20);
        PokemonHelper.__registerPokemon("Tangela", 114, { attack: 55 }, [ 4 ], 20);
        PokemonHelper.__registerPokemon("Bellsprout", 69, { attack: 75 }, [ 4, 7 ], 20);
        PokemonHelper.__registerPokemon("Chikorita", 152, { attack: 49 }, [ 4 ], 20);
        PokemonHelper.__registerPokemon("Hoppip", 187, { attack: 35 }, [ 4, 9 ], 20);
        PokemonHelper.__registerPokemon("Sunkern", 191, { attack: 30 }, [ 4 ], 20);

        // Fighting egg pokemons
        PokemonHelper.__registerPokemon("Hitmonlee", 106, { attack: 120 }, [ 6 ], 25);
        PokemonHelper.__registerPokemon("Hitmonchan", 107, { attack: 105 }, [ 6 ], 25);
        PokemonHelper.__registerPokemon("Machop", 66, { attack: 80 }, [ 6 ], 20);
        PokemonHelper.__registerPokemon("Mankey", 56, { attack: 80 }, [ 6 ], 20);
        PokemonHelper.__registerPokemon("Tyrogue", 236, { attack: 35 }, [ 6 ], 20);

        // Electric egg pokemons
        PokemonHelper.__registerPokemon("Magnemite", 81, { attack: 35 }, [ 3, 16 ], 20);
        PokemonHelper.__registerPokemon("Pikachu", 25, { attack: 55 }, [ 3 ], 10);
        PokemonHelper.__registerPokemon("Voltorb", 100, { attack: 30 }, [ 3 ], 20);
        PokemonHelper.__registerPokemon("Electabuzz", 125, { attack: 83 }, [ 3 ], 25);
        PokemonHelper.__registerPokemon("Chinchou", 170, { attack: 38 }, [ 2, 3 ], 20);
        PokemonHelper.__registerPokemon("Mareep", 179, { attack: 40 }, [ 3 ], 20);
        PokemonHelper.__registerPokemon("Elekid", 239, { attack: 63 }, [ 3 ], 20);

        // Dragon egg pokemons
        PokemonHelper.__registerPokemon("Dratini", 147, { attack: 64 }, [ 14 ], 40);
        PokemonHelper.__registerPokemon("Dragonair", 148, { attack: 84 }, [ 14 ], 60);
        PokemonHelper.__registerPokemon("Dragonite", 149, { attack: 134 }, [ 14, 9 ], 90);
    }
}

/**
 * Generate the registration list using the following code
 */
/* =======================

buffer = "";
dataPrinter = function (pokename)
{
    let pokedata = pokemonMap[pokename];
    return `PokemonHelper.__registerPokemon("${pokename}"`
         + `, ${pokedata.id}`
         + `, { attack: ${pokedata.base.attack} }`
         + `, [ ${pokedata.type.join(", ")} ]`
         + `, ${pokedata.eggCycles});\n`;
}

for (const pokename of [ "Kyogre", "Groudon", "Rayquaza", "Dialga", "Palkia" ])
{
    buffer += dataPrinter(pokename);
}

buffer += `\n\n\n\n`;

for (const eggType of [ "Fire", "Water", "Grass", "Fighting", "Electric", "Dragon" ])
{
    buffer += `\n// ${eggType} egg pokemons\n`;
    for (const pokename of App.game.breeding.hatchList[EggType[eggType]].slice(0, 2).flat())
    {
        buffer += dataPrinter(pokename);
    }
}

console.log(buffer);

======================== */
