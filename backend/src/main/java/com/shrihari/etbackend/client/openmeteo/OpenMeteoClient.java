package com.shrihari.etbackend.client.openmeteo;

import com.shrihari.etbackend.dto.external.openmeteo.OpenMeteoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class OpenMeteoClient {

    private final WebClient webClient;

    @Value("${openmeteo.base-url}")
    private String baseUrl;

    public OpenMeteoResponse getCurrentWeather(Double latitude,
                                               Double longitude) {

        return webClient
                .get()
                .uri(baseUrl +
                        "/v1/forecast?latitude=" + latitude +
                        "&longitude=" + longitude +
                        "&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m")
                .retrieve()
                .bodyToMono(OpenMeteoResponse.class)
                .block();
    }

}