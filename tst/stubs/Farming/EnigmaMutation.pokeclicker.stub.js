// Stub of https://github.com/pokeclicker/pokeclicker/blob/429140a10e6ebe8293f965e8a47e5348306fedb8/src/scripts/farming/mutation/mutationTypes/EnigmaMutation.ts#L6
class EnigmaMutation
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    constructor()
    {
        this.hintsSeen = [];
        this.__hintsSeen = [];

        this.__initHintSeen();
    }

    static getReqs()
    {
        // Totally arbitrary values
        return [ BerryType.Cheri, BerryType.Chesto, BerryType.Pecha, BerryType.Rawst ];
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    __initHintSeen()
    {
        for (const i of [ 0, 1, 2, 3 ])
        {
            this.__hintsSeen[i] = false;
            this.hintsSeen[i] = function() { return this.__hintsSeen[i]; }.bind(this);
        }
    }
}
