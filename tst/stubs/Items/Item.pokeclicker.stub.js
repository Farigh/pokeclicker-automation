// Stub of https://github.com/pokeclicker/pokeclicker/blob/dac6201d46a7885029f0af7ecc23a0e8a93d6357/src/scripts/items/Item.ts#L205
let ItemList = {};

// Stub of https://github.com/pokeclicker/pokeclicker/blob/dac6201d46a7885029f0af7ecc23a0e8a93d6357/src/scripts/items/Item.ts#L22
class Item
{
    // Stripped:
    // {
    //      saveName = '',
    //      maxAmount = Number.MAX_SAFE_INTEGER,
    //      multiplier = GameConstants.ITEM_PRICE_MULTIPLIER,
    //      multiplierDecrease = true,
    //      multiplierDecreaser = MultiplierDecreaser.Battle,
    //  } : ShopOptions = {},
    //  displayName?: string,
    //  description?: string,
    //  imageDirectory?: string
    constructor(name, basePrice, currency = GameConstants.Currency.money)
    {
        this.name = name;
        this.basePrice = basePrice;
        this.currency = currency;
    }

    checkCanUse()
    {
        return player.itemList[this.name]() > 0;
    }
}
