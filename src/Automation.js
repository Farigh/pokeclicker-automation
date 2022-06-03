class Automation
{
    // Aliases on the other classes so every calls in the code can use the `Automation.Alias` form
    static Click = AutomationClick;
    static Dungeon = AutomationDungeon;
    static Farm = AutomationFarm;
    static Gym = AutomationGym;
    static Hatchery = AutomationHatchery;
    static Items = AutomationItems;
    static Menu = AutomationMenu;
    static Quest = AutomationQuest;
    static Trivia = AutomationTrivia;
    static Underground = AutomationUnderground;
    static Utils = AutomationUtils;

    /**************************/
    /*    PUBLIC INTERFACE    */
    /**************************/
    static start()
    {
        var timer = setInterval(function()
        {
            // Check if the game window has loaded
            if (!document.getElementById("game").classList.contains("loading"))
            {
                clearInterval(timer);

                // Log automation start
                console.log(`[${GameConstants.formatDate(new Date())}] %cStarting automation..`, "color:#8e44ad;font-weight:900;");

                this.Utils.init();

                this.Menu.build();
                this.Trivia.start();

                this.Click.start();
                this.Hatchery.start();
                this.Underground.start();
                this.Farm.start();
                this.Gym.start();
                this.Dungeon.start();
                this.Items.start();
                this.Quest.start();

                // Add a notification button to the automation menu
                Automation.Menu.__addSeparator();

                let notificationTooltip = "Enables automation-related notifications";
                this.Menu.__addAutomationButton("Notification", "automationNotificationsEnabled", notificationTooltip);

                // Log automation startup completion
                console.log(`[${GameConstants.formatDate(new Date())}] %cAutomation started`, "color:#2ecc71;font-weight:900;");
            }
        }.bind(this), 200); // Try to instanciate every 0.2s
    }
}
