// Stub of https://github.com/pokeclicker/pokeclicker/blob/541f4c8590a16a1f19ea9d1fb6d81c88c75bb214/src/modules/challenges/Challenges.ts#L4
class Challenges
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    constructor()
    {
        this.list = new Object();

        this.__initList();
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    __initList()
    {
        this.list.regionalAttackDebuff = new Challenge(true);
        this.list.disableGems = new Challenge(false);
    }
}

// Stub of https://github.com/pokeclicker/pokeclicker/blob/665a4dba7b53f9bcd23a8759840f35bf54bc3de6/src/modules/challenges/Challenge.ts#L7
class Challenge
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    // Stripped: type, description
    constructor(active = false)
    {
        this.active = function() { return this.__active; }.bind(this);

        this.__active = active;
    }
}
