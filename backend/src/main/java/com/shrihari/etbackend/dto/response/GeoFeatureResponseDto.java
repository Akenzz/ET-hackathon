package com.shrihari.etbackend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GeoFeatureResponseDto {

    private Integer majorRoadsCount;

    private Integer constructionSitesCount;

    private Integer industrialZonesCount;

    private Double nearestIndustrialDistKm;

}