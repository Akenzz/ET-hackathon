package com.shrihari.etbackend.service.imports;

import com.shrihari.etbackend.client.overpass.OverpassClient;
import com.shrihari.etbackend.config.PollingProperties;
import com.shrihari.etbackend.dto.external.overpass.OverpassResponse;
import com.shrihari.etbackend.entity.GeoFeature;
import com.shrihari.etbackend.entity.Station;
import com.shrihari.etbackend.repository.GeoFeatureRepository;
import com.shrihari.etbackend.repository.StationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
@Slf4j
@Service
@RequiredArgsConstructor
public class GeoImportServiceImpl implements GeoImportService {

    private final StationRepository stationRepository;
    private final GeoFeatureRepository repository;
    private final OverpassClient overpassClient;
    private final PollingProperties pollingProperties;

    @Override
    public void importGeoFeatures() {

        for (String stationId : pollingProperties.getStationIds()) {

            Station station = stationRepository
                    .findById(stationId)
                    .orElseThrow();

            GeoFeature feature = repository.findByStation(station)
                    .orElse(new GeoFeature());

            if ("2553".equals(stationId)) {

                feature.setMajorRoadsCount(207);
                feature.setConstructionSitesCount(3);
                feature.setIndustrialZonesCount(5);
                feature.setNearestIndustrialDistanceKm(1.2);

                feature.setHospitalCount(12);
                feature.setSchoolCount(18);
                feature.setKindergartenCount(5);

                feature.setParkCount(4);
                feature.setBusStopCount(25);
                feature.setMarketCount(9);

            } else if ("3715".equals(stationId)) {

                // Temporary values until we populate real data
                feature.setMajorRoadsCount(180);
                feature.setConstructionSitesCount(2);
                feature.setIndustrialZonesCount(3);
                feature.setNearestIndustrialDistanceKm(0.8);

                feature.setHospitalCount(9);
                feature.setSchoolCount(14);
                feature.setKindergartenCount(3);

                feature.setParkCount(2);
                feature.setBusStopCount(31);
                feature.setMarketCount(12);
            }

            feature.setStation(station);
            feature.setLastFetched(LocalDateTime.now());

            repository.save(feature);
            log.info("Geo features updated for station {}", station.getStationId());
        }


    }
}
