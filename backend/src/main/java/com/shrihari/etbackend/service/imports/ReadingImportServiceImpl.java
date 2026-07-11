package com.shrihari.etbackend.service.imports;

import com.shrihari.etbackend.client.waqi.WaqiFeedClient;
import com.shrihari.etbackend.dto.external.waqi.feed.WaqiFeedResponse;
import com.shrihari.etbackend.dto.external.waqi.feed.WaqiValue;
import com.shrihari.etbackend.entity.Reading;
import com.shrihari.etbackend.entity.Station;
import com.shrihari.etbackend.repository.ReadingRepository;
import com.shrihari.etbackend.repository.StationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class ReadingImportServiceImpl implements ReadingImportService {

    private final StationRepository stationRepository;
    private final ReadingRepository readingRepository;
    private final WaqiFeedClient waqiFeedClient;

    @Override
    public void importLatestReadings() {

        for (Station station : stationRepository.findAll()) {

            WaqiFeedResponse response = waqiFeedClient.getFeed(station.getStationId());

            if (response.getData().getAqi() == null ||
                    response.getData().getAqi().equals("-")) {
                continue;
            }

            Reading reading = Reading.builder()

                    .station(station)

                    .timestamp(parseTimestamp(response))

                    .aqi(parseAqi(response.getData().getAqi()))

                    .pm25(value(response.getData().getIaqi().getPm25()))

                    .pm10(value(response.getData().getIaqi().getPm10()))

                    .no2(value(response.getData().getIaqi().getNo2()))

                    .so2(value(response.getData().getIaqi().getSo2()))

                    .co(value(response.getData().getIaqi().getCo()))

                    .o3(value(response.getData().getIaqi().getO3()))

                    .build();

            readingRepository.save(reading);

        }

    }

    private Double value(WaqiValue value) {

        return value == null ? null : value.getValue();

    }
    private Integer parseAqi(String aqi) {

        if (aqi == null || aqi.equals("-")) {
            return null;
        }

        try {
            return Integer.parseInt(aqi);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
    private LocalDateTime parseTimestamp(WaqiFeedResponse response) {

        if (response.getData().getTime() == null) {
            return LocalDateTime.now();
        }

        String iso = response.getData().getTime().getIso();

        if (iso != null && !iso.isBlank()) {
            return OffsetDateTime.parse(iso).toLocalDateTime();
        }

        String s = response.getData().getTime().getS();

        if (s != null && !s.isBlank()) {
            return LocalDateTime.parse(
                    s,
                    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
            );
        }

        return LocalDateTime.now();
    }

}