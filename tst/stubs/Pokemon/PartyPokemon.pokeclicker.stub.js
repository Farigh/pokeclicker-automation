// Stub of https://github.com/pokeclicker/pokeclicker/blob/4921661cd9b1635f9fd745aba62102ac3f5786ff/src/scripts/party/PartyPokemon.ts#L20
class PartyPokemon
{
    // Stripped: levelEvolutionTriggered, defaultFemaleSprite, hideShinyImage, showShadowImage, nickname
    constructor(id, name, baseAttack, shiny)
    {
        this.attackBonusPercent = 0;
        this.attackBonusAmount = 0;
        this.category = [0]
        this.breading = false;
        this.baseAttack = baseAttack;
        this.effortPoints = 0;
        this.id = id;
        this.level = 1;
        this.pokerus = GameConstants.Pokerus.Uninfected;
        this.shadow = GameConstants.ShadowStatus.None;
        this.name = name;
        this.shiny = shiny;
        this.proteinsUsed = function() { return this.__proteinsUsed; }.bind(this);
        this.heldItem = function() { return this.__heldItem; }.bind(this);

        this.__proteinsUsed = 0;
        this.__heldItem = undefined;
    }

    calculateAttack(ignoreLevel = false)
    {
        const attackBonusMultiplier = 1 + (this.attackBonusPercent / 100);
        const levelMultiplier = ignoreLevel ? 1 : this.level / 100;
        const evsMultiplier = this.calculateEVAttackBonus();
        const heldItemMultiplier = this.heldItemAttackBonus();
        const shadowMultiplier = this.shadowAttackBonus();
        return Math.max(1, Math.floor((this.baseAttack * attackBonusMultiplier + this.attackBonusAmount) * levelMultiplier * evsMultiplier * heldItemMultiplier * shadowMultiplier));
    }

    clickAttackBonus()
    {
        // Caught + Shiny + Resistant + Purified
        const caughtBonus = 1;
        const shinyBonus = this.shiny ? 1 : 0;
        const resistantBonus = this.pokerus >= GameConstants.Pokerus.Resistant ? 1 : 0;
        const purifiedBonus = this.shadow == GameConstants.ShadowStatus.Purified ? 1 : 0;
        const bonus = caughtBonus + shinyBonus + resistantBonus + purifiedBonus;

        const heldItemMultiplier = this.heldItem() instanceof HybridAttackBonusHeldItem ? this.heldItem().clickAttackBonus : 1;
        return bonus * heldItemMultiplier;
    }

    calculateEVAttackBonus()
    {
        if (this.pokerus < GameConstants.Pokerus.Contagious)
        {
            return 1;
        }
        return (this.evs() < 50) ? (1 + 0.01 * this.evs()) : (1 + Math.min(1, Math.pow((this.evs() - 30), 0.075) - 0.75));
    }

    evs()
    {
        const power = App.game.challenges.list.slowEVs.active() ? GameConstants.EP_CHALLENGE_MODIFIER : 1;
        return Math.floor(this.effortPoints / GameConstants.EP_EV_RATIO / power);
    }

    shadowAttackBonus()
    {
        return this.shadow == GameConstants.ShadowStatus.Shadow ? 0.8 : (this.shadow == GameConstants.ShadowStatus.Purified ? 1.2 : 1);
    }

    heldItemAttackBonus()
    {
        return this.heldItem && this.heldItem() instanceof AttackBonusHeldItem ? this.heldItem().attackBonus : 1;
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    __addCategory(id)
    {
        if (id == 0)
        {
            this.category = [0];
        }
        else if (!this.category.includes(id))
        {
            this.category.push(id);
        }
    }

    __removeCategory(id)
    {
        if ((id == 0) && (this.category.length == 1))
        {
            // Can't remove None category without another category present
            return;
        }

        const index = this.category.indexOf(id);
        if (index > -1)
        {
            this.category.splice(index, 1);
        }
    }
}
