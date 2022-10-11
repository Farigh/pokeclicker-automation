/**
 * @class The AutomationDungeon regroups the 'Dungeon Auto Fight' functionalities
 */
class AutomationDungeon
{
    static Settings = {
                          FeatureEnabled: "Dungeon-FightEnabled",
                          StopOnPokedex: "Dungeon-FightStopOnPokedex",
                          BossRush: "Dungeon-BossRush",
                          SkipChests: "Dungeon-SkipChests"
                      };

    static InternalModes = {
                               None: 0,
                               StopAfterThisRun: 1,
                               BypassUserSettings: 2
                           };

    static AutomationRequestedMode = this.InternalModes.None;

    /**
     * @brief Builds the menu
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            // Disable Boss rush and chesk skipping by default
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.BossRush, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SkipChests, false);

            this.__internal__injectDungeonCss();
            this.__internal__buildMenu();

            // Disable the feature by default
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
        }
        else
        {
            // Set the div visibility watcher
            setInterval(this.__internal__updateDivVisibilityAndContent.bind(this), 200); // Refresh every 0.2s
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__autoDungeonLoop = null;

    static __internal__isShinyCatchStopMode = false;
    static __internal__isCompleted = false;
    static __internal__bossPosition = null;
    static __internal__chestPositions = [];
    static __internal__isFirstMove = true;
    static __internal__playerActionOccured = false;

    /**
     * @brief Injects the Dungeon menu css to the document heading
     */
    static __internal__injectDungeonCss()
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
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        // Hide the dungeon fight panel by default
        let dungeonTitle = '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="position:relative; bottom: 3px; transform: scaleX(-1);">'
                         +     '&nbsp;Dungeon fight&nbsp;'
                         + '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="position:relative; bottom: 3px;">';
        let dungeonDiv = Automation.Menu.addCategory("dungeonFightButtons", dungeonTitle);
        dungeonDiv.parentElement.hidden = true;

        // Add an on/off button
        let autoDungeonTooltip = "Automatically enters and completes the dungeon"
                               + Automation.Menu.TooltipSeparator
                               + "Chests and the boss are ignored until all tiles are revealed\n"
                               + "Chests are all picked right before fighting the boss";
        let autoDungeonButton = Automation.Menu.addAutomationButton("Auto Fight", this.Settings.FeatureEnabled, autoDungeonTooltip, dungeonDiv, true);
        autoDungeonButton.addEventListener("click", this.__internal__toggleDungeonFight.bind(this), false);

        // Add an on/off button to stop after pokedex completion
        let autoStopDungeonTooltip = "Automatically disables the dungeon loop\n"
                                   + "once all pokémon are caught in this dungeon."
                                   + Automation.Menu.TooltipSeparator
                                   + "You can switch between pokémon and shiny completion\n"
                                   + "by clicking on the pokéball image.";

        let buttonLabel = 'Stop on <span id="automation-dungeon-pokedex-img"><img src="assets/images/pokeball/Pokeball.svg" height="17px"></span> :';
        Automation.Menu.addAutomationButton(buttonLabel, this.Settings.StopOnPokedex, autoStopDungeonTooltip, dungeonDiv);

        // Add the button action
        let pokedexSwitch = document.getElementById("automation-dungeon-pokedex-img");
        pokedexSwitch.onclick = this.__internal__toggleCatchStopMode.bind(this);

        // Build advanced settings panel
        let dungeonSettingsPanel = Automation.Menu.addSettingPanel(autoDungeonButton.parentElement.parentElement, true);

        let titleDiv = Automation.Menu.createTitleElement("Dungeon advanced settings");
        titleDiv.style.marginBottom = "10px";
        dungeonSettingsPanel.appendChild(titleDiv);

        // Add boss rush button
        let bossRushTooltip = "Fight the boss as soon as its tile was found."
                            + Automation.Menu.TooltipSeparator
                            + "It will still collect any chests found, before fighting\n"
                            + "the boss, unless such setting was set as well.";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Complete as soon as the boss was found", this.Settings.BossRush, bossRushTooltip, dungeonSettingsPanel);

        // Add skip chests button
        let skipChestsTooltip = "Don't pick dungeon chests at all.";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Skip chests pickup", this.Settings.SkipChests, skipChestsTooltip, dungeonSettingsPanel);
    }

    /**
     * @brief Switched from Pokedex completion to Shiny pokedex completion mode
     */
    static __internal__toggleCatchStopMode()
    {
        // Switch mode
        this.__internal__isShinyCatchStopMode = !this.__internal__isShinyCatchStopMode;

        // Update the image accordingly
        let image = (this.__internal__isShinyCatchStopMode) ? "Pokeball-shiny" : "Pokeball";
        let pokedexSwitch = document.getElementById("automation-dungeon-pokedex-img");
        pokedexSwitch.innerHTML = `<img src="assets/images/pokeball/${image}.svg" height="17px">`;
    }

    /**
     * @brief Toggles the 'Dungeon Auto Fight' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static __internal__toggleDungeonFight(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__autoDungeonLoop === null)
            {
                // Reset internal members
                this.__internal__playerActionOccured = false;
                this.__internal__resetSavedStates();

                // Set auto-dungeon loop
                this.__internal__autoDungeonLoop = setInterval(this.__internal__dungeonFightLoop.bind(this), 50); // Runs every game tick
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__autoDungeonLoop);
            this.__internal__autoDungeonLoop = null;
        }
    }

    /**
     * @brief The Dungeon Auto Fight loop
     *
     * It will automatically start the current dungeon.
     * Once started, it will automatically complete the dungeon, fighting every encounters in it.
     * Once every tiles are done exploring, all chests are collected.
     * Finally, the boss is defeated last.
     *
     * The chest are picked at the very end, right before fighting the boss to avoid losing time.
     * Indeed, picking a chest increases every upcomming encounters life.
     */
    static __internal__dungeonFightLoop()
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
            // Reset button status if either:
            //    - it was requested by another module
            //    - the pokedex is full for this dungeon, and it has been ask for
            if ((this.AutomationRequestedMode != this.InternalModes.BypassUserSettings)
                && ((this.AutomationRequestedMode == this.InternalModes.StopAfterThisRun)
                    || this.__internal__playerActionOccured
                    || ((Automation.Utils.LocalStorage.getValue(this.Settings.StopOnPokedex) === "true")
                        && DungeonRunner.dungeonCompleted(player.town().dungeon, this.__internal__isShinyCatchStopMode))))
            {
                if (this.__internal__playerActionOccured)
                {
                    Automation.Utils.sendWarningNotif("User action detected, turning off the automation", "Dungeon");
                }

                Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
                this.AutomationRequestedMode = this.InternalModes.None;
            }
            else
            {
                this.__internal__isCompleted = false;
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

            if (this.__internal__isFirstMove)
            {
                this.__internal__ensureTheBoardIsInAnAcceptableState();
                this.__internal__isFirstMove = false;
                return;
            }

            if (this.__internal__isCompleted)
            {
                if ((this.__internal__chestPositions.length > 0)
                    && (Automation.Utils.LocalStorage.getValue(this.Settings.SkipChests) !== "true"))
                {
                    let chestLocation = this.__internal__chestPositions.pop();
                    DungeonRunner.map.moveToTile(chestLocation);
                }
                else
                {
                    DungeonRunner.map.moveToTile(this.__internal__bossPosition);
                }
            }

            let playerCurrentPosition = DungeonRunner.map.playerPosition();

            if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.boss)
            {
                // Persist the boss position, to go back to it once the board has been cleared
                this.__internal__bossPosition = playerCurrentPosition;

                if (this.__internal__isCompleted)
                {
                    DungeonRunner.startBossFight();
                    this.__internal__resetSavedStates();
                    return;
                }
                if (Automation.Utils.LocalStorage.getValue(this.Settings.BossRush) === "true")
                {
                    this.__internal__isCompleted = true;
                    return;
                }
            }
            else if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.chest)
            {
                if (this.__internal__isCompleted)
                {
                    DungeonRunner.openChest();
                    return;
                }
                else
                {
                    this.__internal__addChestPosition(playerCurrentPosition);
                }
            }

            // TODO: Handle multiple floors dungeons
            let currentFloor = DungeonRunner.map.playerPosition().floor;

            let maxIndex = (DungeonRunner.map.board()[currentFloor].length - 1);
            let isEvenRow = ((maxIndex - playerCurrentPosition.y) % 2) == 0;
            let isLastTileOfTheRow = (isEvenRow && (playerCurrentPosition.x == maxIndex))
                                  || (!isEvenRow && (playerCurrentPosition.x == 0));

            // Detect board ending and move to the boss if it's the case
            if ((playerCurrentPosition.y == 0) && isLastTileOfTheRow)
            {
                this.__internal__isCompleted = (this.__internal__bossPosition !== null);
                this.__internal__ensureTheBoardIsInAnAcceptableState();

                return;
            }

            // Go full left at the beginning of the map
            if ((playerCurrentPosition.y == maxIndex)
                && (playerCurrentPosition.x != 0)
                && !DungeonRunner.map.board()[currentFloor][playerCurrentPosition.y][playerCurrentPosition.x - 1].isVisited)
            {
                DungeonRunner.map.moveLeft();
            }
            // Move up once a row has been fully visited
            else if (isLastTileOfTheRow)
            {
                DungeonRunner.map.moveUp();
            }
            // Move right on even rows, left otherwise
            else if (isEvenRow)
            {
                DungeonRunner.map.moveRight();
            }
            else
            {
                DungeonRunner.map.moveLeft();
            }

            if (Automation.Utils.LocalStorage.getValue(this.Settings.BossRush) === "true")
            {
                playerCurrentPosition = DungeonRunner.map.playerPosition();

                // Don't consider the top row
                if (playerCurrentPosition.y == 0)
                {
                    return;
                }

                let positionToCheck = { x: playerCurrentPosition.x, y: playerCurrentPosition.y - 1 };
                let tileToCheck = DungeonRunner.map.board()[currentFloor][positionToCheck.y][positionToCheck.x];

                // Don't consider not-visible tiles
                if (!tileToCheck.isVisible)
                {
                    return;
                }

                // If the user has the flashlight, check for the boss or a chest presence on the tile above
                if (tileToCheck.type() === GameConstants.DungeonTile.boss)
                {
                    this.__internal__bossPosition = positionToCheck;
                    this.__internal__isCompleted = true;
                }
                else if (tileToCheck.type() === GameConstants.DungeonTile.chest)
                {
                    this.__internal__addChestPosition(positionToCheck);
                }
            }
        }
        // Else hide the menu and turn off the feature, if we're not in the dungeon anymore
        else
        {
            this.__internal__playerActionOccured = false;
            this.__internal__resetSavedStates();
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
    static __internal__ensureTheBoardIsInAnAcceptableState()
    {
        let startingTile = null;

        // TODO: Handle multiple floors dungeons
        let currentFloor = DungeonRunner.map.playerPosition().floor;

        for (const [ rowIndex, row ] of DungeonRunner.map.board()[currentFloor].entries())
        {
            for (const [ columnIndex, tile ] of row.entries())
            {
                // Ignore not visible tiles
                if (!tile.isVisible) continue;

                let currentLocation = { floor: currentFloor, x: columnIndex, y: rowIndex };

                if (DungeonRunner.map.hasAccessToTile(currentLocation))
                {
                    // Store chest positions
                    if (tile.type() === GameConstants.DungeonTile.chest)
                    {
                        this.__internal__addChestPosition(currentLocation);
                    }

                    if (tile.type() === GameConstants.DungeonTile.boss)
                    {
                        // Only tag the dungeon as completed if it's not the first move or any tile is visited apart from the entrance
                        this.__internal__isCompleted = (!this.__internal__isFirstMove) || DungeonRunner.map.board()[currentFloor].some(
                            (row) => row.some((tile) => tile.isVisited && (tile.type() !== GameConstants.DungeonTile.entrance)));
                        this.__internal__bossPosition = currentLocation;
                    }
                }

                // For the next part, ignore not visited tiles
                if (!tile.isVisited) continue;

                if ((rowIndex === (DungeonRunner.map.size - 1))
                    && (startingTile === null))
                {
                    startingTile = currentLocation;
                }

                if ((tile.type() !== GameConstants.DungeonTile.entrance)
                    && this.__internal__isFirstMove)
                {
                    this.__internal__playerActionOccured = true;
                }
            }
        }

        if (!this.__internal__isFirstMove)
        {
            this.__internal__playerActionOccured = this.__internal__playerActionOccured
                                                || !DungeonRunner.map.board()[currentFloor].every((row) => row.every((tile) => tile.isVisited));
        }

        // The boss was not found, reset the chest positions and move the player to the entrance, if not already there
        if (!this.__internal__isCompleted && this.__internal__playerActionOccured)
        {
            DungeonRunner.map.moveToTile(startingTile);
        }
    }

    /**
     * @brief Toggle the 'Dungeon fight' category visibility based on the game state
     *        Disables the 'Auto Fight' button if the feature can't be used
     *
     * The category is only visible when a dungeon is actually available at the current position
     * (or if the player is already inside the dungeon)
     *
     * The 'Auto Fight' button is disabled in the following cases:
     *   - The player did not buy the Dungeon ticket yet
     *   - The user enabled 'Stop on Pokedex' and all pokemon in the dungeon are already caught
     *   - The player does not have enough dungeon token to enter
     */
    static __internal__updateDivVisibilityAndContent()
    {
        let dungeonDiv = document.getElementById("dungeonFightButtons");
        dungeonDiv.hidden = !((App.game.gameState === GameConstants.GameState.dungeon)
                              || ((App.game.gameState === GameConstants.GameState.town)
                                  && (player.town() instanceof DungeonTown)));

        if (!dungeonDiv.hidden)
        {
            // Disable the Auto Fight button if the requirements are not met
            let disableNeeded = false;
            let disableReason = "";

            // Don't disable the button if the player is still in the dungeon
            if (App.game.gameState !== GameConstants.GameState.dungeon)
            {
                // The player might not have bought the dungeon ticket yet
                if (!App.game.keyItems.hasKeyItem(KeyItemType.Dungeon_ticket))
                {
                    disableNeeded = true;
                    disableReason = "You need to buy the Dungeon Ticket first";
                }

                // The 'stop on pokedex' feature might be enable and the pokedex already completed
                if ((this.AutomationRequestedMode != this.InternalModes.BypassUserSettings)
                    && (Automation.Utils.LocalStorage.getValue(this.Settings.StopOnPokedex) == "true")
                    && DungeonRunner.dungeonCompleted(player.town().dungeon, this.__internal__isShinyCatchStopMode))
                {
                    disableNeeded = true;
                    disableReason += (disableReason !== "") ? "\nAnd all " : "All ";

                    if (this.__internal__isShinyCatchStopMode)
                    {
                        disableReason += "shiny ";
                    }

                    disableReason += "pokémons are already caught,\nand the option to stop in this case is enabled";
                }

                // The player does not have enough dugeon token
                if (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() < player.town().dungeon.tokenCost)
                {
                    disableNeeded = true;

                    disableReason += (disableReason !== "") ? "\nAnd you " : "You ";
                    disableReason += "do not have enough Dungeon Token to enter";
                }
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
    static __internal__addChestPosition(position)
    {
        if (!this.__internal__chestPositions.some((pos) => (pos.x == position.x) && (pos.y == position.y)))
        {
            this.__internal__chestPositions.push(position);
        }
    }

    /**
     * @brief Resets the internal data for the next run
     */
    static __internal__resetSavedStates()
    {
        this.__internal__bossPosition = null;
        this.__internal__chestPositions = [];
        this.__internal__isCompleted = false;
        this.__internal__isFirstMove = true;
    }
}
