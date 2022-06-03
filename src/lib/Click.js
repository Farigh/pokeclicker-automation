/**
 * @class The AutomationClick regroups the 'Auto attack' button and 'Best route' button functionalities
 */
class AutomationClick
{
    static __autoClickLoop = null;
    static __bestRouteLoop = null;

    /**
     * @brief Builds the menu, and retores previous running state if needed
     *
     * The 'Best Route' functionality is disabled by default (if never set in a previous session)
     */
    static start()
    {
        // Disable best route by default
        if (localStorage.getItem("bestRouteClickEnabled") == null)
        {
            localStorage.setItem("bestRouteClickEnabled", false);
        }

        // Add auto click button
        let autoClickTooltip = "Attack clicks are performed every 50ms"
                             + Automation.Menu.__tooltipSeparator()
                             + "Applies to battle, gym and dungeon";
        let autoClickButton = Automation.Menu.__addAutomationButton("Auto attack", "autoClickEnabled", autoClickTooltip);
        autoClickButton.addEventListener("click", this.__toggleAutoClick.bind(this), false);
        this.__toggleAutoClick();

        // Add best route button
        let bestRouteTooltip = "Automatically moves to the best route"
                             + Automation.Menu.__tooltipSeparator()
                             + "Such route is the highest unlocked one\n"
                             + "with HP lower than Click Attack";
        let bestRouteButton = Automation.Menu.__addAutomationButton("Best route", "bestRouteClickEnabled", bestRouteTooltip);

        // Toogle best route loop on click
        bestRouteButton.addEventListener("click", this.__toggleBestRoute.bind(this), false);

    }

    /**
     * @brief Toggles the 'Auto attack' feature
     *
     * If the feature was enabled and it's toggled to disabled, the auto attack loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the auto attack loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will used to set the right state.
     *                Otherwise, the cookie stored value will be used
     */
    static __toggleAutoClick(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (localStorage.getItem("autoClickEnabled") === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__autoClickLoop === null)
            {
                // Set auto-click loop
                this.__autoClickLoop = setInterval(this.__autoClick.bind(this), 50); // The app hard-caps click attacks at 50
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__autoClickLoop);
            this.__autoClickLoop = null;
        }
    }

    /**
     * @brief Toggles the 'Best route' feature
     *
     * If the feature was enabled and it's toggled to disabled, the auto attack loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the auto attack loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will used to set the right state.
     *                Otherwise, the cookie stored value will be used
     */
    static __toggleBestRoute(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (localStorage.getItem("bestRouteClickEnabled") === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__bestRouteLoop === null)
            {
                // Set best route refresh loop
                this.__bestRouteLoop = setInterval(this.__goToBestRoute.bind(this), 10000); // Refresh every 10s
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__bestRouteLoop);
            this.__bestRouteLoop = null;
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
    static __autoClick()
    {
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
    }

    /**
     * @brief Moves the player to the best route for EXP farming
     *
     * If the user is in a state in which he cannot de moved, the 'Best Route' feature is automatically disabled.
     * This includes:
     *   - Being in an instance
     *   - Using the 'Gym AutoFight' feature
     *   - Using the 'Dungeon AutoFight' feature
     *
     * @todo (03/06/2022): Disable the best route button in such case to inform the user
     *                     that the feature cannot be used at the moment
     *
     * @see Utils.Route.__moveToBestRouteForExp
     */
    static __goToBestRoute()
    {
        // Disable best route if any other auto-farm is enabled, or an instance is in progress, and exit
        if ((localStorage.getItem("dungeonFightEnabled") == "true")
            || (localStorage.getItem("gymFightEnabled") == "true")
            || Automation.Utils.__isInInstanceState())
        {
            Automation.Menu.__forceAutomationState("bestRouteClickEnabled", false);

            return;
        }

        Automation.Utils.Route.__moveToBestRouteForExp();
    }
}
