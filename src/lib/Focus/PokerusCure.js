/**
 * @class The AutomationFocusPokerusCure regroups the 'Focus on' button's 'Pokérus cure' functionalities
 */
class AutomationFocusPokerusCure
{
    /******************************************************************************\
    |***    Focus specific members, should only be used by focus sub-classes    ***|
    \******************************************************************************/

    /**
     * @brief Adds the Pokérus cure functionality to the 'Focus on' list
     *
     * @param {Array} functionalitiesList: The list to add the functionality to
     */
    static __registerFunctionalities(functionalitiesList)
    {
        this.__internal__buildPokerusRouteList();

        const isUnlockedCallback = function (){ return App.game.keyItems.hasKeyItem(KeyItemType.Pokerus_virus); };

        functionalitiesList.push(
            {
                id: "PokerusCure",
                name: "Pokérus cure",
                tooltip: "Hunts for pokémons that are infected by the pokérus"
                       + Automation.Menu.TooltipSeparator
                       + "Pokémons get resistant to the pokérus once they reach 50 EV.\n"
                       + "This focus will catch pokémons one route where infected\n"
                       + "pokémons can be caught to increase their EV.",
                run: function (){ this.__internal__start(); }.bind(this),
                stop: function (){ this.__internal__stop(); }.bind(this),
                isUnlocked: isUnlockedCallback,
                refreshRateAsMs: Automation.Focus.__noFunctionalityRefresh
            });
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__pokerusCureLoop = null;
    static __internal__pokerusRouteData = [];
    static __internal__pokeballToRestore = null;

    static __internal__currentRouteData = null;

    /**
     * @brief Starts the achievements automation
     */
    static __internal__start()
    {
        // Set achievement loop
        this.__internal__pokerusCureLoop = setInterval(this.__internal__focusOnPokerusCure.bind(this), 10000); // Runs every 10 seconds
        this.__internal__focusOnPokerusCure();
    }

    /**
     * @brief Stops the achievements automation
     */
    static __internal__stop()
    {
        this.__internal__currentRouteData = null;

        // Unregister the loop
        clearInterval(this.__internal__pokerusCureLoop);
        this.__internal__pokerusCureLoop = null;

        // Restore pokéball used to catch
        if (this.__internal__pokeballToRestore != null)
        {
            App.game.pokeballs.alreadyCaughtContagiousSelection = this.__internal__pokeballToRestore;
            this.__internal__pokeballToRestore = null;
        }
    }

    /**
     * @brief The achievement main loop
     *
     * @note If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     */
    static __internal__focusOnPokerusCure()
    {
        // Already fighting, nothing to do for now
        if (Automation.Utils.isInInstanceState())
        {
            Automation.Focus.__ensureNoInstanceIsInProgress();
            return;
        }

        // Choose a new route, if needed
        if ((this.__internal__currentRouteData == null)
            || !this.__internal__doesAnyPokemonNeedCuring(this.__internal__currentRouteData.route, true))
        {
            this.__internal__setNextPokerusRoute();
        }

        if (this.__internal__currentRouteData == null)
        {
            // No more routes available, stop the focus
            Automation.Menu.forceAutomationState(Automation.Focus.Settings.FeatureEnabled, false);
            Automation.Notifications.sendWarningNotif("No more route available to cure pokémon from pokérus.\nTurning the feature off", "Focus");

            return;
        }

        // Ensure that the player has some balls available
        if (!Automation.Focus.__ensurePlayerHasEnoughBalls(Automation.Focus.__pokeballToUseSelectElem.value))
        {
            // Restore pokéball used to catch
            if (this.__internal__pokeballToRestore != null)
            {
                App.game.pokeballs.alreadyCaughtContagiousSelection = this.__internal__pokeballToRestore;
                this.__internal__pokeballToRestore = null;
            }

            return;
        }

        // Equip the Oak item catch loadout
        Automation.Focus.__equipLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);

        // Equip an "Already caught contagious" pokeball
        this.__internal__pokeballToRestore = App.game.pokeballs.alreadyCaughtContagiousSelection;
        App.game.pokeballs.alreadyCaughtContagiousSelection = Automation.Focus.__pokeballToUseSelectElem.value;

        // Move to the best route
        Automation.Utils.Route.moveToRoute(this.__internal__currentRouteData.route.number, this.__internal__currentRouteData.route.region);
    }

    /**
     * @brief Gets the next route to cure pokémon from pokérus
     */
    static __internal__setNextPokerusRoute()
    {
        // Remove the current route from the list if completed
        if ((this.__internal__currentRouteData != null)
            && !this.__internal__doesAnyPokemonNeedCuring(this.__internal__currentRouteData.route))
        {
            const index = this.__internal__pokerusRouteData.indexOf(this.__internal__currentRouteData);
            this.__internal__pokerusRouteData.splice(index, 1);
        }

        // Set the next best route
        this.__internal__currentRouteData = this.__internal__pokerusRouteData.find(
            (data) => this.__internal__doesAnyPokemonNeedCuring(data.route, true), this);
    }

    /**
     * @brief Builds the internal list of route with at least one infected pokémon
     */
    static __internal__buildPokerusRouteList()
    {
        for (const route of Routes.regionRoutes)
        {
            if (this.__internal__doesAnyPokemonNeedCuring(route))
            {
                this.__internal__pokerusRouteData.push({ route });
            }
        }
    }

    /**
     * @brief Checks if any pokémon from the given @p route needs to be cured
     *
     * @param route: The route to check
     * @param {boolean} onlyConsiderAvailableContagiousPokemons: Whether only currently available and contagious pokémon should be considered
     *
     * @returns True if every pokémons are cured, false otherwise
     */
    static __internal__doesAnyPokemonNeedCuring(route, onlyConsiderAvailableContagiousPokemons = false)
    {
        const pokemonList = onlyConsiderAvailableContagiousPokemons ? RouteHelper.getAvailablePokemonList(route.number, route.region)
                                                                    : this.__internal__getEveryPokemonForRoute(route);

        for (const pokemonName of pokemonList)
        {
            const pokemon = App.game.party.getPokemonByName(pokemonName);

            // A pokémon is a candidate to catch if
            //  - It's not already cured
            //  - It's contagious or we are listing every uncured pokemon
            const isCandidatePokemon = (pokemon?.pokerus != GameConstants.Pokerus.Resistant)
                                    && (!onlyConsiderAvailableContagiousPokemons || (pokemon?.pokerus == GameConstants.Pokerus.Contagious));

            if (isCandidatePokemon)
            {
                return true;
            }
        }

        return false;
    }

    /**
     * @brief Gets the list of possible pokémon for a route, regardless of their conditions
     *
     * @param route: The route to get the pokémon of
     *
     * @returns The list of pokémon
     */
    static __internal__getEveryPokemonForRoute(route)
    {
        // Inspired from https://github.com/pokeclicker/pokeclicker/blob/f7d8db69c219a1a1e47be919f4b9b1f0de8cde9e/src/scripts/wildBattle/RouteHelper.ts#L15-L39

        const possiblePokemons = Routes.getRoute(route.region, route.number)?.pokemon;
        if (!possiblePokemons)
        {
            return ['Rattata'];
        }

        // Land Pokémon
        let pokemonList = possiblePokemons.land;

        // Water Pokémon
        pokemonList = pokemonList.concat(possiblePokemons.water);

        // Headbutt Pokémon
        pokemonList = pokemonList.concat(possiblePokemons.headbutt);

        // Special requirement Pokémon
        pokemonList = pokemonList.concat(...possiblePokemons.special.map(p => p.pokemon));

        // Filter duplicate entries
        pokemonList.filter((item, index) => pokemonList.indexOf(item) === index);

        return pokemonList;
    }
}
