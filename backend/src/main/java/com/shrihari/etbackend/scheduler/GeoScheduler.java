package com.shrihari.etbackend.scheduler;

import com.shrihari.etbackend.service.imports.GeoImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

//@Component
@RequiredArgsConstructor
public class GeoScheduler {

    private final GeoImportService service;

//    @Scheduled(
//            fixedRateString = "${scheduler.geo.fixed-rate}",
//            initialDelay = 60000
//    )
    public void importGeo(){

        service.importGeoFeatures();

    }

}