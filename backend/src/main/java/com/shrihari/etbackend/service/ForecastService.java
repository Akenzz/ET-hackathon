package com.shrihari.etbackend.service;

import com.shrihari.etbackend.dto.forecast.ForecastResponseDto;

public interface ForecastService {

    ForecastResponseDto getForecast(
            String stationId,
            Integer horizon,
            Integer history);

}