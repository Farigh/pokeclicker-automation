import "tst/utils/tests.utils.js";

// Import pokéclicker App
import "tst/imports/Pokeclicker.import.js";

// Import current lib elements
import "tst/stubs/localStorage.stub.js";
import "tst/stubs/Automation/Menu.stub.js";
import "tst/imports/AutomationUtils.import.js";
import "src/lib/Farm.js";

import "tst/utils/PokemonLoader.utils.js";
import "tst/utils/farming.utils.js";

/************************\
|***    TEST-SETUP    ***|
\************************/

// Stub setInterval calls
jest.useFakeTimers();
let setIntervalSpy = jest.spyOn(global, 'setInterval');

// Stub the Automation class to the bare minimum
class Automation
{
    static Farm = AutomationFarm;
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
PokemonLoader.loadFarmingUnlockPokemons();

/**************************\
|***    TEST-HELPERS    ***|
\**************************/

function setAllBerriesToRipe()
{
    for (const plot of App.game.farming.plotList)
    {
        if (!plot.isEmpty())
        {
            let berryData = App.game.farming.berryData[plot.berry];
            plot.age = berryData.growthTime[PlotStage.Bloom] + 1;
        }
    }
}

function clearTheFarm()
{
    for (const plot of App.game.farming.plotList)
    {
        if (!plot.isEmpty())
        {
            plot.die();
        }
    }
}

function runPlotUnlockTest(slotToBeUnlocked)
{
    expect(Automation.Farm.__internal__currentStrategy.harvestAsSoonAsPossible).toBe(true);

    let berryCost = App.game.farming.plotBerryCost(slotToBeUnlocked);

    // Simulate the user getting some berries (just enough to unlock the plot)
    let unlockBerryAmount = berryCost.amount;
    App.game.farming.__berryListCount[berryCost.type] = unlockBerryAmount;

    // Simulate the loop
    Automation.Farm.__internal__farmLoop();

    // The slot should not have been unlocked, since the player lacks the farm points
    expect(App.game.farming.plotList[slotToBeUnlocked].isUnlocked).toBe(false);

    // Give the player just under the amount needed
    let unlockFPAmount = App.game.farming.plotFPCost(slotToBeUnlocked);
    App.game.wallet.__currencies[GameConstants.Currency.farmPoint] = unlockFPAmount - 1;

    Automation.Farm.__internal__farmLoop();

    // The slot should not have been unlocked, since the player still lacks one farm point
    expect(App.game.farming.plotList[slotToBeUnlocked].isUnlocked).toBe(false);

    // Give the player the exact amount needed
    App.game.farming.__berryListCount[berryCost.type] = unlockBerryAmount;
    App.game.wallet.__currencies[GameConstants.Currency.farmPoint] = unlockFPAmount;

    Automation.Farm.__internal__farmLoop();

    // The slot should not have been unlocked, since the player still lacks one farm point
    expect(App.game.farming.plotList[slotToBeUnlocked].isUnlocked).toBe(true);
    expect(App.game.farming.__berryListCount[berryCost.type]).toBe(0);
    expect(App.game.wallet.__currencies[GameConstants.Currency.farmPoint]).toBe(0);
}

function runBerryMutationTest(targetBerry,
                              expectedPlantationLayoutCallback,
                              expectedNeededItem = null,
                              expectedForbiddenItems = [],
                              dontMutateOrClean = false)
{
    expect(Automation.Farm.__internal__currentStrategy.berryToUnlock).toBe(targetBerry);
    expect(Automation.Farm.__internal__currentStrategy.harvestAsSoonAsPossible).toBe(false);

    checkItemNeededBehaviour(expectedNeededItem);

    // Cleanup the layout
    if (!dontMutateOrClean)
    {
        setAllBerriesToRipe();

        Automation.Farm.__internal__farmLoop();
    }

    // The mutation layout should have been planted
    expectedPlantationLayoutCallback();

    // Check the forbidden Oak items
    expect(Automation.Farm.__internal__currentStrategy.forbiddenOakItems).toEqual(expectedForbiddenItems);
    expect(Automation.Utils.OakItem.ForbiddenItems).toEqual(expectedForbiddenItems);

    // Expect the needed item to have been equipped
    if (expectedNeededItem != null)
    {
        expect(App.game.oakItems.itemList[expectedNeededItem].isActive).toBe(true);
    }

    // Simulate a mutation in plot 8
    if (!dontMutateOrClean)
    {
        if (!App.game.farming.plotList[8].isEmpty())
        {
            App.game.farming.plotList[8].die();
        }

        App.game.farming.plotList[8].plant(targetBerry);
        let targetBerryData = App.game.farming.berryData[targetBerry];
        App.game.farming.plotList[8].age = targetBerryData.growthTime[PlotStage.Bloom] + 1;
        Automation.Farm.__internal__farmLoop();

        // The berry should have been harvested as soon as it reached the Berry stage, and thus be unlocked
        expect(App.game.farming.unlockedBerries[targetBerry]()).toBe(true);
    }
}

function checkItemNeededBehaviour(oakItemNeeded)
{
    // Check the selected Oak item, if needed
    expect(Automation.Farm.__internal__currentStrategy.oakItemToEquip).toBe(oakItemNeeded);

    if (oakItemNeeded == null)
    {
        return;
    }

    // If the item was not unlocked, more steps are needed
    if (!App.game.oakItems.itemList[oakItemNeeded].isUnlocked())
    {
        expectFocusOnUnlocksToBeDisabled(function ()
        {
            // Simulate the player getting the item
            App.game.oakItems.itemList[oakItemNeeded].__isUnlocked = true;

            // Expect the feature to be reenabled
            return true;
        });
    }

    // Remove the needed item if it's equipped, so we can make sure the automation will equip it back
    App.game.oakItems.deactivate(oakItemNeeded);
}

function checkPokemonNeededBehaviour(pokemonName)
{
    // Check the stategy needed pokemon
    expect(Automation.Farm.__internal__currentStrategy.requiredPokemon).toBe(pokemonName);

    expectFocusOnUnlocksToBeDisabled(function ()
        {
            // Simulate the player catching the pokemon
            let pokemonId = PokemonHelper.getPokemonByName(pokemonName).id;
            App.game.statistics.__pokemonCapturedCount[pokemonId] = 1;

            // Expect the feature to be reenabled
            return true;
        });
}

function expectFocusOnUnlocksToBeDisabled(reenableConditionCallback)
{
    // Expect the feature to have been disabled because of the item not being unlocked
    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 5000);
    expect(Automation.Utils.LocalStorage.getValue(Automation.Farm.Settings.FocusOnUnlocks)).toBe("false");
    expect(Automation.Menu.__disabledElements.has(Automation.Farm.Settings.FocusOnUnlocks)).toBe(true);

    // Simulate the situation being resolved
    expectToBeEnabledBack = reenableConditionCallback();

    // Wait for the interval to execute
    jest.advanceTimersByTime(5000);

    if (expectToBeEnabledBack)
    {
        // Expect the setting to have been re-enabled
        expect(jest.getTimerCount()).toBe(0);

        // Simulate the player turning the feature back on
        expect(Automation.Menu.__disabledElements.has(Automation.Farm.Settings.FocusOnUnlocks)).toBe(false);
        Automation.Utils.LocalStorage.setValue(Automation.Farm.Settings.FocusOnUnlocks, true);
    }
    else
    {
        expect(jest.getTimerCount()).toBe(1);
        expect(Automation.Menu.__disabledElements.has(Automation.Farm.Settings.FocusOnUnlocks)).toBe(true);
    }

    // Reset mock counter
    setIntervalSpy.mockClear();
}

/************************\
|***    TEST-SUITE    ***|
\************************/

// Prepare the test-suite
beforeAll(() =>
    {
        Automation.Farm.initialize(Automation.InitSteps.Finalize);

        // Expect the farming loop to not be set
        expect(Automation.Farm.__internal__farmingLoop).toBe(null);

        // Simulate Farming feature being enabled by default (done in the Automation.InitSteps.BuildMenu)
        Automation.Utils.LocalStorage.setValue(Automation.Farm.Settings.FeatureEnabled, true);
        expect(Automation.Utils.LocalStorage.getValue(Automation.Farm.Settings.FeatureEnabled)).toBe("true");

        // Simulate Unlock setting being enabled by default (done in the Automation.InitSteps.BuildMenu)
        Automation.Utils.LocalStorage.setValue(Automation.Farm.Settings.FocusOnUnlocks, true);
        expect(Automation.Utils.LocalStorage.getValue(Automation.Farm.Settings.FocusOnUnlocks)).toBe("true");

        // Simulate Unlock setting being enabled by default (done in the Automation.InitSteps.BuildMenu)
        Automation.Utils.LocalStorage.setValue(Automation.Farm.Settings.OakItemLoadoutUpdate, true);
        expect(Automation.Utils.LocalStorage.getValue(Automation.Farm.Settings.OakItemLoadoutUpdate)).toBe("true");
    });

// Test when player does not have enough berries to unlock anything
test('Not enough berry to unlock anything', () =>
{
    let cheriData = App.game.farming.berryData[BerryType.Cheri];

    // Expect the current strategy to be pointing to the first one
    expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[0]);

    // Simulate farm loop
    Automation.Farm.__internal__farmLoop();

    // As the player does not have any cheri, nothing should have happened
    expect(App.game.farming.plotList[12].isEmpty()).toBe(true);

    // Simulate the user getting some Cheri berries
    let initialCheriCount = 5;
    App.game.farming.__berryListCount[BerryType.Cheri] = initialCheriCount;

    // Simulate farm loop
    Automation.Farm.__internal__farmLoop();

    // A berry should have been planted
    expect(App.game.farming.plotList[12].isEmpty()).toBe(false);
    expect(App.game.farming.plotList[12].berry).toBe(BerryType.Cheri);
    expect(App.game.farming.plotList[12].stage()).toBe(PlotStage.Seed);
    expect(App.game.farming.__berryListCount[BerryType.Cheri]).toBe(initialCheriCount - 1);

    // Simulate the berry sprouting
    App.game.farming.plotList[12].age = cheriData.growthTime[PlotStage.Seed] + 1;
    Automation.Farm.__internal__farmLoop();

    // Nothing should have changed
    expect(App.game.farming.plotList[12].berry).toBe(BerryType.Cheri);
    expect(App.game.farming.plotList[12].stage()).toBe(PlotStage.Sprout);
    expect(App.game.farming.__berryListCount[BerryType.Cheri]).toBe(initialCheriCount - 1);

    // Simulate the berry tallering
    App.game.farming.plotList[12].age = cheriData.growthTime[PlotStage.Sprout] + 1;
    Automation.Farm.__internal__farmLoop();

    // Nothing should have changed
    expect(App.game.farming.plotList[12].berry).toBe(BerryType.Cheri);
    expect(App.game.farming.plotList[12].stage()).toBe(PlotStage.Taller);
    expect(App.game.farming.__berryListCount[BerryType.Cheri]).toBe(initialCheriCount - 1);

    // Simulate the berry blooming
    App.game.farming.plotList[12].age = cheriData.growthTime[PlotStage.Taller] + 1;
    Automation.Farm.__internal__farmLoop();

    // Nothing should have changed
    expect(App.game.farming.plotList[12].berry).toBe(BerryType.Cheri);
    expect(App.game.farming.plotList[12].stage()).toBe(PlotStage.Bloom);
    expect(App.game.farming.__berryListCount[BerryType.Cheri]).toBe(initialCheriCount - 1);

    // Simulate the berry being ripe
    App.game.farming.plotList[12].age = cheriData.growthTime[PlotStage.Bloom] + 1;
    Automation.Farm.__internal__farmLoop();

    // The cheri berry should have been harvested, and a new one planted
    expect(App.game.farming.plotList[12].berry).toBe(BerryType.Cheri);
    expect(App.game.farming.plotList[12].stage()).toBe(PlotStage.Seed);
    expect(App.game.farming.__berryListCount[BerryType.Cheri]).toBe(initialCheriCount);

    // Expect the strategy to still be pointing to the first one
    expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[0]);
});

/*\
|*| Gen 1 plot unlocks
\*/
describe(`${AutomationTestUtils.categoryPrefix}Gen 1 unlocks:`, () =>
{
    // Test the 1st unlock
    test('Unlock plot 7', () =>
    {
        runPlotUnlockTest(7);
    });

    // Test the 2nd unlock
    test('Unlock plot 13', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[1]);

        runPlotUnlockTest(13);
    });

    // Test the 3rd unlock
    test('Unlock plot 17', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[2]);

        runPlotUnlockTest(17);
    });

    // Test the 4th unlock
    test('Unlock plot 11', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[3]);

        runPlotUnlockTest(11);
    });

    // Test the 5th unlock
    test('Unlock plot 6', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[4]);

        runPlotUnlockTest(6);
    });

    // Test the 6th unlock
    test('Unlock plot 8', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[5]);

        runPlotUnlockTest(8);
    });

    // Test the 7th unlock
    test('Unlock plot 18', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[6]);

        runPlotUnlockTest(18);
    });

    // Test the 8th unlock
    test('Unlock plot 16', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[7]);

        runPlotUnlockTest(16);
    });

    // Test the Gen 1 berry gathering
    test('Gen 1 berry gathering', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[8]);

        // At this point the plots looks like that (a being a cheri berry)
        // |#|#|#|#|#|
        // |#| | | |#|
        // |#| |a| |#|
        // |#| | | |#|
        // |#|#|#|#|#|

        // Give the player 19 of each berries (one less than the required number)
        for (const berry of [ BerryType.Cheri, BerryType.Chesto, BerryType.Pecha, BerryType.Rawst,
                              BerryType.Aspear, BerryType.Leppa, BerryType.Oran, BerryType.Sitrus ])
        {
            App.game.farming.__berryListCount[berry] = 19;
        }

        Automation.Farm.__internal__farmLoop();

        // The plots should look like this
        // |#|#|#|#|#|   with : a : Chesto   e : Cheri
        // |#|a|b|c|#|          b : Pecha    f : Leppa
        // |#|d|e|f|#|          c : Rawst    g : Oran
        // |#|g|h|e|#|          d : Aspear   h : Sitrus
        // |#|#|#|#|#|
        // The cheri appears twice even though it was not needed, because the center one was already there
        // And the other one was planted because no other berry was needed
        expect(App.game.farming.plotList[6].berry).toBe(BerryType.Chesto);
        expect(App.game.farming.plotList[7].berry).toBe(BerryType.Pecha);
        expect(App.game.farming.plotList[8].berry).toBe(BerryType.Rawst);
        expect(App.game.farming.plotList[11].berry).toBe(BerryType.Aspear);
        expect(App.game.farming.plotList[12].berry).toBe(BerryType.Cheri);
        expect(App.game.farming.plotList[13].berry).toBe(BerryType.Leppa);
        expect(App.game.farming.plotList[16].berry).toBe(BerryType.Oran);
        expect(App.game.farming.plotList[17].berry).toBe(BerryType.Sitrus);
        expect(App.game.farming.plotList[18].berry).toBe(BerryType.Cheri);

        // Simulate the planted berries riping
        for (const index of [ 6, 7, 8, 11, 12, 13, 16, 17, 18 ])
        {
            let berryData = App.game.farming.berryData[App.game.farming.plotList[index].berry];
            App.game.farming.plotList[index].age = berryData.growthTime[PlotStage.Bloom] + 1;
        }
        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the next one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[9]);
    });
});

/*\
|*| Gen 2 berry and plot unlocks
\*/
describe(`${AutomationTestUtils.categoryPrefix}Gen 2 unlocks:`, () =>
{
    // Test the 10th unlock
    test('Unlock Persim berry', () =>
    {
        let expectPersimLayout = function()
        {
            // The layout should look like that
            // |#|#|#|#|#|
            // |#| |a| |#|  with:  a : Oran
            // |#|b| |b|#|         b : Pecha
            // |#| |a| |#|
            // |#|#|#|#|#|
            for (const [ index, plot ] of App.game.farming.plotList.entries())
            {
                if ([ 7, 17 ].includes(index))
                {
                    expect(plot.berry).toBe(BerryType.Oran);
                }
                else if ([ 11, 13 ].includes(index))
                {
                    expect(plot.berry).toBe(BerryType.Pecha);
                }
                else
                {
                    expect(plot.isEmpty()).toBe(true);
                }
            }
        }

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[9]);

        // The Persim mutation layout should already be in place
        expectPersimLayout();

        // Bring the player's berry stock to the bare minimum to pass the previous requirement
        // (ie. having exactly 20 of each needed berries before planting)
        for (const berryType of [ BerryType.Pecha, BerryType.Oran ])
        {
            let berryHarvestAmount = App.game.farming.berryData[berryType].harvestAmount;
            App.game.farming.__berryListCount[berryType] = 20 - (2 * (berryHarvestAmount));
        }

        // Going to the next loop should not change anything
        Automation.Farm.__internal__farmLoop();
        expectPersimLayout();

        // Expect the strategy to still be pointing to the tenth one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[9]);
        expect(Automation.Farm.__internal__currentStrategy.berryToUnlock).toBe(BerryType.Persim);

        // Simulate the Oran berries being ripe
        let oranBerryData = App.game.farming.berryData[BerryType.Oran];
        App.game.farming.plotList[7].age = oranBerryData.growthTime[PlotStage.Bloom] + 1;
        App.game.farming.plotList[17].age = oranBerryData.growthTime[PlotStage.Bloom] + 1;
        let berryInitialCount = App.game.farming.__berryListCount[BerryType.Oran];
        Automation.Farm.__internal__farmLoop();

        // No berry should have been harvested (need to wait the last moment)
        expect(App.game.farming.__berryListCount[BerryType.Oran]).toBe(berryInitialCount);
        expectPersimLayout();

        // Simulate the Oran berries being close to withering (less than 15s)
        App.game.farming.plotList[7].age = oranBerryData.growthTime[PlotStage.Berry] - 14;
        App.game.farming.plotList[17].age = oranBerryData.growthTime[PlotStage.Berry] - 14;
        Automation.Farm.__internal__farmLoop();

        // The cheri berry should have been harvested, and a new one planted
        expectPersimLayout();
        expect(App.game.farming.__berryListCount[BerryType.Oran]).toBe(18); // 20 - 2 planted berries

        // Simulate a mutation
        App.game.farming.plotList[8].plant(BerryType.Persim);
        Automation.Farm.__internal__farmLoop();

        // The Persim should be here, but nothing should happen until it's ripe
        expect(App.game.farming.plotList[8].isEmpty()).toBe(false);
        expect(App.game.farming.plotList[8].berry).toBe(BerryType.Persim);
        expect(App.game.farming.plotList[8].stage()).toBe(PlotStage.Seed);

        // Simulate a Persim berry to be ripe
        let persimBerryData = App.game.farming.berryData[BerryType.Persim];
        App.game.farming.plotList[8].age = persimBerryData.growthTime[PlotStage.Bloom] + 1;
        expect(App.game.farming.unlockedBerries[BerryType.Persim]()).toBe(false);
        Automation.Farm.__internal__farmLoop();

        // The Persim should have been harvested as soon as it reached the Berry stage, and thus be unlocked
        expect(App.game.farming.unlockedBerries[BerryType.Persim]()).toBe(true);
    });

    // Test the 11th unlock
    test('Unlock plot 2', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[10]);

        runPlotUnlockTest(2);
    });

    // Test the 12th unlock
    test('Unlock Razz berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[11]);

        runBerryMutationTest(
            BerryType.Razz,
            function()
            {
                // The layout should look like that
                // |#|#|a|#|#|
                // |#| | | |#|  with:  a : Leppa
                // |#| |b| |#|         b : Cheri
                // |#| |a| |#|
                // |#|#|#|#|#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 2, 17 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Leppa);
                    }
                    else if (index == 12)
                    {
                        expect(plot.berry).toBe(BerryType.Cheri);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 13th unlock
    test('Unlock plot 14', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[12]);

        runPlotUnlockTest(14);
    });

    // Test the 14th unlock
    test('Unlock Bluk berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[13]);

        runBerryMutationTest(
            BerryType.Bluk,
            function()
            {
                // The layout should look like that
                // |#|#|a|#|#|
                // |#| | | |#|  with:  a : Leppa
                // |#| |b| | |         b : Chesto
                // |#| |a| |#|
                // |#|#|#|#|#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 2, 17 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Leppa);
                    }
                    else if (index == 12)
                    {
                        expect(plot.berry).toBe(BerryType.Chesto);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 15th unlock
    test('Unlock plot 22', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[14]);

        runPlotUnlockTest(22);
    });

    // Test the 16th unlock
    test('Unlock Nanab berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[15]);

        runBerryMutationTest(
            BerryType.Nanab,
            function()
            {
                // The layout should look like that
                // |#|#|a|#|#|
                // |#| | | |#|  with:  a : Aspear
                // |#| |b| | |         b : Pecha
                // |#| |a| |#|
                // |#|#| |#|#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 2, 17 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Aspear);
                    }
                    else if (index == 12)
                    {
                        expect(plot.berry).toBe(BerryType.Pecha);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 17th unlock
    test('Unlock plot 10', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[16]);

        runPlotUnlockTest(10);
    });

    // Test the 18th unlock
    test('Unlock Wepear berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[17]);

        runBerryMutationTest(
            BerryType.Wepear,
            function()
            {
                // The layout should look like that
                // |#|#|a|#|#|
                // |#| | | |#|  with:  a : Oran
                // |a| |b| |a|         b : Rawst
                // |#| | | |#|
                // |#|#|a|#|#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 2, 10, 14, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Oran);
                    }
                    else if (index == 12)
                    {
                        expect(plot.berry).toBe(BerryType.Rawst);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 19th unlock
    test('Unlock plot 3', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[18]);

        runPlotUnlockTest(3);
    });

    // Test the 20th unlock
    test('Unlock Pinap berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[19]);

        runBerryMutationTest(
            BerryType.Pinap,
            function()
            {
                // The layout should look like that
                // |#|#|a| |#|
                // |#| | | |#|  with:  a : Sitrus
                // |a| |b| |a|         b : Aspear
                // |#| | | |#|
                // |#|#|a|#|#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 2, 10, 14, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Sitrus);
                    }
                    else if (index == 12)
                    {
                        expect(plot.berry).toBe(BerryType.Aspear);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 21st unlock
    test('Unlock plot 19', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[20]);

        runPlotUnlockTest(19);
    });

    // Test the 22nd unlock
    test('Unlock Figy berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[21]);

        runBerryMutationTest(
            BerryType.Figy,
            function()
            {
                // The layout should look like that
                // |#|#|a|a|#|
                // |#|a| | |#|  with:  a : Cheri
                // |a| | | |a|
                // |#|a| |a|a|
                // |#|#|a|#|#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 2, 3, 6, 10, 14, 16, 18, 19, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Cheri);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 23rd unlock
    test('Unlock plot 21', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[22]);

        runPlotUnlockTest(21);
    });

    // Test the 24th unlock
    test('Unlock Wiki berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[23]);

        runBerryMutationTest(
            BerryType.Wiki,
            function()
            {
                // The layout should look like that
                // |#|#|a|a|#|
                // |#|a| | |#|  with:  a : Chesto
                // |a| |a| |a|
                // |#| | | |a|
                // |#|a|a|#|#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 2, 3, 6, 10, 12, 14, 19, 21, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Chesto);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 25th unlock
    test('Unlock plot 5', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[24]);

        runPlotUnlockTest(5);
    });

    // Test the 26th unlock
    test('Unlock Mago berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[25]);

        runBerryMutationTest(
            BerryType.Mago,
            function()
            {
                // The layout should look like that
                // |#|#|a|a|#|
                // |a| | | |#|  with:  a : Pecha
                // |a| |a| |a|
                // |#| | | |a|
                // |#|a|a|#|#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 2, 3, 5, 10, 12, 14, 19, 21, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Pecha);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 27th unlock
    test('Unlock plot 1', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[26]);

        runPlotUnlockTest(1);
    });

    // Test the 28th unlock
    test('Unlock Aguav berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[27]);

        runBerryMutationTest(
            BerryType.Aguav,
            function()
            {
                // The layout should look like that
                // |#| |a|a|#|
                // |a| | | |#|  with:  a : Rawst
                // |a| |a| |a|
                // |#| | | |a|
                // |#|a|a|#|#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 2, 3, 5, 10, 12, 14, 19, 21, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Rawst);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 29th unlock
    test('Unlock plot 9', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[28]);

        runPlotUnlockTest(9);
    });

    // Test the 30th unlock
    test('Unlock Iapapa berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[29]);

        runBerryMutationTest(
            BerryType.Iapapa,
            function()
            {
                // The layout should look like that
                // |#| |a|a|#|
                // |a| | | |#|  with:  a : Aspear
                // |a| |a| |a|
                // |#| | | |a|
                // |#|a|a|#|#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 2, 3, 5, 10, 12, 14, 19, 21, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Aspear);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 31st unlock
    test('Unlock plot 23', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[30]);

        runPlotUnlockTest(23);
    });

    // Test the Gen 2 berry gathering
    test('Gen 2 berry gathering', () =>
    {
        // Clear the farm
        clearTheFarm();

        // Give the player 19 of each berries (one less than the required number)
        for (const berry of [ BerryType.Persim, BerryType.Razz, BerryType.Bluk, BerryType.Nanab, BerryType.Wepear, BerryType.Pinap,
                              BerryType.Figy, BerryType.Wiki, BerryType.Mago, BerryType.Aguav, BerryType.Iapapa ])
        {
            App.game.farming.__berryListCount[berry] = 19;
        }

        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[31]);

        // The plots should look like this
        // |#|a|b|c|#|
        // |d|e|f|g|h|   with : a : Persim   e : Wepear   i : Mago
        // |i|j|k|l|l|          b : Razz     f : Pinap    j : Aguav
        // |#|l|l|l|l|          c : Bluk     g : Figy     k : Iapapa
        // |#|l|l|l|#|          d : Nanab    h : Wiki     l : Cheri
        // The cheri berries were planted because no other berry was needed
        expect(App.game.farming.plotList[1].berry).toBe(BerryType.Persim);
        expect(App.game.farming.plotList[2].berry).toBe(BerryType.Razz);
        expect(App.game.farming.plotList[3].berry).toBe(BerryType.Bluk);
        expect(App.game.farming.plotList[5].berry).toBe(BerryType.Nanab);
        expect(App.game.farming.plotList[6].berry).toBe(BerryType.Wepear);
        expect(App.game.farming.plotList[7].berry).toBe(BerryType.Pinap);
        expect(App.game.farming.plotList[8].berry).toBe(BerryType.Figy);
        expect(App.game.farming.plotList[9].berry).toBe(BerryType.Wiki);
        expect(App.game.farming.plotList[10].berry).toBe(BerryType.Mago);
        expect(App.game.farming.plotList[11].berry).toBe(BerryType.Aguav);
        expect(App.game.farming.plotList[12].berry).toBe(BerryType.Iapapa);

        for (const index of [ 13, 14, 16, 17, 18, 19, 21, 22, 23 ])
        {
            expect(App.game.farming.plotList[index].berry).toBe(BerryType.Cheri);
        }

        // Simulate the planted berries riping
        for (const plot of App.game.farming.plotList)
        {
            if (!plot.isEmpty())
            {
                let berryData = App.game.farming.berryData[plot.berry];
                plot.age = berryData.growthTime[PlotStage.Bloom] + 1;
            }
        }
        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the next one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[32]);
    });
});

/*\
|*| Gen 3 berry and plot unlocks
\*/
describe(`${AutomationTestUtils.categoryPrefix}Gen 3 unlocks:`, () =>
{
    // Test the 33rd unlock
    test('Unlock Pomeg berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[32]);

        runBerryMutationTest(
            BerryType.Pomeg,
            function()
            {
                // The layout should look like that
                // |#| | | |#|
                // |a|b| |a|b|  with:  a : Iapapa
                // | | | | | |         b : Mago
                // |#|a| | |a|
                // |#| |b| |#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 5, 8, 16, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Iapapa);
                    }
                    else if ([ 6, 9, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Mago);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 34th unlock
    test('Unlock plot 15', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[33]);

        runPlotUnlockTest(15);
    });

    // Test the 35th unlock
    test('Unlock Kelpsy berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[34]);

        runBerryMutationTest(
            BerryType.Kelpsy,
            function()
            {
                // The layout should look like that
                // |#| | | |#|
                // | |a|b|a| |  with:  a : Persim
                // |b| | | |b|         b : Chesto
                // | | | | | |
                // |#|a|b|a|#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 6, 8, 21, 23 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Persim);
                    }
                    else if ([ 7, 10, 14, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Chesto);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 36th unlock
    test('Unlock plot 0', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[35]);

        runPlotUnlockTest(0);
    });

    // Test the 37th unlock
    test('Unlock Qualot berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[36]);

        runBerryMutationTest(
            BerryType.Qualot,
            function()
            {
                // The layout should look like that
                // |a| | | |#|
                // | |b| |a|b|  with:  a : Pinap
                // | | | | | |         b : Mago
                // |a| | |a|b|
                // |#|b| | |#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 8, 15, 18 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Pinap);
                    }
                    else if ([ 6, 9, 19, 21 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Mago);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 38th unlock
    test('Unlock plot 4', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[37]);

        runPlotUnlockTest(4);
    });

    // Test the 39th unlock
    test('Unlock Hondew berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[38]);

        runBerryMutationTest(
            BerryType.Hondew,
            function()
            {
                // The layout should look like that
                // | |a| |b| |
                // |b|c| |a|c|  with:  a : Figy
                // | | | | | |         b : Wiki
                // |a| |b| |b|         c : Aguav
                // |#| |c|a|#|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 1, 8, 15, 23 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Figy);
                    }
                    else if ([ 3, 5, 17, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Wiki);
                    }
                    else if ([ 6, 9, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Aguav);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 40th unlock
    test('Unlock plot 24', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[39]);

        runPlotUnlockTest(24);
    });

    // Test the 41st unlock
    test('Unlock Grepa berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[40]);

        runBerryMutationTest(
            BerryType.Grepa,
            function()
            {
                // The layout should look like that
                // |a| | |a| |
                // | |b| | |b|  with:  a : Aguav
                // | | | | | |         b : Figy
                // |a| | |a| |
                // |#|b| | |b|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 3, 15, 18 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Aguav);
                    }
                    else if ([ 6, 9, 21, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Figy);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 42nd unlock
    test('Unlock plot 20', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[41]);

        runPlotUnlockTest(20);
    });

    // Test the 43rd unlock
    test('Unlock Tamato berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[42]);

        runBerryMutationTest(
            BerryType.Tamato,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|b|a|a|b|  with:  a : Razz
                // |a|a|a|a|a|         b : Pomeg
                // |a|a|a|a|a|
                // |a|b|a|a|b|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 6, 9, 21, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Pomeg);
                    }
                    else
                    {
                        expect(plot.berry).toBe(BerryType.Razz);
                    }
                }
            });
    });

    // Test the 44th unlock
    test('Unlock Cornn berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[43]);

        runBerryMutationTest(
            BerryType.Cornn,
            function()
            {
                // The layout should look like that
                // | |a| | |a|
                // |b|c| |b|c|  with:  a : Leppa
                // | | | | | |         b : Bluk
                // | |a| | |a|         c : Wiki
                // |b|c| |b|c|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 1, 4, 16, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Leppa);
                    }
                    else if ([ 5, 8, 20, 23 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Bluk);
                    }
                    else if ([ 6, 9, 21, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Wiki);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 45th unlock
    test('Unlock Magost berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[44]);

        runBerryMutationTest(
            BerryType.Magost,
            function()
            {
                // The layout should look like that
                // | |a| | |a|
                // |b|c| |b|c|  with:  a : Pecha
                // | | | | | |         b : Nanab
                // | |a| | |a|         c : Mago
                // |b|c| |b|c|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 1, 4, 16, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Pecha);
                    }
                    else if ([ 5, 8, 20, 23 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Nanab);
                    }
                    else if ([ 6, 9, 21, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Mago);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 46th unlock
    test('Unlock Rabuta berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[45]);

        runBerryMutationTest(
            BerryType.Rabuta,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|b|a|a|b|  with:  a : Aspear
                // |a|a|a|a|a|         b : Aguav
                // |a|a|a|a|a|
                // |a|b|a|a|b|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 6, 9, 21, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Aguav);
                    }
                    else
                    {
                        expect(plot.berry).toBe(BerryType.Aspear);
                    }
                }
            });
    });

    // Test the 47th unlock
    test('Unlock Nomel berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[46]);

        runBerryMutationTest(
            BerryType.Nomel,
            function()
            {
                // The layout should look like that
                // | | | | | |
                // | |a| | |a|  with:  a : Pinap
                // | | | | | |
                // | | | | | |
                // | |a| | |a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 6, 9, 21, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Pinap);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the next steps needed berry gathering
    test('Gen 3 next steps needed berry gathering', () =>
    {
        // Clear the farm
        clearTheFarm();

        // Give the player 24 of each berries (one less than the required number)
        for (const berry of [ BerryType.Tamato, BerryType.Cornn, BerryType.Magost, BerryType.Rabuta, BerryType.Nomel ])
        {
            App.game.farming.__berryListCount[berry] = 24;
        }

        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[47]);

        // The plots should look like this
        // |a|b|c|d|e|
        // |f|f|f|f|f|   with : a : Tamato   d : Rabuta
        // |f|f|f|f|f|          b : Cornn    e : Nomel
        // |f|f|f|f|f|          c : Magost   f : Cheri
        // |f|f|f|f|f|
        // The cheri berries were planted because no other berry was needed
        for (const [ index, plot ] of App.game.farming.plotList.entries())
        {
            if (index == 0)
            {
                expect(plot.berry).toBe(BerryType.Tamato);
            }
            else if (index == 1)
            {
                expect(plot.berry).toBe(BerryType.Cornn);
            }
            else if (index == 2)
            {
                expect(plot.berry).toBe(BerryType.Magost);
            }
            else if (index == 3)
            {
                expect(plot.berry).toBe(BerryType.Rabuta);
            }
            else if (index == 4)
            {
                expect(plot.berry).toBe(BerryType.Nomel);
            }
            else
            {
                expect(plot.berry).toBe(BerryType.Cheri);
            }
        }

        // Simulate the planted berries riping
        for (const plot of App.game.farming.plotList)
        {
            let berryData = App.game.farming.berryData[plot.berry];
            plot.age = berryData.growthTime[PlotStage.Bloom] + 1;
        }
        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the next one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[48]);
    });

    // Test the 49th unlock
    test('Unlock Spelon berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[48]);

        runBerryMutationTest(
            BerryType.Spelon,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Tamato
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const plot of App.game.farming.plotList)
                {
                    expect(plot.berry).toBe(BerryType.Tamato);
                }
            });
    });

    // Test the 50th unlock
    test('Unlock Pamtre berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[49]);

        runBerryMutationTest(
            BerryType.Pamtre,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Cornn
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const plot of App.game.farming.plotList)
                {
                    expect(plot.berry).toBe(BerryType.Cornn);
                }
            },
            null,
            [ OakItemType.Cell_Battery ]);
    });

    // Test the 51st unlock
    test('Unlock Watmel berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[50]);

        runBerryMutationTest(
            BerryType.Watmel,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Magost
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const plot of App.game.farming.plotList)
                {
                    expect(plot.berry).toBe(BerryType.Magost);
                }
            });
    });

    // Test the 52nd unlock
    test('Unlock Durin berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[51]);

        runBerryMutationTest(
            BerryType.Durin,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Magost
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const plot of App.game.farming.plotList)
                {
                    expect(plot.berry).toBe(BerryType.Rabuta);
                }
            });
    });

    // Test the 53rd unlock
    test('Unlock Belue berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[52]);

        runBerryMutationTest(
            BerryType.Belue,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Nomel
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const plot of App.game.farming.plotList)
                {
                    expect(plot.berry).toBe(BerryType.Nomel);
                }
            });
    });

    // Test the Gen 3 berry gathering
    test('Gen 3 berry gathering', () =>
    {
        // Clear the farm
        clearTheFarm();

        // Give the player 24 of each berries (one less than the required number)
        for (const berry of [ BerryType.Pomeg, BerryType.Kelpsy, BerryType.Qualot, BerryType.Hondew, BerryType.Grepa,
                              BerryType.Spelon, BerryType.Pamtre, BerryType.Watmel, BerryType.Durin, BerryType.Belue ])
        {
            App.game.farming.__berryListCount[berry] = 24;
        }

        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[53]);

        // The plots should look like this
        // |a|b|c|d|e|
        // |f|g|h|i|j|   with : a : Pomeg    e : Grepa    i : Durin
        // |k|k|k|k|k|          b : Kelpsy   f : Spelon   j : Belue
        // |k|k|k|k|k|          c : Qualot   g : Pamtre   k : Cheri
        // |k|k|k|k|k|          d : Hondew   h : Watmel
        // The cheri berries were planted because no other berry was needed
        expect(App.game.farming.plotList[0].berry).toBe(BerryType.Pomeg);
        expect(App.game.farming.plotList[1].berry).toBe(BerryType.Kelpsy);
        expect(App.game.farming.plotList[2].berry).toBe(BerryType.Qualot);
        expect(App.game.farming.plotList[3].berry).toBe(BerryType.Hondew);
        expect(App.game.farming.plotList[4].berry).toBe(BerryType.Grepa);
        expect(App.game.farming.plotList[5].berry).toBe(BerryType.Spelon);
        expect(App.game.farming.plotList[6].berry).toBe(BerryType.Pamtre);
        expect(App.game.farming.plotList[7].berry).toBe(BerryType.Watmel);
        expect(App.game.farming.plotList[8].berry).toBe(BerryType.Durin);
        expect(App.game.farming.plotList[9].berry).toBe(BerryType.Belue);

        for (const index of [ 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24 ])
        {
            expect(App.game.farming.plotList[index].berry).toBe(BerryType.Cheri);
        }

        // Simulate the planted berries riping
        for (const plot of App.game.farming.plotList)
        {
            let berryData = App.game.farming.berryData[plot.berry];
            plot.age = berryData.growthTime[PlotStage.Bloom] + 1;
        }
        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the next one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[54]);
    });
});

/*\
|*| Gen 4 berry unlocks
\*/
describe(`${AutomationTestUtils.categoryPrefix}Gen 4 unlocks:`, () =>
{
    // Test the 55th unlock
    test('Unlock Occa berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[54]);

        runBerryMutationTest(
            BerryType.Occa,
            function()
            {
                // The layout should look like that
                // |a| |b| |a|
                // |c| |d| |c|  with:  a : Tamato  c : Spelon
                // | | | | | |         b : Figy    d : Razz
                // |b| |a| |b|
                // |d| |c| |d|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 4, 17 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Tamato);
                    }
                    else if ([ 2, 15, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Figy);
                    }
                    else if ([ 5, 9, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Spelon);
                    }
                    else if ([ 7, 20, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Razz);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            },
            null,
            [ OakItemType.Blaze_Cassette ]);
    });

    // Test the 56th unlock
    test('Unlock Coba berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[55]);

        runBerryMutationTest(
            BerryType.Coba,
            function()
            {
                // The layout should look like that
                // |a| | |a| |
                // | |b| | |b|  with:  a : Wiki
                // | | | | | |         b : Aguav
                // |a| | |a| |
                // | |b| | |b|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 3, 15, 18 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Wiki);
                    }
                    else if ([ 6, 9, 21, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Aguav);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 57th unlock
    test('Unlock Passho berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[56]);

        runBerryMutationTest(
            BerryType.Passho,
            function()
            {
                // The layout should look like that
                // |a| |b| |a|
                // |c| |d| |c|  with:  a : Oran     c : Chesto
                // | | | | | |         b : Kelpsy   d : Coba
                // |b| |a| |b|
                // |d| |c| |d|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 4, 17 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Oran);
                    }
                    else if ([ 2, 15, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Kelpsy);
                    }
                    else if ([ 5, 9, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Chesto);
                    }
                    else if ([ 7, 20, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Coba);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 58th unlock
    test('Unlock Wacan berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[57]);

        runBerryMutationTest(
            BerryType.Wacan,
            function()
            {
                // The layout should look like that
                // |a| |b| |a|
                // |c| |d| |c|  with:  a : Iapapa   c : Qualot
                // | | | | | |         b : Pinap    d : Grepa
                // |b| |a| |b|
                // |d| |c| |d|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 4, 17 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Iapapa);
                    }
                    else if ([ 2, 15, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Pinap);
                    }
                    else if ([ 5, 9, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Qualot);
                    }
                    else if ([ 7, 20, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Grepa);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 59th unlock
    test('Unlock Rindo berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[58]);

        runBerryMutationTest(
            BerryType.Rindo,
            function()
            {
                // The layout should look like that
                // |a| | |a| |
                // | |b| | |b|  with:  a : Figy
                // | | | | | |         b : Aguav
                // |a| | |a| |
                // | |b| | |b|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 3, 15, 18 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Figy);
                    }
                    else if ([ 6, 9, 21, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Aguav);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 60th unlock
    test('Unlock Yache berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[59]);

        runBerryMutationTest(
            BerryType.Yache,
            function()
            {
                // The layout should look like that
                // |a| |a| |a|
                // | | | | | |  with:  a : Passho
                // |a| |a| |a|
                // | | | | | |
                // |a| |a| |a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 2, 4, 10, 12, 14, 20, 22, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Passho);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 61st unlock
    test('Unlock Payapa berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[60]);

        runBerryMutationTest(
            BerryType.Payapa,
            function()
            {
                // The layout should look like that
                // |a| |b| |a|
                // |c| |d| |c|  with:  a : Wiki    c : Bluk
                // | | | | | |         b : Cornn   d : Pamtre
                // |b| |a| |b|
                // |d| |c| |d|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 4, 17 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Wiki);
                    }
                    else if ([ 2, 15, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Cornn);
                    }
                    else if ([ 5, 9, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Bluk);
                    }
                    else if ([ 7, 20, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Pamtre);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            },
            null,
            [ OakItemType.Rocky_Helmet, OakItemType.Cell_Battery ]);
    });

    // Test the 62nd unlock
    test('Unlock Tanga berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[61]);

        runBerryMutationTest(
            BerryType.Tanga,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a| |a| |a|  with:  a : Rindo
                // |a|a|a|a|a|
                // |a| |a| |a|
                // |a|a|a|a|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if (![ 6, 8, 16, 18 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Rindo);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 63rd unlock
    test('Unlock Kasib berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[62]);

        // Give the player 3 Kasib berries, since this step requires to get 4 of them, it should still trigger if the player has some
        App.game.farming.__berryListCount[BerryType.Kasib] = 3;

        runBerryMutationTest(
            BerryType.Kasib,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Cheri
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const plot of App.game.farming.plotList)
                {
                    expect(plot.berry).toBe(BerryType.Cheri);
                }
            });
    });

    // Test the 64th unlock
    test('Unlock Haban berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[63]);

        // Give the player enough Wacan berries (only 2 berries available out of 3 needed)
        App.game.farming.__berryListCount[BerryType.Wacan] = 3;

        runBerryMutationTest(
            BerryType.Haban,
            function()
            {
                // The layout should look like that
                // |a| |b| |a|
                // |c| |d| |c|  with:  a : Occa     c : Wacan
                // | | | | | |         b : Passho   d : Rindo
                // |b| |a| |b|
                // |d| |c| |d|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 4, 17 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Occa);
                    }
                    else if ([ 2, 15, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Passho);
                    }
                    else if ([ 5, 9, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Wacan);
                    }
                    else if ([ 7, 20, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Rindo);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 65th unlock
    test('Unlock Colbur berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[64]);

        runBerryMutationTest(
            BerryType.Colbur,
            function()
            {
                // The layout should look like that
                // | |a| | |a|
                // |b|c| |b|c|  with:  a : Rabuta
                // | | | | | |         b : Kasib
                // | |a| | |a|         c : Payapa
                // |b|c| |b|c|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 1, 4, 16, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Rabuta);
                    }
                    else if ([ 5, 8, 20, 23 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Kasib);
                    }
                    else if ([ 6, 9, 21, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Payapa);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 66th unlock
    test('Unlock Roseli berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[65]);

        runBerryMutationTest(
            BerryType.Roseli,
            function()
            {
                // The layout should look like that
                // |a| |b| |a|
                // |c| |d| |c|  with:  a : Mago     c : Nanab
                // | | | | | |         b : Magost   d : Watmel
                // |b| |a| |b|
                // |d| |c| |d|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 4, 17 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Mago);
                    }
                    else if ([ 2, 15, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Magost);
                    }
                    else if ([ 5, 9, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Nanab);
                    }
                    else if ([ 7, 20, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Watmel);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            },
            null,
            [ OakItemType.Sprinklotad ]);
    });

    // Test the 67th unlock
    test('Unlock Shuca berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[66]);

        runBerryMutationTest(
            BerryType.Shuca,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Watmel
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const plot of App.game.farming.plotList)
                {
                    expect(plot.berry).toBe(BerryType.Watmel);
                }
            },
            OakItemType.Sprinklotad);
    });

    // Test the 68th unlock
    test('Unlock Charti berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[67]);

        runBerryMutationTest(
            BerryType.Charti,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Cornn
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const plot of App.game.farming.plotList)
                {
                    expect(plot.berry).toBe(BerryType.Cornn);
                }
            },
            OakItemType.Cell_Battery);
    });

    // Test the 69th unlock
    test('Unlock Babiri berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[68]);

        runBerryMutationTest(
            BerryType.Babiri,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |b| |a| |b|  with:  a : Shuca
                // |b|b|b|b|b|         b : Charti
                // |b| |a| |b|
                // |a|a|a|a|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 1, 2, 3, 4, 7, 17, 20, 21, 22, 23, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Shuca);
                    }
                    else if ([ 5, 9, 10, 11, 12, 13, 14, 15, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Charti);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 70th unlock
    test('Unlock Chople berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[69]);

        runBerryMutationTest(
            BerryType.Chople,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Spelon
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const plot of App.game.farming.plotList)
                {
                    expect(plot.berry).toBe(BerryType.Spelon);
                }
            },
            OakItemType.Blaze_Cassette);
    });

    // Wait for plots to be emptied
    test('Wait for plots to be emptied', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[70]);

        for (const [ index, plot ] of App.game.farming.plotList.entries())
        {
            if (plot.isEmpty())
            {
                continue;
            }

            plot.die();
            Automation.Farm.__internal__farmLoop();

            if (index != App.game.farming.plotList.length - 1)
            {
                // The automation should not move to the next stage until every slots are empty
                expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[70]);
            }
        }

        // Expect the strategy to be pointing to the next one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[71]);
    });

    // Test the 72nd unlock step 1
    test('Unlock Chilan berry > step 1', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[71]);

        let chilanUnlockFirstStep = function()
            {
                // The layout should look like that
                // | | | | | |
                // | |a| |a| |  with:  a : Chople
                // | | | | | |
                // | |a| |a| |
                // | | | | | |
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 6, 8, 16, 18 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Chople);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            };

        runBerryMutationTest(BerryType.Chilan, chilanUnlockFirstStep, null, [], true);

        // This should not change until the berries are ripe
        let chopleBerryData = App.game.farming.berryData[BerryType.Chople];
        for (const index of [ 6, 8, 16, 18 ])
        {
            App.game.farming.plotList[index].age = chopleBerryData.growthTime[PlotStage.Bloom];
        }
        Automation.Farm.__internal__farmLoop();
        runBerryMutationTest(BerryType.Chilan, chilanUnlockFirstStep, null, [], true);

        for (const index of [ 6, 8, 16, 18 ])
        {
            App.game.farming.plotList[index].age = chopleBerryData.growthTime[PlotStage.Bloom] + 1;
        }
        Automation.Farm.__internal__farmLoop();
    });

    // Test the 72nd unlock step 2
    test('Unlock Chilan berry > step 2', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[71]);

        runBerryMutationTest(
            BerryType.Chilan,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Chople
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const plot of App.game.farming.plotList)
                {
                    expect(plot.berry).toBe(BerryType.Chople);
                }
            }, null, [], true);

        // Simulate a berry mutation in plot 8
        App.game.farming.plotList[8].plant(BerryType.Chilan);
        let targetBerryData = App.game.farming.berryData[BerryType.Chilan];
        App.game.farming.plotList[8].age = targetBerryData.growthTime[PlotStage.Bloom] + 1;
        Automation.Farm.__internal__farmLoop();

        // The berry should have been harvested as soon as it reached the Berry stage, and thus be unlocked
        expect(App.game.farming.unlockedBerries[BerryType.Chilan]()).toBe(true);
    });

    // Test the 73rd unlock
    test('Unlock Kebia berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[72]);

        runBerryMutationTest(
            BerryType.Kebia,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Pamtre
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const plot of App.game.farming.plotList)
                {
                    expect(plot.berry).toBe(BerryType.Pamtre);
                }
            },
            OakItemType.Rocky_Helmet);
    });
});

/*\
|*| Gen 5 berry unlocks
\*/
describe(`${AutomationTestUtils.categoryPrefix}Gen 5 unlocks:`, () =>
{
    // Test the 74th unlock
    test('Unlock Micle berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[73]);

        runBerryMutationTest(
            BerryType.Micle,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a| |a| |a|  with:  a : Pamtre
                // |a| | | |a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if (![ 6, 8, 11, 12, 13 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Pamtre);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            },
            null,
            [ OakItemType.Rocky_Helmet ]);
    });

    // Test the 75th unlock
    test('Unlock Custap berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[74]);

        runBerryMutationTest(
            BerryType.Custap,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a| |a| |a|  with:  a : Watmel
                // |a| | | |a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if (![ 6, 8, 11, 12, 13 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Watmel);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            },
            null,
            [ OakItemType.Sprinklotad ]);
    });

    // Test the 76th unlock
    test('Unlock Jaboca berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[75]);

        runBerryMutationTest(
            BerryType.Jaboca,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a| |a| |a|  with:  a : Durin
                // |a| | | |a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if (![ 6, 8, 11, 12, 13 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Durin);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 77th unlock
    test('Unlock Rowap berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[76]);

        runBerryMutationTest(
            BerryType.Rowap,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a| |a| |a|  with:  a : Belue
                // |a| | | |a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if (![ 6, 8, 11, 12, 13 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Belue);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 78th unlock
    test('Unlock Liechi berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[77]);

        checkPokemonNeededBehaviour("Kyogre");

        // Give the player 3 Liechi berries, since this step requires to get 4 of them, it should still trigger if the player has some
        App.game.farming.__berryListCount[BerryType.Liechi] = 3;

        runBerryMutationTest(
            BerryType.Liechi,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Passho
                // |a|a| | |a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if (![ 12, 13 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Passho);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 79th unlock
    test('Unlock Ganlon berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[78]);

        checkPokemonNeededBehaviour("Groudon");

        // Give the player 3 Ganlon berries, since this step requires to get 4 of them, it should still trigger if the player has some
        App.game.farming.__berryListCount[BerryType.Ganlon] = 3;

        runBerryMutationTest(
            BerryType.Ganlon,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Shuca
                // |a|a| | |a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if (![ 12, 13 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Shuca);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 80th unlock
    test('Unlock Kee berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[79]);

        runBerryMutationTest(
            BerryType.Kee,
            function()
            {
                // The layout should look like that
                // |a| | |a| |
                // | |b| | |b|  with:  a : Liechi
                // | | | | | |         b : Ganlon
                // |a| | |a| |
                // | |b| | |b|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 3, 15, 18 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Liechi);
                    }
                    else if ([ 6, 9, 21, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Ganlon);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 81st unlock
    test('Unlock Salac berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[80]);

        checkPokemonNeededBehaviour("Rayquaza");

        // Give the player 3 Salac berries, since this step requires to get 4 of them, it should still trigger if the player has some
        App.game.farming.__berryListCount[BerryType.Salac] = 3;

        runBerryMutationTest(
            BerryType.Salac,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Coba
                // |a|a| | |a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if (![ 12, 13 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Coba);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 82nd unlock
    test('Unlock Petaya berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[81]);

        // Give the player 3 Petaya berries, since this step requires to get 4 of them, it should still trigger if the player has some
        App.game.farming.__berryListCount[BerryType.Petaya] = 3;

        runBerryMutationTest(
            BerryType.Petaya,
            function()
            {
                // The layout should look like that
                // |a| |b| |c|  with: a : Kasib    f : Chople   k : Babiri   p : Passho
                // |d| | | |e|        b : Payapa   g : Coba     l : Charti   q : Roseli
                // |f|g|h| |i|        c : Yache    h : Kebia    m : Tanga    r : Chilan
                // |j|k|l| |m|        d : Shuca    i : Haban    n : Occa
                // |n|o|p|q|r|        e : Wacan    j : Colbur   o : Rindo
                expect(App.game.farming.plotList[0].berry).toBe(BerryType.Kasib);
                expect(App.game.farming.plotList[2].berry).toBe(BerryType.Payapa);
                expect(App.game.farming.plotList[4].berry).toBe(BerryType.Yache);
                expect(App.game.farming.plotList[5].berry).toBe(BerryType.Shuca);
                expect(App.game.farming.plotList[9].berry).toBe(BerryType.Wacan);
                expect(App.game.farming.plotList[10].berry).toBe(BerryType.Chople);
                expect(App.game.farming.plotList[11].berry).toBe(BerryType.Coba);
                expect(App.game.farming.plotList[12].berry).toBe(BerryType.Kebia);
                expect(App.game.farming.plotList[14].berry).toBe(BerryType.Haban);
                expect(App.game.farming.plotList[15].berry).toBe(BerryType.Colbur);
                expect(App.game.farming.plotList[16].berry).toBe(BerryType.Babiri);
                expect(App.game.farming.plotList[17].berry).toBe(BerryType.Charti);
                expect(App.game.farming.plotList[19].berry).toBe(BerryType.Tanga);
                expect(App.game.farming.plotList[20].berry).toBe(BerryType.Occa);
                expect(App.game.farming.plotList[21].berry).toBe(BerryType.Rindo);
                expect(App.game.farming.plotList[22].berry).toBe(BerryType.Passho);
                expect(App.game.farming.plotList[23].berry).toBe(BerryType.Roseli);
                expect(App.game.farming.plotList[24].berry).toBe(BerryType.Chilan);

                for (const index of [ 1, 3, 6, 7, 8, 13, 18 ])
                {
                    expect(App.game.farming.plotList[index].isEmpty()).toBe(true);
                }
            });
    });

    // Test the 83rd unlock
    test('Unlock Maranga berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[82]);

        runBerryMutationTest(
            BerryType.Maranga,
            function()
            {
                // The layout should look like that
                // |a| | |a| |
                // | |b| | |b|  with:  a : Salac
                // | | | | | |         b : Petaya
                // |a| | |a| |
                // | |b| | |b|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 3, 15, 18 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Salac);
                    }
                    else if ([ 6, 9, 21, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Petaya);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 84th unlock
    test('Unlock Apicot berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[83]);

        checkPokemonNeededBehaviour("Palkia");

        // Give the player enough berries (only 19 berry available out of 23 needed)
        App.game.farming.__berryListCount[BerryType.Chilan] = 23;

        runBerryMutationTest(
            BerryType.Apicot,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Chilan
                // |a|a| | |a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if (![ 12, 13 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Chilan);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 85th unlock
    test('Unlock Lansat berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[84]);

        checkPokemonNeededBehaviour("Dialga");

        runBerryMutationTest(
            BerryType.Lansat,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Roseli
                // |a|a| | |a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if (![ 12, 13 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Roseli);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 86th unlock
    test('Unlock Starf berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[85]);

        runBerryMutationTest(
            BerryType.Starf,
            function()
            {
                // The layout should look like that
                // |a|a|a|a|a|
                // |a|a|a|a|a|  with:  a : Roseli
                // |a| | | |a|
                // |a|a|a|a|a|
                // |a|a|a|a|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if (![ 11, 12, 13 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Roseli);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });
});

/*\
|*| Bonus berries
\*/
describe(`${AutomationTestUtils.categoryPrefix}Bonus berries:`, () =>
{
    // Test the 87th unlock
    test('Unlock Lum berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[86]);

        // Give the player 23 Lum berries, since this step requires to get 24 of them, it would block the next test
        App.game.farming.__berryListCount[BerryType.Lum] = 23;

        runBerryMutationTest(
            BerryType.Lum,
            function()
            {
                // The layout should look like that
                // |a|b|c|b|a|
                // |d| |e| |d|  with:  a : Sitrus    d : Leppa    g : Chesto
                // |f|g|h|g|f|         b : Oran      e : Pecha    h : Cheri
                // |d| |e| |d|         c : Aspear    f : Rawst
                // |a|b|c|b|a|
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 0, 4, 20, 24 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Sitrus);
                    }
                    else if ([ 1, 3, 21, 23 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Oran);
                    }
                    else if ([ 2, 22 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Aspear);
                    }
                    else if ([ 5, 9, 15, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Leppa);
                    }
                    else if ([ 7, 17 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Pecha);
                    }
                    else if ([ 10, 14 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Rawst);
                    }
                    else if ([ 11, 13 ].includes(index))
                    {
                        expect(plot.berry).toBe(BerryType.Chesto);
                    }
                    else if (index == 12)
                    {
                        expect(plot.berry).toBe(BerryType.Cheri);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });
    });

    // Test the 88th unlock
    test('Unlock Enigma berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[87]);

        // Check the stategy needed pokemon
        expect(Automation.Farm.__internal__currentStrategy.requiresDiscord).toBe(true);

        expectFocusOnUnlocksToBeDisabled(function()
            {
                // Simulate the player linking a discord account
                App.game.discord.__id = "dummy";

                let enigmaMutation = App.game.farming.mutations.filter((mutation) => mutation instanceof EnigmaMutation)[0];

                for (const i of [ 0, 1, 2, 3 ])
                {
                    // Advance to the next watcher loop
                    jest.advanceTimersByTime(5000);

                    // Expect the feature to still be disabled because of the missing hints
                    expect(jest.getTimerCount()).toBe(1);
                    expect(Automation.Menu.__disabledElements.has(Automation.Farm.Settings.FocusOnUnlocks)).toBe(true);

                    // Simulate an hint being discovered
                    enigmaMutation.__hintsSeen[i] = true;
                }

                // Expect the feature to be reenabled
                return true;
            });

        runBerryMutationTest(
            BerryType.Enigma,
            function()
            {
                // The layout should look like that
                // | |a| | | |
                // |b| |c| | |  with:  a : North berry
                // | |d| |a| |         b : West berry
                // | | |b| |c|         c : East berry
                // | | | |d| |         d : South berry
                let neededBerries = EnigmaMutation.getReqs();
                for (const [ index, plot ] of App.game.farming.plotList.entries())
                {
                    if ([ 1, 13 ].includes(index))
                    {
                        expect(plot.berry).toBe(neededBerries[0]);
                    }
                    else if ([ 5, 17 ].includes(index))
                    {
                        expect(plot.berry).toBe(neededBerries[1]);
                    }
                    else if ([ 7, 19 ].includes(index))
                    {
                        expect(plot.berry).toBe(neededBerries[2]);
                    }
                    else if ([ 11, 23 ].includes(index))
                    {
                        expect(plot.berry).toBe(neededBerries[3]);
                    }
                    else
                    {
                        expect(plot.isEmpty()).toBe(true);
                    }
                }
            });

        // Nothing else to be unlocked, the feature should have been turned off
        expect(Automation.Menu.__disabledElements.has(Automation.Farm.Settings.FocusOnUnlocks)).toBe(true);
        expect(Automation.Utils.LocalStorage.getValue(Automation.Farm.Settings.FocusOnUnlocks)).toBe("false");
    });
});

/*\
|*| Edge cases
\*/
describe(`${AutomationTestUtils.categoryPrefix}Edge cases:`, () =>
{
    // Test going back to Gen 1 berry gathering if the player does not meet the requirements anymore
    test('Going back to Gen 1 berry gathering', () =>
    {
        // Clear the farm
        clearTheFarm();

        // Give the player 3 Chesto berries
        App.game.farming.__berryListCount[BerryType.Chesto] = 3;

        // Simulate the player turning the feature back on
        Automation.Utils.LocalStorage.setValue(Automation.Farm.Settings.FocusOnUnlocks, true);

        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the Gen 1 berry gathering one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[8]);

        // Restore the player's Chesto berries (for the next test)
        App.game.farming.__berryListCount[BerryType.Chesto] = 24;
    });

    // Test going back to mutate again if no more berries are in stock
    test('Mutate again if no more berries in stock', () =>
    {
        // Clear the farm
        clearTheFarm();

        // Give the player 0 Persim berries
        App.game.farming.__berryListCount[BerryType.Persim] = 0;

        // Simulate the player turning the feature back on
        Automation.Utils.LocalStorage.setValue(Automation.Farm.Settings.FocusOnUnlocks, true);

        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the Persim berry mutation
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[9]);

        // Restore the player's Persim berries (for the next test)
        App.game.farming.__berryListCount[BerryType.Persim] = 24;
    });

    // Trying to unlock a berry needing an Oak item without the option enabled
    test('Trying to unlock a berry needing an Oak item without the option enabled', () =>
    {
        // Clear the farm
        clearTheFarm();

        // Give the player 0 Shuca berries
        App.game.farming.__berryListCount[BerryType.Shuca] = 0;

        // Simulate the player turning the auto-equip setting off
        Automation.Utils.LocalStorage.setValue(Automation.Farm.Settings.OakItemLoadoutUpdate, false);

        // Simulate the player turning the feature back on
        Automation.Utils.LocalStorage.setValue(Automation.Farm.Settings.FocusOnUnlocks, true);

        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the Shuca berry mutation
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[66]);

        expectFocusOnUnlocksToBeDisabled(function()
            {
                // Expect the feature to stay disabled
                return false;
            });

        // Restore the player's Shuca berries (for the next test)
        App.game.farming.__berryListCount[BerryType.Shuca] = 24;
    });

    // Make sure the automation removes items that are forbidden
    test('Remove items that are forbidden', () =>
    {
        // Clear the farm
        clearTheFarm();

        // Give the player 0 Payapa berries
        App.game.farming.__berryListCount[BerryType.Payapa] = 0;

        // Set the oak item loadout size to 2
        App.game.oakItems.__maxActiveCount = 2;

        // Equip the forbidden items
        App.game.oakItems.deactivateAll();
        App.game.oakItems.activate(OakItemType.Rocky_Helmet);
        App.game.oakItems.activate(OakItemType.Cell_Battery);

        // Simulate the player turning the auto-equip setting back on
        Automation.Utils.LocalStorage.setValue(Automation.Farm.Settings.OakItemLoadoutUpdate, true);

        // Simulate the player turning the unlock setting back on
        Automation.Utils.LocalStorage.setValue(Automation.Farm.Settings.FocusOnUnlocks, true);

        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the Shuca berry mutation
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[60]);

        // The items should have been removed
        expect(App.game.oakItems.itemList[OakItemType.Rocky_Helmet].isActive).toBe(false);
        expect(App.game.oakItems.itemList[OakItemType.Cell_Battery].isActive).toBe(false);

        // Restore the player's Shuca berries (for the next test)
        App.game.farming.__berryListCount[BerryType.Payapa] = 24;
    });
});
