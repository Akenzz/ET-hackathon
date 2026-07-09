package com.shrihari.etbackend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class LatestReadingResponseDto {

    private String stationId;

    private LocalDateTime timestamp;

    private Integer aqi;

    private PollutantsDto pollutants;
}