/**
 * @class The AutomationFocusAchievements regroups the 'Focus on' button's 'Achievements' functionalities
 */
class AutomationFocusAchievements
{
    /******************************************************************************\
    |***    Focus specific members, should only be used by focus sub-classes    ***|
    \******************************************************************************/

    /**
     * @brief Adds the Achivements functionality to the 'Focus on' list
     *
     * @param {Array} functionalitiesList: The list to add the functionality to
     */
    static __registerFunctionalities(functionalitiesList)
    {
        functionalitiesList.push(
            {
                id: "Achievements",
                name: "Achievements",
                tooltip: "Completes the pending achivements"
                       + Automation.Menu.TooltipSeparator
                       + "This feature handles the following achievements:\n"
                       + "Route Kill, Clear Gym and Clear Dungeon\n"
                       + "The achievements will be completed in region order.\n"
                       + "The current achievement will be pinned to the tracker",
                run: function (){ this.__internal__start(); }.bind(this),
                stop: function (){ this.__internal__stop(); }.bind(this),
                isUnlocked: function (){ return App.game.achievementTracker.canAccess(); },
                refreshRateAsMs: Automation.Focus.__noFunctionalityRefresh
            });
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__achievementLoop = null;
    static __internal__currentAchievement = null;

    /**
     * @brief Starts the achievements automation
     */
    static __internal__start()
    {
        // Set achievement loop
        this.__internal__achievementLoop = setInterval(this.__internal__focusOnAchievements.bind(this), 1000); // Runs every second
    }

    /**
     * @brief Stops the achievements automation
     */
    static __internal__stop()
    {
        this.__internal__currentAchievement = null;

        // Unregister the loop
        clearInterval(this.__internal__achievementLoop);
        this.__internal__achievementLoop = null;

        Automation.Dungeon.AutomationRequestedMode = Automation.Utils.isInInstanceState() ? Automation.Dungeon.InternalModes.StopAfterThisRun
                                                                                          : Automation.Dungeon.InternalModes.None;

        Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, false);
        App.game.pokeballs.alreadyCaughtSelection = Automation.Focus.__internal__defaultCaughtPokeballSelectElem.value;
    }

    /**
     * @brief The achievement main loop
     *
     * @note If the user is in a state in which he cannot be moved, the feature is automatically disabled.
     */
    static __internal__focusOnAchievements()
    {
        // Already fighting, nothing to do for now
        if (Automation.Utils.isInInstanceState())
        {
            // If the quest is not a ClearDungeonRequirement, or if it's completed, no instance should be in progress^M
            if ((this.__internal__currentAchievement === null)
                || ((this.__internal__currentAchievement.property instanceof ClearDungeonRequirement)
                    && this.__internal__currentAchievement.isCompleted()))
            {
                Automation.Focus.__ensureNoInstanceIsInProgress();
            }
            return;
        }

        // Get a new achievement if needed
        this.__internal__updateTheAchievementIfNeeded();

        // Work on the current achievement
        this.__internal__workOnAchievement();
    }

    /**
     * @brief Updates the focused achievement if there is none, or the current one is completed
     */
    static __internal__updateTheAchievementIfNeeded()
    {
        if ((this.__internal__currentAchievement === null) || this.__internal__currentAchievement.isCompleted())
        {
            this.__internal__currentAchievement = this.__internal__getNextAchievement();

            if (this.__internal__currentAchievement === null)
            {
                // No more achievements, stop the feature
                Automation.Menu.forceAutomationState(Automation.Focus.Settings.FeatureEnabled, false);
                Automation.Utils.sendWarningNotif("No more achievement to automate.\nTurning the feature off", "Focus");

                return;
            }

            App.game.achievementTracker.trackAchievement(this.__internal__currentAchievement);
        }
    }

    /**
     * @brief Works on the currently selected achievement
     */
    static __internal__workOnAchievement()
    {
        // Reset any equipped pokeball
        App.game.pokeballs.alreadyCaughtSelection = Automation.Focus.__internal__defaultCaughtPokeballSelectElem.value;

        if (this.__internal__currentAchievement.property instanceof RouteKillRequirement)
        {
            Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.None;
            this.__internal__workOnRouteKillRequirement();
        }
        else if (this.__internal__currentAchievement.property instanceof ClearGymRequirement)
        {
            Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.None;
            this.__internal__workOnClearGymRequirement();
        }
        else if (this.__internal__currentAchievement.property instanceof ClearDungeonRequirement)
        {
            this.__internal__workOnClearDungeonRequirement();
        }
    }

    /**
     * @brief Works on a RouteKillRequirement.
     *
     * The player is moved to the achievement requested location to defeat pokemons
     */
    static __internal__workOnRouteKillRequirement()
    {
        // Equip the Oak item Exp loadout
        Automation.Focus.__internal__equipLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

        // Move to the selected route
        Automation.Utils.Route.moveToRoute(this.__internal__currentAchievement.property.route, this.__internal__currentAchievement.property.region);
    }

    /**
     * @brief Works on a ClearGymRequirement.
     *
     * The player is moved to the achievement requested location and the 'Auto gym' fight is enabled
     *
     * @todo Merge with Automation.Quest.__workOnDefeatGymQuest()
     */
    static __internal__workOnClearGymRequirement()
    {
        let gymName = GameConstants.RegionGyms.flat()[this.__internal__currentAchievement.property.gymIndex];
        let townToGoTo = gymName;

        // If a ligue champion is the target, the gymTown points to the champion instead of the town
        if (!TownList[townToGoTo])
        {
            townToGoTo = GymList[townToGoTo].parent.name;
        }

        // Move to the associated gym if needed
        if (!Automation.Utils.Route.isPlayerInTown(townToGoTo))
        {
            Automation.Utils.Route.moveToTown(townToGoTo);
        }
        else if (Automation.Utils.LocalStorage.getValue(Automation.Gym.Settings.FeatureEnabled) === "false")
        {
            Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, true);
        }
        else
        {
            // Select the right gym to fight
            if (document.getElementById("selectedAutomationGym").value != gymName)
            {
                document.getElementById("selectedAutomationGym").value = gymName;
            }
        }
    }

    /**
     * @brief Works on a ClearDungeonRequirement.
     *
     * If the player does not have enough dungeon token to enter the dungeon, some balls are equipped
     * and the player is moved to the best road to farm some token.
     * Otherwise, the player is moved to the achievement requested location, and the Auto Dungeon feature is enabled
     *
     * @see AutomationDungeon class
     *
     * @todo Merge with Automation.Quest.__workOnDefeatDungeonQuest()
     */
    static __internal__workOnClearDungeonRequirement()
    {
        let targetedDungeonName = GameConstants.RegionDungeons.flat()[this.__internal__currentAchievement.property.dungeonIndex];
        // If we don't have enough tokens, go farm some
        if (TownList[targetedDungeonName].dungeon.tokenCost > App.game.wallet.currencies[Currency.dungeonToken]())
        {
            Automation.Focus.__goToBestRouteForDungeonToken();
            return;
        }

        // Move to dungeon if needed
        if (!Automation.Utils.Route.isPlayerInTown(targetedDungeonName))
        {
            Automation.Utils.Route.moveToTown(targetedDungeonName);

            // Let a tick to the menu to show up
            return;
        }

        // Bypass user settings like the stop on pokedex one
        Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.BypassUserSettings;

        // Enable auto dungeon fight
        Automation.Menu.forceAutomationState(Automation.Dungeon.Settings.FeatureEnabled, true);
    }

    /**
     * @brief Gets the next achivement to complete
     *
     * @returns The pokeclicker Achievement object if any achievement is available, null otherwise
     */
    static __internal__getNextAchievement()
    {
        let result = null;

        let availableAchievements = AchievementHandler.achievementList.filter(
            (achievement) =>
            {
                // Only handle supported kinds of achievements, if achievable and not already completed
                if (achievement.isCompleted()
                    || !achievement.achievable()
                    || (achievement.region > player.highestRegion()))
                {
                    return false;
                }

                // Consider RouteKill achievements, if the player can move to the target route
                if (achievement.property instanceof RouteKillRequirement)
                {
                    return (Automation.Utils.Route.canMoveToRegion(achievement.region)
                            && MapHelper.accessToRoute(achievement.property.route, achievement.property.region));
                }

                // Consider ClearGym achievements, if the player can move to the target town
                if (achievement.property instanceof ClearGymRequirement)
                {
                    let gymName = GameConstants.RegionGyms.flat()[achievement.property.gymIndex];

                    // If a ligue champion is the target, the gymTown points to the champion instead of the town
                    let townName = gymName;
                    if (!TownList[townName])
                    {
                        townName = GymList[townName].parent.name;
                    }

                    return (Automation.Utils.Route.canMoveToRegion(achievement.region)
                            && MapHelper.accessToTown(townName)
                            && GymList[gymName].isUnlocked());
                }

                // Consider ClearDungeon achievements, if the player can move to the target dungeon
                if (achievement.property instanceof ClearDungeonRequirement)
                {
                    let dungeonName = GameConstants.RegionDungeons.flat()[achievement.property.dungeonIndex];
                    return (Automation.Utils.Route.canMoveToRegion(achievement.region)
                            && MapHelper.accessToTown(dungeonName));
                }

                return false;
            });

        if (availableAchievements.length > 0)
        {
            result = availableAchievements.sort(
                (a, b) =>
                {
                    // Favor lower region quests
                    if (a.region < b.region) return -1;
                    if (a.region > b.region) return 1;

                    // Then route kill
                    if ((a.property instanceof RouteKillRequirement) && (b.property instanceof RouteKillRequirement)) return 0;
                    if (a.property instanceof RouteKillRequirement) return -1;
                    if (b.property instanceof RouteKillRequirement) return 1;

                    // Then Gym clear
                    if ((a.property instanceof ClearGymRequirement) && (b.property instanceof ClearGymRequirement)) return 0;
                    if (a.property instanceof ClearGymRequirement) return -1;
                    if (b.property instanceof ClearGymRequirement) return 1;

                    // Finally Dungeon clear
                    if ((a.property instanceof ClearDungeonRequirement) && (b.property instanceof ClearDungeonRequirement)) return 0;
                    if (a.property instanceof ClearDungeonRequirement) return -1;
                    if (b.property instanceof ClearDungeonRequirement) return 1;
                }
            )[0];
        }

        return result;
    }
}
