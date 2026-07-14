package com.shrihari.etbackend.service.imports;

import com.shrihari.etbackend.client.overpass.OverpassClient;
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

    @Override
    public void importGeoFeatures() {

        Station station = stationRepository
                .findById("2553")
                .orElseThrow();

        double lat = station.getLatitude();
        double lon = station.getLongitude();

        GeoFeature feature = repository.findByStation(station)
                .orElse(new GeoFeature());

        feature.setStation(station);

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

        feature.setLastFetched(LocalDateTime.now());

        repository.save(feature);

        log.info("Geo features updated for station {}", station.getStationId());
    }
}