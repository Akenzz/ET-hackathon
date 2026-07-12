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

@Service
@RequiredArgsConstructor
@Slf4j
public class GeoImportServiceImpl implements GeoImportService{

    private final StationRepository stationRepository;
    private final GeoFeatureRepository repository;
    private final OverpassClient client;

    @Override
    public void importGeoFeatures() {

        for(Station station:stationRepository.findAll()){

            OverpassResponse response=
                    client.countRoads(
                            station.getLatitude(),
                            station.getLongitude());

            int roads=0;

            if(response!=null
                    && response.getElements()!=null
                    && !response.getElements().isEmpty()){

                roads=Integer.parseInt(
                        response.getElements()
                                .getFirst()
                                .getTags()
                                .getTotal());

            }

            GeoFeature feature = repository.findByStation(station)
                    .orElse(new GeoFeature());

            feature.setStation(station);
            feature.setMajorRoadsCount(roads);
            feature.setConstructionSitesCount(0);
            feature.setIndustrialZonesCount(0);
            feature.setNearestIndustrialDistanceKm(0.0);
            feature.setLastFetched(LocalDateTime.now());

            repository.save(feature);

            log.info("Geo imported {}",station.getStationId());

        }

    }

}