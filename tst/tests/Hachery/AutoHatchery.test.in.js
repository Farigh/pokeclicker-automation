import "tst/utils/tests.utils.js";

// Import pokéclicker App
import "tst/imports/Pokeclicker.import.js";

// Import current lib stubs
import "tst/stubs/localStorage.stub.js";
import "tst/stubs/Automation/Menu.stub.js";

// Import current lib elements
import "tst/imports/AutomationUtils.import.js";
import "src/lib/Hatchery.js";
import "src/lib/Notifications.js";

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
    static Notifications = AutomationNotifications;
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
PokemonLoader.loadGymPokemons();

/**************************\
|***    TEST-HELPERS    ***|
\**************************/

function addSomePokemonsToThePlayersParty(region = GameConstants.MAX_AVAILABLE_REGION)
{
    let pokemons = [];

    for (const list of App.game.breeding.hatchList)
    {
        pokemons = pokemons.concat(list.slice(0, region + 1).flat());
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
    expect(App.game.breeding.__eggList[2].pokemon).toEqual("Qwilfish");
    expect(App.game.breeding.__eggList[2].isNone()).toBe(false);
    expect(App.game.breeding.__eggList[3].pokemon).toEqual("Ponyta");
    expect(App.game.breeding.__eggList[3].isNone()).toBe(false);
}

function resetSettings()
{
    Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.PrioritizedSortingDescending, true);
    Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.NotShinyFirst, false);
    Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.NotAlternateFormFirst, false);
    Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.SpreadPokerus, true);
    Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.PrioritizedRegion, GameConstants.Region.none);
    Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.PrioritizedType, PokemonType.None);
    Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.RegionalDebuffRegion, GameConstants.Region.none);
    Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.PrioritizedSorting, SortOptions.breedingEfficiency);
    Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.PrioritizedCategory, -1);
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

        // Filtering settings
        resetSettings();
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.PrioritizedSortingDescending)).toBe("true");
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.SpreadPokerus)).toBe("true");
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.NotShinyFirst)).toBe("false");
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.NotAlternateFormFirst)).toBe("false");
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.PrioritizedRegion)).toBe("-1");
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.PrioritizedType)).toBe("-1");
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.RegionalDebuffRegion)).toBe("-1");
        expect(Automation.Utils.LocalStorage.getValue(Automation.Hatchery.Settings.PrioritizedCategory)).toBe("-1");
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
        resetSettings();
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

describe(`${AutomationTestUtils.categoryPrefix}Egg breeding`, () =>
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

describe(`${AutomationTestUtils.categoryPrefix}Party pokémon breeding`, () =>
{
    // Test when the player has a lvl 100 pokemon in his party
    test("Breed lvl 100 pokémons", () =>
    {
        addSomePokemonsToThePlayersParty(GameConstants.Region.johto);

        // Put the 1st one to lvl 100
        App.game.party.caughtPokemon[0].level = 100;

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        expect(App.game.breeding.__eggList[0].pokemon).toEqual(App.game.party.caughtPokemon[0].name);
        expect(App.game.breeding.__eggList[0].isNone()).toBe(false);
    });

    // Test the breeding order
    test("Test breeding order", () =>
    {
        addSomePokemonsToThePlayersParty(GameConstants.Region.johto);

        // Put the all pokemons to lvl 100
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
        addSomePokemonsToThePlayersParty(GameConstants.Region.johto);

        // Put the all pokemons to lvl 100
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
        addSomePokemonsToThePlayersParty(GameConstants.Region.johto);

        // Put the all pokemons to lvl 100
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
        expect(App.game.breeding.__eggList[1].pokemon).toEqual("Qwilfish");
        expect(App.game.breeding.__eggList[1].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[2].pokemon).toEqual("Hitmonchan");
        expect(App.game.breeding.__eggList[2].isNone()).toBe(false);
        expect(App.game.breeding.__eggList[3].pokemon).toEqual("Machop");
        expect(App.game.breeding.__eggList[3].isNone()).toBe(false);
    });

    // Test the breeding order with infected and the SpreadPokerus setting disabled
    test("Test breeding order with pokérus > SpreadPokerus setting disabled", () =>
    {
        addSomePokemonsToThePlayersParty(GameConstants.Region.johto);

        // Put the all pokemons to lvl 100
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
        addSomePokemonsToThePlayersParty(GameConstants.Region.johto);

        // Put the all pokemons to lvl 100
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
        addSomePokemonsToThePlayersParty(GameConstants.Region.johto);

        // Put the all pokemons to lvl 100
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
        expect(App.game.breeding.__eggList[3].pokemon).toEqual("Qwilfish");
        expect(App.game.breeding.__eggList[3].isNone()).toBe(false);

        // Set the pokérus on Squirtle (Water type)
        App.game.party.getPokemon(pokemonMap["Squirtle"].id).pokerus = GameConstants.Pokerus.Contagious;

        // Complete Pikachu and Qwilfish steps
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
        expect(App.game.breeding.__eggList[3].pokemon).toEqual("Qwilfish");
        expect(App.game.breeding.__eggList[3].isNone()).toBe(false);
    });
});

describe(`${AutomationTestUtils.categoryPrefix}Party pokémon breeding order > Region priority`, () =>
{
    /** @note Those orders might change if new pokemon were to be added, or their value changed */
    let regionTestCases =
        [
            { regionId: GameConstants.Region.kanto, regionName: "Kanto", expectedPokemons: [ "Pikachu", "Hitmonlee", "Ponyta", "Hitmonchan" ] },
            { regionId: GameConstants.Region.johto, regionName: "Johto", expectedPokemons: [ "Qwilfish", "Magby", "Totodile", "Elekid" ] },
            { regionId: GameConstants.Region.hoenn, regionName: "Hoenn", expectedPokemons: [ "Mudkip", "Clamperl", "Torchic", "Numel" ] },
            { regionId: GameConstants.Region.sinnoh, regionName: "Sinnoh", expectedPokemons: [ "Pachirisu", "Carnivine", "Turtwig", "Buizel" ] },
            { regionId: GameConstants.Region.unova, regionName: "Unova", expectedPokemons: [ "Sawk", "Throh", "Tepig", "Blitzle" ] },
            { regionId: GameConstants.Region.kalos, regionName: "Kalos", expectedPokemons: [ "Chespin", "Froakie", "Fennekin", "Goomy" ] },
            { regionId: GameConstants.Region.alola, regionName: "Alola", expectedPokemons: [ "Litten", "Crabrawler", "Turtonator", "Rowlet" ] }
        ];

    // Test the breeding order with infected and the PrioritizedRegion setting enabled
    test.each(regionTestCases)("Test breeding order with region set to $regionName", (testCase) =>
    {
        addSomePokemonsToThePlayersParty();

        // Put the all pokemons to lvl 100
        for (const pokemon of App.game.party.caughtPokemon)
        {
            pokemon.level = 100;
        }

        // Set the region filter
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.PrioritizedRegion, testCase.regionId);

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        for (const i of testCase.expectedPokemons.keys())
        {
            expect(App.game.breeding.__eggList[i].pokemon).toEqual(testCase.expectedPokemons[i]);
            expect(App.game.breeding.__eggList[i].isNone()).toBe(false);
        }
    });
});

describe(`${AutomationTestUtils.categoryPrefix}Party pokémon breeding order > Type priority`, () =>
{
    /** @note Those orders might change if new pokemon were to be added, or their value changed */
    let regionTestCases =
        [
            { typeId: PokemonType.Normal, typeName: "Normal", expectedPokemons: [ "Miltank", "Pidgey", "Drampa", "Pidgeotto" ] },
            { typeId: PokemonType.Fire, typeName: "Fire", expectedPokemons: [ "Litten", "Ponyta", "Turtonator", "Magby" ] },
            { typeId: PokemonType.Water, typeName: "Water", expectedPokemons: [ "Gyarados", "Qwilfish", "Popplio", "Mudkip" ] },
            { typeId: PokemonType.Electric, typeName: "Electric", expectedPokemons: [ "Raichu", "Pikachu", "Pachirisu", "Electabuzz" ] },
            { typeId: PokemonType.Grass, typeName: "Grass", expectedPokemons: [ "Carnivine", "Bellsprout", "Rowlet", "Turtwig" ] },
            { typeId: PokemonType.Ice, typeName: "Ice", expectedPokemons: [ "Piloswine", "Cloyster", "Dewgong", "Lapras" ] },
            { typeId: PokemonType.Fighting, typeName: "Fighting", expectedPokemons: [ "Sawk", "Throh", "Hitmonlee", "Hitmonchan" ] },
            { typeId: PokemonType.Ground, typeName: "Ground", expectedPokemons: [ "Geodude", "Rhydon", "Rhyhorn", "Dugtrio" ] },
            { typeId: PokemonType.Flying, typeName: "Flying", expectedPokemons: [ "Gyarados", "Scyther", "Murkrow", "Archen" ] },
            { typeId: PokemonType.Psychic, typeName: "Psychic", expectedPokemons: [ "Exeggutor", "Slowbro", "Starmie", "Xatu" ] },
            { typeId: PokemonType.Bug, typeName: "Bug", expectedPokemons: [ "Scyther", "Ariados", "Anorith", "Forretress" ] },
            { typeId: PokemonType.Rock, typeName: "Rock", expectedPokemons: [ "Geodude", "Rhydon", "Rhyhorn", "Cranidos" ] },
            { typeId: PokemonType.Ghost, typeName: "Ghost", expectedPokemons: [ "Gastly", "Haunter", "Gengar", "Gyarados" ] },
            { typeId: PokemonType.Dragon, typeName: "Dragon", expectedPokemons: [ "Turtonator", "Drampa", "Tyrunt", "Kingdra" ] },
            { typeId: PokemonType.Dark, typeName: "Dark", expectedPokemons: [ "Murkrow", "Houndour", "Houndoom", "Deino" ] },
            { typeId: PokemonType.Steel, typeName: "Steel", expectedPokemons: [ "Forretress", "Steelix", "Magnemite", "Shieldon" ] },
            { typeId: PokemonType.Fairy, typeName: "Fairy", expectedPokemons: [ "Clefairy", "Marill", "Mr. Mime", "Morelull" ] }
        ];

    // Test the breeding order with infected and the PrioritizedType setting enabled
    test.each(regionTestCases)("Test breeding order with type set to $typeName", (testCase) =>
    {
        // Simulate the player getting all the available pokemons
        for (const entry in pokemonMap)
        {
            let pokemonData = pokemonMap[entry];
            App.game.party.gainPokemonById(pokemonData.id);
        }

        // Put the all pokemons to lvl 100
        for (const pokemon of App.game.party.caughtPokemon)
        {
            pokemon.level = 100;
        }

        // Set the region filter
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.PrioritizedType, testCase.typeId);

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        for (const i of testCase.expectedPokemons.keys())
        {
            expect(App.game.breeding.__eggList[i].pokemon).toEqual(testCase.expectedPokemons[i]);
            expect(App.game.breeding.__eggList[i].isNone()).toBe(false);
            let pokemeonData = pokemonMap[App.game.breeding.__eggList[i].pokemon];

            // Only 3 Ghost pokemons are loaded
            let expectMatchingType = !((i === 3) && (testCase.typeId === PokemonType.Ghost));
            expect(pokemeonData.type.includes(testCase.typeId)).toBe(expectMatchingType);
        }
    });
});

describe(`${AutomationTestUtils.categoryPrefix}Party pokémon breeding order > Regional debuff`, () =>
{
    /** @note Those orders might change if new pokemon were to be added, or their value changed */
    let regionTestCases =
        [
            { regionId: GameConstants.Region.kanto, regionName: "Kanto", expectedPokemons: [ "Pikachu", "Hitmonlee", "Sawk", "Ponyta" ] },
            { regionId: GameConstants.Region.johto, regionName: "Johto", expectedPokemons: [ "Qwilfish", "Sawk", "Pikachu", "Magby" ] },
            { regionId: GameConstants.Region.hoenn, regionName: "Hoenn", expectedPokemons: [ "Sawk", "Pikachu", "Mudkip", "Throh" ] },
            { regionId: GameConstants.Region.sinnoh, regionName: "Sinnoh", expectedPokemons: [ "Pachirisu", "Sawk", "Carnivine", "Pikachu" ] },
            { regionId: GameConstants.Region.unova, regionName: "Unova", expectedPokemons: [ "Sawk", "Throh", "Pikachu", "Hitmonlee" ] },
            { regionId: GameConstants.Region.kalos, regionName: "Kalos", expectedPokemons: [ "Sawk", "Pikachu", "Throh", "Hitmonlee" ] },
            { regionId: GameConstants.Region.alola, regionName: "Alola", expectedPokemons: [ "Sawk", "Litten", "Crabrawler", "Turtonator" ] }
        ];

    // Test the breeding order with infected and the SpreadPokerus setting enabled
    test.each(regionTestCases)("Test breeding order with regional debuff set to $regionName", (testCase) =>
    {
        addSomePokemonsToThePlayersParty();

        // Put the all pokemons to lvl 100
        for (const pokemon of App.game.party.caughtPokemon)
        {
            pokemon.level = 100;
        }

        // Set the regional debuff
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.RegionalDebuffRegion, testCase.regionId);

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        for (const i of testCase.expectedPokemons.keys())
        {
            expect(App.game.breeding.__eggList[i].pokemon).toEqual(testCase.expectedPokemons[i]);
            expect(App.game.breeding.__eggList[i].isNone()).toBe(false);
        }
    });
});

describe(`${AutomationTestUtils.categoryPrefix}Party pokémon breeding order > Category priority`, () =>
{
    /** @note Those orders might change if new pokemon were to be added, or their value changed */
    let categoryTestCases =
        [
            { categoryId: -1, categoryName: "Any", expectedPokemons: [ "Sawk", "Pikachu", "Throh", "Hitmonlee" ] },
            {
                categoryId: PokemonCategories.categories()[0].id,
                categoryName: PokemonCategories.categories()[0].name(),
                expectedPokemons: [ "Sawk", "Throh", "Hitmonlee", "Qwilfish"]
            },
            {
                categoryId: PokemonCategories.categories()[1].id,
                categoryName: PokemonCategories.categories()[1].name(),
                expectedPokemons: [ "Pikachu", "Machop", "Sawk", "Throh" ]
            },
        ];

    test.each(categoryTestCases)("Test breeding order with category set to $categoryName", (testCase) =>
    {
        addSomePokemonsToThePlayersParty();

        // Put the all pokemons to lvl 100
        for (const pokemon of App.game.party.caughtPokemon)
        {
            pokemon.level = 100;
        }

        // Put some pokemons in the favorite category
        for (const pokemon of App.game.party.caughtPokemon)
        {
            if (["Machop", "Pikachu"].includes(pokemonMap[pokemon.id].name))
            {
                pokemon.__addCategory(PokemonCategories.categories()[1].id);
                pokemon.__removeCategory(PokemonCategories.categories()[0].id);
            }
        }

        // Set the category priority
        Automation.Utils.LocalStorage.setValue(Automation.Hatchery.Settings.PrioritizedCategory, testCase.categoryId);

        // Simulate the loop
        Automation.Hatchery.__internal__hatcheryLoop();

        for (const i of testCase.expectedPokemons.keys())
        {
            expect(App.game.breeding.__eggList[i].pokemon).toEqual(testCase.expectedPokemons[i]);
            expect(App.game.breeding.__eggList[i].isNone()).toBe(false);
        }
    });
});
