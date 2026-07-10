package com.shrihari.etbackend.dto.external.waqi.search;

import lombok.Data;

@Data
public class WaqiTime {

    private String tz;

    private String stime;

    private Long vtime;

}