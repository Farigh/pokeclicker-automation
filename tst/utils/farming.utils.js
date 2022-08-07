class FarmingTestUtils
{
    static printPlotList()
    {
        let berryLetters = new Map();
        berryLetters.set(BerryType.None, " ");

        let buffer = "";
        for (let i = 0; i < 25; i++)
        {
            if (!App.game.farming.plotList[i].isUnlocked)
            {
                buffer += `|#`;
            }
            else
            {
                let berryType = App.game.farming.plotList[i].berry;
                if (!berryLetters.has(berryType))
                {
                    berryLetters.set(berryType, String.fromCharCode('a'.charCodeAt(0) + berryLetters.size - 1))
                }

                let val = berryLetters.get(berryType);
                buffer += `|${val}`;
            }

            if (i % 5 == 4)
            {
                buffer += '|\n';
            }
        }

        // Add legend
        buffer += "\nLegend:\n";
        for (const [ key, letter ] of berryLetters.entries())
        {
            // Skip the empty slot
            if (key == -1)
            {
                continue;
            }

            let berryType = BerryType[key];
            buffer += `   - ${letter} : ${berryType}\n`;
        }

        console.log(buffer);
    }
}