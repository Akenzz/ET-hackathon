package com.shrihari.etbackend.service.impl;

import com.shrihari.etbackend.dto.response.WeatherResponseDto;
import com.shrihari.etbackend.entity.Station;
import com.shrihari.etbackend.entity.Weather;
import com.shrihari.etbackend.exception.ResourceNotFoundException;
import com.shrihari.etbackend.repository.StationRepository;
import com.shrihari.etbackend.repository.WeatherRepository;
import com.shrihari.etbackend.service.WeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WeatherServiceImpl implements WeatherService {

    private final StationRepository stationRepository;
    private final WeatherRepository weatherRepository;

    @Override
    public WeatherResponseDto getLatestWeather(Double latitude,
                                               Double longitude) {

        Station station = stationRepository
                .findByLatitudeAndLongitude(latitude, longitude)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Station not found"));

        Weather weather = weatherRepository.findByStation(station)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Weather not found"));

        return WeatherResponseDto.builder()
                .tempC(weather.getTemperature())
                .humidity(weather.getHumidity())
                .windSpeedKmh(weather.getWindSpeed())
                .windDirDeg(weather.getWindDirection())
                .precipMm(weather.getPrecipitation())
                .build();
    }
}