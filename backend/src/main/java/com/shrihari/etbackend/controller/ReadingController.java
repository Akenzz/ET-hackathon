package com.shrihari.etbackend.controller;

import com.shrihari.etbackend.dto.response.HistoryReadingDto;
import com.shrihari.etbackend.dto.response.LatestReadingResponseDto;
import com.shrihari.etbackend.service.ReadingService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/readings")
@RequiredArgsConstructor
public class ReadingController {

    private final ReadingService readingService;

    @GetMapping("/latest")
    public LatestReadingResponseDto latest(
            @RequestParam String stationId) {

        return readingService.getLatestReading(stationId);
    }

    @GetMapping("/history")
    public List<HistoryReadingDto> history(

            @RequestParam String stationId,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime from,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime to) {

        return readingService.getHistory(stationId, from, to);
    }
}