import "tst/utils/tests.utils.js";
import "tst/utils/jest.extensions.utils.js";

// Import pokéclicker App
import "tst/imports/Pokeclicker.import.js";

// Import current lib stubs
import "tst/stubs/localStorage.stub.js";
import "tst/stubs/Automation/Menu.stub.js";

// Import current lib elements
import "tst/imports/AutomationUtils.import.js";
import "src/lib/Click.js";

import "tst/utils/PokemonLoader.utils.js";

/************************\
|***    TEST-SETUP    ***|
\************************/

// Stub the Automation class to the bare minimum
class Automation
{
    static Menu = AutomationMenu;
    static Click = AutomationClick;
    static Utils = AutomationUtils;

    static Settings = { Notifications: "Notifications" };

    static InitSteps = class AutomationInitSteps
    {
        static BuildMenu = 0;
        static Finalize = 1;
    };
}

// Stub the calculateClickAttack method
Automation.Utils.Battle.calculateClickAttack = function() { return App.game.party.calculateClickAttack(); };

// Load some pokémons
PokemonLoader.loadEggsPokemons();

// Simulate the player getting all the available pokemons
for (const entry in pokemonMap)
{
    let pokemonData = pokemonMap[entry];
    App.game.party.gainPokemonById(pokemonData.id);
}

// Load gym pokémons
PokemonLoader.loadGymPokemons();

// Initialize components
Automation.Utils.Battle.initialize(Automation.InitSteps.Finalize);
Automation.Utils.Gym.initialize(Automation.InitSteps.Finalize);

// Simulate the player having unlocked johto
player.__highestRegion = GameConstants.Region.johto;

/************************\
|***    TEST-SUITE    ***|
\************************/

beforeEach(() =>
{
    // Simulate the click loop being active by setting the loop to something different from null
    Automation.Click.__internal__autoClickLoop = "dummy";

    App.game.challenges.list.disableClickAttack.__active = false;
});

// Test findBestGymForFarmingType() method
describe(`${AutomationTestUtils.categoryPrefix}Check findBestGymForFarmingType() method`, () =>
{
    test('Low click attack', () =>
    {
        App.game.party.__clickAttack = 10000;

        let result = Automation.Utils.Gym.findBestGymForFarmingType(PokemonType.Fighting);
        expect(result).not.toBe(null);
        expect(result.Name).toEqual("Elite Bruno");
        expect(result.Town).toEqual("Indigo Plateau Kanto");
        expect(result.Rate).toBeCloseTo(0.517);
    });

    test('Higher click attack', () =>
    {
        // Put a click attack way higher
        // Although this would probably never happen at this point of the game, the same result would be achieved leveling-up pokemons
        App.game.party.__clickAttack = 200000;

        let result = Automation.Utils.Gym.findBestGymForFarmingType(PokemonType.Fighting);
        expect(result).not.toBe(null);
        expect(result.Name).toEqual("Cianwood City");
        expect(result.Town).toEqual("Cianwood City");
        expect(result.Rate).toBeCloseTo(5);
    });

    test('No-click challenge active', () =>
    {
        App.game.party.__clickAttack = 0; // Simulate no-click challenge
        App.game.challenges.list.disableClickAttack.__active = true;

        let result = Automation.Utils.Gym.findBestGymForFarmingType(PokemonType.Fighting);
        expect(result).not.toBe(null);
        expect(result.Name).toEqual("Elite Bruno");
        expect(result.Town).toEqual("Indigo Plateau Kanto");
        expect(result.Rate).toBeCloseTo(0.0058, 3);
    });

    let testCases =
        [
            { testDesc: "Best for Normal type", type: PokemonType.Normal, expectedGym: "Violet City", expectedHigherGym: "Violet City" },
            { testDesc: "Best for Fire type", type: PokemonType.Fire, expectedGym: "Cinnabar Island", expectedHigherGym: "Cinnabar Island" },
            { testDesc: "Best for Water type", type: PokemonType.Water, expectedGym: "Cerulean City", expectedHigherGym: "Cerulean City" },
            { testDesc: "Best for Electric type", type: PokemonType.Electric, expectedGym: "Vermilion City", expectedHigherGym: "Vermilion City" },
            { testDesc: "Best for Grass type", type: PokemonType.Grass, expectedGym: "Celadon City", expectedHigherGym: "Celadon City" },
            { testDesc: "Best for Ice type", type: PokemonType.Ice, expectedGym: "Elite Lorelei", expectedHigherGym: "Elite Lorelei" },
            { testDesc: "Best for Fighting type", type: PokemonType.Fighting, expectedGym: "Elite Bruno", expectedHigherGym: "Cianwood City" },
            { testDesc: "Best for Poison type", type: PokemonType.Poison, expectedGym: "Fuchsia City", expectedHigherGym: "Ecruteak City" },
            { testDesc: "Best for Ground type", type: PokemonType.Ground, expectedGym: "Pewter City", expectedHigherGym: "Viridian City" },
            { testDesc: "Best for Flying type", type: PokemonType.Flying, expectedGym: "Elite Lance", expectedHigherGym: "Champion Lance" },
            { testDesc: "Best for Psychic type", type: PokemonType.Psychic, expectedGym: "Cerulean City", expectedHigherGym: "Elite Will" },
            { testDesc: "Best for Bug type", type: PokemonType.Bug, expectedGym: "Azalea Town", expectedHigherGym: "Azalea Town" },
            { testDesc: "Best for Rock type", type: PokemonType.Rock, expectedGym: "Pewter City", expectedHigherGym: "Pewter City" },
            { testDesc: "Best for Ghost type", type: PokemonType.Ghost, expectedGym: "Elite Agatha", expectedHigherGym: "Ecruteak City" },
            { testDesc: "Best for Dragon type", type: PokemonType.Dragon, expectedGym: "Elite Lance", expectedHigherGym: "Blackthorn City" },
            { testDesc: "Best for Dark type", type: PokemonType.Dark, expectedGym: "Elite Karen", expectedHigherGym: "Elite Karen" },
            { testDesc: "Best for Steel type", type: PokemonType.Steel, expectedGym: "Olivine City", expectedHigherGym: "Olivine City" },
            { testDesc: "Best for Fairy type", type: PokemonType.Fairy, expectedGym: "Saffron City", expectedHigherGym: "Goldenrod City" }
        ];

    test.each(testCases)('$testDesc', (testCase) =>
    {
        App.game.party.__clickAttack = 10000;

        let result = Automation.Utils.Gym.findBestGymForFarmingType(testCase.type);
        expect(result).not.toBe(null);
        expect(result.Name).toEqual(testCase.expectedGym);

        // Put a click attack way higher
        // Although this would probably never happen, the same result would be achieved leveling-up pokemons
        App.game.party.__clickAttack = 500000;

        result = Automation.Utils.Gym.findBestGymForFarmingType(testCase.type);
        expect(result).not.toBe(null);
        expect(result.Name).toEqual(testCase.expectedHigherGym);
    });
});
