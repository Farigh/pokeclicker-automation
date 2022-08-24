// Stub of https://github.com/pokeclicker/pokeclicker/blob/196018b66b940672c27e33626b217ea825dba3fe/src/scripts/items/EggItem.ts#L3
class EggItem extends Item // instead of : CaughtIndicatingItem
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    // Stripped: displayName
    constructor(type, basePrice, currency = GameConstants.Currency.questPoint)
    {
        super(GameConstants.EggItemType[type], basePrice, currency);
        this.type = type;
    }

    getCaughtStatus()
    {
        // Stripped Pokemon_egg
        switch (this.type)
        {
            case (GameConstants.EggItemType.Mystery_egg):
            {
                return App.game.breeding.getAllCaughtStatus();
            }
            default:
            {
                const eggType = EggType[GameConstants.EggItemType[this.type].split('_')[0]];
                return App.game.breeding.getTypeCaughtStatus(eggType);
            }
        }
    }

    use()
    {
        if (player.itemList[this.name]() <= 0)
        {
            return false;
        }

        let success = false;
        if (this.type === GameConstants.EggItemType.Pokemon_egg)
        {
            success = App.game.breeding.gainPokemonEgg(pokemonMap.randomRegion(player.highestRegion()));
        }
        else if (this.type === GameConstants.EggItemType.Mystery_egg)
        {
            success = App.game.breeding.gainRandomEgg();
        }
        else
        {
            const eggType = EggType[GameConstants.EggItemType[this.type].split('_')[0]];
            success = App.game.breeding.gainEgg(App.game.breeding.createTypedEgg(eggType));
        }

        if (success)
        {
            player.loseItem(this.name, 1);
        }

        return success;
    }
}

// Instanciate all eggs
ItemList.Fire_egg     = new EggItem(GameConstants.EggItemType.Fire_egg, 1000, undefined, 'Fire Egg');
ItemList.Water_egg    = new EggItem(GameConstants.EggItemType.Water_egg, 1000, undefined, 'Water Egg');
ItemList.Grass_egg    = new EggItem(GameConstants.EggItemType.Grass_egg, 1000, undefined, 'Grass Egg');
ItemList.Fighting_egg = new EggItem(GameConstants.EggItemType.Fighting_egg, 1000, undefined, 'Fighting Egg');
ItemList.Electric_egg = new EggItem(GameConstants.EggItemType.Electric_egg, 1000, undefined, 'Electric Egg');
ItemList.Dragon_egg   = new EggItem(GameConstants.EggItemType.Dragon_egg, 1000, undefined, 'Dragon Egg');
ItemList.Pokemon_egg  = new EggItem(GameConstants.EggItemType.Pokemon_egg, 1000, undefined, 'Pokémon Egg');
ItemList.Mystery_egg  = new EggItem(GameConstants.EggItemType.Mystery_egg, 700, undefined, 'Mystery Egg');
