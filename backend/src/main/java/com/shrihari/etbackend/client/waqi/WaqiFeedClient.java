package com.shrihari.etbackend.client.waqi;

import com.shrihari.etbackend.dto.external.waqi.feed.WaqiFeedResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

@Component
@RequiredArgsConstructor
public class WaqiFeedClient {

    private final WebClient webClient;

    @Value("${waqi.base-url}")
    private String baseUrl;

    @Value("${waqi.token}")
    private String token;

    public WaqiFeedResponse getFeed(String stationId) {

        return webClient
                .get()
                .uri(baseUrl + "/feed/@" + stationId + "/?token=" + token)
                .retrieve()
                .bodyToMono(WaqiFeedResponse.class)
                .block();

    }

}