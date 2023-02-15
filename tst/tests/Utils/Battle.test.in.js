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

// Load some pokemons
PokemonLoader.loadEggsPokemons();
PokemonLoader.loadFossilsPokemons();

/**************************\
|***    TEST-HELPERS    ***|
\**************************/

function expectMapValueToBeUpdatedForPokemon(pokemon)
{
    let valueBefore = Automation.Utils.Battle.__internal__PokemonAttackMap.get(pokemon.id);
    Automation.Utils.Battle.__internal__updatePokemonAttackMap();

    // Simulate time passing
    Automation.Utils.Battle.__internal__lastPokemonAttackMapUpdate -= 1000;
    Automation.Utils.Battle.__internal__updatePokemonAttackMap();

    // The value should have been updated
    let valueAfter = Automation.Utils.Battle.__internal__PokemonAttackMap.get(pokemon.id);
    expect(valueAfter).not.toEqual(valueBefore);
}

/************************\
|***    TEST-SUITE    ***|
\************************/

beforeEach(() =>
{
    App.game.party.__reset();
    Automation.Utils.Battle.__internal__PokemonAttackMap = new Map();
    Automation.Click.__internal__autoClickLoop = null;
    App.game.challenges.list.disableClickAttack.__active = false;

    // Simulate the player getting all the available pokemons
    for (const entry in pokemonMap)
    {
        let pokemonData = pokemonMap[entry];
        App.game.party.gainPokemonById(pokemonData.id);
    }

    // Initialize the battle utils
    Automation.Utils.Battle.initialize(Automation.InitSteps.Finalize);
});

describe(`${AutomationTestUtils.categoryPrefix}Check pokemon attack internal map`, () =>
{
    // Test the __internal__buildPokemonAttackMap initialization
    test('Check pokemon attack map initialization', () =>
    {
        // Expect the map to have the same size as the caught pokemon list
        expect(Automation.Utils.Battle.__internal__PokemonAttackMap.size).toEqual(App.game.party.caughtPokemon.length);

        // TODO (25/08/2022): Check the output content
    });

    // Test the __internal__buildPokemonAttackMap update on effortPoints property change
    test('Check pokemon attack map update => effortPoints changed', () =>
    {
        let pokemon = App.game.party.caughtPokemon[0];

        // Update a value of the first pokemon on the list
        pokemon.effortPoints = 100;

        expectMapValueToBeUpdatedForPokemon(pokemon);

        // The new value should have been saved
        let newValue = Automation.Utils.Battle.__internal__PokemonAttackMap.get(pokemon.id);
        expect(newValue.lastEffortPoints).toBe(100);
        expect(newValue.lastAttackBonusAmount).toBe(0);
    });

    // Test the __internal__buildPokemonAttackMap update on attackBonusAmount property change
    test('Check pokemon attack map update => attackBonusAmount changed', () =>
    {
        let pokemon = App.game.party.caughtPokemon[0];

        // Update a value of the first pokemon on the list
        pokemon.attackBonusAmount = 1;

        expectMapValueToBeUpdatedForPokemon(pokemon);

        // The new value should have been saved
        let newValue = Automation.Utils.Battle.__internal__PokemonAttackMap.get(pokemon.id);
        expect(newValue.lastEffortPoints).toBe(0);
        expect(newValue.lastAttackBonusAmount).toBe(1);
    });

    // Test the __internal__buildPokemonAttackMap update delay
    test('Check pokemon attack map does not update more than once every second', () =>
    {
        let pokemon = App.game.party.caughtPokemon[0];
        let valueBefore = Automation.Utils.Battle.__internal__PokemonAttackMap.get(pokemon.id);

        // Update a value of the first pokemon on the list
        pokemon.attackBonusAmount += 1;

        Automation.Utils.Battle.__internal__updatePokemonAttackMap();

        // The map should not have been updated
        let valueAfter = Automation.Utils.Battle.__internal__PokemonAttackMap.get(pokemon.id);
        expect(valueAfter).toEqual(valueBefore);

        // Simulate time passing
        Automation.Utils.Battle.__internal__lastPokemonAttackMapUpdate -= 1000;
        Automation.Utils.Battle.__internal__updatePokemonAttackMap();

        // The value should have been updated
        valueAfter = Automation.Utils.Battle.__internal__PokemonAttackMap.get(pokemon.id);
        expect(valueAfter).not.toEqual(valueBefore);
    });
});

// Test calculateClickAttack() method
test('Check calculateClickAttack() output', () =>
{
    App.game.party.__clickAttack = 1000;

    // If the click feature is not running, the click attack should be 0
    expect(Automation.Utils.Battle.calculateClickAttack()).toEqual(0);

    // Simulate the click loop being active by setting the loop to something different from null
    Automation.Click.__internal__autoClickLoop = "dummy";
    expect(Automation.Utils.Battle.calculateClickAttack()).toEqual(684);

    // Simulate the no-click challenge being enabled
    App.game.challenges.list.disableClickAttack.__active = true;

    // If the no-click challenge is active, the click attack should be 0, even if the feature is enabled (should never happen though)
    expect(Automation.Utils.Battle.calculateClickAttack()).toEqual(0);

    // Turning the feature off should still return 0
    Automation.Click.__internal__autoClickLoop = null;
    expect(Automation.Utils.Battle.calculateClickAttack()).toEqual(0);
});

// Test calculatePokemonAttack() method
test('Check calculatePokemonAttack() output with weather change', () =>
{
    let pokemonType = PokemonType.Grass;
    let region = GameConstants.Region.alola;
    let resultWithNoWeather = Automation.Utils.Battle.calculatePokemonAttack(pokemonType, region, WeatherType.Clear);

    // Compute with a different weather (Sunny weather boosts a lot of pokemon types)
    let result = Automation.Utils.Battle.calculatePokemonAttack(pokemonType, region, WeatherType.Sunny);

    // Check consistency
    expect(result).not.toEqual(resultWithNoWeather);
});

// Test getGameTickCountNeededToDefeatPokemon() method
describe(`${AutomationTestUtils.categoryPrefix}Check getGameTickCountNeededToDefeatPokemon() method`, () =>
{
    let testCases =
        [
            {
                testDesc: "Click attack high enough to defeat pokemon in a single click attack",
                clickAttack: 10000,
                pokemonAtkPerSecond: 8000,
                expectedResult: 1
            },
            {
                testDesc: "Click attack high enough to defeat pokemon in a 3 click attacks",
                clickAttack: 4000,
                pokemonAtkPerSecond: 8000,
                expectedResult: 3
            },
            {
                testDesc: "Click attack not high enough to defeat pokemon without pokemons",
                clickAttack: 195,
                pokemonAtkPerSecond: 6000,
                expectedResult: 21
            },
            {
                testDesc: "Both click and pokemons attack not high enough to defeat pokemon in a single turn",
                clickAttack: 20,
                pokemonAtkPerSecond: 1000,
                expectedResult: 150
            },
            {
                testDesc: "Click attack equals zero",
                clickAttack: 0,
                pokemonAtkPerSecond: 8000,
                expectedResult: 40
            }
        ];

    test.each(testCases)('$testDesc', (testCase) =>
    {
        let totalAtkPerSecond = (testCase.clickAttack * 20) + testCase.pokemonAtkPerSecond;
        let pokemonHp = 10000;
        let result = Automation.Utils.Battle.getGameTickCountNeededToDefeatPokemon(pokemonHp, testCase.clickAttack, totalAtkPerSecond);

        expect(result).toEqual(testCase.expectedResult);
    });
});

// Test getPlayerWorstAttackPerSecondForAllRegions() method
test('Check getPlayerWorstAttackPerSecondForAllRegions() output', () =>
{
    let playerClickAttack = 1000;
    let result = Automation.Utils.Battle.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);

    expect(result.size).toEqual(GameConstants.MAX_AVAILABLE_REGION + 2);

    let expectedResult = new Map([ [ 0, 22452 ], [ 1, 22012 ], [ 2, 22216 ], [ 3, 22175 ], [ 4, 21903 ], [ 5, 21598 ], [ 6, 21709 ],
                                   [ Automation.Utils.Battle.SpecialRegion.MagikarpJump, 20000 ] ]);

    // Check consistency
    expect(result).toBeEqualToRange(expectedResult);

    // Updating a pokemon data should update the value accordingly
    App.game.party.caughtPokemon[0].attackBonusAmount += 1;

    // Simulate time passing (update will not trigger otherwise)
    Automation.Utils.Battle.__internal__lastPokemonAttackMapUpdate -= 1000;

    // Ensure the values were updated
    result = Automation.Utils.Battle.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);
    expectedResult = new Map([ [ 0, 22452 ], [ 1, 22012 ], [ 2, 22217 ], [ 3, 22175 ], [ 4, 21904 ], [ 5, 21598 ], [ 6, 21709 ],
                               [ Automation.Utils.Battle.SpecialRegion.MagikarpJump, 20000 ] ]);
    expect(result).toBeEqualToRange(expectedResult);
});

describe(`${AutomationTestUtils.categoryPrefix}Check getPlayerWorstPokemonAttack() method`, () =>
{
    // Test getPlayerWorstPokemonAttack() method
    test.each(Array(GameConstants.MAX_AVAILABLE_REGION + 1).fill().map((_, i) => i))('Check getPlayerWorstPokemonAttack for region %d', (regionId) =>
    {
        // Compute expected result
        let expectedResult = Number.MAX_SAFE_INTEGER;
        let ignoreDebuff = false;
        let ignoreBreeding = true;
        let ignoreLevel = true;
        let useBaseAttack = false;
        let weatherType = WeatherType.Clear;

        for (const type of Array(Gems.nTypes).keys())
        {
            // The optimized method should return the exact same result as the official method
            let pokemonAttack = App.game.party.calculatePokemonAttack(
                type, PokemonType.None, ignoreDebuff, regionId, ignoreBreeding, useBaseAttack, weatherType, ignoreLevel);
            if (pokemonAttack < expectedResult)
            {
                expectedResult = pokemonAttack
            }
        }

        let result = Automation.Utils.Battle.getPlayerWorstPokemonAttack(regionId);

        // Check consistency
        expect(result).toEqual(expectedResult);
    });
});
