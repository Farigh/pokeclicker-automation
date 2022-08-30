// Stub of https://github.com/pokeclicker/pokeclicker/blob/26fe119da094d14cb263c229549d9aeb2e6180bb/src/scripts/pokemons/PokemonFactory.ts#L4
class PokemonFactory
{
    static catchRateHelper(baseCatchRate, noVariation = false)
    {
        const catchVariation = noVariation ? 0 : Rand.intBetween(-3, 3);
        const catchRateRaw = Math.floor(Math.pow(baseCatchRate, 0.75)) + catchVariation;
        return GameConstants.clipNumber(catchRateRaw, 0, 100);
    }

    static routeHealth(route, region)
    {
        const regionRoute = Routes.regionRoutes.find((routeData) => routeData.region === region && routeData.number === route);
        if (regionRoute?.routeHealth)
        {
            return regionRoute.routeHealth;
        }
        route = Routes.normalizedNumber(route, region);
        const health = Math.max(20, Math.floor(Math.pow((100 * Math.pow(route, 2.2) / 12), 1.15) * (1 + region / 20))) || 20;
        return health;
    }

    static routeDungeonTokens(route, region)
    {
        route = Routes.normalizedNumber(route, region);

        const tokens = Math.max(1, 6 * Math.pow(route * 2 / (2.8 / (1 + region / 3)), 1.08));

        return tokens;
    }
}
