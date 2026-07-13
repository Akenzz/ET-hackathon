package com.shrihari.etbackend.controller;

import com.shrihari.etbackend.repository.ReadingRepository;
import com.shrihari.etbackend.repository.StationRepository;
import com.shrihari.etbackend.repository.WeatherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class HealthController {

    private final StationRepository stationRepository;
    private final ReadingRepository readingRepository;
    private final WeatherRepository weatherRepository;

    @GetMapping("/health")
    public Map<String,Object> health(){

        Map<String,Object> map=new LinkedHashMap<>();

        map.put("status","UP");
        map.put("timestamp", LocalDateTime.now());

        map.put("stations",stationRepository.count());
        map.put("readings",readingRepository.count());
        map.put("weather",weatherRepository.count());

        return map;

    }

}