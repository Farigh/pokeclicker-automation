import "tst/utils/tests.utils.js";
import "tst/utils/jest.extensions.utils.js";

// Import pokéclicker App
import "tst/imports/Pokeclicker.import.js";

// Import current lib elements
import "tst/stubs/localStorage.stub.js";
import "tst/stubs/Automation/Menu.stub.js";
import "tst/imports/AutomationUtils.import.js";

import "tst/utils/PokemonLoader.utils.js";

/************************\
|***    TEST-SETUP    ***|
\************************/

// Stub the Automation class to the bare minimum
class Automation
{
    static Menu = AutomationMenu;
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

    // Simulate the player getting all the available pokemons
    for (const entry in pokemonMap)
    {
        let pokemonData = pokemonMap[entry];
        App.game.party.gainPokemonById(pokemonData.id);
    }
});

// Test the __internal__buildPokemonAttackMap initialization
test('Check pokemon attack map initialization', () =>
{
    Automation.Utils.Battle.initialize(Automation.InitSteps.Finalize);

    // Expect the map to have the same size as the caught pokemon list
    expect(Automation.Utils.Battle.__internal__PokemonAttackMap.size).toEqual(App.game.party.caughtPokemon.length);

    // TODO (25/08/2022): Check the output content
});

// Test the __internal__buildPokemonAttackMap update on effortPoints property change
test('Check pokemon attack map update => effortPoints changed', () =>
{
    Automation.Utils.Battle.initialize(Automation.InitSteps.Finalize);

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
    Automation.Utils.Battle.initialize(Automation.InitSteps.Finalize);

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
    Automation.Utils.Battle.initialize(Automation.InitSteps.Finalize);

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

test('Check calculatePokemonAttack() output with weather change', () =>
{
    Automation.Utils.Battle.initialize(Automation.InitSteps.Finalize);

    let pokemonType = PokemonType.Grass;
    let region = GameConstants.Region.alola;
    let resultWithNoWeather = Automation.Utils.Battle.calculatePokemonAttack(pokemonType, region, WeatherType.Clear);

    // Compute with a different weather (Sunny weather boosts a lot of pokemon types)
    let result = Automation.Utils.Battle.calculatePokemonAttack(pokemonType, region, WeatherType.Sunny);

    // Check consistency
    expect(result).not.toEqual(resultWithNoWeather);
});

// Test getPlayerWorstAttackPerSecondForAllRegions() method
test('Check getPlayerWorstAttackPerSecondForAllRegions() output', () =>
{
    Automation.Utils.Battle.initialize(Automation.InitSteps.Finalize);

    let playerClickAttack = 1000;
    let result = Automation.Utils.Battle.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);

    expect(result.length).toEqual(GameConstants.MAX_AVAILABLE_REGION + 1);

    let expectedResult = [ 22452, 22012, 22216, 22175, 21903, 21598, 21709 ];

    // Check consistency
    expect(result).toBeEqualToRange(expectedResult);

    // Updating a pokemon data should update the value accordingly
    App.game.party.caughtPokemon[0].attackBonusAmount += 1;

    // Simulate time passing (update will not trigger otherwise)
    Automation.Utils.Battle.__internal__lastPokemonAttackMapUpdate -= 1000;

    // Ensure the values were updated
    result = Automation.Utils.Battle.getPlayerWorstAttackPerSecondForAllRegions(playerClickAttack);
    expectedResult = [ 22452, 22012, 22217, 22175, 21904, 21598, 21709 ];
    expect(result).toBeEqualToRange(expectedResult);
});

describe(`${AutomationTestUtils.categoryPrefix}Check getPlayerWorstPokemonAttack() method`, () =>
{
    // Test getPlayerWorstPokemonAttack() method
    test.each(Array(GameConstants.MAX_AVAILABLE_REGION + 1).fill().map((_, i) => i))('Check getPlayerWorstPokemonAttack for region %d', (regionId) =>
    {
        Automation.Utils.Battle.initialize(Automation.InitSteps.Finalize);

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
