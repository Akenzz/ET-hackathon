package com.shrihari.etbackend.dto.external.openmeteo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class CurrentWeather {

    private String time;

    @JsonProperty("temperature_2m")
    private Double temperature;

    @JsonProperty("relative_humidity_2m")
    private Double humidity;

    @JsonProperty("precipitation")
    private Double precipitation;

    @JsonProperty("wind_speed_10m")
    private Double windSpeed;

    @JsonProperty("wind_direction_10m")
    private Double windDirection;

}