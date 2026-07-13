package com.shrihari.etbackend.dto.forecast;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AqiHistoryDto {

    private LocalDateTime timestamp;

    private Integer aqi;

    private Double pm25;

    private Double pm10;

    private Double no2;

    private Double co;

    private Double so2;

    private Double o3;

}