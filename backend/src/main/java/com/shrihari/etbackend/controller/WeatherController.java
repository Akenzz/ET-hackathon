package com.shrihari.etbackend.controller;

import com.shrihari.etbackend.dto.response.WeatherResponseDto;
import com.shrihari.etbackend.service.WeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping("/latest")
    public WeatherResponseDto latest(
            @RequestParam Double lat,
            @RequestParam Double lon) {

        return weatherService.getLatestWeather(lat, lon);
    }
}