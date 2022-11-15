
// Stub of https://github.com/pokeclicker/pokeclicker/blob/d78f274c09c2cf0c52dda9c9cd5abd94e5b45ca2/src/modules/settings/SortOptions.ts
SortOptions =
    {
        0: "id",
        1: "name",
        2: "attack",
        3: "level",
        4: "shiny",
        5: "baseAttack",
        6: "breedingEfficiency",
        7: "eggCycles",
        8: "timesHatched",
        9: "category",
        10: "proteinsUsed",
        11: "evs",
        attack: 2,
        baseAttack: 5,
        breedingEfficiency: 6,
        category: 9,
        eggCycles: 7,
        evs: 11,
        id: 0,
        level: 3,
        name: 1,
        proteinsUsed: 10,
        shiny: 4,
        timesHatched: 8
    };

SortOptionConfigs =
    {
        [SortOptions.id]: {
            text: 'Pokémon #',
            getValue: (p) => p.id,
        },

        [SortOptions.name]: {
            text: 'Name',
            getValue: (p) => p.displayName,
        },

        [SortOptions.attack]: {
            text: 'Attack',
            getValue: (p) => p.attack,
        },

        [SortOptions.level]: {
            text: 'Level',
            getValue: (p) => p.level,
        },

        [SortOptions.shiny]: {
            text: 'Shiny',
            getValue: (p) => p.shiny,
        },

        [SortOptions.baseAttack]: {
            text: 'Base Attack',
            getValue: (p) => p.baseAttack,
        },

        [SortOptions.breedingEfficiency]: {
            text: 'Breeding Efficiency',
            getValue: (p) => ((p.baseAttack * (GameConstants.BREEDING_ATTACK_BONUS / 100) + p.proteinsUsed()) / pokemonMap[p.name].eggCycles),
        },

        [SortOptions.eggCycles]: {
            text: 'Egg Steps',
            getValue: (p) => pokemonMap[p.name].eggCycles,
        },

        [SortOptions.timesHatched]: {
            text: 'Times Hatched',
            getValue: (p) => App.game.statistics.pokemonHatched[p.id]() || 0,
        },

        [SortOptions.category]: {
            text: 'Category',
            getValue: (p) => p.category,
            invert: true,
        },

        [SortOptions.proteinsUsed]: {
            text: 'Proteins Used',
            getValue: (p) => p.proteinsUsed() || 0,
        },

        [SortOptions.evs]: {
            text: 'EVs',
            getValue: (p) => p.evs() || 0,
        },
    };
