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

// Set the player region to the highest possible (since fossil requires that the player have set foot to their region)
player.__highestRegion = GameConstants.Region.alola;

// Load the needed pokemons
PokemonLoader.loadEggsPokemons();
PokemonLoader.loadFossilsPokemons();

/**************************\
|***    TEST-HELPERS    ***|
\**************************/

function addSomePokemonsToThePlayersParty()
{
    let pokemons = [];

    for (const list of App.game.breeding.hatchList)
    {
        pokemons = pokemons.concat(list.slice(0, 1).flat());
    }

    // Simulate the player getting some pokemons
    for (const pokemonName of pokemons)
    {
        const pokemonData = pokemonMap[pokemonName];
        App.game.party.gainPokemonById(pokemonData.id);
    }
}

function expectBreedingPokemonOrderedByBreedingEfficiencyOnly()
{
    /** @note This order might change if new pokemon were to be added, or their value changed */
    expect(App.game.breeding.__eggList[0].pokemon).toEqual("Pikachu");
    expect(App.game.breeding.__eggList[0].isNone()).toBe(false);
    expect(App.game.breeding.__eggList[1].pokemon).toEqual("Hitmonlee");
    expect(App.game.breeding.__eggList[1].isNone()).toBe(false);
    expect(App.game.breeding.__eggList[2].pokemon).toEqual("Ponyta");
    expect(App.game.breeding.__eggList[2].isNone()).toBe(false);
    expect(App.game.breeding.__eggList[3].pokemon).toEqual("Hitmonchan");
    expect(App.game.breeding.__eggList[3].isNone()).toBe(false);
}

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

        // Restore settings
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.NotShinyFirst, false);
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.SpreadPokerus, true);
    });

// Test when an egg reached all the steps needed to hatch
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

    // Test when a player has multiple eggs of the same time
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

describe(`${AutomationTestUtils.categoryPrefix}Fossil breeding:`, () =>
{
    // Test when player has an egg that can hatch uncaught pokemon, for each handled types
    let possibleFossils = Object.keys(GameConstants.FossilToPokemon);
    test.each(possibleFossils)("Having a %s that can hatch uncaught pokemon", (fossilName) =>
    {
        // Give the player an egg
        player.mineInventory().find(i => i.name == fossilName).__amount = 1;

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        expect(App.game.breeding.__eggList[0].pokemon).toEqual(GameConstants.FossilToPokemon[fossilName]);
        expect(App.game.breeding.__eggList[0].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[0].type).toBe(EggType.Fossil);
    });
});

describe(`${AutomationTestUtils.categoryPrefix}Party pokémon breeding:`, () =>
{
    // Test when the player has a lvl 100 pokemon in his party
    test("Breed lvl 100 pokémons", () =>
    {
        addSomePokemonsToThePlayersParty();

        // Put the 1st one to lvl100
        App.game.party.caughtPokemon[0].level = 100;

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        expect(App.game.breeding.__eggList[0].pokemon).toEqual(App.game.party.caughtPokemon[0].name);
        expect(App.game.breeding.__eggList[0].isNone()).toBe(false);
    });

    // Test the breeding order
    test("Test breeding order", () =>
    {
        addSomePokemonsToThePlayersParty();

        // Put the all pokemons to lvl100
        for (const pokemon of App.game.party.caughtPokemon)
        {
            pokemon.level = 100;
        }

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        expectBreedingPokemonOrderedByBreedingEfficiencyOnly();
    });

    // Test the breeding order with shinies
    test("Test breeding order with Shinies > NotShinyFirst setting disabled", () =>
    {
        addSomePokemonsToThePlayersParty();

        // Put the all pokemons to lvl100
        for (const pokemon of App.game.party.caughtPokemon)
        {
            pokemon.level = 100;
        }

        // Make two of them shiny
        App.game.party.getPokemon(pokemonMap["Pikachu"].id).shiny = true;
        App.game.party.getPokemon(pokemonMap["Ponyta"].id).shiny = true;

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        expectBreedingPokemonOrderedByBreedingEfficiencyOnly();
    });

    // Test the breeding order with shinies and the NotShinyFirst setting enabled
    test("Test breeding order with Shinies > NotShinyFirst setting enabled", () =>
    {
        addSomePokemonsToThePlayersParty();

        // Put the all pokemons to lvl100
        for (const pokemon of App.game.party.caughtPokemon)
        {
            pokemon.level = 100;
        }

        // Make two of them shiny
        App.game.party.getPokemon(pokemonMap["Pikachu"].id).shiny = true;
        App.game.party.getPokemon(pokemonMap["Ponyta"].id).shiny = true;

        // Enable the NotShinyFirst feature
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.NotShinyFirst, true);

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        // Pikachu and Ponyta should not have been picked
        /** @note This order might change if new pokemon were to be added, or their value changed */
        expect(App.game.breeding.__eggList[0].pokemon).toEqual("Hitmonlee");
        expect(App.game.breeding.__eggList[0].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[1].pokemon).toEqual("Hitmonchan");
        expect(App.game.breeding.__eggList[1].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[2].pokemon).toEqual("Machop");
        expect(App.game.breeding.__eggList[2].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[3].pokemon).toEqual("Mankey");
        expect(App.game.breeding.__eggList[3].isNone()).toBe(false);
    });

    // Test the breeding order with infected and the SpreadPokerus setting disabled
    test("Test breeding order with pokérus > SpreadPokerus setting disabled", () =>
    {
        addSomePokemonsToThePlayersParty();

        // Put the all pokemons to lvl100
        for (const pokemon of App.game.party.caughtPokemon)
        {
            pokemon.level = 100;
        }

        // Set the pokérus to Mankey
        App.game.party.getPokemon(pokemonMap["Mankey"].id).pokerus = GameConstants.Pokerus.Contagious;

        // Disable the feature
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.SpreadPokerus, false);

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        expectBreedingPokemonOrderedByBreedingEfficiencyOnly();
    });

    // Test the breeding order with infected and the SpreadPokerus setting enabled
    test("Test breeding order with pokérus > SpreadPokerus setting enabled", () =>
    {
        addSomePokemonsToThePlayersParty();

        // Put the all pokemons to lvl100
        for (const pokemon of App.game.party.caughtPokemon)
        {
            pokemon.level = 100;
        }

        // Set the pokérus to Mankey
        App.game.party.getPokemon(pokemonMap["Mankey"].id).pokerus = GameConstants.Pokerus.Contagious;

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        // Mankey should have been picked first, then pokémons sharing a type with it
        /** @note This order might change if new pokemon were to be added, or their value changed */
        expect(App.game.breeding.__eggList[0].pokemon).toEqual("Mankey");
        expect(App.game.breeding.__eggList[0].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[1].pokemon).toEqual("Hitmonlee");
        expect(App.game.breeding.__eggList[1].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[2].pokemon).toEqual("Hitmonchan");
        expect(App.game.breeding.__eggList[2].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[3].pokemon).toEqual("Machop");
        expect(App.game.breeding.__eggList[3].isNone()).toBe(false);
    });

    // Test the breeding order with pokérus when not enough pokémon share type with the infected one
    test("Test breeding order with pokérus when not enough pokémon share type with the infected one", () =>
    {
        addSomePokemonsToThePlayersParty();

        // Put the all pokemons to lvl100
        for (const pokemon of App.game.party.caughtPokemon)
        {
            pokemon.level = 100;
        }

        // Set the pokérus to all Fighting, except Machop
        for (const pokemon of App.game.party.caughtPokemon)
        {
            if (pokemonMap[pokemon.id].type.includes(PokemonType.Fighting) && (pokemon.name != "Machop"))
            {
                pokemon.pokerus = GameConstants.Pokerus.Contagious;
            }
        }

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        // Hitmonlee should have been picked first, then Machop which is the only pokémon sharing its type to not be infected
        /** @note This order might change if new pokemon were to be added, or their value changed */
        expect(App.game.breeding.__eggList[0].pokemon).toEqual("Hitmonlee");
        expect(App.game.breeding.__eggList[0].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[1].pokemon).toEqual("Machop");
        expect(App.game.breeding.__eggList[1].isNone()).toBe(false);

        // Since no more pokémon are eligible to the pokérus spreading, the most efficient beeding pokémon should be added next
        expect(App.game.breeding.__eggList[2].pokemon).toEqual("Pikachu");
        expect(App.game.breeding.__eggList[2].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[3].pokemon).toEqual("Ponyta");
        expect(App.game.breeding.__eggList[3].isNone()).toBe(false);

        // Set the pokérus on Squirtle (Water type)
        App.game.party.getPokemon(pokemonMap["Squirtle"].id).pokerus = GameConstants.Pokerus.Contagious;

        // Complete Pikachu and Ponyta steps
        App.game.breeding.__eggList[2].__steps = App.game.breeding.__eggList[2].totalSteps;
        App.game.breeding.__eggList[3].__steps = App.game.breeding.__eggList[3].totalSteps;

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        // Squirtle should have been picked first, then Psyduck which is the only pokémon sharing its type to not be infected
        /** @note This order might change if new pokemon were to be added, or their value changed */
        expect(App.game.breeding.__eggList[0].pokemon).toEqual("Hitmonlee");
        expect(App.game.breeding.__eggList[0].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[1].pokemon).toEqual("Machop");
        expect(App.game.breeding.__eggList[1].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[2].pokemon).toEqual("Squirtle");
        expect(App.game.breeding.__eggList[2].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[3].pokemon).toEqual("Psyduck");
        expect(App.game.breeding.__eggList[3].isNone()).toBe(false);
    });
});
