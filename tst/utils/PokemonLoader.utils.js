class PokemonLoader
{
    /**
     * @brief Loads the farming unlocks related pokemons
     */
    static loadFarmingUnlockPokemons()
    {
        this.__tryRegisterPokemon("Kyogre", 382, 2, 3, { hitpoints: 100, attack: 100 }, [ PokemonType.Water ], 120);
        this.__tryRegisterPokemon("Groudon", 383, 2, 3, { hitpoints: 100, attack: 150 }, [ PokemonType.Ground ], 120);
        this.__tryRegisterPokemon("Rayquaza", 384, 2, 45, { hitpoints: 105, attack: 150 }, [ PokemonType.Dragon, PokemonType.Flying ], 120);
        this.__tryRegisterPokemon("Dialga", 483, 3, 3, { hitpoints: 100, attack: 120 }, [ PokemonType.Steel, PokemonType.Dragon ], 120);
        this.__tryRegisterPokemon("Palkia", 484, 3, 3, { hitpoints: 90, attack: 120 }, [ PokemonType.Water, PokemonType.Dragon ], 120);
        this.__tryRegisterPokemon("Snover", 459, 3, 120, { hitpoints: 60, attack: 62 }, [ PokemonType.Grass, PokemonType.Ice ], 20);
    }

    /**
     * @brief Loads the eggs hatching related pokemons
     */
    static loadEggsPokemons()
    {
        // Fire egg pokemons
        this.__tryRegisterPokemon("Charmander", 4, 0, 45, { hitpoints: 39, attack: 52 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Vulpix", 37, 0, 190, { hitpoints: 38, attack: 41 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Growlithe", 58, 0, 190, { hitpoints: 55, attack: 70 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Ponyta", 77, 0, 190, { hitpoints: 50, attack: 85 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Cyndaquil", 155, 1, 45, { hitpoints: 39, attack: 52 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Slugma", 218, 1, 190, { hitpoints: 40, attack: 40 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Houndour", 228, 1, 120, { hitpoints: 45, attack: 60 }, [ PokemonType.Dark, PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Magby", 240, 1, 45, { hitpoints: 45, attack: 75 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Torchic", 255, 2, 45, { hitpoints: 45, attack: 60 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Numel", 322, 2, 255, { hitpoints: 60, attack: 60 }, [ PokemonType.Fire, PokemonType.Ground ], 20);
        this.__tryRegisterPokemon("Chimchar", 390, 3, 45, { hitpoints: 44, attack: 58 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Tepig", 498, 4, 45, { hitpoints: 65, attack: 63 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Pansear", 513, 4, 190, { hitpoints: 50, attack: 53 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Fennekin", 653, 5, 45, { hitpoints: 40, attack: 45 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Litten", 725, 6, 45, { hitpoints: 45, attack: 65 }, [ PokemonType.Fire ], 15);

        // Water egg pokemons
        this.__tryRegisterPokemon("Squirtle", 7, 0, 45, { hitpoints: 44, attack: 48 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Lapras", 131, 0, 45, { hitpoints: 130, attack: 85 }, [ PokemonType.Water, PokemonType.Ice ], 40);
        this.__tryRegisterPokemon("Staryu", 120, 0, 225, { hitpoints: 30, attack: 45 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Psyduck", 54, 0, 190, { hitpoints: 50, attack: 52 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Totodile", 158, 1, 45, { hitpoints: 50, attack: 65 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Wooper", 194, 1, 255, { hitpoints: 55, attack: 45 }, [ PokemonType.Water, PokemonType.Ground ], 20);
        this.__tryRegisterPokemon("Marill", 183, 1, 190, { hitpoints: 70, attack: 20 }, [ PokemonType.Water, PokemonType.Fairy ], 10);
        this.__tryRegisterPokemon("Qwilfish", 211, 1, 45, { hitpoints: 65, attack: 95 }, [ PokemonType.Water, PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Mudkip", 258, 2, 45, { hitpoints: 50, attack: 70 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Feebas", 349, 2, 255, { hitpoints: 20, attack: 15 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Clamperl", 366, 2, 255, { hitpoints: 35, attack: 64 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Piplup", 393, 3, 45, { hitpoints: 53, attack: 51 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Finneon", 456, 3, 190, { hitpoints: 49, attack: 49 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Buizel", 418, 3, 190, { hitpoints: 55, attack: 65 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Oshawott", 501, 4, 45, { hitpoints: 55, attack: 55 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Panpour", 515, 4, 190, { hitpoints: 50, attack: 53 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Froakie", 656, 5, 45, { hitpoints: 41, attack: 56 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Popplio", 728, 6, 45, { hitpoints: 50, attack: 54 }, [ PokemonType.Water ], 15);
        this.__tryRegisterPokemon("Wimpod", 767, 6, 90, { hitpoints: 25, attack: 35 }, [ PokemonType.Bug, PokemonType.Water ], 20);

        // Grass egg pokemons
        this.__tryRegisterPokemon("Bulbasaur", 1, 0, 45, { hitpoints: 45, attack: 49 }, [ PokemonType.Grass, PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Oddish", 43, 0, 255, { hitpoints: 45, attack: 50 }, [ PokemonType.Grass, PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Tangela", 114, 0, 45, { hitpoints: 65, attack: 55 }, [ PokemonType.Grass ], 20);
        this.__tryRegisterPokemon("Bellsprout", 69, 0, 255, { hitpoints: 50, attack: 75 }, [ PokemonType.Grass, PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Chikorita", 152, 1, 45, { hitpoints: 45, attack: 49 }, [ PokemonType.Grass ], 20);
        this.__tryRegisterPokemon("Hoppip", 187, 1, 255, { hitpoints: 35, attack: 35 }, [ PokemonType.Grass, PokemonType.Flying ], 20);
        this.__tryRegisterPokemon("Sunkern", 191, 1, 235, { hitpoints: 30, attack: 30 }, [ PokemonType.Grass ], 20);
        this.__tryRegisterPokemon("Treecko", 252, 2, 45, { hitpoints: 40, attack: 45 }, [ PokemonType.Grass ], 20);
        this.__tryRegisterPokemon("Tropius", 357, 2, 200, { hitpoints: 99, attack: 68 }, [ PokemonType.Grass, PokemonType.Flying ], 25);
        this.__tryRegisterPokemon("Roselia", 315, 2, 150, { hitpoints: 50, attack: 60 }, [ PokemonType.Grass, PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Turtwig", 387, 3, 45, { hitpoints: 55, attack: 68 }, [ PokemonType.Grass ], 20);
        this.__tryRegisterPokemon("Carnivine", 455, 3, 200, { hitpoints: 74, attack: 100 }, [ PokemonType.Grass ], 25);
        this.__tryRegisterPokemon("Budew", 406, 3, 255, { hitpoints: 40, attack: 30 }, [ PokemonType.Grass, PokemonType.Poison ], 16);
        this.__tryRegisterPokemon("Snivy", 495, 4, 45, { hitpoints: 45, attack: 45 }, [ PokemonType.Grass ], 20);
        this.__tryRegisterPokemon("Pansage", 511, 4, 190, { hitpoints: 50, attack: 53 }, [ PokemonType.Grass ], 20);
        this.__tryRegisterPokemon("Chespin", 650, 5, 45, { hitpoints: 56, attack: 61 }, [ PokemonType.Grass ], 20);
        this.__tryRegisterPokemon("Rowlet", 722, 6, 45, { hitpoints: 68, attack: 55 }, [ PokemonType.Grass, PokemonType.Flying ], 15);
        this.__tryRegisterPokemon("Morelull", 755, 6, 190, { hitpoints: 40, attack: 35 }, [ PokemonType.Grass, PokemonType.Fairy ], 20);

        // Fighting egg pokemons
        this.__tryRegisterPokemon("Hitmonlee", 106, 0, 45, { hitpoints: 50, attack: 120 }, [ PokemonType.Fighting ], 25);
        this.__tryRegisterPokemon("Hitmonchan", 107, 0, 45, { hitpoints: 50, attack: 105 }, [ PokemonType.Fighting ], 25);
        this.__tryRegisterPokemon("Machop", 66, 0, 180, { hitpoints: 70, attack: 80 }, [ PokemonType.Fighting ], 20);
        this.__tryRegisterPokemon("Mankey", 56, 0, 190, { hitpoints: 40, attack: 80 }, [ PokemonType.Fighting ], 20);
        this.__tryRegisterPokemon("Tyrogue", 236, 1, 75, { hitpoints: 35, attack: 35 }, [ PokemonType.Fighting ], 20);
        this.__tryRegisterPokemon("Makuhita", 296, 2, 180, { hitpoints: 72, attack: 60 }, [ PokemonType.Fighting ], 20);
        this.__tryRegisterPokemon("Meditite", 307, 2, 180, { hitpoints: 30, attack: 40 }, [ PokemonType.Fighting, PokemonType.Psychic ], 20);
        this.__tryRegisterPokemon("Riolu", 447, 3, 75, { hitpoints: 40, attack: 70 }, [ PokemonType.Fighting ], 25);
        this.__tryRegisterPokemon("Throh", 538, 4, 45, { hitpoints: 120, attack: 100 }, [ PokemonType.Fighting ], 20);
        this.__tryRegisterPokemon("Sawk", 539, 4, 45, { hitpoints: 75, attack: 125 }, [ PokemonType.Fighting ], 20);
        this.__tryRegisterPokemon("Crabrawler", 739, 6, 225, { hitpoints: 47, attack: 82 }, [ PokemonType.Fighting ], 20);

        // Electric egg pokemons
        this.__tryRegisterPokemon("Magnemite", 81, 0, 190, { hitpoints: 25, attack: 35 }, [ PokemonType.Electric, PokemonType.Steel ], 20);
        this.__tryRegisterPokemon("Pikachu", 25, 0, 190, { hitpoints: 35, attack: 55 }, [ PokemonType.Electric ], 10);
        this.__tryRegisterPokemon("Voltorb", 100, 0, 190, { hitpoints: 40, attack: 30 }, [ PokemonType.Electric ], 20);
        this.__tryRegisterPokemon("Electabuzz", 125, 0, 45, { hitpoints: 65, attack: 83 }, [ PokemonType.Electric ], 25);
        this.__tryRegisterPokemon("Chinchou", 170, 1, 190, { hitpoints: 75, attack: 38 }, [ PokemonType.Water, PokemonType.Electric ], 20);
        this.__tryRegisterPokemon("Mareep", 179, 1, 235, { hitpoints: 55, attack: 40 }, [ PokemonType.Electric ], 20);
        this.__tryRegisterPokemon("Elekid", 239, 1, 45, { hitpoints: 45, attack: 63 }, [ PokemonType.Electric ], 20);
        this.__tryRegisterPokemon("Plusle", 311, 2, 200, { hitpoints: 60, attack: 50 }, [ PokemonType.Electric ], 20);
        this.__tryRegisterPokemon("Minun", 312, 2, 200, { hitpoints: 60, attack: 40 }, [ PokemonType.Electric ], 20);
        this.__tryRegisterPokemon("Electrike", 309, 2, 120, { hitpoints: 40, attack: 45 }, [ PokemonType.Electric ], 20);
        this.__tryRegisterPokemon("Pachirisu", 417, 3, 200, { hitpoints: 60, attack: 45 }, [ PokemonType.Electric ], 10);
        this.__tryRegisterPokemon("Shinx", 403, 3, 235, { hitpoints: 45, attack: 65 }, [ PokemonType.Electric ], 20);
        this.__tryRegisterPokemon("Blitzle", 522, 4, 190, { hitpoints: 45, attack: 60 }, [ PokemonType.Electric ], 20);

        // Dragon egg pokemons
        this.__tryRegisterPokemon("Dratini", 147, 0, 45, { hitpoints: 41, attack: 64 }, [ PokemonType.Dragon ], 40);
        this.__tryRegisterPokemon("Dragonair", 148, 0, 45, { hitpoints: 61, attack: 84 }, [ PokemonType.Dragon ], 60);
        this.__tryRegisterPokemon("Dragonite", 149, 0, 45, { hitpoints: 91, attack: 134 }, [ PokemonType.Dragon, PokemonType.Flying ], 90);
        this.__tryRegisterPokemon("Bagon", 371, 2, 45, { hitpoints: 45, attack: 75 }, [ PokemonType.Dragon ], 40);
        this.__tryRegisterPokemon("Shelgon", 372, 2, 45, { hitpoints: 65, attack: 95 }, [ PokemonType.Dragon ], 60);
        this.__tryRegisterPokemon("Salamence", 373, 2, 45, { hitpoints: 95, attack: 135 }, [ PokemonType.Dragon, PokemonType.Flying ], 90);
        this.__tryRegisterPokemon("Gible", 443, 3, 45, { hitpoints: 58, attack: 70 }, [ PokemonType.Dragon, PokemonType.Ground ], 40);
        this.__tryRegisterPokemon("Gabite", 444, 3, 45, { hitpoints: 68, attack: 90 }, [ PokemonType.Dragon, PokemonType.Ground ], 60);
        this.__tryRegisterPokemon("Garchomp", 445, 3, 45, { hitpoints: 108, attack: 130 }, [ PokemonType.Dragon, PokemonType.Ground ], 90);
        this.__tryRegisterPokemon("Deino", 633, 4, 45, { hitpoints: 52, attack: 65 }, [ PokemonType.Dark, PokemonType.Dragon ], 40);
        this.__tryRegisterPokemon("Zweilous", 634, 4, 45, { hitpoints: 72, attack: 85 }, [ PokemonType.Dark, PokemonType.Dragon ], 60);
        this.__tryRegisterPokemon("Hydreigon", 635, 4, 45, { hitpoints: 92, attack: 105 }, [ PokemonType.Dark, PokemonType.Dragon ], 90);
        this.__tryRegisterPokemon("Goomy", 704, 5, 45, { hitpoints: 45, attack: 50 }, [ PokemonType.Dragon ], 40);
        this.__tryRegisterPokemon("Turtonator", 776, 6, 70, { hitpoints: 60, attack: 78 }, [ PokemonType.Fire, PokemonType.Dragon ], 20);
        this.__tryRegisterPokemon("Drampa", 780, 6, 70, { hitpoints: 78, attack: 60 }, [ PokemonType.Normal, PokemonType.Dragon ], 20);
        this.__tryRegisterPokemon("Jangmo-o", 782, 6, 45, { hitpoints: 45, attack: 55 }, [ PokemonType.Dragon ], 40);
        this.__tryRegisterPokemon("Hakamo-o", 783, 6, 45, { hitpoints: 55, attack: 75 }, [ PokemonType.Dragon, PokemonType.Fighting ], 60);
        this.__tryRegisterPokemon("Kommo-o", 784, 6, 45, { hitpoints: 75, attack: 110 }, [ PokemonType.Dragon, PokemonType.Fighting ], 90);
    }

    /**
     * @brief Loads the fossils related pokemons
     */
    static loadFossilsPokemons()
    {
        // Fossil pokemons
        this.__tryRegisterPokemon("Omanyte", 138, 0, 45, { hitpoints: 35, attack: 40 }, [ PokemonType.Rock, PokemonType.Water ], 30);
        this.__tryRegisterPokemon("Kabuto", 140, 0, 45, { hitpoints: 30, attack: 80 }, [ PokemonType.Rock, PokemonType.Water ], 30);
        this.__tryRegisterPokemon("Aerodactyl", 142, 0, 45, { hitpoints: 80, attack: 105 }, [ PokemonType.Rock, PokemonType.Flying ], 35);
        this.__tryRegisterPokemon("Lileep", 345, 2, 45, { hitpoints: 66, attack: 41 }, [ PokemonType.Rock, PokemonType.Grass ], 30);
        this.__tryRegisterPokemon("Anorith", 347, 2, 45, { hitpoints: 45, attack: 95 }, [ PokemonType.Rock, PokemonType.Bug ], 30);
        this.__tryRegisterPokemon("Shieldon", 410, 3, 45, { hitpoints: 30, attack: 42 }, [ PokemonType.Rock, PokemonType.Steel ], 30);
        this.__tryRegisterPokemon("Cranidos", 408, 3, 45, { hitpoints: 67, attack: 125 }, [ PokemonType.Rock ], 30);
        this.__tryRegisterPokemon("Tirtouga", 564, 4, 45, { hitpoints: 54, attack: 78 }, [ PokemonType.Water, PokemonType.Rock ], 30);
        this.__tryRegisterPokemon("Archen", 566, 4, 45, { hitpoints: 55, attack: 112 }, [ PokemonType.Rock, PokemonType.Flying ], 30);
        this.__tryRegisterPokemon("Tyrunt", 696, 5, 45, { hitpoints: 58, attack: 89 }, [ PokemonType.Rock, PokemonType.Dragon ], 30);
        this.__tryRegisterPokemon("Amaura", 698, 5, 45, { hitpoints: 77, attack: 59 }, [ PokemonType.Rock, PokemonType.Ice ], 30);
    }

    static loadGymPokemons()
    {
        // Kanto gym pokemons
        this.__tryRegisterPokemon("Geodude", 74, 0, 255, { hitpoints: 40, attack: 80 }, [ PokemonType.Rock, PokemonType.Ground ], 15);
        this.__tryRegisterPokemon("Onix", 95, 0, 45, { hitpoints: 35, attack: 45 }, [ PokemonType.Rock, PokemonType.Ground ], 25);
        this.__tryRegisterPokemon("Staryu", 120, 0, 225, { hitpoints: 30, attack: 45 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Starmie", 121, 0, 60, { hitpoints: 60, attack: 75 }, [ PokemonType.Water, PokemonType.Psychic ], 30);
        this.__tryRegisterPokemon("Voltorb", 100, 0, 190, { hitpoints: 40, attack: 30 }, [ PokemonType.Electric ], 20);
        this.__tryRegisterPokemon("Pikachu", 25, 0, 190, { hitpoints: 35, attack: 55 }, [ PokemonType.Electric ], 10);
        this.__tryRegisterPokemon("Raichu", 26, 0, 75, { hitpoints: 60, attack: 90 }, [ PokemonType.Electric ], 15);
        this.__tryRegisterPokemon("Victreebel", 71, 0, 45, { hitpoints: 80, attack: 105 }, [ PokemonType.Grass, PokemonType.Poison ], 45);
        this.__tryRegisterPokemon("Tangela", 114, 0, 45, { hitpoints: 65, attack: 55 }, [ PokemonType.Grass ], 20);
        this.__tryRegisterPokemon("Vileplume", 45, 0, 45, { hitpoints: 75, attack: 80 }, [ PokemonType.Grass, PokemonType.Poison ], 45);
        this.__tryRegisterPokemon("Kadabra", 64, 0, 100, { hitpoints: 40, attack: 35 }, [ PokemonType.Psychic ], 30);
        this.__tryRegisterPokemon("Mr. Mime", 122, 0, 45, { hitpoints: 40, attack: 45 }, [ PokemonType.Psychic, PokemonType.Fairy ], 25);
        this.__tryRegisterPokemon("Venomoth", 49, 0, 75, { hitpoints: 70, attack: 65 }, [ PokemonType.Bug, PokemonType.Poison ], 30);
        this.__tryRegisterPokemon("Alakazam", 65, 0, 50, { hitpoints: 55, attack: 50 }, [ PokemonType.Psychic ], 45);
        this.__tryRegisterPokemon("Koffing", 109, 0, 190, { hitpoints: 40, attack: 65 }, [ PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Muk", 89, 0, 75, { hitpoints: 105, attack: 105 }, [ PokemonType.Poison ], 30);
        this.__tryRegisterPokemon("Weezing", 110, 0, 60, { hitpoints: 65, attack: 90 }, [ PokemonType.Poison ], 30);
        this.__tryRegisterPokemon("Growlithe", 58, 0, 190, { hitpoints: 55, attack: 70 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Ponyta", 77, 0, 190, { hitpoints: 50, attack: 85 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Rapidash", 78, 0, 60, { hitpoints: 65, attack: 100 }, [ PokemonType.Fire ], 30);
        this.__tryRegisterPokemon("Arcanine", 59, 0, 75, { hitpoints: 90, attack: 110 }, [ PokemonType.Fire ], 30);
        this.__tryRegisterPokemon("Rhyhorn", 111, 0, 120, { hitpoints: 80, attack: 85 }, [ PokemonType.Ground, PokemonType.Rock ], 20);
        this.__tryRegisterPokemon("Dugtrio", 51, 0, 50, { hitpoints: 35, attack: 100 }, [ PokemonType.Ground ], 30);
        this.__tryRegisterPokemon("Nidoqueen", 31, 0, 45, { hitpoints: 90, attack: 92 }, [ PokemonType.Poison, PokemonType.Ground ], 45);
        this.__tryRegisterPokemon("Nidoking", 34, 0, 45, { hitpoints: 81, attack: 102 }, [ PokemonType.Poison, PokemonType.Ground ], 45);
        this.__tryRegisterPokemon("Dewgong", 87, 0, 75, { hitpoints: 90, attack: 70 }, [ PokemonType.Water, PokemonType.Ice ], 30);
        this.__tryRegisterPokemon("Cloyster", 91, 0, 60, { hitpoints: 50, attack: 95 }, [ PokemonType.Water, PokemonType.Ice ], 30);
        this.__tryRegisterPokemon("Slowbro", 80, 0, 75, { hitpoints: 95, attack: 75 }, [ PokemonType.Water, PokemonType.Psychic ], 30);
        this.__tryRegisterPokemon("Jynx", 124, 0, 45, { hitpoints: 65, attack: 50 }, [ PokemonType.Ice, PokemonType.Psychic ], 25);
        this.__tryRegisterPokemon("Lapras", 131, 0, 45, { hitpoints: 130, attack: 85 }, [ PokemonType.Water, PokemonType.Ice ], 40);
        this.__tryRegisterPokemon("Hitmonchan", 107, 0, 45, { hitpoints: 50, attack: 105 }, [ PokemonType.Fighting ], 25);
        this.__tryRegisterPokemon("Hitmonlee", 106, 0, 45, { hitpoints: 50, attack: 120 }, [ PokemonType.Fighting ], 25);
        this.__tryRegisterPokemon("Machamp", 68, 0, 45, { hitpoints: 90, attack: 130 }, [ PokemonType.Fighting ], 45);
        this.__tryRegisterPokemon("Gengar", 94, 0, 45, { hitpoints: 60, attack: 65 }, [ PokemonType.Ghost, PokemonType.Poison ], 45);
        this.__tryRegisterPokemon("Golbat", 42, 0, 90, { hitpoints: 75, attack: 80 }, [ PokemonType.Poison, PokemonType.Flying ], 23);
        this.__tryRegisterPokemon("Haunter", 93, 0, 90, { hitpoints: 45, attack: 50 }, [ PokemonType.Ghost, PokemonType.Poison ], 30);
        this.__tryRegisterPokemon("Arbok", 24, 0, 90, { hitpoints: 60, attack: 95 }, [ PokemonType.Poison ], 30);
        this.__tryRegisterPokemon("Gyarados", 130, 0, 45, { hitpoints: 95, attack: 125 }, [ PokemonType.Water, PokemonType.Flying ], 8);
        this.__tryRegisterPokemon("Dragonair", 148, 0, 45, { hitpoints: 61, attack: 84 }, [ PokemonType.Dragon ], 60);
        this.__tryRegisterPokemon("Aerodactyl", 142, 0, 45, { hitpoints: 80, attack: 105 }, [ PokemonType.Rock, PokemonType.Flying ], 35);
        this.__tryRegisterPokemon("Dragonite", 149, 0, 45, { hitpoints: 91, attack: 134 }, [ PokemonType.Dragon, PokemonType.Flying ], 90);
        this.__tryRegisterPokemon("Pidgeot", 18, 0, 45, { hitpoints: 83, attack: 80 }, [ PokemonType.Normal, PokemonType.Flying ], 35);
        this.__tryRegisterPokemon("Rhydon", 112, 0, 60, { hitpoints: 105, attack: 130 }, [ PokemonType.Ground, PokemonType.Rock ], 30);

        // Johto gym pokemons
        this.__tryRegisterPokemon("Pidgey", 16, 0, 255, { hitpoints: 40, attack: 45 }, [ PokemonType.Normal, PokemonType.Flying ], 15);
        this.__tryRegisterPokemon("Pidgeotto", 17, 0, 120, { hitpoints: 63, attack: 60 }, [ PokemonType.Normal, PokemonType.Flying ], 23);
        this.__tryRegisterPokemon("Metapod", 11, 0, 120, { hitpoints: 50, attack: 20 }, [ PokemonType.Bug ], 23);
        this.__tryRegisterPokemon("Kakuna", 14, 0, 120, { hitpoints: 45, attack: 25 }, [ PokemonType.Bug, PokemonType.Poison ], 23);
        this.__tryRegisterPokemon("Scyther", 123, 0, 45, { hitpoints: 70, attack: 110 }, [ PokemonType.Bug, PokemonType.Flying ], 25);
        this.__tryRegisterPokemon("Clefairy", 35, 0, 150, { hitpoints: 70, attack: 45 }, [ PokemonType.Fairy ], 10);
        this.__tryRegisterPokemon("Miltank", 241, 1, 45, { hitpoints: 95, attack: 80 }, [ PokemonType.Normal ], 20);
        this.__tryRegisterPokemon("Gastly", 92, 0, 190, { hitpoints: 30, attack: 35 }, [ PokemonType.Ghost, PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Primeape", 57, 0, 75, { hitpoints: 65, attack: 105 }, [ PokemonType.Fighting ], 30);
        this.__tryRegisterPokemon("Poliwrath", 62, 0, 45, { hitpoints: 90, attack: 95 }, [ PokemonType.Water, PokemonType.Fighting ], 45);
        this.__tryRegisterPokemon("Magnemite", 81, 0, 190, { hitpoints: 25, attack: 35 }, [ PokemonType.Electric, PokemonType.Steel ], 20);
        this.__tryRegisterPokemon("Steelix", 208, 1, 25, { hitpoints: 75, attack: 85 }, [ PokemonType.Steel, PokemonType.Ground ], 38);
        this.__tryRegisterPokemon("Seel", 86, 0, 190, { hitpoints: 65, attack: 45 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Piloswine", 221, 1, 75, { hitpoints: 100, attack: 100 }, [ PokemonType.Ice, PokemonType.Ground ], 30);
        this.__tryRegisterPokemon("Kingdra", 230, 1, 45, { hitpoints: 75, attack: 95 }, [ PokemonType.Water, PokemonType.Dragon ], 45);
        this.__tryRegisterPokemon("Xatu", 178, 1, 75, { hitpoints: 65, attack: 75 }, [ PokemonType.Psychic, PokemonType.Flying ], 30);
        this.__tryRegisterPokemon("Exeggutor", 103, 0, 45, { hitpoints: 95, attack: 95 }, [ PokemonType.Grass, PokemonType.Psychic ], 30);
        this.__tryRegisterPokemon("Ariados", 168, 1, 90, { hitpoints: 70, attack: 90 }, [ PokemonType.Bug, PokemonType.Poison ], 23);
        this.__tryRegisterPokemon("Forretress", 205, 1, 75, { hitpoints: 75, attack: 90 }, [ PokemonType.Bug, PokemonType.Steel ], 30);
        this.__tryRegisterPokemon("Crobat", 169, 1, 90, { hitpoints: 85, attack: 90 }, [ PokemonType.Poison, PokemonType.Flying ], 35);
        this.__tryRegisterPokemon("Hitmontop", 237, 1, 45, { hitpoints: 50, attack: 95 }, [ PokemonType.Fighting ], 25);
        this.__tryRegisterPokemon("Umbreon", 197, 1, 45, { hitpoints: 95, attack: 65 }, [ PokemonType.Dark ], 53);
        this.__tryRegisterPokemon("Murkrow", 198, 1, 30, { hitpoints: 60, attack: 85 }, [ PokemonType.Dark, PokemonType.Flying ], 20);
        this.__tryRegisterPokemon("Houndoom", 229, 1, 45, { hitpoints: 75, attack: 90 }, [ PokemonType.Dark, PokemonType.Fire ], 30);
        this.__tryRegisterPokemon("Charizard", 6, 0, 45, { hitpoints: 78, attack: 84 }, [ PokemonType.Fire, PokemonType.Flying ], 45);
    }

    static loadRoutePokemons()
    {
        // Kanto route pokemons
        this.__tryRegisterPokemon("Pidgey", 16, 0, 255, { hitpoints: 40, attack: 45 }, [ PokemonType.Normal, PokemonType.Flying ], 15);
        this.__tryRegisterPokemon("Rattata", 19, 0, 255, { hitpoints: 30, attack: 56 }, [ PokemonType.Normal ], 15);
        this.__tryRegisterPokemon("Spearow", 21, 0, 255, { hitpoints: 40, attack: 60 }, [ PokemonType.Normal, PokemonType.Flying ], 15);
        this.__tryRegisterPokemon("Mankey", 56, 0, 190, { hitpoints: 40, attack: 80 }, [ PokemonType.Fighting ], 20);
        this.__tryRegisterPokemon("Psyduck", 54, 0, 190, { hitpoints: 50, attack: 52 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Poliwag", 60, 0, 255, { hitpoints: 40, attack: 50 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Slowpoke", 79, 0, 190, { hitpoints: 90, attack: 65 }, [ PokemonType.Water, PokemonType.Psychic ], 20);
        this.__tryRegisterPokemon("Goldeen", 118, 0, 225, { hitpoints: 45, attack: 67 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Magikarp", 129, 0, 255, { hitpoints: 20, attack: 10 }, [ PokemonType.Water ], 5);
        this.__tryRegisterPokemon("Caterpie", 10, 0, 255, { hitpoints: 45, attack: 30 }, [ PokemonType.Bug ], 15);
        this.__tryRegisterPokemon("Weedle", 13, 0, 255, { hitpoints: 40, attack: 35 }, [ PokemonType.Bug, PokemonType.Poison ], 15);
        this.__tryRegisterPokemon("Nidoran(F)", 29, 0, 235, { hitpoints: 55, attack: 47 }, [ PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Nidoran(M)", 32, 0, 235, { hitpoints: 46, attack: 57 }, [ PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Jigglypuff", 39, 0, 170, { hitpoints: 115, attack: 45 }, [ PokemonType.Normal, PokemonType.Fairy ], 10);
        this.__tryRegisterPokemon("Ekans", 23, 0, 255, { hitpoints: 35, attack: 60 }, [ PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Sandshrew", 27, 0, 255, { hitpoints: 50, attack: 75 }, [ PokemonType.Ground ], 20);
        this.__tryRegisterPokemon("Tentacool", 72, 0, 190, { hitpoints: 40, attack: 40 }, [ PokemonType.Water, PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Krabby", 98, 0, 225, { hitpoints: 30, attack: 105 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Horsea", 116, 0, 225, { hitpoints: 30, attack: 40 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Metapod", 11, 0, 120, { hitpoints: 50, attack: 20 }, [ PokemonType.Bug ], 23);
        this.__tryRegisterPokemon("Kakuna", 14, 0, 120, { hitpoints: 45, attack: 25 }, [ PokemonType.Bug, PokemonType.Poison ], 23);
        this.__tryRegisterPokemon("Oddish", 43, 0, 255, { hitpoints: 45, attack: 50 }, [ PokemonType.Grass, PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Abra", 63, 0, 200, { hitpoints: 25, attack: 20 }, [ PokemonType.Psychic ], 20);
        this.__tryRegisterPokemon("Bellsprout", 69, 0, 255, { hitpoints: 50, attack: 75 }, [ PokemonType.Grass, PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Meowth", 52, 0, 255, { hitpoints: 40, attack: 45 }, [ PokemonType.Normal ], 20);
        this.__tryRegisterPokemon("Drowzee", 96, 0, 190, { hitpoints: 60, attack: 48 }, [ PokemonType.Psychic ], 20);
        this.__tryRegisterPokemon("Voltorb", 100, 0, 190, { hitpoints: 40, attack: 30 }, [ PokemonType.Electric ], 20);
        this.__tryRegisterPokemon("Vulpix", 37, 0, 190, { hitpoints: 38, attack: 41 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Growlithe", 58, 0, 190, { hitpoints: 55, attack: 70 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Gloom", 44, 0, 120, { hitpoints: 60, attack: 65 }, [ PokemonType.Grass, PokemonType.Poison ], 30);
        this.__tryRegisterPokemon("Venonat", 48, 0, 190, { hitpoints: 60, attack: 55 }, [ PokemonType.Bug, PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Weepinbell", 70, 0, 120, { hitpoints: 65, attack: 90 }, [ PokemonType.Grass, PokemonType.Poison ], 30);
        this.__tryRegisterPokemon("Farfetch'd", 83, 0, 45, { hitpoints: 52, attack: 90 }, [ PokemonType.Normal, PokemonType.Flying ], 20);
        this.__tryRegisterPokemon("Snorlax", 143, 0, 25, { hitpoints: 160, attack: 110 }, [ PokemonType.Normal ], 40);
        this.__tryRegisterPokemon("Slowbro", 80, 0, 75, { hitpoints: 95, attack: 75 }, [ PokemonType.Water, PokemonType.Psychic ], 30);
        this.__tryRegisterPokemon("Pidgeotto", 17, 0, 120, { hitpoints: 63, attack: 60 }, [ PokemonType.Normal, PokemonType.Flying ], 23);
        this.__tryRegisterPokemon("Ditto", 132, 0, 35, { hitpoints: 48, attack: 48 }, [ PokemonType.Normal ], 20);
        this.__tryRegisterPokemon("Raticate", 20, 0, 127, { hitpoints: 55, attack: 81 }, [ PokemonType.Normal ], 23);
        this.__tryRegisterPokemon("Doduo", 84, 0, 190, { hitpoints: 35, attack: 85 }, [ PokemonType.Normal, PokemonType.Flying ], 20);
        this.__tryRegisterPokemon("Fearow", 22, 0, 90, { hitpoints: 65, attack: 90 }, [ PokemonType.Normal, PokemonType.Flying ], 23);
        this.__tryRegisterPokemon("Shellder", 90, 0, 190, { hitpoints: 30, attack: 65 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Staryu", 120, 0, 225, { hitpoints: 30, attack: 45 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Tangela", 114, 0, 45, { hitpoints: 65, attack: 55 }, [ PokemonType.Grass ], 20);
        this.__tryRegisterPokemon("Arbok", 24, 0, 90, { hitpoints: 60, attack: 95 }, [ PokemonType.Poison ], 30);
        this.__tryRegisterPokemon("Sandslash", 28, 0, 90, { hitpoints: 75, attack: 100 }, [ PokemonType.Ground ], 30);
        this.__tryRegisterPokemon("Primeape", 57, 0, 75, { hitpoints: 65, attack: 105 }, [ PokemonType.Fighting ], 30);

        // Johto route pokemons
        this.__tryRegisterPokemon("Sentret", 161, 1, 255, { hitpoints: 35, attack: 46 }, [ PokemonType.Normal ], 15);
        this.__tryRegisterPokemon("Hoothoot", 163, 1, 255, { hitpoints: 60, attack: 30 }, [ PokemonType.Normal, PokemonType.Flying ], 15);
        this.__tryRegisterPokemon("Exeggcute", 102, 0, 90, { hitpoints: 60, attack: 40 }, [ PokemonType.Grass, PokemonType.Psychic ], 20);
        this.__tryRegisterPokemon("Ledyba", 165, 1, 255, { hitpoints: 40, attack: 20 }, [ PokemonType.Bug, PokemonType.Flying ], 15);
        this.__tryRegisterPokemon("Spinarak", 167, 1, 255, { hitpoints: 40, attack: 60 }, [ PokemonType.Bug, PokemonType.Poison ], 15);
        this.__tryRegisterPokemon("Pineco", 204, 1, 190, { hitpoints: 50, attack: 65 }, [ PokemonType.Bug ], 20);
        this.__tryRegisterPokemon("Geodude", 74, 0, 255, { hitpoints: 40, attack: 80 }, [ PokemonType.Rock, PokemonType.Ground ], 15);
        this.__tryRegisterPokemon("Aipom", 190, 1, 45, { hitpoints: 55, attack: 70 }, [ PokemonType.Normal ], 20);
        this.__tryRegisterPokemon("Heracross", 214, 1, 45, { hitpoints: 80, attack: 125 }, [ PokemonType.Bug, PokemonType.Fighting ], 25);
        this.__tryRegisterPokemon("Zubat", 41, 0, 255, { hitpoints: 40, attack: 45 }, [ PokemonType.Poison, PokemonType.Flying ], 15);
        this.__tryRegisterPokemon("Poliwhirl", 61, 0, 120, { hitpoints: 65, attack: 65 }, [ PokemonType.Water ], 30);
        this.__tryRegisterPokemon("Mareep", 179, 1, 235, { hitpoints: 55, attack: 40 }, [ PokemonType.Electric ], 20);
        this.__tryRegisterPokemon("Hoppip", 187, 1, 255, { hitpoints: 35, attack: 35 }, [ PokemonType.Grass, PokemonType.Flying ], 20);
        this.__tryRegisterPokemon("Wooper", 194, 1, 255, { hitpoints: 55, attack: 45 }, [ PokemonType.Water, PokemonType.Ground ], 20);
        this.__tryRegisterPokemon("Tentacruel", 73, 0, 60, { hitpoints: 80, attack: 70 }, [ PokemonType.Water, PokemonType.Poison ], 30);
        this.__tryRegisterPokemon("Quagsire", 195, 1, 90, { hitpoints: 95, attack: 85 }, [ PokemonType.Water, PokemonType.Ground ], 30);
        this.__tryRegisterPokemon("Qwilfish", 211, 1, 45, { hitpoints: 65, attack: 95 }, [ PokemonType.Water, PokemonType.Poison ], 20);
        this.__tryRegisterPokemon("Corsola", 222, 1, 60, { hitpoints: 65, attack: 55 }, [ PokemonType.Water, PokemonType.Rock ], 20);
        this.__tryRegisterPokemon("Kingler", 99, 0, 60, { hitpoints: 55, attack: 130 }, [ PokemonType.Water ], 30);
        this.__tryRegisterPokemon("Yanma", 193, 1, 75, { hitpoints: 65, attack: 65 }, [ PokemonType.Bug, PokemonType.Flying ], 20);
        this.__tryRegisterPokemon("Golduck", 55, 0, 75, { hitpoints: 80, attack: 82 }, [ PokemonType.Water ], 30);
        this.__tryRegisterPokemon("Stantler", 234, 1, 45, { hitpoints: 73, attack: 95 }, [ PokemonType.Normal ], 20);
        this.__tryRegisterPokemon("Sudowoodo", 185, 1, 65, { hitpoints: 70, attack: 100 }, [ PokemonType.Rock ], 20);
        this.__tryRegisterPokemon("Magnemite", 81, 0, 190, { hitpoints: 25, attack: 35 }, [ PokemonType.Electric, PokemonType.Steel ], 20);
        this.__tryRegisterPokemon("Tauros", 128, 0, 45, { hitpoints: 75, attack: 100 }, [ PokemonType.Normal ], 20);
        this.__tryRegisterPokemon("Snubbull", 209, 1, 190, { hitpoints: 60, attack: 80 }, [ PokemonType.Fairy ], 20);
        this.__tryRegisterPokemon("Miltank", 241, 1, 45, { hitpoints: 95, attack: 80 }, [ PokemonType.Normal ], 20);
        this.__tryRegisterPokemon("Mantine", 226, 1, 25, { hitpoints: 85, attack: 40 }, [ PokemonType.Water, PokemonType.Flying ], 25);
        this.__tryRegisterPokemon("Chinchou", 170, 1, 190, { hitpoints: 75, attack: 38 }, [ PokemonType.Water, PokemonType.Electric ], 20);
        this.__tryRegisterPokemon("Flaaffy", 180, 1, 120, { hitpoints: 70, attack: 55 }, [ PokemonType.Electric ], 30);
        this.__tryRegisterPokemon("Seaking", 119, 0, 60, { hitpoints: 80, attack: 92 }, [ PokemonType.Water ], 30);
        this.__tryRegisterPokemon("Noctowl", 164, 1, 90, { hitpoints: 100, attack: 50 }, [ PokemonType.Normal, PokemonType.Flying ], 23);
        this.__tryRegisterPokemon("Girafarig", 203, 1, 60, { hitpoints: 70, attack: 80 }, [ PokemonType.Normal, PokemonType.Psychic ], 20);
        this.__tryRegisterPokemon("Lickitung", 108, 0, 45, { hitpoints: 90, attack: 55 }, [ PokemonType.Normal ], 20);
        this.__tryRegisterPokemon("Remoraid", 223, 1, 190, { hitpoints: 35, attack: 65 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Graveler", 75, 0, 120, { hitpoints: 55, attack: 95 }, [ PokemonType.Rock, PokemonType.Ground ], 23);
        this.__tryRegisterPokemon("Gligar", 207, 1, 60, { hitpoints: 65, attack: 75 }, [ PokemonType.Ground, PokemonType.Flying ], 20);
        this.__tryRegisterPokemon("Teddiursa", 216, 1, 120, { hitpoints: 60, attack: 80 }, [ PokemonType.Normal ], 20);
        this.__tryRegisterPokemon("Skarmory", 227, 1, 25, { hitpoints: 65, attack: 80 }, [ PokemonType.Steel, PokemonType.Flying ], 25);
        this.__tryRegisterPokemon("Phanpy", 231, 1, 120, { hitpoints: 90, attack: 60 }, [ PokemonType.Ground ], 20);
        this.__tryRegisterPokemon("Dratini", 147, 0, 45, { hitpoints: 41, attack: 64 }, [ PokemonType.Dragon ], 40);
        this.__tryRegisterPokemon("Seel", 86, 0, 190, { hitpoints: 65, attack: 45 }, [ PokemonType.Water ], 20);
        this.__tryRegisterPokemon("Lanturn", 171, 1, 75, { hitpoints: 125, attack: 58 }, [ PokemonType.Water, PokemonType.Electric ], 30);
        this.__tryRegisterPokemon("Butterfree", 12, 0, 45, { hitpoints: 60, attack: 45 }, [ PokemonType.Bug, PokemonType.Flying ], 35);
        this.__tryRegisterPokemon("Beedrill", 15, 0, 45, { hitpoints: 65, attack: 90 }, [ PokemonType.Bug, PokemonType.Poison ], 35);
        this.__tryRegisterPokemon("Diglett", 50, 0, 255, { hitpoints: 10, attack: 55 }, [ PokemonType.Ground ], 20);
        this.__tryRegisterPokemon("Ponyta", 77, 0, 190, { hitpoints: 50, attack: 85 }, [ PokemonType.Fire ], 20);
        this.__tryRegisterPokemon("Dodrio", 85, 0, 45, { hitpoints: 60, attack: 110 }, [ PokemonType.Normal, PokemonType.Flying ], 30);
        this.__tryRegisterPokemon("Donphan", 232, 1, 60, { hitpoints: 90, attack: 120 }, [ PokemonType.Ground ], 30);
        this.__tryRegisterPokemon("Ursaring", 217, 1, 60, { hitpoints: 90, attack: 130 }, [ PokemonType.Normal ], 30);
        this.__tryRegisterPokemon("Rapidash", 78, 0, 60, { hitpoints: 65, attack: 100 }, [ PokemonType.Fire ], 30);
        this.__tryRegisterPokemon("Sneasel", 215, 1, 60, { hitpoints: 55, attack: 95 }, [ PokemonType.Dark, PokemonType.Ice ], 20);
        this.__tryRegisterPokemon("Murkrow", 198, 1, 30, { hitpoints: 60, attack: 85 }, [ PokemonType.Dark, PokemonType.Flying ], 20);
        this.__tryRegisterPokemon("Natu", 177, 1, 190, { hitpoints: 40, attack: 50 }, [ PokemonType.Psychic, PokemonType.Flying ], 20);
    }

    static __tryRegisterPokemon(name, id, nativeRegion, catchRate, base, type, eggCycles)
    {
        // Don't register pokemons if already added
        if ((pokemonMap[name] === undefined) && (pokemonMap[id] === undefined))
        {
            PokemonHelper.__registerPokemon(name, id, nativeRegion, catchRate, base, type, eggCycles);
        }
    }
}

/**
 * Generate the registration list using the following code
 */
/* =======================

buffer = "\n";
dataPrinter = function(pokename)
{
    let pokedata = pokemonMap[pokename];
    let pokemonTypes = pokedata.type.map(x => "PokemonType." + PokemonType[x])
    return `        this.__tryRegisterPokemon("${pokename}"`
         + `, ${pokedata.id}`
         + `, ${pokedata.nativeRegion}`
         + `, ${pokedata.catchRate}`
         + `, { hitpoints: ${pokedata.base.hitpoints}, attack: ${pokedata.base.attack} }`
         + `, [ ${pokemonTypes.join(", ")} ]`
         + `, ${pokedata.eggCycles});\n`;
}

for (const pokename of [ "Kyogre", "Groudon", "Rayquaza", "Dialga", "Palkia", "Snover" ])
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
prevRegion = -1;
gymRegisteredPokemons = new Set();
for (const gymName in GymList)
{
    let gym = GymList[gymName];

    let gymTown = gym.town;
    if (!TownList[gymTown])
    {
        gymTown = gym.parent.name;
    }
    let townRegion = TownList[gymTown].region;

    // Only get the first two regions
    if (townRegion > GameConstants.Region.johto)
    {
        break;
    }

    if (townRegion != prevRegion)
    {
        let regionName = GameConstants.Region[townRegion];
        regionName = regionName.charAt(0).toUpperCase() + regionName.slice(1);
        buffer += `\n        // ${regionName} gym pokemons\n`;
        prevRegion = townRegion;
    }

    for (const pokemon of gym.pokemons)
    {
        if (!gymRegisteredPokemons.has(pokemon.name))
        {
            buffer += dataPrinter(pokemon.name);
            gymRegisteredPokemons.add(pokemon.name)
        }
    }
}

buffer += `\n\n\n\n`;
prevRegion = -1;
routeRegisteredPokemons = new Set();
for (const route of Routes.regionRoutes)
{
    // Only get the first two regions
    if (route.region > GameConstants.Region.johto)
    {
        break;
    }

    // Don't get the sevii islands
    if (route.subRegion && route.subRegion != GameConstants.KantoSubRegions.Kanto)
    {
        continue;
    }

    if (route.region != prevRegion)
    {
        let regionName = GameConstants.Region[route.region];
        regionName = regionName.charAt(0).toUpperCase() + regionName.slice(1);
        buffer += `\n        // ${regionName} route pokemons\n`;
        prevRegion = route.region;
    }

    for (const pokemon of RouteHelper.getAvailablePokemonList(route.number, route.region))
    {
        if (!routeRegisteredPokemons.has(pokemon))
        {
            buffer += dataPrinter(pokemon);
            routeRegisteredPokemons.add(pokemon)
        }
    }
}

console.log(buffer);

======================== */
