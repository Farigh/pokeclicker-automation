/**
 * @class The AutomationDungeon regroups the 'Dungeon AutoFight' functionalities
 */
class AutomationDungeon
{
    static __autoDungeonLoop = null;

    static __isCompleted = false;
    static __bossPosition = null;
    static __chestPositions = [];
    static __previousTown = null;
    static __stopRequested = false;

    /**
     * @brief Builds the menu
     */
    static start()
    {
        // Hide the gym and dungeon fight menus by default and disable auto fight
        let dungeonTitle = '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
                         +     '&nbsp;Dungeon fight&nbsp;'
                         + '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">';
        let dungeonDiv = Automation.Menu.__addCategory("dungeonFightButtons", dungeonTitle);
        dungeonDiv.parentElement.hidden = true;

        // Add an on/off button
        let autoDungeonTooltip = "Automatically enters and completes the dungeon"
                               + Automation.Menu.__tooltipSeparator()
                               + "Chests and the boss are ignored until all tiles are revealed\n"
                               + "Chests are all picked right before fighting the boss";
        let autoDungeonButton = Automation.Menu.__addAutomationButton("AutoFight", "dungeonFightEnabled", autoDungeonTooltip, dungeonDiv, true);
        autoDungeonButton.addEventListener("click", this.__toggleDungeonFight.bind(this), false);

        // Disable by default
        this.__toggleDungeonFight(false);

        // Add an on/off button to stop after pokedex completion
        let autoStopDungeonTooltip = "Automatically disables the dungeon loop\n"
                                   + "once all pokemon are caught in this dungeon";
        let buttonLabel = 'Stop on <img src="assets/images/pokeball/Pokeball.svg" height="17px"> :';
        Automation.Menu.__addAutomationButton(buttonLabel, "stopDungeonAtPokedexCompletion", autoStopDungeonTooltip, dungeonDiv);

        // Set the div visibility watcher
        setInterval(this.__updateDivVisibility.bind(this), 200); // Refresh every 0.2s
    }

    /**
     * @brief Toggles the 'Dungeon AutoFight' feature
     *
     * If the feature was enabled and it's toggled to disabled, the auto attack loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the auto attack loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will used to set the right state.
     *                Otherwise, the cookie stored value will be used
     */
    static __toggleDungeonFight(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (localStorage.getItem("dungeonFightEnabled") === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__autoDungeonLoop === null)
            {
                // Set auto-dungeon loop
                this.__autoDungeonLoop = setInterval(this.__dungeonFightLoop.bind(this), 50); // Runs every game tick
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__autoDungeonLoop);
            this.__autoDungeonLoop = null;
        }
    }

    /**
     * @brief The Dungeon AutoFight loop
     *
     * It will automatically start the current dungeon.
     * Once started, it will automatically complete the dungeon, fighting every encounters in it.
     * Once every tiles are done exploring, all chests are collected.
     * Finally, the boss is defeated last.
     *
     * The chest are picked at the very end, right before fighting the boss to avoid losing time.
     * Indeed, picking a chest increases every upcomming encounters life.
     */
    static __dungeonFightLoop()
    {
        // Only initialize dungeon if:
        //    - The player is in a town (dungeons are attached to town)
        //    - The player has bought the dungeon ticket
        //    - The player has enought dungeon token
        if (App.game.gameState === GameConstants.GameState.town
            && (player.town() instanceof DungeonTown)
            && App.game.keyItems.hasKeyItem(KeyItemType.Dungeon_ticket)
            && (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() >= player.town().dungeon.tokenCost))
        {
            this.__previousTown = player.town().name;

            // Reset button status if either:
            //    - it was requested by another module
            //    - the pokedex is full for this dungeon, and it has been ask for
            if (this.__stopRequested
                || ((localStorage.getItem("stopDungeonAtPokedexCompletion") == "true")
                    && DungeonRunner.dungeonCompleted(player.town().dungeon, false)))
            {
                Automation.Menu.__forceAutomationState("dungeonFightEnabled", false);
                this.__stopRequested = false;
            }
            else
            {
                this.__isCompleted = false;
                DungeonRunner.initializeDungeon(player.town().dungeon);
            }
        }
        else if (App.game.gameState === GameConstants.GameState.dungeon)
        {
            // Let any fight finish before moving
            if (DungeonRunner.fightingBoss() || DungeonRunner.fighting())
            {
                return;
            }

            if (this.__isCompleted)
            {
                if (this.__chestPositions.length > 0)
                {
                    let chestLocation = this.__chestPositions.pop();
                    DungeonRunner.map.moveToTile(chestLocation);
                }
                else
                {
                    DungeonRunner.map.moveToTile(this.__bossPosition);
                }
            }

            let playerCurrentPosition = DungeonRunner.map.playerPosition();

            if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.boss)
            {
                // Persist the boss position, to go back to it once the board has been cleared
                this.__bossPosition = playerCurrentPosition;

                if (this.__isCompleted)
                {
                    DungeonRunner.startBossFight();
                    this.__resetSavedStates();
                    return;
                }
            }
            else if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.chest)
            {
                if (this.__isCompleted)
                {
                    DungeonRunner.openChest();
                    return;
                }
                else
                {
                    this.__chestPositions.push(playerCurrentPosition);
                }
            }

            let maxIndex = (DungeonRunner.map.board().length - 1);
            let isEvenRaw = ((maxIndex - playerCurrentPosition.y) % 2) == 0;
            let isLastTileOfTheRaw = (isEvenRaw && (playerCurrentPosition.x == maxIndex))
                                  || (!isEvenRaw && (playerCurrentPosition.x == 0));

            // Detect board ending and move to the boss if it's the case
            if ((playerCurrentPosition.y == 0) && isLastTileOfTheRaw)
            {
                this.__isCompleted = true;
                return;
            }

            // Go full left at the beginning of the map
            if (playerCurrentPosition.y == maxIndex)
            {
                if ((playerCurrentPosition.x != 0)
                    && !DungeonRunner.map.board()[playerCurrentPosition.y][playerCurrentPosition.x - 1].isVisited)
                {
                    DungeonRunner.map.moveLeft();
                    return;
                }
            }

            // Move up once a raw has been fully visited
            if (isLastTileOfTheRaw)
            {
                DungeonRunner.map.moveUp();
                return;
            }

            // Move right on even raws, left otherwise
            if (isEvenRaw)
            {
                DungeonRunner.map.moveRight();
            }
            else
            {
                DungeonRunner.map.moveLeft();
            }

            return;
        }
        // Else hide the menu, if we're not in the dungeon
        else
        {
            this.__previousTown = null;
            this.__resetSavedStates();
            Automation.Menu.__forceAutomationState("dungeonFightEnabled", false);
        }
    }

    /**
     * @brief Toggle the 'Dungeon AutoFight' category visibility based on the game state
     *
     * The category is only visible when a dungeon is actually available at the current position
     * (or if the player is already inside the dungeon)
     */
    static __updateDivVisibility()
    {
        let dungeonDiv = document.getElementById("dungeonFightButtons");
        dungeonDiv.hidden = !((App.game.gameState === GameConstants.GameState.dungeon)
                              || ((App.game.gameState === GameConstants.GameState.town)
                                  && (player.town() instanceof DungeonTown)));
    }

    /**
     * @brief Resets the internal data for the next run
     */
    static __resetSavedStates()
    {
        this.__bossPosition = null;
        this.__chestPositions = [];
        this.__isCompleted = false;
    }
}
