// Add a map compare method
expect.extend(
{
    toBeEqualToRange(received, expected)
    {
        let errorBuffer = "";

        for (const [ index, data ] of received.entries())
        {
            let expectedData = expected[index];
            if (expectedData != data)
            {
                errorBuffer += `Data at index '${index}' does not match\n`
                             + `  Expected:\n${JSON.stringify(expectedData)}\n`
                             + `  Actual:\n${JSON.stringify(data)}\n`;
            }
        }

        return { message: () => `${errorBuffer}`, pass: (errorBuffer == "") };
    }
});
