package com.shrihari.etbackend.controller;

import com.shrihari.etbackend.dto.response.GeoFeatureResponseDto;
import com.shrihari.etbackend.service.GeoFeatureService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/geo")
@RequiredArgsConstructor
public class GeoFeatureController {

    private final GeoFeatureService geoFeatureService;

    @GetMapping("/features")
    public GeoFeatureResponseDto getFeatures(
            @RequestParam Double lat,
            @RequestParam Double lon) {

        return geoFeatureService.getGeoFeatures(lat, lon);
    }
}