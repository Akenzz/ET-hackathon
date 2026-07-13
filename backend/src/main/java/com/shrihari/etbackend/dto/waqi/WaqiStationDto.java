package com.shrihari.etbackend.dto.waqi;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class WaqiStationDto {

    private Integer uid;

    @JsonProperty("station")
    private Station station;

    private List<Double> geo;

    @Data
    public static class Station {

        private String name;

    }

}