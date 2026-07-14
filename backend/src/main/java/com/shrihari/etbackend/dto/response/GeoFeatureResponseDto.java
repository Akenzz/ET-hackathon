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

    private Integer hospitalCount;

    private Integer schoolCount;

    private Integer kindergartenCount;

    private Integer parkCount;

    private Integer busStopCount;

    private Integer marketCount;

}