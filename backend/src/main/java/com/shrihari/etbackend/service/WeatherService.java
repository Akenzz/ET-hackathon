package com.shrihari.etbackend.service;

import com.shrihari.etbackend.dto.response.WeatherResponseDto;

public interface WeatherService {

    WeatherResponseDto getLatestWeather(Double latitude,
                                        Double longitude);
}