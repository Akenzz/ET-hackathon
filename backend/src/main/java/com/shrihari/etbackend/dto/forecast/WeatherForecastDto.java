package com.shrihari.etbackend.dto.forecast;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class WeatherForecastDto {

    private LocalDateTime timestamp;

    private Double temperature;

    private Double humidity;

    private Double windSpeed;

    private Double windDirection;

    private Double precipitation;

    private Double pressure;
}