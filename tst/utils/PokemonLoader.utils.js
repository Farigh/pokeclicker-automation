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
        PokemonHelper.__registerPokemon("Torchic", 255, 2, { attack: 60 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Numel", 322, 2, { attack: 60 }, [ 1, 8 ], 20);
        PokemonHelper.__registerPokemon("Chimchar", 390, 3, { attack: 58 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Tepig", 498, 4, { attack: 63 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Pansear", 513, 4, { attack: 53 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Fennekin", 653, 5, { attack: 45 }, [ 1 ], 20);
        PokemonHelper.__registerPokemon("Litten", 725, 6, { attack: 65 }, [ 1 ], 15);

        // Water egg pokemons
        PokemonHelper.__registerPokemon("Squirtle", 7, 0, { attack: 48 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Lapras", 131, 0, { attack: 85 }, [ 2, 5 ], 40);
        PokemonHelper.__registerPokemon("Staryu", 120, 0, { attack: 45 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Psyduck", 54, 0, { attack: 52 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Totodile", 158, 1, { attack: 65 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Wooper", 194, 1, { attack: 45 }, [ 2, 8 ], 20);
        PokemonHelper.__registerPokemon("Marill", 183, 1, { attack: 20 }, [ 2, 17 ], 10);
        PokemonHelper.__registerPokemon("Qwilfish", 211, 1, { attack: 95 }, [ 2, 7 ], 20);
        PokemonHelper.__registerPokemon("Mudkip", 258, 2, { attack: 70 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Feebas", 349, 2, { attack: 15 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Clamperl", 366, 2, { attack: 64 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Piplup", 393, 3, { attack: 51 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Finneon", 456, 3, { attack: 49 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Buizel", 418, 3, { attack: 65 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Oshawott", 501, 4, { attack: 55 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Panpour", 515, 4, { attack: 53 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Froakie", 656, 5, { attack: 56 }, [ 2 ], 20);
        PokemonHelper.__registerPokemon("Popplio", 728, 6, { attack: 54 }, [ 2 ], 15);
        PokemonHelper.__registerPokemon("Wimpod", 767, 6, { attack: 35 }, [ 11, 2 ], 20);

        // Grass egg pokemons
        PokemonHelper.__registerPokemon("Bulbasaur", 1, 0, { attack: 49 }, [ 4, 7 ], 20);
        PokemonHelper.__registerPokemon("Oddish", 43, 0, { attack: 50 }, [ 4, 7 ], 20);
        PokemonHelper.__registerPokemon("Tangela", 114, 0, { attack: 55 }, [ 4 ], 20);
        PokemonHelper.__registerPokemon("Bellsprout", 69, 0, { attack: 75 }, [ 4, 7 ], 20);
        PokemonHelper.__registerPokemon("Chikorita", 152, 1, { attack: 49 }, [ 4 ], 20);
        PokemonHelper.__registerPokemon("Hoppip", 187, 1, { attack: 35 }, [ 4, 9 ], 20);
        PokemonHelper.__registerPokemon("Sunkern", 191, 1, { attack: 30 }, [ 4 ], 20);
        PokemonHelper.__registerPokemon("Treecko", 252, 2, { attack: 45 }, [ 4 ], 20);
        PokemonHelper.__registerPokemon("Tropius", 357, 2, { attack: 68 }, [ 4, 9 ], 25);
        PokemonHelper.__registerPokemon("Roselia", 315, 2, { attack: 60 }, [ 4, 7 ], 20);
        PokemonHelper.__registerPokemon("Turtwig", 387, 3, { attack: 68 }, [ 4 ], 20);
        PokemonHelper.__registerPokemon("Carnivine", 455, 3, { attack: 100 }, [ 4 ], 25);
        PokemonHelper.__registerPokemon("Budew", 406, 3, { attack: 30 }, [ 4, 7 ], 16);
        PokemonHelper.__registerPokemon("Snivy", 495, 4, { attack: 45 }, [ 4 ], 20);
        PokemonHelper.__registerPokemon("Pansage", 511, 4, { attack: 53 }, [ 4 ], 20);
        PokemonHelper.__registerPokemon("Chespin", 650, 5, { attack: 61 }, [ 4 ], 20);
        PokemonHelper.__registerPokemon("Rowlet", 722, 6, { attack: 55 }, [ 4, 9 ], 15);
        PokemonHelper.__registerPokemon("Morelull", 755, 6, { attack: 35 }, [ 4, 17 ], 20);

        // Fighting egg pokemons
        PokemonHelper.__registerPokemon("Hitmonlee", 106, 0, { attack: 120 }, [ 6 ], 25);
        PokemonHelper.__registerPokemon("Hitmonchan", 107, 0, { attack: 105 }, [ 6 ], 25);
        PokemonHelper.__registerPokemon("Machop", 66, 0, { attack: 80 }, [ 6 ], 20);
        PokemonHelper.__registerPokemon("Mankey", 56, 0, { attack: 80 }, [ 6 ], 20);
        PokemonHelper.__registerPokemon("Tyrogue", 236, 1, { attack: 35 }, [ 6 ], 20);
        PokemonHelper.__registerPokemon("Makuhita", 296, 2, { attack: 60 }, [ 6 ], 20);
        PokemonHelper.__registerPokemon("Meditite", 307, 2, { attack: 40 }, [ 6, 10 ], 20);
        PokemonHelper.__registerPokemon("Riolu", 447, 3, { attack: 70 }, [ 6 ], 25);
        PokemonHelper.__registerPokemon("Throh", 538, 4, { attack: 100 }, [ 6 ], 20);
        PokemonHelper.__registerPokemon("Sawk", 539, 4, { attack: 125 }, [ 6 ], 20);
        PokemonHelper.__registerPokemon("Crabrawler", 739, 6, { attack: 82 }, [ 6 ], 20);

        // Electric egg pokemons
        PokemonHelper.__registerPokemon("Magnemite", 81, 0, { attack: 35 }, [ 3, 16 ], 20);
        PokemonHelper.__registerPokemon("Pikachu", 25, 0, { attack: 55 }, [ 3 ], 10);
        PokemonHelper.__registerPokemon("Voltorb", 100, 0, { attack: 30 }, [ 3 ], 20);
        PokemonHelper.__registerPokemon("Electabuzz", 125, 0, { attack: 83 }, [ 3 ], 25);
        PokemonHelper.__registerPokemon("Chinchou", 170, 1, { attack: 38 }, [ 2, 3 ], 20);
        PokemonHelper.__registerPokemon("Mareep", 179, 1, { attack: 40 }, [ 3 ], 20);
        PokemonHelper.__registerPokemon("Elekid", 239, 1, { attack: 63 }, [ 3 ], 20);
        PokemonHelper.__registerPokemon("Plusle", 311, 2, { attack: 50 }, [ 3 ], 20);
        PokemonHelper.__registerPokemon("Minun", 312, 2, { attack: 40 }, [ 3 ], 20);
        PokemonHelper.__registerPokemon("Electrike", 309, 2, { attack: 45 }, [ 3 ], 20);
        PokemonHelper.__registerPokemon("Pachirisu", 417, 3, { attack: 45 }, [ 3 ], 10);
        PokemonHelper.__registerPokemon("Shinx", 403, 3, { attack: 65 }, [ 3 ], 20);
        PokemonHelper.__registerPokemon("Blitzle", 522, 4, { attack: 60 }, [ 3 ], 20);

        // Dragon egg pokemons
        PokemonHelper.__registerPokemon("Dratini", 147, 0, { attack: 64 }, [ 14 ], 40);
        PokemonHelper.__registerPokemon("Dragonair", 148, 0, { attack: 84 }, [ 14 ], 60);
        PokemonHelper.__registerPokemon("Dragonite", 149, 0, { attack: 134 }, [ 14, 9 ], 90);
        PokemonHelper.__registerPokemon("Bagon", 371, 2, { attack: 75 }, [ 14 ], 40);
        PokemonHelper.__registerPokemon("Shelgon", 372, 2, { attack: 95 }, [ 14 ], 60);
        PokemonHelper.__registerPokemon("Salamence", 373, 2, { attack: 135 }, [ 14, 9 ], 90);
        PokemonHelper.__registerPokemon("Gible", 443, 3, { attack: 70 }, [ 14, 8 ], 40);
        PokemonHelper.__registerPokemon("Gabite", 444, 3, { attack: 90 }, [ 14, 8 ], 60);
        PokemonHelper.__registerPokemon("Garchomp", 445, 3, { attack: 130 }, [ 14, 8 ], 90);
        PokemonHelper.__registerPokemon("Deino", 633, 4, { attack: 65 }, [ 15, 14 ], 40);
        PokemonHelper.__registerPokemon("Zweilous", 634, 4, { attack: 85 }, [ 15, 14 ], 60);
        PokemonHelper.__registerPokemon("Hydreigon", 635, 4, { attack: 105 }, [ 15, 14 ], 90);
        PokemonHelper.__registerPokemon("Goomy", 704, 5, { attack: 50 }, [ 14 ], 40);
        PokemonHelper.__registerPokemon("Turtonator", 776, 6, { attack: 78 }, [ 1, 14 ], 20);
        PokemonHelper.__registerPokemon("Drampa", 780, 6, { attack: 60 }, [ 0, 14 ], 20);
        PokemonHelper.__registerPokemon("Jangmo-o", 782, 6, { attack: 55 }, [ 14 ], 40);
        PokemonHelper.__registerPokemon("Hakamo-o", 783, 6, { attack: 75 }, [ 14, 6 ], 60);
        PokemonHelper.__registerPokemon("Kommo-o", 784, 6, { attack: 110 }, [ 14, 6 ], 90);
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
    for (const pokename of App.game.breeding.hatchList[EggType[eggType]].slice(0, GameConstants.MAX_AVAILABLE_REGION + 1).flat())
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
