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
    }
  }

  /*********************************************************************\
  |***    Internal members, should never be used by other classes    ***|
  \*********************************************************************/

  static __internal__sellerContainer = null;

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
    autoSellerButton.addEventListener("click", this.toggleAutoSeller.bind(this), false);

    // Build advanced settings panel
    const sellerSettingPanel = Automation.Menu.addSettingPanel(autoFarmingButton.parentElement.parentElement);

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

  static __internal__toggleAutoSeller(enable) {}

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
