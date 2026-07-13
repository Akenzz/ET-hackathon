package com.shrihari.etbackend.dto.external.openmeteo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class HourlyWeather {

    private List<String> time;

    @JsonProperty("temperature_2m")
    private List<Double> temperature;

    @JsonProperty("relative_humidity_2m")
    private List<Double> humidity;

    private List<Double> precipitation;

    @JsonProperty("wind_speed_10m")
    private List<Double> windSpeed;

    @JsonProperty("wind_direction_10m")
    private List<Double> windDirection;

    @JsonProperty("surface_pressure")
    private List<Double> pressure;

}