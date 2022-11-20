/**
 * @class The AutomationClick regroups the 'Auto attack' button functionalities
 */
class AutomationClick
{
    static Settings = { FeatureEnabled: "Click-Enabled" };

    /**
     * @brief Determines if the feature is currently active
     *        (ie. The user turned it on, or another feature did)
     *
     * @returns True if the feature is active, false otherwise
     */
    static isFeatureActive()
    {
        // No-click challenge disables clicks
        return !App.game.challenges.list.disableClickAttack.active()
            && (this.__internal__autoClickLoop != null);
    }

    /**
     * @brief Builds the menu, and retores previous running state if needed
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
           this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            // Restore previous session state
            this.toggleAutoClick();
        }
    }

    /**
     * @brief Toggles the 'Auto attack' feature
     *
     * If the feature was enabled and it's toggled to disabled, the auto attack loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the auto attack loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static toggleAutoClick(enable)
    {
        // If the no-click challenge is enabled, never run the feature
        if (App.game.challenges.list.disableClickAttack.active())
        {
            return;
        }

        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__autoClickLoop === null)
            {
                // Set auto-click loop
                this.__internal__autoClickLoop = setInterval(this.__internal__autoClick.bind(this), 50); // The app hard-caps click attacks at 50
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__autoClickLoop);
            this.__internal__autoClickLoop = null;
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__autoClickLoop = null;
    static __internal__container = null;

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        this.__internal__container = document.createElement('div');

        // Add auto click button
        let autoClickTooltip = "Attack clicks are performed every 50ms"
                             + Automation.Menu.TooltipSeparator
                             + "Applies to battle, gym and dungeon";
        let autoClickButton =
            Automation.Menu.addAutomationButton("Auto attack", this.Settings.FeatureEnabled, autoClickTooltip, this.__internal__container);
        autoClickButton.addEventListener("click", this.toggleAutoClick.bind(this), false);

        Automation.Menu.addSeparator(this.__internal__container);

        Automation.Menu.AutomationButtonsDiv.appendChild(this.__internal__container);

        // Hide the menu if the no-click challenge is enabled
        if (App.game.challenges.list.disableClickAttack.active())
        {
            this.__internal__container.hidden = true;
        }

        // Add a watcher, in case the player changes the challenge configuration at some point
        if (this.__internal__container.hidden || (player.regionStarters[0]() === GameConstants.Starter.None))
        {
            let watcher = setInterval(function()
                {
                    if (App.game.challenges.list.disableClickAttack.active())
                    {
                        this.__internal__container.hidden = true;
                        return;
                    }

                    this.__internal__container.hidden = false;

                    if (player.starter() !== GameConstants.Starter.None)
                    {
                        clearInterval(watcher);
                    }
                }.bind(this), 10000); // Check every 10s
        }
    }

    /**
     * @brief Automatically clicks according to the current game state
     *
     * The following states are handled:
     *   - Pokemon fights
     *   - Gym fights
     *   - Dungeon fights
     */
    static __internal__autoClick()
    {
        // If the no-click challenge is enabled, turn off the feature and hide the menu
        if (App.game.challenges.list.disableClickAttack.active())
        {
            this.__internal__container.hidden = true;
            clearInterval(this.__internal__autoClickLoop);
            return;
        }

        // Click while in a normal battle
        if (App.game.gameState == GameConstants.GameState.fighting)
        {
            if (!Battle.catching())
            {
                Battle.clickAttack();
            }
        }
        // Click while in a gym battle
        else if (App.game.gameState === GameConstants.GameState.gym)
        {
            GymBattle.clickAttack();
        }
        // Click while in a dungeon battle
        else if (App.game.gameState === GameConstants.GameState.dungeon)
        {
            if (DungeonRunner.fighting() && !DungeonBattle.catching())
            {
                DungeonBattle.clickAttack();
            }
        }
        // Click while in a temporary battle
        else if (App.game.gameState === GameConstants.GameState.temporaryBattle)
        {
            TemporaryBattleBattle.clickAttack()
        }
    }
}
