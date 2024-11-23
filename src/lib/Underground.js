/**
 * @class The AutomationUnderground regroups the 'Mining' functionalities
 *
 * @note The underground is not accessible right away when starting a new game.
 *       This menu will be hidden until the functionality is unlocked in-game.
 */
class AutomationUnderground
{
    static Settings = {
                          FeatureEnabled: "Mining-Enabled"
                      };

    /**
     * @brief Builds the menu, and retores previous running state if needed
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        // Only consider the BuildMenu init step
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            this.__internal__buildMenu();
        }
        else
        {
            // Restore previous session state
            this.toggleAutoMining();
        }
    }

    /**
     * @brief Toggles the 'Mining' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static toggleAutoMining(enable)
    {
        if (!App.game.underground.canAccess())
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
            // Warn the user if no autorestart mine have been set
            if (!Settings.getSetting('autoRestartUndergroundMine').value)
            {
                Automation.Notifications.sendWarningNotif("Please consider enabling the ingame 'mine auto restart feature'\n"
                                                        + "If you don't, the automation will be stuck after clearing the current layout",
                                                          "Mining");
            }

            // Only set a loop if there is none active
            if (this.__internal__autoMiningLoop === null)
            {
                // Set auto-mine loop
                this.__internal__autoMiningLoop = setInterval(this.__internal__miningLoop.bind(this), 10000); // Runs every 10 seconds
                this.__internal__miningLoop();
            }
        }
        else
        {
            // Unregister the loops
            clearInterval(this.__internal__autoMiningLoop);
            this.__internal__autoMiningLoop = null;
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__undergroundContainer = null;

    static __internal__autoMiningLoop = null;
    static __internal__innerMiningLoop = null;

    static __internal__actionCount = 0;
    static __internal__canUseHammer = false;
    static __internal__canUseChisel = false;

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        // Add the related button to the automation menu
        this.__internal__undergroundContainer = document.createElement("div");
        Automation.Menu.AutomationButtonsDiv.appendChild(this.__internal__undergroundContainer);

        Automation.Menu.addSeparator(this.__internal__undergroundContainer);

        // Only display the menu when the underground is unlocked
        if (!App.game.underground.canAccess())
        {
            this.__internal__undergroundContainer.hidden = true;
            this.__internal__setUndergroundUnlockWatcher();
        }

        const autoMiningTooltip = "Automatically mine in the Underground"
                                + Automation.Menu.TooltipSeparator
                                + "Survey will be used as soon as available, unless all items were already found\n"
                                + "If equipped, the battery discharge will be used as soon as charged\n"
                                + "Bombs will be used as soon as available, unless all items were already found\n"
                                + "If the bomb's durability is maxed-out, it will be used regardless";

        const miningButton =
            Automation.Menu.addAutomationButton("Mining", this.Settings.FeatureEnabled, autoMiningTooltip, this.__internal__undergroundContainer);
        miningButton.addEventListener("click", this.toggleAutoMining.bind(this), false);
    }

    /**
     * @brief Watches for the in-game functionality to be unlocked.
     *        Once unlocked, the menu will be displayed to the user
     */
    static __internal__setUndergroundUnlockWatcher()
    {
        let watcher = setInterval(function()
        {
            if (App.game.underground.canAccess())
            {
                clearInterval(watcher);
                this.__internal__undergroundContainer.hidden = false;
                this.toggleAutoMining();
            }
        }.bind(this), 10000); // Check every 10 seconds
    }

    /**
     * @brief The main Mining loop
     *
     * It will try to run the mining inner loop if it's not already active
     */
    static __internal__miningLoop()
    {
        // Don't run an additionnal loop if another one is already in progress
        if (this.__internal__innerMiningLoop !== null)
        {
            return;
        }

        this.__internal__actionCount = 0;
        this.__internal__innerMiningLoop = setInterval(function()
            {
                // Stop the loop if the main feature loop was stopped, or no action was possible
                if ((this.__internal__autoMiningLoop == null)
                    || !this.__internal__tryUseOneMiningItem())
                {
                    // Only notify the user if at least one action occured
                    if (this.__internal__actionCount > 0)
                    {
                        Automation.Notifications.sendNotif(`Performed mining actions ${this.__internal__actionCount.toString()} times!`,
                                                           "Mining");
                    }
                    clearInterval(this.__internal__innerMiningLoop);
                    this.__internal__innerMiningLoop = null;
                }
            }.bind(this), 300); // Runs every 0.3s
    }

    /**
     * @brief The inner Mining loop - Automatically mines item in the underground.
     *
     * The following strategy is used:
     *   - Use a survey if available, unless all items were already found
     *   - Use the batterie discharge if available
     *   - Use a bomb if available, unless all items were already found
     *   - Use a bomb regardless, if its durability is maxed out
     *   - Tries to use the best possible tool to:
     *     - Complete a partially found item (@see __internal__tryUseBestToolOnPartiallyFoundItem)
     *
     * @return True if an action occured, false otherwise
     */
    static __internal__tryUseOneMiningItem()
    {
        let actionOccured = false;

        const centerMostCellCoord = { x: App.game.underground.mine.width / 2, y: App.game.underground.mine.height / 2 };
        const areAllItemFound = App.game.underground.mine.itemsPartiallyFound == App.game.underground.mine.itemsBuried;

        // Try to use the Survey, unless all items were already found
        if (!areAllItemFound && App.game.underground.tools.getTool(UndergroundToolType.Survey).canUseTool())
        {
            // Use the survey on the center-most cell
            App.game.underground.tools.useTool(UndergroundToolType.Survey, centerMostCellCoord.x, centerMostCellCoord.y);
            actionOccured = true;
        }

        // Try to use the battery discharge
        if (!actionOccured && App.game.oakItems.isActive(OakItemType.Cell_Battery)
            && (App.game.underground.battery.charges == App.game.underground.battery.maxCharges))
        {
            App.game.underground.battery.discharge();
            actionOccured = true;
        }

        // Try to use the Bomb, unless all items were already found
        // If the bomb if fully charged, use it anyway
        const bombTool = App.game.underground.tools.getTool(UndergroundToolType.Bomb);
        if (!actionOccured
            && (!areAllItemFound || (bombTool.durability == 1))
            && bombTool.canUseTool())
        {
            // Use the bomb on the center-most cell
            App.game.underground.tools.useTool(UndergroundToolType.Bomb, centerMostCellCoord.x, centerMostCellCoord.y);
            actionOccured = true;
        }

        this.__internal__canUseHammer = App.game.underground.tools.getTool(UndergroundToolType.Hammer).canUseTool();
        this.__internal__canUseChisel = App.game.underground.tools.getTool(UndergroundToolType.Chisel).canUseTool();

        if (!actionOccured && (this.__internal__canUseHammer || this.__internal__canUseChisel))
        {
            actionOccured = this.__internal__tryUseBestToolOnPartiallyFoundItem();
        }

        if (actionOccured)
        {
            this.__internal__actionCount++;
        }

        return actionOccured;
    }

    /**
     * @brief Tries to complete any already partially discovered item
     *
     * @return True if an action occured, false otherwise
     */
    static __internal__tryUseBestToolOnPartiallyFoundItem()
    {
        // No partially found item
        if (App.game.underground.mine.itemsPartiallyFound == App.game.underground.mine.itemsFound)
        {
            return false;
        }

        let selectedBestMove = null;

        for (const itemData of this.__internal__getPartiallyRevealedItems())
        {
            selectedBestMove = this.__internal__selectBestMove(selectedBestMove, this.__internal__getPartiallyRevealedItemBestMove(itemData));
        }

        if (selectedBestMove == null)
        {
            return false;
        }

        App.game.underground.tools.useTool(selectedBestMove.tool, selectedBestMove.coord.x, selectedBestMove.coord.y);
        return true;
    }

    /**
     * @brief Determines the best tool to use to reveal a partially found item
     *
     * @param itemData: The partially found item data
     *
     * @return The best possible move
     */
    static __internal__getPartiallyRevealedItemBestMove(itemData)
    {
        let selectedBestMove = null;

        for (const itemCell of itemData.cells)
        {
            // Only consider actions on hidden cells with visible neighbor
            if (itemCell.isRevealed || !this.__internal__cellHasVisibleNeighbor(itemData, itemCell))
            {
                continue;
            }

            if (this.__internal__canUseHammer)
            {
                selectedBestMove = this.__internal__selectBestMove(selectedBestMove, this.__internal__getHammerUseEfficiency(itemData, itemCell));
            }

            // Don't even consider Chisel if it can be used and the best move efficiency is lower than 2 cell layers
            if (!this.__internal__canUseChisel || ((selectedBestMove != null) && (selectedBestMove.efficiency >= 2)))
            {
                continue;
            }

            // The chisel efficiency is at most 2 cell layers
            const chiselMove =
                {
                    tool: UndergroundToolType.Chisel,
                    efficiency: Math.max(itemCell.cell.layerDepth, 2),
                    coord: itemCell.coord
                };
            selectedBestMove = this.__internal__selectBestMove(selectedBestMove, chiselMove);
        }

        return selectedBestMove;
    }

    /**
     * @brief Extracts the partially revealed items data
     *
     * @returns The list of partially revealed items
     */
    static __internal__getPartiallyRevealedItems()
    {
        let result = [];

        for (const itemData of this.__internal__getAllItems().values())
        {
            // Only consider items that have at least one revealed cell, and is not already completed
            if (!itemData.cells[0].cell.reward.rewarded
                && itemData.cells.some(cell => cell.isRevealed))
            {
                result.push(itemData);
            }
        }

        return result;
    }

    /**
     * @brief Extracts every items data
     *
     * @returns The map of item's [ Id, Cells ]
     *          Where Cells is an object containing a cells list of { cell, coord, isRevealed }
     */
    static __internal__getAllItems()
    {
        let items = new Map();

        for (const [ index, cell ] of App.game.underground.mine.grid.entries())
        {
            // Only consider cells containing an item
            if (cell.reward == undefined)
            {
                continue;
            }

            if (!items.has(cell.reward.rewardID))
            {
                items.set(cell.reward.rewardID, { cells: [] });
            }

            const cellData = items.get(cell.reward.rewardID);
            cellData.cells.push(
                {
                    cell,
                    coord: App.game.underground.mine.getCoordinateForGridIndex(index),
                    isRevealed: (cell.layerDepth === 0)
                });
        }

        return items;
    }

    /**
     * @brief Gets the best move amongst the provided options
     *
     * @param currentBestMove: The current best move
     * @param candidate: The best move candidate
     *
     * @return The best option between the @p currentBestMove and the @p candidate
     */
    static __internal__selectBestMove(currentBestMove, candidate)
    {
        if (candidate == null)
        {
            return currentBestMove;
        }

        if ((currentBestMove == null)
            || (candidate.efficiency > currentBestMove.efficiency))
        {
            return candidate;
        }

        // Favour Hammer use of chisel in case the efficiency is the same
        if ((candidate.efficiency == currentBestMove.efficiency)
            && (candidate.tool == UndergroundToolType.Hammer))
        {
            return candidate;
        }

        return currentBestMove;
    }

    /**
     * @brief Checks if a cell has at least one visible neighbor
     *
     * @param itemData: The partially found item data
     * @param cell: The cell to check
     *
     * @return True if the cell has at least one visible neighbor, false otherwise
     */
    static __internal__cellHasVisibleNeighbor(itemData, cell)
    {
        for (const cellCandidate of itemData.cells)
        {
            if (!cellCandidate.isRevealed)
            {
                continue;
            }

            const xDistance = Math.abs(cellCandidate.coord.x - cell.coord.x)
            const yDistance = Math.abs(cellCandidate.coord.y - cell.coord.y)

            if ((xDistance + yDistance) == 1)
            {
                return true;
            }
        }

        return false;
    }

    /**
     * @brief Computes the hammer use info if used on the given @p cell
     *
     * @param itemData: The partially found item data
     * @param cell: The cell to check
     *
     * @return The given cell hammer use info
     */
    static __internal__getHammerUseEfficiency(itemData, cell)
    {
        let efficiency = 0;

        // TODO (23/11/2024): Consider other items in some cases (both revealed ?)
        for (const cellCandidate of itemData.cells)
        {
            if (cellCandidate.isRevealed)
            {
                continue;
            }

            const xDistance = Math.abs(cellCandidate.coord.x - cell.coord.x)
            const yDistance = Math.abs(cellCandidate.coord.y - cell.coord.y)

            // TODO (23/11/2024): Consider blocks at a range of 2 in some cases
            if ((xDistance + yDistance) <= 1)
            {
                efficiency++;
            }
        }

        return {
                   tool: UndergroundToolType.Hammer,
                   efficiency,
                   coord: cell.coord
               };
    }
}
