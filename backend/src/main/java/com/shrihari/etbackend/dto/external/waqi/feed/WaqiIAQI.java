package com.shrihari.etbackend.dto.external.waqi.feed;

import lombok.Data;

@Data
public class WaqiIAQI {

    private WaqiValue pm25;

    private WaqiValue pm10;

    private WaqiValue no2;

    private WaqiValue so2;

    private WaqiValue co;

    private WaqiValue o3;

    private WaqiValue t;

    private WaqiValue h;

    private WaqiValue w;

    private WaqiValue wd;

}