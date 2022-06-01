/**
 * @class The automation loader abstraction class.
 *
 * This class contains a loadFromUrl function that is used by the userscript to load the module.
 * This is possible because pokeclicker is in the same origin as GitHub.
 * pokeclicker.com is probably only an alias on a github.io pages.
 */
class AutomationComponentLoader
{
    static __baseUrl = null;
    static __loadingTable = {};

    /**
     * @brief Loads the Automation classes from the given @p baseUrl
     *
     * @param baseUrl: The base URL to download the lib component files from
     *
     * @warning This function should never change its prototype, otherwise it would break the API
     */
    static loadFromUrl(baseUrl)
    {
        this.__baseUrl = baseUrl;

        this.__loadScript("src/lib/Click.js");
        this.__loadScript("src/lib/Dungeon.js");
        this.__loadScript("src/lib/Farm.js");
        this.__loadScript("src/lib/Gym.js");
        this.__loadScript("src/lib/Hatchery.js");
        this.__loadScript("src/lib/Items.js");
        this.__loadScript("src/lib/Menu.js");
        this.__loadScript("src/lib/Quest.js");
        this.__loadScript("src/lib/Trivia.js");
        this.__loadScript("src/lib/Underground.js");
        this.__loadScript("src/lib/Utils.js");

        this.__setupAutomationRunner();
    }

    /**
     * @brief Download the given @p fileRelativePath js file, and loads it into the page as a script component
     *
     * @param fileRelativePath: The file path relative to the @p __baseUrl
     */
    static __loadScript(fileRelativePath)
    {
        let scriptName = this.__extractNameFromFile(fileRelativePath);
        this.__loadingTable[scriptName] = false;

        // Github only serves plain-text so we can't load it as a script object directly
        let request = new XMLHttpRequest();
        request.onreadystatechange = function()
            {
                if ((request.readyState == 4) && (request.status == 200))
                {
                    // Store the content into a script div
                    var script = document.createElement('script');
                    script.innerHTML = request.responseText;
                    script.id = "pokeclicker-automation-" + scriptName;
                    document.head.appendChild(script);

                    this.__loadingTable[scriptName] = true;
                }
            }.bind(this);

        // Download the content
        request.open("GET", this.__baseUrl + fileRelativePath, true);
        request.send();
    }

    /**
     * @brief Extracts the script name from the given @p filePath
     *
     * @param filePath: The path to extract the script name from
     */
    static __extractNameFromFile(filePath)
    {
        return filePath.match(/^(.*\/)?([^/]+)\.js$/)[2].toLowerCase();
    }

    /**
     * @brief Sets a loading watcher.
     *        Once all scripts are properly loaded, the main class is loaded.
     *        Once done, it runs the automation.
     */
    static __setupAutomationRunner()
    {
        let isMainLoading = false;

        let watcher = setInterval(function ()
            {
                let isLoadingCompleted = Object.keys(this.__loadingTable).every(key => this.__loadingTable[key]);

                if (!isLoadingCompleted)
                {
                    return;
                }

                // Load the main class last (dependency requirement)
                if (!isMainLoading)
                {
                    this.__loadScript("src/Automation.js");
                    isMainLoading = true;
                    return;
                }

                clearInterval(watcher);

                // Start the automation
                Automation.start();
            }.bind(this), 200); // Check every 200ms
    }
}