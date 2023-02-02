/**
 * @class AutomationNotifications provides notification settings
 */
class AutomationNotifications
{
    static Settings = {
                          FeatureEnabled: "Notifications-Enabled",

                          // Notification types
                          Farming: "Notifications-Farming",
                          Hatchery: "Notifications-Hatchery",
                          Shop: "Notifications-Shop",
                          Mining: "Notifications-Mining",
                          Focus: "Notifications-Focus",
                      };

    /**
     * @brief Builds the menu
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        // Only consider the BuildMenu init step
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            this.__internal__buildMenu();
        }
    }

    /**
     * @brief Adds a pokeclicker notification using the given @p message
     *        The notification is a blue one, without sound and with the "Automation" title
     *
     * @param {string} message: The notification message
     * @param {string} module: [optional] The automation module name
     * @param {string} subModule: [optional] The automation sub-module name
     */
    static sendNotif(message, module = null, subModule = null)
    {
        if ((Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) == "true")
            && (Automation.Utils.LocalStorage.getValue(this.Settings[module]) == "true"))
        {
            this.__internal__sendNotification(message, module, subModule, NotificationConstants.NotificationOption.primary, 3000);
        }
    }

    /**
     * @brief Adds a pokeclicker warning notification using the given @p message
     *        The notification is a yellow one, without sound and with the "Automation" title
     *
     * @param {string} message: The warning notification message
     * @param {string} module: [optional] The automation module name
     * @param {string} subModule: [optional] The automation sub-module name
     */
    static sendWarningNotif(message, module = null, subModule = null)
    {
        // Don't filter warnings, even if the notifications were disabled
        this.__internal__sendNotification(message, module, subModule, NotificationConstants.NotificationOption.warning, 10000);
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        // Add the related button to the automation menu
        let notificationContainer = document.createElement("div");
        Automation.Menu.AutomationButtonsDiv.appendChild(notificationContainer);

        Automation.Menu.addSeparator(notificationContainer);

        let notificationTooltip = "Enables automation-related notifications";
        Automation.Menu.addAutomationButton("Notifications", this.Settings.FeatureEnabled, notificationTooltip, notificationContainer);

        // Build the advanced settings
        this.__internal__buildAdvancedSettings(notificationContainer);
    }

    /**
     * @brief Adds the Underground advanced settings panel
     *
     * @param parent: The div container to insert the settings to
     */
    static __internal__buildAdvancedSettings(parent)
    {
        // Build the advanced settings panel
        let notificationsSettingPanel = Automation.Menu.addSettingPanel(parent);
        notificationsSettingPanel.style.textAlign = "right";

        let titleDiv = Automation.Menu.createTitleElement("Notifications advanced settings");
        titleDiv.style.marginBottom = "10px";
        notificationsSettingPanel.appendChild(titleDiv);

        let focusQuestsLabel = 'Show Focus feature notifications';
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(focusQuestsLabel, this.Settings.Focus, "", notificationsSettingPanel);

        let hatcheryLabel = 'Show Hatchery feature notifications';
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(hatcheryLabel, this.Settings.Hatchery, "", notificationsSettingPanel);

        let miningLabel = 'Show Mining feature notifications';
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(miningLabel, this.Settings.Mining, "", notificationsSettingPanel);

        let farmingLabel = 'Show Farming feature notifications';
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(farmingLabel, this.Settings.Farming, "", notificationsSettingPanel);

        let shopLabel = 'Show Auto Shop feature notifications';
        Automation.Menu.addLabeledAdvancedSettingsToggleButton(shopLabel, this.Settings.Shop, "", notificationsSettingPanel);
    }

    /**
     * @brief Builds and sends a PokéClicker notification
     *
     * @param {string} message: The notification message
     * @param {string} module: The automation module name
     * @param {string} subModule: The automation sub-module name
     * @param          type: The PokéClicker notification type
     * @param {number} timeout: The notification display timeout
     */
    static __internal__sendNotification(message, module, subModule, type, timeout)
    {
        let titleStr = "Automation";
        if (module !== null)
        {
            titleStr += " > " + module;

            if (subModule !== null)
            {
                titleStr += " > " + subModule;
            }
        }

        Notifier.notify({
                            title: titleStr,
                            message: message,
                            type: type,
                            timeout: timeout
                        });
    }
}