package com.shrihari.etbackend.dto.external.waqi.feed;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class WaqiValue {

    @JsonProperty("v")
    private Double value;

}