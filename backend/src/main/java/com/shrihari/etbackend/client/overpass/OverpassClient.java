package com.shrihari.etbackend.client.overpass;

import com.shrihari.etbackend.dto.external.overpass.OverpassResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class OverpassClient {

    private final WebClient webClient;

    @Value("${overpass.base-url}")
    private String baseUrl;

    public Integer countRoads(double lat, double lon) {

        String query = """
            [out:json];
            (
              way["highway"~"primary|secondary|trunk|motorway"](around:2000,%f,%f);
            );
            out count;
            """.formatted(lat, lon);

        return executeCountQuery(query);
    }
    public Integer countIndustrial(double lat, double lon) {

        String query = """
            [out:json];
            (
              way["landuse"="industrial"](around:2000,%f,%f);
            );
            out count;
            """.formatted(lat, lon);

        return executeCountQuery(query);
    }
    public Integer countConstruction(double lat, double lon) {

        String query = """
            [out:json];
            (
              way["building"="construction"](around:2000,%f,%f);
              node["construction"](around:2000,%f,%f);
            );
            out count;
            """.formatted(lat, lon, lat, lon);

        return executeCountQuery(query);
    }
    public Integer countHospitals(double lat, double lon) {

        String query = """
            [out:json];
            (
              node["amenity"="hospital"](around:2000,%f,%f);
              way["amenity"="hospital"](around:2000,%f,%f);
            );
            out count;
            """.formatted(lat, lon, lat, lon);

        return executeCountQuery(query);
    }
    public Integer countSchools(double lat, double lon) {

        String query = """
            [out:json];
            (
              node["amenity"="school"](around:2000,%f,%f);
              way["amenity"="school"](around:2000,%f,%f);
            );
            out count;
            """.formatted(lat, lon, lat, lon);

        return executeCountQuery(query);
    }
    public Integer countKindergartens(double lat, double lon) {

        String query = """
            [out:json];
            (
              node["amenity"="kindergarten"](around:2000,%f,%f);
              way["amenity"="kindergarten"](around:2000,%f,%f);
            );
            out count;
            """.formatted(lat, lon, lat, lon);

        return executeCountQuery(query);
    }
    public Integer countParks(double lat, double lon) {

        String query = """
            [out:json];
            (
              node["leisure"="park"](around:2000,%f,%f);
              way["leisure"="park"](around:2000,%f,%f);
            );
            out count;
            """.formatted(lat, lon, lat, lon);

        return executeCountQuery(query);
    }
    public Integer countBusStops(double lat, double lon) {

        String query = """
            [out:json];
            (
              node["highway"="bus_stop"](around:2000,%f,%f);
            );
            out count;
            """.formatted(lat, lon, lat, lon);

        return executeCountQuery(query);
    }
    public Integer countMarkets(double lat, double lon) {

        String query = """
            [out:json];
            (
              node["shop"](around:2000,%f,%f);
              way["shop"](around:2000,%f,%f);
              node["amenity"="marketplace"](around:2000,%f,%f);
              way["amenity"="marketplace"](around:2000,%f,%f);
            );
            out count;
            """.formatted(lat, lon, lat, lon);

        return executeCountQuery(query);
    }

    private Integer executeCountQuery(String query) {

        OverpassResponse response = webClient.post()
                .uri(baseUrl)
                .contentType(MediaType.TEXT_PLAIN)
                .bodyValue(query)
                .retrieve()
                .bodyToMono(OverpassResponse.class)
                .block();

        if (response == null ||
                response.getElements() == null ||
                response.getElements().isEmpty()) {
            return 0;
        }

        return Integer.parseInt(
                response.getElements()
                        .getFirst()
                        .getTags()
                        .getTotal()
        );
    }

}