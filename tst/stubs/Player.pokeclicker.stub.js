// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/Player.ts#L17
class Player
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    constructor()
    {
        this.itemList = [];
        this.__itemListCount = [];

        this.__highestRegion = 0;
        this.__mineInventory = [];

        this.__initItemList();
    }

    highestRegion()
    {
        return this.__highestRegion;
    }

    loseItem(itemName, amount)
    {
        this.__itemListCount[itemName] -= amount;
    }

    mineInventory()
    {
        return this.__mineInventory;
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    __initItemList()
    {
        // Init egg items
        for (const i of Object.keys(GameConstants.EggItemType).filter((eggType) => isNaN(eggType)))
        {
            this.__itemListCount[i] = 0;
            this.itemList[i] = function() { return this.__itemListCount[i]; }.bind(this);
        }
    }
}

// The instance
let player = new Player();
