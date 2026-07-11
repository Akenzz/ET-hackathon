package com.shrihari.etbackend.service;

import com.shrihari.etbackend.dto.response.StationResponseDto;

import java.util.List;

public interface StationService {

    List<StationResponseDto> getAllStations();
}