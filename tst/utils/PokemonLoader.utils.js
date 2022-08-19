class PokemonLoader
{
    /**
     * @brief Loads the farming unlocks related pokemons
     */
    static loadFarmingUnlockPokemons()
    {
        PokemonHelper.__registerPokemon("Kyogre", 382, 2, { attack: 100 }, [ 2 ], 120);
        PokemonHelper.__registerPokemon("Groudon", 383, 2, { attack: 150 }, [ 8 ], 120);
        PokemonHelper.__registerPokemon("Rayquaza", 384, 2, { attack: 150 }, [ 14, 9 ], 120);
        PokemonHelper.__registerPokemon("Dialga", 483, 3, { attack: 120 }, [ 16, 14 ], 120);
        PokemonHelper.__registerPokemon("Palkia", 484, 3, { attack: 120 }, [ 2, 14 ], 120);
    }

    /**
     * @brief Loads the eggs hatching related pokemons
     */
    static loadEggsPokemons()
    {
        // Fire egg pokemons
        PokemonHelper.__registerPokemon("Charmander", 4, 0, { attack: 52 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Vulpix", 37, 0, { attack: 41 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Growlithe", 58, 0, { attack: 70 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Ponyta", 77, 0, { attack: 85 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Cyndaquil", 155, 1, { attack: 52 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Slugma", 218, 1, { attack: 40 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Houndour", 228, 1, { attack: 60 }, [ 15, 1 ], 20);
        PokemonHelper.__registerPokemon("Magby", 240, 1, { attack: 75 }, [ 1 ], 20);

        // Water egg pokemons
        PokemonHelper.__registerPokemon("Squirtle", 7, 0, { attack: 48 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Lapras", 131, 0, { attack: 85 }, [ 2, 5 ], 40);
        PokemonHelper.__registerPokemon("Staryu", 120, 0, { attack: 45 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Psyduck", 54, 0, { attack: 52 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Totodile", 158, 1, { attack: 65 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Wooper", 194, 1, { attack: 45 }, [ 2, 8 ], 20);
        PokemonHelper.__registerPokemon("Marill", 183, 1, { attack: 20 }, [ 2, 17 ], 10);
        PokemonHelper.__registerPokemon("Qwilfish", 211, 1, { attack: 95 }, [ 2, 7 ], 20);

        // Grass egg pokemons
        PokemonHelper.__registerPokemon("Bulbasaur", 1, 0, { attack: 49 }, [ 4, 7 ], 20);
        PokemonHelper.__registerPokemon("Oddish", 43, 0, { attack: 50 }, [ 4, 7 ], 20);
        PokemonHelper.__registerPokemon("Tangela", 114, 0, { attack: 55 }, [ 4 ], 20);
        PokemonHelper.__registerPokemon("Bellsprout", 69, 0, { attack: 75 }, [ 4, 7 ], 20);
        PokemonHelper.__registerPokemon("Chikorita", 152, 1, { attack: 49 }, [ 4 ], 20);
        PokemonHelper.__registerPokemon("Hoppip", 187, 1, { attack: 35 }, [ 4, 9 ], 20);
        PokemonHelper.__registerPokemon("Sunkern", 191, 1, { attack: 30 }, [ 4 ], 20);

        // Fighting egg pokemons
        PokemonHelper.__registerPokemon("Hitmonlee", 106, 0, { attack: 120 }, [ 6 ], 25);
        PokemonHelper.__registerPokemon("Hitmonchan", 107, 0, { attack: 105 }, [ 6 ], 25);
        PokemonHelper.__registerPokemon("Machop", 66, 0, { attack: 80 }, [ 6 ], 20);
        PokemonHelper.__registerPokemon("Mankey", 56, 0, { attack: 80 }, [ 6 ], 20);
        PokemonHelper.__registerPokemon("Tyrogue", 236, 1, { attack: 35 }, [ 6 ], 20);

        // Electric egg pokemons
        PokemonHelper.__registerPokemon("Magnemite", 81, 0, { attack: 35 }, [ 3, 16 ], 20);
        PokemonHelper.__registerPokemon("Pikachu", 25, 0, { attack: 55 }, [ 3 ], 10);
        PokemonHelper.__registerPokemon("Voltorb", 100, 0, { attack: 30 }, [ 3 ], 20);
        PokemonHelper.__registerPokemon("Electabuzz", 125, 0, { attack: 83 }, [ 3 ], 25);
        PokemonHelper.__registerPokemon("Chinchou", 170, 1, { attack: 38 }, [ 2, 3 ], 20);
        PokemonHelper.__registerPokemon("Mareep", 179, 1, { attack: 40 }, [ 3 ], 20);
        PokemonHelper.__registerPokemon("Elekid", 239, 1, { attack: 63 }, [ 3 ], 20);

        // Dragon egg pokemons
        PokemonHelper.__registerPokemon("Dratini", 147, 0, { attack: 64 }, [ 14 ], 40);
        PokemonHelper.__registerPokemon("Dragonair", 148, 0, { attack: 84 }, [ 14 ], 60);
        PokemonHelper.__registerPokemon("Dragonite", 149, 0, { attack: 134 }, [ 14, 9 ], 90);
    }

    /**
     * @brief Loads the fossils related pokemons
     */
    static loadFossilsPokemons()
    {
        // Fossil pokemons
        PokemonHelper.__registerPokemon("Omanyte", 138, 0, { attack: 40 }, [ 12, 2 ], 30);
        PokemonHelper.__registerPokemon("Kabuto", 140, 0, { attack: 80 }, [ 12, 2 ], 30);
        PokemonHelper.__registerPokemon("Aerodactyl", 142, 0, { attack: 105 }, [ 12, 9 ], 35);
        PokemonHelper.__registerPokemon("Lileep", 345, 2, { attack: 41 }, [ 12, 4 ], 30);
        PokemonHelper.__registerPokemon("Anorith", 347, 2, { attack: 95 }, [ 12, 11 ], 30);
        PokemonHelper.__registerPokemon("Shieldon", 410, 3, { attack: 42 }, [ 12, 16 ], 30);
        PokemonHelper.__registerPokemon("Cranidos", 408, 3, { attack: 125 }, [ 12 ], 30);
        PokemonHelper.__registerPokemon("Tirtouga", 564, 4, { attack: 78 }, [ 2, 12 ], 30);
        PokemonHelper.__registerPokemon("Archen", 566, 4, { attack: 112 }, [ 12, 9 ], 30);
        PokemonHelper.__registerPokemon("Tyrunt", 696, 5, { attack: 89 }, [ 12, 14 ], 30);
        PokemonHelper.__registerPokemon("Amaura", 698, 5, { attack: 59 }, [ 12, 5 ], 30);
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
    return `        PokemonHelper.__registerPokemon("${pokename}"`
         + `, ${pokedata.id}`
         + `, ${pokedata.nativeRegion}`
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
    buffer += `\n        // ${eggType} egg pokemons\n`;
    for (const pokename of App.game.breeding.hatchList[EggType[eggType]].slice(0, 2).flat())
    {
        buffer += dataPrinter(pokename);
    }
}

buffer += `\n\n\n\n`;

buffer += `\n        // Fossil pokemons\n`;
for (const pokename of Object.values(GameConstants.FossilToPokemon))
{
    buffer += dataPrinter(pokename);
}

console.log(buffer);

======================== */
