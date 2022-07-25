/**
 * @class The AutomationUnderground regroups the 'Mining' functionalities
 *
 * @note The underground is not accessible right away when starting a new game.
 *       This menu will be hidden until the functionality is unlocked in-game.
 */
class AutomationUnderground
{
    static Settings = { FeatureEnabled: "Mining-Enabled" };
    static UseSmallRestoreAsked = false;

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
        this.__internal__undergroundContainer = document.createElement("div");
        Automation.Menu.AutomationButtonsDiv.appendChild(this.__internal__undergroundContainer);

        Automation.Menu.addSeparator(this.__internal__undergroundContainer);

        // Only display the menu when the underground is unlocked
        if (!App.game.underground.canAccess())
        {
            this.__internal__undergroundContainer.hidden = true;
            this.__internal__setUndergroundUnlockWatcher();
        }

        let autoMiningTooltip = "Automatically mine in the Underground"
                              + Automation.Menu.TooltipSeparator
                              + "Bombs will be used until all items have at least one visible tile\n"
                              + "The hammer will then be used if more than 3 blocks\n"
                              + "can be destroyed on an item within its range\n"
                              + "The chisel will then be used to finish the remaining blocks\n";
        let miningButton =
            Automation.Menu.addAutomationButton("Mining", this.Settings.FeatureEnabled, autoMiningTooltip, this.__internal__undergroundContainer);
        miningButton.addEventListener("click", this.toggleAutoMining.bind(this), false);

        // Restore previous session state
        this.toggleAutoMining();
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
            // Only set a loop if there is none active
            if (this.__internal__autoMiningLoop === null)
            {
                // Set auto-mine loop
                this.__internal__autoMiningLoop = setInterval(this.__internal__miningLoop.bind(this), 10000); // Runs every 10 seconds
            }
        }
        else
        {
            // Unregister the loop
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
     * @brief Ensures that using a bomb is possible
     *
     * It is possible is the player has enough energy and the current mining board is not completed already
     *
     * @returns True if a bombing action is possible, False otherwise
     */
    static __internal__isBombingPossible()
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
            let nothingElseToDo = true;

            if (this.__internal__autoMiningLoop !== null)
            {
                // Restore energy if needed
                this.__internal__restoreUndergroundEnergyIfUnderThreshold(5);

                let itemsState = this.__internal__getItemsState();

                let areAllItemRevealed = true;
                for (const item of itemsState.values())
                {
                    areAllItemRevealed &= item.revealed;
                }

                if (!areAllItemRevealed)
                {
                    // Bombing is the best strategy until all items have at least one revealed spot
                    if (this.__internal__isBombingPossible())
                    {
                        // Mine using bombs until the board is completed or the energy is depleted
                        Mine.bomb();
                        this.__internal__actionCount++;
                        nothingElseToDo = false;
                    }
                }
                else
                {
                    nothingElseToDo = !this.__internal__tryUseTheBestItem(itemsState);
                }
            }

            if (nothingElseToDo)
            {
                if (this.__internal__actionCount > 0)
                {
                    Automation.Utils.sendNotif(`Performed mining actions ${this.__internal__actionCount.toString()} times,`
                                             + ` energy left: ${Math.floor(App.game.underground.energy).toString()}!`,
                                               "Mining");
                }
                clearInterval(this.__internal__innerMiningLoop);
                this.__internal__innerMiningLoop = null;
                return;
            }
        }.bind(this), 300); // Runs every 0.3s
    }

    /**
     * @brief Tries to buy some Small Restore if the player's amount goes under the provided @p amount
     *
     * @param amount: The minimum amount to have in stock at all time
     */
    static __internal__restoreUndergroundEnergyIfUnderThreshold(amount)
    {
        // Only use Small Restore item if:
        //    - The user allowed it
        //    - It can be bought (ie. the Cinnabar Island store is unlocked)
        if ((!this.UseSmallRestoreAsked)
            || !TownList["Cinnabar Island"].isUnlocked())
        {
            return;
        }

        let currentEnergy = Math.floor(App.game.underground.energy);

        if (currentEnergy < 20)
        {
            // Use the small restore since it's the one with best cost/value ratio
            let smallRestoreItemName = GameConstants.EnergyRestoreSize[GameConstants.EnergyRestoreSize.SmallRestore];
            let smallRestoreCount = player.itemList[smallRestoreItemName]();
            let item = ItemList[smallRestoreItemName];

            if (smallRestoreCount < amount)
            {
                if (item.totalPrice(amount) < App.game.wallet.currencies[item.currency]())
                {
                    item.buy(amount);
                    smallRestoreCount += 5;
                }
            }
            if (smallRestoreCount > 0)
            {
                item.use();
            }
        }
    }

    /**
     * @brief Determines which tools to use according to @see __internal__miningLoop strategy, and tries to use it
     *
     * @param {Map} itemsState: The map of item states
     *
     * @returns True if some action are still possible after the current move, false otherwise (if the player does not have enough energy)
     */
    static __internal__tryUseTheBestItem(itemsState)
    {
        let nextTilesToMine = [];

        for (const item of itemsState.values())
        {
            if (!item.completed)
            {
                nextTilesToMine = nextTilesToMine.concat(item.tiles);
            }
        }

        // Only consider unrevealed tiles
        nextTilesToMine = nextTilesToMine.filter((tile) => !tile.revealed);

        if (nextTilesToMine.length == 0)
        {
            return true;
        }

        let { useHammer, useToolX, useToolY } = this.__internal__considerHammerUse(nextTilesToMine);

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
            this.__internal__actionCount++;
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
    static __internal__considerHammerUse(nextTilesToMine)
    {
        let bestReachableTilesAmount = 0;
        let bestReachableTileX = 0;
        let bestReachableTileY = 0;

        for (const tile of nextTilesToMine)
        {
            // Compute the best tile for hammer
            let reachableTilesAmount = 0;
            for (const other of nextTilesToMine)
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
            }

            if (reachableTilesAmount > bestReachableTilesAmount)
            {
                bestReachableTilesAmount = reachableTilesAmount;
                bestReachableTileX = tile.x;
                bestReachableTileY = tile.y;
            }
        }

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
    static __internal__getItemsState()
    {
        let itemsState = new Map();

        for (const row of Array(Mine.rewardGrid.length).keys())
        {
            for (const column of Array(Mine.rewardGrid[row].length).keys())
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
            }
        }

        return itemsState;
    }
}
