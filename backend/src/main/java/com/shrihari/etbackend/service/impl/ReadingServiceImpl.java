package com.shrihari.etbackend.service.impl;

import com.shrihari.etbackend.dto.response.*;
import com.shrihari.etbackend.entity.Reading;
import com.shrihari.etbackend.entity.Station;
import com.shrihari.etbackend.exception.ResourceNotFoundException;
import com.shrihari.etbackend.repository.ReadingRepository;
import com.shrihari.etbackend.repository.StationRepository;
import com.shrihari.etbackend.service.ReadingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReadingServiceImpl implements ReadingService {

    private final ReadingRepository readingRepository;
    private final StationRepository stationRepository;

    @Override
    public LatestReadingResponseDto getLatestReading(String stationId) {

        Station station = stationRepository.findByStationId(stationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Station not found"));

        Reading reading = readingRepository
                .findTopByStationOrderByTimestampDesc(station)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Reading not found"));

        return LatestReadingResponseDto.builder()
                .stationId(stationId)
                .timestamp(reading.getTimestamp())
                .aqi(reading.getAqi())
                .pollutants(buildPollutants(reading))
                .build();
    }

    @Override
    public List<HistoryReadingDto> getHistory(String stationId,
                                              LocalDateTime from,
                                              LocalDateTime to) {

        Station station = stationRepository.findByStationId(stationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Station not found"));

        return readingRepository
                .findByStationAndTimestampBetweenOrderByTimestampAsc(station, from, to)
                .stream()
                .map(this::mapHistory)
                .toList();
    }

    private HistoryReadingDto mapHistory(Reading reading) {

        return HistoryReadingDto.builder()
                .timestamp(reading.getTimestamp())
                .aqi(reading.getAqi())
                .pollutants(buildPollutants(reading))
                .build();
    }

    private PollutantsDto buildPollutants(Reading reading) {

        return PollutantsDto.builder()
                .pm25(reading.getPm25())
                .pm10(reading.getPm10())
                .no2(reading.getNo2())
                .so2(reading.getSo2())
                .co(reading.getCo())
                .o3(reading.getO3())
                .build();
    }
}