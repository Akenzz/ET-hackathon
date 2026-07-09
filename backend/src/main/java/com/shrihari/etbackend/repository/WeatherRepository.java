package com.shrihari.etbackend.repository;

import com.shrihari.etbackend.entity.Station;
import com.shrihari.etbackend.entity.Weather;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WeatherRepository extends JpaRepository<Weather, Long> {

    Optional<Weather> findByStation(Station station);

}