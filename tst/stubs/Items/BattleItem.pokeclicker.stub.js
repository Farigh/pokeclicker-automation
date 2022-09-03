// Stub of https://github.com/pokeclicker/pokeclicker/blob/26fe119da094d14cb263c229549d9aeb2e6180bb/src/scripts/items/BattleItem.ts#L2
class BattleItem extends Item
{
    // Stripped: description, displayName, multiplierType, multiplyBy
    constructor(type, basePrice, currency = GameConstants.Currency.money)
    {
        super(GameConstants.BattleItemType[type], basePrice, currency);

        this.type = type;
    }
}

ItemList.xAttack         = new BattleItem(GameConstants.BattleItemType.xAttack, 600);
ItemList.xClick          = new BattleItem(GameConstants.BattleItemType.xClick, 400);
ItemList.Lucky_egg       = new BattleItem(GameConstants.BattleItemType.Lucky_egg, 800);
ItemList.Token_collector = new BattleItem(GameConstants.BattleItemType.Token_collector, 1000);
ItemList.Dowsing_machine = new BattleItem(GameConstants.BattleItemType.Dowsing_machine, 1500);
ItemList.Lucky_incense   = new BattleItem(GameConstants.BattleItemType.Lucky_incense, 2000);
