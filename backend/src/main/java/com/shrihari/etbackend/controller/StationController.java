package com.shrihari.etbackend.controller;

import com.shrihari.etbackend.dto.response.StationResponseDto;
import com.shrihari.etbackend.service.StationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/stations")
@RequiredArgsConstructor
public class StationController {

    private final StationService stationService;

    @GetMapping
    public List<StationResponseDto> getAllStations() {
        return stationService.getAllStations();
    }
}