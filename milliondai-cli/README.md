# The Million DAI CLI

The CLI lets you interact with the Million DAI contracts from your command line.

Simply rename example-config.json to config.json and fill in the details. If you don't want to make any
tile modifications you can remove the "accountKey" entry completely, otherwise put in your private key.

When ready with the config.json file, you may run the various helper scripts:

events.sh will print event details within the specified block range.

get-tile.sh will load and print available tile details on the given tile offset.

set-tile.sh is for making tile modifications, and works by giving it a JSON file formatted like the below:

```
[
    {
        "tileOffset": ...A number between 0 and 9999...
        "buyAndHold": ...true if you want to buy and not sell the tile after making modifications...
        "price": ...The price in DAI you'd spend buying the tile, minimum 100...
        "uri": ...A link to meta data, pointing to a JSON file...
        "pixels": [..sequence of pixel colors..]
    },
    {
        "tileOffset": 1234,
        "buyAndHold": false,
        "price": 100,
        "uri": "https://data.milliondai.website/test/tile_meta_test.json",
        "pixels": [
                      "#fff", "#f00", "#f00", "#f00", "#f00", "#f00", "#f00", "#f00", "#f00", "#fff",
                      "#fff", "#f00", "#ff0", "#ff0", "#ff0", "#ff0", "#ff0", "#ff0", "#f00", "#fff",
                      "#fff", "#ff0", "#000", "#000", "#ff0", "#ff0", "#000", "#000", "#ff0", "#fff",
                      "#fff", "#000", "#000", "#000", "#000", "#000", "#000", "#000", "#000", "#fff",
                      "#fff", "#ff0", "#000", "#000", "#ff0", "#ff0", "#000", "#000", "#ff0", "#fff",
                      "#fff", "#ff0", "#ff0", "#ff0", "#ff0", "#ff0", "#ff0", "#ff0", "#ff0", "#fff",
                      "#fff", "#ff0", "#000", "#ff0", "#ff0", "#ff0", "#ff0", "#000", "#ff0", "#fff",
                      "#fff", "#ff0", "#000", "#000", "#000", "#000", "#000", "#000", "#ff0", "#fff",
                      "#fff", "#fff", "#ff0", "#ff0", "#ff0", "#ff0", "#ff0", "#ff0", "#fff", "#fff",
                      "#fff", "#fff", "#fff", "#00f", "#00f", "#00f", "#00f", "#fff", "#fff", "#fff"
                    ]
    }
]
```

Note that tile offsets start at zero based, with tile 0 being the top left tile.

When running the set-tile.sh on such an input file, it will step through each map, attempt to buy the tile if
the specified price is high enough, set the pixels and uri data if specified, and potentially sell the tile if
the "buyAndHold" value is false. When selling a tile the pixels will remain, but the URI and related meta data
is removed by the contract.

A tile is 10 x 10 pixels, so 100 pixels in total. The pixel sequence is defined from left to right, top to bottom.
Each pixel supports one of these colors only: "#000", "#00f", "#0f0", "#0ff", "#f00", "#f0f", "#ff0", and "#fff".

Make sure the account you're running from holds sufficient ETH (for tx fees) and DAI (for tiles).
