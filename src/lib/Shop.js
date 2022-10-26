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
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__shopLoop = null;
    static __internal__shopItems = [];
    static __internal__activeTimeouts = new Map();

    static __internal__advancedSettings = {
                                              MinPlayerCurrency: "Shop-MinPlayerCurrency",
                                              ItemEnabled: function(itemName) { return `Shop-${itemName}-Enabled`; },
                                              BuyAmount: function(itemName) { return `Shop-${itemName}-BuyAmount`; },
                                              TargetAmount:  function(itemName) { return `Shop-${itemName}-TargetAmount`; },
                                              MaxBuyUnitPrice:  function(itemName) { return `Shop-${itemName}-MaxBuyUnitPrice`; }
                                          };

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        // Add the related buttons to the automation menu
        let shoppingContainer = document.createElement("div");
        Automation.Menu.AutomationButtonsDiv.appendChild(shoppingContainer);

        Automation.Menu.addSeparator(shoppingContainer);

        let autoShopTooltip = "Automatically buys the configured items (see advanced settings)"
                            + Automation.Menu.TooltipSeparator
                            + "⚠️ This can be cost-heavy";
        let autoShopButton =
            Automation.Menu.addAutomationButton("Auto Shop", this.Settings.FeatureEnabled, autoShopTooltip, shoppingContainer);
        autoShopButton.addEventListener("click", this.__internal__toggleAutoBuy.bind(this), false);

        // Build advanced settings panel
        let shoppingSettingPanel = Automation.Menu.addSettingPanel(autoShopButton.parentElement.parentElement);

        let titleDiv = Automation.Menu.createTitleElement("Auto shop advanced settings");
        titleDiv.style.marginBottom = "10px";
        shoppingSettingPanel.appendChild(titleDiv);

        // Add the min pokedolar limit input
        let minPokedollarsInputContainer = document.createElement("div");
        minPokedollarsInputContainer.style.textAlign = "left";
        minPokedollarsInputContainer.style.marginBottom = "10px";
        minPokedollarsInputContainer.style.paddingLeft = "7px";

        let minPokedollarsText = document.createTextNode("Stop buying if the player has less than");
        minPokedollarsInputContainer.appendChild(minPokedollarsText);

        let minPokedollarsInputElem = Automation.Menu.createTextInputElement(10, "[0-9]");
        minPokedollarsInputElem.innerHTML = Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.MinPlayerCurrency);
        minPokedollarsInputContainer.appendChild(minPokedollarsInputElem);

        let minPokedollarsImage = document.createElement("img");
        minPokedollarsImage.src = "assets/images/currency/money.svg";
        minPokedollarsImage.style.height = "25px";
        minPokedollarsInputContainer.appendChild(minPokedollarsImage);

        // The save status checkmark
        let checkmark = Automation.Menu.createAnimatedCheckMarkElement();
        minPokedollarsInputContainer.appendChild(checkmark);

        minPokedollarsInputElem.oninput = function()
        {
            let mapKey = "MinPlayerCurrency-Save";

            if (this.__internal__activeTimeouts.has(mapKey))
            {
                clearTimeout(this.__internal__activeTimeouts.get(mapKey));
                this.__internal__activeTimeouts.delete(mapKey);
            }

            let timeout = setTimeout(function()
                {
                    Automation.Menu.showCheckmark(checkmark, 2000);

                    Automation.Utils.LocalStorage.setValue(this.__internal__advancedSettings.MinPlayerCurrency,
                                                           Automation.Utils.tryParseInt(minPokedollarsInputElem.innerText));
                }.bind(this), 3000); // Save the changes after 3s without edition

            this.__internal__activeTimeouts.set(mapKey, timeout);
        }.bind(this);

        shoppingSettingPanel.appendChild(minPokedollarsInputContainer);

        this.__internal__buildShopItemListMenu(shoppingSettingPanel);
    }

    /**
     * @brief Watches for the in-game items to be unlocked (ie. a shop selling it was unlocked).
     *        Once unlocked, the menu will be displayed to the user
     */
    static __internal__setShoppingUnlockWatcher()
    {
        let watcher = setInterval(function()
            {
                for (const itemData of this.__internal__shopItems)
                {
                    if (itemData.rowElem.hidden && itemData.isUnlocked())
                    {
                        itemData.rowElem.hidden = false;
                    }
                }

                if (this.__internal__shopItems.every(data => !data.rowElem.hidden))
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
                this.__internal__shopLoop = setInterval(this.__internal__shop.bind(this), 10000); // Runs every 10s
            }
        }
        else
        {
            clearInterval(this.__internal__shopLoop);
            this.__internal__shopLoop = null;
        }
    }

    /**
     * @brief Adds the shop item list and adds it to the advanced settings
     *
     * @param {Element} parentDiv: The div to add the list to
     */
    static __internal__buildShopItemListMenu(parentDiv)
    {
        let table = document.createElement("table");
        table.style.textAlign = "left";

        let isAnyItemHidden = false;

        for (const itemData of this.__internal__shopItems)
        {
            let tableRow = document.createElement("tr");
            table.appendChild(tableRow);
            let tableFirstCell = document.createElement("td");
            tableFirstCell.style.paddingLeft = "7px";
            tableRow.appendChild(tableFirstCell);
            tableRow.hidden = !itemData.isUnlocked(); // Hide the item row if needed

            // Update the item data
            itemData.rowElem = tableRow;
            isAnyItemHidden |= tableRow.hidden;

            // Add the toggle button
            let buttonElem = Automation.Menu.addLocalStorageBoundToggleButton(this.__internal__advancedSettings.ItemEnabled(itemData.item.name));
            tableFirstCell.appendChild(buttonElem);

            // Buy count
            let tableBuyLabelCell = document.createElement("td");
            tableBuyLabelCell.style.paddingLeft = "4px";
            tableBuyLabelCell.style.paddingRight = "4px";
            tableRow.appendChild(tableBuyLabelCell);

            let label = document.createTextNode("Buy");
            tableBuyLabelCell.appendChild(label);

            let tableBuyCountCell = document.createElement("td");
            tableRow.appendChild(tableBuyCountCell);
            let buyCount = Automation.Menu.createTextInputElement(4, "[0-9]");
            buyCount.innerHTML = Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.BuyAmount(itemData.item.name));
            buyCount.style.width = "100%"; // Make it take the whole cell space
            buyCount.style.margin = "0px";
            buyCount.style.textAlign = "right";
            tableBuyCountCell.appendChild(buyCount);

            let tableTargetLabelCell = document.createElement("td");
            tableTargetLabelCell.style.paddingRight = "4px";
            tableRow.appendChild(tableTargetLabelCell);
            let itemImage = document.createElement("img");
            if (itemData.item.imageDirectory !== undefined)
            {
                itemImage.src = `assets/images/items/${itemData.item.imageDirectory}/${itemData.item.name}.png`;
            }
            else
            {
                itemImage.src = `assets/images/items/${itemData.item.name}.png`;
            }
            itemImage.style.height = "25px";
            tableTargetLabelCell.appendChild(itemImage);

            // Until count
            label = document.createTextNode("until the player has");
            tableTargetLabelCell.appendChild(label);

            let tableUntilCountCell = document.createElement("td");
            tableRow.appendChild(tableUntilCountCell);
            let untilCount = Automation.Menu.createTextInputElement(10, "[0-9]");
            untilCount.innerHTML = Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.TargetAmount(itemData.item.name));
            untilCount.style.width = "100%"; // Make it take the whole cell space
            untilCount.style.margin = "0px";
            untilCount.style.textAlign = "right";
            tableUntilCountCell.appendChild(untilCount);

            // Max price
            let tableMaxPriceLabelCell = document.createElement("td");
            tableMaxPriceLabelCell.style.paddingLeft = "4px";
            tableMaxPriceLabelCell.style.paddingRight = "4px";
            tableRow.appendChild(tableMaxPriceLabelCell);
            label = document.createTextNode("at max base price");
            tableMaxPriceLabelCell.appendChild(label);

            let tableMaxPriceCell = document.createElement("td");
            tableRow.appendChild(tableMaxPriceCell);
            let maxPrice = Automation.Menu.createTextInputElement(10, "[0-9]");
            maxPrice.style.width = "100%"; // Make it take the whole cell space
            maxPrice.style.margin = "0px";
            maxPrice.style.textAlign = "right";
            maxPrice.innerHTML = Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.MaxBuyUnitPrice(itemData.item.name));
            tableMaxPriceCell.appendChild(maxPrice);

            let tableLastCell = document.createElement("td");
            tableRow.appendChild(tableLastCell);
            let pokedollarsImage = document.createElement("img");
            pokedollarsImage.src = "assets/images/currency/money.svg";
            pokedollarsImage.style.height = "25px";
            tableLastCell.appendChild(pokedollarsImage);

            // The save status checkmark
            let checkmark = Automation.Menu.createAnimatedCheckMarkElement();
            tableLastCell.appendChild(checkmark);

            parentDiv.appendChild(table);

            // Set all oninput callbacks
            buyCount.oninput = function()
                {
                    this.__internal__setSaveItemChangesTimeout(itemData.item.name, checkmark, buyCount, untilCount, maxPrice);
                }.bind(this);
            untilCount.oninput = function()
                {
                    this.__internal__setSaveItemChangesTimeout(itemData.item.name, checkmark, buyCount, untilCount, maxPrice);
                }.bind(this);
            maxPrice.oninput = function()
                {
                    if (maxPrice.innerText < itemData.item.basePrice)
                    {
                        maxPrice.classList.add("invalid");
                        // Let the time to the user to edit the value before setting back the minimum possible value
                        let timeout = setTimeout(function()
                            {
                                // Only update the value if it's still under the minimum possible
                                if (maxPrice.innerText < itemData.item.basePrice)
                                {
                                    maxPrice.innerText = itemData.item.basePrice;
                                    maxPrice.classList.remove("invalid");

                                    // Move the cursor at the end of the input if still focused
                                    var range = document.createRange();

                                    if (maxPrice === document.activeElement)
                                    {
                                        var set = window.getSelection();
                                        range.setStart(maxPrice.childNodes[0], maxPrice.innerText.length);
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
                        maxPrice.classList.remove("invalid");
                    }
                    this.__internal__setSaveItemChangesTimeout(itemData.item.name, checkmark, buyCount, untilCount, maxPrice);
                }.bind(this);
        }

        // Set an unlock watcher if needed
        if (isAnyItemHidden)
        {
            this.__internal__setShoppingUnlockWatcher();
        }
    }

    /**
     * @brief Builds the internal list of purchasable items
     */
    static __internal__buildShopItemList()
    {
        for (const item of pokeMartShop.items)
        {
            let itemData = { item: item }

            if ((item.name == "Pokeball") || (item.name == "xAttack") || (item.name == "xClick"))
            {
                // Those basic items are always purchasable
                itemData.isUnlocked = function() { return true; };
                itemData.isPurchasable = itemData.isUnlocked;
            }
            else if (item.name == "Greatball")
            {
                itemData.isUnlocked = function() { return TownList["Lavender Town"].isUnlocked(); };
                itemData.isPurchasable = function()
                    {
                        return this.__internal__isPokeMarkUnlocked()
                            || (TownList["Lavender Town"].isUnlocked() && Automation.Utils.Route.canMoveToRegion(0))
                            || TownList["Ecruteak City"].isUnlocked();
                    }.bind(this);
            }
            else if (item.name == "Ultraball")
            {
                itemData.isUnlocked = function() { return TownList["Fuchsia City"].isUnlocked(); };
                itemData.isPurchasable = function()
                    {
                        return this.__internal__isPokeMarkUnlocked()
                            || (TownList["Fuchsia City"].isUnlocked() && Automation.Utils.Route.canMoveToRegion(0))
                            || TownList["Blackthorn City"].isUnlocked();
                    }.bind(this);
            }
            else if ((item.name == "Lucky_egg") || (item.name == "Token_collector"))
            {
                itemData.isUnlocked = function() { return TownList["Pewter City"].isUnlocked(); };
                itemData.isPurchasable = function()
                    {
                        return this.__internal__isPokeMarkUnlocked()
                            || (TownList["Pewter City"].isUnlocked() && Automation.Utils.Route.canMoveToRegion(0))
                            || TownList["Violet City"].isUnlocked();
                    }.bind(this);
            }
            else if ((item.name == "Dowsing_machine") || (item.name == "Lucky_incense"))
            {
                itemData.isUnlocked = function() { return TownList["Lavender Town"].isUnlocked(); };
                itemData.isPurchasable = function()
                    {
                        return this.__internal__isPokeMarkUnlocked()
                            || (TownList["Lavender Town"].isUnlocked() && Automation.Utils.Route.canMoveToRegion(0))
                            || TownList["Olivine City"].isUnlocked();
                    }.bind(this);
            }
            else if (item.name == "SmallRestore")
            {
                itemData.isUnlocked = function() { return TownList["Cinnabar Island"].isUnlocked(); };
                itemData.isPurchasable = itemData.isUnlocked;
            }
            else if (item.name == "MediumRestore")
            {
                itemData.isUnlocked = function() { return TownList["Violet City"].isUnlocked(); };
                itemData.isPurchasable = itemData.isUnlocked;
            }
            else if (item.name == "LargeRestore")
            {
                itemData.isUnlocked = function() { return TownList["Blackthorn City"].isUnlocked(); };
                itemData.isPurchasable = itemData.isUnlocked;
            }

            this.__internal__shopItems.push(itemData);
        }
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
        let mapKey = `${itemName}-Save`;

        if (this.__internal__activeTimeouts.has(mapKey))
        {
            clearTimeout(this.__internal__activeTimeouts.get(mapKey));
            this.__internal__activeTimeouts.delete(mapKey);
        }

        let timeout = setTimeout(function()
            {
                Automation.Menu.showCheckmark(checkmark, 2000);

                // Save the buying amount
                Automation.Utils.LocalStorage.setValue(this.__internal__advancedSettings.BuyAmount(itemName),
                                                       Automation.Utils.tryParseInt(buyCount.innerText));
                Automation.Utils.LocalStorage.setValue(this.__internal__advancedSettings.TargetAmount(itemName),
                                                       Automation.Utils.tryParseInt(untilCount.innerText));
                Automation.Utils.LocalStorage.setValue(this.__internal__advancedSettings.MaxBuyUnitPrice(itemName),
                                                       Automation.Utils.tryParseInt(maxPrice.innerText));
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

        // Don't buy is the player has under 1'000'000 pokédollars by default
        Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.MinPlayerCurrency, 1000000);

        // Set default value for all buyable items
        for (const itemData of this.__internal__shopItems)
        {
            // Disable all items by default
            Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.ItemEnabled(itemData.item.name), false);

            // By 10 items at a time by default
            Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.BuyAmount(itemData.item.name), 10);

            // Stop buying at a stock of 10'000 by default
            Automation.Utils.LocalStorage.setDefaultValue(this.__internal__advancedSettings.TargetAmount(itemData.item.name), 10000);

            // Buy at the cheapest possible by default
            Automation.Utils.LocalStorage.setDefaultValue(
                this.__internal__advancedSettings.MaxBuyUnitPrice(itemData.item.name), itemData.item.basePrice);
        }
    }

    /**
     * @brief The Shopping loop
     */
    static __internal__shop()
    {
        let minPlayerCurrency = parseInt(Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.MinPlayerCurrency));

        let totalSpent = 0;

        for (const itemData of this.__internal__shopItems)
        {
            // Skip any disabled item
            if (Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.ItemEnabled(itemData.item.name)) !== "true")
            {
                continue;
            }

            // Skip any not-purchasable item
            if (!itemData.isPurchasable())
            {
                continue;
            }

            let targetAmount = parseInt(Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.TargetAmount(itemData.item.name)));

            // Don't buy if the target quantity has been reached
            if (this.__internal__getItemQuantity(itemData.item.name) > targetAmount)
            {
                continue;
            }

            let buyAmount = parseInt(Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.BuyAmount(itemData.item.name)));

            // Don't buy if it would bring the player under the set threshold
            let totalPrice = itemData.item.totalPrice(buyAmount);
            if (App.game.wallet.currencies[GameConstants.Currency.money]() < (minPlayerCurrency + totalPrice))
            {
                continue;
            }

            let maxUnitPrice = parseInt(Automation.Utils.LocalStorage.getValue(this.__internal__advancedSettings.MaxBuyUnitPrice(itemData.item.name)));

            // Don't buy if the base price is over the set desired max price
            if (itemData.item.totalPrice(1) > maxUnitPrice)
            {
                continue;
            }

            // Buy the item
            itemData.item.buy(buyAmount);
            totalSpent += totalPrice;
        }

        if (totalSpent > 0)
        {
            let pokedollarsImage = '<img src="assets/images/currency/money.svg" height="25px">';
            Automation.Notifications.sendNotif(`Bought some items for a total of ${totalSpent.toLocaleString('en-US')} ${pokedollarsImage}`, "Shop");
        }
    }

    /**
     * @brief Gets the player's current quantity for the given @p itemName
     *
     * @param {string} itemName
     *
     * @returns The current quantity
     */
    static __internal__getItemQuantity(itemName)
    {
        // Pokeballs always return 0 if checked through player.itemList, their dedicated getter need to be used
        if (itemName in GameConstants.Pokeball)
        {
            return App.game.pokeballs.getBallQuantity(GameConstants.Pokeball[itemName]);
        }

        return player.itemList[itemName]();
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
