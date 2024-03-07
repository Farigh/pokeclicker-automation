/**
 * @class The AutomationDungeon regroups the 'Dungeon Auto Fight' functionalities
 */
class AutomationSafari
{
    static Settings = {
                          CollectItems: "Safari-CollectItems",
                          FeatureEnabled: "Safari-HuntEnabled",
                          FocusOnBaitAchievements: "Safari-BaitAchievements",
                          InfinitRepeat: "Safari-InfinitRepeat"
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
            // Set the advanced settings default values
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.CollectItems, true);
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.FocusOnBaitAchievements, false);

            this.__internal__buildMenu();

            // Disable the feature by default
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
        }
        else
        {
            // Initialize internal data
            this.__internal__baitAchievements =
                AchievementHandler.achievementList.filter(a => (Automation.Utils.isInstanceOf(a.property, "SafariBaitRequirement")));

            // Set the div visibility watcher
            setInterval(this.__internal__updateDivContent.bind(this), 200); // Refresh every 0.2s
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__moveTypes = {
        None: 0,
        Collect: 1,
        Encounter: 2
    };

    static __internal__autoSafariLoop = null;

    static __internal__safariInGameModal = null;
    static __internal__safariButton = null;
    static __internal__safariGridData = null;
    static __internal__safariMovesCost = [];
    static __internal__safariMovesList = [];
    static __internal__safariLastMoveType = this.__internal__moveTypes.None;
    static __internal__encounterCandidates = [];

    static __internal__waitBeforeActing = -1;

    static __internal__baitAchievements = [];

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        this.__internal__safariInGameModal = document.getElementById("safariModal");

        // Hide the safari fight panel by default
        const safariElems = this.__internal__addSafariPanel("automationSafari", this.__internal__safariInGameModal);
        safariElems.featureButton.id = this.Settings.FeatureEnabled; // Restore the id of the main button to be able to use the Menu helpers

        // Add the on/off button to the battle container as well since it will go on top of the main modal
        const safariBattleElems = this.__internal__addSafariPanel("automationSafariBattle", document.getElementById("safariBattleModal"));

        // Bind both on/off buttons behaviour
        safariElems.featureButton.onclick = function()
        {
            const newStatus = !(Automation.Utils.LocalStorage.getValue(Automation.Safari.Settings.FeatureEnabled) == "true");
            Automation.Utils.LocalStorage.setValue(Automation.Safari.Settings.FeatureEnabled, newStatus);
            Automation.Menu.updateButtonVisualState(safariElems.featureButton, newStatus);
            Automation.Menu.updateButtonVisualState(safariBattleElems.featureButton, newStatus);
            Automation.Safari.__internal__toggleSafariAutomation();
        };
        safariBattleElems.featureButton.onclick = safariElems.featureButton.onclick;

        // Bind both repeat buttons behaviour
        safariElems.repeatButton.onclick = function()
        {
            const newStatus = !(Automation.Utils.LocalStorage.getValue(Automation.Safari.Settings.InfinitRepeat) == "true");
            Automation.Utils.LocalStorage.setValue(Automation.Safari.Settings.InfinitRepeat, newStatus);

            // Update both buttons content
            safariElems.repeatOnceSpan.hidden = newStatus;
            safariBattleElems.repeatOnceSpan.hidden = newStatus;
            safariElems.repeatInfinitSpan.hidden = !newStatus;
            safariBattleElems.repeatInfinitSpan.hidden = !newStatus;
        };
        safariBattleElems.repeatButton.onclick = safariElems.repeatButton.onclick;

        // Build advanced settings panel (only for the main panel)
        const safariSettingPanel = Automation.Menu.addSettingPanel(safariElems.featureButton.parentElement.parentElement);

        const titleDiv = Automation.Menu.createTitleElement("Safari advanced settings");
        titleDiv.style.marginBottom = "10px";
        safariSettingPanel.appendChild(titleDiv);

        // Focus on bait achievements button
        const achievementLabel = "Prioritize bait use to unlock achievements";
        const achievementTooltip = "Uses bait on pokemon instead of trying to catch them\n"
                                 + "Stops once all related achievements are unlocked";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(achievementLabel,
                                                               this.Settings.FocusOnBaitAchievements,
                                                               achievementTooltip,
                                                               safariSettingPanel);


        // Focus on bait achievements button
        const itemsCollectionLabel = "Collect items";
        const itemsCollectionTooltip = "The automation will move to the closest item\n"
                                     + "as soon as one appears";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(itemsCollectionLabel,
                                                               this.Settings.CollectItems,
                                                               itemsCollectionTooltip,
                                                               safariSettingPanel);
    }

    /**
     * @brief Adds a safari panel to the given @p ingameModal
     *
     * @param {string} categoryId: The id that will be given to the resulting div
     * @param {Element} ingameModal: The in-game modal to add the category to
     *
     * @returns The feature on/off button element
     */
    static __internal__addSafariPanel(containerId, ingameModal)
    {
        const title = '<img src="assets/images/npcs/Bookworms.png" height="20px" style="position: relative; bottom: 3px;">'
                    +     '&nbsp;Safari&nbsp;'
                    + '<img src="assets/images/npcs/Bookworms.png" height="20px" style="position: relative; bottom: 3px; transform: scaleX(-1);">';

        const container = Automation.Menu.addFloatingCategory(containerId, title, ingameModal);
        container.parentElement.style.width = "157px";

        /**************************\
        |***   Feature button   ***|
        \**************************/

        const tooltip = "Automatically starts the safari and tries to catch pokémons"
                      + Automation.Menu.TooltipSeparator
                      + "⚠️ The entrance fee can be cost-heavy.";
        const featureButton = Automation.Menu.addAutomationButton("Auto Hunt", this.Settings.FeatureEnabled, tooltip, container, true);
        featureButton.parentElement.style.display = "inline-block";
        featureButton.parentElement.style.paddingRight = "2px";
        featureButton.parentElement.classList.add("safariAutomationTooltip");

        // Update the id to avoid collapsing ids
        featureButton.id += `-${containerId}`;

        /**************************\
        |***   Repeat button    ***|
        \**************************/

        // Set to solo run by default
        Automation.Utils.LocalStorage.setValue(this.Settings.InfinitRepeat, false);

        const repeatButtonContainer = document.createElement("div");
        repeatButtonContainer.style.display = "inline-block";
        repeatButtonContainer.style.paddingRight = "10px";
        featureButton.parentElement.parentElement.appendChild(repeatButtonContainer);

        const repeatButtonTooltip = "Set the automation mode."
                                  + Automation.Menu.TooltipSeparator
                                  + "You can swith between:\n"
                                  + "One run, then stop | Infinit reruns";

        // The repeat button
        const repeatButton = Automation.Menu.createButtonElement(`${this.Settings.InfinitRepeat}-${containerId}`);
        repeatButton.textContent = "⮔";
        repeatButton.style.fontSize = "2.4em";
        repeatButton.style.color = "#f5f5f5";
        repeatButton.style.bottom = "4px";
        repeatButtonContainer.classList.add("hasAutomationTooltip");
        repeatButtonContainer.setAttribute("automation-tooltip-text", repeatButtonTooltip);
        repeatButtonContainer.appendChild(repeatButton);

        // The repeat once indicator
        const repeatOnceSpan = document.createElement("span");
        repeatOnceSpan.textContent = "1";
        repeatOnceSpan.style.position = "absolute";
        repeatOnceSpan.style.left = "50%";
        repeatOnceSpan.style.top = "2px";
        repeatOnceSpan.style.fontSize = "0.34em";
        repeatOnceSpan.style.fontWeight = "800";
        repeatButton.appendChild(repeatOnceSpan);

        const repeatInfinitSpan = document.createElement("span");
        repeatInfinitSpan.textContent = "∞";
        repeatInfinitSpan.hidden = true;
        repeatInfinitSpan.style.position = "absolute";
        repeatInfinitSpan.style.left = "calc(50% - 4px)";
        repeatInfinitSpan.style.top = "1px";
        repeatInfinitSpan.style.fontSize = "0.5em";
        repeatInfinitSpan.style.fontWeight = "400";
        repeatButton.appendChild(repeatInfinitSpan);

        return { featureButton, repeatButton, repeatOnceSpan, repeatInfinitSpan };
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
                // Reset the internal data
                this.__internal__safariLastMoveType = this.__internal__moveTypes.None;

                // Set auto-safari loop
                this.__internal__waitBeforeActing = -1;
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
            // Enter the safari again (since the end of the first run closed the modal)
            if (!this.__internal__safariInGameModal.classList.contains("show"))
            {
                if (this.__internal__waitBeforeActing == -1)
                {
                    // Wait for 0.5s before running the next safari run to prevent a deadlock
                    this.__internal__waitBeforeActing = 10;
                    return;
                }
                --this.__internal__waitBeforeActing;

                if (this.__internal__waitBeforeActing == 0)
                {
                    Safari.startSafari();

                    // Disable the feature, if the user asked for a single run
                    if (Automation.Utils.LocalStorage.getValue(this.Settings.InfinitRepeat) != "true")
                    {
                        Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
                        return;
                    }
                }
                return;
            }

            // The user does not have enough Quest points, disable the feature
            if (!Safari.canPay())
            {
                Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
                return;
            }

            // Reset internal data
            this.__internal__safariGridData = null;

            // Equip the Oak item catch loadout
            Automation.Focus.__equipLoadout(Automation.Utils.OakItem.Setup.PokemonCatch);

            // Only enter the Safari for this loop iteration
            Safari.payEntranceFee();
            return;
        }

        // The user left the Safari, disable the feature
        if (App.game.gameState !== GameConstants.GameState.safari)
        {
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);

            // Exit any battle that might have started
            let loopCount = 0;
            const process = setInterval(function()
                            {
                                if (Safari.inBattle())
                                {
                                    // Let the time for the animation to finish...
                                    setTimeout(SafariBattle.endBattle, 500);
                                    clearInterval(process);
                                }

                                ++loopCount;
                                if (loopCount > 20)
                                {
                                    clearInterval(process);
                                }
                            }, 50);

            return;
        }

        // No more balls, the safari will exit soon
        if (Safari.balls() == 0) return;

        if (this.__internal__safariGridData == null)
        {
            this.__internal__processSafariGrid();
        }

        if (Safari.inBattle())
        {
            this.__internal__battlePokemon();
            return;
        }

        if ((Automation.Utils.LocalStorage.getValue(this.Settings.CollectItems) === "true")
            && (Safari.itemGrid().length != 0))
        {
            // Move the player to the nearest item
            this.__internal__moveToNearestItem();
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

        // Consider both Grass and Water for encounters
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

        // Set the cost of Obstacles to -1
        for (const tile of Automation.Safari.__internal__safariGridData.Obstacles)
        {
            this.__internal__safariMovesCost[tile.y][tile.x] = -1;
        }

        // Start at the users position
        let toUpdateNext = [ { x: Safari.playerXY.x, y: Safari.playerXY.y } ];

        // Set the move costs from the starting point to 0
        this.__internal__safariMovesCost[Safari.playerXY.y][Safari.playerXY.x] = 0;

        while (toUpdateNext.length != 0)
        {
            const nextPos = toUpdateNext.shift();

            const cost = this.__internal__safariMovesCost[nextPos.y][nextPos.x] + 1;
            for (const pos of [ { x: nextPos.x, y: nextPos.y - 1 },
                                { x: nextPos.x, y: nextPos.y + 1 },
                                { x: nextPos.x - 1, y: nextPos.y },
                                { x: nextPos.x + 1, y: nextPos.y } ])
            {
                // Invalid position
                if ((this.__internal__safariMovesCost[pos.y] === undefined)
                    || (this.__internal__safariMovesCost[pos.y][pos.x] === undefined))
                {
                    continue;
                }

                if (cost < this.__internal__safariMovesCost[pos.y][pos.x])
                {
                    this.__internal__safariMovesCost[pos.y][pos.x] = cost;
                    toUpdateNext.push({ x: pos.x, y: pos.y });
                }
            }
        }
    }

    /**
     * @brief Computes the moves needed to reach to the nearest Grass or Water location
     */
    static __internal__computeMovesToNearestEncounterZone()
    {
        // Recompute move costs based on the player's position
        this.__internal__computeMovesCosts();
        const destination = this.__internal__selectEncounterDestination();

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

        this.__internal__addPathToTheMoveList();
    }

    /**
     * @brief Computes the moves needed to reach to the nearest item location
     */
    static __internal__computeMovesToNearestItem()
    {
        // Recompute move costs based on the player's position
        this.__internal__computeMovesCosts();

        let candidate;
        let candidateCost = Number.MAX_SAFE_INTEGER;

        for (const tile of Safari.itemGrid())
        {
            const currentCost = this.__internal__safariMovesCost[tile.y][tile.x];
            if (currentCost < candidateCost)
            {
                candidate = tile;
                candidateCost = currentCost;
            }
        }

        this.__internal__safariMovesList = [ { x: candidate.x, y: candidate.y } ];

        this.__internal__addPathToTheMoveList();
    }

    /**
     * @brief Computes the path to the setup destination
     *
     * @note The destination must be the last element of the internal @see __internal__safariMovesList
     */
    static __internal__addPathToTheMoveList()
    {
        const destination = this.__internal__safariMovesList.at(-1);
        let cost = this.__internal__safariMovesCost[destination.y][destination.x];

        const isNextStep = function(x, y, cost)
        {
            return (this.__internal__safariMovesCost[y] !== undefined)
                && (this.__internal__safariMovesCost[y][x] === cost);
        }.bind(this);

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
        let expectedMoveDest = { x: Safari.playerXY.x, y: Safari.playerXY.y };

        let direction = "up";
        if (Safari.playerXY.x > x)
        {
            direction = "left";
            expectedMoveDest.x--;
        }
        else if (Safari.playerXY.x < x)
        {
            direction = "right";
            expectedMoveDest.x++;
        }
        else if (Safari.playerXY.y < y)
        {
            direction = "down";
            expectedMoveDest.y++;
        }
        else
        {
            expectedMoveDest.y--;
        }

        // Dont use Safari.step as it would break the animation
        Safari.move(direction);
        Safari.stop(direction);

        // If the destination in not walkable, reset the safari state, so a new path can be computed
        const destTile = Safari.grid[expectedMoveDest.y][expectedMoveDest.x];
        if (!GameConstants.SAFARI_LEGAL_WALK_BLOCKS.includes(destTile))
        {
            this.__internal__safariLastMoveType = this.__internal__moveTypes.None;
        }
    }

    /**
     * @brief Handles the current pokémon encounter
     */
    static __internal__battlePokemon()
    {
        // Do not attempt anything while the game is busy
        if (SafariBattle.busy()) return;

        // If the user asked to complete the bait achievements, throw baits until it's done
        if ((Automation.Utils.LocalStorage.getValue(this.Settings.FocusOnBaitAchievements) === "true")
            && (this.__internal__baitAchievements.filter(a => !a.isCompleted()).length != 0))
        {
            SafariBattle.throwBait();
        }
        // Thow a rock at the pokémon to improve the catch rate, unless its angry or its catch factor is high enough
        else if ((SafariBattle.enemy.angry == 0)
                 && (SafariBattle.enemy.catchFactor < 90))
        {
            SafariBattle.throwRock();
        }
        // Try to catch the pokémon
        else
        {
            SafariBattle.throwBall();
        }
    }

    /**
     * @brief Moves to the nearest item to collect
     */
    static __internal__moveToNearestItem()
    {
        // Is the item has been collected, we need to find the next item to reach
        let isItemStillAtDest = false;
        if (this.__internal__safariLastMoveType === this.__internal__moveTypes.Collect)
        {
            const itemLocation = this.__internal__safariMovesList[0];
            isItemStillAtDest = Safari.itemGrid().filter(a => ((a.x == itemLocation.x) && (a.y == itemLocation.y))).length != 0;
        }

        // Get the next move list if needed
        if ((this.__internal__safariLastMoveType !== this.__internal__moveTypes.Collect)
            || !isItemStillAtDest)
        {
            this.__internal__computeMovesToNearestItem();
            this.__internal__safariLastMoveType = this.__internal__moveTypes.Collect;
        }

        // Don't move if the player is still moving
        if (Safari.walking || Safari.isMoving) return;

        let dest = this.__internal__safariMovesList.at(-1);
        if (this.__internal__safariMovesList.length > 1)
        {
            this.__internal__safariMovesList.pop();
        }

        this.__internal__moveToTile(dest.x, dest.y);
    }

    /**
     * @brief Moves to the nearest Grass of Water location to look for pokemons
     */
    static __internal__moveToNearestEncounterZone()
    {
        // Get the next move list if needed
        if (this.__internal__safariLastMoveType !== this.__internal__moveTypes.Encounter)
        {
            this.__internal__computeMovesToNearestEncounterZone();
            this.__internal__safariLastMoveType = this.__internal__moveTypes.Encounter;
        }

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
