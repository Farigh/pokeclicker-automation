/**
 * @class The AutomationFocusAchievements regroups the 'Focus on' button's 'Achievements' functionalities
 */
class AutomationFocusAchievements
{
    /******************************************************************************\
    |***    Focus specific members, should only be used by focus sub-classes    ***|
    \******************************************************************************/

    static __internal__advancedSettings =
        {
            DoMagikarpJumpLast: "Focus-Achievements-DoMagikarpIslandLast",
            AchievementEnabled: function(type, amount) { return `Focus-Achievements-${type}-${amount}-Enabled`; }.bind(this)
        };

    // Internal copy of supported achievements left to perform
    static __internal__filteredAchievementList = [];

    /**
     * @brief Adds the Achievements functionality to the 'Focus on' list
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
                       + "The current achievement will be pinned to the tracker, if unlocked",
                run: function() { this.__internal__start(); }.bind(this),
                stop: function() { this.__internal__stop(); }.bind(this),
                refreshRateAsMs: Automation.Focus.__noFunctionalityRefresh
            });
    }

    /**
     * @brief Builds the 'Focus on Achievements' advanced settings tab
     *
     * @param {Element} parent: The parent div to add the settings to
     */
    static __buildAdvancedSettings(parent)
    {
        // Disable the magikarp jump last by default
        Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.DoMagikarpJumpLast, false);

        // OakItem loadout setting
        const tooltip = "Will perform the Magikarp Jump achievements last.";
        const button = Automation.Menu.addLabeledAdvancedSettingsToggleButton("Complete Magikarp Jump achievements last",
                                                                              this.__internal__advancedSettings.DoMagikarpJumpLast,
                                                                              tooltip,
                                                                              parent);

        button.addEventListener("click", function()
            {
                // Don't do anything if the feature is disabled
                if (this.__internal__currentAchievement)
                {
                    // Force current achievement update
                    this.__internal__currentAchievement = null;
                }
            }.bind(this), false);

        // Build the achievement selection settings
        this.__internal__buildAchievementSelectionSettings(parent);
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__achievementLoop = null;
    static __internal__currentAchievement = null;

    /**
     * @brief Builds the achivement selection settings
     *
     * @param {Element} parent: The parent div to add the settings to
     */
    static __internal__buildAchievementSelectionSettings(parent)
    {
        // Add the description
        const tooltip = "Enabling a quest of a given type will automatically enable\n"
                      + "any other quests of the same type with a lower target.\n\n"
                      + "Disabling a quest of a given type will automatically disable\n"
                      + "any other quests of the same type with a higher target.\n";
        const descriptionContainer = document.createElement("div");
        descriptionContainer.style.marginTop = "10px";
        const descriptionElem = document.createElement("span");
        descriptionElem.textContent = "Choose which achievement should be performed, or skipped ℹ️";
        descriptionElem.classList.add("hasAutomationTooltip");
        descriptionElem.classList.add("rightMostAutomationTooltip");
        descriptionElem.classList.add("shortTransitionAutomationTooltip");
        descriptionElem.style.cursor = "help";
        descriptionElem.setAttribute("automation-tooltip-text", tooltip);
        descriptionContainer.appendChild(descriptionElem);
        parent.appendChild(descriptionContainer);

        // Add the toggles table
        const tableContainer = document.createElement("div");
        tableContainer.classList.add("automationTabSubContent");
        parent.appendChild(tableContainer);

        const tableElem = document.createElement("table");
        tableElem.style.width = "100%";
        tableContainer.appendChild(tableElem);

        const achievementDataList = this.__internal__getAchievementsData();
        for (const [ index, achievementData ] of achievementDataList.entries())
        {
            const rowElem = document.createElement("tr");
            tableElem.appendChild(rowElem);

            const labelCellElem = document.createElement("td");
            labelCellElem.style.width = "100%"; // Make the cell take the maximum place, for menu consistency
            labelCellElem.style.paddingLeft = "5px";
            labelCellElem.style.paddingRight = "7px";
            labelCellElem.innerHTML = this.__internal__getAchievementLabel(achievementData);
            rowElem.appendChild(labelCellElem);

            const toggleCellElem = document.createElement("td");
            toggleCellElem.style.paddingRight = "5px"; // Align toggle with ones outside the sub-content div
            rowElem.appendChild(toggleCellElem);

            const storageKey = this.__internal__advancedSettings.AchievementEnabled(achievementData.type, achievementData.amount);

            // Enable the achievement by default, unless the user chose to disable settings by default
            Automation.Utils.LocalStorage.setDefaultValue(storageKey, !Automation.Menu.DisableSettingsByDefault);

            achievementData.toggleButton = Automation.Menu.addLocalStorageBoundToggleButton(storageKey);
            toggleCellElem.appendChild(achievementData.toggleButton);

            // Compute previous and next button data
            let previousData = (index > 0) ? achievementDataList[index - 1] : null;
            if ((previousData != null) && (previousData.type != achievementData.type))
            {
                previousData = null;
            }
            let nextData = ((index + 1) < achievementDataList.length) ? achievementDataList[index + 1] : null;
            if ((nextData != null) && (nextData.type != achievementData.type))
            {
                nextData = null;
            }

            // Every time the status of an achievement changes, we need to refresh the currently selected one
            achievementData.toggleButton.addEventListener("click", function()
                {
                    // Don't do anything if the feature is disabled
                    if (this.__internal__currentAchievement)
                    {
                        // Force current achievement update
                        this.__internal__currentAchievement = null;
                    }

                    const isFeatureEnabled = (Automation.Utils.LocalStorage.getValue(storageKey) === "true");

                    if (isFeatureEnabled && (previousData != null))
                    {
                        // We need to turn on the previous one as well, if not already enabled
                        const previousStorageKey = this.__internal__advancedSettings.AchievementEnabled(previousData.type, previousData.amount);
                        if (Automation.Utils.LocalStorage.getValue(previousStorageKey) !== "true")
                        {
                            previousData.toggleButton.click();
                        }
                    }
                    else if (!isFeatureEnabled && (nextData != null))
                    {
                        // We need to turn off the next one as well, if not already enabled
                        const nextStorageKey = this.__internal__advancedSettings.AchievementEnabled(nextData.type, nextData.amount);
                        if (Automation.Utils.LocalStorage.getValue(nextStorageKey) === "true")
                        {
                            nextData.toggleButton.click();
                        }
                    }

                }.bind(this), false);
        }
    }

    /**
     * @brief Starts the achievements automation
     */
    static __internal__start()
    {
        // Set achievement loop
        this.__internal__achievementLoop = setInterval(this.__internal__focusOnAchievements.bind(this), 1000); // Runs every second
        this.__internal__focusOnAchievements();
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

        Automation.Dungeon.stopAfterThisRun();

        Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, false);

        // Disable automation catch filter
        Automation.Utils.Pokeball.disableAutomationFilter();
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
            // If the quest is not a ClearDungeonRequirement, or if it's completed, no instance should be in progress
            if ((this.__internal__currentAchievement === null)
                || (Automation.Utils.isInstanceOf(this.__internal__currentAchievement.property, "ClearDungeonRequirement")
                    && this.__internal__currentAchievement.isCompleted()))
            {
                Automation.Focus.__ensureNoInstanceIsInProgress();
            }
            return;
        }

        // Get a new achievement if needed
        this.__internal__updateTheAchievementIfNeeded();

        // Work on the current achievement
        if (this.__internal__currentAchievement !== null)
        {
            this.__internal__workOnAchievement();
        }
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
                Automation.Notifications.sendWarningNotif("No more achievement to automate.\nTurning the feature off", "Focus");

                return;
            }

            // Track the achievement only if the tracker was unlocked
            if (App.game.achievementTracker.canAccess())
            {
                App.game.achievementTracker.trackAchievement(this.__internal__currentAchievement);
            }
        }
    }

    /**
     * @brief Works on the currently selected achievement
     */
    static __internal__workOnAchievement()
    {
        // Disable automation catch filter
        Automation.Utils.Pokeball.disableAutomationFilter();

        if (Automation.Utils.isInstanceOf(this.__internal__currentAchievement.property, "RouteKillRequirement"))
        {
            Automation.Dungeon.stopAfterThisRun();
            this.__internal__workOnRouteKillRequirement();
        }
        else if (Automation.Utils.isInstanceOf(this.__internal__currentAchievement.property, "ClearGymRequirement"))
        {
            Automation.Dungeon.stopAfterThisRun();
            this.__internal__workOnClearGymRequirement();
        }
        else if (Automation.Utils.isInstanceOf(this.__internal__currentAchievement.property, "ClearDungeonRequirement"))
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
        Automation.Focus.__equipLoadout(Automation.Utils.OakItem.Setup.PokemonExp);

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
            if (Automation.Gym.GymSelectElem.value != gymName)
            {
                Automation.Gym.GymSelectElem.value = gymName;
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
        if (TownList[targetedDungeonName].dungeon.tokenCost > App.game.wallet.currencies[GameConstants.Currency.dungeonToken]())
        {
            Automation.Focus.__goToBestRouteForDungeonToken();
            return;
        }

        // Move to dungeon if needed
        if (!Automation.Utils.Route.isPlayerInTown(targetedDungeonName))
        {
            Automation.Utils.Route.moveToTown(targetedDungeonName);

            // Let a tick for the menu to show up
            return;
        }

        // Enable auto dungeon fight
        Automation.Menu.forceAutomationState(Automation.Dungeon.Settings.FeatureEnabled, true);

        // Bypass user settings like the stop on pokedex one
        Automation.Dungeon.AutomationRequestedMode = Automation.Dungeon.InternalModes.ForceDungeonCompletion;
    }

    /**
     * @brief Gets the next achivement to complete
     *
     * @returns The pokeclicker Achievement object if any achievement is available, null otherwise
     */
    static __internal__getNextAchievement()
    {
        let result = null;

        let hasCompletedAchievements = false;
        const availableAchievements = this.__internal__filteredAchievementList.filter(
            (achievement) =>
            {
                // Only handle achievements that are not already completed
                if (achievement.isCompleted())
                {
                    hasCompletedAchievements = true;
                    return false;
                }

                // Only handle achievable achievements
                if (!achievement.achievable()
                    || (achievement.property.region > player.highestRegion()))
                {
                    return false;
                }

                // User might have disable this type of achievements
                const achievementStorageKey = this.__internal__advancedSettings.AchievementEnabled(achievement.property.constructor.name,
                                                                                                   achievement.property.requiredValue);
                if (Automation.Utils.LocalStorage.getValue(achievementStorageKey) !== "true")
                {
                    return false;
                }

                // Consider RouteKill achievements, if the player can move to the target route
                if (Automation.Utils.isInstanceOf(achievement.property, "RouteKillRequirement"))
                {
                    return Automation.Utils.Route.canMoveToRoute(achievement.property.route, achievement.property.region);
                }

                // Consider ClearGym achievements, if the player can move to the target town
                if (Automation.Utils.isInstanceOf(achievement.property, "ClearGymRequirement"))
                {
                    const gymName = GameConstants.RegionGyms.flat()[achievement.property.gymIndex];

                    // If a ligue champion is the target, the gymTown points to the champion instead of the town
                    let townName = gymName;
                    let town = TownList[gymName];
                    if (!town)
                    {
                        townName = GymList[townName].parent.name;
                        town = TownList[townName];
                    }

                    return (Automation.Utils.Route.canMoveToRegion(town.region)
                            && MapHelper.accessToTown(townName)
                            && GymList[gymName].isUnlocked());
                }

                // Consider ClearDungeon achievements, if the player can move to the target dungeon
                if (Automation.Utils.isInstanceOf(achievement.property, "ClearDungeonRequirement"))
                {
                    const dungeonName = GameConstants.RegionDungeons.flat()[achievement.property.dungeonIndex];
                    const town = TownList[dungeonName];
                    return (Automation.Utils.Route.canMoveToRegion(town.region)
                            && MapHelper.accessToTown(dungeonName)
                            && App.game.keyItems.hasKeyItem(KeyItemType.Dungeon_ticket));
                }

                return false;
            });

        // Filter the list if any completed achievement were found
        if (hasCompletedAchievements)
        {
            this.__internal__filteredAchievementList = this.__internal__filteredAchievementList.filter(
                (achievement) => !achievement.isCompleted());
        }

        if (availableAchievements.length > 0)
        {
            result = availableAchievements.sort(
                (a, b) =>
                {
                    // Favor lower region quests
                    const aRegion = this.__internal__getRegionFromCategoryName(a.category.name);
                    const bRegion = this.__internal__getRegionFromCategoryName(b.category.name);
                    if (aRegion < bRegion) return -1;
                    if (aRegion > bRegion) return 1;

                    // Then route kill
                    const isAInstanceOfRouteKillRequirement = Automation.Utils.isInstanceOf(a.property, "RouteKillRequirement");
                    const isBInstanceOfRouteKillRequirement = Automation.Utils.isInstanceOf(b.property, "RouteKillRequirement");
                    if (isAInstanceOfRouteKillRequirement && isBInstanceOfRouteKillRequirement) return 0;
                    if (isAInstanceOfRouteKillRequirement) return -1;
                    if (isBInstanceOfRouteKillRequirement) return 1;

                    // Then Gym clear
                    const isAInstanceOfClearGymRequirement = Automation.Utils.isInstanceOf(a.property, "ClearGymRequirement");
                    const isBInstanceOfClearGymRequirement = Automation.Utils.isInstanceOf(b.property, "ClearGymRequirement");
                    if (isAInstanceOfClearGymRequirement && isBInstanceOfClearGymRequirement) return 0;
                    if (isAInstanceOfClearGymRequirement) return -1;
                    if (isBInstanceOfClearGymRequirement) return 1;

                    // Finally Dungeon clear
                    const isAInstanceOfClearDungeonRequirement = Automation.Utils.isInstanceOf(a.property, "ClearDungeonRequirement");
                    const isBInstanceOfClearDungeonRequirement = Automation.Utils.isInstanceOf(b.property, "ClearDungeonRequirement");
                    if (isAInstanceOfClearDungeonRequirement && isBInstanceOfClearDungeonRequirement) return 0;
                    if (isAInstanceOfClearDungeonRequirement) return -1;
                    if (isBInstanceOfClearDungeonRequirement) return 1;
                },
                this)[0];
        }

        return result;
    }

    /**
     * @brief Returns the region number based on an achievement category name
     *
     * @param {string} categoryName: The achievement category name
     *
     * @returns The corresponding region number
     */
    static __internal__getRegionFromCategoryName(categoryName)
    {
        // Handle Sevii Island content at the same time as Hoenn content
        if (categoryName == "sevii")
        {
            return GameConstants.Region.hoenn;
        }

        // Handle Orre content at the same time as Sinnoh content
        if (categoryName == "orre")
        {
            return GameConstants.Region.sinnoh;
        }

        // Handle Magikarp Jump Island content at the same time as Galar content, unless the user chose to do it last
        if (categoryName == "magikarpJump")
        {
            if (Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.DoMagikarpJumpLast) === "true")
            {
                return GameConstants.Region.final;

            }

            return GameConstants.Region.galar;
        }

        // Any unknown content (new sub-region) should be considered last
        return GameConstants.Region[categoryName] ?? GameConstants.Region.final;
    }

    /**
     * @brief Gets the list of supported achievement description and associated settings storage key
     *
     * @return A list of {description, storage key}
     */
    static __internal__getAchievementsData()
    {
        // Initialize the achievement list
        this.__internal__filteredAchievementList = AchievementHandler.achievementList.filter(
            (achievement) => Automation.Utils.isInstanceOf(achievement.property, "RouteKillRequirement")
                          || Automation.Utils.isInstanceOf(achievement.property, "ClearGymRequirement")
                          || Automation.Utils.isInstanceOf(achievement.property, "ClearDungeonRequirement"))

        // Use a set to guarantee unicity
        let uniqueTypes = new Set();

        let result = [];
        for (const achievement of this.__internal__filteredAchievementList)
        {
            const data = { type: achievement.property.constructor.name, amount: achievement.property.requiredValue };
            const setKey = `${data.type}-${data.amount}`;

            if (!uniqueTypes.has(setKey))
            {
                result.push(data);
                uniqueTypes.add(setKey);
            }
        }

        return result;
    }

    /**
     * @brief Gets the label to display in the advanced settings list for the given @p achievementData
     *
     * @param achievementData: The data to compute the label of
     *
     * @returns The HTML-formated label
     */
    static __internal__getAchievementLabel(achievementData)
    {
        const label = (achievementData.type == "RouteKillRequirement") ? `Defeat ${achievementData.amount} Pokémon on <Route>`
                    : (achievementData.type == "ClearGymRequirement") ? `Defeat <Gym> in <Region> ${achievementData.amount} times`
                    :/*achievementData.type == "ClearDungeonRequirement"*/ `Clear <Dungeon> ${achievementData.amount} times`;

        // Escape HTML special char
        return label.replaceAll(/<([^>]+)>/g, "<i>&lt;$1&gt;</i>").replace(/.$/, "");
    }
}
