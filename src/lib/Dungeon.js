/**
 * @class The AutomationDungeon regroups the 'Dungeon Auto Fight' functionalities
 */
class AutomationDungeon
{
    static Settings = {
                          FeatureEnabled: "Dungeon-FightEnabled",
                          StopOnPokedex: "Dungeon-FightStopOnPokedex",
                          BossCatchPokeballToUse: "Dungeon-BossCatchPokeballToUse",
                          AvoidEncounters: "Dungeon-AvoidEncounters",
                          SkipChests: "Dungeon-SkipChests",
                          SkipBoss: "Dungeon-SkipBoss"
                      };

    static InternalModes = {
                               None: 0,
                               StopAfterThisRun: 1,
                               ForceDungeonCompletion: 2,
                               ForcePokemonFight: 3
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
            // Disable encounters, chests and boss skipping by default
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AvoidEncounters, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SkipChests, false);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SkipBoss, false);

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
    static __internal__pokedexSwitch = null;
    static __internal__dungeonFightButton = null;
    static __internal__dungeonBossCatchPokeballSelectElem = null;
    static __internal__userDefinedPokeballToRestore = null;
    static __internal__userDefinedContagiousPokeballToRestore = null;

    static __internal__isShinyCatchStopMode = false;
    static __internal__floorEndPosition = null;
    static __internal__chestPositions = [];
    static __internal__isFirstMove = true;
    static __internal__playerActionOccured = false;
    static __internal__isRecovering = false;

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
        const dungeonTitle = '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="position: relative; bottom: 3px; transform: scaleX(-1);">'
                           +     '&nbsp;Dungeon fight&nbsp;'
                           + '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="position: relative; bottom: 3px;">';
        const dungeonDiv = Automation.Menu.addCategory("dungeonFightButtons", dungeonTitle);
        this.__internal__dungeonFightButton = dungeonDiv.parentElement;
        this.__internal__dungeonFightButton.hidden = true;

        // Add an on/off button
        const autoDungeonTooltip = "Automatically enters and completes the dungeon"
                                 + Automation.Menu.TooltipSeparator
                                 + "Chests and the boss are ignored until all tiles are revealed\n"
                                 + "Chests are all picked right before fighting the boss";
        const autoDungeonButton =
            Automation.Menu.addAutomationButton("Auto Fight", this.Settings.FeatureEnabled, autoDungeonTooltip, dungeonDiv, true);
        autoDungeonButton.addEventListener("click", this.__internal__toggleDungeonFight.bind(this), false);

        // Add an on/off button to stop after pokedex completion
        const autoStopDungeonTooltip = "Automatically disables the dungeon loop\n"
                                     + "once all pokémon are caught in this dungeon."
                                     + Automation.Menu.TooltipSeparator
                                     + "You can switch between pokémon and shiny completion\n"
                                     + "by clicking on the pokéball image.";

        const buttonLabel =
            'Stop on <span id="automation-dungeon-pokedex-img"><img src="assets/images/pokeball/Pokeball.svg" height="17px"></span> :';
        Automation.Menu.addAutomationButton(buttonLabel, this.Settings.StopOnPokedex, autoStopDungeonTooltip, dungeonDiv);

        // Add the pokéball click action
        this.__internal__pokedexSwitch = document.getElementById("automation-dungeon-pokedex-img");
        this.__internal__pokedexSwitch.onclick = this.__internal__toggleCatchStopMode.bind(this);

        // Build advanced settings
        this.__internal__buildAdvancedSettings(autoDungeonButton.parentElement.parentElement);
    }

    /**
     * @brief Builds the 'Dungeon' feature advanced settings panel
     *
     * @param {Element} parent: The parent div to add the settings to
     */
    static __internal__buildAdvancedSettings(parent)
    {
        // Build advanced settings panel
        const dungeonSettingsPanel = Automation.Menu.addSettingPanel(parent, true);

        const titleDiv = Automation.Menu.createTitleElement("Dungeon advanced settings");
        titleDiv.style.marginBottom = "10px";
        dungeonSettingsPanel.appendChild(titleDiv);

        // Add the boss catch option
        const bossCatchPokeballTooltip = "Defines which pokeball will be equipped to catch\n"
                                       + "pokémons, before fighting the dungeon boss"
                                       + Automation.Menu.TooltipSeparator
                                       + "Selecting 'None' will leave the in-game value unchanged";
        this.__internal__dungeonBossCatchPokeballSelectElem =
            Automation.Menu.addPokeballList("selectedDungeonBossCatchPokeball",
                                            dungeonSettingsPanel,
                                            this.Settings.BossCatchPokeballToUse,
                                            "Pokéball to equip for the boss :",
                                            bossCatchPokeballTooltip,
                                            true);

        // Add some space
        dungeonSettingsPanel.appendChild(document.createElement("br"));

        // Add the avoid encounters button
        const avoidEncountersTooltip = "If enabled, it will only fight battles that are not avoidable."
                                     + Automation.Menu.TooltipSeparator
                                     + "This setting only applies when the torchlight has been unlocked\n"
                                     + "(after 200 clears in the current dungeon)."
                                     + Automation.Menu.TooltipSeparator
                                     + "It will still collect any chests found, before fighting\n"
                                     + "the boss, unless it was disabled as well.";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Skip as many fights as possible", this.Settings.AvoidEncounters, avoidEncountersTooltip, dungeonSettingsPanel);

        // Add the skip chests button
        const skipChestsTooltip = "Don't pick dungeon chests at all.";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Skip chests pickup", this.Settings.SkipChests, skipChestsTooltip, dungeonSettingsPanel);

        // Add the skip boss button
        const skipBossTooltip = "Don't fight the dungeon boss at all."
                              + Automation.Menu.TooltipSeparator
                              + "It will exit the dungeon as soon as the other automation conditions are met";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Skip the boss fight", this.Settings.SkipBoss, skipBossTooltip, dungeonSettingsPanel);
    }

    /**
     * @brief Switches between Pokedex completion and Shiny pokedex completion mode
     */
    static __internal__toggleCatchStopMode()
    {
        // Switch mode
        this.__internal__isShinyCatchStopMode = !this.__internal__isShinyCatchStopMode;

        // Update the image accordingly
        const image = (this.__internal__isShinyCatchStopMode) ? "Pokeball-shiny" : "Pokeball";
        this.__internal__pokedexSwitch.innerHTML = `<img src="assets/images/pokeball/${image}.svg" height="17px">`;
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

                // Reset the currently used pokeball
                // (as the player might switch the ball during the dungeon process, the value should only be saved right before the boss fight)
                this.__internal__userDefinedPokeballToRestore = null;
                this.__internal__userDefinedContagiousPokeballToRestore = null;

                // Set auto-dungeon loop
                this.__internal__autoDungeonLoop = setInterval(this.__internal__dungeonFightLoop.bind(this), 50); // Runs every game tick
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__autoDungeonLoop);
            this.__internal__autoDungeonLoop = null;

            // Restore the pokeball used to catch pokémons
            if (this.__internal__userDefinedPokeballToRestore != null)
            {
                App.game.pokeballs.alreadyCaughtSelection = this.__internal__userDefinedPokeballToRestore;
                Automation.Utils.Battle.setAlreadyCaughtContagiousSelection(this.__internal__userDefinedContagiousPokeballToRestore);
            }
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
        const forceDungeonProcessing = (this.AutomationRequestedMode == this.InternalModes.ForceDungeonCompletion)
                                    || (this.AutomationRequestedMode == this.InternalModes.ForcePokemonFight);

        const avoidFights = (Automation.Utils.LocalStorage.getValue(this.Settings.AvoidEncounters) === "true")
                         && (this.AutomationRequestedMode != this.InternalModes.ForcePokemonFight);
        const skipChests = (Automation.Utils.LocalStorage.getValue(this.Settings.SkipChests) === "true");
        const skipBoss = (Automation.Utils.LocalStorage.getValue(this.Settings.SkipBoss) === "true")
                      && !forceDungeonProcessing;

        // Just to be safe, it should never happen, since the button should have been disabled
        if (avoidFights && skipChests && skipBoss)
        {
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
            return;
        }

        // Only initialize dungeon if:
        //    - The player is in a town (dungeons are attached to town)
        //    - The player has bought the dungeon ticket
        //    - The player has enough dungeon token
        if (App.game.gameState === GameConstants.GameState.town
            && Automation.Utils.isInstanceOf(player.town(), "DungeonTown")
            && App.game.keyItems.hasKeyItem(KeyItemType.Dungeon_ticket)
            && (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() >= player.town().dungeon.tokenCost))
        {
            // Reset button status if either:
            //    - it was requested by another module
            //    - the pokedex is full for this dungeon, and it has been ask for
            if (!forceDungeonProcessing
                && ((this.AutomationRequestedMode == this.InternalModes.StopAfterThisRun)
                    || this.__internal__playerActionOccured
                    || ((Automation.Utils.LocalStorage.getValue(this.Settings.StopOnPokedex) === "true")
                        && DungeonRunner.dungeonCompleted(player.town().dungeon, this.__internal__isShinyCatchStopMode))))
            {
                if (this.__internal__playerActionOccured)
                {
                    Automation.Notifications.sendWarningNotif("User action detected, turning off the automation", "Dungeon");
                }

                Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
                this.AutomationRequestedMode = this.InternalModes.None;
            }
            else
            {
                this.__internal__resetSavedStates();
                DungeonRunner.initializeDungeon(player.town().dungeon);

                // Restore the pokeball used to catch pokémons
                if (this.__internal__userDefinedPokeballToRestore != null)
                {
                    App.game.pokeballs.alreadyCaughtSelection = this.__internal__userDefinedPokeballToRestore;
                    Automation.Utils.Battle.setAlreadyCaughtContagiousSelection(this.__internal__userDefinedContagiousPokeballToRestore);
                }
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

            const flatBoard = DungeonRunner.map.board()[DungeonRunner.map.playerPosition().floor].flat();
            // If recovering, only end if all tiles are visited, otherwise, when all cells are visible
            const nonVisibleTiles = this.__internal__isRecovering ? flatBoard.filter((tile) => !tile.isVisited)
                                                                  : flatBoard.filter((tile) => !tile.isVisible);
            const visibleEnemiesCount = flatBoard.filter((tile) => tile.isVisible && (tile.type() === GameConstants.DungeonTile.enemy)).length;
            const visibleChestsCount = this.__internal__chestPositions.length;
            const foundFloorEndTile = this.__internal__floorEndPosition != null;
            // Check if all relevant tiles have been explored for each category
            // Either we are skipping fights, or all fights are won
            const areAllBattleDefeated = avoidFights || (visibleEnemiesCount === (DungeonRunner.map.totalFights() - DungeonRunner.encountersWon()));
            // Either we are skipping chests, or all remaining chests are visible
            const areAllChestsCollected = skipChests
                                       || (visibleChestsCount === (DungeonRunner.map.totalChests() - DungeonRunner.chestsOpened()))
                                       || (foundFloorEndTile && !DungeonRunner.map.flash && avoidFights);

            // If all conditions are met, or all cells are visible clean up the map and move on
            // If all cells are visible, advance even if not all objectives are met, because there might be more on the next floor
            if ((nonVisibleTiles.length === 0) || (areAllBattleDefeated && areAllChestsCollected && (skipBoss || foundFloorEndTile)))
            {
                if (!avoidFights && (visibleEnemiesCount > 0))
                {
                    // There are some enemies left to fight, the rest of the loop will handle them
                }
                else if (!skipChests && (visibleChestsCount > 0))
                {
                    // There are some chests left to collect, collect the first of them
                    const chestLocation = this.__internal__chestPositions.pop();

                    // The player probably moved to the next floor manually, skip it
                    if (chestLocation.floor != DungeonRunner.map.playerPosition().floor)
                    {
                        this.__internal__chestPositions = [];
                        return;
                    }

                    this.__internal__moveToCell(chestLocation);
                    DungeonRunner.openChest();
                    return;
                }
                else if (DungeonRunner.map.playerPosition().floor < (DungeonRunner.map.floorSizes.length - 1))
                {
                    if (foundFloorEndTile)
                    {
                        this.__internal__moveToCell(this.__internal__floorEndPosition);
                        // Reset current floor states before moving to the next one
                        this.__internal__chestPositions = [];
                        this.__internal__floorEndPosition = null;
                        // Do not call DungeonRunner.nextFloor() directly, as it has no checks
                        DungeonRunner.handleClick();
                    }
                    else
                    {
                        // The player probably moved manually, reset the state to try again
                        this.__internal__ensureTheBoardIsInAnAcceptableState();
                    }
                    return;

                }
                else if (skipBoss)
                {
                    // The only thing remaining is the boss, and we are skipping it, so simply leave the dungeon
                    const floor = DungeonRunner.map.playerPosition().floor;
                    const floorSize = DungeonRunner.map.floorSizes[floor];
                    const entranceTile = { floor, x: Math.floor(floorSize / 2), y: (floorSize - 1) };
                    this.__internal__moveToCell(entranceTile);
                    DungeonRunner.dungeonLeave();
                    return;
                }
                else
                {
                    if (foundFloorEndTile)
                    {
                        this.__internal__moveToCell(this.__internal__floorEndPosition);

                        // Equip the selected pokeball (if None is set, keep the user in-game setting)
                        const ballToCatchBoss = this.__internal__dungeonBossCatchPokeballSelectElem.value;
                        if (ballToCatchBoss != GameConstants.Pokeball.None)
                        {
                            // Save the currently used pokeball
                            this.__internal__userDefinedPokeballToRestore = App.game.pokeballs.alreadyCaughtSelection;
                            this.__internal__userDefinedContagiousPokeballToRestore = App.game.pokeballs.alreadyCaughtContagiousSelection;

                            App.game.pokeballs.alreadyCaughtSelection = ballToCatchBoss;
                            Automation.Utils.Battle.setAlreadyCaughtContagiousSelection(ballToCatchBoss);
                        }

                        DungeonRunner.startBossFight();
                    }
                    else
                    {
                        // The player probably moved manually, reset the state to try again
                        this.__internal__ensureTheBoardIsInAnAcceptableState();
                    }
                    return;
                }
            }

            // If the flashight is unlocked, use it to avoid fighting every encounters
            if (DungeonRunner.map.flash)
            {
                this.__internal__handleFlashPathing();
            }
            else
            {
                this.__internal__handleNormalPathing();
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
     * @brief Handles the pathing when the player does not have the flashlight unlocked
     *
     * It will try to move back and forth on each row, from bottom to top
     */
    static __internal__handleNormalPathing()
    {
        const playerCurrentPosition = DungeonRunner.map.playerPosition();

        const maxIndex = (DungeonRunner.map.board()[playerCurrentPosition.floor].length - 1);
        const isEvenRow = ((maxIndex - playerCurrentPosition.y) % 2) == 0;
        const isLastTileOfTheRow = (isEvenRow && (playerCurrentPosition.x == maxIndex))
                                || (!isEvenRow && (playerCurrentPosition.x == 0));

        if ((playerCurrentPosition.y == 0) && isLastTileOfTheRow)
        {
            // Nothing else to do
            // If we get here, the player moved manually, so we need to check the state again
            this.__internal__ensureTheBoardIsInAnAcceptableState();
            return;
        }

        // Go full left at the beginning of the map
        if ((playerCurrentPosition.y == maxIndex)
            && (playerCurrentPosition.x != 0)
            && !DungeonRunner.map.board()[playerCurrentPosition.floor][playerCurrentPosition.y][playerCurrentPosition.x - 1].isVisited)
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

        // Mark the current cell features
        const point = DungeonRunner.map.playerPosition();
        this.__internal__markCell({ ...point, tile: DungeonRunner.map.board()[point.floor][point.y][point.x] });
    }

    /**
     * @brief Handles the pathing when the player has the flashlight unlocked
     *
     * It will try to uncover all the tiles, avoiding as many encounters as possible
     */
    static __internal__handleFlashPathing()
    {
        const floor = DungeonRunner.map.playerPosition().floor;
        const currentBoard = DungeonRunner.map.board()[floor];
        // Transform the board into a flat array of cells (a cell is a tile + its position)
        const allCells = currentBoard.flatMap((row, y) => row.map((tile, x) => ({ tile, x, y, floor })));
        const accessibleUnvisitedTiles = allCells.filter(
            ({ tile, x, y, floor }) => tile.isVisible && !tile.isVisited && DungeonRunner.map.hasAccessToTile({ x, y, floor }));
        const nonEnemyCells = accessibleUnvisitedTiles.filter(({ tile }) => tile.type() !== GameConstants.DungeonTile.enemy);
        const enemyCells = accessibleUnvisitedTiles.filter(({ tile }) => tile.type() === GameConstants.DungeonTile.enemy);
        if (nonEnemyCells.length > 0)
        {
            const bestEmptyCell = this.__internal__getCellWithMostNonVisitedNeightbours(nonEnemyCells);
            // Only bother to move if it will reveal anything
            if (bestEmptyCell.nonVisitedNeighborsCount > 0)
            {
                this.__internal__moveToCell(bestEmptyCell);
                this.__internal__markAdjacentTiles();
                return;
            }
        }

        if (enemyCells.length > 0)
        {
            const bestEnemyCell = this.__internal__getCellWithMostNonVisitedNeightbours(enemyCells);
            this.__internal__moveToCell(bestEnemyCell);
            this.__internal__markAdjacentTiles();
        }
    }

    /**
     * @brief Returns the cell with the most non-visited neighbours
     *
     * @param {Array} cellsToChooseFrom: The list of cells to analyze
     */
    static __internal__getCellWithMostNonVisitedNeightbours(cellsToChooseFrom)
    {
        let cellWithMostNonVisitedNeighbors = { nonVisitedNeighborsCount: 0 };
        for (const cell of cellsToChooseFrom)
        {
            const nonVisitedNeighborsCount = this.__internal__getNonVisitedNeighboursCount(cell);
            if (nonVisitedNeighborsCount >= cellWithMostNonVisitedNeighbors.nonVisitedNeighborsCount)
            {
                cellWithMostNonVisitedNeighbors = { ...cell, nonVisitedNeighborsCount: nonVisitedNeighborsCount };
            }
        }
        return cellWithMostNonVisitedNeighbors;
    }

    /**
     * @brief Counts how many non-visited neighbours a cell has
     *
     * @param point: The coordinate of the cell to analyze, in the shape {x, y, floor}
     *
     * @returns The amount of non-visited neighbours
     */
    static __internal__getNonVisitedNeighboursCount(point)
    {
        const neighbors = DungeonRunner.map.nearbyTiles(point);
        return neighbors.filter((tile) => !tile.isVisited).length;
    }

    /**
     * @brief Marks boss and chest tiles in the given @p cell
     *
     * @param cell: The cell to analyze, in the shape {x, y, floor, tile}
     */
    static __internal__markCell(cell)
    {
        const cellType = cell.tile.type();
        if ((cellType === GameConstants.DungeonTile.boss)
            || (cellType === GameConstants.DungeonTile.ladder))
        {
            this.__internal__floorEndPosition = cell;
        }
        else if (cellType === GameConstants.DungeonTile.chest)
        {
            this.__internal__addChestPosition(cell);
        }
    }

    /**
     * @brief Marks relevant features for each adjacent tiles
     *
     * This should only be used if the player has flashlight unlocked, otherwise this info is not supposed to be known
     */
    static __internal__markAdjacentTiles()
    {
        const point = DungeonRunner.map.playerPosition();
        // Cant use the map.nearbyTiles() function as it doesn't return the coordinates
        const nearbyCells = this.__internal__nearbyCells(point);
        for (const cell of nearbyCells)
        {
            this.__internal__markCell(cell);
        }
    }

    /**
     * @brief Returns the list of neighbouring cells
     *
     * This is similar to the map.nearbyTiles() function, but it returns the coordinates as well
     *
     * @param point: The coordinate of the cell to get the neighbors of, in the shape {x, y, floor}
     */
    static __internal__nearbyCells(point)
    {
        const neighbors = [];
        const board = DungeonRunner.map.board()[point.floor];
        neighbors.push({tile: board[point.y - 1]?.[point.x], y: point.y - 1, x: point.x, floor: point.floor});
        neighbors.push({tile: board[point.y + 1]?.[point.x], y: point.y + 1, x: point.x, floor: point.floor});
        neighbors.push({tile: board[point.y]?.[point.x - 1], y: point.y, x: point.x - 1, floor: point.floor});
        neighbors.push({tile: board[point.y]?.[point.x + 1], y: point.y, x: point.x + 1, floor: point.floor});
        return neighbors.filter(t => t.tile);
    }

    /**
     * @brief Helper method to call moveToCoordinates given a cell
     *
     * This is used instead of moveToTile because calling moveToTile directly skips some code
     * which will causes the loop to get stuck in some cases
     *
     * Calling moveToCoordinates is the same as clicking on the cell in the UI
     *
     * @param cell: The cell to move to, in the shape {x, y, floor}
     */
    static __internal__moveToCell(cell)
    {
        DungeonRunner.map.moveToCoordinates(cell.x, cell.y, cell.floor);
    }

    /**
     * @brief Ensures that the board is in an acceptable state.
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

        const currentFloor = DungeonRunner.map.playerPosition().floor;

        for (const [ rowIndex, row ] of DungeonRunner.map.board()[currentFloor].entries())
        {
            for (const [ columnIndex, tile ] of row.entries())
            {
                // Ignore not visible tiles
                if (!tile.isVisible) continue;

                const currentLocation = { floor: currentFloor, x: columnIndex, y: rowIndex };

                if (DungeonRunner.map.hasAccessToTile(currentLocation))
                {
                    this.__internal__markCell({ ...currentLocation, tile });
                }

                // For the next part, ignore not visited tiles
                if (!tile.isVisited) continue;

                if ((rowIndex === (DungeonRunner.map.floorSizes[currentFloor] - 1))
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
            // Consider that an action occured is there is any not-visited cell in the room
            this.__internal__playerActionOccured = this.__internal__playerActionOccured
                                                || !DungeonRunner.map.board()[currentFloor].every((row) => row.every((tile) => tile.isVisited));
        }

        // Every tile is visible, but the boss was not found (it is inaccessible). Check all squares
        if ((this.__internal__floorEndPosition == null) && DungeonRunner.map.board()[currentFloor].flat().every(tile => tile.isVisible))
        {
            this.__internal__isRecovering = true;
        }

        // The boss was not found, reset the chest positions and move the player to the entrance, if not already there
        if (!this.__internal__floorEndPosition && this.__internal__playerActionOccured)
        {
            this.__internal__moveToCell(startingTile);
        }

        // Don't bother with player action if the player got the flash-light
        this.__internal__playerActionOccured &= !DungeonRunner.map.flash;
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
        this.__internal__dungeonFightButton.hidden = !((App.game.gameState === GameConstants.GameState.dungeon)
                                                       || ((App.game.gameState === GameConstants.GameState.town)
                                                           && Automation.Utils.isInstanceOf(player.town(), "DungeonTown")));

        if (!this.__internal__dungeonFightButton.hidden)
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
                if ((this.AutomationRequestedMode != this.InternalModes.ForceDungeonCompletion)
                    && (this.AutomationRequestedMode != this.InternalModes.ForcePokemonFight)
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

                // All objectives are marked to be skipped
                if ((Automation.Utils.LocalStorage.getValue(this.Settings.AvoidEncounters) === "true")
                    && (Automation.Utils.LocalStorage.getValue(this.Settings.SkipChests) === "true")
                    && (Automation.Utils.LocalStorage.getValue(this.Settings.SkipBoss) === "true"))
                {
                    disableNeeded = true;
                    disableReason += (disableReason !== "") ? "\nAnd all " : "All ";
                    disableReason += "objectives are marked to be skipped"
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
        if (!this.__internal__chestPositions.some((pos) => (pos.x == position.x) && (pos.y == position.y) && (pos.floor == position.floor)))
        {
            this.__internal__chestPositions.push(position);
        }
    }

    /**
     * @brief Resets the internal data for the next run
     */
    static __internal__resetSavedStates()
    {
        this.__internal__floorEndPosition = null;
        this.__internal__chestPositions = [];
        this.__internal__isFirstMove = true;
        this.__internal__isRecovering = false;
    }
}
