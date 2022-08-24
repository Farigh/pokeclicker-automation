// Stub of https://github.com/pokeclicker/pokeclicker/blob/5ea24a4270089f28396d6ba69c4c88db44c3accd/src/modules/types/TypeHelper.ts#L4
class TypeHelper
{
    static getAttackModifier(attackerType1, attackerType2, defenderType1, defenderType2)
    {
        if ((attackerType1 === PokemonType.None) || (defenderType1 === PokemonType.None))
        {
            return 1;
        }

        // Apply second type as the first type when None
        attackerType2 = attackerType2 !== PokemonType.None ? attackerType2 : attackerType1;
        defenderType2 = defenderType2 !== PokemonType.None ? defenderType2 : defenderType1;

        let m1 = this.typeMatrix[attackerType1][defenderType1];
        let m2 = this.typeMatrix[attackerType1][defenderType2];
        let m3 = this.typeMatrix[attackerType2][defenderType1];
        let m4 = this.typeMatrix[attackerType2][defenderType2];

        if (!App.game.challenges.list.disableGems.active())
        {
            m1 += (App.game.gems.getGemUpgrade(attackerType1, this.valueToType(m1)) * GameConstants.GEM_UPGRADE_STEP);
            m2 += (App.game.gems.getGemUpgrade(attackerType1, this.valueToType(m2)) * GameConstants.GEM_UPGRADE_STEP);
            m3 += (App.game.gems.getGemUpgrade(attackerType2, this.valueToType(m3)) * GameConstants.GEM_UPGRADE_STEP);
            m4 += (App.game.gems.getGemUpgrade(attackerType2, this.valueToType(m4)) * GameConstants.GEM_UPGRADE_STEP);
        }

        return Math.max(m1 * m2, m3 * m4);
    }

    static valueToType(value)
    {
        switch (value)
        {
            case GameConstants.TypeEffectivenessValue.Immune:
                return GameConstants.TypeEffectiveness.Immune;
            case GameConstants.TypeEffectivenessValue.NotVery:
                return GameConstants.TypeEffectiveness.NotVery;
            case GameConstants.TypeEffectivenessValue.Very:
                return GameConstants.TypeEffectiveness.Very;
            case GameConstants.TypeEffectivenessValue.Neutral:
            default:
                return GameConstants.TypeEffectiveness.Neutral;
        }
    }

    static typeMatrix = (() =>
        {
            const imm = GameConstants.TypeEffectivenessValue.Immune;
            const not = GameConstants.TypeEffectivenessValue.NotVery;
            const neu = GameConstants.TypeEffectivenessValue.Neutral;
            const vry = GameConstants.TypeEffectivenessValue.Very;
            return [
                //                E              F
                //                L              I                   P
                // N              E              G    P    G    F    S                   D
                // O         W    C    G         H    O    R    L    Y              G    R         S    F  <- Defending type
                // R    F    A    T    R         T    I    O    Y    C         R    H    A    D    T    A
                // M    I    T    R    A    I    I    S    U    I    H    B    O    O    G    A    E    I   Attack type
                // A    R    E    I    S    C    N    O    N    N    I    U    C    S    O    R    E    R        |
                // L    E    R    C    S    E    G    N    D    G    C    G    K    T    N    K    L    Y        v
                [neu, neu, neu, neu, neu, neu, neu, neu, neu, neu, neu, neu, not, imm, neu, neu, not, neu], // NORMAL
                [neu, not, not, neu, vry, vry, neu, neu, neu, neu, neu, vry, not, neu, not, neu, vry, neu], // FIRE
                [neu, vry, not, neu, not, neu, neu, neu, vry, neu, neu, neu, vry, neu, not, neu, neu, neu], // WATER
                [neu, neu, vry, not, not, neu, neu, neu, imm, vry, neu, neu, neu, neu, not, neu, neu, neu], // ELECTRIC
                [neu, not, vry, neu, not, neu, neu, not, vry, not, neu, not, vry, neu, not, neu, not, neu], // GRASS
                [neu, not, not, neu, vry, not, neu, neu, vry, vry, neu, neu, neu, neu, vry, neu, not, neu], // ICE
                [vry, neu, neu, neu, neu, vry, neu, not, neu, not, not, not, vry, imm, neu, vry, vry, not], // FIGHTING
                [neu, neu, neu, neu, vry, neu, neu, not, not, neu, neu, neu, not, not, neu, neu, imm, vry], // POISON
                [neu, vry, neu, vry, not, neu, neu, vry, neu, imm, neu, not, vry, neu, neu, neu, vry, neu], // GROUND
                [neu, neu, neu, not, vry, neu, vry, neu, neu, neu, neu, vry, not, neu, neu, neu, not, neu], // FLYING
                [neu, neu, neu, neu, neu, neu, vry, vry, neu, neu, not, neu, neu, neu, neu, imm, not, neu], // PSYCHIC
                [neu, not, neu, neu, vry, neu, not, not, neu, not, vry, neu, neu, not, neu, vry, not, not], // BUG
                [neu, vry, neu, neu, neu, vry, not, neu, not, vry, neu, vry, neu, neu, neu, neu, not, neu], // ROCK
                [imm, neu, neu, neu, neu, neu, neu, neu, neu, neu, vry, neu, neu, vry, neu, not, neu, neu], // GHOST
                [neu, neu, neu, neu, neu, neu, neu, neu, neu, neu, neu, neu, neu, neu, vry, neu, not, imm], // DRAGON
                [neu, neu, neu, neu, neu, neu, not, neu, neu, neu, vry, neu, neu, vry, neu, not, neu, not], // DARK
                [neu, not, not, not, neu, vry, neu, neu, neu, neu, neu, neu, vry, neu, neu, neu, not, vry], // STEEL
                [neu, not, neu, neu, neu, neu, vry, not, neu, neu, neu, neu, neu, neu, vry, vry, not, neu], // FAIRY
            ];
        })();
}
