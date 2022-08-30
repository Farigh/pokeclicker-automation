// Stub of https://github.com/pokeclicker/pokeclicker/blob/80e50ca2e542699bc67a81a4c5356cd470c7260d/src/scripts/pokeballs/Pokeball.ts#L1
class Pokeball
{
    // Skipped: description, unlockRequirement
    constructor(type, catchBonus, catchTime, quantity = 0)
    {
        this.type = type;
        this.catchBonus = catchBonus;
        this.catchTime = catchTime;
        this.quantity = function(){ return this.__quantity; };

        this.__quantity = quantity;
    }
}
