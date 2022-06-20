/**
 * @class The AutomationFocusAchievements regroups the 'Focus on' button's 'Achievements' functionalities
 */
class AutomationFocusAchievements
{
    static __achievementLoop = null;
    static __currentAchievement = null;

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
                       + Automation.Menu.__tooltipSeparator()
                       + "This feature handles the following achievements:\n"
                       + "Route Kill, Clear Gym and Clear Dungeon\n"
                       + "The achievements will be completed in region order.\n"
                       + "The current achievement will be pinned to the tracker",
                run: function (){ this.__start(); }.bind(this),
                stop: function (){ this.__stop(); }.bind(this),
                refreshRateAsMs: Automation.Focus.__noFunctionalityRefresh
            });
    }

    /**
     * @brief Starts the achievements automation
     */
    static __start()
    {
        // Set achievement loop
        this.__achievementLoop = setInterval(this.__focusOnAchievements.bind(this), 1000); // Runs every second
    }

    /**
     * @brief Stops the achievements automation
     */
     static __stop()
    {
        this.__currentAchievement = null;

        // Unregister the loop
        clearInterval(this.__achievementLoop);
        this.__achievementLoop = null;

        if (Automation.Utils.__isInInstanceState())
        {
            Automation.Dungeon.__stopRequested = true;
        }
        Automation.Menu.__forceAutomationState("gymFightEnabled", false);
        App.game.pokeballs.alreadyCaughtSelection = GameConstants.Pokeball.None;
    }

    /**
     * @brief The achievement main loop
     */
    static __focusOnAchievements()
    {
        // Already fighting, nothing to do for now
        if (!Automation.Focus.__ensureNoInstanceIsInProgress())
        {
            return;
        }

        // Get a new achievement if needed
        this.__updateTheAchievementIfNeeded();

        // Work on the current achievement
        this.__workOnAchievement();
    }

    /**
     * @brief Updates the focused achievement if there is none, or the current one is completed
     */
    static __updateTheAchievementIfNeeded()
    {
        if ((this.__currentAchievement === null) || this.__currentAchievement.isCompleted())
        {
            this.__currentAchievement = this.__getNextAchievement();

            if (this.__currentAchievement === null)
            {
                // No more achievements, stop the feature
                Automation.Menu.__forceAutomationState("focusOnTopicEnabled", false);
                Automation.Utils.__sendWarningNotif("No more achievement to automate.\nTurning the feature off", "Focus");

                return;
            }

            App.game.achievementTracker.trackAchievement(this.__currentAchievement);
        }
    }

    /**
     * @brief Works on the currently selected achievement
     */
    static __workOnAchievement()
    {
        // Reset any equipped pokeball
        App.game.pokeballs.alreadyCaughtSelection = GameConstants.Pokeball.None;

        if (this.__currentAchievement.property instanceof RouteKillRequirement)
        {
            this.__workOnRouteKillRequirement();
        }
        else if (this.__currentAchievement.property instanceof ClearGymRequirement)
        {
            this.__workOnClearGymRequirement();
        }
        else if (this.__currentAchievement.property instanceof ClearDungeonRequirement)
        {
            this.__workOnClearDungeonRequirement();
        }
    }

    /**
     * @brief Works on a RouteKillRequirement.
     *
     * The player is moved to the achievement requested location to defeat pokemons
     */
    static __workOnRouteKillRequirement()
    {
        // Equip the Oak item Exp loadout
        Automation.Utils.OakItem.__equipLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

        // Move to the selected route
        Automation.Utils.Route.__moveToRoute(this.__currentAchievement.property.route, this.__currentAchievement.property.region);
    }

    /**
     * @brief Works on a ClearGymRequirement.
     *
     * The player is moved to the achievement requested location and the 'Auto gym' fight is enabled
     *
     * @todo Merge with Automation.Quest.__workOnDefeatGymQuest()
     */
    static __workOnClearGymRequirement()
    {
        let gymName = GameConstants.RegionGyms.flat()[this.__currentAchievement.property.gymIndex];
        let townToGoTo = gymName;

        // If a ligue champion is the target, the gymTown points to the champion instead of the town
        if (!TownList[townToGoTo])
        {
            townToGoTo = GymList[townToGoTo].parent.name;
        }

        // Move to the associated gym if needed
        if ((player.route() != 0) || (townToGoTo !== player.town().name))
        {
            Automation.Utils.Route.__moveToTown(townToGoTo);
        }
        else if (localStorage.getItem("gymFightEnabled") === "false")
        {
            Automation.Menu.__forceAutomationState("gymFightEnabled", true);
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
    static __workOnClearDungeonRequirement()
    {
        let targetedDungeonName = GameConstants.RegionDungeons.flat()[this.__currentAchievement.property.dungeonIndex];
        // If we don't have enough tokens, go farm some
        if (TownList[targetedDungeonName].dungeon.tokenCost > App.game.wallet.currencies[Currency.dungeonToken]())
        {
            Automation.Focus.__goToBestRouteForDungeonToken();
            return;
        }

        // Move to dungeon if needed
        if ((player.route() != 0) || targetedDungeonName !== player.town().name)
        {
            Automation.Utils.Route.__moveToTown(targetedDungeonName);

            // Let a tick to the menu to show up
            return;
        }

        // Disable pokedex stop
        Automation.Menu.__forceAutomationState("stopDungeonAtPokedexCompletion", false);

        // Enable auto dungeon fight
        Automation.Menu.__forceAutomationState("dungeonFightEnabled", true);
    }

    /**
     * @brief Gets the next achivement to complete
     *
     * @returns The pokeclicker Achievement object if any achievement is available, null otherwise
     */
    static __getNextAchievement()
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
                    return (Automation.Utils.Route.__canMoveToRegion(achievement.region)
                            && MapHelper.accessToRoute(achievement.property.route, achievement.property.region));
                }

                // Consider ClearGym achievements, if the player can move to the target town
                if (achievement.property instanceof ClearGymRequirement)
                {
                    let townName = GameConstants.RegionGyms.flat()[achievement.property.gymIndex];

                    // If a ligue champion is the target, the gymTown points to the champion instead of the town
                    if (!TownList[townName])
                    {
                        townName = GymList[townName].parent.name;
                    }

                    return (Automation.Utils.Route.__canMoveToRegion(achievement.region)
                            && MapHelper.accessToTown(townName));
                }

                // Consider ClearDungeon achievements, if the player can move to the target dungeon
                if (achievement.property instanceof ClearDungeonRequirement)
                {
                    let dungeonName = GameConstants.RegionDungeons.flat()[achievement.property.dungeonIndex];
                    return (Automation.Utils.Route.__canMoveToRegion(achievement.region)
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
                    if (a.property instanceof RouteKillRequirement) return -1;
                    if (b.property instanceof RouteKillRequirement) return 1;

                    // Then Gym clear
                    if (a.property instanceof ClearGymRequirement) return -1;
                    if (b.property instanceof ClearGymRequirement) return 1;

                    // Finally Dungeon clear
                    if (a.property instanceof ClearDungeonRequirement) return -1;
                    if (b.property instanceof ClearDungeonRequirement) return 1;
                }
            )[0];
        }

        return result;
    }
}
