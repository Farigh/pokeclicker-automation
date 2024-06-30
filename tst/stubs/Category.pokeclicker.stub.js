// Stub of https://github.com/pokeclicker/pokeclicker/blob/9828628acc9142075e6108b54b5b992bc2196282/src/modules/party/Category.ts#L19
class PokemonCategories {
    /***************************\
    |*  Pokéclicker interface  *|
    \***************************/

    static __categories = [
                              { id: 0, name: () => 'None', color: () => '#333333' },
                              { id: 1, name: () => 'Favorite', color: () => '#e74c3c' }
                          ];

    static categories()
    {
        return this.__categories
    }
}
