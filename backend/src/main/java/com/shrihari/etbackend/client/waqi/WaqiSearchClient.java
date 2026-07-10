package com.shrihari.etbackend.client.waqi;

import com.shrihari.etbackend.dto.external.waqi.search.WaqiSearchResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class WaqiSearchClient {

    private final WebClient webClient;

    @Value("${waqi.base-url}")
    private String baseUrl;

    @Value("${waqi.token}")
    private String token;

    @Value("${waqi.city}")
    private String city;

    public WaqiSearchResponse searchStations() {

        return webClient
                .get()
                .uri(baseUrl + "/search/?keyword=" + city + "&token=" + token)
                .retrieve()
                .bodyToMono(WaqiSearchResponse.class)
                .block();

    }

}