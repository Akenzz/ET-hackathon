package com.shrihari.etbackend.controller;

import com.shrihari.etbackend.dto.forecast.ForecastResponseDto;
import com.shrihari.etbackend.service.ForecastService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/forecast")
@RequiredArgsConstructor
public class ForecastController {

    private final ForecastService forecastService;

    @GetMapping("/{stationId}")
    public ForecastResponseDto getForecast(
            @PathVariable String stationId,
            @RequestParam Integer horizon,
            @RequestParam Integer history) {

        return forecastService.getForecast(
                stationId,
                horizon,
                history);

    }

}