package com.shrihari.etbackend.scheduler;

import com.shrihari.etbackend.service.imports.WeatherImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WeatherScheduler {

    private final WeatherImportService weatherImportService;

    @Scheduled(
            fixedRateString = "${scheduler.weather.fixed-rate}",
            initialDelay = 120000
    )
    public void importWeather() {

        log.info("Weather Scheduler Started");

        weatherImportService.importLatestWeather();

        log.info("Weather Scheduler Finished");

    }

}