// Stub of https://github.com/pokeclicker/pokeclicker/blob/b5807ae2b8b14431e267d90563ae8944272e1679/src/modules/multiplier/Multiplier.ts#L7
class Multiplier
{
    constructor()
    {
        this.__bonus = new Map();

        this.__bonus.set('pokemonAttack', 1);
    }

    getBonus(type, useBonus = false)
    {
        return this.__bonus.get(type);
    }
}
