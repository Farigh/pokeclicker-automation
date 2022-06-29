/**
 * @class AutomationAutoBuy provides functionality to automatically buy common items
 */
class AutomationAutoBuy {

    static Settings = {
        FeatureEnabled: "AutoBuy-Enabled",
        LastSelectedItem: "AutoBuy-LastSelectedItem",
        Items: pokeMartShop.items.reduce((prev, item) => (
            {
                ...prev,
                [item.saveName]:
                    {
                        Enabled: `AutoBuy-${item.saveName}-Enabled`,
                        Limit: `AutoBuy-${item.saveName}-Limit`,
                    }
            }), {}
        )
    };
    static __autoBuyLoop = null;

    static initialize(initStep) {
        if (initStep === Automation.InitSteps.BuildMenu) {
            // Disable AutoBuy by default
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.FeatureEnabled, false);
            this.Settings.Items.forEa
            Object.keys(this.Settings.Items).forEach((item) =>
            {

                Automation.Utils.LocalStorage.setDefaultValue(this.Settings.Items[item].Limit, 1000)
            })

            this.__buildMenu();
        } else if (initStep === Automation.InitSteps.Finalize) {
            // Restore previous session state
            this.__toggleAutoBuy();
        }
    }

    static __buildMenu() {
        let autoBuyTitle = '<img src="assets/images/currency/money.svg" height="20px" style="position:relative; bottom: 3px;">'
            + '&nbsp;Auto Buy&nbsp;'
            + '<img src="assets/images/currency/money.svg" height="20px" style="position: relative; bottom: 3px;">';
        let autoBuyDiv = Automation.Menu.__addCategory("automationAutoBuy", autoBuyTitle);

        let autoBuyTooltip = "Automatically purchase items when they are at their lowest price"
            + Automation.Menu.__tooltipSeparator()
            + "You can specify which items to buy and a limit"
        let generalEnabledButton = Automation.Menu.__addAutomationButton("Enabled", this.Settings.FeatureEnabled, autoBuyTooltip, autoBuyDiv);
        generalEnabledButton.addEventListener("click", this.__toggleAutoBuy.bind(this), false);

        // let autoBuySelectContainer = Automation.Menu.__createDropDownList("autoBuySelection");
        // pokeMartShop.items.forEach((item) =>
        //     {
        //         let opt = document.createElement("option");
        //         opt.value = item.saveName;
        //         opt.id = item.saveName;
        //         opt.textContent = item.displayName;
        //         autoBuySelectContainer.options.add(opt)
        //     }
        // )
        // this.__selectedOnChange();

        Automation.Menu.__addSeparator(autoBuyDiv);
        pokeMartShop.items.forEach((item) =>
            {
                Automation.Menu.__addAutomationButton(
                    `${item.displayName} (Limit ${Automation.Utils.LocalStorage.getValue(this.Settings.Items[item.saveName].Limit)})`,
                    this.Settings.Items[item.saveName].Enabled,
                    undefined,
                    autoBuyDiv)
            })
    }

    static __toggleAutoBuy(enable)
    {
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            if (this.__autoBuyLoop === null)
            {
                this.__autoBuyLoop = setInterval(this.__run.bind(this), 10000); // Runs every 10s
            }
        }
        else
        {
            clearInterval(this.__autoBuyLoop);
            this.__autoBuyLoop = null;
        }
    }
    static __getQuantity(item)
    {
        // since pokeballs always return 0 if checked through player.itemList, we need to override them
        const lookup =
            {
                'Pokeball': () => App.game.pokeballs.getBallQuantity(0),
                'Greatball': () => App.game.pokeballs.getBallQuantity(1),
                'Ultraball': () => App.game.pokeballs.getBallQuantity(2),
            }
        if(Object.keys(lookup).includes(item.saveName)) return lookup[item.saveName]()
        else if (Object.keys(player.itemList).includes(item.saveName)) return player.itemList[item.saveName]()
        else throw(`Unable to find quantity of item ${item.saveName}`)
    }
    static __run()
    {
        const quantity = 100
        pokeMartShop.items.forEach((item) => {
            if (Automation.Utils.LocalStorage.getValue(this.Settings.Items[item.saveName].Enabled) === "true"
                &&
                parseInt(Automation.Utils.LocalStorage.getValue(this.Settings.Items[item.saveName].Limit)) > this.__getQuantity(item)
                &&
                item.price() === item.basePrice
                &&
                App.game.wallet.currencies[item.currency]() > item.totalPrice(quantity)
            )
            {
                item.buy(quantity)
            }
        })
    }
}
