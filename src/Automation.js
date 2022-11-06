/**
 * @brief The automation main class
 */
class Automation
{
    // Aliases on the other classes so every calls in the code can use the `Automation.<Alias>` form
    static BattleCafe = AutomationBattleCafe;
    static Click = AutomationClick;
    static Dungeon = AutomationDungeon;
    static Farm = AutomationFarm;
    static Focus = AutomationFocus;
    static Gym = AutomationGym;
    static Hatchery = AutomationHatchery;
    static Items = AutomationItems;
    static Notifications = AutomationNotifications;
    static Menu = AutomationMenu;
    static Shop = AutomationShop;
    static Trivia = AutomationTrivia;
    static Underground = AutomationUnderground;
    static Utils = AutomationUtils;

    static InitSteps = class AutomationInitSteps
    {
        static BuildMenu = 0;
        static Finalize = 1;
    };

    /**************************/
    /*    PUBLIC INTERFACE    */
    /**************************/

    /**
     * @brief Automation entry point
     *
     * @param {boolean} disableFeaturesByDefault: True if every features needs to be disabeld by default, False otherwise
     */
    static start(disableFeaturesByDefault)
    {
        this.Menu.DisableFeaturesByDefault = disableFeaturesByDefault;

        var timer = setInterval(function()
        {
            // Check if the game window has loaded
            if (!document.getElementById("game").classList.contains("loading"))
            {
                clearInterval(timer);

                // Log automation start
                console.log(`[${GameConstants.formatDate(new Date())}] %cStarting automation..`, "color:#8e44ad;font-weight:900;");

                for (let initKey in this.InitSteps)
                {
                    let initStep = this.InitSteps[initKey];

                    this.Utils.initialize(initStep);
                    this.Menu.initialize(initStep);

                    // Battle Café panel (Always put it first)
                    this.BattleCafe.initialize(initStep);

                    // Then add the main menu
                    this.Menu.addMainAutomationPanel(initStep);

                    // 'Automation' panel
                    this.Click.initialize(initStep);
                    this.Focus.initialize(initStep);
                    this.Hatchery.initialize(initStep);
                    this.Underground.initialize(initStep);
                    this.Farm.initialize(initStep);
                    this.Shop.initialize(initStep);
                    this.Items.initialize(initStep);
                    this.Notifications.initialize(initStep);

                    // 'Trivia' panel
                    this.Trivia.initialize(initStep);

                    // 'Gym' and 'Dungeon' panels
                    this.Gym.initialize(initStep);
                    this.Dungeon.initialize(initStep);
                }

                // Log automation startup completion
                console.log(`[${GameConstants.formatDate(new Date())}] %cAutomation started`, "color:#2ecc71;font-weight:900;");
            }
        }.bind(this), 200); // Try to instanciate every 0.2s
    }
}
