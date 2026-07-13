package com.shrihari.etbackend.repository;

import com.shrihari.etbackend.entity.Station;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StationRepository extends JpaRepository<Station, String> {

    Optional<Station> findByLatitudeAndLongitude(Double latitude,
                                                 Double longitude);

    Optional<Station> findByStationId(String stationId);
}