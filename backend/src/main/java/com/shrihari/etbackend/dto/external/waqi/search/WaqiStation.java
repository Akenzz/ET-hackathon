package com.shrihari.etbackend.dto.external.waqi.search;

import lombok.Data;

import java.util.List;

@Data
public class WaqiStation {

    private String name;

    private List<Double> geo;

    private String url;

    private String country;

}