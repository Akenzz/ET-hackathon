package com.shrihari.etbackend.controller;

import com.shrihari.etbackend.service.imports.ReadingImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/test")
@RequiredArgsConstructor
public class ReadingTestController {

    private final ReadingImportService readingImportService;

    @PostMapping("/import/readings")
    public String importReadings() {

        readingImportService.importLatestReadings();

        return "Readings Imported Successfully";

    }

}