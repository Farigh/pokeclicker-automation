/**
 * @class AutomationShop provides functionality to automatically buy Poké Mart shop items
 */
class AutomationShop
{
    static Settings = {
                          FeatureEnabled: "Shop-Enabled"
                      };

    /**
     * @brief Builds the menu, and retores previous running state if needed
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep === Automation.InitSteps.BuildMenu)
        {
            this.__internal__buildShopItemList();
            this.__internal__setDefaultSettingValues();
            this.__internal__buildMenu();
        }
        else if (initStep === Automation.InitSteps.Finalize)
        {
            // Restore previous session state
            this.__internal__toggleAutoBuy();

            // Set the watcher to display the option once the map has been unlocked, if needed
            if (this.__internal__shoppingContainer.hidden)
            {
                this.__internal__setShoppingUnlockWatcher();
            }
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__shoppingContainer = null;
    static __internal__shopLoop = null;
    static __internal__shopItems = [];
    static __internal__activeTimeouts = new Map();

    static __internal__advancedSettings = {
                                              MinPlayerCurrency: function(currency) { return `Shop-${currency}-MinPlayerCurrency`; },
                                              ItemEnabled: function(itemName) { return `Shop-${itemName}-Enabled`; },
                                              BuyAmount: function(itemName) { return `Shop-${itemName}-BuyAmount`; },
                                              TargetAmount:  function(itemName) { return `Shop-${itemName}-TargetAmount`; },
                                              MaxBuyUnitPrice:  function(itemName) { return `Shop-${itemName}-MaxBuyUnitPrice`; }
                                          };

    static __internal__shopListCount = 0;
    static __internal__tabs = new Map();

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        // Add the related buttons to the automation menu
        this.__internal__shoppingContainer = document.createElement("div");
        Automation.Menu.AutomationButtonsDiv.appendChild(this.__internal__shoppingContainer);

        // Hide the shop until the user has access to the map
        this.__internal__shoppingContainer.hidden = !App.game.keyItems.hasKeyItem(KeyItemType.Town_map);

        Automation.Menu.addSeparator(this.__internal__shoppingContainer);

        const autoShopTooltip = "Automatically buys the configured items (see advanced settings)"
                              + Automation.Menu.TooltipSeparator
                              + "⚠️ This can be cost-heavy";
        const autoShopButton =
            Automation.Menu.addAutomationButton("Auto Shop", this.Settings.FeatureEnabled, autoShopTooltip, this.__internal__shoppingContainer);
        autoShopButton.addEventListener("click", this.__internal__toggleAutoBuy.bind(this), false);

        this.__internal__buildAdvancedSettings(this.__internal__shoppingContainer);
    }

    /**
     * @brief Builds the 'Focus on' feature advanced settings panel
     *
     * @param {Element} parent: The parent div to add the settings to
     */
    static __internal__buildAdvancedSettings(parent)
    {
        // Build advanced settings panel
        const shoppingSettingPanel = Automation.Menu.addSettingPanel(parent);

        const titleDiv = Automation.Menu.createTitleElement("Auto shop advanced settings");
        titleDiv.style.marginBottom = "10px";
        shoppingSettingPanel.appendChild(titleDiv);

        let isAnyItemHidden = this.__internal__buildShopItemListMenu(shoppingSettingPanel, "Pokédollars", GameConstants.Currency.money);
        isAnyItemHidden |= this.__internal__buildShopItemListMenu(shoppingSettingPanel, "Eggs", GameConstants.Currency.questPoint);
        isAnyItemHidden |= this.__internal__buildShopItemListMenu(shoppingSettingPanel, "Farm tools", GameConstants.Currency.farmPoint);

        // Set an unlock watcher if needed
        if (isAnyItemHidden)
        {
            this.__internal__setShoppingItemUnlockWatcher();
        }
    }

    /**
     * @brief Watches for the in-game map to be unlocked.
     *        Once unlocked, the menu will be displayed to the user
     */
    static __internal__setShoppingUnlockWatcher()
    {
        const watcher = setInterval(function()
        {
            if (App.game.keyItems.hasKeyItem(KeyItemType.Town_map))
            {
                this.__internal__shoppingContainer.hidden = false;
                clearInterval(watcher);
            }
        }.bind(this), 5000); // Check every 5 seconds
    }

    /**
     * @brief Watches for the in-game items to be unlocked (ie. a shop selling it was unlocked).
     *        Once unlocked, the item will be displayed to the user
     */
    static __internal__setShoppingItemUnlockWatcher()
    {
        const watcher = setInterval(function()
            {
                for (const itemData of this.__internal__shopItems)
                {
                    if (itemData.rowElem && itemData.rowElem.hidden && itemData.isUnlocked())
                    {
                        itemData.rowElem.hidden = false;
                        const tabElems = this.__internal__tabs.get(itemData.item.currency);
                        if (tabElems)
                        {
                            tabElems.label.hidden = false;
                            tabElems.content.hidden = false;
                            this.__internal__tabs.delete(itemData.item.currency);
                        }
                    }
                }

                if (this.__internal__shopItems.every(data => !data.rowElem?.hidden))
                {
                    clearInterval(watcher);
                }
            }.bind(this), 10000); // Check every 10 seconds
    }

    /**
     * @brief Toggles the 'Auto Shop' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static __internal__toggleAutoBuy(enable)
    {
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            if (this.__internal__shopLoop === null)
            {
                this.__internal__shop(); // Run once immediately
                this.__internal__shopLoop = setInterval(this.__internal__shop.bind(this), 10000); // Then, runs every 10s
            }
        }
        else
        {
            clearInterval(this.__internal__shopLoop);
            this.__internal__shopLoop = null;
        }
    }


    /**
     * @brief Adds the shop item tab to the advanced settings
     *
     * @param {Element} parentDiv: The div to add the list to
     * @param {string} tabName: The tab label name
     * @param currency: The pokéclicker currency associated with the tab
     *
     * @returns True if the item is hidden, false otherwise
     */
    static __internal__buildShopItemListMenu(parentDiv, tabName, currency)
    {
        this.__internal__shopListCount += 1;

        // Add the tab
        const shopSettingsTabsGroup = "automationShopSettings";
        const tabContainer = Automation.Menu.addTabElement(parentDiv, tabName, shopSettingsTabsGroup);

        // Add the min currency limit input
        const minCurrencyInputContainer = document.createElement("div");
        minCurrencyInputContainer.style.textAlign = "left";
        minCurrencyInputContainer.style.marginBottom = "10px";
        minCurrencyInputContainer.style.paddingLeft = "7px";

        const minCurrencyText = document.createTextNode("Stop buying if the player has less than");
        minCurrencyInputContainer.appendChild(minCurrencyText);

        const minCurrencyInputElem = Automation.Menu.createTextInputElement(10, "[0-9]");
        minCurrencyInputElem.innerHTML = Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.MinPlayerCurrency(currency));
        minCurrencyInputContainer.appendChild(minCurrencyInputElem);

        const minCurrencyImage = document.createElement("img");
        minCurrencyImage.src = `assets/images/currency/${GameConstants.Currency[currency]}.svg`;
        minCurrencyImage.style.height = "25px";
        minCurrencyInputContainer.appendChild(minCurrencyImage);

        // The save status checkmark
        const checkmark = Automation.Menu.createAnimatedCheckMarkElement();
        minCurrencyInputContainer.appendChild(checkmark);

        minCurrencyInputElem.oninput = function()
            {
                const mapKey = "MinPlayerCurrency-Save";

                if (this.__internal__activeTimeouts.has(mapKey))
                {
                    clearTimeout(this.__internal__activeTimeouts.get(mapKey));
                    this.__internal__activeTimeouts.delete(mapKey);
                }

                const timeout = setTimeout(function()
                    {
                        Automation.Menu.showCheckmark(checkmark, 2000);

                        Automation.Utils.LocalStorage.setValue(this.__internal__advancedSettings.MinPlayerCurrency,
                                                            Automation.Utils.tryParseInt(minCurrencyInputElem.innerText));
                    }.bind(this), 3000); // Save the changes after 3s without edition

                this.__internal__activeTimeouts.set(mapKey, timeout);
            }.bind(this);

        tabContainer.appendChild(minCurrencyInputContainer);

        // Add the shop item list
        const table = document.createElement("table");
        table.style.textAlign = "left"; // Align text to the left
        table.style.marginLeft = "auto"; // Align table to the right

        let isAnyItemHidden = false;
        let isAnyItemVisible = false;

        for (const itemData of this.__internal__shopItems.filter(data => data.item.currency === currency))
        {
            const isItemHidden = this.__internal__addItemToTheList(table, itemData);
            isAnyItemHidden |= isItemHidden;
            isAnyItemVisible |= !isItemHidden;
        }

        // Hide the entire tab of no item is visible
        if (!isAnyItemVisible)
        {
            const tabLabelContainer =
                document.getElementById(`automation-tab-${shopSettingsTabsGroup.replaceAll(" ", "-")}-${this.__internal__shopListCount}-label`);
            tabLabelContainer.hidden = true;
            tabContainer.hidden = true;

            this.__internal__tabs.set(currency, { label: tabLabelContainer, content: tabContainer });
        }

        tabContainer.appendChild(table);

        return isAnyItemHidden;
    }

    /**
     * @brief Adds an item row to the given @p table, ased on the given @p itemData
     *
     * @param {Element} table: The table element to add the item row to
     * @param itemData: The item data
     *
     * @returns True if the item is hidden, false otherwise
     */
    static __internal__addItemToTheList(table, itemData)
    {
        const tableRow = document.createElement("tr");
        tableRow.hidden = !itemData.isUnlocked(); // Hide the item row if needed
        table.appendChild(tableRow);

        // Update the item data
        itemData.rowElem = tableRow;

        // Add the purchase warning cell
        const purchaseWarningCell = document.createElement("td");
        purchaseWarningCell.style.paddingLeft = "7px";
        tableRow.appendChild(purchaseWarningCell);

        const warningTooltip = "No accessible shop to buy this item"
                             + Automation.Menu.TooltipSeparator
                             + "This can happen when you change region and you\n"
                             + "cannot travel back to the previous region shops yet";

        itemData.warningElement = document.createElement("span");
        itemData.warningElement.classList.add("hasAutomationTooltip");
        itemData.warningElement.classList.add("warningAutomationTooltip");
        itemData.warningElement.classList.add("shortTransitionAutomationTooltip");
        itemData.warningElement.style.cursor = "help";
        itemData.warningElement.setAttribute("automation-tooltip-text", warningTooltip);
        itemData.warningElement.hidden = true; // Hide it by default
        purchaseWarningCell.appendChild(itemData.warningElement);

        const warningIcon = document.createElement("span");
        warningIcon.classList.add("automationWarningIcon");
        itemData.warningElement.appendChild(warningIcon);

        // Add the toggle button
        const toogleCell = document.createElement("td");
        toogleCell.style.paddingLeft = "4px";
        tableRow.appendChild(toogleCell);

        const itemEnabledKey = this.__internal__advancedSettings.ItemEnabled(itemData.item.name);
        const buttonElem = Automation.Menu.addLocalStorageBoundToggleButton(itemEnabledKey);

        buttonElem.addEventListener("click", function()
            {
                // Display the warning if the item purchase its enable and the item can't be purchased at the moment
                itemData.warningElement.hidden = (Automation.Utils.LocalStorage.getValue(itemEnabledKey) != "true")
                                              || itemData.isPurchasable();
            }, false);

        toogleCell.appendChild(buttonElem);

        // Buy count
        const tableBuyLabelCell = document.createElement("td");
        tableBuyLabelCell.style.paddingLeft = "4px";
        tableBuyLabelCell.style.paddingRight = "4px";
        tableRow.appendChild(tableBuyLabelCell);

        tableBuyLabelCell.appendChild(document.createTextNode("Buy"));

        const tableBuyCountCell = document.createElement("td");
        tableRow.appendChild(tableBuyCountCell);
        const buyCount = Automation.Menu.createTextInputElement(4, "[0-9]");
        buyCount.innerHTML = Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.BuyAmount(itemData.item.name));
        buyCount.style.width = "100%"; // Make it take the whole cell space
        buyCount.style.margin = "0px";
        buyCount.style.textAlign = "right";
        tableBuyCountCell.appendChild(buyCount);

        const tableTargetLabelCell = document.createElement("td");
        tableTargetLabelCell.style.paddingRight = "4px";
        tableRow.appendChild(tableTargetLabelCell);

        // Item image
        const imageContainer = document.createElement("span");
        const itemImage = document.createElement("img");
        itemImage.src = itemData.item.image;
        itemImage.style.height = "25px";
        imageContainer.appendChild(itemImage);
        tableTargetLabelCell.appendChild(imageContainer);

        // Set the image tooltip
        const tooltip = itemData.item.displayName;
        imageContainer.classList.add("hasAutomationTooltip");
        imageContainer.classList.add("shopItemAutomationTooltip");
        imageContainer.classList.add("shortTransitionAutomationTooltip");
        imageContainer.style.cursor = "help";
        imageContainer.setAttribute("automation-tooltip-text", tooltip);

        // Until count
        tableTargetLabelCell.appendChild(document.createTextNode("until the player has"));

        const tableUntilCountCell = document.createElement("td");
        tableRow.appendChild(tableUntilCountCell);
        const untilCount = Automation.Menu.createTextInputElement(10, "[0-9]");
        untilCount.innerHTML = Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.TargetAmount(itemData.item.name));
        untilCount.style.width = "100%"; // Make it take the whole cell space
        untilCount.style.margin = "0px";
        untilCount.style.textAlign = "right";
        tableUntilCountCell.appendChild(untilCount);

        // Savemark cell (will be added after the max-price ones)
        const tableLastCell = document.createElement("td");

        // Max price (only set if the item is subject to multiplier decrease)
        let maxPrice = null;
        if (itemData.item.multiplierDecrease)
        {
            // Table price cells
            const tableMaxPriceLabelCell = document.createElement("td");
            tableMaxPriceLabelCell.style.paddingLeft = "4px";
            tableMaxPriceLabelCell.style.paddingRight = "4px";
            tableRow.appendChild(tableMaxPriceLabelCell);

            tableMaxPriceLabelCell.appendChild(document.createTextNode("at max base price"));

            // Table max price
            const tableMaxPriceCell = document.createElement("td");
            tableRow.appendChild(tableMaxPriceCell);
            maxPrice = Automation.Menu.createTextInputElement(10, "[0-9]");
            maxPrice.style.width = "100%"; // Make it take the whole cell space
            maxPrice.style.margin = "0px";
            maxPrice.style.textAlign = "right";
            maxPrice.innerHTML = Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.MaxBuyUnitPrice(itemData.item.name));
            tableMaxPriceCell.appendChild(maxPrice);

            maxPrice.oninput = function() { this.__internal__basePriceOnInputCallback(maxPrice, itemData); }.bind(this);

            // Add the currency image
            const currencyCell = document.createElement("td");
            const currencyImage = document.createElement("img");
            currencyImage.src = `assets/images/currency/${GameConstants.Currency[itemData.item.currency]}.svg`;
            currencyImage.style.height = "25px";
            currencyCell.appendChild(currencyImage);
            tableRow.appendChild(currencyCell);
        }
        else
        {
            // Keep the spacing and put the save mark right next to the last input text
            tableLastCell.colSpan = 4;
        }

        // The save status checkmark
        const checkmark = Automation.Menu.createAnimatedCheckMarkElement();
        tableLastCell.appendChild(checkmark);
        tableRow.appendChild(tableLastCell);

        // Set common oninput callbacks
        buyCount.oninput = function()
            {
                this.__internal__setSaveItemChangesTimeout(itemData.item.name, checkmark, buyCount, untilCount, maxPrice);
            }.bind(this);
        untilCount.oninput = function()
            {
                this.__internal__setSaveItemChangesTimeout(itemData.item.name, checkmark, buyCount, untilCount, maxPrice);
            }.bind(this);

        return tableRow.hidden;
    }

    /**
     * @brief Ensures that a valid baseprice was entered (ie. above the item minimum price)
     */
    static __internal__basePriceOnInputCallback(maxPriceElem, itemData)
    {
        if (maxPriceElem.innerText < itemData.item.basePrice)
        {
            maxPriceElem.classList.add("invalid");
            // Let the time to the user to edit the value before setting back the minimum possible value
            let timeout = setTimeout(function()
                {
                    // Only update the value if it's still under the minimum possible
                    if (maxPriceElem.innerText < itemData.item.basePrice)
                    {
                        maxPriceElem.innerText = itemData.item.basePrice;
                        maxPriceElem.classList.remove("invalid");

                        // Move the cursor at the end of the input if still focused
                        var range = document.createRange();

                        if (maxPriceElem === document.activeElement)
                        {
                            var set = window.getSelection();
                            range.setStart(maxPriceElem.childNodes[0], maxPriceElem.innerText.length);
                            range.collapse(true);
                            set.removeAllRanges();
                            set.addRange(range);
                        }
                    }
                    this.__internal__activeTimeouts.delete(itemData.item.name);
                }.bind(this), 1000);

            if (this.__internal__activeTimeouts.has(itemData.item.name))
            {
                clearTimeout(this.__internal__activeTimeouts.get(itemData.item.name));
                this.__internal__activeTimeouts.delete(itemData.item.name);
            }
            this.__internal__activeTimeouts.set(itemData.item.name, timeout);
        }
        else
        {
            maxPriceElem.classList.remove("invalid");
        }
        this.__internal__setSaveItemChangesTimeout(itemData.item.name, checkmark, buyCount, untilCount, maxPriceElem);
    }

    /**
     * @brief Builds the internal list of purchasable items
     */
    static __internal__buildShopItemList()
    {
        const sellableItems = {};

        // Insert this first to maintain the order
        for (const item of pokeMartShop.items)
        {
            sellableItems[item.name] = { item: item, towns: [], requirements: [] };
        }

        for (const townName in TownList)
        {
            const town = TownList[townName];
            // We only want shops, so discard anything that is not a shop
            for (const shop of town.content.filter((content) => Automation.Utils.isInstanceOf(content, "Shop")))
            {
                for (const item of shop.items)
                {
                    // Only add items that are:
                    // Pokemart
                    //   - Battle Items
                    //   - Energy restore
                    //   - Pokeballs (all types)
                    //   - Vitamins
                    //
                    // Eggs
                    //   - Eggs
                    //
                    // Farm tools
                    //   - Mulch
                    //   - Shovels
                    //   - Mulch shovels (they are different class from normal shovels)
                    if (!(Automation.Utils.isInstanceOf(item, "BattleItem")
                          || Automation.Utils.isInstanceOf(item, "EnergyRestore")
                          || Automation.Utils.isInstanceOf(item, "PokeballItem")
                          || Automation.Utils.isInstanceOf(item, "Vitamin")

                          || Automation.Utils.isInstanceOf(item, "EggItem")

                          || Automation.Utils.isInstanceOf(item, "MulchItem")
                          || Automation.Utils.isInstanceOf(item, "ShovelItem")
                          || Automation.Utils.isInstanceOf(item, "MulchShovelItem")))
                    {
                        continue;
                    }

                    // Skip any balls that are not sold in pokédollars for now (as they would be in out of contect of the tab)
                    if (Automation.Utils.isInstanceOf(item, "PokeballItem")
                        && (item.currency != GameConstants.Currency.money))
                    {
                        continue;
                    }

                    // New item, so add it to the list
                    if (sellableItems[item.name] === undefined)
                    {
                        sellableItems[item.name] = {item: item, towns: []};
                    }
                    sellableItems[item.name].towns.push(townName);
                }

            }
        }

        // Iterate using `of` instead of `Object.entries` to keep the order
        for (const itemData of Object.values(sellableItems))
        {
            const shopItem = { item: itemData.item }
            shopItem.isUnlocked = () => itemData.towns.some(townName => TownList[townName].isUnlocked());

            // This may restrict some items that are actually purchasable, but only until the player unlocks the port again
            shopItem.isPurchasable = function()
                {
                    return (pokeMartShop.items.includes(itemData.item) && this.__internal__isPokeMarkUnlocked())
                        || itemData.towns.some((townName) =>
                            {
                                const town = TownList[townName];
                                return town.isUnlocked() && Automation.Utils.Route.canMoveToRegion(town.region);
                            });
                }.bind(this);

            this.__internal__shopItems.push(shopItem);
        }

        this.__internal__shopItems.sort(this.__internal__itemSortCompare);
    }

    /**
     * @brief Sorts items based on their type
     *
     * @param a: The first item to compare
     * @param b: The second item to compare
     *
     * @returns The sort order
     */
    static __internal__itemSortCompare(a, b)
    {
        // Items that are different currencies will never be shown together, so this sort is techincally useless
        if (a.item.currency != b.item.currency)
        {
            return a.item.currency - b.item.currency;
        }

        // At this point, all comparisons are for the same currency

        // Tweak the money item sorting a bit
        if (a.item.currency === GameConstants.Currency.money)
        {
            // Force the pokeballs first (the other items are already sorted properly)
            if (Automation.Utils.isInstanceOf(a.item, "PokeballItem") && !Automation.Utils.isInstanceOf(b.item, "PokeballItem")) return -1;
            if (Automation.Utils.isInstanceOf(b.item, "PokeballItem") && !Automation.Utils.isInstanceOf(a.item, "PokeballItem")) return 1;
        }

        // Quest currency items are only eggs, so sort by item type (same as the game)
        if (a.item.currency === GameConstants.Currency.questPoint)
        {
            return a.item.type - b.item.type;
        }

        // Farm currency items should have both shovels before the mulch, and the mulch ordered by base price
        if (a.item.currency === GameConstants.Currency.farmPoint)
        {
            if (Automation.Utils.isInstanceOf(a.item, "ShovelItem")) return -1;
            if (Automation.Utils.isInstanceOf(b.item, "ShovelItem")) return 1;

            if (Automation.Utils.isInstanceOf(a.item, "MulchShovelItem")) return -1;
            if (Automation.Utils.isInstanceOf(b.item, "MulchShovelItem")) return 1;

            return a.item.basePrice - b.item.basePrice;
        }

        return 0;
    }

    /**
     * @brief Saves the settings related to the given @p itemName
     *
     * @param {string}  itemName: The name of the item to save the settings of
     * @param {Element} checkmark: The checkmark save indicator element
     * @param {Element} buyCount: The buy count input element
     * @param {Element} untilCount: The until count input element
     * @param {Element} maxPrice: The max price input element
     */
    static __internal__setSaveItemChangesTimeout(itemName, checkmark, buyCount, untilCount, maxPrice)
    {
        const mapKey = `${itemName}-Save`;

        if (this.__internal__activeTimeouts.has(mapKey))
        {
            clearTimeout(this.__internal__activeTimeouts.get(mapKey));
            this.__internal__activeTimeouts.delete(mapKey);
        }

        const timeout = setTimeout(function()
            {
                Automation.Menu.showCheckmark(checkmark, 2000);

                // Save the buying amount
                Automation.Utils.LocalStorage.setValue(this.__internal__advancedSettings.BuyAmount(itemName),
                                                       Automation.Utils.tryParseInt(buyCount.innerText));
                Automation.Utils.LocalStorage.setValue(this.__internal__advancedSettings.TargetAmount(itemName),
                                                       Automation.Utils.tryParseInt(untilCount.innerText));
                if (maxPrice)
                {
                    Automation.Utils.LocalStorage.setValue(this.__internal__advancedSettings.MaxBuyUnitPrice(itemName),
                                                           Automation.Utils.tryParseInt(maxPrice.innerText));
                }
            }.bind(this), 3000); // Save the changes after 3s without edition

        this.__internal__activeTimeouts.set(mapKey, timeout);
    }

    /**
     * @brief Sets the Shop settings default values in the local storage
     */
    static __internal__setDefaultSettingValues()
    {
        // Disable AutoBuy by default
        Automation.Utils.LocalStorage.setDefaultValue(this.Settings.FeatureEnabled, false);

        // Don't buy if the player has under 1'000'000 pokédollars by default
        // Load old value if it exists
        const oldPokedollarsValue = Automation.Utils.LocalStorage.getValue("Shop-MinPlayerCurrency");
        Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.MinPlayerCurrency(GameConstants.Currency.money),
                                                      oldPokedollarsValue ?? 1000000);
        // Clean up the old value
        Automation.Utils.LocalStorage.unsetValue("Shop-MinPlayerCurrency");
        // TODO (06/11/2022): Definitly remove the value in the next release

        // Don't buy if the player has under 10'000 quest points by default
        Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.MinPlayerCurrency(GameConstants.Currency.questPoint), 10000);

        // Don't buy if the player has under 10'000 farm points by default
        Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.MinPlayerCurrency(GameConstants.Currency.farmPoint), 10000);

        // Set default value for all buyable items
        for (const itemData of this.__internal__shopItems)
        {
            // Disable all items by default
            Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.ItemEnabled(itemData.item.name), false);

            // Buy at the cheapest possible by default
            Automation.Utils.LocalStorage.setDefaultValue(
                this.__internal__advancedSettings.MaxBuyUnitPrice(itemData.item.name), itemData.item.basePrice);

            if (itemData.item.currency == GameConstants.Currency.money)
            {
                // By 10 items at a time by default
                Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.BuyAmount(itemData.item.name), 10);

                // Stop buying at a stock of 10'000 by default
                Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.TargetAmount(itemData.item.name), 10000);
            }
            else if (itemData.item.currency == GameConstants.Currency.questPoint)
            {
                // By 1 item at a time by default
                Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.BuyAmount(itemData.item.name), 1);

                // Stop buying at a stock of 1 by default
                Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.TargetAmount(itemData.item.name), 1);
            }
            else if (itemData.item.currency == GameConstants.Currency.farmPoint)
            {
                // By 10 item at a time by default
                Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.BuyAmount(itemData.item.name), 10);

                // Stop buying at a stock of 1000 by default
                Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.TargetAmount(itemData.item.name), 1000);
            }
        }
    }

    /**
     * @brief The Shopping loop
     */
    static __internal__shop()
    {
        const totalSpent = {};
        for (const itemData of this.__internal__shopItems)
        {
            const currencyType = itemData.item.currency;
            const minPlayerCurrency =
                parseInt(Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.MinPlayerCurrency(currencyType)));

            // Skip any disabled item
            if (Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.ItemEnabled(itemData.item.name)) !== "true")
            {
                continue;
            }

            // Skip any not-purchasable item
            if (!itemData.isPurchasable())
            {
                itemData.warningElement.hidden = false;
                continue;
            }
            itemData.warningElement.hidden = true;

            const targetAmount = parseInt(Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.TargetAmount(itemData.item.name)));

            // Don't buy if the target quantity has been reached
            if (this.__internal__getItemQuantity(itemData.item) >= targetAmount)
            {
                continue;
            }

            // Only buy up to the target amount
            const buyAmount =
                Math.min(parseInt(Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.BuyAmount(itemData.item.name))),
                         targetAmount - this.__internal__getItemQuantity(itemData.item));

            if (buyAmount <= 0)
            {
                continue;
            }

            // Don't buy if it would bring the player under the set threshold
            const totalPrice = itemData.item.totalPrice(buyAmount);
            if (App.game.wallet.currencies[currencyType]() < (minPlayerCurrency + totalPrice))
            {
                continue;
            }

            // Consider the max price, if needed
            if (itemData.item.multiplierDecrease)
            {
                const maxUnitPrice =
                    parseInt(Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.MaxBuyUnitPrice(itemData.item.name)));

                // Don't buy if the base price is over the set desired max price
                if (itemData.item.totalPrice(1) > maxUnitPrice)
                {
                    continue;
                }
            }

            // Buy the item
            itemData.item.buy(buyAmount);
            if (!totalSpent[itemData.item.currency])
            {
                totalSpent[itemData.item.currency] = totalPrice;
            }
            else
            {
                totalSpent[itemData.item.currency] += totalPrice;
            }
        }

        // Only sent the notification if at least one currency was spent
        if (Object.entries(totalSpent).length > 0)
        {
            const currenciesSpent = [];
            for (const currency in totalSpent)
            {
                const currencyImage = `<img src="assets/images/currency/${GameConstants.Currency[currency]}.svg" height="25px">`;
                currenciesSpent.push(`${totalSpent[currency].toLocaleString('en-US')} ${currencyImage}`);
            }
            Automation.Notifications.sendNotif(`Bought some items for a total of ${currenciesSpent.join(", ")}`, "Shop");
        }
    }

    /**
     * @brief Gets the player's current quantity for the given @p item
     *
     * @param item: The pokeclicker item instance
     *
     * @returns The current quantity
     */
    static __internal__getItemQuantity(item)
    {
        // Pokeballs always return 0 if checked through player.itemList, their dedicated getter need to be used
        if (Automation.Utils.isInstanceOf(item, "PokeballItem"))
        {
            return App.game.pokeballs.getBallQuantity(GameConstants.Pokeball[item.name]);
        }

        // Shovels
        if (Automation.Utils.isInstanceOf(item, "ShovelItem"))
        {
            return App.game.farming.shovelAmt();
        }

        if (Automation.Utils.isInstanceOf(item, "MulchShovelItem"))
        {
            return App.game.farming.mulchShovelAmt();
        }

        // Mulch
        if (Automation.Utils.isInstanceOf(item, "MulchItem"))
        {
            return App.game.farming.mulchList[MulchType[item.name]]();
        }

        return player.itemList[item.name]();
    }

    /**
     * @brief Determines if the Poké Mart is accessible to the player
     *
     * @returns True if the Poké Mart is unlocked, false otherwise
     */
    static __internal__isPokeMarkUnlocked()
    {
        return App.game.statistics.gymsDefeated[GameConstants.getGymIndex('Champion Lance')]() > 0;
    }
}
