package com.shrihari.etbackend.service;

import com.shrihari.etbackend.client.openmeteo.OpenMeteoClient;
import com.shrihari.etbackend.dto.external.openmeteo.HourlyWeather;
import com.shrihari.etbackend.dto.external.openmeteo.OpenMeteoResponse;
import com.shrihari.etbackend.dto.forecast.*;
import com.shrihari.etbackend.entity.GeoFeature;
import com.shrihari.etbackend.entity.Reading;
import com.shrihari.etbackend.entity.Station;
import com.shrihari.etbackend.repository.GeoFeatureRepository;
import com.shrihari.etbackend.repository.ReadingRepository;
import com.shrihari.etbackend.repository.StationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ForecastServiceImpl implements ForecastService {

    private final ReadingRepository readingRepository;
    private final StationRepository stationRepository;
    private final GeoFeatureRepository geoFeatureRepository;
    private final OpenMeteoClient openMeteoClient;

    @Override
    public ForecastResponseDto getForecast(
            String stationId,
            Integer horizon,
            Integer history) {

        Station station = stationRepository.findByStationId(stationId)
                .orElseThrow();

        List<Reading> readings = new ArrayList<>(
                readingRepository
                        .findByStationStationIdOrderByTimestampDesc(stationId)
                        .stream()
                        .limit(history)
                        .toList()
        );

        Collections.reverse(readings);

        List<AqiHistoryDto> aqiHistory = new ArrayList<>();

        for (Reading reading : readings) {

            aqiHistory.add(
                    AqiHistoryDto.builder()
                            .timestamp(reading.getTimestamp())
                            .aqi(reading.getAqi())
                            .pm25(reading.getPm25())
                            .pm10(reading.getPm10())
                            .no2(reading.getNo2())
                            .co(reading.getCo())
                            .so2(reading.getSo2())
                            .o3(reading.getO3())
                            .build()
            );

        }

        OpenMeteoResponse weather =
                openMeteoClient.getCurrentWeather(
                        station.getLatitude(),
                        station.getLongitude());

        HourlyWeather hourly = weather.getHourly();

        List<WeatherForecastDto> forecast = new ArrayList<>();

        LocalDateTime now = LocalDateTime.now();

        for (int i = 0; i < hourly.getTime().size() && forecast.size() < horizon; i++) {

            LocalDateTime forecastTime =
                    LocalDateTime.parse(hourly.getTime().get(i));

            if (forecastTime.isAfter(now)) {

                forecast.add(
                        WeatherForecastDto.builder()
                                .timestamp(forecastTime)
                                .temperature(hourly.getTemperature().get(i))
                                .humidity(hourly.getHumidity().get(i))
                                .windSpeed(hourly.getWindSpeed().get(i))
                                .windDirection(hourly.getWindDirection().get(i))
                                .pressure(hourly.getPressure().get(i))
                                .precipitation(hourly.getPrecipitation().get(i))
                                .build()
                );

            }

        }

        GeoFeature geo =
                geoFeatureRepository.findByStation(station)
                        .orElse(null);

        GeoFeatureDto geoDto;

        if (geo == null) {

            geoDto = GeoFeatureDto.builder()
                    .constructionSitesCount(0)
                    .industrialZonesCount(0)
                    .majorRoadsCount(0)
                    .nearestIndustrialDistanceKm(0.0)
                    .build();

        } else {

            geoDto = GeoFeatureDto.builder()
                    .constructionSitesCount(geo.getConstructionSitesCount())
                    .industrialZonesCount(geo.getIndustrialZonesCount())
                    .majorRoadsCount(geo.getMajorRoadsCount())
                    .nearestIndustrialDistanceKm(geo.getNearestIndustrialDistanceKm())
                    .build();

        }

        return ForecastResponseDto.builder()
                .stationId(station.getStationId())
                .stationName(station.getName())
                .horizon(horizon)
                .history(history)
                .aqiHistory(aqiHistory)
                .weatherForecast(forecast)
                .geoFeatures(geoDto)
                .build();
    }
}