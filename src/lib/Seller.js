/**
 * @class AutomationSeller provides functionality to automatically sell treasures and plates
 */
class AutomationSeller {
  static Settings = {
    FeatureEnabled: "AutoSeller-Enabled",
    AutoSellTreasures: "AutoSell-Treasures",
    AutoSellPlates: "AutoSell-Plates",
  };

  /**
   * @brief Builds the menu, and retores previous running state if needed
   *
   * @param initStep: The current automation init step
   */
  static initialize(initStep) {
    if (initStep === Automation.InitSteps.BuildMenu) {
      this.__internal__buildMenu();
      this.__internal__setDefaultValues();
    } else if (initStep === Automation.initStep.Finalize) {
      this.__internal__toggleAutoSeller();
    }
  }

  /*********************************************************************\
  |***    Internal members, should never be used by other classes    ***|
  \*********************************************************************/

  static __internal__sellerContainer = null;
  static __internal__sellLoop = null;

  static __internal__treasureList = [
    "Rare_bone",
    "Star_piece",
    "Revive",
    "Max_revive",
    "Iron_ball",
    "Heart_scale",
    "Light_clay",
    "Odd_keystone",
    "Hard_stone",
    "Oval_stone",
    "Everstone",
    "Smooth_rock",
    "Heat_rock",
    "Icy_rock",
    "Damp_rock",
  ];

  static __internal__plateList = [
    "Draco_plate",
    "Dread_plate",
    "Earth_plate",
    "Fist_plate",
    "Flame_plate",
    "Icicle_plate",
    "Insect_plate",
    "Iron_plate",
    "Meadow_plate",
    "Mind_plate",
    "Sky_plate",
    "Splash_plate",
    "Spooky_plate",
    "Stone_plate",
    "Toxic_plate",
    "Zap_plate",
    "Pixie_plate",
    "Blank_plate",
  ];

  /**
   * @brief Builds the menu
   */
  static __internal__buildMenu() {
    this.__internal__sellerContainer = document.createElement("div");
    Automation.Menu.AutomationButtonsDiv.appendChild(this.__internal__sellerContainer);

    Automation.Menu.addSeparator(this.__internal__sellerContainer);

    if (!App.game.underground.canAccess()) {
      this.__internal__sellerContainer.hidden = true;
      this.__internal__setUndergroundUnlockWatcher();
    }

    const autoSellerTooltip = "Automatically sell treasures and plates" + Automation.Menu.TooltipSeparator + "Auto sell treasures and plates for diamonds and gems.";
    const autoSellerButton = Automation.Menu.addAutomationButton("Auto Seller", this.Settings.FeatureEnabled, autoSellerTooltip, this.__internal__sellerContainer);
    autoSellerButton.addEventListener("click", this.__internal__toggleAutoSeller.bind(this), false);

    // Build advanced settings panel
    const sellerSettingPanel = Automation.Menu.addSettingPanel(autoSellerButton.parentElement.parentElement);

    const titleDiv = Automation.Menu.createTitleElement("Seller advanced settings");
    titleDiv.style.marginBottom = "10px";
    sellerSettingPanel.appendChild(titleDiv);

    // Automatically sell treasures
    const autoSellTreasuresLabel = "Auto Sell Treasures";
    const autoSellTreasuresTooltip = "Automatically sell each treasures every 10s.";
    Automation.Menu.addLabeledAdvancedSettingsToggleButton(autoSellTreasuresLabel, this.Settings.AutoSellTreasures, autoSellTreasuresTooltip, sellerSettingPanel);

    // Automatically sell treasures
    const autoSellPlatesLabel = "Auto Sell Plates";
    const autoSellPlatesTooltip = "Automatically sell each plates every 10s.";
    Automation.Menu.addLabeledAdvancedSettingsToggleButton(autoSellPlatesLabel, this.Settings.AutoSellPlates, autoSellPlatesTooltip, sellerSettingPanel);
  }

  static __internal__toggleAutoSeller(enable) {
    if (enable !== true && enable !== false) {
      enable = Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true";
    }

    if (enable) {
      if (this.__internal__sellLoop === null) {
        this.__internal__sellLoop = setInterval(this.__internal__sell.bind(this), 10000);
        this.__internal__sell();
      }
    } else {
      clearInterval(this.__internal__sellLoop);
      this.__internal__sellLoop = null;
    }
  }

  static __internal__sell() {
    Automation.Notifications.sendNotif("start selling", "Seller");

    const sellList = [];

    if (Automation.Utils.LocalStorage.getValue(this.Settings.AutoSellTreasures) === "true") sellList.push.apply(sellList, this.__internal__treasureList);

    if (Automation.Utils.LocalStorage.getValue(this.Settings.AutoSellPlates) === "true") sellList.push.apply(sellList, this.__internal__plateList);

    Automation.Notifications.sendNotif("LIST " + sellList.length, "Seller");

    sellList.forEach((targetItem) => {
      if (sellList.length > 0 && player && player.itemList) {
        const itemToSell = UndergroundItems.list.find((item) => item && item.itemName === targetItem);

        if (itemToSell && player.itemList[targetItem]() > 0) {
          const quantity = player.itemList[targetItem]();

          UndergroundTrading.sellAmount = quantity;
          UndergroundTrading.selectedTradeFromItem = itemToSell;

          if (UndergroundTrading.canSell) {
            Automation.Notifications.sendNotif("SELL", "Seller");

            UndergroundTrading.sell();
          } else {
            Automation.Notifications.sendNotif();

            Automation.Notifications.sendNotif(`❌ Impossible de vendre ${itemToSell.itemName}. Vérifiez les conditions.`, "Seller");
            Automation.Notifications.sendNotif(`   - sellAmount: ${UndergroundTrading.sellAmount}`, "Seller");
            // Vérifie si hasSellValue existe avant de l'appeler
            if (typeof itemToSell.hasSellValue === "function") {
              Automation.Notifications.sendNotif(`   - hasSellValue(): ${itemToSell.hasSellValue()}`, "Seller");
            } else {
              Automation.Notifications.sendNotif(`   - hasSellValue(): N/A (fonction non trouvée)`, "Seller");
            }
            Automation.Notifications.sendNotif(`   - quantité en inventaire: ${player.itemList[targetItemName]()}`, "Seller");
          }
        } else if (itemToSell && player.itemList[targetItemName]() === 0) {
          // Automation.Notifications.sendNotif(`ℹ️ Pas de ${targetItemName} en inventaire, pas de vente.`); // Décommenter si tu veux ce log
        } else {
          Automation.Notifications.sendNotif(`❓ Objet "${targetItemName}" non trouvé dans UndergroundItems.list ou player.itemList.`, "Seller");
        }
      } else {
        Automation.Notifications.sendNotif("⚠️ UndergroundItems.list ou player.itemList non défini ou n'est pas un tableau, la vente automatique ne peut pas fonctionner pour le moment.", "Seller");
      }
    });
  }

  static __internal__setDefaultValues() {
    // Enable AutoBuy by default
    Automation.Utils.LocalStorage.setDefaultValue(this.Settings.FeatureEnabled, true);

    Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AutoSellTreasures, true);
    Automation.Utils.LocalStorage.setDefaultValue(this.Settings.AutoSellPlates, true);
  }

  /**
   * @brief Watches for the in-game functionality to be unlocked.
   *        Once unlocked, the menu will be displayed to the user
   */
  static __internal__setUndergroundUnlockWatcher() {
    let watcher = setInterval(
      function () {
        if (App.game.underground.canAccess()) {
          clearInterval(watcher);
          this.__internal__undergroundContainer.hidden = false;
          this.toggleAutoMining();
        }
      }.bind(this),
      10000
    ); // Check every 10 seconds
  }
}
