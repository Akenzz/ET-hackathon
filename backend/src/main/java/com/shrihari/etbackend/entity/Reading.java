package com.shrihari.etbackend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "readings",
        uniqueConstraints = {
                @UniqueConstraint(
                        columnNames = {
                                "station_id",
                                "timestamp"
                        }
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "station_id")
    private Station station;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    private Integer aqi;

    private Double pm25;

    private Double pm10;

    private Double no2;

    private Double so2;

    private Double co;

    private Double o3;
}