// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/modules/oakItems/OakItem.ts#L10
class OakItem
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    constructor(id, displayName)
    {
        this.name = id;
        this.displayName = displayName;
        this.isActive = false;

        this.__isUnlocked = false;
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    isUnlocked()
    {
        return this.__isUnlocked;
    }
}