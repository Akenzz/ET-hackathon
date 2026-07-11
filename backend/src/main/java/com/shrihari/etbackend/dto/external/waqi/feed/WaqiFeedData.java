package com.shrihari.etbackend.dto.external.waqi.feed;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class WaqiFeedData {

    private String aqi;

    private Integer idx;

    private WaqiIAQI iaqi;

    private WaqiTime time;

    @Data
    public static class WaqiTime {

        @JsonProperty("s")
        private String s;

        @JsonProperty("iso")
        private String iso;

    }

}