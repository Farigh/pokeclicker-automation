/**
 * @class The AutomationDungeon regroups the 'Dungeon Auto Fight' functionalities
 */
class AutomationSafari
{
    static Settings = {
                          FeatureEnabled: "Safari-HuntEnabled"
                      };

    /**
     * @brief Builds the menu
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            this.__internal__buildMenu();

            // Disable the feature by default
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
        }
        else
        {
            // Set the div visibility watcher
            setInterval(this.__internal__updateDivContent.bind(this), 200); // Refresh every 0.2s
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__autoSafariLoop = null;

    static __internal__safariInGameModal = null;
    static __internal__safariButton = null;
    static __internal__safariGridData = null;
    static __internal__safariMovesCost = [];
    static __internal__safariMovesList = [];
    static __internal__encounterCandidates = [];

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        this.__internal__safariInGameModal = document.getElementById("safariModal");

        // Hide the safari fight panel by default
        const safariTitle = '<img src="assets/images/npcs/Bookworms.png" height="20px" style="position: relative; bottom: 3px;">'
                          +     '&nbsp;Safari&nbsp;'
                          + '<img src="assets/images/npcs/Bookworms.png" height="20px" style="position: relative; bottom: 3px; transform: scaleX(-1);">';

        const safariContainer =
            Automation.Menu.addFloatingCategory("automationSafari", safariTitle, this.__internal__safariInGameModal);

        // Add an on/off button
        const autoSafariTooltip = "Automatically starts the safari and tries to catch pokémons"
                                + Automation.Menu.TooltipSeparator
                                + "The safari will run until it runs out of Quest points.\n"
                                + "⚠️ The entrance fee can be cost-heavy.";
        const autoHuntButton =
            Automation.Menu.addAutomationButton("Auto Hunt", this.Settings.FeatureEnabled, autoSafariTooltip, safariContainer, true);
        autoHuntButton.addEventListener("click", this.__internal__toggleSafariAutomation.bind(this), false);
    }

    /**
     * @brief Toggles the 'Safari' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static __internal__toggleSafariAutomation(enable)
    {
        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__autoSafariLoop === null)
            {
                // Set auto-safari loop
                this.__internal__autoSafariLoop = setInterval(this.__internal__safariAutomationLoop.bind(this), 50); // Runs every game tick
            }
        }
        else
        {
            // Unregister the loop
            clearInterval(this.__internal__autoSafariLoop);
            this.__internal__autoSafariLoop = null;

            // Disable automation catch filter
            Automation.Utils.Pokeball.disableAutomationFilter();

            // Reset internal data
            this.__internal__safariGridData = null;
        }
    }

    /**
     * @brief The Safari automation loop
     *
     * It will automatically enter the safari zone.
     */
    static __internal__safariAutomationLoop()
    {
        // Run the safari if not already
        if (!Safari.inProgress())
        {
            // The user does not have enough Quest points, disable the feature
            if (!Safari.canPay())
            {
                Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
                return;
            }

            // Reset internal data
            this.__internal__safariGridData = null;

            // Only enter the Safari for this loop iteration
            Safari.payEntranceFee();
            return;
        }

        if (this.__internal__safariGridData == null)
        {
            this.__internal__processSafariGrid();
            this.__internal__computeMovesCosts();
            this.__internal__computeMovesToNearestEncounterZone();
        }

        if (Safari.inBattle())
        {
            // TODO
            return;
        }

        // Move the player to the nearest encounter
        this.__internal__moveToNearestEncounterZone();
    }

    /**
     * @brief Aggregates the important safari grid info
     */
    static __internal__processSafariGrid()
    {
        this.__internal__safariGridData = { Water: [], Grass: [], Obstacles: [] };

        for (const [ rowIndex, row ] of Safari.grid.entries())
        {
            for (const [ colIndex, tile ] of row.entries())
            {
                const coord = { x: colIndex, y: rowIndex };

                // Grass tile
                if (tile == GameConstants.SafariTile.grass)
                {
                    this.__internal__safariGridData.Grass.push(coord);
                }
                // Water tile
                else if (GameConstants.SAFARI_WATER_BLOCKS.includes(tile))
                {
                    this.__internal__safariGridData.Water.push(coord);
                }
                // Obstacles
                else if (!GameConstants.SAFARI_LEGAL_WALK_BLOCKS.includes(tile))
                {
                    this.__internal__safariGridData.Obstacles.push(coord);
                }
            }
        }

        // Consider both Brass and water for encounter
        this.__internal__encounterCandidates = [...this.__internal__safariGridData.Grass, ...this.__internal__safariGridData.Water];
    }

    /**
     * @brief Computes the move cost matrix from the player's starting tile to every other tiles
     */
    static __internal__computeMovesCosts()
    {
        // The use of fill + map is necessary, otherwise it would add a ref to the same array to each row ...
        this.__internal__safariMovesCost =
            new Array(Safari.grid.length).fill(0).map(() => new Array(Safari.grid[1].length).fill(Number.MAX_SAFE_INTEGER));

        const tryUpdateNeighbor = function(x, y, newCost)
        {
            // Invalid position
            if ((this.__internal__safariMovesCost[y] === undefined)
                || (this.__internal__safariMovesCost[y][x] === undefined))
            {
                return;
            }

            if (newCost < this.__internal__safariMovesCost[y][x])
            {
                this.__internal__safariMovesCost[y][x] = newCost;
                updateNeighbors(x, y);
            }
        }.bind(this);

        const updateNeighbors = function(x, y)
        {
            const cost = this.__internal__safariMovesCost[y][x] + 1;
            tryUpdateNeighbor(x, y - 1, cost);
            tryUpdateNeighbor(x, y + 1, cost);
            tryUpdateNeighbor(x - 1, y, cost);
            tryUpdateNeighbor(x + 1, y, cost);
        }.bind(this);

        // Set the cost of Obstacles to -1
        for (const tile of this.__internal__safariGridData.Obstacles)
        {
            this.__internal__safariMovesCost[tile.y][tile.x] = -1;
        }

        // Set the move costs from the starting point to 0
        this.__internal__safariMovesCost[Safari.playerXY.y][Safari.playerXY.x] = 0;

        // Start at the users position
        updateNeighbors(Safari.playerXY.x, Safari.playerXY.y);
    }

    /**
     * @brief Computes the moves needed to reach to the nearest Grass or Water location
     */
    static __internal__computeMovesToNearestEncounterZone()
    {
        const destination = this.__internal__selectEncounterDestination();

        const isNextStep = function(x, y, cost)
        {
            return (this.__internal__safariMovesCost[y] !== undefined)
                && (this.__internal__safariMovesCost[y][x] === cost);
        }.bind(this);

        let cost = this.__internal__safariMovesCost[destination.y][destination.x];

        let destinationNeighbor;
        // Consider the player's position only if the destination is a neighbor tile and the player is already on a Grass or Water tile
        if ((cost == 1)
            && (this.__internal__encounterCandidates.find(t => (t.x == Safari.playerXY.x && t.y == Safari.playerXY.y)) != undefined))
        {
            destinationNeighbor = { x: Safari.playerXY.x, y: Safari.playerXY.y };
        }
        else
        {
            destinationNeighbor = this.__internal__findEncounterNeighborTile(destination);
        }

        // Add both destination encounter tiles
        this.__internal__safariMovesList = [ destinationNeighbor, destination ];

        // Stop at cost = 1, which is the till right next to the player
        while (cost > 1)
        {
            --cost;
            const currentStep = this.__internal__safariMovesList.at(-1);
            if (isNextStep(currentStep.x - 1, currentStep.y, cost))
            {
                this.__internal__safariMovesList.push({ x: currentStep.x - 1, y: currentStep.y });
            }
            else if (isNextStep(currentStep.x + 1, currentStep.y, cost))
            {
                this.__internal__safariMovesList.push({ x: currentStep.x + 1, y: currentStep.y });
            }
            else if (isNextStep(currentStep.x, currentStep.y - 1, cost))
            {
                this.__internal__safariMovesList.push({ x: currentStep.x, y: currentStep.y - 1 });
            }
            else
            {
                this.__internal__safariMovesList.push({ x: currentStep.x, y: currentStep.y + 1 });
            }
        }
    }

    /**
     * @brief Moves to the given tile coordinates
     *
     * @param {number} x: Tile x coordinate
     * @param {number} y: Tile y coordinate
     */
    static __internal__moveToTile(x, y)
    {
        let direction = "up";
        if (Safari.playerXY.x > x)
        {
            direction = "left";
        }
        else if (Safari.playerXY.x < x)
        {
            direction = "right";
        }
        else if (Safari.playerXY.y < y)
        {
            direction = "down";
        }

        // Dont use Safari.step as it would break the animation
        Safari.move(direction);
        Safari.stop(direction);
    }

    /**
     * @brief Moves to the nearest Grass of Water location to look for pokemons
     */
    static __internal__moveToNearestEncounterZone()
    {
        // Don't move if the player is still moving
        if (Safari.walking || Safari.isMoving) return;

        let dest;
        if (this.__internal__safariMovesList.length > 2)
        {
            dest = this.__internal__safariMovesList.at(-1);
            this.__internal__safariMovesList.pop();
        }
        else
        {
            // Two moves left, alternate between those until a fight pops
            dest = this.__internal__safariMovesList.find(t => ((t.x != Safari.playerXY.x) || (t.y != Safari.playerXY.y)));
        }
        this.__internal__moveToTile(dest.x, dest.y);
    }

    /**
     * @brief Gets the tile for encounter closest from the player
     *
     * @returns The coordinated of the closest tile for encounter
     */
    static __internal__selectEncounterDestination()
    {
        let candidate;
        let candidateCost = Number.MAX_SAFE_INTEGER;

        for (const tile of this.__internal__encounterCandidates)
        {
            // Exclude the player's current position
            if (tile.x == Safari.playerXY.x && tile.y == Safari.playerXY.y) continue;

            const currentCost = this.__internal__safariMovesCost[tile.y][tile.x];
            if ((currentCost < candidateCost)
                // Only consider tiles with adjacent Water or Grass
                && (this.__internal__findEncounterNeighborTile(tile) != undefined))
            {
                candidate = tile;
                candidateCost = currentCost;
            }
        }

        return candidate;
    }

    /**
     * @brief Tries to get the given @p tile Grass or Water tile direct neighbor, if any
     *
     * @param tile: The tile {x,y} coordinates to check
     *
     * @returns The neighbor tile coordinates if any, undefined otherwise
     */
    static __internal__findEncounterNeighborTile(tile)
    {
        // Check if there is a tile exactly 1 move away from the given tile
        return this.__internal__encounterCandidates.find(t => ((Math.abs(t.x - tile.x) + Math.abs(t.y - tile.y) == 1)));
    }

    /**
     * @brief Disables the 'Auto Hunt' button if the feature can't be used
     *
     * The 'Auto Hunt' button is disabled in the following cases:
     *   - The player did not buy the Dungeon ticket yet
     *   - The user enabled 'Stop on Pokedex' and all pokemon in the dungeon are already caught
     *   - The player does not have enough dungeon token to enter
     */
    static __internal__updateDivContent()
    {
        // Don't bother updating if the panel is hidden
        if (App.game.gameState !== GameConstants.GameState.safari)
        {
            return;
        }

        let disableNeeded = false;
        let disableReason = "";

        // Don't disable the button if the player is still in the safari
        if (!Safari.inProgress())
        {
            // The player might not have enough Quest points
            if (!Safari.canPay())
            {
                disableNeeded = true;

                disableReason = "You do not have enough Quest points to enter";
            }
        }

        // Disable the Auto Hunt button if the requirements are not met
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
