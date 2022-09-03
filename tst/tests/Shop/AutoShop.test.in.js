import "tst/utils/tests.utils.js";

// Import pokéclicker App
import "tst/imports/Pokeclicker.import.js";

// Import current lib stubs
import "tst/stubs/localStorage.stub.js";
import "tst/stubs/Automation/Menu.stub.js";

// Import current lib elements
import "tst/imports/AutomationUtils.import.js";
import "src/lib/Shop.js";

import "tst/utils/PokemonLoader.utils.js";

/************************\
|***    TEST-SETUP    ***|
\************************/

// Stub the Automation class to the bare minimum
class Automation
{
    static Shop = AutomationShop;
    static Menu = AutomationMenu;
    static Utils = AutomationUtils;

    static Settings = { Notifications: "Notifications" };
}

Automation.Shop.__internal__buildShopItemList();

/**************************\
|***    TEST-HELPERS    ***|
\**************************/

function checkItemConditions(item, firstUnlockTown, secondUnlockTown)
{
    expect(Automation.Shop.__internal__isPokeMarkUnlocked()).toBe(false);
    expect(item.isUnlocked()).toBe(false);
    expect(item.isPurchasable()).toBe(false);

    // Unlocking the town should unlock the option
    TownList[firstUnlockTown].__isUnlocked = true;
    expect(item.isUnlocked()).toBe(true);
    expect(item.isPurchasable()).toBe(true);

    // Simulate the player moving to Johto
    player.__highestRegion = GameConstants.Region.johto;
    player.region = GameConstants.Region.johto;

    expect(item.isUnlocked()).toBe(true);
    expect(item.isPurchasable()).toBe(false);

    // Unlocking the town should unlock the option
    TownList[secondUnlockTown].__isUnlocked = true;
    expect(item.isPurchasable()).toBe(true);

    // Simulate the player moving to Hoenn (and thus having beaten the johto league)
    player.__highestRegion = GameConstants.Region.hoenn;
    player.region = GameConstants.Region.hoenn;
    App.game.statistics.__gymsDefeated[GameConstants.getGymIndex('Champion Lance')] = 1;
    expect(Automation.Shop.__internal__isPokeMarkUnlocked()).toBe(true);

    expect(item.isUnlocked()).toBe(true);
    expect(item.isPurchasable()).toBe(true);
}

function checkRestoreItemConditions(item, initialRegion, unlockTown)
{
    // Simulate the player being in the right
    player.__highestRegion = initialRegion;
    player.region = initialRegion;

    expect(item.isUnlocked()).toBe(false);
    expect(item.isPurchasable()).toBe(false);

    // Unlocking the town should unlock the option
    TownList[unlockTown].__isUnlocked = true;
    expect(item.isUnlocked()).toBe(true);
    expect(item.isPurchasable()).toBe(true);

    // Simulate the player moving to the next region
    player.__highestRegion += 1;
    player.region += 1;

    // No other condition needed, it should still be unlocked and purchasable
    expect(item.isUnlocked()).toBe(true);
    expect(item.isPurchasable()).toBe(true);
}

/************************\
|***    TEST-SUITE    ***|
\************************/

beforeEach(() =>
{
    player.region = 0;
    player.__highestRegion = 0;

    // Reset all town to locked
    for (const townName in TownList)
    {
        TownList[townName].__isUnlocked = false;
    }

    App.game.statistics.__gymsDefeated[GameConstants.getGymIndex('Champion Lance')] = 0;
});

// Check the item internal data behaviour
describe(`${AutomationTestUtils.categoryPrefix}Test item internal data`, () =>
{
    test("Test Pokeball", () =>
    {
        let itemData = Automation.Shop.__internal__shopItems[0];
        expect(itemData.item.name).toBe("Pokeball");

        expect(itemData.isUnlocked()).toBe(true);
        expect(itemData.isPurchasable()).toBe(true);
    });

    test("Test Greatball", () =>
    {
        let itemData = Automation.Shop.__internal__shopItems[1];
        expect(itemData.item.name).toBe("Greatball");

        checkItemConditions(itemData, "Lavender Town", "Ecruteak City");
    });

    test("Test Ultraball", () =>
    {
        let itemData = Automation.Shop.__internal__shopItems[2];
        expect(itemData.item.name).toBe("Ultraball");

        checkItemConditions(itemData, "Fuchsia City", "Blackthorn City");
    });

    test("Test xAttack", () =>
    {
        let itemData = Automation.Shop.__internal__shopItems[3];
        expect(itemData.item.name).toBe("xAttack");

        expect(itemData.isUnlocked()).toBe(true);
        expect(itemData.isPurchasable()).toBe(true);
    });

    test("Test xClick", () =>
    {
        let itemData = Automation.Shop.__internal__shopItems[4];
        expect(itemData.item.name).toBe("xClick");

        expect(itemData.isUnlocked()).toBe(true);
        expect(itemData.isPurchasable()).toBe(true);
    });

    test("Test Lucky egg", () =>
    {
        let itemData = Automation.Shop.__internal__shopItems[5];
        expect(itemData.item.name).toBe("Lucky_egg");

        checkItemConditions(itemData, "Pewter City", "Violet City");
    });

    test("Test Token collector", () =>
    {
        let itemData = Automation.Shop.__internal__shopItems[6];
        expect(itemData.item.name).toBe("Token_collector");

        checkItemConditions(itemData, "Pewter City", "Violet City");
    });

    test("Test Dowsing machine", () =>
    {
        let itemData = Automation.Shop.__internal__shopItems[7];
        expect(itemData.item.name).toBe("Dowsing_machine");

        checkItemConditions(itemData, "Lavender Town", "Olivine City");
    });

    test("Test Lucky incense", () =>
    {
        let itemData = Automation.Shop.__internal__shopItems[8];
        expect(itemData.item.name).toBe("Lucky_incense");

        checkItemConditions(itemData, "Lavender Town", "Olivine City");
    });

    test("Test SmallRestore", () =>
    {
        let itemData = Automation.Shop.__internal__shopItems[9];
        expect(itemData.item.name).toBe("SmallRestore");

        checkRestoreItemConditions(itemData, GameConstants.Region.kanto, "Cinnabar Island");
    });

    test("Test MediumRestore", () =>
    {
        let itemData = Automation.Shop.__internal__shopItems[10];
        expect(itemData.item.name).toBe("MediumRestore");

        checkRestoreItemConditions(itemData, GameConstants.Region.johto, "Violet City");
    });

    test("Test LargeRestore", () =>
    {
        let itemData = Automation.Shop.__internal__shopItems[11];
        expect(itemData.item.name).toBe("LargeRestore");

        checkRestoreItemConditions(itemData, GameConstants.Region.johto, "Blackthorn City");
    });
});
