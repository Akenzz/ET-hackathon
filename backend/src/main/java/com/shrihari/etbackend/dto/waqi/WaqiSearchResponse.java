package com.shrihari.etbackend.dto.waqi;

import lombok.Data;

import java.util.List;

@Data
public class WaqiSearchResponse {

    private String status;

    private List<WaqiStationDto> data;

}