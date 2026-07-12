package com.shrihari.etbackend.repository;

import com.shrihari.etbackend.entity.Reading;
import com.shrihari.etbackend.entity.Station;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReadingRepository extends JpaRepository<Reading, Long> {

    Optional<Reading> findTopByStationOrderByTimestampDesc(Station station);

    List<Reading> findByStationAndTimestampBetweenOrderByTimestampAsc(
            Station station,
            LocalDateTime from,
            LocalDateTime to
    );
    List<Reading> findByStationOrderByTimestampDesc(Station station);
    boolean existsByStationAndTimestamp(
            Station station,
            LocalDateTime timestamp
    );
}