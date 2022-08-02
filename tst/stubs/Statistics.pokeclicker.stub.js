// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/modules/DataStore/StatisticStore/index.ts#L8
class Statistics
{
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    constructor()
    {
        this.pokemonCaptured = new Object();

        this.__pokemonCapturedCount = new Object();
    }

    /***************************\
    |*   Test-only interface   *|
    \***************************/

    __addPokemon(id)
    {
        this.__pokemonCapturedCount[id] = 0;
        this.pokemonCaptured[id] = function(){ return App.game.statistics.__pokemonCapturedCount[id]; }
    }
}
