package com.shrihari.etbackend.dto.forecast;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GeoFeatureDto {

    private Integer constructionSitesCount;

    private Integer industrialZonesCount;

    private Integer majorRoadsCount;

    private Double nearestIndustrialDistanceKm;
}