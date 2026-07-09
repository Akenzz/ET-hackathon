package com.shrihari.etbackend.repository;

import com.shrihari.etbackend.entity.Station;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface StationRepository extends JpaRepository<Station, Long> {

    Optional<Station> findByStationId(String stationId);

    boolean existsByStationId(String stationId);
    Optional<Station> findByLatitudeAndLongitude(Double latitude, Double longitude);
}