package com.shrihari.etbackend.controller;

import com.shrihari.etbackend.dto.response.GeoFeatureResponseDto;
import com.shrihari.etbackend.service.GeoFeatureService;
import com.shrihari.etbackend.service.imports.GeoImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/geo")
@RequiredArgsConstructor
public class GeoFeatureController {

    private final GeoFeatureService geoFeatureService;
    private final GeoImportService geoImportService;

    @GetMapping("/features")
    public GeoFeatureResponseDto getFeatures(
            @RequestParam Double lat,
            @RequestParam Double lon) {

        return geoFeatureService.getGeoFeatures(lat, lon);
    }
    @PostMapping("/import/geo")
    public String geo(){

        geoImportService.importGeoFeatures();

        return "done";

    }
}