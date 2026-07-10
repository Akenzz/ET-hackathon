package com.shrihari.etbackend.dto.external.waqi.search;

import lombok.Data;

@Data
public class WaqiSearchStation {

    private Integer uid;

    private String aqi;

    private WaqiTime time;

    private WaqiStation station;

}