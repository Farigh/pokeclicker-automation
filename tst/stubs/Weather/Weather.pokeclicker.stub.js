// Stub of https://github.com/pokeclicker/pokeclicker/blob/54f448f36875d7e59a0197b04761a280ed9059b8/src/modules/weather/Weather.ts#L10
class Weather
{
    static __regionalWeather = new Array(Object.keys(GameConstants.Region).length / 2).fill(WeatherType.Clear);
    static regionalWeather = this.__regionalWeather.map((v) => function(){ return v; });

    static weatherConditions =
        {
            [WeatherType.Clear]: new WeatherCondition(WeatherType.Clear),
            [WeatherType.Overcast]: new WeatherCondition(WeatherType.Overcast, [{ type: PokemonType.Normal, multiplier: 1.1 }]),
            [WeatherType.Rain]: new WeatherCondition(WeatherType.Rain, [ { type: PokemonType.Water, multiplier: 1.1 },
                                                                         { type: PokemonType.Bug, multiplier: 1.05 }]),
            [WeatherType.Thunderstorm]: new WeatherCondition(WeatherType.Thunderstorm, [{ type: PokemonType.Electric, multiplier: 1.1 },
                                                                                        { type: PokemonType.Water, multiplier: 1.1 },
                                                                                        { type: PokemonType.Fire, multiplier: 0.9 }]),
            [WeatherType.Snow]: new WeatherCondition(WeatherType.Snow, [{ type: PokemonType.Ice, multiplier: 1.05 }]),
            [WeatherType.Hail]: new WeatherCondition(WeatherType.Hail, [{ type: PokemonType.Ice, multiplier: 1.1 }]),
            [WeatherType.Blizzard]: new WeatherCondition(WeatherType.Blizzard, [{ type: PokemonType.Ice, multiplier: 1.2 },
                                                                                { type: PokemonType.Fire, multiplier: 0.9 },
                                                                                { type: PokemonType.Grass, multiplier: 0.9 }]),
            [WeatherType.Sunny]: new WeatherCondition(WeatherType.Sunny, [{ type: PokemonType.Fire, multiplier: 1.2 },
                                                                          { type: PokemonType.Grass, multiplier: 1.1 },
                                                                          { type: PokemonType.Water, multiplier: 0.9 }]),
            [WeatherType.Sandstorm]: new WeatherCondition(WeatherType.Sandstorm, [{ type: PokemonType.Rock, multiplier: 1.1 },
                                                                                  { type: PokemonType.Ground, multiplier: 1.1 },
                                                                                  { type: PokemonType.Steel, multiplier: 1.1 }]),
            [WeatherType.Fog]: new WeatherCondition(WeatherType.Fog, [{ type: PokemonType.Ghost, multiplier: 1.2 },
                                                                      { type: PokemonType.Dark, multiplier: 1.1 },
                                                                      { type: PokemonType.Electric, multiplier: 0.9 }]),
            [WeatherType.Windy]: new WeatherCondition(WeatherType.Windy, [{ type: PokemonType.Flying, multiplier: 1.2 },
                                                                          { type: PokemonType.Dragon, multiplier: 1.1 }]),
        };
}
