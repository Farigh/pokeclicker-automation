class FarmingTestUtils
{
    static printPlotList()
    {
        let berryLetters = new Map();
        berryLetters.set(BerryType.None, " ");

        let buffer = "";
        for (const [ plotIndex, plot ] of App.game.farming.plotList.entries())
        {
            if (!plot.isUnlocked)
            {
                buffer += `|#`;
            }
            else
            {
                let berryType = plot.berry;
                if (!berryLetters.has(berryType))
                {
                    berryLetters.set(berryType, String.fromCharCode('a'.charCodeAt(0) + berryLetters.size - 1))
                }

                let val = berryLetters.get(berryType);
                buffer += `|${val}`;
            }

            if (plotIndex % 5 == 4)
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
