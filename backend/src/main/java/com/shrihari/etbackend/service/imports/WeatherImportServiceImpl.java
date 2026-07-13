package com.shrihari.etbackend.service.imports;

import com.shrihari.etbackend.client.openmeteo.OpenMeteoClient;
import com.shrihari.etbackend.config.PollingProperties;
import com.shrihari.etbackend.dto.external.openmeteo.OpenMeteoResponse;
import com.shrihari.etbackend.entity.Station;
import com.shrihari.etbackend.entity.Weather;
import com.shrihari.etbackend.repository.StationRepository;
import com.shrihari.etbackend.repository.WeatherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class WeatherImportServiceImpl implements WeatherImportService {

    private final StationRepository stationRepository;
    private final WeatherRepository weatherRepository;
    private final OpenMeteoClient openMeteoClient;
    private final PollingProperties pollingProperties;

    @Override
    public void importLatestWeather() {

        for (String stationId : pollingProperties.getStationIds()) {

            Station station = stationRepository
                    .findById(stationId)
                    .orElse(null);

            if (station == null) {
                continue;
            }

            OpenMeteoResponse response =
                    openMeteoClient.getCurrentWeather(
                            station.getLatitude(),
                            station.getLongitude());

            if (response == null || response.getCurrent() == null) {
                continue;
            }

            Weather weather = weatherRepository
                    .findByStation(station)
                    .orElse(new Weather());

            weather.setStation(station);
            weather.setFetchedAt(LocalDateTime.now());
            weather.setTemperature(response.getCurrent().getTemperature());
            weather.setHumidity(response.getCurrent().getHumidity());
            weather.setPrecipitation(response.getCurrent().getPrecipitation());
            weather.setWindSpeed(response.getCurrent().getWindSpeed());
            weather.setWindDirection(response.getCurrent().getWindDirection());

            weatherRepository.save(weather);
            log.info("Weather imported for station {}", station.getStationId());
        }

    }

}