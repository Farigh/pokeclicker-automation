// Stub of https://github.com/pokeclicker/pokeclicker/blob/28596f5ffa3005727f2b74017f2c413a5374ab21/src/scripts/worldmap/MapHelper.ts#L15
class MapHelper
{
    static accessToRoute(route, region)
    {
        return this.routeExist(route, region) && Routes.getRoute(region, route).isUnlocked();
    };

    static moveToRoute(route, region)
    {
        if (isNaN(route))
        {
            return;
        }

        const routeData = Routes.getRoute(region, route);

        // Skipped new enemy generation and notifications

        if (this.accessToRoute(route, region))
        {
            player.route = route;
            // Skipped subregion
            if (player.region != region)
            {
                player.region = region;
            }
            // Skipped game state update
        }
    };

    static routeExist(route, region)
    {
        return !!Routes.getRoute(region, route);
    }
}
