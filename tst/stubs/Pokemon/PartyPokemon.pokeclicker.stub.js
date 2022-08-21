// Stub of : https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/party/PartyPokemon.ts#L16
class PartyPokemon
{
    // Stripped: evolutions
    constructor(id, name, baseAttack, shiny)
    {
        this.breading = false;
        this.baseAttack = baseAttack;
        this.id = id;
        this.level = 1;
        this.pokerus = GameConstants.Pokerus.Uninfected;
        this.name = name;
        this.shiny = shiny;
        this.proteinsUsed = function() { return this.__proteinsUsed; }.bind(this);

        this.__proteinsUsed = 0;
    }
}
