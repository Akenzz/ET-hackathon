package com.shrihari.etbackend.dto.external.overpass;

import lombok.Data;

import java.util.List;

@Data
public class OverpassResponse {

    private List<OverpassElement> elements;

}