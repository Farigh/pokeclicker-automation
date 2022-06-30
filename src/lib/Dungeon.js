/**
 * @class The AutomationDungeon regroups the 'Dungeon AutoFight' functionalities
 */
class AutomationDungeon
{
    static __autoDungeonLoop = null;

    static __isShinyCatchStopMode = false;
    static __isCompleted = false;
    static __bossPosition = null;
    static __chestPositions = [];
    static __previousTown = null;
    static __isFirstMove = true;
    static __playerActionOccured = false;

    static Settings = {
                          FeatureEnabled: "Dungeon-FightEnabled",
                          StopOnPokedex: "Dungeon-FightStopOnPokedex"
                      };

    static InternalMode = {
                              None: 0,
                              StopAfterThisRun: 1,
                              ByPassUserSettings: 2
                          };

    static __internalModeRequested = this.InternalMode.None;

    /**
     * @brief Builds the menu
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        // Only consider the BuildMenu init step
        if (initStep != Automation.InitSteps.BuildMenu) return;

        this.__injectDungeonCss();

        // Hide the gym and dungeon fight menus by default and disable auto fight
        let dungeonTitle = '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
                         +     '&nbsp;Dungeon fight&nbsp;'
                         + '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">';
        let dungeonDiv = Automation.Menu.addCategory("dungeonFightButtons", dungeonTitle);
        dungeonDiv.parentElement.hidden = true;

        // Add an on/off button
        let autoDungeonTooltip = "Automatically enters and completes the dungeon"
                               + Automation.Menu.TooltipSeparator
                               + "Chests and the boss are ignored until all tiles are revealed\n"
                               + "Chests are all picked right before fighting the boss";
        let autoDungeonButton = Automation.Menu.addAutomationButton("AutoFight", this.Settings.FeatureEnabled, autoDungeonTooltip, dungeonDiv, true);
        autoDungeonButton.addEventListener("click", this.__toggleDungeonFight.bind(this), false);

        // Disable by default
        Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);

        // Add an on/off button to stop after pokedex completion
        let autoStopDungeonTooltip = "Automatically disables the dungeon loop\n"
                                   + "once all pokemon are caught in this dungeon."
                                   + Automation.Menu.TooltipSeparator
                                   + "You can switch between pokemon and shiny completion\n"
                                   + "by clicking on the pokeball image.";

        let buttonLabel = 'Stop on <span id="automation-dungeon-pokedex-img"><img src="assets/images/pokeball/Pokeball.svg" height="17px"></span> :';
        Automation.Menu.addAutomationButton(buttonLabel, this.Settings.StopOnPokedex, autoStopDungeonTooltip, dungeonDiv);

        // Add the button action
        let pokedexSwitch = document.getElementById("automation-dungeon-pokedex-img");
        pokedexSwitch.onclick = this.__toggleCatchStopMode.bind(this);

        // Set the div visibility watcher
        setInterval(this.__updateDivVisibilityAndContent.bind(this), 200); // Refresh every 0.2s
    }

    /**
     * @brief Injects the Dungeon menu css to the document heading
     */
    static __injectDungeonCss()
    {
        const style = document.createElement('style');
        style.textContent = `#automation-dungeon-pokedex-img
                             {
                                 position:relative;
                                 cursor: pointer;
                             }
                             #automation-dungeon-pokedex-img::after, #automation-dungeon-pokedex-img::before
                             {
                                 display: inline-block;
                                 width: 17px;
                                 height: 17px;
                                 position: absolute;
                                 left: 0px;
                                 bottom: 0px;
                                 border-radius: 50%;
                                 border-width: 0px;
                                 content: '';
                                 opacity: 0%;
                             }
                             #automation-dungeon-pokedex-img::before
                             {
                                 background-color: transparent;
                             }
                             #automation-dungeon-pokedex-img::after
                             {
                                 background-color: #ccccff;
                             }
                             #automation-dungeon-pokedex-img:hover::before
                             {
                                 opacity: 100%;
                                 box-shadow: 0px 0px 2px 1px #178fd7;
                             }
                             #automation-dungeon-pokedex-img:hover::after
                             {
                                 opacity: 20%;
                             }`;
        document.head.append(style);
    }

    /**
     * @brief Switched from Pokedex completion to Shiny pokedex completion mode
     */
    static __toggleCatchStopMode()
    {
        // Switch mode
        this.__isShinyCatchStopMode = !this.__isShinyCatchStopMode;

        // Update the image accordingly
        let image = (this.__isShinyCatchStopMode) ? "Pokeball-shiny" : "Pokeball";
        let pokedexSwitch = document.getElementById("automation-dungeon-pokedex-img");
        pokedexSwitch.innerHTML = `<img src="assets/images/pokeball/${image}.svg" height="17px">`;
    }

    /**
     * @brief Toggles the 'Dungeon AutoFight' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the cookie stored value will be used
     */
    static __toggleDungeonFight(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__autoDungeonLoop === null)
            {
                // Reset internal members
                this.__playerActionOccured = false;
                this.__resetSavedStates();

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
        //    - The player has enough dungeon token
        if (App.game.gameState === GameConstants.GameState.town
            && (player.town() instanceof DungeonTown)
            && App.game.keyItems.hasKeyItem(KeyItemType.Dungeon_ticket)
            && (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() >= player.town().dungeon.tokenCost))
        {
            this.__previousTown = player.town().name;

            // Reset button status if either:
            //    - it was requested by another module
            //    - the pokedex is full for this dungeon, and it has been ask for
            if ((this.__internalModeRequested != this.InternalMode.ByPassUserSettings)
                && ((this.__internalModeRequested == this.InternalMode.StopAfterThisRun)
                    || this.__playerActionOccured
                    || ((Automation.Utils.LocalStorage.getValue(this.Settings.StopOnPokedex) === "true")
                        && DungeonRunner.dungeonCompleted(player.town().dungeon, this.__isShinyCatchStopMode))))
            {
                if (this.__playerActionOccured)
                {
                    Automation.Utils.__sendWarningNotif("User action detected, turning off the automation", "Dungeon");
                }

                Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
                this.__internalModeRequested = this.InternalMode.None;
            }
            else
            {
                this.__isCompleted = false;
                DungeonRunner.initializeDungeon(player.town().dungeon);
            }
        }
        else if (App.game.gameState === GameConstants.GameState.dungeon)
        {
            // Let any fight or catch finish before moving
            if (DungeonRunner.fightingBoss() || DungeonRunner.fighting() || DungeonBattle.catching())
            {
                return;
            }

            if (this.__isFirstMove)
            {
                this.__ensureTheBoardIsInAnAcceptableState();
                this.__isFirstMove = false;
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
                    this.__addChestPosition(playerCurrentPosition);
                }
            }

            let maxIndex = (DungeonRunner.map.board().length - 1);
            let isEvenRaw = ((maxIndex - playerCurrentPosition.y) % 2) == 0;
            let isLastTileOfTheRaw = (isEvenRaw && (playerCurrentPosition.x == maxIndex))
                                  || (!isEvenRaw && (playerCurrentPosition.x == 0));

            // Detect board ending and move to the boss if it's the case
            if ((playerCurrentPosition.y == 0) && isLastTileOfTheRaw)
            {
                this.__isCompleted = (this.__bossPosition !== null);
                this.__ensureTheBoardIsInAnAcceptableState();

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
        // Else hide the menu and turn off the feature, if we're not in the dungeon anymore
        else
        {
            this.__previousTown = null;
            this.__playerActionOccured = false;
            this.__resetSavedStates();
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
        }
    }

    /**
     * @brief Ensure the board is in an acceptable state.
     *        If any chest or boss tile are visible, store them in the internal variables, if not already done.
     *        If any player interaction is detected, and the boss was not found, move the player to the left-most visited tile of the bottom-most row
     *
     * The player is considered to have interfered if:
     *   - It's the first automation move and any tile was already visited apart from the entrance
     *   - It's the last automation move and any tile is still unvisited
     */
    static __ensureTheBoardIsInAnAcceptableState()
    {
        let startingTile = null;

        DungeonRunner.map.board().forEach(
            (row, rowIndex) =>
            {
                row.forEach(
                    (tile, columnIndex) =>
                    {
                        // Ignore not visible tiles
                        if (!tile.isVisible) return;

                        let currentLocation = { x: columnIndex, y: rowIndex };

                        if (DungeonRunner.map.hasAccesToTile(currentLocation))
                        {
                            // Store chest positions
                            if (tile.type() === GameConstants.DungeonTile.chest)
                            {
                                this.__addChestPosition(currentLocation);
                            }

                            if (tile.type() === GameConstants.DungeonTile.boss)
                            {
                                // Only tag the dungeon as completed if it's not the first move or any tile is visited apart from the entrance
                                this.__isCompleted = (!this.__isFirstMove)
                                                  || DungeonRunner.map.board().some((row) => row.some((tile) => tile.isVisited && (tile.type() !== GameConstants.DungeonTile.entrance)));
                                this.__bossPosition = currentLocation;
                            }
                        }

                        // For the next part, ignore not visited tiles
                        if (!tile.isVisited) return;

                        if ((rowIndex === (DungeonRunner.map.size - 1))
                            && (startingTile === null))
                        {
                            startingTile = currentLocation;
                        }

                        if ((tile.type() !== GameConstants.DungeonTile.entrance)
                            && this.__isFirstMove)
                        {
                            this.__playerActionOccured = true;
                        }
                    });
            });

        if (!this.__isFirstMove)
        {
            this.__playerActionOccured = this.__playerActionOccured || !DungeonRunner.map.board().every((row) => row.every((tile) => tile.isVisited));
        }

        // The boss was not found, reset the chest positions and move the player to the entrance, if not already there
        if (!this.__isCompleted && this.__playerActionOccured)
        {
            DungeonRunner.map.moveToTile(startingTile);
        }
    }

    /**
     * @brief Toggle the 'Dungeon fight' category visibility based on the game state
     *        Disables the 'AutoFight' button if the feature can't be used
     *
     * The category is only visible when a dungeon is actually available at the current position
     * (or if the player is already inside the dungeon)
     *
     * The 'AutoFight' button is disabled in the following cases:
     *   - The player did not buy the Dungeon ticket yet
     *   - The user enabled 'Stop on Pokedex' and all pokemon in the dungeon are already caught
     *   - The player does not have enough dungeon token to enter
     */
    static __updateDivVisibilityAndContent()
    {
        let dungeonDiv = document.getElementById("dungeonFightButtons");
        dungeonDiv.hidden = !((App.game.gameState === GameConstants.GameState.dungeon)
                              || ((App.game.gameState === GameConstants.GameState.town)
                                  && (player.town() instanceof DungeonTown)));

        // Don't disable the button if the player is still in the dungeon
        if (!dungeonDiv.hidden
            && (App.game.gameState !== GameConstants.GameState.dungeon))
        {
            // Disable the AutoFight button if the requirements are not met
            let disableNeeded = false;
            let disableReason = "";

            // The player might not have bought the dungeon ticket yet
            if (!App.game.keyItems.hasKeyItem(KeyItemType.Dungeon_ticket))
            {
                disableNeeded = true;
                disableReason = "You need to buy the Dungeon Ticket first";
            }

            // The 'stop on pokedex' feature might be enable and the pokedex already completed
            if ((this.__internalModeRequested != this.InternalMode.ByPassUserSettings)
                && (Automation.Utils.LocalStorage.getValue(this.Settings.StopOnPokedex) == "true")
                && DungeonRunner.dungeonCompleted(player.town().dungeon, this.__isShinyCatchStopMode))
            {
                disableNeeded = true;
                disableReason += (disableReason !== "") ? "\nAnd all " : "All ";

                if (this.__isShinyCatchStopMode)
                {
                    disableReason += "shiny ";
                }

                disableReason += "pokemons are already caught,\nand the option to stop in this case is enabled";
            }

            // The player does not have enough dugeon token
            if (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() < player.town().dungeon.tokenCost)
            {
                disableNeeded = true;

                disableReason += (disableReason !== "") ? "\nAnd you " : "You ";
                disableReason += "do not have enough Dungeon Token to enter";
            }

            if (disableNeeded)
            {
                Automation.Menu.setButtonDisabledState(this.Settings.FeatureEnabled, true, disableReason);
            }
            else
            {
                Automation.Menu.setButtonDisabledState(this.Settings.FeatureEnabled, false);
            }
        }
    }

    /**
     * @brief Adds the given @p position to the check list, if not already added.
     */
    static __addChestPosition(position)
    {
        if (!this.__chestPositions.some((pos) => (pos.x == position.x) && (pos.y == position.y)))
        {
            this.__chestPositions.push(position);
        }
    }

    /**
     * @brief Resets the internal data for the next run
     */
    static __resetSavedStates()
    {
        this.__bossPosition = null;
        this.__chestPositions = [];
        this.__isCompleted = false;
        this.__isFirstMove = true;
    }
}
