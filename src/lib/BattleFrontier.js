/**
 * @class The AutomationBattleFrontier regroups the 'Battle Frontier Auto Fight' functionalities
 */
 class AutomationBattleFrontier
{
    static Settings = { FeatureEnabled: "BattleFrontier-FightEnabled" };

    /**
     * @brief Builds the menu
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            // Hide the Battle Frontier fight panel by default
            const title = '<img src="assets/images/npcs/Crush Kin.png" height="20px" style="position:relative; bottom: 3px; transform: scaleX(-1);">'
                        +     '&nbsp;Battle Frontier&nbsp;'
                        + '<img src="assets/images/npcs/Crush Kin.png" height="20px" style="position:relative; bottom: 3px;">';
            const panelContainer = Automation.Menu.addCategory("battleFrontierFightButtons", title);

            this.__internal__autoBattleFrontierPanel = panelContainer.parentElement;
            this.__internal__autoBattleFrontierPanel.hidden = true;

            // Add an on/off button
            const autoRunTooltip = "Automatically starts the Battle Frontier every time it finishes.\n"
                                   "If a checkpoint was set, it will start at the last checkpoint.";
            const autoRunButton =
                Automation.Menu.addAutomationButton("Auto start", this.Settings.FeatureEnabled, autoRunTooltip, panelContainer, true);
            autoRunButton.addEventListener("click", this.__internal__toggleBattleFrontierFight.bind(this), false);

            // Disable the feature by default
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
        }
        else
        {
            // Set the div visibility and content watcher
            setInterval(this.__internal__updateDivVisibilityAndContent.bind(this), 200); // Refresh every 0.2s
        }
    }

    /**
     * @brief Forces the automation to stop
     */
    static ForceStop()
    {
        if (App.game.gameState != GameConstants.GameState.battleFrontier)
        {
            // Nothing to do
            return;
        }

        // Stop the automation
        this.__internal__toggleBattleFrontierFight(false);

        // Exit the battle frontier
        BattleFrontierRunner.end();

        // Leave the menu
        App.game.battleFrontier.leave();
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__autoBattleFrontierLoop = null;
    static __internal__autoBattleFrontierPanel = null;

    /**
     * @brief Toggles the 'Battle Frontier Auto Fight' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static __internal__toggleBattleFrontierFight(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__autoBattleFrontierLoop === null)
            {
                // Set auto-battleFrontier loop
                this.__internal__autoBattleFrontierLoop =
                    setInterval(this.__internal__battleFrontierFightLoop.bind(this), 10 * 1000); // Runs every 10 seconds

                // Run the loop once immediately
                this.__internal__battleFrontierFightLoop(true);
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__autoBattleFrontierLoop);
            this.__internal__autoBattleFrontierLoop = null;
        }
    }

    /**
     * @brief The Battle Frontier Auto Fight loop
     *
     * It will automatically start the Battle Frontier every time it finishes.
     *
     * @param firstRun: True if it is the initial run. In this case, the checkpoint count can legitimatly be > 1
     */
    static __internal__battleFrontierFightLoop(firstRun = false)
    {
        // Kill the loop if the menu is not visible anymore
        // or if the user quit manually
        if (this.__internal__autoBattleFrontierPanel.hidden
            || (!BattleFrontierRunner.started() && (BattleFrontierRunner.checkpoint() > 1) && !firstRun))
        {
            Automation.Notifications.sendWarningNotif("User action detected, turning off the automation", "Battle Frontier");
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
            return;
        }

        // We are currently fighting, do not do anything
        if (BattleFrontierRunner.started())
        {
            return;
        }

        // Start a new run, using the last checkpoint if available
        BattleFrontierRunner.start(true);
    }

    /**
     * @brief Toggle the 'Battle Frontier Auto Fight' category visibility based on the game state
     *
     * The category is only visible when in the Battle Frontier
     */
    static __internal__updateDivVisibilityAndContent()
    {
        // Check if we are in the Battle Frontier, hide it and disable the feature if it's not the case
        this.__internal__autoBattleFrontierPanel.hidden = (App.game.gameState !== GameConstants.GameState.battleFrontier);
        if (this.__internal__autoBattleFrontierPanel.hidden)
        {
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
        }
    }
}
