package com.shrihari.etbackend.dto.external.waqi.search;

import lombok.Data;

import java.util.List;

@Data
public class WaqiSearchResponse {

    private String status;

    private List<WaqiSearchStation> data;

}