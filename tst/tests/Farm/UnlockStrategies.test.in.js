import "tst/utils/tests.utils.js";

// Import pokéclicker App
import "tst/imports/Pokeclicker.import.js";

// Import current lib stubs
import "tst/stubs/localStorage.stub.js";
import "tst/stubs/Automation/Menu.stub.js";

// Import current lib elements
import "tst/imports/AutomationUtils.import.js";
import "src/lib/Notifications.js";
import "src/lib/Farm.js";

import "tst/utils/PokemonLoader.utils.js";
import "tst/utils/farming.utils.js";

/************************\
|***    TEST-SETUP    ***|
\************************/

// Stub setInterval calls
jest.useFakeTimers();
const setIntervalSpy = jest.spyOn(global, 'setInterval');

// Stub the Automation class to the bare minimum
class Automation
{
    static Farm = AutomationFarm;
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

// Disable warning notifications
Automation.Notifications.sendWarningNotif = function() {};

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
            const berryData = App.game.farming.berryData[plot.berry];
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

function getMutationStrategy(berryType)
{
    for (const strategy of Automation.Farm.__internal__unlockStrategySelection)
    {
        if (strategy.berryToUnlock && (strategy.berryToUnlock == berryType))
        {
            return strategy;
        }
    }

    return undefined;
}

function simulateTimePassing(ageDiff)
{
    for (const plot of App.game.farming.plotList)
    {
        if (!plot.isEmpty())
        {
            plot.age += ageDiff;
        }
    }
}

function runPlotUnlockTest(slotToBeUnlocked)
{
    expect(Automation.Farm.__internal__currentStrategy.harvestStrategy).toBe(Automation.Farm.__internal__harvestTimingType.AsSoonAsPossible);

    const berryCost = App.game.farming.plotBerryCost(slotToBeUnlocked);

    // Simulate the user getting some berries (just enough to unlock the plot)
    const unlockBerryAmount = berryCost.amount;
    App.game.farming.__berryListCount[berryCost.type] = unlockBerryAmount;

    // Simulate the loop
    Automation.Farm.__internal__farmLoop();

    // The slot should not have been unlocked, since the player lacks the farm points
    expect(App.game.farming.plotList[slotToBeUnlocked].isUnlocked).toBe(false);

    // Give the player just under the amount needed
    const unlockFPAmount = App.game.farming.plotFPCost(slotToBeUnlocked);
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
                              expectedConfig,
                              expectedOrder,
                              expectedNeededItem = null,
                              expectedForbiddenItems = [])
{
    expect(Automation.Farm.__internal__currentStrategy.berryToUnlock).toBe(targetBerry);
    expect(Automation.Farm.__internal__currentStrategy.harvestStrategy).toBe(Automation.Farm.__internal__harvestTimingType.RightBeforeWithering);

    checkItemNeededBehaviour(expectedNeededItem);

    // Check the forbidden Oak items
    expect(Automation.Farm.__internal__currentStrategy.forbiddenOakItems).toEqual(expectedForbiddenItems);
    expect(Automation.Utils.OakItem.ForbiddenItems).toEqual(expectedForbiddenItems);

    // Cleanup the layout
    clearTheFarm();
    Automation.Farm.__internal__farmLoop();

    // Expect the needed item to have been equipped
    if (expectedNeededItem != null)
    {
        expect(App.game.oakItems.itemList[expectedNeededItem].isActive).toBe(true);
    }

    // The mutation layout should have been planted
    checkMutationLayoutRotation(expectedConfig, expectedOrder);

    // Simulate a mutation in plot 8
    if (!App.game.farming.plotList[8].isEmpty())
    {
        App.game.farming.plotList[8].die();
    }

    App.game.farming.plotList[8].plant(targetBerry);
    const targetBerryData = App.game.farming.berryData[targetBerry];
    App.game.farming.plotList[8].age = targetBerryData.growthTime[PlotStage.Bloom] + 1;
    Automation.Farm.__internal__farmLoop();

    // The berry should have been harvested as soon as it reached the Berry stage, and thus be unlocked
    expect(App.game.farming.unlockedBerries[targetBerry]()).toBe(true);
}

function checkCurrentLayout(orderIndex, expectedConfig, expectedOrder)
{
    for (const [ plotIndex, plot ] of App.game.farming.plotList.entries())
    {
        let wasBerryFound = false;
        for (let i = 0; i < orderIndex; i++)
        {
            if (expectedConfig[expectedOrder[i]].includes(plotIndex))
            {
                expect(plot.berry).toBe(expectedOrder[i]);
                wasBerryFound = true;
                break;
            }
        }

        if (wasBerryFound)
        {
            continue;
        }

        // Expect any other slot to be empty
        expect(plot.isEmpty()).toBe(true);
    }
}

function checkMutationLayoutRotation(expectedConfig, expectedOrder)
{
    const currentMutationBerry = Automation.Farm.__internal__currentStrategy.berryToUnlock;

    // Some berry might have the save riping time, those will be planted at the same time
    const berryPlantOrder = [];
    let lastBerryTime = 0;
    for (const berryType of expectedOrder)
    {
        const currentBerryTime = App.game.farming.berryData[berryType].growthTime[PlotStage.Bloom];
        if (lastBerryTime == 0)
        {
            berryPlantOrder.push([]);
        }
        else if (currentBerryTime != lastBerryTime)
        {
            berryPlantOrder.push([...berryPlantOrder[berryPlantOrder.length - 1]]);
        }
        lastBerryTime = currentBerryTime;

        berryPlantOrder[berryPlantOrder.length - 1].push(berryType);
    }

    const targetAge = App.game.farming.berryData[expectedOrder[0]].growthTime[PlotStage.Bloom];
    const agingPlot = App.game.farming.plotList[expectedConfig[expectedOrder[0]][0]];
    for (const index of expectedOrder.keys())
    {
        const currentOrderIndex = berryPlantOrder[index].length;

        // Check the plot config based on the iteration
        checkCurrentLayout(currentOrderIndex, expectedConfig, expectedOrder);

        if (index == (berryPlantOrder.length - 1))
        {
            // All berries planted, nothing else to check
            break;
        }

        const nextBerryGrowingTime = App.game.farming.berryData[expectedOrder[index + 1]].growthTime[PlotStage.Bloom];

        // Simulate the berry age getting close to the next rotation
        agingPlot.age = targetAge - nextBerryGrowingTime - 1;
        Automation.Farm.__internal__farmLoop();
        expect(Automation.Farm.__internal__currentStrategy.berryToUnlock).toBe(currentMutationBerry);

        // The layout should not have changed
        checkCurrentLayout(currentOrderIndex, expectedConfig, expectedOrder);

        // Simulate the berry to have grown past the target age
        agingPlot.age = targetAge - nextBerryGrowingTime;
        Automation.Farm.__internal__farmLoop();
        expect(Automation.Farm.__internal__currentStrategy.berryToUnlock).toBe(currentMutationBerry);
    }
}

function runBerryMutationTestNoTiming(targetBerry,
                                      expectedPlantationLayoutCallback,
                                      dontMutateOrClean = false)
{
    expect(Automation.Farm.__internal__currentStrategy.berryToUnlock).toBe(targetBerry);
    expect(Automation.Farm.__internal__currentStrategy.harvestStrategy).toBe(Automation.Farm.__internal__harvestTimingType.RightBeforeWithering);

    checkItemNeededBehaviour(null);

    // Cleanup the layout
    if (!dontMutateOrClean)
    {
        setAllBerriesToRipe();

        Automation.Farm.__internal__farmLoop();
    }

    // The mutation layout should have been planted
    expectedPlantationLayoutCallback();

    // Check the forbidden Oak items
    expect(Automation.Farm.__internal__currentStrategy.forbiddenOakItems).toEqual([]);
    expect(Automation.Utils.OakItem.ForbiddenItems).toEqual([]);

    // Simulate a mutation in plot 8
    if (!dontMutateOrClean)
    {
        if (!App.game.farming.plotList[8].isEmpty())
        {
            App.game.farming.plotList[8].die();
        }

        App.game.farming.plotList[8].plant(targetBerry);
        const targetBerryData = App.game.farming.berryData[targetBerry];
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

    // Remove the needed item if it's equipped, so we can make sure the automation will equip it back
    App.game.oakItems.deactivate(oakItemNeeded);
}

function checkPokemonNeededBehaviour(pokemonName)
{
    expectFocusOnUnlocksToBeDisabled(function ()
        {
            // Simulate the player catching the pokemon
            const pokemonId = PokemonHelper.getPokemonByName(pokemonName).id;
            App.game.statistics.__pokemonCapturedCount[pokemonId] = 1;

            // Expect the feature to be reenabled
            return true;
        });

    // Make sure the next unlock strategy gets set
    Automation.Farm.__internal__farmLoop();

    // Check the stategy needed pokemon
    expect(Automation.Farm.__internal__currentStrategy.requiredPokemon).toBe(pokemonName);
}

function expectFocusOnUnlocksToBeDisabledBecauseOfItem(oakItemNeeded)
{
    expectFocusOnUnlocksToBeDisabled(function ()
    {
        // Simulate the player getting the item
        App.game.oakItems.itemList[oakItemNeeded].__isUnlocked = true;

        // Expect the feature to be reenabled
        return true;
    });

    // Make sure the next unlock strategy gets set
    Automation.Farm.__internal__farmLoop();
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

function expectIncreaseHarvestRateStrategy(targetBerry)
{
    // The layout should look like that
    // |a|a|a| | |
    // |a|b|a| | |  with:  a : Passho
    // |a|a|a| | |         b : targetBerry
    // | | | | | |
    // | | | | | |
    const expectedConfig = {};
    expectedConfig[targetBerry] = [ 6 ];
    expectedConfig[BerryType.Passho] = [ 0, 1, 2, 5, 7, 10, 11, 12 ];
    const expectedOrder = [ targetBerry, BerryType.Passho ];
    runBerryMutationTest(targetBerry, expectedConfig, expectedOrder);

    // Give the player 4 target berries, to move to the next farming strategy
    App.game.farming.__berryListCount[targetBerry] = 4;
    Automation.Farm.__internal__farmLoop();
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

        App.game.oakItems.deactivateAll();
    });

// Test when player does not have enough berries to unlock anything
test('Not enough berry to unlock anything', () =>
{
    const cheriData = App.game.farming.berryData[BerryType.Cheri];

    // Expect the current strategy to be pointing to the first one
    expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[0]);

    // Simulate farm loop
    Automation.Farm.__internal__farmLoop();

    // As the player does not have any cheri, nothing should have happened
    expect(App.game.farming.plotList[12].isEmpty()).toBe(true);

    // Simulate the user getting some Cheri berries
    const initialCheriCount = 5;
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
describe(`${AutomationTestUtils.categoryPrefix}Gen 1 unlocks`, () =>
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
            const berryData = App.game.farming.berryData[App.game.farming.plotList[index].berry];
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
describe(`${AutomationTestUtils.categoryPrefix}Gen 2 unlocks`, () =>
{
    // Test the 10th unlock
    test('Unlock Persim berry', () =>
    {

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[9]);

        // The layout should look like that
        // |#|#|#|#|#|
        // |#| |a| |#|  with:  a : Oran
        // |#|b| |b|#|         b : Pecha
        // |#| |a| |#|
        // |#|#|#|#|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Oran] = [ 7, 17 ];
        expectedConfig[BerryType.Pecha] = [ 11, 13 ];
        const expectedOrder = [ BerryType.Oran, BerryType.Pecha ];
        runBerryMutationTest(BerryType.Persim, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |#|#|a|#|#|
        // |#| | | |#|  with:  a : Leppa
        // |#| |b| |#|         b : Cheri
        // |#| |a| |#|
        // |#|#|#|#|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Leppa] = [ 2, 17 ];
        expectedConfig[BerryType.Cheri] = [ 12 ];
        const expectedOrder = [ BerryType.Leppa, BerryType.Cheri ];
        runBerryMutationTest(BerryType.Razz, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |#|#|a|#|#|
        // |#| | | |#|  with:  a : Leppa
        // |#| |b| | |         b : Chesto
        // |#| |a| |#|
        // |#|#|#|#|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Leppa] = [ 2, 17 ];
        expectedConfig[BerryType.Chesto] = [ 12 ];
        const expectedOrder = [ BerryType.Leppa, BerryType.Chesto ];
        runBerryMutationTest(BerryType.Bluk, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |#|#|a|#|#|
        // |#| | | |#|  with:  a : Aspear
        // |#| |b| | |         b : Pecha
        // |#| |a| |#|
        // |#|#| |#|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Aspear] = [ 2, 17 ];
        expectedConfig[BerryType.Pecha] = [ 12 ];
        const expectedOrder = [ BerryType.Aspear, BerryType.Pecha ];
        runBerryMutationTest(BerryType.Nanab, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |#|#|a|#|#|
        // |#| | | |#|  with:  a : Oran
        // |a| |b| |a|         b : Rawst
        // |#| | | |#|
        // |#|#|a|#|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Oran] = [ 2, 10, 14, 22 ];
        expectedConfig[BerryType.Rawst] = [ 12 ];
        const expectedOrder = [ BerryType.Oran, BerryType.Rawst ];
        runBerryMutationTest(BerryType.Wepear, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |#|#|a| |#|
        // |#| | | |#|  with:  a : Sitrus
        // |a| |b| |a|         b : Aspear
        // |#| | | |#|
        // |#|#|a|#|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Sitrus] = [ 2, 10, 14, 22 ];
        expectedConfig[BerryType.Aspear] = [ 12 ];
        const expectedOrder = [ BerryType.Sitrus, BerryType.Aspear ];
        runBerryMutationTest(BerryType.Pinap, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |#|#|a|a|#|
        // |#|a| | |#|  with:  a : Cheri
        // |a| | | |a|
        // |#|a| |a|a|
        // |#|#|a|#|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Cheri] = [ 2, 3, 6, 10, 14, 16, 18, 19, 22 ];
        const expectedOrder = [ BerryType.Cheri ];
        runBerryMutationTest(BerryType.Figy, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |#|#|a|a|#|
        // |#|a| | |#|  with:  a : Chesto
        // |a| |a| |a|
        // |#| | | |a|
        // |#|a|a|#|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Chesto] = [ 2, 3, 6, 10, 12, 14, 19, 21, 22 ];
        const expectedOrder = [ BerryType.Chesto ];
        runBerryMutationTest(BerryType.Wiki, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |#|#|a|a|#|
        // |a| | | |#|  with:  a : Pecha
        // |a| |a| |a|
        // |#| | | |a|
        // |#|a|a|#|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Pecha] = [ 2, 3, 5, 10, 12, 14, 19, 21, 22 ];
        const expectedOrder = [ BerryType.Pecha ];
        runBerryMutationTest(BerryType.Mago, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |#| |a|a|#|
        // |a| | | |#|  with:  a : Rawst
        // |a| |a| |a|
        // |#| | | |a|
        // |#|a|a|#|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Rawst] = [ 2, 3, 5, 10, 12, 14, 19, 21, 22 ];
        const expectedOrder = [ BerryType.Rawst ];
        runBerryMutationTest(BerryType.Aguav, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |#| |a|a|#|
        // |a| | | |#|  with:  a : Aspear
        // |a| |a| |a|
        // |#| | | |a|
        // |#|a|a|#|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Aspear] = [ 2, 3, 5, 10, 12, 14, 19, 21, 22 ];
        const expectedOrder = [ BerryType.Aspear ];
        runBerryMutationTest(BerryType.Iapapa, expectedConfig, expectedOrder);
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
                const berryData = App.game.farming.berryData[plot.berry];
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
describe(`${AutomationTestUtils.categoryPrefix}Gen 3 unlocks`, () =>
{
    // Test the 33rd unlock
    test('Unlock Pomeg berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[32]);

        // The layout should look like that
        // |#| | | |#|
        // |a|b| |a|b|  with:  a : Iapapa
        // | | | | | |         b : Mago
        // |#|a| | |a|
        // |#| |b| |#|
        const expectedConfig = {};
        expectedConfig[BerryType.Iapapa] = [ 5, 8, 16, 19 ];
        expectedConfig[BerryType.Mago] = [ 6, 9, 22 ];
        const expectedOrder = [ BerryType.Iapapa, BerryType.Mago ];
        runBerryMutationTest(BerryType.Pomeg, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |#| | | |#|
        // | |a|b|a| |  with:  a : Persim
        // |b| | | |b|         b : Chesto
        // | | | | | |
        // |#|a|b|a|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Persim] = [ 6, 8, 21, 23 ];
        expectedConfig[BerryType.Chesto] = [ 7, 10, 14, 22 ];
        const expectedOrder = [ BerryType.Persim, BerryType.Chesto ];
        runBerryMutationTest(BerryType.Kelpsy, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |a| | | |#|
        // | |b| |a|b|  with:  a : Pinap
        // | | | | | |         b : Mago
        // |a| | |a|b|
        // |#|b| | |#|
        const expectedConfig = {};
        expectedConfig[BerryType.Mago] = [ 6, 9, 19, 21 ];
        expectedConfig[BerryType.Pinap] = [ 0, 8, 15, 18 ];
        const expectedOrder = [ BerryType.Mago, BerryType.Pinap ];
        runBerryMutationTest(BerryType.Qualot, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // | |a| |b| |
        // |b|c| |a|c|  with:  a : Figy
        // | | | | | |         b : Wiki
        // |a| |b| |b|         c : Aguav
        // |#| |c|a|#|
        const expectedConfig = {};
        expectedConfig[BerryType.Wiki] = [ 3, 5, 17, 19 ];
        expectedConfig[BerryType.Figy] = [ 1, 8, 15, 23 ];
        expectedConfig[BerryType.Aguav] = [ 6, 9, 22 ];
        const expectedOrder = [ BerryType.Wiki, BerryType.Figy, BerryType.Aguav ];
        runBerryMutationTest(BerryType.Hondew, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |a| | |a| |
        // | |b| | |b|  with:  a : Aguav
        // | | | | | |         b : Figy
        // |a| | |a| |
        // |#|b| | |b|
        const expectedConfig = {};
        expectedConfig[BerryType.Aguav] = [ 0, 3, 15, 18 ];
        expectedConfig[BerryType.Figy] = [ 6, 9, 21, 24 ];
        const expectedOrder = [ BerryType.Aguav, BerryType.Figy ];
        runBerryMutationTest(BerryType.Grepa, expectedConfig, expectedOrder);
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

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|b|a|a|b|  with:  a : Razz
        // |a|a|a|a|a|         b : Pomeg
        // |a|a|a|a|a|
        // |a|b|a|a|b|
        const expectedConfig = {};
        expectedConfig[BerryType.Pomeg] = [ 6, 9, 21, 24 ];
        expectedConfig[BerryType.Razz] = App.game.farming.plotList.map((_, index) => index).filter(x => !expectedConfig[BerryType.Pomeg].includes(x));
        const expectedOrder = [ BerryType.Pomeg, BerryType.Razz ];
        runBerryMutationTest(BerryType.Tamato, expectedConfig, expectedOrder);
    });

    // Test the 44th unlock
    test('Unlock Cornn berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[43]);

        // The layout should look like that
        // | |a| | |a|
        // |b|c| |b|c|  with:  a : Leppa
        // | | | | | |         b : Bluk
        // | |a| | |a|         c : Wiki
        // |b|c| |b|c|
        const expectedConfig = {};
        expectedConfig[BerryType.Wiki] = [ 6, 9, 21, 24 ];
        expectedConfig[BerryType.Bluk] = [ 5, 8, 20, 23 ];
        expectedConfig[BerryType.Leppa] = [ 1, 4, 16, 19 ];
        const expectedOrder = [ BerryType.Wiki, BerryType.Bluk, BerryType.Leppa ];
        runBerryMutationTest(BerryType.Cornn, expectedConfig, expectedOrder);
    });

    // Test the 45th unlock
    test('Unlock Magost berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[44]);

        // The layout should look like that
        // | |a| | |a|
        // |b|c| |b|c|  with:  a : Pecha
        // | | | | | |         b : Nanab
        // | |a| | |a|         c : Mago
        // |b|c| |b|c|
        const expectedConfig = {};
        expectedConfig[BerryType.Mago] = [ 6, 9, 21, 24 ];
        expectedConfig[BerryType.Nanab] = [ 5, 8, 20, 23 ];
        expectedConfig[BerryType.Pecha] = [ 1, 4, 16, 19 ];
        const expectedOrder = [ BerryType.Mago, BerryType.Nanab, BerryType.Pecha ];
        runBerryMutationTest(BerryType.Magost, expectedConfig, expectedOrder);
    });

    // Test the 46th unlock
    test('Unlock Rabuta berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[45]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|b|a|a|b|  with:  a : Aspear
        // |a|a|a|a|a|         b : Aguav
        // |a|a|a|a|a|
        // |a|b|a|a|b|
        const expectedConfig = {};
        expectedConfig[BerryType.Aguav] = [ 6, 9, 21, 24 ];
        expectedConfig[BerryType.Aspear] = App.game.farming.plotList.map((_, index) => index).filter(x => !expectedConfig[BerryType.Aguav].includes(x));
        const expectedOrder = [ BerryType.Aguav, BerryType.Aspear ];
        runBerryMutationTest(BerryType.Rabuta, expectedConfig, expectedOrder);
    });

    // Test the 47th unlock
    test('Unlock Nomel berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[46]);

        // The layout should look like that
        // | | | | | |
        // | |a| | |a|  with:  a : Pinap
        // | | | | | |
        // | | | | | |
        // | |a| | |a|
        const expectedConfig = {};
        expectedConfig[BerryType.Pinap] = [ 6, 9, 21, 24 ];
        const expectedOrder = [ BerryType.Pinap ];
        runBerryMutationTest(BerryType.Nomel, expectedConfig, expectedOrder);
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
            const berryData = App.game.farming.berryData[plot.berry];
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

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Tamato
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Tamato] = App.game.farming.plotList.map((_, index) => index);
        const expectedOrder = [ BerryType.Tamato ];
        runBerryMutationTest(BerryType.Spelon, expectedConfig, expectedOrder);
    });

    // Test the 50th unlock
    test('Unlock Pamtre berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[49]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Cornn
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Cornn] = App.game.farming.plotList.map((_, index) => index);
        const expectedOrder = [ BerryType.Cornn ];
        runBerryMutationTest(BerryType.Pamtre, expectedConfig, expectedOrder, null, [ OakItemType.Cell_Battery ]);
    });

    // Test the 51st unlock
    test('Unlock Watmel berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[50]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Magost
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Magost] = App.game.farming.plotList.map((_, index) => index);
        const expectedOrder = [ BerryType.Magost ];
        runBerryMutationTest(BerryType.Watmel, expectedConfig, expectedOrder);
    });

    // Test the 52nd unlock
    test('Unlock Durin berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[51]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Rabuta
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Rabuta] = App.game.farming.plotList.map((_, index) => index);
        const expectedOrder = [ BerryType.Rabuta ];
        runBerryMutationTest(BerryType.Durin, expectedConfig, expectedOrder);
    });

    // Test the 53rd unlock
    test('Unlock Belue berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[52]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Nomel
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Nomel] = App.game.farming.plotList.map((_, index) => index);
        const expectedOrder = [ BerryType.Nomel ];
        runBerryMutationTest(BerryType.Belue, expectedConfig, expectedOrder);
    });

    // Test the 54rd unlock
    test('Unlock Pinkan berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[53]);

        // The layout should look like that
        // |a| |b| |a|
        // |c| |d| |c|  with:  a : Nanab     e : Qualot
        // |e|f|g|f|e|         b : Pecha     f : Magost
        // |c| |d| |c|         c : Mago      g : Watmel
        // |a| |b| |a|         d : Persim
        const expectedConfig = {};
        expectedConfig[BerryType.Nanab] = [ 0, 4, 20, 24 ];
        expectedConfig[BerryType.Pecha] = [ 2, 22 ];
        expectedConfig[BerryType.Mago] = [ 5, 9, 15, 19 ];
        expectedConfig[BerryType.Persim] = [ 7, 17 ];
        expectedConfig[BerryType.Qualot] = [ 10, 14 ];
        expectedConfig[BerryType.Magost] = [ 11, 13 ];
        expectedConfig[BerryType.Watmel] = [ 12 ];
        const expectedOrder = [ BerryType.Watmel, BerryType.Magost, BerryType.Qualot, BerryType.Mago,
                                BerryType.Nanab, BerryType.Persim, BerryType.Pecha ];
        runBerryMutationTest(BerryType.Pinkan, expectedConfig, expectedOrder);
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
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[54]);

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
            const berryData = App.game.farming.berryData[plot.berry];
            plot.age = berryData.growthTime[PlotStage.Bloom] + 1;
        }
        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the next one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[55]);
    });
});

/*\
|*| Gen 4 berry unlocks
\*/
describe(`${AutomationTestUtils.categoryPrefix}Gen 4 unlocks`, () =>
{
    // Test the 56th unlock
    test('Unlock Occa berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[55]);

        // The layout should look like that
        // |a| |b| |a|
        // |c| |d| |c|  with:  a : Tamato  c : Spelon
        // | | | | | |         b : Figy    d : Razz
        // |b| |a| |b|
        // |d| |c| |d|
        const expectedConfig = {};
        expectedConfig[BerryType.Spelon] = [ 5, 9, 22 ];
        expectedConfig[BerryType.Tamato] = [ 0, 4, 17 ];
        expectedConfig[BerryType.Figy] = [ 2, 15, 19 ];
        expectedConfig[BerryType.Razz] = [ 7, 20, 24 ];
        const expectedOrder = [ BerryType.Spelon, BerryType.Tamato, BerryType.Figy, BerryType.Razz ];
        runBerryMutationTest(BerryType.Occa, expectedConfig, expectedOrder, null, [ OakItemType.Blaze_Cassette ]);
    });

    // Test the 57th unlock
    test('Unlock Coba berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[56]);

        // The layout should look like that
        // |a| | |a| |
        // | |b| | |b|  with:  a : Wiki
        // | | | | | |         b : Aguav
        // |a| | |a| |
        // | |b| | |b|
        const expectedConfig = {};
        expectedConfig[BerryType.Wiki] = [ 0, 3, 15, 18 ];
        expectedConfig[BerryType.Aguav] = [ 6, 9, 21, 24 ];
        const expectedOrder = [ BerryType.Wiki, BerryType.Aguav ];
        runBerryMutationTest(BerryType.Coba, expectedConfig, expectedOrder);
    });

    // Test the 58th unlock
    test('Unlock Passho berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[57]);

        // The layout should look like that
        // |a| |b| |a|
        // |c| |d| |c|  with:  a : Oran     c : Chesto
        // | | | | | |         b : Kelpsy   d : Coba
        // |b| |a| |b|
        // |d| |c| |d|
        const expectedConfig = {};
        expectedConfig[BerryType.Coba] = [ 7, 20, 24 ];
        expectedConfig[BerryType.Kelpsy] = [ 2, 15, 19 ];
        expectedConfig[BerryType.Oran] = [ 0, 4, 17 ];
        expectedConfig[BerryType.Chesto] = [ 5, 9, 22 ];
        const expectedOrder = [ BerryType.Coba, BerryType.Kelpsy, BerryType.Oran, BerryType.Chesto ];
        runBerryMutationTest(BerryType.Passho, expectedConfig, expectedOrder);
    });

    // Test the 59th unlock
    test('Unlock Wacan berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[58]);

        // The layout should look like that
        // |a| |b| |a|
        // |c| |d| |c|  with:  a : Iapapa   c : Qualot
        // | | | | | |         b : Pinap    d : Grepa
        // |b| |a| |b|
        // |d| |c| |d|
        const expectedConfig = {};
        expectedConfig[BerryType.Grepa] = [ 7, 20, 24 ];
        expectedConfig[BerryType.Qualot] = [ 5, 9, 22 ];
        expectedConfig[BerryType.Iapapa] = [ 0, 4, 17 ];
        expectedConfig[BerryType.Pinap] = [ 2, 15, 19 ];
        const expectedOrder = [ BerryType.Grepa, BerryType.Qualot, BerryType.Iapapa, BerryType.Pinap ];
        runBerryMutationTest(BerryType.Wacan, expectedConfig, expectedOrder);
    });

    // Test the 60th unlock
    test('Unlock Rindo berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[59]);

        // The layout should look like that
        // |a| | |a| |
        // | |b| | |b|  with:  a : Figy
        // | | | | | |         b : Aguav
        // |a| | |a| |
        // | |b| | |b|
        const expectedConfig = {};
        expectedConfig[BerryType.Figy] = [ 0, 3, 15, 18 ];
        expectedConfig[BerryType.Aguav] = [ 6, 9, 21, 24 ];
        const expectedOrder = [ BerryType.Figy, BerryType.Aguav ];
        runBerryMutationTest(BerryType.Rindo, expectedConfig, expectedOrder);
    });

    // Test the 61st unlock
    test('Unlock Yache berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[60]);

        // The layout should look like that
        // |a| |a| |a|
        // | | | | | |  with:  a : Passho
        // |a| |a| |a|
        // | | | | | |
        // |a| |a| |a|
        const expectedConfig = {};
        expectedConfig[BerryType.Passho] = [ 0, 2, 4, 10, 12, 14, 20, 22, 24 ];
        const expectedOrder = [ BerryType.Passho ];
        runBerryMutationTest(BerryType.Yache, expectedConfig, expectedOrder);
    });

    // Test the 62nd unlock
    test('Unlock Payapa berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[61]);

        // The layout should look like that
        // |a| |b| |a|
        // |c| |d| |c|  with:  a : Wiki    c : Bluk
        // | | | | | |         b : Cornn   d : Pamtre
        // |b| |a| |b|
        // |d| |c| |d|
        const expectedConfig = {};
        expectedConfig[BerryType.Pamtre] = [ 7, 20, 24 ];
        expectedConfig[BerryType.Bluk] = [ 5, 9, 22 ];
        expectedConfig[BerryType.Wiki] = [ 0, 4, 17 ];
        expectedConfig[BerryType.Cornn] = [ 2, 15, 19 ];
        const expectedOrder = [ BerryType.Pamtre, BerryType.Cornn, BerryType.Wiki, BerryType.Bluk ];
        runBerryMutationTest(BerryType.Payapa, expectedConfig, expectedOrder, null, [ OakItemType.Rocky_Helmet, OakItemType.Cell_Battery ]);
    });

    // Test the 63rd unlock
    test('Unlock Tanga berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[62]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a| |a| |a|  with:  a : Rindo
        // |a|a|a|a|a|
        // |a| |a| |a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Rindo] = App.game.farming.plotList.map((_, index) => index).filter(x => ![ 6, 8, 16, 18 ].includes(x));
        const expectedOrder = [ BerryType.Rindo ];
        runBerryMutationTest(BerryType.Tanga, expectedConfig, expectedOrder);
    });

    // Test the 64th unlock
    test('Unlock Kasib berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[63]);

        // Give the player 3 Kasib berries, since this step requires to get 4 of them, it should still trigger if the player has some
        App.game.farming.__berryListCount[BerryType.Kasib] = 3;

        expect(Automation.Farm.__internal__currentStrategy.berryToUnlock).toBe(BerryType.Kasib);
        expect(Automation.Farm.__internal__currentStrategy.harvestStrategy).toBe(Automation.Farm.__internal__harvestTimingType.LetTheBerryDie);

        checkItemNeededBehaviour(null);

        // Cleanup the layout
        setAllBerriesToRipe();

        Automation.Farm.__internal__farmLoop();

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

        // Check the forbidden Oak items
        expect(Automation.Farm.__internal__currentStrategy.forbiddenOakItems).toEqual([]);
        expect(Automation.Utils.OakItem.ForbiddenItems).toEqual([]);

        // Simulate the berries being close to death
        const cheriBerryData = App.game.farming.berryData[BerryType.Cheri];
        for (const plot of App.game.farming.plotList)
        {
            plot.age = cheriBerryData.growthTime[PlotStage.Berry] - 1;
        }
        Automation.Farm.__internal__farmLoop();

        // The berries should never be harvested
        for (const plot of App.game.farming.plotList)
        {
            expect(plot.berry).toBe(BerryType.Cheri);
            expect(plot.age).toBe(cheriBerryData.growthTime[PlotStage.Berry] - 1);
        }

        // Simulate the berries withering
        clearTheFarm();
        Automation.Farm.__internal__farmLoop();

        // New berries should have been planted
        for (const plot of App.game.farming.plotList)
        {
            expect(plot.berry).toBe(BerryType.Cheri);
            expect(plot.age).toBe(0);
        }

        // Simulate a mutation in plot 8
        App.game.farming.plotList[8].die();
        App.game.farming.plotList[8].plant(BerryType.Kasib);
        const targetBerryData = App.game.farming.berryData[BerryType.Kasib];
        App.game.farming.plotList[8].age = targetBerryData.growthTime[PlotStage.Bloom] + 1;
        Automation.Farm.__internal__farmLoop();

        // The berry should have been harvested as soon as it reached the Berry stage, and thus be unlocked
        expect(App.game.farming.unlockedBerries[BerryType.Kasib]()).toBe(true);
        Automation.Farm.__internal__farmLoop();
    });

    // Test the 65th unlock
    test('Unlock Haban berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[64]);

        // Give the player enough Wacan berries (only 2 berries available out of 3 needed)
        App.game.farming.__berryListCount[BerryType.Wacan] = 3;

        // The layout should look like that
        // |a| |b| |a|
        // |c| |d| |c|  with:  a : Occa     c : Wacan
        // | | | | | |         b : Passho   d : Rindo
        // |b| |a| |b|
        // |d| |c| |d|
        const expectedConfig = {};
        expectedConfig[BerryType.Rindo] = [ 7, 20, 24 ];
        expectedConfig[BerryType.Occa] = [ 0, 4, 17 ];
        expectedConfig[BerryType.Passho] = [ 2, 15, 19 ];
        expectedConfig[BerryType.Wacan] = [ 5, 9, 22 ];
        const expectedOrder = [ BerryType.Rindo, BerryType.Occa, BerryType.Passho, BerryType.Wacan ];
        runBerryMutationTest(BerryType.Haban, expectedConfig, expectedOrder);
    });

    // Test the 66th unlock
    test('Unlock Colbur berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[65]);

        // The layout should look like that
        // | |a| | |a|
        // |b|c| |b|c|  with:  a : Rabuta
        // | | | | | |         b : Kasib
        // | |a| | |a|         c : Payapa
        // |b|c| |b|c|
        const expectedConfig = {};
        expectedConfig[BerryType.Payapa] = [ 6, 9, 21, 24 ];
        expectedConfig[BerryType.Rabuta] = [ 1, 4, 16, 19 ];
        expectedConfig[BerryType.Kasib] = [ 5, 8, 20, 23 ];
        const expectedOrder = [ BerryType.Payapa, BerryType.Rabuta, BerryType.Kasib ];
        runBerryMutationTest(BerryType.Colbur, expectedConfig, expectedOrder);
    });

    // Test the 67th unlock
    test('Unlock Roseli berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[66]);

        // The layout should look like that
        // |a| |b| |a|
        // |c| |d| |c|  with:  a : Mago     c : Nanab
        // | | | | | |         b : Magost   d : Watmel
        // |b| |a| |b|
        // |d| |c| |d|
        const expectedConfig = {};
        expectedConfig[BerryType.Watmel] = [ 7, 20, 24 ];
        expectedConfig[BerryType.Magost] = [ 2, 15, 19 ];
        expectedConfig[BerryType.Mago] = [ 0, 4, 17 ];
        expectedConfig[BerryType.Nanab] = [ 5, 9, 22 ];
        const expectedOrder = [ BerryType.Watmel, BerryType.Magost, BerryType.Mago, BerryType.Nanab ];
        runBerryMutationTest(BerryType.Roseli, expectedConfig, expectedOrder, null, [ OakItemType.Sprinklotad ]);
    });

    // Test the 68th unlock
    test('Unlock Shuca berry', () =>
    {
        const oakItemNeeded = OakItemType.Sprinklotad;

        // Expect the strategy to have been disabled
        expectFocusOnUnlocksToBeDisabledBecauseOfItem(oakItemNeeded);

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[67]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Watmel
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Watmel] = App.game.farming.plotList.map((_, index) => index);
        const expectedOrder = [ BerryType.Watmel ];
        runBerryMutationTest(BerryType.Shuca, expectedConfig, expectedOrder, oakItemNeeded);
    });

    // Test the 69th unlock
    test('Unlock Charti berry', () =>
    {
        const oakItemNeeded = OakItemType.Cell_Battery;

        // Expect the strategy to have been disabled
        expectFocusOnUnlocksToBeDisabledBecauseOfItem(oakItemNeeded);

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[68]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Cornn
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Cornn] = App.game.farming.plotList.map((_, index) => index);
        const expectedOrder = [ BerryType.Cornn ];
        runBerryMutationTest(BerryType.Charti, expectedConfig, expectedOrder, oakItemNeeded);
    });

    // Test the 70th unlock
    test('Unlock Babiri berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[69]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |b| |a| |b|  with:  a : Shuca
        // |b|b|b|b|b|         b : Charti
        // |b| |a| |b|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Shuca] = [ 0, 1, 2, 3, 4, 7, 17, 20, 21, 22, 23, 24 ];
        expectedConfig[BerryType.Charti] = [ 5, 9, 10, 11, 12, 13, 14, 15, 19 ];
        const expectedOrder = [ BerryType.Shuca, BerryType.Charti ];
        runBerryMutationTest(BerryType.Babiri, expectedConfig, expectedOrder);
    });

    // Test the 71st unlock
    test('Unlock Chople berry', () =>
    {
        const oakItemNeeded = OakItemType.Blaze_Cassette;

        // Expect the strategy to have been disabled
        expectFocusOnUnlocksToBeDisabledBecauseOfItem(oakItemNeeded);

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[70]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Spelon
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Spelon] = App.game.farming.plotList.map((_, index) => index);
        const expectedOrder = [ BerryType.Spelon ];
        runBerryMutationTest(BerryType.Chople, expectedConfig, expectedOrder, oakItemNeeded);
    });

    // Wait for plots to be emptied
    test('Wait for plots to be emptied', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[71]);

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
                expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[71]);
            }
        }

        // Expect the strategy to be pointing to the next one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[72]);
    });

    // Test the 73rd unlock step 1
    test('Unlock Chilan berry > step 1', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[72]);

        const chilanUnlockFirstStep = function()
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

        runBerryMutationTestNoTiming(BerryType.Chilan, chilanUnlockFirstStep, true);

        // This should not change until the berries are ripe
        const chopleBerryData = App.game.farming.berryData[BerryType.Chople];
        for (const index of [ 6, 8, 16, 18 ])
        {
            App.game.farming.plotList[index].age = chopleBerryData.growthTime[PlotStage.Bloom];
        }
        Automation.Farm.__internal__farmLoop();
        runBerryMutationTestNoTiming(BerryType.Chilan, chilanUnlockFirstStep, true);

        for (const index of [ 6, 8, 16, 18 ])
        {
            App.game.farming.plotList[index].age = chopleBerryData.growthTime[PlotStage.Bloom] + 1;
        }
        Automation.Farm.__internal__farmLoop();
    });

    // Test the 73rd unlock step 2
    test('Unlock Chilan berry > step 2', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[72]);

        runBerryMutationTestNoTiming(
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
            }, true);

        // Simulate a berry mutation in plot 8
        App.game.farming.plotList[8].plant(BerryType.Chilan);
        const targetBerryData = App.game.farming.berryData[BerryType.Chilan];
        App.game.farming.plotList[8].age = targetBerryData.growthTime[PlotStage.Bloom] + 1;
        Automation.Farm.__internal__farmLoop();

        // The berry should have been harvested as soon as it reached the Berry stage, and thus be unlocked
        expect(App.game.farming.unlockedBerries[BerryType.Chilan]()).toBe(true);
    });

    // Test the 74th unlock
    test('Unlock Kebia berry', () =>
    {
        const oakItemNeeded = OakItemType.Rocky_Helmet;

        // Expect the strategy to have been disabled
        expectFocusOnUnlocksToBeDisabledBecauseOfItem(oakItemNeeded);

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[73]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Pamtre
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Pamtre] = App.game.farming.plotList.map((_, index) => index);
        const expectedOrder = [ BerryType.Pamtre ];
        runBerryMutationTest(BerryType.Kebia, expectedConfig, expectedOrder, oakItemNeeded);
    });
});

/*\
|*| Gen 5 berry unlocks
\*/
describe(`${AutomationTestUtils.categoryPrefix}Gen 5 unlocks`, () =>
{
    // Test the 75th unlock
    test('Unlock Micle berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[74]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a| |a| |a|  with:  a : Pamtre
        // |a| | | |a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Pamtre] = App.game.farming.plotList.map((_, index) => index).filter(x => ![ 6, 8, 11, 12, 13 ].includes(x));
        const expectedOrder = [ BerryType.Pamtre ];
        runBerryMutationTest(BerryType.Micle, expectedConfig, expectedOrder, null, [ OakItemType.Rocky_Helmet ]);
    });

    // Test the 76th unlock
    test('Unlock Custap berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[75]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a| |a| |a|  with:  a : Watmel
        // |a| | | |a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Watmel] = App.game.farming.plotList.map((_, index) => index).filter(x => ![ 6, 8, 11, 12, 13 ].includes(x));
        const expectedOrder = [ BerryType.Watmel ];
        runBerryMutationTest(BerryType.Custap, expectedConfig, expectedOrder, null, [ OakItemType.Sprinklotad ]);
    });

    // Test the 77th unlock
    test('Unlock Jaboca berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[76]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a| |a| |a|  with:  a : Durin
        // |a| | | |a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Durin] = App.game.farming.plotList.map((_, index) => index).filter(x => ![ 6, 8, 11, 12, 13 ].includes(x));
        const expectedOrder = [ BerryType.Durin ];
        runBerryMutationTest(BerryType.Jaboca, expectedConfig, expectedOrder);
    });

    // Test the 78th unlock
    test('Unlock Rowap berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[77]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a| |a| |a|  with:  a : Belue
        // |a| | | |a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Belue] = App.game.farming.plotList.map((_, index) => index).filter(x => ![ 6, 8, 11, 12, 13 ].includes(x));
        const expectedOrder = [ BerryType.Belue ];
        runBerryMutationTest(BerryType.Rowap, expectedConfig, expectedOrder);
    });

    // Test the 79th unlock
    test('Unlock Liechi berry', () =>
    {
        checkPokemonNeededBehaviour("Kyogre");

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[78]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Passho
        // |a|a| | |a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Passho] = App.game.farming.plotList.map((_, index) => index).filter(x => ![ 12, 13 ].includes(x));
        const expectedOrder = [ BerryType.Passho ];
        runBerryMutationTest(BerryType.Liechi, expectedConfig, expectedOrder);
    });

    // Test the 80th unlock
    test('Farm 4 Liechi berries', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[79]);

        expectIncreaseHarvestRateStrategy(BerryType.Liechi)
    });

    // Test the 81st unlock
    test('Unlock Ganlon berry', () =>
    {
        checkPokemonNeededBehaviour("Groudon");

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[80]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Shuca
        // |a|a| | |a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Shuca] = App.game.farming.plotList.map((_, index) => index).filter(x => ![ 12, 13 ].includes(x));
        const expectedOrder = [ BerryType.Shuca ];
        runBerryMutationTest(BerryType.Ganlon, expectedConfig, expectedOrder);
    });

    // Test the 82nd unlock
    test('Farm 4 Ganlon berries', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[81]);

        expectIncreaseHarvestRateStrategy(BerryType.Ganlon)
    });

    // Test the 83rd unlock
    test('Unlock Kee berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[82]);

        // The layout should look like that
        // |a| | |a| |
        // | |b| | |b|  with:  a : Liechi
        // | | | | | |         b : Ganlon
        // |a| | |a| |
        // | |b| | |b|
        const expectedConfig = {};
        expectedConfig[BerryType.Ganlon] = [ 6, 9, 21, 24 ];
        expectedConfig[BerryType.Liechi] = [ 0, 3, 15, 18 ];
        const expectedOrder = [ BerryType.Ganlon, BerryType.Liechi ];
        runBerryMutationTest(BerryType.Kee, expectedConfig, expectedOrder);
    });

    // Test the 84th unlock
    test('Unlock Salac berry', () =>
    {
        // Give back the player 4 of each needed berries, those were consumed by the previous test
        App.game.farming.__berryListCount[BerryType.Ganlon] = 4;
        App.game.farming.__berryListCount[BerryType.Liechi] = 4;

        checkPokemonNeededBehaviour("Rayquaza");

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[83]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Coba
        // |a|a| | |a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Coba] = App.game.farming.plotList.map((_, index) => index).filter(x => ![ 12, 13 ].includes(x));
        const expectedOrder = [ BerryType.Coba ];
        runBerryMutationTest(BerryType.Salac, expectedConfig, expectedOrder);
    });

    // Test the 85th unlock
    test('Farm 4 Salac berries', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[84]);

        expectIncreaseHarvestRateStrategy(BerryType.Salac)
    });

    // Test the 86th unlock
    test('Unlock Petaya berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[85]);

        // The layout should look like that
        // |a| |b| |c|  with: a : Kasib    f : Chople   k : Babiri   p : Passho
        // |d| | | |e|        b : Payapa   g : Coba     l : Charti   q : Roseli
        // |f|g|h| |i|        c : Yache    h : Kebia    m : Tanga    r : Chilan
        // |j|k|l| |m|        d : Shuca    i : Haban    n : Occa
        // |n|o|p|q|r|        e : Wacan    j : Colbur   o : Rindo
        const expectedConfig = {};
        expectedConfig[BerryType.Kasib] = [ 0 ];
        expectedConfig[BerryType.Payapa] = [ 2 ];
        expectedConfig[BerryType.Yache] = [ 4 ];
        expectedConfig[BerryType.Shuca] = [ 5 ];
        expectedConfig[BerryType.Wacan] = [ 9 ];
        expectedConfig[BerryType.Chople] = [ 10 ];
        expectedConfig[BerryType.Coba] = [ 11 ];
        expectedConfig[BerryType.Kebia] = [ 12 ];
        expectedConfig[BerryType.Haban] = [ 14 ];
        expectedConfig[BerryType.Colbur] = [ 15 ];
        expectedConfig[BerryType.Babiri] = [ 16 ];
        expectedConfig[BerryType.Charti] = [ 17 ];
        expectedConfig[BerryType.Tanga] = [ 19 ];
        expectedConfig[BerryType.Occa] = [ 20 ];
        expectedConfig[BerryType.Rindo] = [ 21 ];
        expectedConfig[BerryType.Passho] = [ 22 ];
        expectedConfig[BerryType.Roseli] = [ 23 ];
        expectedConfig[BerryType.Chilan] = [ 24 ];
        const expectedOrder = [ BerryType.Haban, BerryType.Babiri, BerryType.Yache, BerryType.Shuca, BerryType.Charti, BerryType.Chople,
                                BerryType.Payapa, BerryType.Rindo, BerryType.Colbur, BerryType.Roseli, BerryType.Occa, BerryType.Passho,
                                BerryType.Coba, BerryType.Chilan, BerryType.Tanga, BerryType.Wacan, BerryType.Kebia, BerryType.Kasib ];
        runBerryMutationTest(BerryType.Petaya, expectedConfig, expectedOrder);
    });

    // Test the 87th unlock
    test('Farm 4 Petaya berries', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[86]);

        expectIncreaseHarvestRateStrategy(BerryType.Petaya)
    });

    // Test the 88th unlock
    test('Unlock Maranga berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[87]);

        // The layout should look like that
        // |a| | |a| |
        // | |b| | |b|  with:  a : Salac
        // | | | | | |         b : Petaya
        // |a| | |a| |
        // | |b| | |b|
        const expectedConfig = {};
        expectedConfig[BerryType.Salac] = [ 0, 3, 15, 18 ];
        expectedConfig[BerryType.Petaya] = [ 6, 9, 21, 24 ];
        const expectedOrder = [ BerryType.Salac, BerryType.Petaya ];
        runBerryMutationTest(BerryType.Maranga, expectedConfig, expectedOrder);
    });

    // Test the 89th unlock
    test('Unlock Apicot berry', () =>
    {
        checkPokemonNeededBehaviour("Palkia");

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[88]);

        // Give the player enough berries (only 19 berry available out of 23 needed)
        App.game.farming.__berryListCount[BerryType.Chilan] = 23;

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Chilan
        // |a|a| | |a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Chilan] = App.game.farming.plotList.map((_, index) => index).filter(x => ![ 12, 13 ].includes(x));
        const expectedOrder = [ BerryType.Chilan ];
        runBerryMutationTest(BerryType.Apicot, expectedConfig, expectedOrder);
    });

    // Test the 90th unlock
    test('Unlock Lansat berry', () =>
    {
        checkPokemonNeededBehaviour("Dialga");

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[89]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Roseli
        // |a|a| | |a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Roseli] = App.game.farming.plotList.map((_, index) => index).filter(x => ![ 12, 13 ].includes(x));
        const expectedOrder = [ BerryType.Roseli ];
        runBerryMutationTest(BerryType.Lansat, expectedConfig, expectedOrder);
    });

    // Test the 91st unlock
    test('Unlock Starf berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[90]);

        // The layout should look like that
        // |a|a|a|a|a|
        // |a|a|a|a|a|  with:  a : Roseli
        // |a| | | |a|
        // |a|a|a|a|a|
        // |a|a|a|a|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Roseli] = App.game.farming.plotList.map((_, index) => index).filter(x => ![ 11, 12, 13 ].includes(x));
        const expectedOrder = [ BerryType.Roseli ];
        runBerryMutationTest(BerryType.Starf, expectedConfig, expectedOrder);
    });
});

/*\
|*| Bonus berries
\*/
describe(`${AutomationTestUtils.categoryPrefix}Bonus berries`, () =>
{
    // Test the 92nd unlock
    test('Unlock Lum berry', () =>
    {
        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[91]);

        // Give the player 23 Lum berries, since this step requires to get 24 of them, it would block the next test
        App.game.farming.__berryListCount[BerryType.Lum] = 23;

        // The layout should look like that
        // |a|b|c|b|a|
        // |d| |e| |d|  with:  a : Sitrus    d : Leppa    g : Chesto
        // |f|g|h|g|f|         b : Oran      e : Pecha    h : Cheri
        // |d| |e| |d|         c : Aspear    f : Rawst
        // |a|b|c|b|a|
        const expectedConfig = {};
        expectedConfig[BerryType.Sitrus] = [ 0, 4, 20, 24 ];
        expectedConfig[BerryType.Oran] = [ 1, 3, 21, 23 ];
        expectedConfig[BerryType.Aspear] = [ 2, 22 ];
        expectedConfig[BerryType.Leppa] = [ 5, 9, 15, 19 ];
        expectedConfig[BerryType.Pecha] = [ 7, 17 ];
        expectedConfig[BerryType.Rawst] = [ 10, 14 ];
        expectedConfig[BerryType.Chesto] = [ 11, 13 ];
        expectedConfig[BerryType.Cheri] = [ 12 ];
        const expectedOrder = [ BerryType.Sitrus, BerryType.Oran, BerryType.Leppa, BerryType.Aspear,
                                BerryType.Rawst, BerryType.Pecha, BerryType.Chesto, BerryType.Cheri ];
        runBerryMutationTest(BerryType.Lum, expectedConfig, expectedOrder);
    });

    // Test the 93rd unlock
    test('Unlock Enigma berry', () =>
    {
        expectFocusOnUnlocksToBeDisabled(function()
            {
                // Simulate the player linking a discord account
                App.game.discord.__id = "dummy";

                const enigmaMutation = App.game.farming.mutations.filter((mutation) => mutation instanceof EnigmaMutation)[0];

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

        // Make sure the next unlock strategy gets set
        Automation.Farm.__internal__farmLoop();

        // Expect the strategy to be pointing to the right one
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[92]);

        // Check the stategy needed pokemon
        expect(Automation.Farm.__internal__currentStrategy.requiresDiscord).toBe(true);

        // The layout should look like that
        // | |a| | | |
        // |b| |c| | |  with:  a : North berry (Cheri)
        // | |d| |a| |         b : West berry (Chesto)
        // | | |b| |c|         c : East berry (Pecha)
        // | | | |d| |         d : South berry (Rawst)
        const expectedConfig = {};
        expectedConfig[BerryType.Cheri] = [ 1, 13 ];
        expectedConfig[BerryType.Chesto] = [ 5, 17 ];
        expectedConfig[BerryType.Pecha] = [ 7, 19 ];
        expectedConfig[BerryType.Rawst] = [ 11, 23 ];
        const expectedOrder = [ BerryType.Rawst, BerryType.Pecha, BerryType.Chesto, BerryType.Cheri ];
        runBerryMutationTest(BerryType.Enigma, expectedConfig, expectedOrder);

        // Nothing else to be unlocked, the feature should have been turned off
        expect(Automation.Menu.__disabledElements.has(Automation.Farm.Settings.FocusOnUnlocks)).toBe(true);
        expect(Automation.Utils.LocalStorage.getValue(Automation.Farm.Settings.FocusOnUnlocks)).toBe("false");
    });
});

/*\
|*| Edge cases
\*/
describe(`${AutomationTestUtils.categoryPrefix}Mutation strategy with occupied plot`, () =>
{
    test('Berries on strategy empty slots > Bloom time higher than the strategy one', () =>
    {
        // Clear the farm
        clearTheFarm();

        // Get the Haban berry unlock strategy
        const strategy = getMutationStrategy(BerryType.Haban);

        // Set a berry to a slot not involved in the strategy if the riping time higher than the highest bloom time of the strategy
        // (Rindo has 28800 riping time, where Micle has 31680)
        App.game.farming.plotList[12].plant(BerryType.Micle);

        // Simulate the strategy callback
        strategy.action();

        // The plots should look like this (the Rindo should NOT have been planted)
        // | | | | | |
        // | | | | | |   with:  a : Micle
        // | | |a| | |
        // | | | | | |
        // | | | | | |
        const expectedConfigBefore = {};
        expectedConfigBefore[BerryType.Micle] = [ 12 ];
        checkCurrentLayout(1, expectedConfigBefore, [ BerryType.Micle ]);

        // The strategy should start as soon as the berry reaches the
        App.game.farming.plotList[12].age = App.game.farming.berryData[BerryType.Micle].growthTime[PlotStage.Bloom]
                                          - App.game.farming.berryData[BerryType.Rindo].growthTime[PlotStage.Bloom];

        strategy.action();

        // The plots should look like this
        // | | | | | |
        // | | |a| | |   with:  a : Rindo
        // | | |b| | |          b : Micle
        // | | | | | |
        // |a| | | |a|
        const expectedBerries = [ BerryType.Micle, BerryType.Rindo ];
        const expectedConfig = {};
        expectedConfig[BerryType.Micle] = [ 12 ];
        expectedConfig[BerryType.Rindo] = [ 7, 20, 24 ];
        checkCurrentLayout(expectedBerries.length, expectedConfig, expectedBerries);
    });

    test('Berries on strategy empty slots > Bloom time lower than the strategy one', () =>
    {
        // Clear the farm
        clearTheFarm();

        // Get the Haban berry unlock strategy
        const strategy = getMutationStrategy(BerryType.Haban);

        // Set a berry to a slot not involved in the strategy if the riping time lower than the highest bloom time of the strategy
        // (Rindo has 28800 riping time, where Custap has 27360)
        App.game.farming.plotList[12].plant(BerryType.Custap);

        // Simulate the strategy callback
        strategy.action();

        // The plots should look like this (the Rindo should have been planted)
        // | | | | | |
        // | | |a| | |   with:  a : Rindo
        // | | |b| | |          b : Custap
        // | | | | | |
        // |a| | | |a|
        const expectedBerries = [ BerryType.Rindo, BerryType.Custap ];
        const expectedConfig = {};
        expectedConfig[BerryType.Custap] = [ 12 ];
        expectedConfig[BerryType.Rindo] = [ 7, 20, 24 ];
        checkCurrentLayout(expectedBerries.length, expectedConfig, expectedBerries);

        // Simulate the berries aging
        const occaBloomTime = App.game.farming.berryData[BerryType.Occa].growthTime[PlotStage.Bloom];
        let ageDiff = App.game.farming.berryData[BerryType.Rindo].growthTime[PlotStage.Bloom] - occaBloomTime;
        simulateTimePassing(ageDiff + 1);

        // The next step should proceed normally once berries reaches the matching age
        strategy.action();
        expectedConfig[BerryType.Occa] = [ 0, 4, 17 ];
        expectedBerries.push(BerryType.Occa);
        checkCurrentLayout(expectedBerries.length, expectedConfig, expectedBerries);

        // Simulate the berries aging
        const passhoBloomTime = App.game.farming.berryData[BerryType.Passho].growthTime[PlotStage.Bloom];
        ageDiff = occaBloomTime - passhoBloomTime;
        simulateTimePassing(ageDiff);

        // The next step should proceed normally once berries reaches the matching age
        strategy.action();
        expectedConfig[BerryType.Passho] = [ 2, 15, 19 ];
        expectedBerries.push(BerryType.Passho);
        checkCurrentLayout(expectedBerries.length, expectedConfig, expectedBerries);

        // Simulate the berries aging
        ageDiff = passhoBloomTime - App.game.farming.berryData[BerryType.Wacan].growthTime[PlotStage.Bloom];
        simulateTimePassing(ageDiff);

        // The next step should proceed normally once berries reaches the matching age
        strategy.action();
        expectedConfig[BerryType.Wacan] = [ 5, 9, 22 ];
        expectedBerries.push(BerryType.Wacan);
        checkCurrentLayout(expectedBerries.length, expectedConfig, expectedBerries);

        // Simulate the berries aging
        ageDiff = App.game.farming.berryData[BerryType.Custap].growthTime[PlotStage.Bloom] - App.game.farming.plotList[12].age;
        simulateTimePassing(ageDiff + 1);

        // As soon as the extra berry can be harvested, it should be
        strategy.action();
        expectedConfig[BerryType.Custap] = [ ];
        checkCurrentLayout(expectedBerries.length, expectedConfig, expectedBerries);
    });

    test('Berries on strategy needed slot > Bloom time higher than the strategy one', () =>
    {
        // Clear the farm
        clearTheFarm();

        // Get the Haban berry unlock strategy
        const strategy = getMutationStrategy(BerryType.Haban);

        // Set a berry to a slot involved in the strategy
        App.game.farming.plotList[7].plant(BerryType.Micle);

        // Simulate the strategy callback
        strategy.action();

        // The plots should look like this (the Rindo should NOT have been planted)
        // | | | | | |
        // | | |a| | |   with:  a : Micle
        // | | | | | |
        // | | | | | |
        // | | | | | |
        const expectedConfigBefore = {};
        expectedConfigBefore[BerryType.Micle] = [ 7 ];
        checkCurrentLayout(1, expectedConfigBefore, [ BerryType.Micle ]);

        // The strategy should start as soon as the berry can be harvested
        App.game.farming.plotList[7].age = App.game.farming.berryData[BerryType.Micle].growthTime[PlotStage.Bloom] + 1;

        strategy.action();

        // The plots should look like this (the Micle should have been harvested and the Rindo should have been planted)
        // | | | | | |
        // | | |a| | |   with:  a : Rindo
        // | | | | | |
        // | | | | | |
        // |a| | | |a|
        const expectedConfig = {};
        expectedConfig[BerryType.Rindo] = [ 7, 20, 24 ];
        checkCurrentLayout(1, expectedConfig, [ BerryType.Rindo ]);
    });

    test('Berries on strategy needed slot > Bloom time lower than the strategy one', () =>
    {
        // Clear the farm
        clearTheFarm();

        // Get the Haban berry unlock strategy
        const strategy = getMutationStrategy(BerryType.Haban);

        // Set a berry to a slot involved in the strategy
        App.game.farming.plotList[2].plant(BerryType.Cheri);

        // Simulate the strategy callback
        strategy.action();

        // The plots should look like this
        // | | |a| | |
        // | | |b| | |   with:  a : Cheri
        // | | | | | |          b : Rindo
        // | | | | | |
        // |b| | | |b|
        const expectedConfig = {};
        expectedConfig[BerryType.Cheri] = [ 2 ];
        expectedConfig[BerryType.Rindo] = [ 7, 20, 24 ];
        checkCurrentLayout(2, expectedConfig, [ BerryType.Cheri, BerryType.Rindo ]);
    });

    test('Berries on strategy needed slot > Berries on all strategy berry type slots', () =>
    {
        // Clear the farm
        clearTheFarm();

        // Get the Haban berry unlock strategy
        const strategy = getMutationStrategy(BerryType.Haban);

        // Set a berry to a slot involved in the strategy
        App.game.farming.plotList[0].plant(BerryType.Liechi);
        App.game.farming.plotList[2].plant(BerryType.Liechi);
        App.game.farming.plotList[5].plant(BerryType.Liechi);

        // Set the berries just under the planting time
        const rindoTime = App.game.farming.berryData[BerryType.Rindo].growthTime[PlotStage.Bloom];
        const liechiDiffTime = App.game.farming.berryData[BerryType.Liechi].growthTime[PlotStage.Bloom] - rindoTime;
        App.game.farming.plotList[0].age = liechiDiffTime + App.game.farming.berryData[BerryType.Occa].growthTime[PlotStage.Bloom];
        App.game.farming.plotList[2].age = liechiDiffTime + App.game.farming.berryData[BerryType.Passho].growthTime[PlotStage.Bloom];
        App.game.farming.plotList[5].age = liechiDiffTime + App.game.farming.berryData[BerryType.Wacan].growthTime[PlotStage.Bloom];

        // Simulate the strategy callback
        strategy.action();

        // The plots should look like this
        // |a| |a| | |
        // |a| |b| | |   with:  a : Liechi
        // | | | | | |          b : Rindo
        // | | | | | |
        // |b| | | |b|
        const expectedConfig = {};
        expectedConfig[BerryType.Liechi] = [ 0, 2, 5 ];
        expectedConfig[BerryType.Rindo] = [ 7, 20, 24 ];
        const expectedBerries = [ BerryType.Liechi, BerryType.Rindo ];
        checkCurrentLayout(expectedBerries.length, expectedConfig, expectedBerries);

        // Simulate the berries aging
        const occaBloomTime = App.game.farming.berryData[BerryType.Occa].growthTime[PlotStage.Bloom];
        let ageDiff = App.game.farming.berryData[BerryType.Rindo].growthTime[PlotStage.Bloom] - occaBloomTime;
        simulateTimePassing(ageDiff + 1);

        // The next step should proceed normally once berries reaches the matching age
        strategy.action();
        expectedConfig[BerryType.Liechi] = [ 2, 5 ];
        expectedConfig[BerryType.Occa] = [ 0, 4, 17 ];
        expectedBerries.push(BerryType.Occa);
        checkCurrentLayout(expectedBerries.length, expectedConfig, expectedBerries);

        // Simulate the berries aging
        const passhoBloomTime = App.game.farming.berryData[BerryType.Passho].growthTime[PlotStage.Bloom];
        ageDiff = occaBloomTime - passhoBloomTime;
        simulateTimePassing(ageDiff);

        // The next step should proceed normally once berries reaches the matching age
        strategy.action();
        expectedConfig[BerryType.Liechi] = [ 5 ];
        expectedConfig[BerryType.Passho] = [ 2, 15, 19 ];
        expectedBerries.push(BerryType.Passho);
        checkCurrentLayout(expectedBerries.length, expectedConfig, expectedBerries);

        // Simulate the berries aging
        ageDiff = passhoBloomTime - App.game.farming.berryData[BerryType.Wacan].growthTime[PlotStage.Bloom];
        simulateTimePassing(ageDiff);

        // The next step should proceed normally once berries reaches the matching age
        strategy.action();
        expectedConfig[BerryType.Liechi] = [ ];
        expectedConfig[BerryType.Wacan] = [ 5, 9, 22 ];
        expectedBerries.push(BerryType.Wacan);
        checkCurrentLayout(expectedBerries.length, expectedConfig, expectedBerries);
    });
});

/*\
|*| Edge cases
\*/
describe(`${AutomationTestUtils.categoryPrefix}Edge cases`, () =>
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

        const expectedReasonStart = "The next unlock requires the 'Sprinklotad' Oak item";
        expect(Automation.Menu.__disabledElements.get(Automation.Farm.Settings.FocusOnUnlocks).startsWith(expectedReasonStart)).toBe(true);

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

        // Expect the strategy to be pointing to the Payapa berry mutation
        expect(Automation.Farm.__internal__currentStrategy).toBe(Automation.Farm.__internal__unlockStrategySelection[61]);

        // The items should have been removed
        expect(App.game.oakItems.itemList[OakItemType.Rocky_Helmet].isActive).toBe(false);
        expect(App.game.oakItems.itemList[OakItemType.Cell_Battery].isActive).toBe(false);

        // Restore the player's Payapa berries (for the next test)
        App.game.farming.__berryListCount[BerryType.Payapa] = 24;
    });
});
