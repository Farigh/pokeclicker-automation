// Stub of https://github.com/pokeclicker/pokeclicker/blob/80e50ca2e542699bc67a81a4c5356cd470c7260d/src/scripts/pokeballs/Pokeballs.ts#L4
class Pokeballs
{
    constructor()
    {
        this.pokeballs =
            [
                new Pokeball(GameConstants.Pokeball.Pokeball, () => 0, 1250),
                new Pokeball(GameConstants.Pokeball.Greatball, () => 5, 1000),
                new Pokeball(GameConstants.Pokeball.Ultraball, () => 10, 750)
            ];
    }

    calculateCatchTime(ball)
    {
        return this.pokeballs[ball].catchTime;
    }

    getCatchBonus(ball)
    {
        return this.pokeballs[ball].catchBonus();
    }
}
