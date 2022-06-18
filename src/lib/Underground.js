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

    static __actionCount = 0;
    static __foundItems = [];

    /**
     * @brief Builds the menu, and retores previous running state if needed
     */
    static start()
    {
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
     * If the feature was enabled and it's toggled to disabled, the auto attack loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the auto attack loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will used to set the right state.
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
        if (!this.__isBombingPossible())
        {
            return;
        }

        this.__actionCount = 0;
        var miningLoop = setInterval(function()
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
                    this.__useTheBestItem(itemsState);
                    nothingElseToDo = false;
                }
            }

            if (nothingElseToDo)
            {
                Automation.Utils.__sendNotif("Performed mining actions " + this.__actionCount.toString() + " times,"
                                           + " energy left: " + Math.floor(App.game.underground.energy).toString() + "!",
                                             "Mining");
                clearInterval(miningLoop);
                return;
            }
        }.bind(this), 500); // Runs every 0.5s
    }

    /**
     * @brief Determines which tools to use according to @see __miningLoop strategy
     */
    static __useTheBestItem(itemsState)
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
            return;
        }

        let { useHammer, useToolX, useToolY } = this.__considerHammerUse(nextTilesToMine);

        if (useHammer)
        {
            Mine.hammer(useToolX, useToolY);
        }
        else
        {
            Mine.chisel(useToolX, useToolY);
        }
        this.__actionCount++;
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

        [...Array(Underground.sizeY).keys()].forEach(
            (row) =>
            {
                [...Array(Underground.sizeX).keys()].forEach(
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
