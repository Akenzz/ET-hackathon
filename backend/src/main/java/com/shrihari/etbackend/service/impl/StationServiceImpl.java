package com.shrihari.etbackend.service.impl;

import com.shrihari.etbackend.dto.response.StationResponseDto;
import com.shrihari.etbackend.entity.Station;
import com.shrihari.etbackend.repository.StationRepository;
import com.shrihari.etbackend.service.StationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StationServiceImpl implements StationService {

    private final StationRepository stationRepository;

    @Override
    public List<StationResponseDto> getAllStations() {

        return stationRepository.findAll()
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    private StationResponseDto mapToDto(Station station) {

        return StationResponseDto.builder()
                .stationId(station.getStationId())
                .name(station.getName())
                .city(station.getCity())
                .latitude(station.getLatitude())
                .longitude(station.getLongitude())
                .build();
    }
}