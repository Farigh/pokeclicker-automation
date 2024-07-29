// Stub of https://github.com/pokeclicker/pokeclicker/blob/4921661cd9b1635f9fd745aba62102ac3f5786ff/src/scripts/items/HeldItem.ts#L3
class HeldItem extends Item
{
    // Stripped: description, displayName, regionUnlocked, canUse
    constructor(name, basePrice, currency = GameConstants.Currency.money)
    {
        super(name, basePrice, currency);
    }
}

// Stub of https://github.com/pokeclicker/pokeclicker/blob/4921661cd9b1635f9fd745aba62102ac3f5786ff/src/scripts/items/HeldItem.ts#L54
class AttackBonusHeldItem extends HeldItem {
    // Stripped: applyBonus
    constructor(name, basePrice, currency = GameConstants.Currency.money, _attackBonus)
    {
        super(name, basePrice, currency);

        this._attackBonus = _attackBonus;
    }

    get attackBonus()
    {
        return this._attackBonus;
    }
}

// Stub of https://github.com/pokeclicker/pokeclicker/blob/4921661cd9b1635f9fd745aba62102ac3f5786ff/src/scripts/items/HeldItem.ts#L108
class HybridAttackBonusHeldItem extends AttackBonusHeldItem {
    constructor(name, basePrice, currency = GameConstants.Currency.money, attackBonus, _clickAttackBonus)
    {
        super(name, basePrice, currency, attackBonus);

        this._clickAttackBonus = _clickAttackBonus;
    }

    get clickAttackBonus()
    {
        return this._clickAttackBonus;
    }
}

ItemList.Agile_Scroll = new HybridAttackBonusHeldItem('Agile_Scroll', 10000, GameConstants.Currency.money, 0.5, 2.0);
ItemList.Strong_Scroll = new HybridAttackBonusHeldItem('Strong_Scroll', 10000, GameConstants.Currency.money, 2.0, 0.5);
