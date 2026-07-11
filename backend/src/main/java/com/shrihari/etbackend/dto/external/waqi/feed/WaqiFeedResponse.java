package com.shrihari.etbackend.dto.external.waqi.feed;

import lombok.Data;

@Data
public class WaqiFeedResponse {

    private String status;

    private WaqiFeedData data;

}