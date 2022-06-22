/**
 * @class The AutomationUnderground regroups the 'Mining' functionalities
 *
 * @note The underground is not accessible right away when starting a new game.
 *       This menu will be hidden until the functionality is unlocked in-game.
 */
class AutomationUnderground
{
    static __undergroundContainer = null;

    static __autoMiningLoop = null;
    static __innerMiningLoop = null;

    static __actionCount = 0;
    static __foundItems = [];

    /**
     * @brief Builds the menu, and retores previous running state if needed
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        // Only consider the BuildMenu init step
        if (initStep != Automation.InitSteps.BuildMenu) return;

        // Add the related button to the automation menu
        this.__undergroundContainer = document.createElement("div");
        Automation.Menu.__automationButtonsDiv.appendChild(this.__undergroundContainer);

        Automation.Menu.__addSeparator(this.__undergroundContainer);

        // Only display the menu when the underground is unlocked
        if (!App.game.underground.canAccess())
        {
            this.__undergroundContainer.hidden = true;
            this.__setUndergroundUnlockWatcher();
        }

        let autoMiningTooltip = "Automatically mine in the Underground"
                              + Automation.Menu.__tooltipSeparator()
                              + "Bombs will be used until all items have at least one visible tile\n"
                              + "The hammer will then be used if more than 3 blocks\n"
                              + "can be destroyed on an item within its range\n"
                              + "The chisel will then be used to finish the remaining blocks\n";
        let miningButton = Automation.Menu.__addAutomationButton("Mining", "autoMiningEnabled", autoMiningTooltip, this.__undergroundContainer);
        miningButton.addEventListener("click", this.__toggleAutoMining.bind(this), false);

        // Restore previous session state
        this.__toggleAutoMining();
    }

    /**
     * @brief Watches for the in-game functionality to be unlocked.
     *        Once unlocked, the menu will be displayed to the user
     */
    static __setUndergroundUnlockWatcher()
    {
        let watcher = setInterval(function()
        {
            if (App.game.underground.canAccess())
            {
                clearInterval(watcher);
                this.__undergroundContainer.hidden = false;
                this.__toggleAutoMining();
            }
        }.bind(this), 10000); // Check every 10 seconds
    }

    /**
     * @brief Toggles the 'Mining' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the cookie stored value will be used
     */
    static __toggleAutoMining(enable)
    {
        if (!App.game.underground.canAccess())
        {
            return;
        }

        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (localStorage.getItem("autoMiningEnabled") === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__autoMiningLoop === null)
            {
                // Set auto-mine loop
                this.__autoMiningLoop = setInterval(this.__miningLoop.bind(this), 10000); // Runs every 10 seconds
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__autoMiningLoop);
            this.__autoMiningLoop = null;
        }
    }

    /**
     * @brief Ensures that using a bomb is possible
     *
     * It is possible is the player has enough energy and the current mining board is not completed already
     *
     * @returns True if a bombing action is possible, False otherwise
     */
    static __isBombingPossible()
    {
        return ((Math.floor(App.game.underground.energy) >= Underground.BOMB_ENERGY)
                && (Mine.itemsFound() < Mine.itemsBuried()));
    }

    /**
     * @brief The Mining loop
     *
     * Automatically mines item in the underground.
     * The following strategy is used:
     *   - Use a bomb until at least one tile of each item is revealed
     *   - Then, use the hammer on covered blocks, if at least three tiles can be removed that way
     *   - Finally use the chisel to reveal the remaining tiles
     */
    static __miningLoop()
    {
        // Don't run an additionnal loop if the player do not have enough energy
        // or if a loop is already in progress
        if ((this.__innerMiningLoop !== null) || !this.__isBombingPossible())
        {
            return;
        }

        this.__actionCount = 0;
        this.__innerMiningLoop = setInterval(function()
        {
            let nothingElseToDo = true;

            if (this.__autoMiningLoop !== null)
            {
                let itemsState = this.__getItemsState();

                let areAllItemRevealed = true;
                itemsState.forEach(
                    (item) =>
                    {
                        areAllItemRevealed &= item.revealed;
                    });

                if (!areAllItemRevealed)
                {
                    // Bombing is the best strategy until all items have at least one revealed spot
                    if (this.__isBombingPossible())
                    {
                        // Mine using bombs until the board is completed or the energy is depleted
                        Mine.bomb();
                        this.__actionCount++;
                        nothingElseToDo = false;
                    }
                }
                else
                {
                    nothingElseToDo = !this.__tryUseTheBestItem(itemsState);
                }
            }

            if (nothingElseToDo)
            {
                Automation.Utils.__sendNotif("Performed mining actions " + this.__actionCount.toString() + " times,"
                                           + " energy left: " + Math.floor(App.game.underground.energy).toString() + "!",
                                             "Mining");
                clearInterval(this.__innerMiningLoop);
                this.__innerMiningLoop = null;
                return;
            }
        }.bind(this), 300); // Runs every 0.3s
    }

    /**
     * @brief Determines which tools to use according to @see __miningLoop strategy, and tries to use it
     *
     * @returns True if some action are still possible after the current move, false otherwise (if the player does not have enough energy)
     */
    static __tryUseTheBestItem(itemsState)
    {
        let nextTilesToMine = [];

        itemsState.forEach(
            (item) =>
            {
                if (!item.completed)
                {
                    nextTilesToMine = nextTilesToMine.concat(item.tiles);
                }
            });

        // Only consider unrevealed tiles
        nextTilesToMine = nextTilesToMine.filter((tile) => !tile.revealed);

        if (nextTilesToMine.length == 0)
        {
            return true;
        }

        let { useHammer, useToolX, useToolY } = this.__considerHammerUse(nextTilesToMine);

        let result = false;
        if (useHammer)
        {
            result = (App.game.underground.energy >= Underground.HAMMER_ENERGY);
            Mine.hammer(useToolX, useToolY);
        }
        else
        {
            result = (App.game.underground.energy >= Underground.CHISEL_ENERGY);
            Mine.chisel(useToolX, useToolY);
        }

        if (result)
        {
            this.__actionCount++;
        }

        return result;
    }

    /**
     * @brief Determines if using the hammer is relevant (at least 3 tiles reachable in one use)
     *
     * @param nextTilesToMine: The list of tiles left to mine
     *
     * @returns A struct { useHammer, useToolX, useToolY }, where:
     *          @c useHammer is a boolean indicating if the use is relevant
     *          @c useToolX and @c useToolY are the position where the use is relevant
     */
    static __considerHammerUse(nextTilesToMine)
    {
        let bestReachableTilesAmount = 0;
        let bestReachableTileX = 0;
        let bestReachableTileY = 0;

        nextTilesToMine.forEach(
            (tile) =>
            {
                // Compute the best tile for hammer
                let reachableTilesAmount = 0;
                nextTilesToMine.forEach(
                    (other) =>
                    {
                        // Consider tiles in th range of the hammer only
                        if (!other.revealed
                            && other.x <= (tile.x + 1)
                            && other.x >= (tile.x - 1)
                            && other.y <= (tile.y + 1)
                            && other.y >= (tile.y - 1))
                        {
                            reachableTilesAmount++;
                        }
                    });

                if (reachableTilesAmount > bestReachableTilesAmount)
                {
                    bestReachableTilesAmount = reachableTilesAmount;
                    bestReachableTileX = tile.x;
                    bestReachableTileY = tile.y;
                }
            });

        let useHammer = (bestReachableTilesAmount >= 3)
        let useToolX = useHammer ? bestReachableTileX : nextTilesToMine[0].x;
        let useToolY = useHammer ? bestReachableTileY : nextTilesToMine[0].y;
        return { useHammer, useToolX, useToolY };
    }

    /**
     * @brief Processes the mine tiles and gathers the state of the hidden items
     *
     * For each item, the following information will be gathered:
     *    - The id of the item
     *    - If the item is completed (ie. all tiles are revealed)
     *    - If the item is revealed (at least one tile is revealed)
     *    - The status of each tile of the item:
     *        - Its x and y coordinates
     *        - Wether it's revealed
     *
     * @returns The gathered information
     */
    static __getItemsState()
    {
        let itemsState = new Map();

        [...Array(Mine.rewardGrid.length).keys()].forEach(
            (row) =>
            {
                [...Array(Mine.rewardGrid[row].length).keys()].forEach(
                    (column) =>
                    {
                        let content = Mine.rewardGrid[row][column];
                        if (content !== 0)
                        {
                            if (!itemsState.has(content.value))
                            {
                                itemsState.set(content.value,
                                               {
                                                   id: content.value,
                                                   completed: true,
                                                   revealed: false,
                                                   tiles: []
                                               });
                            }

                            let itemData = itemsState.get(content.value);
                            itemData.completed &= content.revealed;
                            itemData.revealed |= content.revealed;
                            itemData.tiles.push({ x: row, y: column, revealed: content.revealed });
                        }
                    });
            });

        return itemsState;
    }
}
