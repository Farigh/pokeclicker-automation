// Stub of https://github.com/pokeclicker/pokeclicker/blob/cbeab9a0e658aa84ee2ba028f6ae83421c92776a/src/scripts/App.ts#L4
class App
{
    static game =
        {
            breeding: new Breeding(),
            challenges: new Challenges(),
            discord: new Discord(),
            farming: new Farming(),
            gameState: GameConstants.GameState.town,
            gems: new Gems(),
            oakItems: new OakItems(),
            party: new Party(),
            statistics: new Statistics(),
            wallet: new Wallet()
        };
}
