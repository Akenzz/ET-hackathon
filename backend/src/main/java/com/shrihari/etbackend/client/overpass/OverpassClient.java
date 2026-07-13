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

    public OverpassResponse countRoads(double lat,double lon){

        String query="""
                [out:json];
                (
                  way["highway"~"primary|secondary|trunk|motorway"](around:2000,%f,%f);
                );
                out count;
                """.formatted(lat,lon);

        return webClient.post()
                .uri(baseUrl)
                .contentType(MediaType.TEXT_PLAIN)
                .bodyValue(query)
                .retrieve()
                .bodyToMono(OverpassResponse.class)
                .block();

    }

}