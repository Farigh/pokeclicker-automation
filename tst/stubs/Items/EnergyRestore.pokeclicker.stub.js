// Stub of https://github.com/pokeclicker/pokeclicker/blob/196018b66b940672c27e33626b217ea825dba3fe/src/scripts/items/EnergyRestore.ts#L2
class EnergyRestore extends Item
{
    // Skipped: displayName
    constructor(type, basePrice, currency = GameConstants.Currency.money)
    {
        super(GameConstants.EnergyRestoreSize[type], basePrice, currency);
        this.type = type;
    }
}

ItemList.SmallRestore  = new EnergyRestore(GameConstants.EnergyRestoreSize.SmallRestore, 30000);
ItemList.MediumRestore = new EnergyRestore(GameConstants.EnergyRestoreSize.MediumRestore, 100000);
ItemList.LargeRestore  = new EnergyRestore(GameConstants.EnergyRestoreSize.LargeRestore, 400000);
