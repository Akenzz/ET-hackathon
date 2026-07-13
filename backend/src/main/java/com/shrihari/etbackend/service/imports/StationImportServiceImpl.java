package com.shrihari.etbackend.service.imports;

import com.shrihari.etbackend.client.waqi.WaqiSearchClient;
import com.shrihari.etbackend.dto.external.waqi.search.WaqiSearchStation;
import com.shrihari.etbackend.entity.Station;
import com.shrihari.etbackend.repository.StationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class StationImportServiceImpl implements StationImportService {

    private final WaqiSearchClient waqiSearchClient;
    private final StationRepository stationRepository;

    @Override
    public void importStations() {

        var response = waqiSearchClient.searchStations();

        if (response == null || response.getData() == null) {
            return;
        }

        for (WaqiSearchStation stationDto : response.getData()) {

            if (stationDto.getStation() == null) {
                continue;
            }

            if (stationDto.getStation().getGeo() == null
                    || stationDto.getStation().getGeo().size() < 2) {
                continue;
            }

            String stationId = String.valueOf(stationDto.getUid());

            if (stationRepository.existsById(stationId)) {
                continue;
            }

            Station station = Station.builder()
                    .stationId(stationId)
                    .name(stationDto.getStation().getName())
                    .city(cityFromName(stationDto.getStation().getName()))
                    .latitude(stationDto.getStation().getGeo().get(0))
                    .longitude(stationDto.getStation().getGeo().get(1))
                    .build();

            stationRepository.save(station);
            log.info("Imported station {}", station.getStationId());
        }

    }

    private String cityFromName(String name) {

        if (name == null) {
            return "Delhi";
        }

        String[] parts = name.split(",");

        if (parts.length >= 2) {
            return parts[1].trim();
        }

        return "Delhi";

    }

}