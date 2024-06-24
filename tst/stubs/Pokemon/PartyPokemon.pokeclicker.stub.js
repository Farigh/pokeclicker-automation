// Stub of : https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/party/PartyPokemon.ts#L16
class PartyPokemon
{
    // Stripped: evolutions
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
        this.name = name;
        this.shiny = shiny;
        this.proteinsUsed = function() { return this.__proteinsUsed; }.bind(this);

        this.__proteinsUsed = 0;
    }

    calculateAttack(ignoreLevel = false)
    {
        const attackBonusMultiplier = 1 + (this.attackBonusPercent / 100);
        const levelMultiplier = ignoreLevel ? 1 : this.level / 100;
        const evsMultiplier = this.calculateEVAttackBonus();
        return Math.max(1, Math.floor((this.baseAttack * attackBonusMultiplier + this.attackBonusAmount) * levelMultiplier * evsMultiplier));
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
