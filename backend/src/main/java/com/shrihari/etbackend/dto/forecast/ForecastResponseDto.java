package com.shrihari.etbackend.dto.forecast;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ForecastResponseDto {

    private String stationId;

    private String stationName;

    private Integer horizon;

    private List<AqiHistoryDto> aqiHistory;

    private List<WeatherForecastDto> weatherForecast;

    private GeoFeatureDto geoFeatures;

    private Integer history;

}