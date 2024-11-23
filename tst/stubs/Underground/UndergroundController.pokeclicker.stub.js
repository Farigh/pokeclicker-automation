// Stub of https://github.com/pokeclicker/pokeclicker/blob/a832cfa12f1a86f288af4d99765e0de110365ea2/src/modules/underground/UndergroundController.ts#L31
class UndergroundController
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    constructor()
    {
    }

    static gainProfit(item, amount)
    {
        let success = true;
        const uItem = UndergroundItems.getById(item.id);

        switch (item.valueType)
        {
            case UndergroundItemValueType.Diamond:
                App.game.wallet.gainDiamonds(item.value * amount);
                break;
            case UndergroundItemValueType.Fossil:
                if (!App.game.breeding.hasFreeEggSlot())
                {
                    return false;
                }

                success = App.game.breeding.gainEgg(App.game.breeding.createFossilEgg(item.name));
                break;
            case UndergroundItemValueType.Gem:
                const type = uItem.type;
                App.game.gems.gainGems(GameConstants.PLATE_VALUE * amount, type);
                break;
            // Nothing else can be sold
            default:
                return false;
        }
        return success;
    }

    static sellMineItem(item, amount = 1)
    {
        // Stripped sell locking feature stuff
        const curAmt = player.itemList[item.itemName]();

        if (curAmt > 0)
        {
            const sellAmt = Math.min(curAmt, amount);
            const success = this.gainProfit(item, sellAmt);
            if (success)
            {
                item.__amount -= sellAmt;
                // Skipped item sorting
            }
            return;
        }
    }
}
