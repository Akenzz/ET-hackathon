package com.shrihari.etbackend.controller;

import com.shrihari.etbackend.service.imports.StationImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/test")
@RequiredArgsConstructor
public class TestController {

    private final StationImportService stationImportService;

    @PostMapping("/import/stations")
    public String importStations() {

        stationImportService.importStations();

        return "Stations Imported Successfully";

    }

}