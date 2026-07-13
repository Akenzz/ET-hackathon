package com.shrihari.etbackend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "geo_features")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeoFeature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id")
    private Station station;

    private Integer majorRoadsCount;

    private Integer constructionSitesCount;

    private Integer industrialZonesCount;

    private Double nearestIndustrialDistanceKm;

    private LocalDateTime lastFetched;
}