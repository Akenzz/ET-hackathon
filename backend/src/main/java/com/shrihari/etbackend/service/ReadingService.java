package com.shrihari.etbackend.service;

import com.shrihari.etbackend.dto.response.HistoryReadingDto;
import com.shrihari.etbackend.dto.response.LatestReadingResponseDto;

import java.time.LocalDateTime;
import java.util.List;

public interface ReadingService {

    LatestReadingResponseDto getLatestReading(String stationId);

    List<HistoryReadingDto> getHistory(
            String stationId,
            LocalDateTime from,
            LocalDateTime to
    );
}