// Stub of https://github.com/pokeclicker/pokeclicker/blob/a457debb0f1b2a7c60f8860fd0a32b6b61500a07/src/modules/routes/RegionRoute.ts#L5
class RegionRoute
{
    // Stripped: requirements, orderNumber, subRegion, ignoreRouteInCalculations, routeHealth
    constructor(routeName, region, number, pokemon)
    {
        this.routeName = routeName;
        this.region = region;
        this.number = number;
        this.pokemon = pokemon;

        this.requirements = [];
    }

    isUnlocked()
    {
        return this.requirements.every((requirement) => requirement.isCompleted());
    }
}
