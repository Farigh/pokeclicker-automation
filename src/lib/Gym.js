/**
 * @class The AutomationGym regroups the 'Gym AutoFight' functionalities
 */
 class AutomationGym
{
    static Settings = { FeatureEnabled: "Gym-FightEnabled" };

    /**
     * @brief Builds the menu
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        // Only consider the BuildMenu init step
        if (initStep != Automation.InitSteps.BuildMenu) return;

        // Hide the gym and dungeon fight menus by default and disable auto fight
        let gymTitle = '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
                     +     '&nbsp;Gym fight&nbsp;'
                     + '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">';
        let gymDiv = Automation.Menu.addCategory("gymFightButtons", gymTitle);
        gymDiv.parentElement.hidden = true;

        // Add an on/off button
        let autoGymTooltip = "Automatically starts the selected gym fight";
        let autoGymButton = Automation.Menu.addAutomationButton("AutoFight", this.Settings.FeatureEnabled, autoGymTooltip, gymDiv, true);
        autoGymButton.addEventListener("click", this.__internal__toggleGymFight.bind(this), false);

        // Disable by default
        Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);

        // Add gym selector drop-down list
        let selectElem = Automation.Menu.createDropDownListElement("selectedAutomationGym");
        selectElem.style.marginRight = "5px";
        gymDiv.appendChild(selectElem);

        // Set the div visibility and content watcher
        setInterval(this.__internal__updateDivVisibilityAndContent.bind(this), 200); // Refresh every 0.2s
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__autoGymLoop = null;

    static __internal__previousTown = null;
    static __internal__currentGymListSize = 0;

    /**
     * @brief Toggles the 'Gym AutoFight' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static __internal__toggleGymFight(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__autoGymLoop === null)
            {
                // Set auto-gym loop
                this.__internal__autoGymLoop = setInterval(this.__internal__gymFightLoop.bind(this), 50); // Runs every game tick
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__autoGymLoop);
            this.__internal__autoGymLoop = null;
        }
    }

    /**
     * @brief The Gym AutoFight loop
     *
     * It will automatically start the selected gym.
     */
    static __internal__gymFightLoop()
    {
        // Kill the loop if the menu is not visible anymore
        if (document.getElementById("gymFightButtons").hidden)
        {
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
            return;
        }

        // We are currently fighting, do do anything
        if (App.game.gameState === GameConstants.GameState.gym)
        {
            return;
        }

        // Check if we are in a town
        if (App.game.gameState === GameConstants.GameState.town)
        {
            let selectedGym = GymList[document.getElementById("selectedAutomationGym").value];

            if ((document.getElementById("selectedAutomationGym").selectedIndex < 0)
                || (selectedGym.parent.name !== player.town().name))
            {
                Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
                return;
            }

            selectedGym.protectedOnclick();
        }
    }

    /**
     * @brief Toggle the 'Gym AutoFight' category visibility based on the game state
     *        It will refresh the gym list as well (in case of a new contestant, for example in the league)
     *
     * The category is only visible when a gym is actually available at the current position
     */
    static __internal__updateDivVisibilityAndContent()
    {
        // Check if we are in a town
        if (App.game.gameState === GameConstants.GameState.town)
        {
            // If we are in the same town as previous cycle
            if (this.__internal__previousTown === player.town().name)
            {
                this.__internal__updateGymList(player.town().name, false);
            }
            else
            {
                if (player.town().content.filter((x) => GymList[x.town]).length > 0)
                {
                    this.__internal__updateGymList(player.town().name, true);

                    Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
                }
                this.__internal__previousTown = player.town().name;
            }

            document.getElementById("gymFightButtons").hidden = (this.__internal__currentGymListSize == 0);
        }
        else if (App.game.gameState === GameConstants.GameState.gym)
        {
            this.__internal__updateGymList(this.__internal__previousTown, false);
        }
        else
        {
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
            document.getElementById("gymFightButtons").hidden = true;
        }
    }

    /**
     * @brief Refreshes the Gym list
     *
     * A refresh is needed if:
     *   - The player moved to another town
     *   - A new contestant is available in the same town (for example in the league)
     */
    static __internal__updateGymList(townName, rebuild)
    {
        let selectElem = document.getElementById("selectedAutomationGym");
        let gymList = TownList[townName].content.filter((x) => GymList[x.town]);
        let unlockedGymCount = gymList.reduce((count, gym) => count + (gym.isUnlocked() ? 1 : 0), 0);

        if ((this.__internal__currentGymListSize === unlockedGymCount)
            && (this.__internal__previousTown === townName))
        {
            return;
        }

        if (rebuild)
        {
            // Drop all elements and rebuild the list
            selectElem.innerHTML = "";

            let selectedItemSet = false;
            gymList.forEach(
                (gym) =>
                {
                    let opt = document.createElement("option");
                    opt.value = gym.town;
                    opt.id = gym.town;
                    opt.innerHTML = gym.leaderName;

                    // Don't show the option if it's not been unlocked yet
                    if (!gym.isUnlocked())
                    {
                        opt.style.display = "none";
                    }
                    else if (!selectedItemSet)
                    {
                        opt.selected = true;
                        selectedItemSet = true;
                    }

                    selectElem.options.add(opt);
                });
        }
        else
        {
            gymList.forEach(
                (gym) =>
                {
                    if (gym.isUnlocked())
                    {
                        let opt = selectElem.options.namedItem(gym.town);
                        if (opt.style.display === "none")
                        {
                            opt.style.display = "block";
                        }
                    }
                });
        }

        if (unlockedGymCount === 0)
        {
            document.getElementById("selectedAutomationGym").selectedIndex = -1;
        }

        this.__internal__currentGymListSize = unlockedGymCount;
    }
}
