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

let onlyEggsPokemons = App.game.party.caughtPokemon;

// Load route pokémons
PokemonLoader.loadRoutePokemons();

// Initialize components
Automation.Utils.Battle.initialize(Automation.InitSteps.Finalize);
Automation.Utils.Route.initialize(Automation.InitSteps.Finalize);

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

    App.game.party.__reset();
    App.game.party.caughtPokemon = onlyEggsPokemons;
    player.region = -1;
    player.__route = -1;
});

// Test moveToBestRouteForExp() method
describe(`${AutomationTestUtils.categoryPrefix}Check moveToBestRouteForExp() method`, () =>
{
    test('Low click attack', () =>
    {
        player.region = 0;
        App.game.party.__clickAttack = 500;

        Automation.Utils.Route.moveToBestRouteForExp();
        expect(player.route()).toEqual(3);
        expect(player.region).toEqual(GameConstants.Region.kanto);
    });

    test('Higher click attack', () =>
    {
        player.region = 0;
        App.game.party.__clickAttack = 95000;

        Automation.Utils.Route.moveToBestRouteForExp();
        expect(player.route()).toEqual(37);
        expect(player.region).toEqual(GameConstants.Region.johto);
    });

    test('No-click challenge active', () =>
    {
        player.region = 0;
        App.game.party.__clickAttack = 0; // Simulate no-click challenge
        App.game.challenges.list.disableClickAttack.__active = true;

        Automation.Utils.Route.moveToBestRouteForExp();
        expect(player.route()).toEqual(25);
        expect(player.region).toEqual(GameConstants.Region.kanto);
    });
});

// Test moveToHighestDungeonTokenIncomeRoutes() method
describe(`${AutomationTestUtils.categoryPrefix}Check moveToHighestDungeonTokenIncomeRoute() method`, () =>
{
    test('Low click attack > Pokeball', () =>
    {
        // Put a reduced team to make sure changing the ball would change the route (pokemon defeat takes time)
        App.game.party.__reset();
        App.game.party.gainPokemonById(4); // Give the player Charmander

        App.game.party.__clickAttack = 5;

        Automation.Utils.Route.moveToHighestDungeonTokenIncomeRoute(GameConstants.Pokeball.Pokeball);
        expect(player.route()).toEqual(2);
        expect(player.region).toEqual(GameConstants.Region.kanto);
    });

    test('Low click attack > Ultraball', () =>
    {
        // Put a reduced team to make sure changing the ball would change the route (pokemon defeat takes time)
        App.game.party.__reset();
        App.game.party.gainPokemonById(4); // Give the player Charmander

        App.game.party.__clickAttack = 5;

        Automation.Utils.Route.moveToHighestDungeonTokenIncomeRoute(GameConstants.Pokeball.Ultraball);
        expect(player.route()).toEqual(22);
        expect(player.region).toEqual(GameConstants.Region.kanto);
    });

    test('Higher click attack', () =>
    {
        App.game.party.__clickAttack = 10000;

        Automation.Utils.Route.moveToHighestDungeonTokenIncomeRoute(GameConstants.Pokeball.Ultraball);
        expect(player.route()).toEqual(29);
        expect(player.region).toEqual(GameConstants.Region.johto);
    });

    test('No-click challenge active', () =>
    {
        App.game.party.__clickAttack = 0; // Simulate no-click challenge
        App.game.challenges.list.disableClickAttack.__active = true;

        Automation.Utils.Route.moveToHighestDungeonTokenIncomeRoute(GameConstants.Pokeball.Ultraball);
        expect(player.route()).toEqual(25);
        expect(player.region).toEqual(GameConstants.Region.kanto);
    });
});

// Test findBestRouteForFarmingType() method
describe(`${AutomationTestUtils.categoryPrefix}Check findBestRouteForFarmingType() method`, () =>
{
    test('Low click attack', () =>
    {
        App.game.party.__clickAttack = 10000;

        let result = Automation.Utils.Route.findBestRouteForFarmingType(PokemonType.Fighting);
        expect(result).not.toBe(null);
        expect(result.Route).toEqual(3);
        expect(result.Region).toEqual(GameConstants.Region.kanto);
        expect(result.Rate).toBeCloseTo(0.17);
    });

    test('Higher click attack', () =>
    {
        // Put a click attack way higher
        // Although this would probably never happen at this point of the game, the same result would be achieved leveling-up pokemons
        App.game.party.__clickAttack = 200000;

        let result = Automation.Utils.Route.findBestRouteForFarmingType(PokemonType.Fighting);
        expect(result).not.toBe(null);
        expect(result.Route).toEqual(42);
        expect(result.Region).toEqual(GameConstants.Region.johto);
        expect(result.Rate).toBeCloseTo(0.18);
    });

    test('No-click challenge active', () =>
    {
        App.game.party.__clickAttack = 0; // Simulate no-click challenge
        App.game.challenges.list.disableClickAttack.__active = true;

        let result = Automation.Utils.Route.findBestRouteForFarmingType(PokemonType.Fighting);
        expect(result).not.toBe(null);
        expect(result.Route).toEqual(3);
        expect(result.Region).toEqual(GameConstants.Region.kanto);
        expect(result.Rate).toBeCloseTo(0.0083, 3);
    });

    let testCases =
        [
            { testDesc: "Best for Normal type", type: PokemonType.Normal, expectedRoute: [ 0, 1 ], expectedHigherRoute: [ 0, 18 ] },
            { testDesc: "Best for Fire type", type: PokemonType.Fire, expectedRoute: [ 0, 8 ], expectedHigherRoute: [ 0, 7 ] },
            { testDesc: "Best for Water type", type: PokemonType.Water, expectedRoute: [ 0, 22 ], expectedHigherRoute: [ 1, 41 ] },
            { testDesc: "Best for Electric type", type: PokemonType.Electric, expectedRoute: [ 0, 10 ], expectedHigherRoute: [ 1, 42 ] },
            { testDesc: "Best for Grass type", type: PokemonType.Grass, expectedRoute: [ 0, 5 ], expectedHigherRoute: [ 0, 15 ] },
            { testDesc: "Best for Ice type", type: PokemonType.Ice, expectedRoute: [ 1, 28 ], expectedHigherRoute: [ 1, 28 ] },
            { testDesc: "Best for Fighting type", type: PokemonType.Fighting, expectedRoute: [ 0, 3 ], expectedHigherRoute: [ 1, 42 ] },
            { testDesc: "Best for Poison type", type: PokemonType.Poison, expectedRoute: [ 0, 3 ], expectedHigherRoute: [ 0, 15 ] },
            { testDesc: "Best for Ground type", type: PokemonType.Ground, expectedRoute: [ 0, 4 ], expectedHigherRoute: [ 1, 45 ] },
            { testDesc: "Best for Flying type", type: PokemonType.Flying, expectedRoute: [ 0, 1 ], expectedHigherRoute: [ 0, 18 ] },
            { testDesc: "Best for Psychic type", type: PokemonType.Psychic, expectedRoute: [ 0, 22 ], expectedHigherRoute: [ 1, 34 ] },
            { testDesc: "Best for Bug type", type: PokemonType.Bug, expectedRoute: [ 0, 2 ], expectedHigherRoute: [ 1, 30 ] },
            { testDesc: "Best for Rock type", type: PokemonType.Rock, expectedRoute: [ 1, 46 ], expectedHigherRoute: [ 1, 46 ] },
            { testDesc: "Best for Ghost type", type: PokemonType.Ghost, expectedRoute: [ 1, 28 ], expectedHigherRoute: [ 1, 28 ] },
            { testDesc: "Best for Dragon type", type: PokemonType.Dragon, expectedRoute: [ 1, 45 ], expectedHigherRoute: [ 1, 45 ] },
            { testDesc: "Best for Dark type", type: PokemonType.Dark, expectedRoute: [ 1, 28 ], expectedHigherRoute: [ 1, 28 ] },
            { testDesc: "Best for Steel type", type: PokemonType.Steel, expectedRoute: [ 1, 45 ], expectedHigherRoute: [ 1, 45 ] },
            { testDesc: "Best for Fairy type", type: PokemonType.Fairy, expectedRoute: [ 0, 3 ], expectedHigherRoute: [ 0, 3 ] }
        ];

    test.each(testCases)('$testDesc', (testCase) =>
    {
        App.game.party.__clickAttack = 1000;

        let result = Automation.Utils.Route.findBestRouteForFarmingType(testCase.type);
        expect(result).not.toBe(null);
        expect(result.Region).toEqual(testCase.expectedRoute[0]);
        expect(result.Route).toEqual(testCase.expectedRoute[1]);

        // Put a click attack way higher
        // Although this would probably never happen, the same result would be achieved leveling-up pokemons
        App.game.party.__clickAttack = 500000;

        result = Automation.Utils.Route.findBestRouteForFarmingType(testCase.type);
        expect(result).not.toBe(null);
        expect(result.Region).toEqual(testCase.expectedHigherRoute[0]);
        expect(result.Route).toEqual(testCase.expectedHigherRoute[1]);
    });
});
