import "tst/utils/tests.utils.js";

// Import pokéclicker App
import "tst/imports/Pokeclicker.import.js";

// Import current lib elements
import "tst/stubs/localStorage.stub.js";
import "tst/stubs/Automation/Menu.stub.js";
import "tst/imports/AutomationUtils.import.js";
import "src/lib/Hatchery.js";

import "tst/utils/PokemonLoader.utils.js";
import "tst/utils/hatchery.utils.js";

/************************\
|***    TEST-SETUP    ***|
\************************/

// Stub the Automation class to the bare minimum
class Automation
{
    static Hatchery = AutomationHatchery;
    static Menu = AutomationMenu;
    static Utils = AutomationUtils;

    static Settings = { Notifications: "Notifications" };

    static InitSteps = class AutomationInitSteps
    {
        static BuildMenu = 0;
        static Finalize = 1;
    };
}

// Load the needed pokemons
PokemonLoader.loadEggsPokemons();

/************************\
|***    TEST-SUITE    ***|
\************************/

// Prepare the test-suite
beforeAll(() =>
    {
        Automation.Hatchery.initialize(Automation.InitSteps.Finalize);

        // Expect the hatchery loop to not be set
        expect(Automation.Hatchery.__internal__autoHatcheryLoop).toBe(null);

        // Simulate Hatchery feature being enabled by default (done in the Automation.InitSteps.BuildMenu)
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.FeatureEnabled, true);
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.FeatureEnabled)).toBe("true");

        // Simulate UseEggs setting being enabled by default (done in the Automation.InitSteps.BuildMenu)
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.UseEggs, true);
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.UseEggs)).toBe("true");

        // Simulate UseFossils setting being enabled by default (done in the Automation.InitSteps.BuildMenu)
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.UseFossils, true);
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.UseFossils)).toBe("true");

        // Simulate SpreadPokerus setting being enabled by default (done in the Automation.InitSteps.BuildMenu)
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.SpreadPokerus, true);
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.SpreadPokerus)).toBe("true");

        // Simulate NotShinyFirst setting being disabled by default (done in the Automation.InitSteps.BuildMenu)
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.NotShinyFirst, false);
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.NotShinyFirst)).toBe("false");
    });

beforeEach(() =>
    {
        App.game.party.__reset();

        // Clear the hatchery slots
        for (let i = 0; i < App.game.breeding.__eggList.length; i++)
        {
            App.game.breeding.__eggList[i] = new Egg();
        }

        for (let itemCount of player.__itemListCount)
        {
            itemCount = 0;
        }
    });

// Test when player does not have enough berries to unlock anything
test('Hatching any egg that completed its breeding period', () =>
{
    // Simulate a pokemon being in the 1st slot
    let pokemonName = "Charmander";
    let pokemonData = pokemonMap[pokemonName];
    App.game.party.gainPokemonById(pokemonData.id);

    partyPokemon = App.game.party.getPokemon(pokemonData.id);
    App.game.breeding.addPokemonToHatchery(partyPokemon);

    expect(partyPokemon.breeding).toBe(true);

    // Simulate the loop
    Automation.Hatchery.__internal__hatcheryLoop();

    // Until the pokemon reached its max steps, it should still be breeding
    expect(partyPokemon.breeding).toBe(true);
    expect(App.game.breeding.__eggList[0].isNone()).toBe(false);

    // Simulate the steps being done
    App.game.breeding.__eggList[0].__steps = App.game.breeding.__eggList[0].totalSteps;

    // Simulate the loop
    Automation.Hatchery.__internal__hatcheryLoop();

    // The egg should have been hatched
    expect(partyPokemon.breeding).toBe(false);
    expect(App.game.breeding.__eggList[0].isNone()).toBe(true);
});

describe(`${AutomationTestUtils.categoryPrefix}Egg breeding:`, () =>
{
    // Test when player has an egg that can hatch uncaught pokemon, for each handled types
    let possibleEggs = Object.keys(GameConstants.EggItemType).filter((eggType) => isNaN(eggType) && (eggType != "Pokemon_egg"));
    test.each(possibleEggs)("Having a %s that can hatch uncaught pokemon", (eggType) =>
    {
        // Give the player an egg
        player.__itemListCount[eggType] = 1;

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        let expectedEggType = EggType[eggType.split('_')[0]];
        let expectedPokemonType = (eggType == "Mystery_egg") ? EggType.Fire : expectedEggType;

        expect(App.game.breeding.__eggList[0].pokemon).toEqual(App.game.breeding.hatchList[expectedPokemonType][0][0]);
        expect(App.game.breeding.__eggList[0].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[0].type).toBe(expectedEggType);
    });

    // Test when player does not have enough berries to unlock anything
    test("Don't breed multiple eggs of the same type", () =>
    {
        // Give the player two eggs
        player.__itemListCount["Fire_egg"] = 2;

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        expect(App.game.breeding.__eggList[0].pokemon).toEqual(App.game.breeding.hatchList[EggType.Fire][0][0]);
        expect(App.game.breeding.__eggList[0].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[0].type).toBe(EggType.Fire);
        expect(App.game.breeding.__eggList[1].isNone()).toBe(true);
        expect(App.game.breeding.__eggList[2].isNone()).toBe(true);
        expect(App.game.breeding.__eggList[3].isNone()).toBe(true);

        // Simulate the loop again
        Automation.Hatchery.__internal__hatcheryLoop();

        // No additional egg should have been added
        expect(App.game.breeding.__eggList[1].isNone()).toBe(true);
        expect(App.game.breeding.__eggList[2].isNone()).toBe(true);
        expect(App.game.breeding.__eggList[3].isNone()).toBe(true);

        // Give the player another type of egg
        player.__itemListCount["Grass_egg"] = 1;

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        // The other egg type should have been added
        expect(App.game.breeding.__eggList[1].pokemon).toEqual(App.game.breeding.hatchList[EggType.Grass][0][0]);
        expect(App.game.breeding.__eggList[1].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[1].type).toBe(EggType.Grass);

        // Simulate the 1st egg steps being done
        App.game.breeding.__eggList[0].__steps = App.game.breeding.__eggList[0].totalSteps;

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        // Expect a new egg to be added
        expect(App.game.breeding.__eggList[0].pokemon).toEqual(App.game.breeding.hatchList[EggType.Fire][0][1]);
        expect(App.game.breeding.__eggList[0].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[0].type).toBe(EggType.Fire);
    });
});
