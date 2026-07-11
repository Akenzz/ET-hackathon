package com.shrihari.etbackend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class WeatherResponseDto {

    private Double tempC;

    private Double humidity;

    private Double windSpeedKmh;

    private Double windDirDeg;

    private Double precipMm;
}