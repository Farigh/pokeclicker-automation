// Stub of https://github.com/pokeclicker/pokeclicker/blob/4921661cd9b1635f9fd745aba62102ac3f5786ff/src/modules/GameConstants.ts
class GameConstants
{
    static clipNumber(num, min, max)
    {
        return Math.min(Math.max(num, min), max);
    }

    static formatTime(number)
    {
        return "";
    }

    static getGymIndex(gymName)
    {
        return this.RegionGyms.flat().findIndex((g) => g === gymName);
    }

    static BattleItemType =
    {
        Dowsing_machine: "Dowsing_machine",
        Lucky_egg: "Lucky_egg",
        Lucky_incense: "Lucky_incense",
        Token_collector: "Token_collector",
        xAttack: "xAttack",
        xClick: "xClick"
    };

    static Currency =
        {
            0: "money",
            1: "questPoint",
            2: "dungeonToken",
            3: "diamond",
            4: "farmPoint",
            5: "battlePoint",
            battlePoint: 5,
            diamond: 3,
            dungeonToken: 2,
            farmPoint: 4,
            money: 0,
            questPoint: 1
        };

    static DockTowns =
        [
            'Vermilion City', // Kanto
            'Olivine City', // Johto
            'Slateport City', // Hoenn
            'Canalave City', // Sinnoh
            'Castelia City', // Unova
            'Coumarine City', // Kalos
            'Hau\'oli City', // Alola
            'Hulbury' // Galar
        ];

    static EggItemType =
        {
            0: "Fire_egg",
            1: "Water_egg",
            2: "Grass_egg",
            3: "Fighting_egg",
            4: "Electric_egg",
            5: "Dragon_egg",
            6: "Pokemon_egg",
            7: "Mystery_egg",
            Dragon_egg: 5,
            Electric_egg: 4,
            Fighting_egg: 3,
            Fire_egg: 0,
            Grass_egg: 2,
            Mystery_egg: 7,
            Pokemon_egg: 6,
            Water_egg: 1
        };

    static EnergyRestoreSize =
    {
        0: "SmallRestore",
        1: "MediumRestore",
        2: "LargeRestore",
        LargeRestore: 2,
        MediumRestore: 1,
        SmallRestore: 0
    };

    static FARM_PLOT_WIDTH = 5;

    static GameState =
        {
            0: "idle",
            1: "paused",
            2: "fighting",
            3: "gym",
            4: "dungeon",
            5: "safari",
            6: "town",
            7: "shop",
            8: "battleFrontier",
            9: "temporaryBattle",
            battleFrontier: 8,
            dungeon: 4,
            fighting: 2,
            gym: 3,
            idle: 0,
            paused: 1,
            safari: 5,
            shop: 7,
            temporaryBattle: 9,
            town: 6
        };

    static Pokeball =
        {
            "-1": "None",
            0: "Pokeball",
            1: "Greatball",
            2: "Ultraball",
            3: "Masterball",
            4: "Fastball",
            5: "Quickball",
            6: "Timerball",
            7: "Duskball",
            8: "Luxuryball",
            9: "Diveball",
            10: "Lureball",
            11: "Nestball",
            12: "Repeatball",
            13: "Beastball",
            Beastball: 13,
            Diveball: 9,
            Duskball: 7,
            Fastball: 4,
            Greatball: 1,
            Lureball: 10,
            Luxuryball: 8,
            Masterball: 3,
            Nestball: 11,
            None: -1,
            Pokeball: 0,
            Quickball: 5,
            Repeatball: 12,
            Timerball: 6,
            Ultraball: 2
        };

    static Pokerus =
        {
            0: "Uninfected",
            1: "Infected",
            2: "Contagious",
            3: "Resistant",
            Contagious: 2,
            Infected: 1,
            Resistant: 3,
            Uninfected: 0
        };

    static ShadowStatus =
        {
            0: "None",
            1: "Shadow",
            2: "Purified",
            None: 0,
            Shadow: 1,
            Purified: 2
        }

    static Region =
        {
            "-1": "none",
            0: "kanto",
            1: "johto",
            2: "hoenn",
            3: "sinnoh",
            4: "unova",
            5: "kalos",
            6: "alola",
            7: "galar",
            8: "final",
            alola: 6,
            final: 8,
            galar: 7,
            hoenn: 2,
            johto: 1,
            kalos: 5,
            kanto: 0,
            none: -1,
            sinnoh: 3,
            unova: 4
        };

    static TypeEffectiveness =
        {
            0: "Immune",
            1: "NotVery",
            2: "Neutral",
            3: "Very",
            Immune: 0,
            Neutral: 2,
            NotVery: 1,
            Very: 3
        };

    static TypeEffectivenessValue =
        {
            0: "Immune",
            "0.5": "NotVery",
            1: "Neutral",
            2: "Very",
            Immune: 0,
            Neutral: 1,
            NotVery: 0.5,
            Very: 2
        };

    // RegionGym
    static KantoGyms =
        [
            'Pewter City',
            'Cerulean City',
            'Vermilion City',
            'Celadon City',
            'Saffron City',
            'Fuchsia City',
            'Cinnabar Island',
            'Viridian City',
            'Elite Lorelei',
            'Elite Bruno',
            'Elite Agatha',
            'Elite Lance',
            'Champion Blue',
        ];

    static JohtoGyms =
        [
            'Violet City',
            'Azalea Town',
            'Goldenrod City',
            'Ecruteak City',
            'Cianwood City',
            'Olivine City',
            'Mahogany Town',
            'Blackthorn City',
            'Elite Will',
            'Elite Koga',
            'Elite Bruno2',
            'Elite Karen',
            'Champion Lance',
        ];

    static RegionGyms = [ this.KantoGyms, this.JohtoGyms ];

    static EP_CHALLENGE_MODIFIER = 10;
    static EP_EV_RATIO = 1000;

    static BREEDING_ATTACK_BONUS = 25;
    static FLUTE_TYPE_ATTACK_MULTIPLIER = 1.005;
    static GEM_UPGRADE_STEP = 0.1;
    static GYM_GEMS = 5;
    static MAX_AVAILABLE_REGION = this.Region.alola;
}
