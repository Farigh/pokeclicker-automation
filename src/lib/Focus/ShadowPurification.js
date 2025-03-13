/**
 * @class The AutomationFocusShadowPurification regroups the 'Focus on' button's 'Shadow cure' functionalities
 */
class AutomationFocusShadowPurification
{
    /******************************************************************************\
    |***    Focus specific members, should only be used by focus sub-classes    ***|
    \******************************************************************************/

    /**
     * @brief Adds the 'Shadow purify' functionality to the 'Focus on' list
     *
     * @param {Array} functionalitiesList: The list to add the functionality to
     */
    static __registerFunctionalities(functionalitiesList)
    {
        this.__internal__buildShadowDungeonList();

        const isUnlockedCallback = function() { return pokeballFilterOptions.shadow.canUse(); };

        functionalitiesList.push(
            {
                id: "ShadowPurification",
                name: "Shadow purify",
                tooltip: "Hunts for pokémons that are corrupted by shadow"
                       + Automation.Menu.TooltipSeparator
                       + "The Purify Chamber will automatically be used when the\n"
                       + "max flow is reached, on the currently selected pokémon.",
                run: function() { this.__internal__start(); }.bind(this),
                stop: function() { this.__internal__stop(); }.bind(this),
                isUnlocked: isUnlockedCallback,
                refreshRateAsMs: Automation.Focus.__noFunctionalityRefresh
            });
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__shadowPurificationLoop = null;
    static __internal__shadowDungeonData = [];

    static __internal__currentDungeonData = null;

    /**
     * @brief Starts the shadow purification automation
     */
    static __internal__start()
    {
        // Disable other modes button
        const disableReason = "The 'Focus on Shadow purify' feature is enabled";
        Automation.Menu.setButtonDisabledState(Automation.Click.Settings.FeatureEnabled, true, disableReason);

        // Force enable other modes
        Automation.Click.toggleAutoClick(true);

        // Set shadow purification loop
        this.__internal__shadowPurificationLoop = setInterval(this.__internal__focusOnShadowPurification.bind(this), 10000); // Runs every 10 seconds
        this.__internal__focusOnShadowPurification();
    }

    /**
     * @brief Stops the shadow purification automation
     */
    static __internal__stop()
    {
        this.__internal__currentRouteData = null;
        this.__internal__currentDungeonData = null;

        // Unregister the loop
        clearInterval(this.__internal__shadowPurificationLoop);
        this.__internal__shadowPurificationLoop = null;

        // Disable automation catch filter
        Automation.Utils.Pokeball.disableAutomationFilter();

        // Reset other modes status
        Automation.Click.toggleAutoClick();

        // Re-enable other modes button
        Automation.Menu.setButtonDisabledState(Automation.Click.Settings.FeatureEnabled, false);
    }

    /**
     * @brief The shadow purification main loop
     *
     * @note If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     */
    static __internal__focusOnShadowPurification()
    {
        // Already fighting, nothing to do for now
        if (Automation.Utils.isInInstanceState())
        {
            if ((this.__internal__currentDungeonData == null)
                || !this.__internal__doesDungeonHaveAnyUncaughtShadowPokemon(this.__internal__currentDungeonData.dungeon, true))
            {
                Automation.Focus.__ensureNoInstanceIsInProgress();
            }
            return;
        }

        // If the currently used dungeon still has contagious pokémons, continue with it
        if ((this.__internal__currentDungeonData != null)
            && this.__internal__doesDungeonHaveAnyUncaughtShadowPokemon(this.__internal__currentDungeonData.dungeon, true))
        {
            this.__internal__captureShadowPokemons();
            return;
        }

        // Try the next dungeon
        this.__internal__setNextShadowDungeon();

        if (this.__internal__currentDungeonData != null)
        {
            this.__internal__captureShadowPokemons();
        }
        // No more dungeons, focus on purification
        else if (App.game.party.caughtPokemon.some((p) => p.shadow == GameConstants.ShadowStatus.Shadow))
        {
            Automation.Dungeon.stopAfterThisRun();

            // Move to the best route for Exp, since the Purify Chamber flow charges based on it
            Automation.Utils.Route.moveToBestRouteForExp();

            // Try to purify a shadow pokémon
            this.__internal__tryToPurifyShadowPokemon();
        }
        else
        {
            // No more location available, stop the focus
            Automation.Menu.forceAutomationState(Automation.Focus.Settings.FeatureEnabled, false);
            Automation.Notifications.sendWarningNotif("No more available Shadow pokémons to capture or Purify.\nTurning the feature off",
                                                      "Focus");
        }
    }

    /**
     * @brief Goes to the selected location to catch pokémons
     */
    static __internal__captureShadowPokemons()
    {
        // Equip the Oak item catch loadout
        Automation.Focus.__equipLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);

        // Ensure that the player has some balls available
        const selectedPokeball = parseInt(Automation.Utils.LocalStorage.getValue(Automation.Focus.Settings.BallToUseToCatch));
        if (!Automation.Focus.__ensurePlayerHasEnoughBalls(selectedPokeball))
        {
            Automation.Utils.Pokeball.disableAutomationFilter();
            return;
        }

        // Go farm some dungeon token if needed
        if (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() < this.__internal__currentDungeonData.dungeon.tokenCost)
        {
            Automation.Utils.Pokeball.disableAutomationFilter();
            Automation.Focus.__goToBestRouteForDungeonToken();
            return;
        }

        // Equip an "Already caught shadow" pokeball
        Automation.Utils.Pokeball.catchEverythingWith(selectedPokeball);
        Automation.Utils.Pokeball.restrictCaptureToShadow(false);

        // Move to dungeon if needed
        if (!Automation.Utils.Route.isPlayerInTown(this.__internal__currentDungeonData.dungeon.name))
        {
            Automation.Utils.Route.moveToTown(this.__internal__currentDungeonData.dungeon.name);

            // Let a second for the menu to show up
            setTimeout(this.__internal__captureShadowPokemons.bind(this), 1000);
            return;
        }

        // Enable auto dungeon fight
        Automation.Menu.forceAutomationState(Automation.Dungeon.Settings.FeatureEnabled, true);

        // Set the callback to purify pokemon in between runs when possible
        Automation.Dungeon.setBeforeNewRunCallBack(this.__internal__tryToPurifyShadowPokemon.bind(this));

        // Bypass user settings, especially the 'Skip fights' one
        Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.ForcePokemonFight;
    }

    /**
     * @brief Purifies the currently selected shadow pokémon of the Purify Chamber, if the flow is maxed-out
     */
    static __internal__tryToPurifyShadowPokemon()
    {
        // No need to check, this function calls App.game.purifyChamber.canPurify() beforehand
        App.game.purifyChamber.purify();
    }

    /**
     * @brief Gets the next dungeon to catch Shadow pokémons
     */
    static __internal__setNextShadowDungeon()
    {
        // Remove the current dungeon from the list if completed
        if ((this.__internal__currentDungeonData != null)
            && !this.__internal__doesDungeonHaveAnyUncaughtShadowPokemon(this.__internal__currentDungeonData.dungeon))
        {
            const index = this.__internal__shadowDungeonData.indexOf(this.__internal__currentDungeonData);
            this.__internal__shadowDungeonData.splice(index, 1);
        }

        // Set the next best dungeon
        this.__internal__currentDungeonData = this.__internal__shadowDungeonData.find(
            (data) => this.__internal__doesDungeonHaveAnyUncaughtShadowPokemon(data.dungeon, true)
                      // Don't consider dungeon that the player can't access yet
                   && Automation.Utils.Route.canMoveToTown(TownList[data.dungeon.name]), this);
    }

    /**
     * @brief Builds the internal list of dungeon with at least one uncaught shadow pokémon
     */
    static __internal__buildShadowDungeonList()
    {
        for (const dungeonName of Object.keys(dungeonList))
        {
            // Only consider dungeons that have shadow pokémons
            if (!Automation.Dungeon.hasShadowPokemons(dungeonName))
            {
                continue;
            }

            const dungeon = dungeonList[dungeonName];
            // Don't add dungeons that are already cured
            if (this.__internal__doesDungeonHaveAnyUncaughtShadowPokemon(dungeon))
            {
                this.__internal__shadowDungeonData.push({ dungeon });
            }
        }
    }

    /**
     * @brief Checks if any shadow pokémon from the given @p dungeon needs to be caught
     *
     * @param dungeon: The dungeon to check
     * @param {boolean} onlyConsiderAvailablePokemons: Whether only currently available pokémon should be considered
     *
     * @returns True if every pokémons are caught, false otherwise
     */
    static __internal__doesDungeonHaveAnyUncaughtShadowPokemon(dungeon, onlyConsiderAvailablePokemons = false)
    {
        const pokemonList = this.__internal__getEveryPokemonForDungeon(dungeon, onlyConsiderAvailablePokemons);

        return pokemonList.some((pokemonName) =>
            {
                const pokemon = App.game.party.getPokemonByName(pokemonName);

                return !(pokemon?.shadow != GameConstants.ShadowStatus.None);
            });
    }

    /**
     * @brief Gets the list of possible pokémon for the given @p dungeon
     *
     * @param dungeon: The dungeon to get the pokémon of
     * @param {boolean} onlyConsiderAvailablePokemons: Whether only currently available pokémon should be considered
     *
     * @returns The list of pokémon
     */
    static __internal__getEveryPokemonForDungeon(dungeon, onlyConsiderAvailablePokemons)
    {
        let pokemonList = [];

        // Concatenate bosses and enemies
        const enemyList = [...dungeon.enemyList];
        for (const boss of dungeon.bossList)
        {
            enemyList.push(boss)
        }

        // Add shadow pokemons
        for (const enemy of enemyList)
        {
            // Only consider trainers
            if (!Automation.Utils.isInstanceOf(enemy, "DungeonTrainer"))
            {
                continue;
            }

            // Don't consider locked enemies, if we're only considering available pokémons
            if (onlyConsiderAvailablePokemons)
            {
                const isEnemyLocked = enemy.options?.requirement ? !enemy.options?.requirement.isCompleted() : false;
                if (isEnemyLocked) continue;
            }

            for (const pokemon of enemy.team)
            {
                // Only consider Shadow pokémons
                if (pokemon.shadow != 1) continue;

                if (!pokemonList.includes(pokemon.name))
                {
                    pokemonList.push(pokemon.name);
                }
            }
        }

        return pokemonList;
    }
}
