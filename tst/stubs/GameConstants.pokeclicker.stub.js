// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/modules/GameConstants.ts
class GameConstants
{
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

    static FossilToPokemon =
        {
            'Helix Fossil': 'Omanyte',
            'Dome Fossil': 'Kabuto',
            'Old Amber': 'Aerodactyl',
            'Root Fossil': 'Lileep',
            'Claw Fossil': 'Anorith',
            'Armor Fossil': 'Shieldon',
            'Skull Fossil': 'Cranidos',
            'Cover Fossil': 'Tirtouga',
            'Plume Fossil': 'Archen',
            'Jaw Fossil': 'Tyrunt',
            'Sail Fossil': 'Amaura',
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

    static BREEDING_ATTACK_BONUS = 25;
    static MAX_AVAILABLE_REGION = this.Region.alola;
}
