// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/modules/oakItems/OakItems.ts#L12
class OakItems
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    constructor()
    {
        this.itemList = [];
        this.__maxActiveCount = 1;

        this.__initItemList();
    }

    activate(oakItem)
    {
        let item = this.itemList[oakItem]
        if (item.isUnlocked()
            && this.itemList.reduce((count, item) => count + (item.isActive ? 1 : 0), 0) < this.maxActiveCount())
        {
            item.isActive = true;
        }
    }

    deactivate(oakItem)
    {
        this.itemList[oakItem].isActive = false;
    }

    deactivateAll()
    {
        for (const item of this.itemList)
        {
            item.isActive = false;
        }
    }

    maxActiveCount()
    {
        return this.__maxActiveCount;
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    __initItemList()
    {
        this.itemList[OakItemType.Magic_Ball] = new OakItem(OakItemType.Magic_Ball, 'Magic Ball');
        this.itemList[OakItemType.Amulet_Coin] = new OakItem(OakItemType.Amulet_Coin, 'Amulet Coin');
        this.itemList[OakItemType.Rocky_Helmet] = new OakItem(OakItemType.Rocky_Helmet, 'Rocky Helmet');
        this.itemList[OakItemType.Exp_Share]  = new OakItem(OakItemType.Exp_Share, 'EXP Share');
        this.itemList[OakItemType.Sprayduck] = new OakItem(OakItemType.Sprayduck, 'Sprayduck');
        this.itemList[OakItemType.Shiny_Charm] = new OakItem(OakItemType.Shiny_Charm, 'Shiny Charm');
        this.itemList[OakItemType.Blaze_Cassette] = new OakItem(OakItemType.Blaze_Cassette, 'Blaze Cassette');
        this.itemList[OakItemType.Cell_Battery] = new OakItem(OakItemType.Cell_Battery, 'Cell Battery');
        this.itemList[OakItemType.Squirtbottle] = new OakItem(OakItemType.Squirtbottle, 'Squirtbottle');
        this.itemList[OakItemType.Sprinklotad] = new OakItem(OakItemType.Sprinklotad, 'Sprinklotad');
        this.itemList[OakItemType.Explosive_Charge] = new OakItem(OakItemType.Explosive_Charge, 'Explosive Charge');
        this.itemList[OakItemType.Treasure_Scanner] = new OakItem(OakItemType.Treasure_Scanner, 'Treasure Scanner');
    }
}
