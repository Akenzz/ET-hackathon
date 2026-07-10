package com.shrihari.etbackend.repository;

import com.shrihari.etbackend.entity.GeoFeature;
import com.shrihari.etbackend.entity.Station;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GeoFeatureRepository extends JpaRepository<GeoFeature, Long> {

    Optional<GeoFeature> findByStation(Station station);

}