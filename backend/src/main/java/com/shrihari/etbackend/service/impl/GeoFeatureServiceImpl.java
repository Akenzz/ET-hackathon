package com.shrihari.etbackend.service.impl;

import com.shrihari.etbackend.dto.response.GeoFeatureResponseDto;
import com.shrihari.etbackend.entity.GeoFeature;
import com.shrihari.etbackend.entity.Station;
import com.shrihari.etbackend.exception.ResourceNotFoundException;
import com.shrihari.etbackend.repository.GeoFeatureRepository;
import com.shrihari.etbackend.repository.StationRepository;
import com.shrihari.etbackend.service.GeoFeatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GeoFeatureServiceImpl implements GeoFeatureService {

    private final StationRepository stationRepository;
    private final GeoFeatureRepository geoFeatureRepository;

    @Override
    public GeoFeatureResponseDto getGeoFeatures(Double latitude,
                                                Double longitude) {

        Station station = stationRepository
                .findByLatitudeAndLongitude(latitude, longitude)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Station not found"));

        GeoFeature geoFeature = geoFeatureRepository.findByStation(station)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Geo Features not found"));

        return GeoFeatureResponseDto.builder()
                .majorRoadsCount(geoFeature.getMajorRoadsCount())
                .constructionSitesCount(geoFeature.getConstructionSitesCount())
                .industrialZonesCount(geoFeature.getIndustrialZonesCount())
                .nearestIndustrialDistKm(geoFeature.getNearestIndustrialDistanceKm())

                .hospitalCount(geoFeature.getHospitalCount())
                .schoolCount(geoFeature.getSchoolCount())
                .kindergartenCount(geoFeature.getKindergartenCount())

                .parkCount(geoFeature.getParkCount())
                .busStopCount(geoFeature.getBusStopCount())
                .marketCount(geoFeature.getMarketCount())

                .build();
    }
}