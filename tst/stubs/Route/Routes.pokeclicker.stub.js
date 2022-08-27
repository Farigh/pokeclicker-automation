// Stub of https://github.com/pokeclicker/pokeclicker/blob/f2f9a9b1a1539cf46089e929e5d73d50f4793614/src/modules/routes/Routes.ts#L4
class Routes
{
    static regionRoutes = [];

    static add(route)
    {
        this.regionRoutes.push(route);

        // Skipped sorting
    }

    static getRoute(region, route)
    {
        return this.regionRoutes.find((routeData) => (routeData.region === region) && (routeData.number === route));
    }

    static normalizedNumber(route, region, skipIgnoredRoutes = true)
    {
        if (region === GameConstants.Region.none)
        {
            return route;
        }

        // Skipped ignoreRouteInCalculations

        return this.regionRoutes.findIndex((routeData) => routeData.region === region && routeData.number === route) + 1;
    }
}

// From https://github.com/pokeclicker/pokeclicker/blob/9fa699797f3d10df117db08ececfcb7c3f5ebebe/src/scripts/wildBattle/RouteData.ts
Routes.add(new RegionRoute(
    'Kanto Route 1', GameConstants.Region.kanto, 1,
    new RoutePokemon({
        land: ['Pidgey', 'Rattata'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 22', GameConstants.Region.kanto, 22,
    new RoutePokemon({
        land: ['Rattata', 'Spearow', 'Mankey'],
        water: ['Psyduck', 'Poliwag', 'Slowpoke', 'Goldeen', 'Magikarp'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 2', GameConstants.Region.kanto, 2,
    new RoutePokemon({
        land: ['Pidgey', 'Rattata', 'Caterpie', 'Weedle'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 3', GameConstants.Region.kanto, 3,
    new RoutePokemon({
        land: ['Pidgey', 'Spearow', 'Nidoran(F)', 'Nidoran(M)', 'Jigglypuff', 'Mankey'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 4', GameConstants.Region.kanto, 4,
    new RoutePokemon({
        land: ['Rattata', 'Spearow', 'Ekans', 'Sandshrew', 'Mankey'],
        water: ['Tentacool', 'Krabby', 'Horsea', 'Magikarp'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 24', GameConstants.Region.kanto, 24,
    new RoutePokemon({
        land: ['Caterpie', 'Metapod', 'Weedle', 'Kakuna', 'Pidgey', 'Oddish', 'Abra', 'Bellsprout'],
        water: ['Tentacool', 'Krabby', 'Horsea', 'Magikarp'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 25', GameConstants.Region.kanto, 25,
    new RoutePokemon({
        land: ['Caterpie', 'Metapod', 'Weedle', 'Kakuna', 'Pidgey', 'Oddish', 'Abra', 'Bellsprout'],
        water: ['Psyduck', 'Poliwag', 'Tentacool', 'Slowpoke', 'Goldeen', 'Magikarp'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 5', GameConstants.Region.kanto, 5,
    new RoutePokemon({
        land: ['Pidgey', 'Meowth', 'Oddish', 'Bellsprout'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 6', GameConstants.Region.kanto, 6,
    new RoutePokemon({
        land: ['Pidgey', 'Meowth', 'Oddish', 'Bellsprout'],
        water: ['Psyduck', 'Poliwag', 'Slowpoke', 'Goldeen', 'Magikarp'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 11', GameConstants.Region.kanto, 11,
    new RoutePokemon({
        land: ['Spearow', 'Ekans', 'Sandshrew', 'Drowzee'],
        water: ['Tentacool', 'Krabby', 'Horsea', 'Magikarp'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 9', GameConstants.Region.kanto, 9,
    new RoutePokemon({
        land: ['Rattata', 'Spearow', 'Ekans', 'Sandshrew'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 10', GameConstants.Region.kanto, 10,
    new RoutePokemon({
        land: ['Spearow', 'Ekans', 'Sandshrew', 'Voltorb'],
        water: ['Tentacool', 'Krabby', 'Horsea', 'Magikarp'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 8', GameConstants.Region.kanto, 8,
    new RoutePokemon({
        land: ['Pidgey', 'Ekans', 'Sandshrew', 'Vulpix', 'Meowth', 'Growlithe'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 7', GameConstants.Region.kanto, 7,
    new RoutePokemon({
        land: ['Pidgey', 'Vulpix', 'Oddish', 'Meowth', 'Growlithe', 'Bellsprout'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 12', GameConstants.Region.kanto, 12,
    new RoutePokemon({
        land: ['Pidgey', 'Oddish', 'Gloom', 'Venonat', 'Bellsprout', 'Weepinbell', 'Farfetch\'d', 'Snorlax'],
        water: ['Poliwag', 'Slowpoke', 'Slowbro', 'Goldeen', 'Magikarp'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 13', GameConstants.Region.kanto, 13,
    new RoutePokemon({
        land: ['Pidgey', 'Pidgeotto', 'Oddish', 'Gloom', 'Venonat', 'Bellsprout', 'Weepinbell', 'Farfetch\'d', 'Ditto'],
        water: ['Tentacool', 'Krabby', 'Horsea', 'Magikarp'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 14', GameConstants.Region.kanto, 14,
    new RoutePokemon({
        land: ['Pidgey', 'Pidgeotto', 'Oddish', 'Gloom', 'Venonat', 'Bellsprout', 'Weepinbell', 'Ditto'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 15', GameConstants.Region.kanto, 15,
    new RoutePokemon({
        land: ['Pidgey', 'Pidgeotto', 'Oddish', 'Gloom', 'Venonat', 'Bellsprout', 'Weepinbell', 'Ditto'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 16', GameConstants.Region.kanto, 16,
    new RoutePokemon({
        land: ['Rattata', 'Raticate', 'Spearow', 'Doduo', 'Snorlax'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 17', GameConstants.Region.kanto, 17,
    new RoutePokemon({
        land: ['Rattata', 'Raticate', 'Spearow', 'Fearow', 'Doduo'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 18', GameConstants.Region.kanto, 18,
    new RoutePokemon({
        land: ['Rattata', 'Raticate', 'Spearow', 'Fearow', 'Doduo'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 19', GameConstants.Region.kanto, 19,
    new RoutePokemon({
        water: ['Tentacool', 'Krabby', 'Horsea', 'Magikarp'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 20', GameConstants.Region.kanto, 20,
    new RoutePokemon({
        water: ['Tentacool', 'Krabby', 'Horsea', 'Shellder', 'Staryu', 'Magikarp'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 21', GameConstants.Region.kanto, 21,
    new RoutePokemon({
        land: ['Tangela'],
        water: ['Tentacool', 'Krabby', 'Horsea', 'Shellder', 'Staryu', 'Magikarp'],
    })
));
Routes.add(new RegionRoute(
    'Kanto Route 23', GameConstants.Region.kanto, 23,
    new RoutePokemon({
        land: ['Spearow', 'Fearow', 'Ekans', 'Arbok', 'Sandshrew', 'Sandslash', 'Mankey', 'Primeape'],
        water: ['Psyduck', 'Poliwag', 'Slowpoke', 'Goldeen', 'Magikarp'],
    })
));

/*
JOHTO
*/
Routes.add(new RegionRoute(
    'Johto Route 29', GameConstants.Region.johto, 29,
    new RoutePokemon({
        land: ['Pidgey', 'Rattata', 'Sentret', 'Hoothoot'],
        headbutt: ['Exeggcute', 'Ledyba', 'Spinarak', 'Hoothoot', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 30', GameConstants.Region.johto, 30,
    new RoutePokemon({
        land: ['Pidgey', 'Rattata', 'Caterpie', 'Metapod', 'Weedle', 'Kakuna', 'Zubat', 'Hoothoot', 'Ledyba', 'Spinarak'],
        water: ['Poliwag', 'Poliwhirl', 'Magikarp'],
        headbutt: ['Exeggcute', 'Hoothoot', 'Ledyba', 'Spinarak', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 31', GameConstants.Region.johto, 31,
    new RoutePokemon({
        land: ['Pidgey', 'Rattata', 'Caterpie', 'Metapod', 'Weedle', 'Kakuna', 'Zubat', 'Poliwag', 'Hoothoot', 'Ledyba', 'Spinarak', 'Bellsprout'],
        water: ['Poliwag', 'Poliwhirl', 'Magikarp'],
        headbutt: ['Spearow', 'Exeggcute', 'Hoothoot', 'Ledyba', 'Spinarak', 'Aipom', 'Pineco', 'Heracross'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 32', GameConstants.Region.johto, 32,
    new RoutePokemon({
        land: ['Rattata', 'Ekans', 'Zubat', 'Bellsprout', 'Mareep', 'Hoppip', 'Wooper'],
        water: ['Tentacool', 'Tentacruel', 'Quagsire', 'Magikarp', 'Qwilfish'],
        headbutt: ['Exeggcute', 'Hoothoot', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 33', GameConstants.Region.johto, 33,
    new RoutePokemon({
        land: ['Spearow', 'Rattata', 'Ekans', 'Zubat', 'Hoppip'],
        headbutt: ['Spearow', 'Aipom', 'Heracross'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 34', GameConstants.Region.johto, 34,
    new RoutePokemon({
        land: ['Rattata', 'Abra', 'Drowzee', 'Ditto'],
        water: ['Tentacool', 'Tentacruel', 'Krabby', 'Magikarp', 'Staryu', 'Corsola', 'Kingler'],
        headbutt: ['Exeggcute', 'Hoothoot', 'Ledyba', 'Spinarak', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 35', GameConstants.Region.johto, 35,
    new RoutePokemon({
        land: ['Pidgey', 'Nidoran(F)', 'Nidoran(M)', 'Abra', 'Drowzee', 'Ditto', 'Hoothoot', 'Yanma'],
        water: ['Psyduck', 'Golduck', 'Poliwag', 'Magikarp'],
        headbutt: ['Exeggcute', 'Hoothoot', 'Ledyba', 'Spinarak', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 36', GameConstants.Region.johto, 36,
    new RoutePokemon({
        land: ['Pidgey', 'Nidoran(M)', 'Nidoran(F)', 'Vulpix', 'Growlithe', 'Hoothoot', 'Stantler', 'Sudowoodo'],
        headbutt: ['Exeggcute', 'Hoothoot', 'Ledyba', 'Spinarak', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 37', GameConstants.Region.johto, 37,
    new RoutePokemon({
        land: ['Pidgey', 'Pidgeotto', 'Vulpix', 'Growlithe', 'Hoothoot', 'Ledyba', 'Spinarak', 'Stantler'],
        headbutt: ['Exeggcute', 'Hoothoot', 'Ledyba', 'Spinarak', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 38', GameConstants.Region.johto, 38,
    new RoutePokemon({
        land: ['Rattata', 'Raticate', 'Meowth', 'Magnemite', 'Farfetch\'d', 'Tauros', 'Snubbull', 'Miltank'],
        headbutt: ['Exeggcute', 'Hoothoot', 'Ledyba', 'Spinarak', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 39', GameConstants.Region.johto, 39,
    new RoutePokemon({
        land: ['Rattata', 'Raticate', 'Meowth', 'Magnemite', 'Farfetch\'d', 'Tauros', 'Miltank'],
        headbutt: ['Exeggcute', 'Hoothoot', 'Ledyba', 'Spinarak', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 40', GameConstants.Region.johto, 40,
    new RoutePokemon({
        water: ['Tentacool', 'Tentacruel', 'Krabby', 'Magikarp', 'Staryu', 'Corsola', 'Kingler'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 41', GameConstants.Region.johto, 41,
    new RoutePokemon({
        water: ['Tentacool', 'Tentacruel', 'Mantine', 'Magikarp', 'Chinchou', 'Shellder'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 42', GameConstants.Region.johto, 42,
    new RoutePokemon({
        land: ['Spearow', 'Zubat', 'Mankey', 'Mareep', 'Flaaffy'],
        water: ['Goldeen', 'Seaking', 'Magikarp'],
        headbutt: ['Spearow', 'Aipom', 'Heracross'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 43', GameConstants.Region.johto, 43,
    new RoutePokemon({
        land: ['Pidgeotto', 'Venonat', 'Noctowl', 'Mareep', 'Flaaffy', 'Girafarig'],
        water: ['Magikarp', 'Poliwag'],
        headbutt: ['Venonat', 'Exeggcute', 'Hoothoot', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 44', GameConstants.Region.johto, 44,
    new RoutePokemon({
        land: ['Bellsprout', 'Weepinbell', 'Lickitung', 'Tangela'],
        water: ['Poliwag', 'Poliwhirl', 'Magikarp', 'Remoraid'],
        headbutt: ['Spearow', 'Aipom', 'Heracross'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 45', GameConstants.Region.johto, 45,
    new RoutePokemon({
        land: ['Geodude', 'Graveler', 'Gligar', 'Teddiursa', 'Skarmory', 'Phanpy'],
        water: ['Magikarp', 'Poliwag', 'Dratini'],
        headbutt: ['Spearow', 'Aipom', 'Heracross'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 46', GameConstants.Region.johto, 46,
    new RoutePokemon({
        land: ['Spearow', 'Rattata', 'Geodude'],
        headbutt: ['Spearow', 'Aipom', 'Heracross'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 47', GameConstants.Region.johto, 47,
    new RoutePokemon({
        land: ['Raticate', 'Spearow', 'Fearow', 'Gloom', 'Farfetch\'d', 'Ditto', 'Noctowl', 'Miltank'],
        water: ['Tentacool', 'Seel', 'Staryu', 'Magikarp', 'Shellder', 'Chinchou', 'Lanturn'],
        headbutt: ['Metapod', 'Butterfree', 'Kakuna', 'Beedrill', 'Exeggcute', 'Hoothoot', 'Ledyba', 'Spinarak', 'Pineco', 'Heracross'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 48', GameConstants.Region.johto, 48,
    new RoutePokemon({
        land: ['Fearow', 'Vulpix', 'Gloom', 'Diglett', 'Growlithe', 'Farfetch\'d', 'Tauros', 'Hoppip', 'Girafarig'],
        headbutt: ['Exeggcute', 'Hoothoot', 'Ledyba', 'Spinarak', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 26', GameConstants.Region.johto, 26,
    new RoutePokemon({
        land: ['Raticate', 'Arbok', 'Sandslash', 'Ponyta', 'Doduo', 'Dodrio', 'Quagsire'],
        water: ['Tentacool', 'Tentacruel', 'Magikarp', 'Shellder', 'Chinchou', 'Lanturn'],
        headbutt: ['Exeggcute', 'Hoothoot', 'Ledyba', 'Spinarak', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 27', GameConstants.Region.johto, 27,
    new RoutePokemon({
        land: ['Raticate', 'Arbok', 'Sandslash', 'Ponyta', 'Doduo', 'Dodrio', 'Quagsire'],
        water: ['Tentacool', 'Tentacruel', 'Magikarp', 'Shellder', 'Chinchou', 'Lanturn'],
        headbutt: ['Exeggcute', 'Hoothoot', 'Ledyba', 'Spinarak', 'Pineco'],
    })
));
Routes.add(new RegionRoute(
    'Johto Route 28', GameConstants.Region.johto, 28,
    new RoutePokemon({
        land: ['Ponyta', 'Tangela', 'Donphan', 'Ursaring', 'Rapidash', 'Doduo', 'Dodrio', 'Sneasel', 'Murkrow'],
        water: ['Poliwag', 'Poliwhirl', 'Magikarp'],
        headbutt: ['Natu', 'Aipom', 'Heracross'],
    })
));
