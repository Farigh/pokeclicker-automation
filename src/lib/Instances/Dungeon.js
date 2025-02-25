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
                          SkipBoss: "Dungeon-SkipBoss",
                          SelectedChestMinRarity: "Dungeon-SelectedChestMinRarity"
                      };

    static InternalModes = {
                               None: 0,
                               ForceDungeonCompletion: 1,
                               ForcePokemonFight: 2
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
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SkipBoss, false);

            // Set the default chest rarity to "common" (ie. pickup any chest rarity)
            const formerChestOption = "Dungeon-SkipChests";
            const formerChestOptionValue = Automation.Utils.LocalStorage.getValue(formerChestOption);
            if (Automation.Utils.LocalStorage.getValue(formerChestOption) != undefined)
            {
                // TODO Remove this conversion at some point
                const defaultValue = (formerChestOptionValue == "true") ? this.__internal__chestTypes.skipall : this.__internal__chestTypes.common;

                // Convert the former setting "Dungeon-SkipChests" to the new chest rarity one
                Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SelectedChestMinRarity, defaultValue);
                Automation.Utils.LocalStorage.unsetValue(formerChestOption);
            }
            else
            {
                Automation.Utils.LocalStorage.setDefaultValue(this.Settings.SelectedChestMinRarity, this.__internal__chestTypes.common);
            }

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

    /**
     * @brief Checks if the given dungeon has any shadow pokémon
     *
     * @param {string} dungeonName: The name of the dungeon
     *
     * @return true if the dungeon has shadow pokémons, false otherwise
     */
    static hasShadowPokemons(dungeonName)
    {
        const town = TownList[dungeonName];

        // Orre is the only subregion where shadow pokemons appear
        return (town.region == GameConstants.Region.hoenn)
            && (town.subRegion == GameConstants.HoennSubRegions.Orre);
    }

    /**
     * @brief Asks the Dungeon automation to stop after the current run
     *
     * @note This will reset any "after run" callback
     */
    static stopAfterThisRun()
    {
        this.__internal__stopAfterThisRun = true;
        this.__internal__beforeNewRunCallBack = function() {};
    }

    /**
     * @brief Sets the @p callback to call before running a new dungeon run
     *
     * @param {function} callback: The function to call
     */
    static setBeforeNewRunCallBack(callback)
    {
        this.__internal__beforeNewRunCallBack = callback;
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__stopAfterThisRun = false;
    static __internal__beforeNewRunCallBack = function() {};

    static __internal__CatchModes = {
        Uncaught: { id: 0, shiny: false, shadow: false },
        UncaughtShiny: { id: 1, shiny: true, shadow: false },
        UncaughtShadow: { id: 2, shiny: false, shadow: true },
        UncaughtShadowOrShiny: { id: 3, shiny: true, shadow: true }
    };

    // Unfortunately, pokeclicker does not use any enum we can rely on for chest rarity so we have to have our own copy
    // See: https://github.com/pokeclicker/pokeclicker/blob/91575e729ace2cdcbd034b39cfb08e25d1863310/src/scripts/dungeons/DungeonRunner.ts#L146-L152
    static __internal__chestTypes = {
                                        "common" : 0,
                                        "rare" : 1,
                                        "epic" : 2,
                                        "legendary" : 3,
                                        "mythic" : 4,
                                        "skipall" : 9999 // If this value is selected, any chest will be skipped
                                    };

    static __internal__autoDungeonLoop = null;
    static __internal__pokedexSwitch = null;
    static __internal__dungeonFightButton = null;
    static __internal__dungeonAdvancedSettingsContainerDivElem = null;
    static __internal__dungeonAdvancedSettingsVisibilityButtonElem = null;
    static __internal__dungeonBossCatchPokeballSelectElem = null;

    static __internal__chestMinRarityDropdownList = null;

    static __internal__currentCatchMode = this.__internal__CatchModes.Uncaught;
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
                                 z-index: 4;
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
        const dungeonTitle = '<img src="assets/images/npcs/Crush Kin.png" height="20px" style="position: relative; bottom: 3px; transform: scaleX(-1);">'
                           +     '&nbsp;Dungeon fight&nbsp;'
                           + '<img src="assets/images/npcs/Crush Kin.png" height="20px" style="position: relative; bottom: 3px;">';
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
                                     + "You can switch between pokémon, shiny and shadow completion\n"
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

        // Store the container div (2 imbrication levels upper)
        this.__internal__dungeonAdvancedSettingsContainerDivElem = dungeonSettingsPanel.parentElement.parentElement;

        // Store the panel button (first child element of the parent div)
        this.__internal__dungeonAdvancedSettingsVisibilityButtonElem = dungeonSettingsPanel.parentElement.children.item(0);

        const titleDiv = Automation.Menu.createTitleElement("Dungeon advanced settings");
        titleDiv.style.marginBottom = "10px";
        dungeonSettingsPanel.appendChild(titleDiv);

        // Add the boss catch option
        const bossCatchPokeballTooltip = "Defines which pokeball will be equipped to catch\n"
                                       + "pokémons, before fighting the dungeon boss"
                                       + Automation.Menu.TooltipSeparator
                                       + "Selecting 'None' will leave the in-game value unchanged";
        this.__internal__dungeonBossCatchPokeballSelectElem =
            Automation.Menu.addPokeballList(this.Settings.BossCatchPokeballToUse,
                                            "Pokéball to equip for the boss",
                                            bossCatchPokeballTooltip,
                                            true);
        dungeonSettingsPanel.appendChild(this.__internal__dungeonBossCatchPokeballSelectElem);
        this.__internal__dungeonBossCatchPokeballSelectElem.style.marginBottom = "3px";

        // Add the chest min rarity setting
        this.__internal__buildChestMinRarityDropdownList(dungeonSettingsPanel);

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

        // Add the skip boss button
        const skipBossTooltip = "Don't fight the dungeon boss at all."
                              + Automation.Menu.TooltipSeparator
                              + "It will exit the dungeon as soon as the other automation conditions are met";
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(
            "Skip the boss fight", this.Settings.SkipBoss, skipBossTooltip, dungeonSettingsPanel);
    }

    /**
     * @brief Builds the advanced setting chest min rarity selection dropdown list
     *
     * @param {Element} parent: The parent div
     */
    static __internal__buildChestMinRarityDropdownList(parent)
    {
        const selectOptions = [];
        const savedSelectedRarity = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.SelectedChestMinRarity));

        for (const rarityName in this.__internal__chestTypes)
        {
            const element = document.createElement("div");
            element.style.paddingTop = "1px";

            // Add the chest rarity image
            const image = document.createElement("img");
            image.src = `assets/images/dungeons/chest-${rarityName}.png`;
            image.style.height = "19px";
            image.style.marginRight = "5px";
            image.style.marginLeft = "5px";
            image.style.position = "relative";
            image.style.bottom = "1px";
            element.appendChild(image);

            const chestId = this.__internal__chestTypes[rarityName];

            if (chestId == this.__internal__chestTypes.skipall)
            {
                image.src = `assets/images/dungeons/chest-common.png`;
                image.style.filter = "grayscale(100%)";

                // Add the forbidden emoji on top of the grayed chest image
                const spanElem = document.createElement("span");
                spanElem.style.display = "inline-block";
                spanElem.style.position = "relative";
                spanElem.style.width = "0px";
                spanElem.style.right = "27px";
                spanElem.appendChild(document.createTextNode("🚫"));
                element.appendChild(spanElem);

                // Add label
                element.appendChild(document.createTextNode("Skip all"));
            }
            else
            {
                // Add the chest rarity name (uppercase the 1st letter)
                element.appendChild(document.createTextNode(rarityName.charAt(0).toUpperCase() + rarityName.slice(1)));
            }
            selectOptions.push({ value: chestId, element, selected: (chestId == savedSelectedRarity) });
        }

        const tooltip = "Choose which chest the automation should consider picking up.\n"
                      + "Any rarity lower than the selected one will be ignored."
                      + Automation.Menu.TooltipSeparator
                      + "Setting this to \"Skip all\" will prevent any chest pick up.";
        this.__internal__chestMinRarityDropdownList =
            Automation.Menu.createDropdownListWithHtmlOptions(selectOptions, "Lowest chest rarity to pick up", tooltip);
        this.__internal__chestMinRarityDropdownList.getElementsByTagName('button')[0].style.width = "140px";

        this.__internal__chestMinRarityDropdownList.onValueChange = function()
            {
                Automation.Utils.LocalStorage.setValue(this.Settings.SelectedChestMinRarity,
                                                       this.__internal__chestMinRarityDropdownList.selectedValue);

                // TODO: Refresh __internal__chestPositions since the value changed
                // (not possible for now because of the problem with visible but not reachable chests problem that appeared with
                //  the bigger flashlight range update)
            }.bind(this);

        parent.appendChild(this.__internal__chestMinRarityDropdownList);
    }

    /**
     * @brief Switches between Pokedex completion and Shiny pokedex completion mode
     */
    static __internal__toggleCatchStopMode()
    {
        // Switch mode
        this.__internal__currentCatchMode = (this.__internal__currentCatchMode == this.__internal__CatchModes.UncaughtShadowOrShiny)
                                              ? this.__internal__CatchModes.Uncaught
                                              : Object.entries(this.__internal__CatchModes).find(
                                                    x => x[1].id == (this.__internal__currentCatchMode.id + 1))[1];

        // Update the image accordingly
        const image = (this.__internal__currentCatchMode.shiny) ? "Pokeball-shiny" : "Pokeball";

        const shadowImgStyle = "position: absolute; right: -4px; bottom: 1px; height: 25px;";
        const shadowImageBackground = (this.__internal__currentCatchMode.shadow)
                                    ? `<img src="assets/images/status/shadow.svg" style="${shadowImgStyle} z-index: 1;">`
                                    : "";
        const shadowImageForground = (this.__internal__currentCatchMode.shadow)
                                   ? `<img src="assets/images/status/shadow.svg" style="${shadowImgStyle} z-index: 3; opacity: 0.2;">`
                                   : "";

        const pokeballImgStyle = `style="position: relative; height: 17px; z-index: 2;"`;
        this.__internal__pokedexSwitch.innerHTML =
            `${shadowImageBackground}<img src="assets/images/pokeball/${image}.svg" ${pokeballImgStyle}>${shadowImageForground}`;
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

        // Cleanup StopAfterThisRun internal mode that was set while the dungeon was not running
        if (this.__internal__stopAfterThisRun)
        {
            this.AutomationRequestedMode = this.InternalModes.None;
            this.__internal__stopAfterThisRun = false;
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

            // Reset any automation mode
            this.AutomationRequestedMode = this.InternalModes.None;
            this.__internal__stopAfterThisRun = false;

            // Disable automation catch filter
            Automation.Utils.Pokeball.disableAutomationFilter();
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
        const skipChests = (this.__internal__chestMinRarityDropdownList.selectedValue == this.__internal__chestTypes.skipall);
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
        if ((App.game.gameState === GameConstants.GameState.town)
            && Automation.Utils.isInstanceOf(player.town, "DungeonTown")
            && App.game.keyItems.hasKeyItem(KeyItemType.Dungeon_ticket)
            && (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() >= player.town.dungeon.tokenCost))
        {
            // Reset button status if either:
            //    - it was requested by another module
            //    - the pokedex is full for this dungeon, and it has been ask for
            if (this.__internal__stopAfterThisRun
                || (!forceDungeonProcessing
                    && (this.__internal__playerActionOccured
                        || ((Automation.Utils.LocalStorage.getValue(this.Settings.StopOnPokedex) === "true")
                            && this.__internal__isDungeonCompleted()))))
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
                this.__internal__beforeNewRunCallBack();

                this.__internal__resetSavedStates();
                DungeonRunner.initializeDungeon(player.town.dungeon);

                // Disable automation filter, unless it's an automation process
                if (!forceDungeonProcessing)
                {
                    Automation.Utils.Pokeball.disableAutomationFilter();
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
            const visibleEnemiesCount = flatBoard.filter((tile) => tile.isVisible && (tile.type() === GameConstants.DungeonTileType.enemy)).length;
            const discoveredChestsLeftToOpenCount = this.__internal__chestPositions.length;
            const foundFloorEndTile = this.__internal__floorEndPosition != null;
            // Check if all relevant tiles have been explored for each category
            // Either we are skipping fights, or all fights are won
            const areAllBattleDefeated = avoidFights || (visibleEnemiesCount === (DungeonRunner.map.totalFights() - DungeonRunner.encountersWon()));
            // Either we are skipping chests, or all remaining chests are visible
            const areAllChestsCollected = (discoveredChestsLeftToOpenCount === this.__internal__getChestLeftToOpenCount())
                                       || (foundFloorEndTile && !DungeonRunner.map.flash && avoidFights);

            // If all conditions are met, or all cells are visible clean up the map and move on
            // If all cells are visible, advance even if not all objectives are met, because there might be more on the next floor
            if ((nonVisibleTiles.length === 0) || (areAllBattleDefeated && areAllChestsCollected && (skipBoss || foundFloorEndTile)))
            {
                if (!avoidFights && (visibleEnemiesCount > 0))
                {
                    // There are some enemies left to fight, the rest of the loop will handle them
                }
                else if (discoveredChestsLeftToOpenCount > 0)
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
                        DungeonRunner.handleInteraction();
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

                        // Equip the selected pokeball (if None is set, or the automation forced a mode, keep the user in-game setting)
                        const ballToCatchBoss = parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.BossCatchPokeballToUse));
                        if ((ballToCatchBoss != GameConstants.Pokeball.None)
                            && (this.AutomationRequestedMode == this.InternalModes.None))
                        {
                            Automation.Utils.Pokeball.catchEverythingWith(ballToCatchBoss);
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
        const nonEnemyCells = accessibleUnvisitedTiles.filter(({ tile }) => tile.type() !== GameConstants.DungeonTileType.enemy);
        const enemyCells = accessibleUnvisitedTiles.filter(({ tile }) => tile.type() === GameConstants.DungeonTileType.enemy);
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
        if ((cellType === GameConstants.DungeonTileType.boss)
            || (cellType === GameConstants.DungeonTileType.ladder))
        {
            this.__internal__floorEndPosition = cell;
        }
        else if (cellType === GameConstants.DungeonTileType.chest)
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

                if ((tile.type() !== GameConstants.DungeonTileType.entrance)
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
                                                           && Automation.Utils.isInstanceOf(player.town, "DungeonTown")));

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
                    && this.__internal__isDungeonCompleted())
                {
                    disableNeeded = true;
                    disableReason += (disableReason !== "") ? "\nAnd all " : "All ";

                    if (this.__internal__currentCatchMode.shiny)
                    {
                        disableReason += "shiny ";
                    }

                    if (this.__internal__currentCatchMode.shadow)
                    {
                        disableReason += "shadow ";
                    }

                    disableReason += "pokémons are already caught,\nand the option to stop in this case is enabled";
                }

                // The player does not have enough dungeon token
                if (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() < player.town.dungeon.tokenCost)
                {
                    disableNeeded = true;

                    disableReason += (disableReason !== "") ? "\nAnd you " : "You ";
                    disableReason += "do not have enough Dungeon Token to enter";
                }

                // All objectives are marked to be skipped
                if ((Automation.Utils.LocalStorage.getValue(this.Settings.AvoidEncounters) === "true")
                    && (this.__internal__chestMinRarityDropdownList.selectedValue == this.__internal__chestTypes.skipall)
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
        // If the panel is hidden and the settings panel is opened, close the later to restore all the other settings visibility
        else if (this.__internal__dungeonAdvancedSettingsContainerDivElem.hasAttribute("automation-visible"))
        {
            // Call the onclick method manually
            this.__internal__dungeonAdvancedSettingsVisibilityButtonElem.onclick();
        }
    }

    /**
     * @brief Ensures that the current dungeon objectives are completed
     *
     * @returns True if the dungeon objectives are completed, False otherwise
     */
    static __internal__isDungeonCompleted()
    {
        const currentDungeon = player.town.dungeon;
        if (this.__internal__currentCatchMode.shadow
            && currentDungeon.allAvailableShadowPokemon().some(
                p => App.game.party.getPokemonByName(p)?.shadow < GameConstants.ShadowStatus.Shadow))
        {
            return false;
        }

        return DungeonRunner.dungeonCompleted(currentDungeon, this.__internal__currentCatchMode.shiny);
    }

    /**
     * @brief Adds the given @p position to the check list, if not already added.
     *
     * @param cell: The internal cell element
     */
    static __internal__addChestPosition(cell)
    {
        // Don't add the chest if its rarity is lower than the user selected one
        const currentChestRarity = this.__internal__chestTypes[cell.tile.metadata.tier];
        if (currentChestRarity < this.__internal__chestMinRarityDropdownList.selectedValue)
        {
            return;
        }

        // Don't add the chest if it was already added to the list
        if (!this.__internal__chestPositions.some((pos) => (pos.x == cell.x) && (pos.y == cell.y) && (pos.floor == cell.floor)))
        {
            this.__internal__chestPositions.push(cell);
        }
    }

    /**
     * @brief Gets the number of unopened chest left in the dungeon matching the user criteria
     *
     * @returns The number of unopened chest
     */
    static __internal__getChestLeftToOpenCount()
    {
        let result = 0;
        for (const tile of DungeonRunner.map.board().flat().flat())
        {
            if (tile.type() == GameConstants.DungeonTileType.chest)
            {
                const currentChestRarity = Automation.Dungeon.__internal__chestTypes[tile.metadata.tier];

                if (currentChestRarity >= this.__internal__chestMinRarityDropdownList.selectedValue)
                {
                    result++;
                }
            }
        }

        return result;
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
