package com.shrihari.etbackend.scheduler;

import com.shrihari.etbackend.service.imports.ReadingImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReadingScheduler {

    private final ReadingImportService readingImportService;

    @Scheduled(
            fixedRateString = "${scheduler.readings.fixed-rate}",
            initialDelay = 60000
    )
    public void importReadings() {

        log.info("Reading Scheduler Started");

        readingImportService.importLatestReadings();

        log.info("Reading Scheduler Finished");

    }

}