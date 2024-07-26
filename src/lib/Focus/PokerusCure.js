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
        this.__internal__buildPokerusDungeonList();

        const isUnlockedCallback = function() { return App.game.keyItems.hasKeyItem(KeyItemType.Pokerus_virus); };

        functionalitiesList.push(
            {
                id: "PokerusCure",
                name: "Pokérus cure",
                tooltip: "Hunts for pokémons that are infected by the pokérus"
                       + Automation.Menu.TooltipSeparator
                       + "Pokémons get resistant to the pokérus once they reach 50 EVs.\n"
                       + "This focus will catch pokémons on routes and dungeons where infected\n"
                       + "pokémons can be caught, to increase their EV.",
                run: function() { this.__internal__start(); }.bind(this),
                stop: function() { this.__internal__stop(); }.bind(this),
                isUnlocked: isUnlockedCallback,
                refreshRateAsMs: Automation.Focus.__noFunctionalityRefresh
            });
    }

    /**
     * @brief Builds the 'Focus on Pokérus Cure' advanced settings tab
     *
     * @param {Element} parent: The parent div to add the settings to
     */
    static __buildAdvancedSettings(parent)
    {
        // Disable Beastball usage by default
        Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.AllowBeastBallUsage, false);

        // Disable Alternate forms skipping by default
        Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.SkipAlternateForms, false);

        // Beastball usage setting
        const tooltip = "Allows the automation to use Beastball to catch UltraBeast pokémons."
                      + Automation.Menu.TooltipSeparator
                      + "If this option is disabled, or you don't have Beastballs,\n"
                      + "UltraBeast pokémons will be ignored.";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Use Beastballs to catch UltraBeast pokémons",
                                                               this.__internal__advancedSettings.AllowBeastBallUsage,
                                                               tooltip,
                                                               parent);

        // Alternate forms skipping setting
        const alternateTooltip = "If enabled, only pokémon's base form will be considered";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton("Skip Alternate form pokémons",
                                                               this.__internal__advancedSettings.SkipAlternateForms,
                                                               alternateTooltip,
                                                               parent);
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__advancedSettings = {
                                              AllowBeastBallUsage: "Focus-PokerusCure-AllowBeastBallUsage",
                                              SkipAlternateForms: "Focus-PokerusCure-SkipAlternateForms"
                                          };

    static __internal__pokerusCureLoop = null;
    static __internal__pokerusRouteData = [];
    static __internal__pokerusDungeonData = [];

    static __internal__currentRouteData = null;
    static __internal__currentDungeonData = null;

    /**
     * @brief Starts the pokérus cure automation
     */
    static __internal__start()
    {
        // Disable other modes button
        const disableReason = "The 'Focus on Pokérus cure' feature is enabled";
        Automation.Menu.setButtonDisabledState(Automation.Click.Settings.FeatureEnabled, true, disableReason);

        // Force enable other modes
        Automation.Click.toggleAutoClick(true);

        // Set pokérus cure loop
        this.__internal__pokerusCureLoop = setInterval(this.__internal__focusOnPokerusCure.bind(this), 10000); // Runs every 10 seconds
        this.__internal__focusOnPokerusCure();
    }

    /**
     * @brief Stops the pokérus cure automation
     */
    static __internal__stop()
    {
        this.__internal__currentRouteData = null;
        this.__internal__currentDungeonData = null;

        // Unregister the loop
        clearInterval(this.__internal__pokerusCureLoop);
        this.__internal__pokerusCureLoop = null;

        // Disable automation catch filter
        Automation.Utils.Pokeball.disableAutomationFilter();

        // Reset other modes status
        Automation.Click.toggleAutoClick();

        // Re-enable other modes button
        Automation.Menu.setButtonDisabledState(Automation.Click.Settings.FeatureEnabled, false);
    }

    /**
     * @brief The pokérus cure main loop
     *
     * @note If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     */
    static __internal__focusOnPokerusCure()
    {
        // Already fighting, nothing to do for now
        if (Automation.Utils.isInInstanceState())
        {
            if ((this.__internal__currentDungeonData == null)
                || !this.__internal__doesDungeonHaveAnyPokemonNeedingCure(this.__internal__currentDungeonData.dungeon, true))
            {
                Automation.Focus.__ensureNoInstanceIsInProgress();
            }
            return;
        }

        // If the currently used route still has contagious pokémons, continue with it
        if ((this.__internal__currentRouteData != null)
            && this.__internal__doesRouteHaveAnyPokemonNeedingCure(this.__internal__currentRouteData.route, true))
        {
            this.__internal__captureInfectedPokemons();
            return;
        }

        // If the currently used dungeon still has contagious pokémons, continue with it
        if ((this.__internal__currentDungeonData != null)
            && this.__internal__doesDungeonHaveAnyPokemonNeedingCure(this.__internal__currentDungeonData.dungeon, true))
        {
            this.__internal__captureInfectedPokemons();
            return;
        }

        // Try the next route
        this.__internal__setNextPokerusRoute();

        // Or the next dungeon
        if (this.__internal__currentRouteData == null)
        {
            this.__internal__setNextPokerusDungeon();
        }

        if ((this.__internal__currentRouteData != null) || (this.__internal__currentDungeonData != null))
        {
            this.__internal__captureInfectedPokemons();
        }
        else
        {
            // No more location available, stop the focus
            Automation.Menu.forceAutomationState(Automation.Focus.Settings.FeatureEnabled, false);
            Automation.Notifications.sendWarningNotif("No more route, nor dungeon, available to cure pokémon from pokérus.\nTurning the feature off",
                                                      "Focus");
        }
    }

    /**
     * @brief Goes to the selected location to catch pokémons
     */
    static __internal__captureInfectedPokemons()
    {
        // Equip the Oak item catch loadout
        Automation.Focus.__equipLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);

        // Ensure that the player has some balls available
        if (!Automation.Focus.__ensurePlayerHasEnoughBalls(Automation.Focus.__pokeballToUseSelectElem.value))
        {
            Automation.Utils.Pokeball.disableAutomationFilter();
            return;
        }

        // Go farm some dungeon token if needed
        if ((this.__internal__currentDungeonData != null)
            && App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() < this.__internal__currentDungeonData.dungeon.tokenCost)
        {
            Automation.Utils.Pokeball.disableAutomationFilter();
            Automation.Focus.__goToBestRouteForDungeonToken();
            return;
        }

        const currentLocationData = (this.__internal__currentRouteData != null) ? this.__internal__currentRouteData
                                                                                : this.__internal__currentDungeonData;

        // Equip an "Already caught contagious" pokeball
        const pokeballToUse = (currentLocationData.needsBeastBall) ? GameConstants.Pokeball.Beastball
                                                                   : Automation.Focus.__pokeballToUseSelectElem.value;

        Automation.Utils.Pokeball.onlyCatchContagiousWith(pokeballToUse);

        if (this.__internal__currentRouteData)
        {
            // Move to the selected route
            Automation.Utils.Route.moveToRoute(this.__internal__currentRouteData.route.number, this.__internal__currentRouteData.route.region);
        }
        else
        {
            // Move to dungeon if needed
            if (!Automation.Utils.Route.isPlayerInTown(this.__internal__currentDungeonData.dungeon.name))
            {
                Automation.Utils.Route.moveToTown(this.__internal__currentDungeonData.dungeon.name);

                // Let a second for the menu to show up
                setTimeout(this.__internal__captureInfectedPokemons.bind(this), 1000);
                return;
            }

            // Enable auto dungeon fight
            Automation.Menu.forceAutomationState(Automation.Dungeon.Settings.FeatureEnabled, true);

            // Only force pokemon fights if one of those needs curing
            if (this.__internal__doesAnyPokemonNeedCuring(this.__internal__currentDungeonData.nonBossPokemons, true))
            {
                // Bypass user settings, especially the 'Skip fights' one
                Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.ForcePokemonFight;
            }
            else
            {
                // Go straight to the boss if every other pokemons have been cured
                Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.ForceDungeonCompletion;
            }
        }
    }

    /**
     * @brief Gets the next route to cure pokémon from pokérus
     */
    static __internal__setNextPokerusRoute()
    {
        // Remove the current route from the list if completed
        if ((this.__internal__currentRouteData != null)
            && !this.__internal__doesRouteHaveAnyPokemonNeedingCure(this.__internal__currentRouteData.route))
        {
            const index = this.__internal__pokerusRouteData.indexOf(this.__internal__currentRouteData);
            this.__internal__pokerusRouteData.splice(index, 1);
        }

        // Set the next best route
        this.__internal__currentRouteData = this.__internal__pokerusRouteData.find(
            (data) => this.__internal__doesRouteHaveAnyPokemonNeedingCure(data.route, true)
                      // Don't consider route that the player can't access yet
                   && (Automation.Utils.Route.canMoveToRoute(data.route.number, data.route.region, data.route)), this);

        // Determine if the beast ball is the only catching option
        if (this.__internal__currentRouteData)
        {
            this.__internal__currentRouteData.needsBeastBall = this.__internal__doesRouteNeedBeastBalls(this.__internal__currentRouteData.route);
        }
    }

    /**
     * @brief Gets the next dungeon to cure pokémon from pokérus
     */
    static __internal__setNextPokerusDungeon()
    {
        // Remove the current dungeon from the list if completed
        if ((this.__internal__currentDungeonData != null)
            && !this.__internal__doesDungeonHaveAnyPokemonNeedingCure(this.__internal__currentDungeonData.dungeon))
        {
            const index = this.__internal__pokerusDungeonData.indexOf(this.__internal__currentDungeonData);
            this.__internal__pokerusDungeonData.splice(index, 1);
        }

        // Set the next best dungeon
        this.__internal__currentDungeonData = this.__internal__pokerusDungeonData.find(
            (data) => this.__internal__doesDungeonHaveAnyPokemonNeedingCure(data.dungeon, true)
                      // Don't consider dungeon that the player can't access yet
                   && Automation.Utils.Route.canMoveToTown(TownList[data.dungeon.name]), this);

        if (this.__internal__currentDungeonData)
        {
            // Save current instance non-boss pokémons for dungeon strategy optimisation
            this.__internal__currentDungeonData.nonBossPokemons =
                this.__internal__getEveryPokemonForDungeon(this.__internal__currentDungeonData.dungeon, false, true);

            // Determine if the beast ball is the only catching option
            this.__internal__currentDungeonData.needsBeastBall =
                this.__internal__doesDungeonNeedBeastBalls(this.__internal__currentDungeonData.dungeon);
        }
    }

    /**
     * @brief Builds the internal list of route with at least one infected pokémon
     */
    static __internal__buildPokerusRouteList()
    {
        for (const route of Routes.regionRoutes)
        {
            // Don't add routes that are not yet available to the player, nor ones that are already cured
            if ((route.region <= GameConstants.MAX_AVAILABLE_REGION)
                && this.__internal__doesRouteHaveAnyPokemonNeedingCure(route))
            {
                this.__internal__pokerusRouteData.push({ route });
            }
        }

        // Put Magikarp jump last
        this.__internal__pokerusRouteData.sort((routeA, routeB) =>
            {
                const isAmagikarp = Automation.Utils.Route.isInMagikarpJumpIsland(routeA.route.region, routeA.route.subRegion);
                const isBmagikarp = Automation.Utils.Route.isInMagikarpJumpIsland(routeB.route.region, routeB.route.subRegion);

                if (isAmagikarp && !isBmagikarp) return 1;
                if (isBmagikarp && !isAmagikarp) return -1;

                return 0;
            });
    }

    /**
     * @brief Builds the internal list of dungeon with at least one infected pokémon
     */
    static __internal__buildPokerusDungeonList()
    {
        for (const dungeonName of Object.keys(dungeonList))
        {
            const town = TownList[dungeonName];

            // Don't add dungeons that are not yet available to the player
            if (town.region > GameConstants.MAX_AVAILABLE_REGION)
            {
                continue;
            }

            const dungeon = dungeonList[dungeonName];
            // Don't add dungeons that are already cured
            if (this.__internal__doesDungeonHaveAnyPokemonNeedingCure(dungeon))
            {
                this.__internal__pokerusDungeonData.push({ dungeon });
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
    static __internal__doesRouteHaveAnyPokemonNeedingCure(route, onlyConsiderAvailableContagiousPokemons = false)
    {
        const pokemonList = this.__internal__getEveryPokemonForRoute(route, onlyConsiderAvailableContagiousPokemons);

        return this.__internal__doesAnyPokemonNeedCuring(pokemonList, onlyConsiderAvailableContagiousPokemons);
    }

    /**
     * @brief Checks if any pokémon from the given @p dungeon needs to be cured
     *
     * @param dungeon: The dungeon to check
     * @param {boolean} onlyConsiderAvailableContagiousPokemons: Whether only currently available and contagious pokémon should be considered
     *
     * @returns True if every pokémons are cured, false otherwise
     */
    static __internal__doesDungeonHaveAnyPokemonNeedingCure(dungeon, onlyConsiderAvailableContagiousPokemons = false)
    {
        const pokemonList = this.__internal__getEveryPokemonForDungeon(dungeon, onlyConsiderAvailableContagiousPokemons);

        return this.__internal__doesAnyPokemonNeedCuring(pokemonList, onlyConsiderAvailableContagiousPokemons);
    }

    /**
     * @brief Checks if any pokémon from the given @p pokemonList needs to be cured
     *
     * @param {Array} pokemonList: The list to check
     * @param {boolean} onlyConsiderAvailableContagiousPokemons: Whether only currently available and contagious pokémon should be considered
     *
     * @returns True if every pokémons are cured, false otherwise
     */
    static __internal__doesAnyPokemonNeedCuring(pokemonList, onlyConsiderAvailableContagiousPokemons)
    {
        // Skip UltraBeast pokémons if the player disabled the feature or there is no Beastball left
        const skipUltraBeasts = (Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.AllowBeastBallUsage) == "false")
                             || (App.game.pokeballs.getBallQuantity(GameConstants.Pokeball.Beastball) === 0);

        return pokemonList.some((pokemonName) =>
            {
                const pokemon = App.game.party.getPokemonByName(pokemonName);

                if (onlyConsiderAvailableContagiousPokemons && skipUltraBeasts && (GameConstants.UltraBeastType[pokemonName] != undefined))
                {
                    return false;
                }

                // A pokémon is a candidate to catch if
                //  - It's not already cured
                //  - It's contagious or we are listing every uncured pokemon
                return (pokemon?.pokerus != GameConstants.Pokerus.Resistant)
                    && (!onlyConsiderAvailableContagiousPokemons || (pokemon?.pokerus == GameConstants.Pokerus.Contagious))
            });
    }

    /**
     * @brief Determines if the given @p route only contains contagious UltraBeasts.
     *        In such case the beast ball is the only possible pokeball to catch them.
     *
     * @param route: The route to check
     *
     * @returns True if the route only contains contagious UltraBeasts, false otherwise.
     */
    static __internal__doesRouteNeedBeastBalls(route)
    {
        return this.__internal__getEveryPokemonForRoute(route, true).every((pokemonName) =>
            {
                const pokemon = App.game.party.getPokemonByName(pokemonName);
                return (pokemon?.pokerus != GameConstants.Pokerus.Contagious)
                    || (GameConstants.UltraBeastType[pokemonName] != undefined)
            });
    }

    /**
     * @brief Determines if the given @p dungeon only contains contagious UltraBeasts.
     *        In such case the beast ball is the only possible pokeball to catch them.
     *
     * @param dungeon: The dungeon to check
     *
     * @returns True if the dungeon only contains contagious UltraBeasts, false otherwise.
     */
    static __internal__doesDungeonNeedBeastBalls(dungeon)
    {
        const pokemonList = this.__internal__getEveryPokemonForDungeon(dungeon, true);
        return pokemonList.every((pokemonName) =>
            {
                const pokemon = App.game.party.getPokemonByName(pokemonName);
                return (pokemon?.pokerus != GameConstants.Pokerus.Contagious)
                    || (GameConstants.UltraBeastType[pokemonName] != undefined)
            });
    }

    /**
     * @brief Gets the list of possible pokémon for the given @p route
     *
     * @param route: The route to get the pokémon of
     * @param {boolean} onlyConsiderAvailablePokemons: Whether only currently available pokémon should be considered
     *
     * @note We can't use RouteHelper.getAvailablePokemonList even when getting only available pokemon,
     *       since it consider the current player's location for weather conditions
     *
     * @returns The list of pokémon
     */
    static __internal__getEveryPokemonForRoute(route, onlyConsiderAvailablePokemons)
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
        if (!onlyConsiderAvailablePokemons || ((pokemonList.length == 0) || App.game.keyItems.hasKeyItem(KeyItemType.Super_rod)))
        {
            pokemonList = pokemonList.concat(possiblePokemons.water);
        }

        // Headbutt Pokémon
        pokemonList = pokemonList.concat(possiblePokemons.headbutt);

        // Special requirement Pokémon
        let specialPokemonList = possiblePokemons.special;

        if (onlyConsiderAvailablePokemons)
        {
            specialPokemonList = specialPokemonList.filter((p) => this.__internal__isRequirementCompleted(p.req, route.region), this);
        }

        pokemonList = pokemonList.concat(...specialPokemonList.map(p => p.pokemon));

        // Filter duplicate entries
        pokemonList.filter((item, index) => pokemonList.indexOf(item) === index);

        // Filter alternate forms, if asked for
        if (onlyConsiderAvailablePokemons && Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.SkipAlternateForms) == "true")
        {
            // Alternate forms have a floating point id
            pokemonList = pokemonList.filter((pokemonName) => Number.isInteger(pokemonMap[pokemonName].id));
        }

        return pokemonList;
    }

    /**
     * @brief Gets the list of possible pokémon for the given @p dungeon
     *
     * @param dungeon: The dungeon to get the pokémon of
     * @param {boolean} onlyConsiderAvailablePokemons: Whether only currently available pokémon should be considered
     * @param {boolean} skipBosses: Whether boss pokémons should be skipped
     *
     * @returns The list of pokémon
     */
    static __internal__getEveryPokemonForDungeon(dungeon, onlyConsiderAvailablePokemons, skipBosses = false)
    {
        let pokemonList = dungeon.pokemonList;

        if (!skipBosses)
        {
            const dungeonRegion = TownList[dungeon.name].region;

            // Add pokemon bosses
            for (const boss of dungeon.bossList)
            {
                // Only consider pokémons
                if (!Automation.Utils.isInstanceOf(boss, "DungeonBossPokemon"))
                {
                    continue;
                }

                // Don't consider locked bosses, if we're only considering available pokémons
                if (onlyConsiderAvailablePokemons)
                {
                    const isBossLocked = boss.options?.requirement
                                       ? !this.__internal__isRequirementCompleted(boss.options?.requirement, dungeonRegion)
                                       : false;
                    if (isBossLocked) continue;
                }

                if (!pokemonList.includes(boss.name))
                {
                    pokemonList.push(boss.name);
                }
            }
        }

        // Filter alternate forms, if asked for
        if (onlyConsiderAvailablePokemons && Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.SkipAlternateForms) == "true")
        {
            // Alternate forms have a floating point id
            pokemonList = pokemonList.filter((pokemonName) => Number.isInteger(pokemonMap[pokemonName].id));
        }

        return pokemonList;
    }

    /**
     * @brief Check the @p requirement completion with respect of the provided @p region
     *
     * @param requirement: The requirement to check to completion of
     * @param region: The region in which the requirement must be validated
     *
     * @returns true if the requirement is completed, false otherwise
     */
    static __internal__isRequirementCompleted(requirement, region)
    {
        const requirements = (Automation.Utils.isInstanceOf(requirement, "MultiRequirement")) ? requirement.requirements
                                                                                              : [ requirement ];

        for (const req of requirements)
        {
            if (Automation.Utils.isInstanceOf(req, "WeatherRequirement"))
            {
                if (!req.weather.includes(Weather.regionalWeather[region]()))
                {
                    return false;
                }
            }
            else
            {
                if (!req.isCompleted())
                {
                    return false;
                }
            }
        }

        return true;
    }
}
