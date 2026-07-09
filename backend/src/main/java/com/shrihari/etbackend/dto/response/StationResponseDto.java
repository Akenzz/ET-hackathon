package com.shrihari.etbackend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StationResponseDto {

    private String stationId;

    private String name;

    private String city;

    private String state;

    private Double latitude;

    private Double longitude;
}