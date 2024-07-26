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
                    if (itemData.htmlElems.row && itemData.htmlElems.row.hidden && itemData.isUnlocked())
                    {
                        itemData.htmlElems.row.hidden = false;
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
                this.__internal__shopLoop = setInterval(this.__internal__shop.bind(this), 10000); // Then, runs every 10s
                this.__internal__shop(); // Run once immediately
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
                const mapKey = `MinPlayerCurrency-${currency}-Save`;

                if (this.__internal__activeTimeouts.has(mapKey))
                {
                    clearTimeout(this.__internal__activeTimeouts.get(mapKey));
                    this.__internal__activeTimeouts.delete(mapKey);
                }

                const timeout = setTimeout(function()
                    {
                        Automation.Menu.showCheckmark(checkmark, 2000);

                        Automation.Utils.LocalStorage.setValue(this.__internal__advancedSettings.MinPlayerCurrency(currency),
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
        // Add a table row
        itemData.htmlElems.row = document.createElement("tr");
        itemData.htmlElems.row.hidden = !itemData.isUnlocked(); // Hide the item row if needed
        table.appendChild(itemData.htmlElems.row);

        // Add the purchase warning cell
        const purchaseWarningCell = document.createElement("td");
        purchaseWarningCell.style.paddingLeft = "7px";
        itemData.htmlElems.row.appendChild(purchaseWarningCell);

        const warningTooltip = "No accessible shop to buy this item"
                             + Automation.Menu.TooltipSeparator
                             + "This can happen when you change region and you\n"
                             + "cannot travel back to the previous region shops yet";

        itemData.htmlElems.warning = document.createElement("span");
        itemData.htmlElems.warning.classList.add("hasAutomationTooltip");
        itemData.htmlElems.warning.classList.add("warningAutomationTooltip");
        itemData.htmlElems.warning.classList.add("shortTransitionAutomationTooltip");
        itemData.htmlElems.warning.style.cursor = "help";
        itemData.htmlElems.warning.setAttribute("automation-tooltip-text", warningTooltip);
        itemData.htmlElems.warning.hidden = true; // Hide it by default
        purchaseWarningCell.appendChild(itemData.htmlElems.warning);

        const warningIcon = document.createElement("span");
        warningIcon.classList.add("automationWarningIcon");
        itemData.htmlElems.warning.appendChild(warningIcon);

        // Add the toggle button
        const toggleCell = document.createElement("td");
        toggleCell.style.paddingLeft = "4px";
        itemData.htmlElems.row.appendChild(toggleCell);

        const itemEnabledKey = this.__internal__advancedSettings.ItemEnabled(itemData.item.name);
        const buttonElem = Automation.Menu.addLocalStorageBoundToggleButton(itemEnabledKey);

        buttonElem.addEventListener("click", function()
            {
                // Display the warning if the item purchase its enable and the item can't be purchased at the moment
                itemData.htmlElems.warning.hidden = (Automation.Utils.LocalStorage.getValue(itemEnabledKey) != "true")
                                                 || itemData.isPurchasable();
            }, false);

        toggleCell.appendChild(buttonElem);

        // Buy count
        const tableBuyLabelCell = document.createElement("td");
        tableBuyLabelCell.style.paddingLeft = "4px";
        tableBuyLabelCell.style.paddingRight = "4px";
        itemData.htmlElems.row.appendChild(tableBuyLabelCell);

        tableBuyLabelCell.appendChild(document.createTextNode("Buy"));

        const tableBuyCountCell = document.createElement("td");
        itemData.htmlElems.row.appendChild(tableBuyCountCell);
        itemData.htmlElems.buyCount = Automation.Menu.createTextInputElement(4, "[0-9]");
        itemData.htmlElems.buyCount.innerHTML = Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.BuyAmount(itemData.item.name));
        itemData.htmlElems.buyCount.style.width = "100%"; // Make it take the whole cell space
        itemData.htmlElems.buyCount.style.margin = "0px";
        itemData.htmlElems.buyCount.style.textAlign = "right";
        tableBuyCountCell.appendChild(itemData.htmlElems.buyCount);

        const tableTargetLabelCell = document.createElement("td");
        tableTargetLabelCell.style.paddingRight = "4px";
        itemData.htmlElems.row.appendChild(tableTargetLabelCell);

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
        itemData.htmlElems.row.appendChild(tableUntilCountCell);
        itemData.htmlElems.untilCount = Automation.Menu.createTextInputElement(10, "[0-9]");
        itemData.htmlElems.untilCount.innerHTML = Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.TargetAmount(itemData.item.name));
        itemData.htmlElems.untilCount.style.width = "100%"; // Make it take the whole cell space
        itemData.htmlElems.untilCount.style.margin = "0px";
        itemData.htmlElems.untilCount.style.textAlign = "right";
        tableUntilCountCell.appendChild(itemData.htmlElems.untilCount);

        // Savemark cell (will be added after the max-price ones)
        const tableLastCell = document.createElement("td");

        // Max price (only set if the item is subject to multiplier decrease)
        if (itemData.item.multiplierDecrease)
        {
            // Table price cells
            const tableMaxPriceLabelCell = document.createElement("td");
            tableMaxPriceLabelCell.style.paddingLeft = "4px";
            tableMaxPriceLabelCell.style.paddingRight = "4px";
            itemData.htmlElems.row.appendChild(tableMaxPriceLabelCell);

            tableMaxPriceLabelCell.appendChild(document.createTextNode("at max base price"));

            // Table max price
            const tableMaxPriceCell = document.createElement("td");
            itemData.htmlElems.row.appendChild(tableMaxPriceCell);
            itemData.htmlElems.maxPrice = Automation.Menu.createTextInputElement(10, "[0-9]");
            itemData.htmlElems.maxPrice.style.width = "100%"; // Make it take the whole cell space
            itemData.htmlElems.maxPrice.style.margin = "0px";
            itemData.htmlElems.maxPrice.style.textAlign = "right";
            itemData.htmlElems.maxPrice.innerHTML =
                Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.MaxBuyUnitPrice(itemData.item.name));
            tableMaxPriceCell.appendChild(itemData.htmlElems.maxPrice);

            itemData.htmlElems.maxPrice.oninput = function() { this.__internal__basePriceOnInputCallback(itemData); }.bind(this);

            // Add the currency image
            const currencyCell = document.createElement("td");
            const currencyImage = document.createElement("img");
            currencyImage.src = `assets/images/currency/${GameConstants.Currency[itemData.item.currency]}.svg`;
            currencyImage.style.height = "25px";
            currencyCell.appendChild(currencyImage);
            itemData.htmlElems.row.appendChild(currencyCell);
        }
        else
        {
            // Keep the spacing and put the save mark right next to the last input text
            tableLastCell.colSpan = 4;

            itemData.htmlElems.maxPrice = null;
        }

        // The save status checkmark
        itemData.htmlElems.checkmark = Automation.Menu.createAnimatedCheckMarkElement();
        tableLastCell.appendChild(itemData.htmlElems.checkmark);
        itemData.htmlElems.row.appendChild(tableLastCell);

        // Set common oninput callbacks
        itemData.htmlElems.buyCount.oninput = function()
            {
                this.__internal__setSaveItemChangesTimeout(itemData);
            }.bind(this);
        itemData.htmlElems.untilCount.oninput = function()
            {
                this.__internal__setSaveItemChangesTimeout(itemData);
            }.bind(this);

        return itemData.htmlElems.row.hidden;
    }

    /**
     * @brief Ensures that a valid baseprice was entered (ie. above the item minimum price)
     *
     * @param itemData: The item data
     */
    static __internal__basePriceOnInputCallback(itemData)
    {
        if (itemData.htmlElems.maxPrice.innerText < itemData.item.basePrice)
        {
            itemData.htmlElems.maxPrice.classList.add("invalid");
            // Let the time to the user to edit the value before setting back the minimum possible value
            let timeout = setTimeout(function()
                {
                    // Only update the value if it's still under the minimum possible
                    if (itemData.htmlElems.maxPrice.innerText < itemData.item.basePrice)
                    {
                        itemData.htmlElems.maxPrice.innerText = itemData.item.basePrice;
                        itemData.htmlElems.maxPrice.classList.remove("invalid");

                        // Move the cursor at the end of the input if still focused
                        var range = document.createRange();

                        if (itemData.htmlElems.maxPrice === document.activeElement)
                        {
                            var set = window.getSelection();
                            range.setStart(itemData.htmlElems.maxPrice.childNodes[0], itemData.htmlElems.maxPrice.innerText.length);
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
            itemData.htmlElems.maxPrice.classList.remove("invalid");
        }
        this.__internal__setSaveItemChangesTimeout(itemData);
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
            const shopItem = { item: itemData.item, htmlElems: {} }
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
     * @param itemData: The item data
     */
    static __internal__setSaveItemChangesTimeout(itemData)
    {
        const mapKey = `${itemData.item.name}-Save`;

        if (this.__internal__activeTimeouts.has(mapKey))
        {
            clearTimeout(this.__internal__activeTimeouts.get(mapKey));
            this.__internal__activeTimeouts.delete(mapKey);
        }

        const timeout = setTimeout(function()
            {
                Automation.Menu.showCheckmark(itemData.htmlElems.checkmark, 2000);

                // Save the buying amount
                Automation.Utils.LocalStorage.setValue(this.__internal__advancedSettings.BuyAmount(itemData.item.name),
                                                       Automation.Utils.tryParseInt(itemData.htmlElems.buyCount.innerText));
                Automation.Utils.LocalStorage.setValue(this.__internal__advancedSettings.TargetAmount(itemData.item.name),
                                                       Automation.Utils.tryParseInt(itemData.htmlElems.untilCount.innerText));
                if (itemData.htmlElems.maxPrice)
                {
                    Automation.Utils.LocalStorage.setValue(this.__internal__advancedSettings.MaxBuyUnitPrice(itemData.item.name),
                                                           Automation.Utils.tryParseInt(itemData.htmlElems.maxPrice.innerText));
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
        Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.MinPlayerCurrency(GameConstants.Currency.money), 1000000);

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
                itemData.htmlElems.warning.hidden = false;
                continue;
            }
            itemData.htmlElems.warning.hidden = true;

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
