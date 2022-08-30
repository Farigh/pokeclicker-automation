// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/modules/oakItems/OakItem.ts#L10
class OakItem
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    // Skipped: description, increasing, bonusList, inactiveBonus, unlockReq, expGain, expList, maxLevel, costList, bonusSymbol
    constructor(name, displayName)
    {
        this.name = name;
        this.displayName = displayName;
        this.isActive = false;

        this.__isUnlocked = false;
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    calculateBonus()
    {
        // For now, not needed so we return the default value
        return 1;
    }

    isUnlocked()
    {
        return this.__isUnlocked;
    }
}
