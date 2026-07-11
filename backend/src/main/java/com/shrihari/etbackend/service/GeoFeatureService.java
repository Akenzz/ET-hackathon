package com.shrihari.etbackend.service;

import com.shrihari.etbackend.dto.response.GeoFeatureResponseDto;

public interface GeoFeatureService {

    GeoFeatureResponseDto getGeoFeatures(Double latitude,
                                         Double longitude);

}