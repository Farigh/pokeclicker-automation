// Stub of https://github.com/pokeclicker/pokeclicker/blob/541f4c8590a16a1f19ea9d1fb6d81c88c75bb214/src/scripts/items/PokeballItem.ts#L4
class PokeballItem extends Item
{
    // Skipped: options, displayName
    constructor(type, basePrice, currency = GameConstants.Currency.money)
    {
        super(GameConstants.Pokeball[type], basePrice, currency);

        this.type = type;
    }
}

ItemList.Pokeball = new PokeballItem(GameConstants.Pokeball.Pokeball, 100);
ItemList.Greatball = new PokeballItem(GameConstants.Pokeball.Greatball, 500);
ItemList.Ultraball = new PokeballItem(GameConstants.Pokeball.Ultraball, 2000);
