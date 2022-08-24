// Stub of https://github.com/pokeclicker/pokeclicker/blob/e5fdc5b911cb737b633f855b1e220606238471fa/src/modules/gems/Gems.ts#L19
class Gems
{
    static nTypes = (Object.keys(PokemonType).length / 2) - 1;
    static nEffects = Object.keys(GameConstants.TypeEffectiveness).length / 2;

    constructor()
    {
        this.__gemUpgrades = Array(Gems.nTypes * Gems.nEffects).fill(0);
    }

    getGemUpgrade(typeNum, effectNum)
    {
        return this.__gemUpgrades[typeNum * Gems.nEffects + effectNum];
    }
}
