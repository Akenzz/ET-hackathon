package com.shrihari.etbackend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PollutantsDto {

    private Double pm25;

    private Double pm10;

    private Double no2;

    private Double so2;

    private Double co;

    private Double o3;
}