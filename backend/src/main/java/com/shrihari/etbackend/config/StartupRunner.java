package com.shrihari.etbackend.config;

import com.shrihari.etbackend.repository.StationRepository;
import com.shrihari.etbackend.service.imports.StationImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class StartupRunner implements ApplicationRunner {

    private final StationRepository stationRepository;
    private final StationImportService stationImportService;

    @Override
    public void run(ApplicationArguments args) {

        if (stationRepository.count() == 0) {

            log.info("Stations table empty. Importing stations...");

            stationImportService.importStations();

            log.info("Stations imported successfully.");

        } else {

            log.info("Stations already exist. Skipping import.");

        }

    }

}